"""Exact-main delivery: successful CI authority; manual activation or workflow_run.

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
from urllib.error import HTTPError, URLError
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
# Only repository-owned GateError codes may enter durable diagnostics. In
# particular, being a GateError is not permission to serialize arbitrary text.
DIAGNOSTIC_CODES = frozenset('''
ARCHIVE_ENTRY_INVALID ARCHIVE_FAILED AUTH_IDENTITY_MISMATCH AUTH_IDENTITY_READ_FAILED
BACKEND_CANDIDATE_UNPROVEN BUILD_CONFIG_MISMATCH BUILD_DIGEST_MISSING
BUILD_IDENTITY_MISMATCH BUILD_ID_INVALID BUILD_IMAGES_MISMATCH BUILD_LOGGING_MISMATCH
BUILD_NOT_SUCCESSFUL BUILD_READ_FAILED BUILD_SA_MISMATCH BUILD_SOURCE_BUCKET_MISMATCH
BUILD_SOURCE_SHA_MISMATCH BUILD_STATUS_INVALID BUILD_SUBMISSION_FAILED BUILD_WAIT_TIMEOUT
CALLER_MISMATCH CANDIDATE_DEPLOY_FAILED CANDIDATE_IMAGE_MISMATCH CANDIDATE_REUSE_REFUSED
CANDIDATE_TAG_MISMATCH CANDIDATE_TAG_TOO_LONG CD_C1_NOT_ACTIVATED CD_CONTROLLER_FAILED
CI_AUTHORITY_CHANGED CI_SOURCE_UNPROVEN CI_SUCCESS_MISSING CLOUD_RUN_CHANGED COMMAND_INVALID
CREDENTIAL_PATH_MISMATCH DIGEST_READ_FAILED DUPLICATE_ENV_REFUSED E2E_CLEANUP_PROOF_MISSING
E2E_SECRET_VERSION_REQUIRED EVENT_MISMATCH GITHUB_CREDENTIAL_MISSING GITHUB_READ_FAILED
IMPERSONATION_OVERRIDE LATEST_TEMPLATE_DIFFERS_FROM_PRODUCTION MAIN_MOVED MAIN_READ_FAILED
MANIFEST_HASH_MISMATCH MANIFEST_RUN_MISMATCH MANIFEST_TOO_LARGE MANIFEST_VALIDATION_FAILED
MULTI_CONTAINER_REFUSED OUTPUT_REFUSED PAIR_MISSING POST_DEPLOY_SMOKE_FAILED
PREVIOUS_PAIR_UNPROVEN PRODUCTION_CHANGED_BEFORE_APPROVAL PRODUCTION_UNPROVEN PUBLIC_KEY_INVALID
PUBLIC_URL_INVALID REF_MISMATCH REGISTRY_DIGEST_MISMATCH RELEASE_MODE_REQUIRED
RELEASE_NOT_VERIFIED REPOSITORY_MISMATCH REQUIRED_CI_NOT_SUCCESSFUL REVISION_CHANGED
REVISION_INVALID REVISION_NOT_READY REVISION_READ_FAILED REVISION_RETIREMENT_REQUIRED
ROLLBACK_UNSAFE RUNTIME_CONFIGURATION_CHANGED RUN_API_FAILED RUN_API_PATH_INVALID
RUN_GENERATION_INVALID RUN_IDENTITY_MISMATCH RUN_ID_MISMATCH RUN_NOT_READY RUN_READ_FAILED
RUN_REVISION_INVALID RUN_TRAFFIC_INVALID SERVICE_CONCURRENT_CHANGE SERVICE_INVALID
SERVICE_POLICY_CHANGED SERVICE_READ_FAILED SERVING_TARGET_UNPROVEN SOURCE_BUCKET_MISMATCH
SOURCE_BUCKET_READ_FAILED SOURCE_FILE_INVALID SOURCE_LINK_FORBIDDEN SOURCE_PATH_INVALID
SOURCE_SHA_MISMATCH SPLIT_TRAFFIC_REFUSED STAGED_SOURCE_CHANGED STALE_PRODUCTION_OR_TAGS
SUPABASE_PROJECT_MISMATCH TAG_RETIREMENT_REQUIRED TOKEN_UNAVAILABLE TRACKED_SOURCE_DIRTY
TRAFFIC_CONCURRENT_CHANGE TRAFFIC_OPERATION_FAILED TRAFFIC_OPERATION_INCOMPLETE
WIF_CREDENTIAL_MISMATCH WIF_INPUT_MISMATCH WORKFLOW_MISMATCH
'''.split())
DIAGNOSTIC_FIELDS = ('result', 'phase', 'failureCode', 'promotionFailureCode',
                     'promotionFailureStage', 'rollback', 'rollbackFailureCode', 'rollbackFailureStage',
                     'runApiFailureKind', 'runApiFailureStage', 'runApiHttpStatus')
RUN_API_FAILURE_KINDS = frozenset({'HTTP_STATUS', 'TIMEOUT', 'CONNECTION', 'JSON_PARSE', 'UNKNOWN'})
RUN_API_FAILURE_STAGES = frozenset({'PATCH', 'OPERATION_GET', 'OTHER'})


def safe_enum(value, allowed, fallback):
    return value if type(value) is str and value in allowed else fallback


def safe_http_status(value):
    return value if type(value) is int and 400 <= value <= 599 else None


class RunApiFailure(proof.GateError):
    def __init__(self, kind, stage, http_status=None):
        super().__init__('RUN_API_FAILED')
        self.kind = safe_enum(kind, RUN_API_FAILURE_KINDS, 'UNKNOWN')
        self.stage = safe_enum(stage, RUN_API_FAILURE_STAGES, 'OTHER')
        self.http_status = safe_http_status(http_status) if self.kind == 'HTTP_STATUS' else None


def run_api_failure_kind(error):
    # urllib wraps transport errors in URLError.reason. Inspect types only;
    # HTTPError is also a URLError and must be classified first.
    if isinstance(error, HTTPError):
        return 'HTTP_STATUS'
    if isinstance(error, TimeoutError) or (isinstance(error, URLError) and isinstance(error.reason, TimeoutError)):
        return 'TIMEOUT'
    if isinstance(error, (ConnectionError, URLError)):
        return 'CONNECTION'
    if isinstance(error, (json.JSONDecodeError, UnicodeDecodeError)):
        return 'JSON_PARSE'
    return 'UNKNOWN'


def capture_run_api_failure(record, error):
    # Keep the first API failure even if rollback also fails. Existing rollback
    # code/stage still describe rollback separately. Never serialize the error.
    if isinstance(error, RunApiFailure) and record.get('runApiFailureKind') is None:
        record['runApiFailureKind'] = safe_enum(error.kind, RUN_API_FAILURE_KINDS, 'UNKNOWN')
        record['runApiFailureStage'] = safe_enum(error.stage, RUN_API_FAILURE_STAGES, 'OTHER')
        record['runApiHttpStatus'] = (safe_http_status(error.http_status)
                                      if record['runApiFailureKind'] == 'HTTP_STATUS' else None)


def safe_failure_code(error):
    if isinstance(error, proof.GateError) and len(error.args) == 1:
        code = error.args[0]
        if type(code) is str and code in DIAGNOSTIC_CODES:
            return code
    return 'CD_CONTROLLER_FAILED'


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'))


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def http(url, *, token=None, body=None, method='GET', code='API_FAILED', stage='OTHER'):
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
    except Exception as error:
        if code == 'RUN_API_FAILED':
            http_status = error.code if isinstance(error, HTTPError) else None
            if isinstance(error, HTTPError):
                # Python may include HTTPError.__repr__ in a ResourceWarning
                # for an unclosed response. Close it without reading its body.
                try:
                    error.close()
                except Exception:
                    pass  # Closing must not replace the original API failure.
            raise RunApiFailure(run_api_failure_kind(error), stage, http_status) from None
        raise proof.GateError(code) from None


def github(path, env):
    require(bool(env.get('GH_TOKEN')), 'GITHUB_CREDENTIAL_MISSING')
    return http(f'https://api.github.com/repos/{proof.REPOSITORY}/{path}',
                token=env['GH_TOKEN'], code='GITHUB_READ_FAILED')


def identity(env):
    return proof.release_context(env)['sourceSha']


def ci_authority(run, sha):
    return proof.ci_identity(run, sha)


def preflight(env, *, discover=False):
    authority = proof.release_context(env)
    sha = authority['sourceSha']
    proof.check_source(ROOT, sha)
    if discover and authority['mode'] == 'manual-release':
        require(authority['ciRunId'] is None, 'CI_AUTHORITY_CHANGED')
        runs = github(f'actions/workflows/ci.yml/runs?head_sha={sha}&event=push&status=success&per_page=100', env)
        candidates = runs.get('workflow_runs', [])
        require(type(candidates) is list and bool(candidates), 'CI_SUCCESS_MISSING')
        selected = candidates[0]
        ci_authority(selected, sha)
        authority = {**authority, 'ciRunId': str(selected['id']), 'ciRunAttempt': str(selected['run_attempt'])}
    require(authority['ciRunId'] is not None and authority['ciRunAttempt'] is not None, 'CI_SOURCE_UNPROVEN')
    ci_id, attempt = authority['ciRunId'], authority['ciRunAttempt']
    # Fixed repository + numeric identifiers only; never follow payload URLs or
    # reselect another successful run after initial manual discovery.
    run = github(f'actions/runs/{ci_id}', env)
    ci_authority(run, sha)
    require(str(run['id']) == ci_id and str(run['run_attempt']) == attempt, 'CI_AUTHORITY_CHANGED')
    jobs = github(f'actions/runs/{ci_id}/attempts/{attempt}/jobs?per_page=100', env)
    require(type(jobs) is dict and jobs.get('total_count') == 1 and
            type(jobs.get('jobs')) is list and len(jobs['jobs']) == 1, 'REQUIRED_CI_NOT_SUCCESSFUL')
    job = jobs['jobs'][0]
    require(type(job) is dict and job.get('name') == 'Lint, build, and test baseline' and
            job.get('status') == 'completed' and job.get('conclusion') == 'success' and
            job.get('head_sha') == sha and type(job.get('run_id')) is int and str(job['run_id']) == ci_id and
            type(job.get('run_attempt')) is int and str(job['run_attempt']) == attempt, 'REQUIRED_CI_NOT_SUCCESSFUL')
    return authority


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
        a = proof.release_context(env)
        require(a['sourceSha'] == m['sourceSha'] and m['run']['id'] == env['GITHUB_RUN_ID'] and
                m['run']['attempt'] == env['GITHUB_RUN_ATTEMPT'] and m['run']['event'] == a['event'] and
                m['run']['workflowRef'] == env['GITHUB_WORKFLOW_REF'] and
                m['run']['workflowSha'] == env['GITHUB_WORKFLOW_SHA'] and
                m['run']['ciRunId'] == a['ciRunId'] and m['run']['ciRunAttempt'] == a['ciRunAttempt'] and
                m['e2eSecret']['version'] == a['e2eSecretVersion'], 'MANIFEST_RUN_MISMATCH')
    return m


def input_manifest(env):
    raw = env.get('CD_MANIFEST', '')
    require(len(raw) <= 60 * 1024 and matches(r'[a-f0-9]{64}', env.get('CD_MANIFEST_HASH')) and
            hashlib.sha256(raw.encode()).hexdigest() == env['CD_MANIFEST_HASH'], 'MANIFEST_HASH_MISMATCH')
    return validate_manifest(json.loads(raw), env)


def emit(env, name, value):
    # Only public metadata / hashes / fixed status codes reach job outputs.
    require(name in {'manifest', 'manifest_hash', 'e2e_hash', 'source_sha', 'ci_run_id',
                     'ci_run_attempt', 'mode', 'e2e_secret_version'}, 'OUTPUT_REFUSED')
    require('\n' not in value and '\r' not in value, 'OUTPUT_REFUSED')
    with Path(env['GITHUB_OUTPUT']).open('a') as output:
        output.write(f'{name}={value}\n')


def cloud_run(path, *, body=None, method='GET', stage='OTHER'):
    require(path.startswith(f'projects/{proof.PROJECT}/locations/{proof.REGION}/'), 'RUN_API_PATH_INVALID')
    token = proof.command(['gcloud', 'auth', 'print-access-token', '--quiet'], 'TOKEN_UNAVAILABLE').decode().strip()
    return http('https://run.googleapis.com/v2/' + path, token=token,
                body=body, method=method, code='RUN_API_FAILED', stage=stage)


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


def make_manifest(before, after, build, env, authority):
    sha = authority['sourceSha']
    candidate_id = f"cd-{env['GITHUB_RUN_ID']}-{env['GITHUB_RUN_ATTEMPT']}"
    m = {'version': 2, 'e2eIdentityVersion': 2, 'repository': proof.REPOSITORY, 'project': proof.PROJECT, 'region': proof.REGION,
         'sourceSha': sha, 'candidateId': candidate_id, 'capturedAt': datetime.now(timezone.utc).isoformat(),
         'ttlMs': TTL_MS, 'supabase': {'projectRef': SUPABASE_REF, 'url': SUPABASE_URL},
         'run': {'id': env['GITHUB_RUN_ID'], 'attempt': env['GITHUB_RUN_ATTEMPT'],
                 'event': authority['event'], 'workflowRef': env['GITHUB_WORKFLOW_REF'],
                 'workflowSha': env['GITHUB_WORKFLOW_SHA'], 'repositoryId': '790375516',
                 'ownerId': '95160728', 'ciRunId': authority['ciRunId'], 'ciRunAttempt': authority['ciRunAttempt']},
         'e2eSecret': {'project': proof.PROJECT, 'name': E2E_SECRET, 'version': authority['e2eSecretVersion']},
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
            'run': {k: m['run'][k] for k in ('id', 'attempt', 'event', 'workflowRef', 'workflowSha', 'ciRunId', 'ciRunAttempt')},
            'buildId': m['build']['id'], 'buildServiceAccount': m['build']['serviceAccount'],
            'candidate': {p: {k: m[p][k] for k in ('revision', 'tag', 'url', 'digest')} for p in PARTS},
            'previous': {p: {k: m['production'][p][k] for k in ('revision', 'digest', 'configHash')} for p in PARTS},
            'previousBackendTaggedUrl': m['production']['frontend']['backendInternalUrl'],
            'candidateBackendTaggedUrl': m['frontend']['backendInternalUrl'],
            'trafficBefore': {p: [{k: t[k] for k in ('revision', 'percent', 'tag', 'url')}
                                 for t in m['trafficBefore'][p]] for p in PARTS}}


def candidate(env, record):
    authority = preflight(env)
    require(matches(r'[1-9][0-9]{0,19}', env.get('E2E_SECRET_VERSION')), 'E2E_SECRET_VERSION_REQUIRED')
    require(env.get('NEXT_PUBLIC_SUPABASE_URL') == SUPABASE_URL, 'SUPABASE_PROJECT_MISMATCH')
    proof.check_credentials(env)
    before = read_state()
    candidate_id = f"cd-{env['GITHUB_RUN_ID']}-{env['GITHUB_RUN_ATTEMPT']}"
    record['candidateId'] = candidate_id
    capacity(before, candidate_id)
    build = {}
    record['phase'] = 'build'
    proof.prove(env, build, authority=authority)
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
        m = make_manifest(before, read_state(), build, env, authority)
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
    op = cloud_run(name + '?updateMask=traffic', method='PATCH', stage='PATCH',
                   body={'name': name, 'etag': current['etag'], 'traffic': targets})
    deadline = time.monotonic() + 180
    while not op.get('done'):
        require(time.monotonic() < deadline and matches(
            re.escape(f'projects/{proof.PROJECT}/locations/{proof.REGION}/operations/') + r'[a-zA-Z0-9-]+',
            op.get('name')), 'TRAFFIC_OPERATION_INCOMPLETE')
        time.sleep(2)
        op = cloud_run(op['name'], stage='OPERATION_GET')
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
    record.update(promotionFailureCode=None, promotionFailureStage=None,
                  rollback=None, rollbackFailureCode=None, rollbackFailureStage=None,
                  runApiFailureKind=None, runApiFailureStage=None, runApiHttpStatus=None)
    m = input_manifest(env)
    require(env.get('CD_E2E_HASH') == env['CD_MANIFEST_HASH'], 'E2E_CLEANUP_PROOF_MISSING')
    authority = preflight(env)
    require(authority['ciRunId'] == m['run']['ciRunId'] and
            authority['ciRunAttempt'] == m['run']['ciRunAttempt'], 'CI_AUTHORITY_CHANGED')
    proof.check_credentials(env)
    record['pair'] = pair_record(m)
    prior = {p: m['production'][p]['revision'] for p in PARTS}
    serving_pair = dict(prior)
    record['phase'] = 'pre-promotion-stale-state'
    stage = 'pre-promotion-recheck'
    try:
        recheck(m, serving_pair)
    except Exception as error:
        capture_run_api_failure(record, error)
        record['promotionFailureCode'] = safe_failure_code(error)
        record['promotionFailureStage'] = stage
        raise  # Preserve the original pre-write failure and no-rollback boundary.
    attempted = False
    try:
        record['phase'] = 'promotion'
        for part in PARTS:
            stage = f'{part}-pre-update-recheck'
            state = recheck(m, serving_pair)
            attempted = True
            stage = f'{part}-traffic-update'
            cas_traffic(part, state[part], expected_traffic(m, part, m[part]['revision']))
            serving_pair[part] = m[part]['revision']
            stage = f'{part}-post-update-recheck'
            recheck(m, serving_pair)
        record['phase'] = 'post-deploy-verification'
        stage = 'post-deploy-smoke'
        smoke(m)
        stage = 'post-deploy-final-recheck'
        recheck(m, serving_pair)
        record['promotion'] = 'VERIFIED'
    except Exception as error:
        # C3G technical root cause is NOT PROVEN. Preserve diagnostics without
        # changing traffic/CAS, convergence, retry or rollback behavior.
        capture_run_api_failure(record, error)
        record['promotionFailureCode'] = safe_failure_code(error)
        record['promotionFailureStage'] = stage
        if attempted:
            try:
                # An uncertain update response is NOT retried. Read actual state;
                # rollback only if every target/tag/config is still ours or prior.
                rollback_stage = 'rollback-state-read'
                state = read_state()
                actual = {p: state[p]['production']['metadata']['name'] for p in PARTS}
                require(all(actual[p] in {prior[p], m[p]['revision']} for p in PARTS), 'ROLLBACK_UNSAFE')
                rollback_stage = 'rollback-state-recheck'
                recheck(m, actual)
                for part in ('frontend', 'backend'):
                    rollback_stage = f'{part}-rollback-precheck'
                    state = recheck(m, actual)
                    if actual[part] != prior[part]:
                        rollback_stage = f'{part}-rollback-update'
                        cas_traffic(part, state[part], expected_traffic(m, part, prior[part]))
                        actual[part] = prior[part]
                rollback_stage = 'rollback-final-recheck'
                recheck(m, prior)
                rollback_stage = 'rollback-smoke'
                smoke(m)
                rollback_stage = 'rollback-post-smoke-recheck'
                recheck(m, prior)
                record['rollback'] = 'EXACT_PREVIOUS_PAIR_VERIFIED'
            except Exception as rollback_error:
                capture_run_api_failure(record, rollback_error)
                record['rollback'] = 'HUMAN_DECISION_REQUIRED'
                record['rollbackFailureCode'] = safe_failure_code(rollback_error)
                record['rollbackFailureStage'] = rollback_stage
        raise proof.GateError('RELEASE_NOT_VERIFIED') from None


def main():
    env = os.environ
    record = {'phase': 'pre-build', 'result': 'FAIL'}
    try:
        require(len(sys.argv) == 2, 'COMMAND_INVALID')
        action = sys.argv[1]
        if action == 'preflight':
            authority = preflight(env, discover=True)
            for output, field in [('mode', 'mode'), ('source_sha', 'sourceSha'), ('ci_run_id', 'ciRunId'),
                                  ('ci_run_attempt', 'ciRunAttempt'), ('e2e_secret_version', 'e2eSecretVersion')]:
                emit(env, output, authority[field])
            record['authority'] = authority
        elif action == 'prepare':
            authority = preflight(env)
            proof.prepare(env, authority=authority)
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
        capture_run_api_failure(record, error)
        record['failureCode'] = safe_failure_code(error)
    # No arbitrary exception, service body, variable value or credential enters evidence.
    print('CD-C1: ' + record['result'] + ' / ' + record['phase'])
    if len(sys.argv) == 2 and sys.argv[1] == 'promote':
        # Checks API may omit step summaries. Keep this log record fixed-field;
        # pair/manifest metadata remains exclusively in the existing summary.
        print('CD-C1 diagnostic: ' + canonical({key: record.get(key) for key in DIAGNOSTIC_FIELDS}))
    if env.get('GITHUB_STEP_SUMMARY'):
        with Path(env['GITHUB_STEP_SUMMARY']).open('a') as output:
            output.write('## CD-C1 execution\n\n```json\n' + canonical(record) + '\n```\n')
    return 0 if record['result'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
