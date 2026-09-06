"""Offline tests: synthetic read-backs only; all cloud/auth/mutations mocked."""
from copy import deepcopy
from contextlib import redirect_stderr
import base64
import io
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest
from unittest.mock import patch, MagicMock

import cd_release as cd
import candidate_e2e as e2e

SHA = 'a' * 40
SECRET = 'sb_secret_OFFLINE_PRIVATE_MARKER_1234567890'
ENV = {'GITHUB_REPOSITORY': cd.proof.REPOSITORY, 'GITHUB_REPOSITORY_ID': '790375516',
       'GITHUB_REPOSITORY_OWNER_ID': '95160728', 'GITHUB_REF': 'refs/heads/main',
       'GITHUB_WORKFLOW_REF': cd.CALLER, 'GITHUB_WORKFLOW_SHA': SHA, 'GITHUB_SHA': SHA,
       'GITHUB_EVENT_NAME': 'workflow_dispatch', 'GITHUB_RUN_ID': '12345',
       'GITHUB_RUN_ATTEMPT': '1', 'CD_C1_ACTIVATION': 'approved', 'E2E_SECRET_VERSION': '17'}
BUILD = {'buildId': '00000000-0000-4000-8000-000000000001', 'buildResult': 'SUCCESS',
         'actualBuildServiceAccount': cd.proof.BUILD_SA,
         'digests': {'workout-journal-backend': 'sha256:' + 'b' * 64,
                     'workout-journal-frontend': 'sha256:' + 'c' * 64}}


def tagged(part, tag):
    return f'https://{tag}---workout-journal-{part}-test-an.a.run.app'


def revision(part, suffix, image_digest=None, backend_url=None):
    service = 'workout-journal-' + part
    image = f'{cd.proof.IMAGE_ROOT}/{service}@{image_digest or "sha256:" + "0" * 64}'
    values = [{'name': 'BACKEND_INTERNAL_URL', 'value': backend_url or tagged('backend', 'retained-good')}] if part == 'frontend' else [
        {'name': 'SUPABASE_URL', 'value': cd.SUPABASE_URL},
        {'name': 'SUPABASE_SECRET_KEY', 'valueFrom': {'secretKeyRef': {'name': 'workout-journal-supabase-secret-key', 'key': '27'}}},
        {'name': 'JWT_SECRET', 'valueFrom': {'secretKeyRef': {'name': 'workout-journal-jwt-secret', 'key': '32'}}}]
    return {'metadata': {'name': service + '-' + suffix, 'namespace': cd.proof.PROJECT_NUMBER,
                         'annotations': {'autoscaling.knative.dev/maxScale': '2'}},
            'spec': {'serviceAccountName': service + '-run@' + cd.proof.PROJECT + '.iam.gserviceaccount.com',
                     'containers': [{'image': image, 'env': values}]},
            'status': {'imageDigest': image, 'conditions': [{'type': 'Ready', 'status': 'True'}]}}


def fixture():
    before, after, revisions = {}, {}, {}
    for part in cd.PARTS:
        service = 'workout-journal-' + part
        previous = revision(part, 'arbitrary-production')
        next_revision = revision(part, 'cd-12345-1', BUILD['digests'][service], tagged('backend', 'cd-12345-1'))
        revisions[next_revision['metadata']['name']] = next_revision
        revisions[previous['metadata']['name']] = previous
        rows = [{'revisionName': previous['metadata']['name'], 'tag': 'retained-good', 'percent': 100,
                 'url': tagged(part, 'retained-good')},
                {'revisionName': service + '-stale', 'tag': 'retained-stale', 'percent': 0,
                 'url': tagged(part, 'retained-stale')}]
        raw = {'metadata': {'name': service, 'namespace': cd.proof.PROJECT_NUMBER, 'generation': 10,
                            'labels': {'cloud.googleapis.com/location': cd.proof.REGION},
                            'annotations': {'run.googleapis.com/ingress': 'all'}},
               'status': {'traffic': rows, 'observedGeneration': 10, 'conditions': [{'type': 'Ready', 'status': 'True'}],
                          'latestCreatedRevisionName': previous['metadata']['name'],
                          'latestReadyRevisionName': previous['metadata']['name'],
                          'url': f'https://{service}-test-an.a.run.app'}}
        before[part] = {'service': raw, 'traffic': cd.traffic(raw), 'production': previous}
        new_raw = deepcopy(raw)
        new_raw['status']['traffic'].append({'revisionName': next_revision['metadata']['name'], 'percent': 0,
                                             'tag': 'cd-12345-1', 'url': tagged(part, 'cd-12345-1')})
        after[part] = {'service': new_raw, 'traffic': cd.traffic(new_raw), 'production': previous}
    with patch.object(cd, 'read_revision', side_effect=lambda name: revisions[name]):
        manifest = cd.make_manifest(before, after, BUILD, ENV, '99')
    return before, after, revisions, manifest


