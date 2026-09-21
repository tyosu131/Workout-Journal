"""C4B actual-event, REST authority and parsed workflow contracts. Entirely offline."""
from contextlib import contextmanager, redirect_stderr, redirect_stdout
from copy import deepcopy
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import cd_release as cd
import candidate_e2e as e2e
from test_cd_release import ENV, AUTHORITY, SHA, REPOSITORY, MANUAL_EVENT, ci_run, fixture, BUILD
from test_e2e_wif_proof import workflow, expression, admitted


def automatic_event():
    run = ci_run()
    # Actual webhook uses the top-level repository; REST additionally includes it.
    del run['repository']
    return {'action': 'completed', 'repository': deepcopy(REPOSITORY), 'workflow_run': run}


@contextmanager
def context(event=None, **overrides):
    event = automatic_event() if event is None else event
    with tempfile.TemporaryDirectory(prefix='cd-trigger-event-') as temp:
        path = Path(temp) / 'event.json'
        path.write_text(json.dumps(event))
        auto = 'workflow_run' in event
        env = {**ENV, 'GITHUB_EVENT_PATH': str(path), 'GITHUB_EVENT_NAME': 'workflow_run' if auto else 'workflow_dispatch',
               'CD_MODE': 'automatic-release' if auto else 'manual-release',
               'E2E_SECRET_VERSION': '1' if auto else '17', 'GH_TOKEN': 'offline-not-a-token', **overrides}
        yield env


def api(path, env):
    if path.startswith('actions/workflows/'):
        return {'workflow_runs': [ci_run()]}
    if '/attempts/' in path:
        return {'total_count': 1, 'jobs': [{'name': 'Lint, build, and test baseline', 'status': 'completed',
                'conclusion': 'success', 'head_sha': SHA, 'run_id': 99, 'run_attempt': 1}]}
    if path == 'actions/runs/99': return ci_run()
    raise AssertionError('Unexpected endpoint: ' + path)


