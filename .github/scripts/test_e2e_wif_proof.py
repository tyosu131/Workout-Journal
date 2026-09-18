"""Offline auth-response and actual workflow-graph tests; no live OIDC calls."""
import base64
from contextlib import redirect_stdout, redirect_stderr
from datetime import datetime, timedelta, timezone
import io
import json
from pathlib import Path
import re
import socket
import ssl
import subprocess
import tempfile
import unittest
from unittest.mock import patch, Mock
from urllib.error import HTTPError, URLError

import e2e_wif_proof as wif
import cd_release as release

SHA = 'a' * 40
MARKER = 'OFFLINE_CREDENTIAL_MARKER'
PATH_MARKER = 'OFFLINE_PATH_MARKER'
QUERY_MARKER = 'OFFLINE_QUERY_MARKER'
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
                    'https://run.actions.githubusercontent.com/other#fragment'):
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

    def diagnose(self, replies, *, action='control-negative', overrides=None, missing=()):
        with tempfile.TemporaryDirectory() as directory:
            summary = Path(directory) / 'summary'
            env = {**ENV, 'GITHUB_STEP_SUMMARY': str(summary),
                   'ACTIONS_ID_TOKEN_REQUEST_URL': ENV['ACTIONS_ID_TOKEN_REQUEST_URL'] +
                   '&private=' + MARKER, **(overrides or {})}
            for key in missing:
                env.pop(key, None)
            # A mapping permits synthetic non-string runner inputs. No real env
            # or credential is used. None replies exercises the real JSON client
            # with build_opener mocked by the caller.
            http_patch = (patch.object(wif, 'request_json', wraps=wif.request_json) if replies is None
                          else patch.object(wif, 'request_json', side_effect=replies))
            with patch.object(wif.os, 'environ', env), \
                 patch.object(wif.sys, 'argv', ['proof', action]), \
                 patch.object(wif.resource, 'setrlimit'), \
                 http_patch as http, \
                 redirect_stdout(io.StringIO()) as out, redirect_stderr(io.StringIO()) as err:
                code = wif.main()
            evidence = json.loads(out.getvalue())
            self.assertEqual(summary.read_text(), '```json\n' + out.getvalue() + '```\n')
            self.assertEqual(err.getvalue(), '')
            for value in (out.getvalue(), err.getvalue(), summary.read_text()):
                for forbidden in (MARKER, PATH_MARKER, QUERY_MARKER,
                                  jwt('deploy'), jwt('e2e'), 'accessToken', 'access_token',
                                  'https://', 'private=', 'api-version=', 'Authorization',
                                  'Traceback', 'sourceSha', 'runId', 'runAttempt',
                                  'run.actions.githubusercontent.com', 'evil.example', '/job/idtoken',
                                  '//iam.googleapis.com/', 'Bearer ', 'WIF_PROOF_REFUSED',
                                  'ValueError', 'RuntimeError', 'ACTIONS_ID_TOKEN_REQUEST_URL'):
                    self.assertTrue(forbidden not in value, 'Sensitive diagnostic output')
            for record in evidence['checks']:
                self.assertLessEqual(set(record), {'phase', 'failureCode', 'providerRole',
                                                   'targetSA', 'expected', 'result'})
                self.assertEqual(record, wif.public_record(record))
                if record['result'] == 'PASS':
                    self.assertNotIn('failureCode', record)
                else:
                    self.assertEqual(record['phase'], wif.FAILURE_PHASES[record['failureCode']])
            return code, evidence, http.call_count

    def test_fixed_diagnostics_for_each_control_phase(self):
        cases = [
            ('P0', 'CONTEXT_PRECHECK_FAILED', None, None, {'CD_MODE': MARKER}, 0),
            ('P1', 'OIDC_ENDPOINT_HOST_FAILED', None, None,
             {'ACTIONS_ID_TOKEN_REQUEST_URL': 'https://evil.example/idtoken?token=' + MARKER}, 0),
            ('P1', 'OIDC_REQUEST_TOKEN_VALIDATION_FAILED', None, None,
             {'ACTIONS_ID_TOKEN_REQUEST_TOKEN': MARKER + ' '}, 0),
            ('P1', 'OIDC_TRANSPORT_FAILED', 0, RuntimeError(MARKER), {}, 1),
            ('P1', 'OIDC_HTTP_STATUS_FAILED', 0, (401, {'message': MARKER}), {}, 1),
            ('P2', 'OIDC_RESPONSE_INVALID', 0, wif.InvalidResponse(MARKER), {}, 1),
            ('P2', 'OIDC_RESPONSE_INVALID', 0, (200, {'value': MARKER}), {}, 1),
            ('P2', 'OIDC_RESPONSE_INVALID', 0, (200, {'value': 'header.x.signature'}), {}, 1),
            ('P2', 'OIDC_RESPONSE_INVALID', 0, (200, {'value': 'header.W10.signature'}), {}, 1),
            ('P2', 'OIDC_CLAIMS_MISMATCH', 0, (200, {'value': 'header.e30.signature'}), {}, 1),
            ('P2', 'OIDC_CLAIMS_MISMATCH', 0, (200, {'value': jwt('deploy', aud=MARKER)}), {}, 1),
            ('P3', 'STS_EXCHANGE_FAILED', 1, RuntimeError(MARKER), {}, 2),
            ('P3', 'STS_EXCHANGE_FAILED', 1, (403, {'message': MARKER}), {}, 2),
            ('P3', 'STS_EXCHANGE_FAILED', 1, wif.InvalidResponse(MARKER), {}, 2),
            ('P3', 'STS_EXCHANGE_FAILED', 1, (200, {'access_token': MARKER}), {}, 2),
            ('P4', 'DEPLOY_IMPERSONATION_FAILED', 2, RuntimeError(MARKER), {}, 3),
            ('P4', 'DEPLOY_IMPERSONATION_FAILED', 2, DENIED, {}, 3),
            ('P4', 'DEPLOY_IMPERSONATION_FAILED', 2,
             (200, {'accessToken': MARKER, 'expireTime': MARKER}), {}, 3),
        ]
        for phase, failure, index, response, env, calls in cases:
            with self.subTest(failure=failure, index=index, calls=calls):
                replies = responses('deploy')
                if index is not None:
                    replies[index] = response
                code, evidence, actual_calls = self.diagnose(replies, overrides=env)
                self.assertEqual(code, 1)
                self.assertEqual(evidence['wifProof'], 'FAIL')
                self.assertEqual(len(evidence['checks']), 1)  # B never reached.
                self.assertEqual(evidence['checks'][0]['failureCode'], failure)
                self.assertEqual(evidence['checks'][0]['phase'], phase)
                self.assertEqual(actual_calls, calls)

    def assert_oidc_failure(self, outcome, failure, *, phase='P1', calls=1, role='deploy'):
        code, evidence, actual_calls = outcome
        self.assertEqual((code, actual_calls), (1, calls))
        self.assertEqual(evidence, {'wifProof': 'FAIL', 'checks': [{
            'phase': phase, 'failureCode': failure, 'providerRole': role,
            'targetSA': wif.ACCOUNTS[role], 'expected': 'AUTH_SUCCESS', 'result': 'FAIL'}]})

    def assert_endpoint_failure(self, suffix, urls):
        # Both callers share this endpoint policy. Every case exercises main(),
        # all three output sinks, exact diagnostics and zero HTTP calls.
        for index, url in enumerate(urls):
            for action, role in [('control-negative', 'deploy'), ('positive', 'e2e')]:
                with self.subTest(condition=suffix, case=index, role=role):
                    self.assert_oidc_failure(self.diagnose(
                        [], action=action, overrides={'ACTIONS_ID_TOKEN_REQUEST_URL': url}),
                        'OIDC_ENDPOINT_' + suffix + '_FAILED', calls=0, role=role)

    def test_endpoint_missing_diagnostic(self):
        key = 'ACTIONS_ID_TOKEN_REQUEST_URL'
        for action, role in [('control-negative', 'deploy'), ('positive', 'e2e')]:
            self.assert_oidc_failure(self.diagnose([], action=action, missing=(key,)),
                                     'OIDC_ENDPOINT_URL_MISSING_FAILED', calls=0, role=role)
        self.assert_endpoint_failure('URL_MISSING', ['', None])

    def test_endpoint_parse_diagnostic(self):
        self.assert_endpoint_failure('PARSE', [
            'https://[' + MARKER + '/idtoken',
            'https://[' + MARKER + ']/idtoken',
            'https://' + MARKER + '\uff0f.example/idtoken', 123, [MARKER]])
        with patch.object(wif, 'urlsplit', side_effect=ValueError(MARKER)):
            self.assert_endpoint_failure('PARSE', [ENV['ACTIONS_ID_TOKEN_REQUEST_URL']])

    def test_endpoint_scheme_diagnostic(self):
        self.assert_endpoint_failure('SCHEME', [
            scheme + '://run.actions.githubusercontent.com/job/idtoken?private=' + MARKER
            for scheme in ('http', 'ftp', 'other')] + [MARKER])

    def test_endpoint_host_diagnostic(self):
        self.assert_endpoint_failure('HOST', [
            'https:///job/idtoken?private=' + MARKER,
            *['https://' + host + '/job/idtoken?private=' + MARKER for host in (
                'evil.example', 'actions.githubusercontent.com.evil.example',
                'evilactions.githubusercontent.com', 'actions.githubusercontent.com')]])

    def test_endpoint_port_diagnostic(self):
        # urlsplit accepts these authorities; .port raises on invalid/range
        # errors. They must remain PORT, never PARSE or HOST.
        self.assert_endpoint_failure('PORT', [
            'https://run.actions.githubusercontent.com:' + port + '/job/idtoken?private=' + MARKER
            for port in ('444', MARKER, '65536', '-1')])

    def test_endpoint_userinfo_diagnostic(self):
        self.assert_endpoint_failure('USERINFO', [
            'https://' + userinfo + '@run.actions.githubusercontent.com/job/idtoken'
            for userinfo in (MARKER, ':' + MARKER, MARKER + ':' + MARKER)])

    def test_endpoint_fragment_diagnostic(self):
        self.assert_endpoint_failure('FRAGMENT', [
            ENV['ACTIONS_ID_TOKEN_REQUEST_URL'] + '#' + MARKER])

    def test_opaque_paths_reach_request_token_validation(self):
        # Synthetic paths exercise opacity, not a replacement production pattern.
        for path in ('', '/', '/other', '/idtoken/', '/IDTOKEN',
                     '/' + PATH_MARKER + '/A%2fb//./../leaf;v=1/'):
            for action, role in [('control-negative', 'deploy'), ('positive', 'e2e')]:
                with self.subTest(path_case=len(path), role=role):
                    self.assert_oidc_failure(self.diagnose([], action=action, overrides={
                        'ACTIONS_ID_TOKEN_REQUEST_URL':
                            'https://run.actions.githubusercontent.com' + path,
                        'ACTIONS_ID_TOKEN_REQUEST_TOKEN': MARKER + ' '}),
                        'OIDC_REQUEST_TOKEN_VALIDATION_FAILED', calls=0, role=role)

    def test_opaque_paths_and_query_are_preserved_in_actual_request(self):
        from urllib.parse import parse_qsl, urlsplit
        # Real Request/JSON client, mocked transport only. No OIDC/network calls.
        query = 'x=one+two&empty=&x=three&opaque=%2Fkeep%2Bvalue&private=' + QUERY_MARKER
        paths = ('', '/', '/other', '/idtoken/', '/IDTOKEN',
                 '/' + PATH_MARKER + '/A%2fb//./../leaf;v=1/')
        for role in ('deploy', 'e2e'):
            for path in paths:
                for old_audience in ('', '&audience=old&%61udience=older'):
                    with self.subTest(role=role, path_case=len(path), replacing=bool(old_audience)), \
                         patch.object(wif, 'build_opener') as opener:
                        response = opener.return_value.open.return_value
                        response.code = 200
                        response.read.return_value = json.dumps({'value': jwt(role)}).encode()
                        url = 'https://run.actions.githubusercontent.com:443' + path + '?' + query + old_audience
                        self.assertEqual(wif.github_token(
                            {**ENV, 'ACTIONS_ID_TOKEN_REQUEST_URL': url}, role, METADATA), jwt(role))
                        request = opener.return_value.open.call_args.args[0]
                        actual = urlsplit(request.full_url)
                        self.assertEqual(actual.path, path)
                        self.assertEqual(actual._replace(query=''), urlsplit(url)._replace(query=''))
                        self.assertEqual(parse_qsl(actual.query), [
                            ('x', 'one two'), ('x', 'three'), ('opaque', '/keep+value'),
                            ('private', QUERY_MARKER),
                            ('audience', '//iam.googleapis.com/' + wif.PROVIDERS[role])])
                        # HTTP uses '/' for an empty path; every nonempty path is exact.
                        self.assertEqual(request.selector, (path or '/') + '?' + actual.query)
                        self.assertEqual(request.get_method(), 'GET')
                        self.assertIsNone(request.data)
                        self.assertEqual(request.get_header('Authorization'), 'Bearer ' + MARKER)
                        opener.return_value.open.assert_called_once()

    def test_opaque_endpoint_data_stays_private_in_all_output_sinks(self):
        url = ('https://run.actions.githubusercontent.com/' + PATH_MARKER +
               '/arbitrary?private=' + QUERY_MARKER)
        for action, role in [('control-negative', 'deploy'), ('positive', 'e2e')]:
            for failure in (None, RuntimeError(url + ' Authorization: Bearer ' + MARKER),
                            (200, {'value': MARKER, 'raw': url})):
                with self.subTest(role=role, failure_type=type(failure).__name__):
                    replies = responses(role)
                    if failure is not None:
                        replies[0] = failure
                    outcome = self.diagnose(replies, action=action,
                        overrides={'ACTIONS_ID_TOKEN_REQUEST_URL': url})
                    if failure is None:
                        code, evidence, calls = outcome
                        self.assertEqual((code, evidence['wifProof']), (0, 'PASS'))
                        self.assertEqual(calls, 4 if role == 'deploy' else 3)
                        self.assertEqual([r['result'] for r in evidence['checks']],
                                         ['PASS', 'PASS'] if role == 'deploy' else ['PASS'])
                    else:
                        self.assert_oidc_failure(outcome,
                            'OIDC_TRANSPORT_FAILED' if isinstance(failure, Exception)
                            else 'OIDC_RESPONSE_INVALID',
                            phase='P1' if isinstance(failure, Exception) else 'P2', role=role)

    def test_endpoint_query_build_diagnostic(self):
        # Inject into existing operations; no production-only test branches.
        for operation in ('parse_qsl', 'urlencode', 'urlunsplit'):
            with self.subTest(operation=operation), \
                 patch.object(wif, operation, side_effect=ValueError(MARKER)):
                self.assert_endpoint_failure('QUERY_BUILD', [ENV['ACTIONS_ID_TOKEN_REQUEST_URL']])
        parts = wif.urlsplit(ENV['ACTIONS_ID_TOKEN_REQUEST_URL'])
        with patch.object(type(parts), '_replace', side_effect=ValueError(MARKER)):
            self.assert_endpoint_failure('QUERY_BUILD', [ENV['ACTIONS_ID_TOKEN_REQUEST_URL']])

    def test_endpoint_checks_preserve_first_failure_order(self):
        cases = [
            ('PARSE', 'http://[' + MARKER),
            ('SCHEME', 'http://' + MARKER + '@evil.example:invalid/other#fragment'),
            ('HOST', 'https://' + MARKER + '@evil.example:invalid/other#fragment'),
            ('PORT', 'https://' + MARKER + '@run.actions.githubusercontent.com:invalid/other#fragment'),
            ('USERINFO', 'https://' + MARKER + '@run.actions.githubusercontent.com/other#fragment'),
            ('FRAGMENT', 'https://run.actions.githubusercontent.com/other#' + MARKER),
        ]
        # Query building and token validation must not run after an earlier
        # failure. In particular do not eagerly read .port before scheme/host.
        with patch.object(wif, 'parse_qsl', side_effect=ValueError(MARKER)) as query, \
             patch.object(wif, 'token_value', side_effect=ValueError(MARKER)) as token:
            for suffix, url in cases:
                self.assert_endpoint_failure(suffix, [url])
            query.assert_not_called()
            token.assert_not_called()

    def test_endpoint_accepted_variants_keep_exact_query_semantics(self):
        # Empty userinfo/fragment/port were allowed by the original predicates;
        # diagnostics must neither tighten those nor change query normalization.
        from urllib.parse import urlsplit
        query = 'x=one+two&empty=&x=three&audience=old&%61udience=older&private=' + MARKER
        expected_query = ('x=one+two&x=three&private=' + MARKER +
                          '&audience=%2F%2Fiam.googleapis.com%2F' +
                          wif.PROVIDERS['deploy'].replace('/', '%2F'))
        for authority in ('run.actions.githubusercontent.com',
                          'RUN.actions.githubusercontent.com:443',
                          'run.actions.githubusercontent.com:0443',
                          'run.actions.githubusercontent.com:',
                          ':@run.actions.githubusercontent.com'):
            url = 'HTTPS://' + authority + '/prefix/idtoken?' + query + '#'
            with self.subTest(authority=authority), \
                 patch.object(wif, 'request_json', return_value=(200, {'value': jwt('deploy')})) as http:
                self.assertEqual(wif.github_token({**ENV, 'ACTIONS_ID_TOKEN_REQUEST_URL': url},
                                                 'deploy', METADATA), jwt('deploy'))
                actual = urlsplit(http.call_args.args[0])
                self.assertEqual(actual.query, expected_query)
                self.assertEqual(actual._replace(query=''), urlsplit(url)._replace(query=''))
                self.assertEqual(http.call_args.kwargs, {'token': MARKER})
                http.assert_called_once()

    def test_request_token_failures_are_distinct_and_never_attempt_transport(self):
        key = 'ACTIONS_ID_TOKEN_REQUEST_TOKEN'
        self.assert_oidc_failure(self.diagnose([], missing=(key,)),
                                 'OIDC_REQUEST_TOKEN_VALIDATION_FAILED', calls=0)
        for index, token in enumerate(('', None, 123, [MARKER], {'value': MARKER}, MARKER.encode(),
                                       MARKER + ' ', MARKER + '\n', 'Bearer ' + MARKER,
                                       MARKER + '===', MARKER + ('x' * 16384))):
            with self.subTest(case=index):
                self.assert_oidc_failure(self.diagnose([], overrides={key: token}),
                                         'OIDC_REQUEST_TOKEN_VALIDATION_FAILED', calls=0)

    def test_real_client_transport_exceptions_have_exact_safe_diagnostic(self):
        errors = [TimeoutError(MARKER), socket.gaierror(MARKER),
                  URLError(MARKER), ssl.SSLError(MARKER), RuntimeError(MARKER)]
        for error in errors:
            with self.subTest(kind=type(error).__name__), patch.object(wif, 'build_opener') as opener:
                opener.return_value.open.side_effect = error
                self.assert_oidc_failure(self.diagnose(None), 'OIDC_TRANSPORT_FAILED')
                self.assertEqual(opener.return_value.open.call_count, 1)
        with patch.object(wif, 'build_opener') as opener:
            opener.return_value.open.return_value.read.side_effect = TimeoutError(MARKER)
            self.assert_oidc_failure(self.diagnose(None), 'OIDC_TRANSPORT_FAILED')

    def test_real_client_parseable_http_rejections_are_not_transport_or_p2(self):
        # Refused redirects with a parseable body are HTTP responses, not a
        # followed request. Invalid redirect bodies retain the P2 parser gate.
        for status in (201, 204, 301, 302, 307, 308, 401, 403, 404, 429, 500, 503):
            with self.subTest(status=status), patch.object(wif, 'build_opener') as opener:
                opener.return_value.open.side_effect = HTTPError(
                    ENV['ACTIONS_ID_TOKEN_REQUEST_URL'], status, MARKER,
                    {'Location': 'https://evil.example/' + MARKER},
                    io.BytesIO(json.dumps({'message': MARKER}).encode()))
                self.assert_oidc_failure(self.diagnose(None), 'OIDC_HTTP_STATUS_FAILED')
                self.assertEqual(opener.return_value.open.call_count, 1)

    def test_real_client_invalid_body_remains_p2_before_status_check(self):
        for status in (200, 302, 401, 503):
            for index, body in enumerate((MARKER.encode(), b'[]', b'"' + MARKER.encode() + b'"',
                                          b'\xff' + MARKER.encode(), MARKER.encode() * wif.LIMIT)):
                with self.subTest(status=status, case=index), patch.object(wif, 'build_opener') as opener:
                    opener.return_value.open.side_effect = HTTPError(
                        ENV['ACTIONS_ID_TOKEN_REQUEST_URL'], status, MARKER, {}, io.BytesIO(body))
                    self.assert_oidc_failure(self.diagnose(None), 'OIDC_RESPONSE_INVALID', phase='P2')

    def test_missing_or_invalid_jwt_remains_p2(self):
        for index, data in enumerate(({}, {'value': None}, {'value': 123}, {'value': MARKER},
                                     {'value': MARKER + ' '}, {'value': 'header.x.signature'},
                                     {'value': 'header.W10.signature'})):
            with self.subTest(case=index):
                self.assert_oidc_failure(self.diagnose([(200, {**data, 'private': MARKER})]),
                                         'OIDC_RESPONSE_INVALID', phase='P2')
        self.assert_oidc_failure(self.diagnose([(200, {'value': jwt('deploy', aud=MARKER)})]),
                                 'OIDC_CLAIMS_MISMATCH', phase='P2')

    def test_p1_codes_also_classify_positive_provider_without_impersonation(self):
        for overrides, replies, failure, calls in [
            ({'ACTIONS_ID_TOKEN_REQUEST_URL': MARKER}, [], 'OIDC_ENDPOINT_SCHEME_FAILED', 0),
            ({'ACTIONS_ID_TOKEN_REQUEST_TOKEN': MARKER + ' '}, [],
             'OIDC_REQUEST_TOKEN_VALIDATION_FAILED', 0),
            ({}, [RuntimeError(MARKER)], 'OIDC_TRANSPORT_FAILED', 1),
            ({}, [(403, {'message': MARKER})], 'OIDC_HTTP_STATUS_FAILED', 1),
        ]:
            self.assert_oidc_failure(self.diagnose(replies, action='positive', overrides=overrides),
                                     failure, calls=calls, role='e2e')

    def test_real_oidc_request_keeps_get_bearer_audience_and_transport_policy(self):
        from urllib.parse import parse_qs, urlsplit
        with patch.object(wif, 'build_opener') as opener:
            response = opener.return_value.open.return_value
            response.code = 200
            response.read.return_value = json.dumps({'value': jwt('deploy')}).encode()
            self.assertEqual(wif.github_token(ENV, 'deploy', METADATA), jwt('deploy'))
            request = opener.return_value.open.call_args.args[0]
            self.assertEqual(request.get_method(), 'GET')
            self.assertIsNone(request.data)
            self.assertEqual(request.get_header('Authorization'), 'Bearer ' + MARKER)
            self.assertEqual(request.get_header('Accept'), 'application/json')
            self.assertFalse(request.has_header('Content-type'))
            self.assertEqual(parse_qs(urlsplit(request.full_url).query), {
                'api-version': ['2.0'], 'audience': ['//iam.googleapis.com/' + wif.PROVIDERS['deploy']]})
            self.assertEqual(opener.return_value.open.call_count, 1)
            self.assertEqual(opener.return_value.open.call_args.kwargs, {'timeout': 30})
            self.assertEqual(opener.call_args.args[0].proxies, {})
            self.assertIsInstance(opener.call_args.args[1], wif.NoRedirect)
            response.read.assert_called_once_with(wif.LIMIT + 1)

    def test_negative_and_positive_diagnostics_keep_exact_success_contract(self):
        for final in (success(), (200, {}), (401, {}), (404, {}), (429, {}), (500, {}),
                      (503, {}), (403, {'error': {'code': 403, 'status': MARKER}}),
                      RuntimeError(MARKER), wif.InvalidResponse(MARKER)):
            code, evidence, calls = self.diagnose(responses('deploy', final))
            self.assertEqual((code, calls), (1, 4))
            self.assertEqual([r['result'] for r in evidence['checks']], ['PASS', 'FAIL'])
            self.assertEqual(evidence['checks'][1]['failureCode'], 'NEGATIVE_DENIAL_MISMATCH')
            self.assertEqual(evidence['checks'][1]['phase'], 'P5')
        for role, action in [('deploy', 'control-negative'), ('e2e', 'positive')]:
            code, evidence, calls = self.diagnose(responses(role), action=action)
            self.assertEqual((code, evidence['wifProof']), (0, 'PASS'))
            self.assertEqual(calls, 4 if role == 'deploy' else 3)
            self.assertTrue(all(r['result'] == 'PASS' for r in evidence['checks']))
        for failure in (DENIED, RuntimeError(MARKER), wif.InvalidResponse(MARKER)):
            replies = responses('e2e')
            replies[2] = failure
            code, evidence, calls = self.diagnose(replies, action='positive')
            self.assertEqual((code, calls), (1, 3))
            self.assertEqual(evidence['checks'][0]['failureCode'], 'POSITIVE_E2E_IMPERSONATION_FAILED')

    def test_public_record_drops_untrusted_keys_and_values(self):
        record = {key: MARKER for key in ['phase', 'failureCode', 'providerRole', 'targetSA',
                                          'expected', 'result', 'response', 'exception', 'url']}
        self.assertEqual(wif.public_record(record), {})
        self.assertEqual(wif.public_record({'result': 'FAIL', 'response': {'token': MARKER}}),
                         {'result': 'FAIL'})

    def test_entrypoint_precheck_failures_are_safe_and_never_authenticate(self):
        code, evidence, calls = self.diagnose([], action=MARKER)
        self.assertEqual((code, calls), (1, 0))
        self.assertEqual(evidence['checks'][0]['failureCode'], 'CONTEXT_PRECHECK_FAILED')
        for argv, setup_error in [(['proof'], None), (['proof', 'control-negative'], RuntimeError(MARKER))]:
            with patch.dict(wif.os.environ, ENV, clear=True), \
                 patch.object(wif.sys, 'argv', argv), \
                 patch.object(wif.resource, 'setrlimit', side_effect=setup_error), \
                 patch.object(wif, 'request_json') as http, \
                 redirect_stdout(io.StringIO()) as out, redirect_stderr(io.StringIO()) as err:
                self.assertEqual(wif.main(), 1)
            http.assert_not_called()
            self.assertEqual(err.getvalue(), '')
            self.assertNotIn(MARKER, out.getvalue())
            self.assertEqual(json.loads(out.getvalue()), {'wifProof': 'FAIL', 'checks': [
                {'phase': 'P0', 'failureCode': 'CONTEXT_PRECHECK_FAILED', 'result': 'FAIL'}]})

    def test_real_response_parser_classifies_oidc_invalid_body_without_disclosure(self):
        for body in (MARKER.encode(), b'[]', b'"' + MARKER.encode() + b'"', b'x' * (wif.LIMIT + 1)):
            record = {}
            with patch.object(wif, 'build_opener') as opener:
                opener.return_value.open.side_effect = HTTPError(
                    ENV['ACTIONS_ID_TOKEN_REQUEST_URL'], 200, MARKER, {}, io.BytesIO(body))
                with self.assertRaises(wif.InvalidResponse):
                    wif.github_token(ENV, 'deploy', METADATA, record)
            self.assertEqual(record, {'phase': 'P2', 'failureCode': 'OIDC_RESPONSE_INVALID'})

    def test_oidc_audience_is_replaced_and_encoded_without_changing_target(self):
        from urllib.parse import parse_qs, urlsplit
        env = {**ENV, 'ACTIONS_ID_TOKEN_REQUEST_URL': ENV['ACTIONS_ID_TOKEN_REQUEST_URL'] +
               '&audience=wrong&private=' + MARKER}
        with patch.object(wif, 'request_json', return_value=(200, {'value': jwt('deploy')})) as http:
            wif.github_token(env, 'deploy', METADATA)
        query = parse_qs(urlsplit(http.call_args.args[0]).query)
        self.assertEqual(query['audience'], ['//iam.googleapis.com/' + wif.PROVIDERS['deploy']])
        self.assertEqual(query['private'], [MARKER])


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
        self.assertEqual(self.main['permissions'], {})
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