class ProvenanceTests(unittest.TestCase):
    def test_manifest_from_actual_synthetic_readback_not_historical_constants(self):
        before, after, revisions, m = fixture()
        self.assertEqual(m['sourceSha'], SHA)
        self.assertEqual(m['production']['backend']['revision'], 'workout-journal-backend-arbitrary-production')
        self.assertEqual(m['e2eSecret']['version'], '17')
        self.assertEqual(len(m['trafficCurrent']['backend']), 3)
        cd.validate_manifest(m, ENV)
        for mutate in [lambda x: x['run'].update(id='99'), lambda x: x['build'].update(serviceAccount='default'),
                       lambda x: x['production']['backend'].update(revision='other')]:
            bad = deepcopy(m); mutate(bad)
            with self.assertRaises(cd.proof.GateError): cd.validate_manifest(bad, ENV)

    def test_manifest_hash_and_execution_binding(self):
        m = fixture()[3]; raw = cd.canonical(m)
        env = {**ENV, 'CD_MANIFEST': raw, 'CD_MANIFEST_HASH': cd.digest(m)}
        self.assertEqual(cd.input_manifest(env), m)
        for key, value in [('CD_MANIFEST', raw + ' '), ('GITHUB_RUN_ATTEMPT', '2'),
                           ('GITHUB_REF', 'refs/pull/1/merge'), ('CD_C1_ACTIVATION', '')]:
            with self.assertRaises(cd.proof.GateError): cd.input_manifest({**env, key: value})

    def test_ci_head_sha_is_authority_and_pr_source_is_rejected(self):
        r = {'head_sha': SHA, 'head_branch': 'main', 'event': 'push', 'conclusion': 'success',
             'status': 'completed', 'path': '.github/workflows/ci.yml', 'id': 99,
             'repository': {'full_name': cd.proof.REPOSITORY}, 'head_repository': {'full_name': cd.proof.REPOSITORY}}
        self.assertEqual(cd.ci_authority(r, SHA), SHA)
        for key, bad in [('head_sha', 'b' * 40), ('event', 'pull_request'), ('head_branch', 'feature'),
                         ('conclusion', 'failure'), ('path', '.github/workflows/fake.yml'),
                         ('head_repository', {'full_name': 'fork/project'})]:
            with self.assertRaises(cd.proof.GateError): cd.ci_authority({**r, key: bad}, SHA)

    def test_stale_state_and_moved_backend_tag_fail_before_mutation(self):
        _, after, revisions, m = fixture()
        prior = {p: m['production'][p]['revision'] for p in cd.PARTS}
        with patch.object(cd, 'read_revision', side_effect=lambda name: revisions[name]), patch.object(cd, 'read_state', return_value=after):
            cd.recheck(m, prior)
            for part in cd.PARTS:
                bad = deepcopy(after); bad[part]['traffic'][0]['revision'] += '-changed'
                with patch.object(cd, 'read_state', return_value=bad), self.assertRaises(cd.proof.GateError):
                    cd.recheck(m, prior)

    def test_capacity_stops_before_any_build_or_deploy(self):
        before, _, _, _ = fixture()
        with patch.object(cd, 'cloud_run', return_value={'revisions': [{}] * cd.MAX_REVISIONS}):
            with self.assertRaisesRegex(cd.proof.GateError, 'REVISION_RETIREMENT_REQUIRED'):
                cd.capacity(before, 'cd-new')
        before['backend']['traffic'] *= cd.MAX_TAGS
        with patch.object(cd, 'cloud_run') as api, self.assertRaisesRegex(cd.proof.GateError, 'TAG_RETIREMENT_REQUIRED'):
            cd.capacity(before, 'cd-new')
        api.assert_not_called()

    def test_etag_update_preserves_tags_and_never_retries_failed_patch(self):
        _, after, _, m = fixture()
        state = after['backend']
        v2 = {'name': cd.service_path('backend'), 'etag': 'exact-etag', 'generation': '10',
              'trafficStatuses': [{'revision': t['revision'], 'percent': t['percent'], 'tag': t['tag'], 'uri': t['url']}
                                  for t in state['traffic']]}
        with patch.object(cd, 'cloud_run', side_effect=[v2, {'done': True}]) as api:
            cd.cas_traffic('backend', state, cd.expected_traffic(m, 'backend', m['backend']['revision']))
            patch_call = api.call_args_list[1]
            self.assertEqual(patch_call.kwargs['body']['etag'], 'exact-etag')
            self.assertEqual(patch_call.kwargs['method'], 'PATCH')
            self.assertEqual({t['tag'] for t in patch_call.kwargs['body']['traffic']}, {t['tag'] for t in state['traffic']})
        with patch.object(cd, 'cloud_run', side_effect=[v2, cd.proof.GateError('ETAG_CONFLICT')]) as api:
            with self.assertRaises(cd.proof.GateError): cd.cas_traffic('backend', state, state['traffic'])
            self.assertEqual(api.call_count, 2)
        with patch.object(cd, 'cloud_run', return_value={**v2, 'generation': '11'}) as api:
            with self.assertRaises(cd.proof.GateError): cd.cas_traffic('backend', state, state['traffic'])
            self.assertEqual(api.call_count, 1)

    def test_post_deploy_failure_rolls_back_exact_frontend_then_backend(self):
        _, after, _, m = fixture()
        env = {**ENV, 'CD_MANIFEST': cd.canonical(m), 'CD_MANIFEST_HASH': cd.digest(m), 'CD_E2E_HASH': cd.digest(m)}
        current = {p: m[p]['revision'] for p in cd.PARTS}
        promoted = deepcopy(after)
        for p in cd.PARTS: promoted[p]['production']['metadata']['name'] = current[p]
        changes = []
        with patch.object(cd, 'preflight', return_value='99'), patch.object(cd.proof, 'check_credentials'), \
             patch.object(cd, 'recheck', return_value=after), patch.object(cd, 'read_state', return_value=promoted), \
             patch.object(cd, 'cas_traffic', side_effect=lambda p, s, dest: changes.append((p, cd.production_revision(dest)))), \
             patch.object(cd, 'smoke', side_effect=[cd.proof.GateError('POST_DEPLOY_SMOKE_FAILED'), None]):
            record = {}
            with self.assertRaises(cd.proof.GateError): cd.promote(env, record)
        self.assertEqual([p for p, _ in changes], ['backend', 'frontend', 'frontend', 'backend'])
        self.assertEqual(changes[-2:], [(p, m['production'][p]['revision']) for p in ('frontend', 'backend')])
        self.assertEqual(record['rollback'], 'EXACT_PREVIOUS_PAIR_VERIFIED')

    def test_stale_promotion_never_writes(self):
        m = fixture()[3]
        env = {**ENV, 'CD_MANIFEST': cd.canonical(m), 'CD_MANIFEST_HASH': cd.digest(m), 'CD_E2E_HASH': cd.digest(m)}
        with patch.object(cd, 'preflight', return_value='99'), patch.object(cd.proof, 'check_credentials'), \
             patch.object(cd, 'recheck', side_effect=cd.proof.GateError('STALE')), patch.object(cd, 'cas_traffic') as update:
            with self.assertRaises(cd.proof.GateError): cd.promote(env, {})
            update.assert_not_called()

    def test_candidate_deploys_one_unique_zero_traffic_pair_and_preserves_production(self):
        before, after, revisions, _ = fixture()
        state = deepcopy(before)
        calls, outputs = [], {}

        def deploy(args, code, **kwargs):
            part = args[2].removeprefix('workout-journal-')
            self.assertIn('--no-traffic', args)
            self.assertIn('--tag=cd-12345-1', args)
            self.assertIn('--revision-suffix=cd-12345-1', args)
            if part == 'frontend':
                self.assertIn('--update-env-vars=BACKEND_INTERNAL_URL=' + tagged('backend', 'cd-12345-1'), args)
            calls.append(part)
            state[part] = deepcopy(after[part])

        with patch.object(cd, 'preflight', return_value='99'), patch.object(cd.proof, 'check_credentials'), \
             patch.object(cd, 'read_state', side_effect=lambda: deepcopy(state)), \
             patch.object(cd, 'read_revision', side_effect=lambda name: revisions[name]), \
             patch.object(cd, 'cloud_run', return_value={'revisions': []}), \
             patch.object(cd.proof, 'prove', side_effect=lambda env, build: build.update(BUILD)) as build, \
             patch.object(cd.proof, 'cloud', side_effect=deploy), \
             patch.object(cd, 'emit', side_effect=lambda env, name, value: outputs.update({name: value})):
            record = {}
            cd.candidate({**ENV, 'NEXT_PUBLIC_SUPABASE_URL': cd.SUPABASE_URL}, record)
        self.assertEqual(calls, ['backend', 'frontend'])
        build.assert_called_once()
        m = json.loads(outputs['manifest'])
        self.assertEqual(outputs['manifest_hash'], cd.digest(m))
        self.assertEqual(record['pair']['previousBackendTaggedUrl'], tagged('backend', 'retained-good'))
        self.assertNotIn(SECRET, cd.canonical(record))

    def test_reused_attempt_and_unpaired_previous_frontend_stop_before_build(self):
        before, after, revisions, _ = fixture()
        for state in (after, deepcopy(before)):
            if state is not after:
                state['frontend']['production']['spec']['containers'][0]['env'][0]['value'] = tagged('backend', 'retained-stale')
            with patch.object(cd, 'preflight', return_value='99'), patch.object(cd.proof, 'check_credentials'), \
                 patch.object(cd, 'read_state', return_value=state), \
                 patch.object(cd, 'cloud_run', return_value={'revisions': []}), \
                 patch.object(cd, 'read_revision', side_effect=lambda name: revisions[name]), \
                 patch.object(cd.proof, 'prove') as build, patch.object(cd.proof, 'cloud') as deploy:
                with self.assertRaises(cd.proof.GateError):
                    cd.candidate({**ENV, 'NEXT_PUBLIC_SUPABASE_URL': cd.SUPABASE_URL}, {})
                build.assert_not_called(); deploy.assert_not_called()

    def test_stateful_rollback_preserves_multiple_tags_and_rejects_outside_changes(self):
        for outside_change in (False, True):
            _, after, revisions, m = fixture()
            after = deepcopy(after)  # Manifest capture shares the original read-back rows.
            # A second zero-percent tag can legitimately reference production.
            for p in cd.PARTS:
                extra = {'revision': m['production'][p]['revision'], 'tag': 'alias-zero', 'percent': 0,
                         'url': tagged(p, 'alias-zero')}
                for rows in (m['trafficBefore'][p], m['trafficCurrent'][p], after[p]['traffic']):
                    rows.append(deepcopy(extra)); rows.sort(key=lambda t: (t['revision'], t['tag'], t['percent']))
            state = deepcopy(after)
            changes = []
            def update(p, captured, destination):
                self.assertEqual(captured['traffic'], state[p]['traffic'])
                changes.append(p)
                state[p]['traffic'] = deepcopy(destination)
                state[p]['production'] = deepcopy(revisions[cd.production_revision(destination)])
            def smoke(_):
                if len(changes) == 2:
                    if outside_change: state['backend']['traffic'][0]['url'] += '-changed'
                    raise cd.proof.GateError('POST_DEPLOY_SMOKE_FAILED')
            env = {**ENV, 'CD_MANIFEST': cd.canonical(m), 'CD_MANIFEST_HASH': cd.digest(m), 'CD_E2E_HASH': cd.digest(m)}
            cd.input_manifest(env)
            with patch.object(cd, 'preflight', return_value='99'), patch.object(cd.proof, 'check_credentials'), \
                 patch.object(cd, 'read_state', side_effect=lambda: deepcopy(state)), \
                 patch.object(cd, 'read_revision', side_effect=lambda name: revisions[name]), \
                 patch.object(cd, 'cas_traffic', side_effect=update), patch.object(cd, 'smoke', side_effect=smoke):
                record = {}
                with self.assertRaises(cd.proof.GateError): cd.promote(env, record)
            if outside_change:
                self.assertEqual(changes, ['backend', 'frontend'])
                self.assertEqual(record['rollback'], 'HUMAN_DECISION_REQUIRED')
            else:
                self.assertEqual(changes, ['backend', 'frontend', 'frontend', 'backend'])
                self.assertEqual(record['rollback'], 'EXACT_PREVIOUS_PAIR_VERIFIED')
                for p in cd.PARTS: self.assertEqual(state[p]['traffic'], m['trafficCurrent'][p])

    def test_partial_and_uncertain_promotion_restore_only_the_captured_pair(self):
        # Simulate the actual state changing separately from the API response.
        for failure in ('frontend-before-write', 'frontend-after-write', 'external-backend'):
            with self.subTest(failure=failure):
                _, after, revisions, m = fixture()
                state = deepcopy(after)
                calls = []
                def update(part, captured, destination):
                    self.assertEqual(captured['traffic'], state[part]['traffic'])
                    calls.append(part)
                    if len(calls) == 2 and failure != 'frontend-after-write':
                        if failure == 'external-backend':
                            state['backend']['traffic'][0]['url'] += '-external'
                        raise cd.proof.GateError('UNCERTAIN_UPDATE')
                    state[part]['traffic'] = deepcopy(destination)
                    state[part]['production'] = deepcopy(revisions[cd.production_revision(destination)])
                    if len(calls) == 2:
                        raise cd.proof.GateError('UNCERTAIN_UPDATE')
                env = {**ENV, 'CD_MANIFEST': cd.canonical(m), 'CD_MANIFEST_HASH': cd.digest(m),
                       'CD_E2E_HASH': cd.digest(m)}
                with patch.object(cd, 'preflight', return_value='99'), patch.object(cd.proof, 'check_credentials'), \
                     patch.object(cd, 'read_state', side_effect=lambda: deepcopy(state)), \
                     patch.object(cd, 'read_revision', side_effect=lambda name: revisions[name]), \
                     patch.object(cd, 'cas_traffic', side_effect=update), patch.object(cd, 'smoke'):
                    record = {}
                    with self.assertRaises(cd.proof.GateError): cd.promote(env, record)
                if failure == 'external-backend':
                    self.assertEqual(calls, ['backend', 'frontend'])
                    self.assertEqual(record['rollback'], 'HUMAN_DECISION_REQUIRED')
                else:
                    self.assertEqual(calls, ['backend', 'frontend'] +
                                     (['frontend'] if failure == 'frontend-after-write' else []) + ['backend'])
                    self.assertEqual(record['rollback'], 'EXACT_PREVIOUS_PAIR_VERIFIED')
                    for part in cd.PARTS:
                        self.assertEqual(state[part]['traffic'], m['trafficCurrent'][part])