class AuthorityTests(unittest.TestCase):
    def test_automatic_without_activation_and_manual_with_activation(self):
        for event in (automatic_event(), MANUAL_EVENT):
            with context(event) as env, patch.object(cd.proof, 'check_source'), patch.object(cd, 'github', side_effect=api) as read:
                if env['GITHUB_EVENT_NAME'] == 'workflow_run': env.pop('CD_C1_ACTIVATION')
                a = cd.preflight(env)
                self.assertEqual(a['sourceSha'], SHA)
                self.assertEqual((a['ciRunId'], a['ciRunAttempt']), ('99', '1'))
                self.assertEqual(a['e2eSecretVersion'], '1' if a['mode'] == 'automatic-release' else '17')
                self.assertEqual([c.args[0] for c in read.call_args_list],
                                 ['actions/runs/99', 'actions/runs/99/attempts/1/jobs?per_page=100'])

    def test_each_unqualified_event_is_rejected_before_any_api_or_cloud(self):
        cases = [('action', 'requested'), ('repository.id', 1), ('repository.owner.id', 1),
                 ('repository.full_name', 'fork/repo'), ('workflow_run.name', 'other'),
                 ('workflow_run.workflow_id', 1), ('workflow_run.path', '.github/workflows/fake.yml'),
                 ('workflow_run.event', 'pull_request'), ('workflow_run.head_branch', 'feature'),
                 ('workflow_run.status', 'in_progress'), ('workflow_run.conclusion', 'failure'),
                 ('workflow_run.conclusion', 'cancelled'), ('workflow_run.conclusion', 'skipped'),
                 ('workflow_run.head_repository.full_name', 'fork/repo'), ('workflow_run.head_repository.id', 1)]
        for field in ('head_sha', 'id', 'run_attempt'):
            for bad in (None, '', 0, -1, True, [], {}, '1', 'A' * 40):
                cases.append(('workflow_run.' + field, bad))
        for field, value in cases:
            event = automatic_event(); target = event
            keys = field.split('.')
            for key in keys[:-1]: target = target[key]
            target[keys[-1]] = value
            with self.subTest(field=field, value=repr(value)), context(event) as env, \
                 patch.object(cd, 'github') as read, patch.object(cd.proof, 'cloud') as cloud:
                with self.assertRaises(cd.proof.GateError): cd.proof.release_context(env)
                with self.assertRaises(cd.proof.GateError): cd.preflight(env)
                read.assert_not_called(); cloud.assert_not_called()

    def test_missing_event_fields_and_wrong_json_types_are_fail_closed(self):
        original = automatic_event()
        for key in list(original['workflow_run']):
            event = deepcopy(original); del event['workflow_run'][key]
            # URLs and other optional metadata are not present in this minimal contract.
            with self.subTest(key=key), context(event) as env:
                with self.assertRaises(cd.proof.GateError): cd.identity(env)
        for raw in ('[]', 'null', '{}', '{bad', '{"repository":{},"repository":{}}', ' ' * (1024 * 1024 + 1)):
            with context() as env:
                Path(env['GITHUB_EVENT_PATH']).write_text(raw)
                with self.assertRaises(cd.proof.GateError): cd.identity(env)

    def test_env_hints_cannot_select_mode_source_ci_or_secret(self):
        for key, bad in [('CD_MODE', 'manual-release'), ('CD_SOURCE_SHA', 'b' * 40),
                         ('CD_CI_RUN_ID', '100'), ('CD_CI_RUN_ATTEMPT', '2'),
                         ('E2E_SECRET_VERSION', 'latest'), ('GITHUB_EVENT_NAME', 'repository_dispatch'),
                         ('GITHUB_WORKFLOW_SHA', 'b' * 40), ('GITHUB_SHA', 'b' * 40),
                         ('GITHUB_WORKFLOW_REF', cd.CALLED), ('GITHUB_REPOSITORY_ID', '1'),
                         ('GITHUB_REPOSITORY_OWNER_ID', '1'), ('GITHUB_REF', 'refs/pull/1/merge')]:
            with self.subTest(key=key), context(**{key: bad}) as env:
                with self.assertRaises(cd.proof.GateError): cd.identity(env)

    def test_manual_activation_and_numeric_actual_input(self):
        for activation in ('', 'unapproved', None):
            with context(MANUAL_EVENT, CD_C1_ACTIVATION=activation) as env:
                with self.assertRaises(cd.proof.GateError): cd.identity(env)
        for value in ('', 'latest', '0', '-1', '1\n', '1;command', 1, None):
            event = deepcopy(MANUAL_EVENT); event['inputs']['e2e_secret_version'] = value
            with context(event, E2E_SECRET_VERSION=value) as env:
                with self.assertRaises(cd.proof.GateError): cd.identity(env)
        event = deepcopy(MANUAL_EVENT); event['inputs']['mode'] = 'wif-proof'
        with context(event, CD_MODE='manual-release') as env:
            with self.assertRaises(cd.proof.GateError): cd.identity(env)

    def test_automatic_reviewed_version_is_numeric_even_if_constant_is_broken(self):
        with context(E2E_SECRET_VERSION='latest') as env, patch.object(cd.proof, 'AUTO_E2E_SECRET_VERSION', 'latest'):
            with self.assertRaises(cd.proof.GateError): cd.identity(env)

    def test_api_identity_and_attempt_must_match_trigger(self):
        mutations = [('name', 'other'), ('workflow_id', 1), ('path', 'fake'), ('id', 100), ('run_attempt', 2),
                     ('head_sha', 'b' * 40), ('event', 'pull_request'), ('conclusion', 'failure'),
                     ('head_branch', 'feature'), ('repository', {'id': 1}), ('head_repository', {'id': 1})]
        for key, value in mutations:
            run = ci_run(); run[key] = value
            with self.subTest(key=key), context() as env, patch.object(cd.proof, 'check_source'), \
                 patch.object(cd, 'github', side_effect=lambda p, e: run if p == 'actions/runs/99' else api(p, e)):
                with self.assertRaises(cd.proof.GateError): cd.preflight(env)

    def test_exact_attempt_required_job_contract(self):
        good = api('x/attempts/1/jobs', {})
        bads = [{'total_count': 0, 'jobs': []}, {'total_count': 2, 'jobs': good['jobs'] * 2}]
        for field, bad in [('name', 'other'), ('status', 'queued'), ('conclusion', 'failure'),
                           ('head_sha', 'b' * 40), ('run_id', 100), ('run_attempt', 2)]:
            result = deepcopy(good); result['jobs'][0][field] = bad; bads.append(result)
        for result in bads:
            with self.subTest(result=result), context() as env, patch.object(cd.proof, 'check_source'), \
                 patch.object(cd, 'github', side_effect=lambda p, e: result if '/attempts/' in p else api(p, e)):
                with self.assertRaises(cd.proof.GateError): cd.preflight(env)

    def test_current_main_guard_stops_before_authority_reads_and_mutation(self):
        outputs = [SHA.encode(), b'', ('b' * 40 + '\trefs/heads/main').encode()]
        m = fixture()[3]; m['run']['event'] = 'workflow_run'; m['e2eSecret']['version'] = '1'
        for entrypoint in (cd.preflight, lambda e: cd.candidate(e, {}), lambda e: cd.promote(e, {})):
            with context() as env, patch.object(cd.proof, 'command', side_effect=outputs), \
                 patch.object(cd.proof, 'check_build_config'), patch.object(cd, 'github') as read, \
                 patch.object(cd.proof, 'cloud') as cloud, patch.object(cd, 'cas_traffic') as traffic:
                env.update(CD_MANIFEST=cd.canonical(m), CD_MANIFEST_HASH=cd.digest(m), CD_E2E_HASH=cd.digest(m))
                with self.assertRaises(cd.proof.GateError): entrypoint(env)
                read.assert_not_called(); cloud.assert_not_called(); traffic.assert_not_called()

    def test_preflight_entrypoint_emits_only_normalized_public_authority(self):
        for event in (automatic_event(), MANUAL_EVENT):
            with context(event) as env, tempfile.TemporaryDirectory() as temp, \
                 patch.object(cd.proof, 'check_source'), patch.object(cd, 'github', side_effect=api):
                initial = {k: v for k, v in env.items() if k not in
                           ('CD_MODE', 'CD_SOURCE_SHA', 'CD_CI_RUN_ID', 'CD_CI_RUN_ATTEMPT', 'E2E_SECRET_VERSION')}
                output = Path(temp) / 'outputs'; initial['GITHUB_OUTPUT'] = str(output)
                with patch.dict(cd.os.environ, initial, clear=True), \
                     patch.object(cd.sys, 'argv', ['cd_release.py', 'preflight']), redirect_stdout(io.StringIO()):
                    self.assertEqual(cd.main(), 0)
                self.assertEqual(dict(line.split('=', 1) for line in output.read_text().splitlines()),
                                 {'mode': env['CD_MODE'], 'source_sha': SHA, 'ci_run_id': '99',
                                  'ci_run_attempt': '1', 'e2e_secret_version': env['E2E_SECRET_VERSION']})
                for name, value in [('untrusted_payload', 'value'), ('mode', 'value\ninjected=value')]:
                    with self.assertRaises(cd.proof.GateError): cd.emit(initial, name, value)

    def test_manual_discovery_once_then_no_reselection(self):
        with context(MANUAL_EVENT) as env, patch.object(cd.proof, 'check_source'), patch.object(cd, 'github', side_effect=api) as read:
            initial = {k: v for k, v in env.items() if k not in ('CD_CI_RUN_ID', 'CD_CI_RUN_ATTEMPT')}
            selected = cd.preflight(initial, discover=True)
            self.assertEqual(selected['ciRunId'], '99')
            read.reset_mock()
            cd.preflight(env)
            self.assertFalse(any('/workflows/' in c.args[0] for c in read.call_args_list))
            with self.assertRaises(cd.proof.GateError): cd.preflight(initial)
        # Observable API selection is forbidden even if another guard later stops.
        with context() as env, patch.object(cd.proof, 'check_source'), patch.object(cd, 'github', side_effect=api) as read:
            try: cd.preflight(env)
            except cd.proof.GateError: pass
            self.assertFalse(any('/workflows/' in c.args[0] for c in read.call_args_list))

    def test_manifest_producer_retains_distinct_cd_and_ci_identity(self):
        with patch.object(cd, 'validate_manifest', side_effect=lambda m, e: m):
            before, after, revisions, _ = fixture()
        with context() as env, patch.object(cd, 'read_revision', side_effect=lambda n: revisions[n]), \
             patch.object(cd, 'validate_manifest', side_effect=lambda m, e: m):
            a = cd.proof.release_context(env)
            m = cd.make_manifest(before, after, BUILD, env, a)
            self.assertEqual(m['run'].get('ciRunAttempt'), '1')
            self.assertEqual(m['run']['ciRunId'], '99')
            self.assertEqual(m['run']['event'], 'workflow_run')
            self.assertEqual(m['run']['workflowSha'], SHA)
            self.assertEqual(m['candidateId'], 'cd-12345-1')
            self.assertEqual(m['sourceSha'], m['build']['sourceSha'])
            self.assertEqual(m['e2eSecret']['version'], '1')

    def test_automatic_manifest_binding_and_private_child_metadata(self):
        m = fixture()[3]; m['run']['event'] = 'workflow_run'; m['e2eSecret']['version'] = '1'
        with context() as env:
            env.update(CD_MANIFEST=cd.canonical(m), CD_MANIFEST_HASH=cd.digest(m))
            self.assertEqual(cd.input_manifest(env), m)
            child = e2e.child_environment(env, m, 'manifest', 'result')
            self.assertEqual(child['CD_CI_RUN_ID'], '99')
            self.assertEqual(child['CD_CI_RUN_ATTEMPT'], '1')
            self.assertNotIn('GH_TOKEN', child)
            self.assertNotIn('GITHUB_EVENT_PATH', child)
            for key, bad in [('ciRunId', '100'), ('ciRunAttempt', '2'), ('event', 'workflow_dispatch')]:
                changed = deepcopy(m); changed['run'][key] = bad
                with self.subTest(key=key), self.assertRaises(cd.proof.GateError): cd.validate_manifest(changed, env)

    def test_reusable_preflight_validates_both_modes_without_credentials(self):
        for event in (automatic_event(), MANUAL_EVENT):
            with context(event) as env:
                env['PATH'] = e2e.os.environ['PATH']
                m = fixture()[3]
                m['run']['event'] = env['GITHUB_EVENT_NAME']
                m['e2eSecret']['version'] = env['E2E_SECRET_VERSION']
                env.update(CD_MANIFEST=cd.canonical(m), CD_MANIFEST_HASH=cd.digest(m))
                env.pop('GH_TOKEN')
                if env['GITHUB_EVENT_NAME'] == 'workflow_run': env.pop('CD_C1_ACTIVATION')
                with patch.dict(e2e.os.environ, env, clear=True), \
                     patch.object(e2e.sys, 'argv', ['candidate_e2e.py', 'preflight']), \
                     patch.object(e2e.resource, 'setrlimit'), \
                     patch.object(cd.proof, 'command', side_effect=[SHA.encode(), b'', (SHA + '\trefs/heads/main').encode()]) as git, \
                     patch.object(cd.proof, 'check_build_config'), \
                     patch.object(cd.proof, 'check_credentials') as credentials, \
                     patch.object(cd, 'github') as api_read, patch.object(cd, 'http') as http, \
                     patch.object(e2e, 'access_secret') as secret, patch.object(e2e, 'controller') as scenario, \
                     redirect_stdout(io.StringIO()):
                    self.assertEqual(e2e.main(), 0)
                    self.assertEqual(len(git.call_args_list), 3)
                    self.assertTrue(all(c.args[0][0] == 'git' for c in git.call_args_list))
                    credentials.assert_not_called(); api_read.assert_not_called(); http.assert_not_called()
                    secret.assert_not_called(); scenario.assert_not_called()

    def test_reusable_preflight_rejects_caller_metadata_and_manifest_before_auth(self):
        m = fixture()[3]; m['run']['event'] = 'workflow_run'; m['e2eSecret']['version'] = '1'
        cases = [('GITHUB_WORKFLOW_REF', cd.CALLED, 'CALLER_MISMATCH'),
                 ('CD_MODE', 'manual-release', 'MANIFEST_RUN_MISMATCH'),
                 ('CD_SOURCE_SHA', 'b' * 40, 'MANIFEST_RUN_MISMATCH'),
                 ('CD_CI_RUN_ID', '100', 'MANIFEST_RUN_MISMATCH'),
                 ('CD_CI_RUN_ATTEMPT', '2', 'MANIFEST_RUN_MISMATCH'),
                 ('E2E_SECRET_VERSION', 'latest', 'MANIFEST_RUN_MISMATCH'),
                 ('CD_MANIFEST_HASH', '0' * 64, 'MANIFEST_HASH_MISMATCH')]
        for key, bad, code in cases:
            with self.subTest(key=key), context() as env:
                env['PATH'] = e2e.os.environ['PATH']
                env.update(CD_MANIFEST=cd.canonical(m), CD_MANIFEST_HASH=cd.digest(m))
                env[key] = bad
                with patch.dict(e2e.os.environ, env, clear=True), \
                     patch.object(e2e.sys, 'argv', ['candidate_e2e.py', 'preflight']), \
                     patch.object(e2e.resource, 'setrlimit'), patch.object(cd.proof, 'check_source') as source, \
                     patch.object(cd.proof, 'check_credentials') as credentials, \
                     patch.object(e2e, 'access_secret') as secret, patch.object(e2e, 'controller') as scenario, \
                     redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                    with self.assertRaisesRegex(cd.proof.GateError, '^' + code + '$'): e2e.preflight(env)
                    self.assertEqual(e2e.main(), 1)
                    source.assert_not_called(); credentials.assert_not_called()
                    secret.assert_not_called(); scenario.assert_not_called()

    def test_reusable_preflight_rejects_main_advanced_after_candidate(self):
        m = fixture()[3]; m['run']['event'] = 'workflow_run'; m['e2eSecret']['version'] = '1'
        with context() as env:
            env.update(CD_MANIFEST=cd.canonical(m), CD_MANIFEST_HASH=cd.digest(m))
            with patch.object(cd.proof, 'command', side_effect=[SHA.encode(), b'', ('b' * 40 + '\trefs/heads/main').encode()]), \
                 patch.object(cd.proof, 'check_credentials') as credentials, \
                 patch.object(e2e, 'access_secret') as secret:
                with self.assertRaisesRegex(cd.proof.GateError, '^MAIN_MOVED$'): e2e.preflight(env)
                credentials.assert_not_called(); secret.assert_not_called()


