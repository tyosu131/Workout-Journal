"""CD-C1 desired execution path. Only main, successful CI and explicit activation.

No entrypoint is executed by offline tests. GCP mutations exist ONLY behind the
candidate/promote entrypoints; repository implementation never invokes them.
"""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib.request import Request, build_opener, HTTPRedirectHandler

import wif_submission as proof

require, matches = proof.require, proof.matches
ROOT = Path(__file__).resolve().parents[2]
PARTS = ('backend', 'frontend')
CALLER = f'{proof.REPOSITORY}/.github/workflows/cd.yml@refs/heads/main'
CALLED = f'{proof.REPOSITORY}/.github/workflows/candidate-e2e.yml@refs/heads/main'
SUPABASE_REF = 'krpnnkcipyeasddzbpma'
SUPABASE_URL = f'https://{SUPABASE_REF}.supabase.co'
E2E_SECRET = 'workout-journal-e2e-supabase-secret-key'
TTL_MS = 60 * 60_000
MAX_TAGS, MAX_REVISIONS = 20, 40


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'))


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def http(url, *, token=None, body=None, method='GET', code='API_FAILED'):
    # No auth-bearing redirects or raw response/exception serialization.
    headers = {'Accept': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if body is not None:
        headers['Content-Type'] = 'application/json'
    try:
        request = Request(url, data=None if body is None else canonical(body).encode(),
                          headers=headers, method=method)
        with build_opener(NoRedirect()).open(request, timeout=30) as response:
            data = response.read(4 * 1024 * 1024 + 1)
            require(len(data) <= 4 * 1024 * 1024, code)
            return json.loads(data)
    except Exception:
        raise proof.GateError(code) from None


def github(path, env):
    require(bool(env.get('GH_TOKEN')), 'GITHUB_CREDENTIAL_MISSING')
    return http(f'https://api.github.com/repos/{proof.REPOSITORY}/{path}',
                token=env['GH_TOKEN'], code='GITHUB_READ_FAILED')


def identity(env):
    require(env.get('CD_MODE') == 'release', 'RELEASE_MODE_REQUIRED')
    require(env.get('GITHUB_REPOSITORY') == proof.REPOSITORY and
            env.get('GITHUB_REPOSITORY_ID') == '790375516' and
            env.get('GITHUB_REPOSITORY_OWNER_ID') == '95160728', 'REPOSITORY_MISMATCH')
    require(env.get('GITHUB_REF') == 'refs/heads/main' and
            env.get('GITHUB_WORKFLOW_REF') == CALLER and
            env.get('GITHUB_EVENT_NAME') == 'workflow_dispatch', 'CALLER_MISMATCH')
    sha = env.get('GITHUB_SHA')
    require(matches(r'[a-f0-9]{40}', sha) and env.get('GITHUB_WORKFLOW_SHA') == sha, 'SOURCE_SHA_MISMATCH')
    require(matches(r'[1-9][0-9]{0,19}', env.get('GITHUB_RUN_ID')) and
            matches(r'[1-9][0-9]{0,3}', env.get('GITHUB_RUN_ATTEMPT')), 'RUN_ID_MISMATCH')
    # Absent by default. This variable may only be configured under a later Human Gate.
    require(env.get('CD_C1_ACTIVATION') == 'approved', 'CD_C1_NOT_ACTIVATED')
    return sha


def ci_authority(run, sha):
    # The source comes from the successful CI run's head_sha, never a free-form
    # release SHA input. A future workflow_run adapter must use this same oracle.
    require(run.get('head_sha') == sha and run.get('head_branch') == 'main' and
            run.get('event') == 'push' and run.get('conclusion') == 'success' and
            run.get('status') == 'completed' and run.get('path') == '.github/workflows/ci.yml' and
            run.get('repository', {}).get('full_name') == proof.REPOSITORY and
            run.get('head_repository', {}).get('full_name') == proof.REPOSITORY and
            type(run.get('id')) is int, 'CI_SOURCE_UNPROVEN')
    return run['head_sha']


def preflight(env):
    sha = identity(env)
    proof.check_source(ROOT, sha)
    runs = github(f'actions/workflows/ci.yml/runs?head_sha={sha}&event=push&status=success&per_page=100', env)
    candidates = runs.get('workflow_runs', [])
    require(bool(candidates), 'CI_SUCCESS_MISSING')
    run = candidates[0]
    ci_authority(run, sha)
    jobs = github(f"actions/runs/{run['id']}/jobs?filter=latest&per_page=100", env)
    require(jobs.get('total_count') == 1 and len(jobs.get('jobs', [])) == 1 and
            jobs['jobs'][0].get('name') == 'Lint, build, and test baseline' and
            jobs['jobs'][0].get('conclusion') == 'success', 'REQUIRED_CI_NOT_SUCCESSFUL')
    return str(run['id'])


def validate_manifest(m, env=None):
    raw = canonical(m).encode()
    require(len(raw) <= 60 * 1024, 'MANIFEST_TOO_LARGE')
    try:
        result = subprocess.run(['node', str(ROOT / 'e2e/release-validate.mjs')],
                                input=raw, capture_output=True, timeout=15, check=False)
    except Exception:
        raise proof.GateError('MANIFEST_VALIDATION_FAILED') from None
    require(result.returncode == 0, 'MANIFEST_VALIDATION_FAILED')
    if env is not None:
        require(identity(env) == m['sourceSha'] and m['run']['id'] == env['GITHUB_RUN_ID'] and
                m['run']['attempt'] == env['GITHUB_RUN_ATTEMPT'], 'MANIFEST_RUN_MISMATCH')
    return m


def input_manifest(env):
    raw = env.get('CD_MANIFEST', '')
    require(len(raw) <= 60 * 1024 and matches(r'[a-f0-9]{64}', env.get('CD_MANIFEST_HASH')) and
            hashlib.sha256(raw.encode()).hexdigest() == env['CD_MANIFEST_HASH'], 'MANIFEST_HASH_MISMATCH')
    return validate_manifest(json.loads(raw), env)


def emit(env, name, value):
    # Only public metadata / hashes / fixed status codes reach job outputs.
    require(name in {'manifest', 'manifest_hash', 'e2e_hash', 'source_sha', 'ci_run_id'}, 'OUTPUT_REFUSED')
    require('\n' not in value and '\r' not in value, 'OUTPUT_REFUSED')
    with Path(env['GITHUB_OUTPUT']).open('a') as output:
        output.write(f'{name}={value}\n')


def cloud_run(path, *, body=None, method='GET'):
    require(path.startswith(f'projects/{proof.PROJECT}/locations/{proof.REGION}/'), 'RUN_API_PATH_INVALID')
    token = proof.command(['gcloud', 'auth', 'print-access-token', '--quiet'], 'TOKEN_UNAVAILABLE').decode().strip()
    return http('https://run.googleapis.com/v2/' + path, token=token,
                body=body, method=method, code='RUN_API_FAILED')


def service_path(part):
    require(part in PARTS, 'SERVICE_INVALID')
    return f'projects/{proof.PROJECT}/locations/{proof.REGION}/services/workout-journal-{part}'


def traffic(raw):
    rows = [{'revision': t['revisionName'], 'percent': t.get('percent', 0),
             'tag': t.get('tag', ''), 'url': t.get('url', '')} for t in raw['status']['traffic']]
    return sorted(rows, key=lambda t: (t['revision'], t['tag'], t['percent']))


def production_revision(rows):
    require(all(type(t['percent']) is int and t['percent'] in (0, 100) for t in rows), 'SPLIT_TRAFFIC_REFUSED')
    serving = [t['revision'] for t in rows if t['percent'] == 100]
    require(len(serving) == 1, 'PRODUCTION_UNPROVEN')
    return serving[0]


def env_values(revision):
    containers = revision['spec']['containers']
    require(len(containers) == 1, 'MULTI_CONTAINER_REFUSED')
    rows = containers[0].get('env', [])
    require(len({e['name'] for e in rows}) == len(rows), 'DUPLICATE_ENV_REFUSED')
    return {e['name']: e for e in rows}


def normalized_spec(revision, part):
    spec = deepcopy(revision['spec'])
    values = env_values(revision)
    spec['containers'][0]['image'] = '[IMAGE]'
    if part == 'frontend':
        require(bool(values.get('BACKEND_INTERNAL_URL', {}).get('value')), 'PAIR_MISSING')
        for e in spec['containers'][0]['env']:
            if e['name'] == 'BACKEND_INTERNAL_URL':
                e['value'] = '[PAIR]'
    return spec


def policy_hash(raw):
    a = raw['metadata'].get('annotations', {})
    return digest({k: a.get(k) for k in ['run.googleapis.com/ingress',
                   'run.googleapis.com/invoker-iam-disabled', 'run.googleapis.com/maxScale']})


def read_revision(name):
    require(matches(r'workout-journal-(?:backend|frontend)-[a-z0-9-]{1,38}', name), 'REVISION_INVALID')
    raw = proof.cloud(['run', 'revisions', 'describe', name, f'--region={proof.REGION}'], 'REVISION_READ_FAILED')
    require(raw['metadata']['name'] == name and
            raw['metadata']['namespace'] == proof.PROJECT_NUMBER and
            any(c.get('type') == 'Ready' and c.get('status') == 'True'
                for c in raw['status']['conditions']), 'REVISION_NOT_READY')
    return raw


def read_state():
    state = {}
    for part in PARTS:
        service = 'workout-journal-' + part
        raw = proof.cloud(['run', 'services', 'describe', service, f'--region={proof.REGION}'], 'SERVICE_READ_FAILED')
        proof.service_snapshot(raw, service)
        rows = traffic(raw)
        name = production_revision(rows)
        state[part] = {'service': raw, 'traffic': rows, 'production': read_revision(name)}
    return state


def capacity(state, candidate_id):
    # The tag is this short, never-reused attempt ID, not an artifact SHA. Keep
    # room for the service's DNS identifier; exact URLs still come from read-back.
    require(len(candidate_id) <= 22, 'CANDIDATE_TAG_TOO_LONG')
    backend_target = env_values(state['frontend']['production'])['BACKEND_INTERNAL_URL']['value']
    require(any(t['url'] == backend_target and t['tag'] and
                t['revision'] == state['backend']['production']['metadata']['name']
                for t in state['backend']['traffic']), 'PREVIOUS_PAIR_UNPROVEN')
    for part in PARTS:
        rows = state[part]['traffic']
        require(sum(bool(t['tag']) for t in rows) < MAX_TAGS, 'TAG_RETIREMENT_REQUIRED')
        # Service-scoped v2 parent, not a project-wide revision listing grant.
        listing = cloud_run(service_path(part) + '/revisions?pageSize=100')
        revisions = listing.get('revisions', [])
        require(not listing.get('nextPageToken') and len(revisions) < MAX_REVISIONS,
                'REVISION_RETIREMENT_REQUIRED')
        suffix = '/revisions/workout-journal-' + part + '-' + candidate_id
        require(not any(r.get('name', '').endswith(suffix) for r in revisions) and
                not any(t['tag'] == candidate_id for t in rows), 'CANDIDATE_REUSE_REFUSED')
        latest = read_revision(state[part]['service']['status']['latestReadyRevisionName'])
        require(normalized_spec(latest, part) == normalized_spec(state[part]['production'], part),
                'LATEST_TEMPLATE_DIFFERS_FROM_PRODUCTION')


def revision_fields(part, revision, rows, candidate_id, expected_digest):
    service = 'workout-journal-' + part
    tag = candidate_id
    tagged = [t for t in rows if t['tag'] == tag]
    require(len(tagged) == 1 and tagged[0]['revision'] == service + '-' + candidate_id,
            'CANDIDATE_TAG_MISMATCH')
    image = f'{proof.IMAGE_ROOT}/{service}@{expected_digest}'
    require(revision['status']['imageDigest'] == image and
            revision['spec']['containers'][0]['image'] == image, 'CANDIDATE_IMAGE_MISMATCH')
    c = {'service': service, 'revision': revision['metadata']['name'], 'tag': tag,
         'url': tagged[0]['url'], 'traffic': sum(t['percent'] for t in rows if t['revision'] == revision['metadata']['name']),
         'digest': expected_digest, 'image': image, 'serviceAccount': revision['spec']['serviceAccountName'],
         'maxInstances': int(revision['metadata']['annotations']['autoscaling.knative.dev/maxScale']),
         'configHash': digest(revision['spec'])}
    values = env_values(revision)
    if part == 'frontend':
        c['backendInternalUrl'] = values['BACKEND_INTERNAL_URL']['value']
    else:
        c['supabaseUrl'] = values['SUPABASE_URL']['value']
        c['secretRefs'] = {}
        for variable in ('SUPABASE_SECRET_KEY', 'JWT_SECRET'):
            ref = values[variable]['valueFrom']['secretKeyRef']
            c['secretRefs'][variable] = {'name': ref['name'], 'version': ref['key']}
    return c


def make_manifest(before, after, build, env, ci_run_id):
    sha = env['GITHUB_SHA']
    candidate_id = f"cd-{env['GITHUB_RUN_ID']}-{env['GITHUB_RUN_ATTEMPT']}"
    m = {'version': 2, 'repository': proof.REPOSITORY, 'project': proof.PROJECT, 'region': proof.REGION,
         'sourceSha': sha, 'candidateId': candidate_id, 'capturedAt': datetime.now(timezone.utc).isoformat(),
         'ttlMs': TTL_MS, 'supabase': {'projectRef': SUPABASE_REF, 'url': SUPABASE_URL},
         'run': {'id': env['GITHUB_RUN_ID'], 'attempt': env['GITHUB_RUN_ATTEMPT'],
                 'event': 'workflow_dispatch', 'workflowRef': CALLER, 'workflowSha': sha,
                 'repositoryId': '790375516', 'ownerId': '95160728', 'ciRunId': ci_run_id},
         'e2eSecret': {'project': proof.PROJECT, 'name': E2E_SECRET, 'version': env['E2E_SECRET_VERSION']},
         'build': {'id': build['buildId'], 'status': build['buildResult'], 'sourceSha': sha,
                   'serviceAccount': build['actualBuildServiceAccount'],
                   'digests': {p: build['digests']['workout-journal-' + p] for p in PARTS}},
         'production': {}, 'trafficBefore': {}, 'trafficCurrent': {}}
    for part in PARTS:
        prior, current = before[part], after[part]
        revision = read_revision('workout-journal-' + part + '-' + candidate_id)
        require(normalized_spec(revision, part) == normalized_spec(prior['production'], part),
                'RUNTIME_CONFIGURATION_CHANGED')
        require(policy_hash(prior['service']) == policy_hash(current['service']), 'SERVICE_POLICY_CHANGED')
        m[part] = revision_fields(part, revision, current['traffic'], candidate_id, m['build']['digests'][part])
        m[part]['policyHash'] = policy_hash(current['service'])
        m['production'][part] = {'revision': prior['production']['metadata']['name'], 'traffic': 100,
                                'digest': prior['production']['status']['imageDigest'].split('@')[-1],
                                'configHash': digest(prior['production']['spec']),
                                'url': prior['service']['status']['url']}
        m['trafficBefore'][part] = prior['traffic']
        m['trafficCurrent'][part] = current['traffic']
    m['production']['frontend']['backendInternalUrl'] = env_values(before['frontend']['production'])['BACKEND_INTERNAL_URL']['value']
    return validate_manifest(m, env)


def pair_record(m):
    # Explicit allowlist: never serialize arbitrary manifest extension fields.
    return {'sourceSha': m['sourceSha'], 'candidateId': m['candidateId'],
            'run': {k: m['run'][k] for k in ('id', 'attempt', 'workflowRef', 'workflowSha', 'ciRunId')},
            'buildId': m['build']['id'], 'buildServiceAccount': m['build']['serviceAccount'],
            'candidate': {p: {k: m[p][k] for k in ('revision', 'tag', 'url', 'digest')} for p in PARTS},
            'previous': {p: {k: m['production'][p][k] for k in ('revision', 'digest', 'configHash')} for p in PARTS},
            'previousBackendTaggedUrl': m['production']['frontend']['backendInternalUrl'],
            'candidateBackendTaggedUrl': m['frontend']['backendInternalUrl'],
            'trafficBefore': {p: [{k: t[k] for k in ('revision', 'percent', 'tag', 'url')}
                                 for t in m['trafficBefore'][p]] for p in PARTS}}


def candidate(env, record):
    ci_run_id = preflight(env)
    require(matches(r'[1-9][0-9]{0,19}', env.get('E2E_SECRET_VERSION')), 'E2E_SECRET_VERSION_REQUIRED')
    require(env.get('NEXT_PUBLIC_SUPABASE_URL') == SUPABASE_URL, 'SUPABASE_PROJECT_MISMATCH')
    proof.check_credentials(env)
    before = read_state()
    candidate_id = f"cd-{env['GITHUB_RUN_ID']}-{env['GITHUB_RUN_ATTEMPT']}"
    record['candidateId'] = candidate_id
    capacity(before, candidate_id)
    build = {}
    record['phase'] = 'build'
    proof.prove(env, build)
    record['buildId'] = build['buildId']
    try:
        record['phase'] = 'candidate-creation'
        for part in PARTS:
            service = 'workout-journal-' + part
            args = ['run', 'deploy', service, f'--region={proof.REGION}',
                    f"--image={proof.IMAGE_ROOT}/{service}@{build['digests'][service]}",
                    '--no-traffic', '--tag=' + candidate_id,
                    '--revision-suffix=' + candidate_id, '--max-instances=2']
            if part == 'frontend':
                backend = read_state()['backend']
                new_tag = [t for t in backend['traffic'] if t['tag'] == candidate_id]
                require(len(new_tag) == 1 and new_tag[0]['percent'] == 0, 'BACKEND_CANDIDATE_UNPROVEN')
                args += ['--update-env-vars=BACKEND_INTERNAL_URL=' + new_tag[0]['url']]
            proof.cloud(args, 'CANDIDATE_DEPLOY_FAILED', timeout=600)
        m = make_manifest(before, read_state(), build, env, ci_run_id)
        record['pair'] = pair_record(m)
        raw = canonical(m)
        emit(env, 'manifest', raw)
        emit(env, 'manifest_hash', hashlib.sha256(raw.encode()).hexdigest())
    finally:
        # Failed/partial candidates stay 0%, retained for inspection. Never move or
        # remove any tag here, and never repair production after a pre-approval failure.
        after = read_state()
        for part in PARTS:
            require(after[part]['production']['metadata']['name'] == before[part]['production']['metadata']['name'] and
                    digest(after[part]['production']['spec']) == digest(before[part]['production']['spec']),
                    'PRODUCTION_CHANGED_BEFORE_APPROVAL')


def expected_traffic(m, part, serving_revision):
    rows = deepcopy(m['trafficCurrent'][part])
    require(any(t['revision'] == serving_revision for t in rows), 'SERVING_TARGET_UNPROVEN')
    if serving_revision == m['production'][part]['revision']:
        return rows  # Preserve which of several tags on this revision owns 100%.
    assigned = False
    for t in rows:
        t['percent'] = 100 if t['revision'] == serving_revision and not assigned else 0
        assigned = assigned or t['percent'] == 100
    return rows


def recheck(m, serving_pair):
    state = read_state()
    for part in PARTS:
        current = state[part]
        require(current['traffic'] == expected_traffic(m, part, serving_pair[part]), 'STALE_PRODUCTION_OR_TAGS')
        require(policy_hash(current['service']) == m[part]['policyHash'], 'SERVICE_POLICY_CHANGED')
        for target in (m[part], m['production'][part]):
            revision = read_revision(target['revision'])
            require(digest(revision['spec']) == target['configHash'] and
                    revision['status']['imageDigest'].split('@')[-1] == target['digest'], 'REVISION_CHANGED')
    return state


def cas_traffic(part, state, destination):
    # ETag protects the read/check/write interval against out-of-band changes.
    name = service_path(part)
    current = cloud_run(name)
    require(current.get('name') == name and bool(current.get('etag')) and not current.get('reconciling') and
            str(current.get('generation')) == str(state['service']['metadata']['generation']), 'SERVICE_CONCURRENT_CHANGE')
    rows = sorted([{'revision': t['revision'].split('/')[-1], 'tag': t.get('tag', ''),
                    'url': t.get('uri', ''), 'percent': t.get('percent', 0)}
                   for t in current['trafficStatuses']], key=lambda t: (t['revision'], t['tag'], t['percent']))
    require(rows == state['traffic'], 'TRAFFIC_CONCURRENT_CHANGE')
    targets = [{'type': 'TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION', 'revision': t['revision'],
                'percent': t['percent'], **({'tag': t['tag']} if t['tag'] else {})} for t in destination]
    op = cloud_run(name + '?updateMask=traffic', method='PATCH',
                   body={'name': name, 'etag': current['etag'], 'traffic': targets})
    deadline = time.monotonic() + 180
    while not op.get('done'):
        require(time.monotonic() < deadline and matches(
            re.escape(f'projects/{proof.PROJECT}/locations/{proof.REGION}/operations/') + r'[a-zA-Z0-9-]+',
            op.get('name')), 'TRAFFIC_OPERATION_INCOMPLETE')
        time.sleep(2)
        op = cloud_run(op['name'])
    require('error' not in op, 'TRAFFIC_OPERATION_FAILED')


def smoke(m):
    # Read-only post-deploy visibility. Authenticated workflow coverage was proved
    # against these immutable candidate images by E2E, before approval.
    for url, expected in [(m['production']['frontend']['url'] + '/login', 200),
                          (m['production']['frontend']['url'] + '/api/auth/session', 401),
                          (m['production']['backend']['url'] + '/', 404)]:
        try:
            from urllib.error import HTTPError
            try:
                with build_opener(NoRedirect()).open(url, timeout=20) as response:
                    code = response.status
            except HTTPError as response:
                code = response.code
            require(code == expected, 'POST_DEPLOY_SMOKE_FAILED')
        except Exception:
            raise proof.GateError('POST_DEPLOY_SMOKE_FAILED') from None


def promote(env, record):
    m = input_manifest(env)
    require(env.get('CD_E2E_HASH') == env['CD_MANIFEST_HASH'], 'E2E_CLEANUP_PROOF_MISSING')
    require(preflight(env) == m['run']['ciRunId'], 'CI_AUTHORITY_CHANGED')
    proof.check_credentials(env)
    record['pair'] = pair_record(m)
    prior = {p: m['production'][p]['revision'] for p in PARTS}
    serving_pair = dict(prior)
    record['phase'] = 'pre-promotion-stale-state'
    recheck(m, serving_pair)
    attempted = False
    try:
        record['phase'] = 'promotion'
        for part in PARTS:
            state = recheck(m, serving_pair)
            attempted = True
            cas_traffic(part, state[part], expected_traffic(m, part, m[part]['revision']))
            serving_pair[part] = m[part]['revision']
            recheck(m, serving_pair)
        record['phase'] = 'post-deploy-verification'
        smoke(m)
        recheck(m, serving_pair)
        record['promotion'] = 'VERIFIED'
    except Exception:
        if attempted:
            try:
                # An uncertain update response is NOT retried. Read actual state;
                # rollback only if every target/tag/config is still ours or prior.
                state = read_state()
                actual = {p: state[p]['production']['metadata']['name'] for p in PARTS}
                require(all(actual[p] in {prior[p], m[p]['revision']} for p in PARTS), 'ROLLBACK_UNSAFE')
                recheck(m, actual)
                for part in ('frontend', 'backend'):
                    state = recheck(m, actual)
                    if actual[part] != prior[part]:
                        cas_traffic(part, state[part], expected_traffic(m, part, prior[part]))
                        actual[part] = prior[part]
                recheck(m, prior)
                smoke(m)
                recheck(m, prior)
                record['rollback'] = 'EXACT_PREVIOUS_PAIR_VERIFIED'
            except Exception:
                record['rollback'] = 'HUMAN_DECISION_REQUIRED'
        raise proof.GateError('RELEASE_NOT_VERIFIED') from None


def main():
    env = os.environ
    record = {'phase': 'pre-build', 'result': 'FAIL'}
    try:
        require(len(sys.argv) == 2, 'COMMAND_INVALID')
        action = sys.argv[1]
        if action == 'preflight':
            require(matches(r'[1-9][0-9]{0,19}', env.get('E2E_SECRET_VERSION')), 'E2E_SECRET_VERSION_REQUIRED')
            ci = preflight(env)
            emit(env, 'source_sha', env['GITHUB_SHA'])
            emit(env, 'ci_run_id', ci)
        elif action == 'prepare':
            preflight(env)
            proof.prepare(env)
        elif action == 'candidate':
            candidate(env, record)
        elif action == 'verify':
            m = input_manifest(env)
            proof.check_source(ROOT, m['sourceSha'])
            require(env.get('CD_E2E_HASH') == env['CD_MANIFEST_HASH'], 'E2E_CLEANUP_PROOF_MISSING')
            proof.check_credentials(env)
            recheck(m, {p: m['production'][p]['revision'] for p in PARTS})
            emit(env, 'e2e_hash', env['CD_MANIFEST_HASH'])
        elif action == 'promote':
            promote(env, record)
        else:
            raise proof.GateError('COMMAND_INVALID')
        record['result'] = 'PASS'
    except Exception as error:
        record['failureCode'] = str(error) if isinstance(error, proof.GateError) else 'CD_CONTROLLER_FAILED'
    # No arbitrary exception, service body, variable value or credential enters evidence.
    print('CD-C1: ' + record['result'] + ' / ' + record['phase'])
    if env.get('GITHUB_STEP_SUMMARY'):
        with Path(env['GITHUB_STEP_SUMMARY']).open('a') as output:
            output.write('## CD-C1 execution\n\n```json\n' + canonical(record) + '\n```\n')
    return 0 if record['result'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