class SecretBoundaryTests(unittest.TestCase):
    def test_child_failure_and_timeout_never_retry_or_forward_streams(self):
        m = fixture()[3]
        cases = [(20, 'E2E_SCENARIO_FAILED'), (21, 'E2E_CLEANUP_UNPROVEN'),
                 (22, 'E2E_EVIDENCE_REJECTED'), (-9, 'E2E_CHILD_CLEANUP_UNPROVEN'),
                 (1, 'E2E_CHILD_CLEANUP_UNPROVEN'), (0, 'E2E_INTERRUPTED_CLEANUP_UNPROVEN')]
        for status, code in cases:
            with self.subTest(status=status), tempfile.TemporaryDirectory() as temp:
                child = MagicMock(); child.returncode = status
                child.communicate.return_value = (SECRET.encode(), SECRET.encode())
                if status == 0:
                    child.communicate.side_effect = [subprocess.TimeoutExpired('node', 600),
                                                     (SECRET.encode(), SECRET.encode())]
                env = {**ENV, 'RUNNER_TEMP': temp, 'CD_MANIFEST': cd.canonical(m), 'CD_MANIFEST_HASH': cd.digest(m)}
                with patch.object(e2e.subprocess, 'Popen', return_value=child) as spawn, \
                     redirect_stderr(io.StringIO()) as log, self.assertRaisesRegex(cd.proof.GateError, '^' + code + '$'):
                    e2e.controller(env, m, SECRET)
                spawn.assert_called_once()
                self.assertEqual(child.communicate.call_count, 2 if status == 0 else 1)
                self.assertEqual(json.loads(child.communicate.call_args_list[0].kwargs['input'])['value'], SECRET)
                if status == 0:
                    child.terminate.assert_called_once()
                    self.assertNotIn('input', child.communicate.call_args_list[1].kwargs)
                self.assertNotIn(SECRET, log.getvalue())
                self.assertEqual(list(Path(temp).iterdir()), [])

    def test_failure_classification_blocks_approval_without_exposing_error_payload(self):
        m = fixture()[3]
        for code, phase in [('E2E_SCENARIO_FAILED', 'candidate-e2e'),
                            ('E2E_CLEANUP_UNPROVEN', 'cleanup'),
                            ('E2E_EVIDENCE_REJECTED', 'e2e-evidence'),
                            (SECRET, 'candidate-e2e')]:
            with self.subTest(code=code), patch.object(e2e.release, 'input_manifest', return_value=m), \
                 patch.object(e2e.proof, 'check_source'), patch.object(e2e.proof, 'check_credentials'), \
                 patch.object(e2e, 'access_secret', return_value=SECRET), \
                 patch.object(e2e, 'controller', side_effect=cd.proof.GateError(code)), \
                 patch.object(e2e, 'check_report') as report, patch.object(e2e.release, 'emit') as emit, \
                 patch.object(e2e.resource, 'setrlimit'), patch.object(e2e.sys, 'argv', ['candidate_e2e.py']), \
                 redirect_stderr(io.StringIO()) as log:
                self.assertEqual(e2e.main(), 1)
                emit.assert_not_called(); report.assert_not_called()
            self.assertIn('FAIL / ' + phase + ' / ', log.getvalue())
            self.assertNotIn(SECRET, log.getvalue())
            self.assertIn('E2E_CONTROLLER_FAILED' if code == SECRET else code, log.getvalue())

    def test_real_node_private_stdin_decoder_and_sanitized_parse_error(self):
        m = fixture()[3]
        script = '''import { credentialFromStdin } from './e2e/candidate-user.mjs';
const m=JSON.parse(process.argv[1]);
try { const v=await credentialFromStdin(m); process.stdout.write(String(v.length)); }
catch(e) { process.stderr.write(e.message); process.exitCode=1; }'''
        for payload, okay in [(json.dumps({'secretRef': m['e2eSecret'], 'value': SECRET}), True),
                              ('{"value":"' + SECRET, False),
                              (json.dumps({'secretRef': {**m['e2eSecret'], 'version': '18'}, 'value': SECRET}), False)]:
            result = subprocess.run(['node', '--input-type=module', '-e', script, cd.canonical(m)],
                                    input=payload.encode(), capture_output=True, cwd=cd.ROOT, timeout=15)
            self.assertEqual(result.returncode == 0, okay)
            self.assertNotIn(SECRET, result.stdout.decode() + result.stderr.decode())
            if okay: self.assertEqual(result.stdout.decode(), str(len(SECRET)))

    def test_exact_secret_response_and_checksum_only(self):
        ref = {'project': cd.proof.PROJECT, 'name': cd.E2E_SECRET, 'version': '17'}
        response = {'name': f"projects/{ref['project']}/secrets/{ref['name']}/versions/17",
                    'payload': {'data': base64.b64encode(SECRET.encode()).decode(),
                                'dataCrc32c': str(e2e.crc32c(SECRET.encode()))}}
        with patch.object(e2e.proof, 'command', return_value=b'private-access-token'), \
             patch.object(e2e.release, 'http', return_value=response) as api:
            self.assertEqual(e2e.access_secret(ref), SECRET)
            self.assertNotIn(SECRET, str(api.call_args))
            response['name'] = response['name'].replace(cd.E2E_SECRET, 'workout-journal-supabase-secret-key')
            with self.assertRaises(cd.proof.GateError): e2e.access_secret(ref)
        with patch.object(e2e.proof, 'command') as command:
            with self.assertRaises(cd.proof.GateError): e2e.access_secret({**ref, 'version': 'latest'})
            command.assert_not_called()
        self.assertEqual(e2e.crc32c(b'123456789'), 0xe3069283)

    def test_secret_goes_only_to_private_stdin_not_env_argv_file_or_output(self):
        m = fixture()[3]
        with tempfile.TemporaryDirectory() as temp:
            env = {**ENV, 'RUNNER_TEMP': temp, 'CD_MANIFEST': cd.canonical(m), 'CD_MANIFEST_HASH': cd.digest(m),
                   'GH_TOKEN': SECRET, 'NODE_OPTIONS': SECRET, 'SUPABASE_SECRET_KEY': SECRET,
                   'GOOGLE_APPLICATION_CREDENTIALS': '/private/credential.json'}
            child = MagicMock(); child.returncode = 0

            def inspect_spawn(args, **kwargs):
                self.assertNotIn(SECRET, str(args) + str(kwargs['env']))
                self.assertNotIn('GOOGLE_APPLICATION_CREDENTIALS', kwargs['env'])
                manifest = Path(kwargs['env']['E2E_TARGET_MANIFEST'])
                self.assertEqual(manifest.stat().st_mode & 0o777, 0o600)
                self.assertNotIn(SECRET, manifest.read_text())
                return child

            with patch.object(e2e.subprocess, 'Popen', side_effect=inspect_spawn), redirect_stderr(io.StringIO()) as log:
                e2e.controller(env, m, SECRET)
            payload = json.loads(child.communicate.call_args.kwargs['input'])
            self.assertEqual(payload, {'secretRef': m['e2eSecret'], 'value': SECRET})
            self.assertNotIn(SECRET, log.getvalue())
            self.assertEqual(list(Path(temp).iterdir()), [])

    def test_thrown_secret_error_is_never_printed(self):
        with patch.object(e2e.release, 'input_manifest', side_effect=RuntimeError(SECRET)), \
             patch.object(e2e.resource, 'setrlimit'), patch.object(e2e.sys, 'argv', ['candidate_e2e.py']), \
             redirect_stderr(io.StringIO()) as log:
            self.assertEqual(e2e.main(), 1)
        self.assertNotIn(SECRET, log.getvalue())
        self.assertIn('HUMAN_DECISION_REQUIRED', log.getvalue())


