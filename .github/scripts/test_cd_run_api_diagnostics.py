"""Cloud Run failure provenance through the real HTTP/CAS/controller path, offline."""
from contextlib import redirect_stderr, redirect_stdout
import gc
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
import warnings
import weakref
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError, URLError

import cd_release as cd
import test_cd_diagnostics as diagnostics
from test_cd_release import AUTHORITY, ENV, fixture


PRIVATE = ('SECRET_MARKER', 'TOKEN_MARKER', 'CREDENTIAL_MARKER', 'REQUEST_MARKER',
           'RESPONSE_MARKER', 'REASON_MARKER', 'HEADER_MARKER', 'Authorization',
           'https://private.invalid', 'user@synthetic.invalid')
RAW = ' '.join(PRIVATE)


def response(data):
    value = MagicMock()
    value.__enter__.return_value = value
    value.read.return_value = data if isinstance(data, bytes) else cd.canonical(data).encode()
    return value


def http_status(status=403):
    return HTTPError('https://private.invalid', status, RAW,
                     {'Authorization': 'TOKEN_MARKER', 'X-Private': 'HEADER_MARKER'}, io.BytesIO(RAW.encode()))


def failure_cases():
    return [('http status', http_status(), 'HTTP_STATUS'),
            ('timeout', TimeoutError(RAW), 'TIMEOUT'),
            ('wrapped timeout', URLError(TimeoutError(RAW)), 'TIMEOUT'),
            ('connection', ConnectionResetError(RAW), 'CONNECTION'),
            ('wrapped connection', URLError(ConnectionRefusedError(RAW)), 'CONNECTION'),
            ('url reason text', URLError(RAW), 'CONNECTION'),
            ('json parse', response(RAW.encode()), 'JSON_PARSE'),
            ('json encoding', response(b'\xff' + RAW.encode()), 'JSON_PARSE'),
            ('unexpected exception', RuntimeError(RAW), 'UNKNOWN')]