def values(auto=True):
    result = {'github.repository': cd.proof.REPOSITORY, 'github.repository_id': '790375516',
              'github.repository_owner_id': '95160728', 'github.ref': 'refs/heads/main',
              'github.sha': SHA, 'github.workflow_sha': SHA, 'github.run_id': '12345',
              'github.workflow_ref': cd.CALLER,
              'github.event_name': 'workflow_run' if auto else 'workflow_dispatch', 'github.event.action': 'completed',
              'inputs.mode': '' if auto else 'release', 'vars.CD_C1_ACTIVATION': '' if auto else 'approved',
              'needs.preflight.outputs.mode': 'automatic-release' if auto else 'manual-release'}
    def flatten(prefix, value):
        for key, item in value.items():
            if type(item) is dict: flatten(prefix + key + '.', item)
            else: result[prefix + key] = item
    flatten('github.event.workflow_run.', ci_run())
    return result


class WorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.w = workflow('cd.yml'); cls.r = workflow('candidate-e2e.yml')

    def test_trigger_and_qualification_graph(self):
        self.assertEqual(self.w['on']['workflow_run'], {'workflows': ['CI'], 'types': ['completed'], 'branches': ['main']})
        job = self.w['jobs']['preflight']; good = values()
        self.assertTrue(admitted(job, good))
        for key, bad in [('github.event.workflow_run.conclusion', c) for c in ['failure', 'cancelled', 'skipped']] + [
            ('github.event.workflow_run.event', 'pull_request'), ('github.event.workflow_run.head_branch', 'feature'),
            ('github.event.workflow_run.name', 'other'), ('github.event.workflow_run.workflow_id', 1),
            ('github.event.workflow_run.path', 'fake'), ('github.repository', 'fork/repo'),
            ('github.event.workflow_run.head_repository.full_name', 'fork/repo'),
            ('github.event.workflow_run.head_sha', 'b' * 40), ('github.workflow_sha', 'b' * 40),
            ('github.event.workflow_run.id', 0), ('github.event.workflow_run.run_attempt', 0),
            ('github.event.action', 'requested')]:
            with self.subTest(key=key, bad=bad): self.assertFalse(admitted(job, {**good, key: bad}))
        self.assertTrue(admitted(job, values(False)))
        self.assertFalse(admitted(job, {**values(False), 'vars.CD_C1_ACTIVATION': ''}))

    def test_invalid_events_do_not_displace_pending_delivery(self):
        group = self.w['concurrency']['group']
        self.assertIs(self.w['concurrency']['cancel-in-progress'], False)
        self.assertEqual(expression(group, values()), 'workout-journal-production-delivery')
        self.assertEqual(expression(group, values(False)), 'workout-journal-production-delivery')
        for key, bad in [('github.event.workflow_run.conclusion', 'failure'),
                         ('github.event.workflow_run.event', 'pull_request'),
                         ('github.event.workflow_run.head_branch', 'feature')]:
            self.assertEqual(expression(group, {**values(), key: bad}), '12345')

    def test_all_release_checkouts_and_authority_outputs_are_bound(self):
        jobs = self.w['jobs']
        self.assertEqual(jobs['preflight']['steps'][0]['with']['ref'], '${{ github.workflow_sha }}')
        for name in ('candidate', 'verify-candidate', 'production'):
            self.assertEqual(jobs[name]['steps'][0]['with']['ref'], '${{ needs.preflight.outputs.source_sha }}')
            self.assertIn('preflight', jobs[name]['needs'])
            self.assertEqual(jobs[name]['env']['CD_CI_RUN_ATTEMPT'], '${{ needs.preflight.outputs.ci_run_attempt }}')
            self.assertEqual(jobs[name]['env']['CD_CI_RUN_ID'], '${{ needs.preflight.outputs.ci_run_id }}')
            self.assertEqual(jobs[name]['env']['E2E_SECRET_VERSION'], '${{ needs.preflight.outputs.e2e_secret_version }}')
        self.assertEqual(set(jobs['preflight']['outputs']), {'mode', 'source_sha', 'ci_run_id', 'ci_run_attempt', 'e2e_secret_version'})
        self.assertEqual(self.r['jobs']['e2e']['steps'][0]['with']['ref'], '${{ inputs.source_sha }}')
        for key in ('mode', 'source_sha', 'ci_run_id', 'ci_run_attempt', 'e2e_secret_version'):
            self.assertEqual(jobs['candidate-e2e']['with'][key], '${{ needs.preflight.outputs.' + key + ' }}')

    def test_production_requires_environment_dependencies_and_no_bypass_command(self):
        jobs = self.w['jobs']; production = jobs['production']
        self.assertEqual(production.get('environment'), 'production')
        self.assertEqual(set(production['needs']), {'preflight', 'candidate', 'verify-candidate'})
        self.assertEqual(set(jobs['verify-candidate']['needs']), {'preflight', 'candidate', 'candidate-e2e'})
        self.assertEqual(set(jobs['candidate-e2e']['needs']), {'preflight', 'candidate'})
        self.assertEqual(jobs['candidate']['needs'], 'preflight')
        for name, job in jobs.items():
            for step in job.get('steps', []):
                if 'run' in step:
                    expected = {'wif-control-negative': 'e2e_wif_proof.py control-negative', 'preflight': 'cd_release.py preflight',
                                'verify-candidate': 'cd_release.py verify', 'production': 'cd_release.py promote'}
                    allowed = ['cd_release.py prepare', 'cd_release.py candidate'] if name == 'candidate' else [expected[name]]
                    self.assertIn(step['run'], ['python3 -B .github/scripts/' + cmd for cmd in allowed])
        self.assertEqual(self.w['permissions'], {})
        for name, job in jobs.items():
            self.assertTrue(set(job['permissions']) <= {'contents', 'actions', 'id-token'})
            self.assertTrue(all(v == ('write' if k == 'id-token' else 'read') for k, v in job['permissions'].items()))
        self.assertNotIn('id-token', jobs['preflight']['permissions'])

    def test_reusable_automatic_and_manual_routes(self):
        for auto in (True, False):
            v = values(auto)
            v.update({'inputs.mode': 'automatic-release' if auto else 'manual-release', 'inputs.source_sha': SHA,
                      'inputs.ci_run_id': '99', 'inputs.ci_run_attempt': '1', 'inputs.e2e_secret_version': '1' if auto else '17',
                      'inputs.manifest': 'present', 'inputs.manifest_hash': 'present'})
            self.assertTrue(admitted(self.r['jobs']['e2e'], v))
            self.assertFalse(admitted(self.r['jobs']['e2e'], {**v, 'github.workflow_ref':
                'tyosu131/Workout-Journal/.github/workflows/other.yml@refs/heads/main'}))
            self.assertFalse(admitted(self.r['jobs']['wif-proof'], v))
            for field in ('inputs.source_sha', 'inputs.manifest', 'inputs.manifest_hash', 'inputs.ci_run_attempt'):
                self.assertFalse(admitted(self.r['jobs']['e2e'], {**v, field: ''}))
            if not auto: self.assertFalse(admitted(self.r['jobs']['e2e'], {**v, 'vars.CD_C1_ACTIVATION': ''}))

    def test_reusable_preflight_is_mandatory_before_authentication(self):
        steps = self.r['jobs']['e2e']['steps']
        preflights = [i for i, s in enumerate(steps) if s.get('run') ==
                      'python3 -B .github/scripts/candidate_e2e.py preflight']
        auths = [i for i, s in enumerate(steps) if s.get('uses', '').startswith('google-github-actions/auth@')]
        self.assertEqual(len(preflights), 1)
        self.assertEqual(len(auths), 1)
        self.assertLess(preflights[0], auths[0])
        preflight, auth = steps[preflights[0]], steps[auths[0]]
        for step in (preflight, auth):
            self.assertNotIn('if', step)  # Default success() must prevent auth after rejection.
            self.assertFalse(step.get('continue-on-error', False))
        self.assertEqual(preflight['env'], steps[-1]['env'])
        self.assertEqual(preflight['env']['CD_SOURCE_SHA'], '${{ inputs.source_sha }}')
        self.assertEqual(preflight['env']['CD_CI_RUN_ATTEMPT'], '${{ inputs.ci_run_attempt }}')
        self.assertEqual(preflight['env']['CD_MANIFEST'], '${{ inputs.manifest }}')
        self.assertEqual(preflight['env']['CD_MANIFEST_HASH'], '${{ inputs.manifest_hash }}')

    def test_guard_evaluator_rejects_unknown_syntax(self):
        for source in ('always()', 'contains(x, y)', 'x >= 1', 'x + 1', '!x', 'x ? y : z'):
            with self.assertRaises(AssertionError): expression(source, {})


if __name__ == '__main__':
    unittest.main()