class TrustTests(unittest.TestCase):
    def test_workflow_order_pins_permissions_and_no_automatic_activation(self):
        def workflow(name):
            return json.loads(subprocess.check_output(['node', '-e',
                'const fs=require("fs"),yaml=require("js-yaml");process.stdout.write(JSON.stringify(yaml.load(fs.readFileSync(process.argv[1],"utf8"))))',
                str(cd.ROOT / '.github/workflows' / name)], cwd=cd.ROOT))
        main, reusable = workflow('cd.yml'), workflow('candidate-e2e.yml')
        ci_workflow = workflow('ci.yml')
        ci = ci_workflow['jobs']['verify']
        self.assertEqual(ci_workflow['permissions'], {'contents': 'read'})
        self.assertEqual(ci['name'], 'Lint, build, and test baseline')
        self.assertTrue(any(s.get('run') == 'npm run e2e:test' for s in ci['steps']))
        self.assertTrue(any("python3 -B -m unittest discover" in s.get('run', '') for s in ci['steps']))
        self.assertEqual(set(main['on']), {'workflow_dispatch'})
        self.assertEqual(set(reusable['on']), {'workflow_call'})
        self.assertEqual(main['permissions'], {})
        self.assertEqual(main['concurrency']['cancel-in-progress'], False)
        jobs = main['jobs']
        self.assertEqual(jobs['candidate']['needs'], 'preflight')
        self.assertEqual(jobs['candidate-e2e']['needs'], 'candidate')
        self.assertEqual(jobs['candidate-e2e']['uses'], './.github/workflows/candidate-e2e.yml')
        self.assertEqual(jobs['verify-candidate']['needs'], ['candidate', 'candidate-e2e'])
        self.assertEqual(jobs['production']['needs'], ['candidate', 'verify-candidate'])
        self.assertEqual(jobs['production']['environment'], 'production')
        self.assertNotIn('id-token', jobs['preflight']['permissions'])
        self.assertIn("vars.CD_C1_ACTIVATION == 'approved'", jobs['preflight']['if'])
        for name, job in {**jobs, 'e2e': reusable['jobs']['e2e'], 'ci': ci}.items():
            if name != 'production': self.assertNotIn('environment', job)
            for step in job.get('steps', []):
                if 'uses' in step:
                    self.assertRegex(step['uses'], r'^[a-zA-Z0-9/-]+@[a-f0-9]{40}$')
                    self.assertNotIn('upload-artifact', step['uses'])
                    if step['uses'].startswith('actions/checkout@'):
                        self.assertIs(step['with']['persist-credentials'], False)
        e2e_job = reusable['jobs']['e2e']
        self.assertEqual(e2e_job['permissions'], {'contents': 'read', 'id-token': 'write'})
        auth = next(s for s in e2e_job['steps'] if s.get('uses', '').startswith('google-github-actions/auth@'))
        self.assertEqual(auth['with']['service_account'], e2e.E2E_SA)
        self.assertEqual(auth['with']['workload_identity_provider'], e2e.E2E_PROVIDER)

    def test_exact_provider_assertions_and_disjoint_grant_attributes(self):
        new = (cd.ROOT / 'infra/terraform/candidate_e2e.tf').read_text()
        old = (cd.ROOT / 'infra/terraform/workload_identity.tf').read_text()
        conditions = dict(re.findall(r"assertion\.([a-z_]+) == '([^']+)'", new))
        expected = {'repository_owner_id': '95160728', 'repository_id': '790375516',
                    'repository_owner': 'tyosu131', 'repository': cd.proof.REPOSITORY,
                    'ref': 'refs/heads/main', 'workflow_ref': cd.CALLER, 'job_workflow_ref': cd.CALLED}
        self.assertEqual(conditions, expected)
        allowed = lambda claims: all(claims.get(k) == v for k, v in conditions.items())
        self.assertTrue(allowed(expected))
        for key in expected:
            self.assertFalse(allowed({**expected, key: 'wrong'}))
            self.assertFalse(allowed({k: v for k, v in expected.items() if k != key}))
        old_mapping = old.split('attribute_mapping = {')[1].split('}')[0]
        new_mapping = new.split('attribute_mapping = {')[1].split('}')[0]
        self.assertNotIn('e2e_boundary', old_mapping)
        self.assertNotIn('attribute.repository_id', new_mapping)
        self.assertIn('attribute.e2e_boundary/candidate-e2e-v1', new)
        self.assertIn("'candidate-e2e:'", new_mapping)
        self.assertEqual(len(re.findall(r'^resource ', new, re.M)), 5)
        self.assertNotIn('secret_version', new)
        self.assertNotIn('roles/iam.serviceAccountTokenCreator', new)
        self.assertEqual(re.findall(r'role\s*=\s*"([^"]+)"', new),
                         ['roles/secretmanager.secretAccessor', 'roles/iam.workloadIdentityUser'])


if __name__ == '__main__':
    unittest.main()