class RunApiDiagnosticTests(unittest.TestCase):
    def assert_private_absent(self, output):
        for marker in PRIVATE:
            self.assertNotIn(marker, output)

    def api_error(self, effect, stage='PATCH'):
        stdout, stderr = io.StringIO(), io.StringIO()
        path = (f'projects/{cd.proof.PROJECT}/locations/{cd.proof.REGION}/operations/test-operation'
                if stage == 'OPERATION_GET' else cd.service_path('backend'))
        with patch.object(cd.proof, 'command', return_value=b'TOKEN_MARKER'), \
             patch.object(cd, 'build_opener') as opener, redirect_stdout(stdout), redirect_stderr(stderr):
            opener.return_value.open.side_effect = [effect]
            with self.assertRaises(cd.proof.GateError) as raised:
                cd.cloud_run(path, method='PATCH' if stage == 'PATCH' else 'GET', stage=stage,
                             body={'private': 'REQUEST_MARKER'} if stage == 'PATCH' else None)
        self.assertEqual(opener.return_value.open.call_count, 1)
        self.assertEqual(raised.exception.args, ('RUN_API_FAILED',))
        self.assertTrue(raised.exception.__suppress_context__)
        self.assert_private_absent(stdout.getvalue() + stderr.getvalue() + str(raised.exception))
        return raised.exception

    def exercise_controller(self, effect, stage):
        _, state, revisions, manifest = fixture()
        current = state['backend']
        name = cd.service_path('backend')
        operation = f'projects/{cd.proof.PROJECT}/locations/{cd.proof.REGION}/operations/test-operation'
        service = {'name': name, 'etag': 'exact-etag', 'generation': '10',
                   'trafficStatuses': [{'revision': t['revision'], 'percent': t['percent'],
                                        'tag': t['tag'], 'uri': t['url']} for t in current['traffic']]}
        replies = ([] if stage == 'OTHER' else [response(service)])
        if stage == 'OPERATION_GET':
            replies.append(response({'name': operation, 'done': False}))
        replies.append(effect)
        stdout, stderr = io.StringIO(), io.StringIO()
        with tempfile.TemporaryDirectory(prefix='cd-run-api-') as temp:
            summary = Path(temp) / 'summary.md'
            env = {**ENV, 'CD_MANIFEST_HASH': cd.digest(manifest), 'CD_E2E_HASH': cd.digest(manifest),
                   'GITHUB_STEP_SUMMARY': str(summary)}
            with patch.dict(os.environ, env, clear=True), patch.object(cd.sys, 'argv', ['cd_release.py', 'promote']), \
                 patch.object(cd, 'input_manifest', return_value=manifest), \
                 patch.object(cd, 'preflight', return_value=AUTHORITY), patch.object(cd.proof, 'check_credentials'), \
                 patch.object(cd, 'read_state', return_value=state), \
                 patch.object(cd, 'read_revision', side_effect=lambda revision: revisions[revision]), \
                 patch.object(cd.proof, 'command', return_value=b'TOKEN_MARKER') as token, \
                 patch.object(cd, 'build_opener') as opener, patch.object(cd.time, 'sleep') as sleep, \
                 patch.object(cd, 'smoke'), redirect_stdout(stdout), redirect_stderr(stderr):
                opener.return_value.open.side_effect = replies
                self.assertEqual(cd.main(), 1)
            text = summary.read_text()
        record = json.loads(text.split('```json\n')[1].split('\n```')[0])
        lines = stdout.getvalue().splitlines()
        self.assertEqual(len(lines), 2)
        public = json.loads(lines[1].removeprefix('CD-C1 diagnostic: '))
        self.assertIn('runApiFailureKind', public)
        self.assertIn('runApiFailureStage', public)
        self.assertIn('runApiHttpStatus', public)
        self.assertIn('runApiHttpStatus', record)
        self.assertEqual(public, {key: record.get(key) for key in cd.DIAGNOSTIC_FIELDS})
        self.assertEqual(record['failureCode'], 'RELEASE_NOT_VERIFIED')
        self.assertEqual(record['promotionFailureCode'], 'RUN_API_FAILED')
        self.assertEqual(record['promotionFailureStage'], 'backend-traffic-update')
        self.assertEqual(record['rollback'], 'EXACT_PREVIOUS_PAIR_VERIFIED')
        self.assertIsNone(record['rollbackFailureCode'])
        self.assertEqual(record['runApiFailureStage'], stage)
        self.assertEqual(stderr.getvalue(), '')
        self.assert_private_absent(stdout.getvalue() + stderr.getvalue() + text)
        # No retry or extra PATCH. Real cas_traffic still sends the same ETag,
        # explicit traffic targets, timeout and poll interval, with no redirects.
        calls = opener.return_value.open.call_args_list
        methods = [call.args[0].method for call in calls]
        self.assertEqual(methods, {'OTHER': ['GET'], 'PATCH': ['GET', 'PATCH'],
                                   'OPERATION_GET': ['GET', 'PATCH', 'GET']}[stage])
        self.assertEqual(token.call_count, len(calls))
        for call in calls:
            self.assertEqual(call.kwargs, {'timeout': 30})
        for call in opener.call_args_list:
            self.assertIsInstance(call.args[0], cd.NoRedirect)
        if stage != 'OTHER':
            request = calls[1].args[0]
            self.assertEqual(request.full_url, 'https://run.googleapis.com/v2/' + name + '?updateMask=traffic')
            self.assertEqual(request.get_header('Authorization'), 'Bearer TOKEN_MARKER')
            destination = cd.expected_traffic(manifest, 'backend', manifest['backend']['revision'])
            self.assertEqual(json.loads(request.data), {'name': name, 'etag': 'exact-etag', 'traffic': [
                {'type': 'TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION', 'revision': t['revision'],
                 'percent': t['percent'], **({'tag': t['tag']} if t['tag'] else {})} for t in destination]})
        if stage == 'OPERATION_GET':
            sleep.assert_called_once_with(2)
            self.assertEqual(calls[2].args[0].full_url, 'https://run.googleapis.com/v2/' + operation)
        else:
            sleep.assert_not_called()
        return record

    def assert_http_status(self, status):
        record = self.exercise_controller(http_status(status), 'OPERATION_GET')
        self.assertEqual(record['runApiFailureKind'], 'HTTP_STATUS')
        self.assertEqual(record['runApiFailureStage'], 'OPERATION_GET')
        self.assertIs(type(record['runApiHttpStatus']), int)
        self.assertEqual(record['runApiHttpStatus'], status)

    def test_http_403(self):
        self.assert_http_status(403)

    def test_http_404(self):
        self.assert_http_status(404)

    def test_http_409(self):
        self.assert_http_status(409)

    def test_http_429(self):
        self.assert_http_status(429)

    def test_http_500(self):
        self.assert_http_status(500)

    def test_http_503(self):
        self.assert_http_status(503)

    def test_http_status_range_endpoints(self):
        for status in (400, 599):
            with self.subTest(status=status):
                self.assert_http_status(status)

    def test_patch_409_keeps_status_and_stage_together(self):
        record = self.exercise_controller(http_status(409), 'PATCH')
        self.assertEqual((record['runApiFailureKind'], record['runApiFailureStage'], record['runApiHttpStatus']),
                         ('HTTP_STATUS', 'PATCH', 409))

    def test_http_status_rejects_invalid_types_and_range_at_wrapper_constructor_and_capture(self):
        for value in (True, False, '403', 403.0, 399, 600, None):
            with self.subTest(value=value):
                failure = self.api_error(http_status(value), 'OPERATION_GET')
                self.assertIsNone(failure.http_status)
                record = self.exercise_controller(http_status(value), 'OPERATION_GET')
                self.assertEqual(record['runApiFailureKind'], 'HTTP_STATUS')
                self.assertIsNone(record['runApiHttpStatus'])
                failure = cd.RunApiFailure('HTTP_STATUS', 'PATCH', value)
                self.assertIsNone(failure.http_status)
                # Capture is a second boundary; do not trust altered attributes.
                failure.http_status = value
                record = {}
                cd.capture_run_api_failure(record, failure)
                self.assertEqual(record, {'runApiFailureKind': 'HTTP_STATUS', 'runApiFailureStage': 'PATCH',
                                          'runApiHttpStatus': None})

    def test_non_http_failure_never_retains_a_status(self):
        for kind in ('TIMEOUT', 'CONNECTION', 'JSON_PARSE', 'UNKNOWN'):
            with self.subTest(kind=kind):
                failure = cd.RunApiFailure(kind, 'OPERATION_GET', 503)
                self.assertIsNone(failure.http_status)
                failure.http_status = 503
                record = {}
                cd.capture_run_api_failure(record, failure)
                self.assertEqual(record, {'runApiFailureKind': kind, 'runApiFailureStage': 'OPERATION_GET',
                                          'runApiHttpStatus': None})
        # A non-HTTP exception's arbitrary code attribute is never an HTTP status.
        error = TimeoutError(RAW)
        error.code = 503
        self.assertIsNone(self.api_error(error).http_status)

    def test_rollback_http_500_cannot_overwrite_promotion_operation_get_403(self):
        for rollback_stage in ('OPERATION_GET', 'PATCH'):
            with self.subTest(rollback_stage=rollback_stage):
                first = self.api_error(http_status(403), 'OPERATION_GET')
                later = self.api_error(http_status(500), rollback_stage)
                record, _, updates, _, m, output = diagnostics.PromotionDiagnosticTests().exercise(
                    {('update', 1): first, ('update', 2): later}, uncertain_updates=(1,))
                self.assertEqual(record['failureCode'], 'RELEASE_NOT_VERIFIED')
                self.assertEqual(record['promotionFailureCode'], 'RUN_API_FAILED')
                self.assertEqual(record['promotionFailureStage'], 'backend-traffic-update')
                self.assertEqual(record['rollback'], 'HUMAN_DECISION_REQUIRED')
                self.assertEqual(record['rollbackFailureCode'], 'RUN_API_FAILED')
                self.assertEqual(record['rollbackFailureStage'], 'backend-rollback-update')
                self.assertEqual((record['runApiFailureKind'], record['runApiFailureStage'], record['runApiHttpStatus']),
                                 ('HTTP_STATUS', 'OPERATION_GET', 403))
                self.assertEqual(updates, [('backend', m['backend']['revision']),
                                          ('backend', m['production']['backend']['revision'])])
                self.assert_private_absent(output)

    def test_first_non_http_failure_keeps_null_after_rollback_http_failure(self):
        record, _, _, _, _, output = diagnostics.PromotionDiagnosticTests().exercise(
            {('update', 1): self.api_error(TimeoutError(RAW), 'PATCH'),
             ('update', 2): self.api_error(http_status(500), 'OPERATION_GET')}, uncertain_updates=(1,))
        self.assertEqual((record['runApiFailureKind'], record['runApiFailureStage'], record['runApiHttpStatus']),
                         ('TIMEOUT', 'PATCH', None))
        self.assertEqual(record['rollbackFailureCode'], 'RUN_API_FAILED')
        self.assert_private_absent(output)

    def test_patch_failure_kinds_reach_all_durable_sinks(self):
        for name, effect, kind in failure_cases():
            with self.subTest(kind=name):
                record = self.exercise_controller(effect, 'PATCH')
                self.assertEqual(record['runApiFailureKind'], kind)
                self.assertEqual(record['runApiHttpStatus'], 403 if kind == 'HTTP_STATUS' else None)

    def test_operation_get_failure_after_successful_patch_has_its_own_stage(self):
        for name, effect, kind in failure_cases():
            with self.subTest(kind=name):
                record = self.exercise_controller(effect, 'OPERATION_GET')
                self.assertEqual(record['runApiFailureKind'], kind)
                self.assertEqual(record['runApiHttpStatus'], 403 if kind == 'HTTP_STATUS' else None)

    def test_service_get_failure_is_other_without_a_patch(self):
        record = self.exercise_controller(http_status(), 'OTHER')
        self.assertEqual(record['runApiFailureKind'], 'HTTP_STATUS')

    def test_wrapper_keeps_fixed_failure_code_and_exception_context_private(self):
        for name, effect, kind in failure_cases():
            with self.subTest(kind=name):
                error = self.api_error(effect)
                self.assertEqual(error.kind, kind)
                self.assertEqual(error.stage, 'PATCH')
                self.assertEqual(error.http_status, 403 if kind == 'HTTP_STATUS' else None)

    def test_http_error_body_is_closed_without_reading_or_leaking_cleanup_errors(self):
        for close_fails in (False, True):
            with self.subTest(close_fails=close_fails):
                error = http_status()
                body = error.fp
                with patch.object(error, 'read') as read, patch.object(error, 'close', wraps=error.close) as close:
                    if close_fails:
                        def close_then_fail():
                            body.close()
                            raise RuntimeError(RAW)
                        close.side_effect = close_then_fail
                    failure = self.api_error(error)
                    self.assertEqual(failure.kind, 'HTTP_STATUS')
                    self.assertEqual(failure.http_status, 403)
                    close.assert_called_once()
                    read.assert_not_called()
                error.close()
                self.assertTrue(body.closed)

    def test_http_error_finalization_cannot_emit_raw_resource_warning(self):
        with warnings.catch_warnings(record=True) as emitted:
            warnings.simplefilter('always', ResourceWarning)
            error = http_status()
            reference = weakref.ref(error)
            self.api_error(error)
            del error
            # Exercise finalization while capturing all warning sinks.
            gc.collect()
            self.assertIsNone(reference())
        self.assertEqual(emitted, [])

    def test_oversized_response_remains_failed_and_unknown(self):
        error = self.api_error(response(b' ' * (4 * 1024 * 1024 + 1)))
        self.assertEqual(error.kind, 'UNKNOWN')

    def test_rollback_cannot_overwrite_first_api_failure(self):
        first = self.api_error(http_status(), 'PATCH')
        later = self.api_error(URLError(ConnectionError(RAW)), 'OPERATION_GET')
        record, _, updates, _, m, output = diagnostics.PromotionDiagnosticTests().exercise(
            {('update', 1): first, ('update', 2): later}, uncertain_updates=(1,))
        self.assertEqual(record['failureCode'], 'RELEASE_NOT_VERIFIED')
        self.assertEqual(record['promotionFailureCode'], 'RUN_API_FAILED')
        self.assertEqual(record['promotionFailureStage'], 'backend-traffic-update')
        self.assertEqual(record['rollback'], 'HUMAN_DECISION_REQUIRED')
        self.assertEqual(record['rollbackFailureCode'], 'RUN_API_FAILED')
        self.assertEqual(record['rollbackFailureStage'], 'backend-rollback-update')
        self.assertEqual((record['runApiFailureKind'], record['runApiFailureStage']), ('HTTP_STATUS', 'PATCH'))
        self.assertEqual(record['runApiHttpStatus'], 403)
        self.assertEqual(updates, [('backend', m['backend']['revision']), ('backend', m['production']['backend']['revision'])])
        self.assert_private_absent(output)

    def test_first_api_failure_during_rollback_is_preserved(self):
        error = self.api_error(TimeoutError(RAW), 'OPERATION_GET')
        record, _, _, _, _, output = diagnostics.PromotionDiagnosticTests().exercise(
            {('recheck', 3): cd.proof.GateError('REVISION_CHANGED'), ('update', 2): error})
        self.assertEqual(record['promotionFailureCode'], 'REVISION_CHANGED')
        self.assertEqual(record['rollbackFailureCode'], 'RUN_API_FAILED')
        self.assertEqual(record['rollbackFailureStage'], 'backend-rollback-update')
        self.assertEqual((record['runApiFailureKind'], record['runApiFailureStage']), ('TIMEOUT', 'OPERATION_GET'))
        self.assertIsNone(record['runApiHttpStatus'])
        self.assert_private_absent(output)

    def test_pre_write_api_failure_keeps_original_code_without_rollback(self):
        record, _, updates, _, _, output = diagnostics.PromotionDiagnosticTests().exercise(
            {('recheck', 1): self.api_error(http_status(), 'OTHER')})
        self.assertEqual(record['failureCode'], 'RUN_API_FAILED')
        self.assertEqual(record['promotionFailureStage'], 'pre-promotion-recheck')
        self.assertEqual((record['runApiFailureKind'], record['runApiFailureStage']), ('HTTP_STATUS', 'OTHER'))
        self.assertEqual(record['runApiHttpStatus'], 403)
        self.assertIsNone(record['rollback'])
        self.assertEqual(updates, [])
        self.assert_private_absent(output)

    def test_main_captures_api_failure_before_promotion_catch(self):
        error = self.api_error(http_status(), 'OTHER')
        stdout, stderr = io.StringIO(), io.StringIO()
        with tempfile.TemporaryDirectory(prefix='cd-api-main-') as temp:
            summary = Path(temp) / 'summary.md'
            with patch.dict(os.environ, {'GITHUB_STEP_SUMMARY': str(summary)}, clear=True), \
                 patch.object(cd.sys, 'argv', ['cd_release.py', 'candidate']), \
                 patch.object(cd, 'candidate', side_effect=error), redirect_stdout(stdout), redirect_stderr(stderr):
                self.assertEqual(cd.main(), 1)
            text = summary.read_text()
        record = json.loads(text.split('```json\n')[1].split('\n```')[0])
        self.assertEqual(record['failureCode'], 'RUN_API_FAILED')
        self.assertEqual((record['runApiFailureKind'], record['runApiFailureStage']), ('HTTP_STATUS', 'OTHER'))
        self.assertEqual(record['runApiHttpStatus'], 403)
        self.assert_private_absent(stdout.getvalue() + stderr.getvalue() + text)

    def test_enum_allowlists_reject_arbitrary_values_at_capture(self):
        for value in (RAW, None, [], {'error': RAW}):
            with self.subTest(value_type=type(value).__name__):
                error = cd.RunApiFailure(value, value)
                self.assertEqual((error.kind, error.stage), ('UNKNOWN', 'OTHER'))
                # Even altered exception attributes must not reach evidence.
                error.kind = error.stage = value
                record = {}
                cd.capture_run_api_failure(record, error)
                self.assertEqual(record, {'runApiFailureKind': 'UNKNOWN', 'runApiFailureStage': 'OTHER',
                                          'runApiHttpStatus': None})
                self.assert_private_absent(cd.canonical(record))
        error = cd.proof.GateError('RUN_API_FAILED')
        error.kind, error.stage = RAW, RAW
        record = {}
        cd.capture_run_api_failure(record, error)
        self.assertEqual(record, {})

    def test_non_run_http_failure_contract_is_unchanged(self):
        for code in ('GITHUB_READ_FAILED', 'E2E_SECRET_ACCESS_FAILED'):
            with self.subTest(code=code), patch.object(cd, 'build_opener') as opener:
                error = http_status()
                self.addCleanup(error.close)
                opener.return_value.open.side_effect = error
                with self.assertRaises(cd.proof.GateError) as raised:
                    cd.http('https://private.invalid', code=code)
                self.assertEqual(type(raised.exception), cd.proof.GateError)
                self.assertEqual(raised.exception.args, (code,))
                self.assertFalse(hasattr(raised.exception, 'kind'))
                opener.return_value.open.assert_called_once()


if __name__ == '__main__':
    unittest.main()
