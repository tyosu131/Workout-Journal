"""Offline auth-response and actual workflow-graph tests; no live OIDC calls."""
import base64
from contextlib import redirect_stdout, redirect_stderr
from datetime import datetime, timedelta, timezone
import io
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unittest
from unittest.mock import patch, Mock
from urllib.error import HTTPError

import e2e_wif_proof as wif
import cd_release as release

SHA = 'a' * 40
MARKER = 'OFFLINE_CREDENTIAL_MARKER'
ENV = {'CD_MODE': 'wif-proof', 'GITHUB_REPOSITORY': wif.REPOSITORY,
       'GITHUB_REPOSITORY_ID': '790375516', 'GITHUB_REPOSITORY_OWNER_ID': '95160728',
       'GITHUB_REF': 'refs/heads/main', 'GITHUB_WORKFLOW_REF': wif.CALLER,
       'GITHUB_EVENT_NAME': 'workflow_dispatch', 'GITHUB_SHA': SHA, 'GITHUB_WORKFLOW_SHA': SHA,
       'GITHUB_RUN_ID': '12345', 'GITHUB_RUN_ATTEMPT': '1',
       'ACTIONS_ID_TOKEN_REQUEST_URL': 'https://run.actions.githubusercontent.com/job/idtoken?api-version=2.0',
       'ACTIONS_ID_TOKEN_REQUEST_TOKEN': MARKER}
METADATA = {'sourceSha': SHA, 'runId': '12345', 'runAttempt': '1'}
DENIED = (403, {'error': {'code': 403, 'status': 'PERMISSION_DENIED', 'message': MARKER}})


def jwt(role, **overrides):
    claims = {'iss': 'https://token.actions.githubusercontent.com',
              'aud': '//iam.googleapis.com/' + wif.PROVIDERS[role],
              'repository': wif.REPOSITORY, 'repository_id': '790375516',
              'repository_owner': 'tyosu131', 'repository_owner_id': '95160728',
              'ref': 'refs/heads/main', 'workflow_ref': wif.CALLER, 'sha': SHA,
              'workflow_sha': SHA, 'run_id': '12345', 'run_attempt': '1',
              'event_name': 'workflow_dispatch', 'job_workflow_ref': wif.CALLED,
              'job_workflow_sha': SHA, **overrides}
    body = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip('=')
    return 'header.' + body + '.signature'


def success():
    return 200, {'accessToken': MARKER, 'expireTime':
                 (datetime.now(timezone.utc) + timedelta(minutes=9)).isoformat()}


def responses(role, final=DENIED):
    return [(200, {'value': jwt(role)}), (200, {'access_token': 'FEDERATED_' + MARKER,
            'expires_in': 600, 'token_type': 'Bearer', 'issued_token_type': wif.ACCESS_TYPE}),
            success()] + ([final] if role == 'deploy' else [])


class AuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.git = patch.object(wif.subprocess, 'run', return_value=Mock(stdout=(SHA + '\n').encode()))
        self.git.start()
        self.addCleanup(self.git.stop)

    def test_control_and_negative_use_same_federated_identity(self):
        records = []
        with patch.object(wif, 'request_json', side_effect=responses('deploy')) as http:
            wif.run(ENV, 'control-negative', records)
        self.assertEqual([r['result'] for r in records], ['PASS', 'PASS'])
        calls = http.call_args_list
        self.assertEqual(len(calls), 4)
        self.assertEqual(calls[1].args, (wif.STS,))
        self.assertNotIn('token', calls[1].kwargs)  # No Authorization on STS.
        self.assertEqual(calls[2].kwargs['token'], 'FEDERATED_' + MARKER)
        self.assertEqual(calls[2].kwargs['token'], calls[3].kwargs['token'])
        self.assertEqual(calls[2].args[0], wif.IAM + wif.ACCOUNTS['deploy'] + ':generateAccessToken')
        self.assertEqual(calls[3].args[0], wif.IAM + wif.ACCOUNTS['e2e'] + ':generateAccessToken')
        self.assertEqual(calls[3].kwargs['body'], {'scope': [wif.SCOPE], 'lifetime': '600s'})
        self.assertNotIn(MARKER, json.dumps(records))

    def test_unexpected_negative_success_and_unrelated_failures_are_not_proof(self):
        for response in [success(), (200, {}), (403, {'error': {'code': 403, 'status': 'OTHER'}}),
                         (401, {}), (404, {}), (429, {}), (500, {}), (503, {}),
                         RuntimeError(MARKER)]:
            with self.subTest(response_type=type(response).__name__):
                records = []
                with patch.object(wif, 'request_json', side_effect=responses('deploy', response)) as http:
                    with self.assertRaises(Exception): wif.run(ENV, 'control-negative', records)
                self.assertEqual([r['result'] for r in records], ['PASS', 'FAIL'])
                self.assertEqual(http.call_count, 4)  # No retry, positive or recovery call.

    def test_control_failure_cannot_be_mistaken_for_negative_pass(self):
        for index in range(3):
            replies = responses('deploy')
            replies[index] = RuntimeError(MARKER)
            records = []
            with patch.object(wif, 'request_json', side_effect=replies) as http:
                with self.assertRaises(Exception): wif.run(ENV, 'control-negative', records)
            self.assertEqual(http.call_count, index + 1)
            self.assertEqual([r['result'] for r in records], ['FAIL'])

    def test_positive_uses_dedicated_provider_and_only_impersonates_e2e(self):
        records = []
        with patch.object(wif, 'request_json', side_effect=responses('e2e')) as http:
            wif.run(ENV, 'positive', records)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['result'], 'PASS')
        self.assertEqual(http.call_count, 3)
        self.assertEqual(http.call_args_list[1].kwargs['body']['audience'],
                         '//iam.googleapis.com/' + wif.PROVIDERS['e2e'])
        self.assertEqual(http.call_args.args[0], wif.IAM + wif.ACCOUNTS['e2e'] + ':generateAccessToken')

    def test_wrong_context_stops_before_oidc(self):
        for key in ('CD_MODE', 'GITHUB_REPOSITORY', 'GITHUB_REPOSITORY_ID', 'GITHUB_REPOSITORY_OWNER_ID',
                    'GITHUB_REF', 'GITHUB_WORKFLOW_REF', 'GITHUB_EVENT_NAME', 'GITHUB_SHA',
                    'GITHUB_WORKFLOW_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT'):
            with patch.object(wif, 'request_json') as http:
                with self.assertRaises(Exception): wif.run({**ENV, key: 'wrong'}, 'positive', [])
                http.assert_not_called()
        with patch.object(wif.subprocess, 'run', return_value=Mock(stdout=b'wrong')), \
             patch.object(wif, 'request_json') as http:
            with self.assertRaises(Exception): wif.run(ENV, 'positive', [])
            http.assert_not_called()

    def test_wrong_token_identity_and_called_workflow_stop_before_sts(self):
        for claim in ('repository_owner_id', 'repository_id', 'ref', 'workflow_ref', 'job_workflow_ref',
                      'job_workflow_sha', 'sha', 'workflow_sha', 'aud', 'iss', 'run_id', 'run_attempt'):
            with patch.object(wif, 'request_json', return_value=(200, {'value': jwt('e2e', **{claim: 'wrong'})})) as http:
                with self.assertRaises(Exception): wif.run(ENV, 'positive', [])
                self.assertEqual(http.call_count, 1)

    def test_oidc_request_token_cannot_go_to_arbitrary_url(self):
        for url in ('http://run.actions.githubusercontent.com/job/idtoken',
                    'https://evil.example/idtoken', 'https://actions.githubusercontent.com.evil.example/idtoken',
                    'https://run.actions.githubusercontent.com:444/job/idtoken',
                    'https://user@run.actions.githubusercontent.com/job/idtoken',
                    'https://run.actions.githubusercontent.com/other'):
            with patch.object(wif, 'request_json') as http:
                with self.assertRaises(Exception):
                    wif.github_token({**ENV, 'ACTIONS_ID_TOKEN_REQUEST_URL': url}, 'e2e', METADATA)
                http.assert_not_called()

    def test_no_raw_error_or_credentials_in_stdout_stderr_or_summary(self):
        for replies in (responses('deploy'), responses('deploy', RuntimeError(MARKER))):
            with tempfile.TemporaryDirectory() as directory:
                summary = Path(directory) / 'summary'
                with patch.dict(wif.os.environ, {**ENV, 'GITHUB_STEP_SUMMARY': str(summary)}, clear=True), \
                     patch.object(wif.sys, 'argv', ['proof', 'control-negative']), \
                     patch.object(wif.resource, 'setrlimit'), \
                     patch.object(wif, 'request_json', side_effect=replies), \
                     redirect_stdout(io.StringIO()) as out, redirect_stderr(io.StringIO()) as err:
                    code = wif.main()
                self.assertEqual(code, 0 if isinstance(replies[-1], tuple) else 1)
                for value in (out.getvalue(), err.getvalue(), summary.read_text()):
                    self.assertNotIn(MARKER, value)
                    self.assertNotIn('accessToken', value)
                self.assertEqual(err.getvalue(), '')
                self.assertEqual(set(json.loads(out.getvalue())), {'wifProof', 'checks'})

    def test_transport_refuses_redirects_and_limits_error_body(self):
        self.assertIsNone(wif.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://evil.example'))
        for body in (b'x' * (wif.LIMIT + 1), b'not json', b'[]'):
            error = HTTPError(wif.STS, 403, MARKER, {}, io.BytesIO(body))
            with patch.object(wif, 'build_opener') as opener:
                opener.return_value.open.side_effect = error
                with self.assertRaises(Exception): wif.request_json(wif.STS, body={})
        with patch.object(wif, 'build_opener') as opener:
            opener.return_value.open.side_effect = HTTPError(
                wif.STS, 403, MARKER, {}, io.BytesIO(json.dumps(DENIED[1]).encode()))
            self.assertEqual(wif.request_json(wif.STS, body={}), DENIED)
            self.assertEqual(opener.call_args.args[0].proxies, {})


def workflow(name):
    return json.loads(subprocess.check_output(['node', '-e',
        'process.stdout.write(JSON.stringify(require("js-yaml").load(require("fs").readFileSync(process.argv[1],"utf8"))))',
        str(wif.ROOT / '.github/workflows' / name)], cwd=wif.ROOT))


def admitted(job, values):
    # Deliberately small evaluator: rejects unfamiliar expressions, including
    # always()/failure()/OR bypasses, rather than pretending to execute Actions.
    for term in job.get('if', '').split(' && '):
        match = re.fullmatch(r"([a-zA-Z0-9_.]+) (==|!=) '([^']*)'", term)
        if not match:
            raise AssertionError('Unreviewed workflow guard: ' + term)
        key, operator, literal = match.groups()
        equal = values.get(key, '') == literal
        if equal != (operator == '=='):
            return False
    return True


class WorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.main, cls.reusable = workflow('cd.yml'), workflow('candidate-e2e.yml')

    def test_dispatch_default_and_complete_proof_reachability(self):
        dispatch = self.main['on']['workflow_dispatch']['inputs']
        self.assertEqual(dispatch['mode']['default'], 'wif-proof')
        self.assertEqual(dispatch['mode']['options'], ['wif-proof', 'release'])
        self.assertFalse(dispatch['e2e_secret_version']['required'])
        release_jobs = {'preflight', 'candidate', 'candidate-e2e', 'verify-candidate', 'production'}
        jobs = self.main['jobs']
        for mode in ('wif-proof', 'release', '', 'invalid'):
            for activation in ('', 'approved'):
                for negative_result in ('success', 'failure'):
                    values = {'github.repository': wif.REPOSITORY, 'github.ref': 'refs/heads/main',
                              'inputs.mode': mode, 'vars.CD_C1_ACTIVATION': activation}
                    reached = set()
                    for name, job in jobs.items():
                        needs = job.get('needs', [])
                        needs = [needs] if isinstance(needs, str) else needs
                        deps_ok = all(n in reached and not (n == 'wif-control-negative' and negative_result == 'failure') for n in needs)
                        if deps_ok and admitted(job, values): reached.add(name)
                    expected = ({'wif-control-negative', 'wif-positive'} if negative_result == 'success'
                                else {'wif-control-negative'}) if mode == 'wif-proof' else (
                                release_jobs if mode == 'release' and activation == 'approved' else set())
                    self.assertEqual(reached, expected)
        self.assertEqual(jobs['wif-positive']['uses'], './.github/workflows/candidate-e2e.yml')
        self.assertEqual(jobs['wif-positive']['with'], {'mode': 'wif-proof'})
        self.assertEqual(jobs['candidate-e2e']['with']['mode'], 'release')

    def test_reusable_proof_cannot_enter_secret_or_scenario_path(self):
        jobs = self.reusable['jobs']
        for mode in ('wif-proof', 'release', '', 'invalid'):
            for activation in ('', 'approved'):
                for manifest, digest in (('', ''), ('present', ''), ('', 'hash'), ('present', 'hash')):
                    values = {'github.repository': wif.REPOSITORY, 'github.ref': 'refs/heads/main',
                              'github.event_name': 'workflow_dispatch', 'inputs.mode': mode,
                              'inputs.manifest': manifest, 'inputs.manifest_hash': digest,
                              'vars.CD_C1_ACTIVATION': activation}
                    reached = {name for name, job in jobs.items() if admitted(job, values)}
                    expected = {'wif-proof'} if mode == 'wif-proof' else (
                        {'e2e'} if mode == 'release' and activation == 'approved' and manifest and digest else set())
                    self.assertEqual(reached, expected)
        for job in (self.main['jobs']['wif-control-negative'], jobs['wif-proof']):
            self.assertEqual(job['permissions'], {'contents': 'read', 'id-token': 'write'})
            self.assertNotIn('environment', job)
            self.assertEqual(len(job['steps']), 2)
            checkout, proof = job['steps']
            self.assertRegex(checkout['uses'], r'^actions/checkout@[a-f0-9]{40}$')
            self.assertIs(checkout['with']['persist-credentials'], False)
            self.assertEqual(checkout['with']['ref'], '${{ github.sha }}')
            self.assertRegex(proof['run'], r'^python3 -B \.github/scripts/e2e_wif_proof.py (control-negative|positive)$')
        self.assertEqual(jobs['wif-proof']['steps'][-1]['env']['CD_MODE'], 'wif-proof')
        self.assertEqual(jobs['e2e']['steps'][-1]['env']['CD_MODE'], 'release')

    def test_release_controller_rejects_proof_and_preflight_requires_numeric_version(self):
        for mode in ('wif-proof', '', 'invalid'):
            with self.assertRaises(release.proof.GateError):
                release.identity({**ENV, 'CD_MODE': mode, 'CD_C1_ACTIVATION': 'approved'})
        for version in ('', 'latest', '0', '-1', '1\n', '1;command'):
            env = {**ENV, 'CD_MODE': 'release', 'CD_C1_ACTIVATION': 'approved', 'E2E_SECRET_VERSION': version}
            with patch.dict(release.os.environ, env, clear=True), \
                 patch.object(release.sys, 'argv', ['cd_release.py', 'preflight']), \
                 patch.object(release, 'preflight') as preflight, \
                 redirect_stderr(io.StringIO()), redirect_stdout(io.StringIO()):
                self.assertEqual(release.main(), 1)
                preflight.assert_not_called()


if __name__ == '__main__':
    unittest.main()
