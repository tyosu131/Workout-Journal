"""Offline promotion diagnostics, with stateful traffic and captured public output."""
from copy import deepcopy
from contextlib import redirect_stderr, redirect_stdout
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import cd_release as cd
from test_cd_release import ENV, fixture


class PromotionDiagnosticTests(unittest.TestCase):
    def exercise(self, faults=None, uncertain_updates=()):
        faults = faults or {}
        _, state, revisions, manifest = fixture()
        events, updates = [], []
        counts = {'recheck': 0, 'update': 0, 'smoke': 0, 'read': 0}
        real_recheck = cd.recheck

        def read_state():
            counts['read'] += 1
            error = faults.get(('read', counts['read']))
            if error is not None:
                raise error
            return deepcopy(state)

        def event(kind, part=None):
            counts[kind] += 1
            events.append((kind, part))
            return faults.get((kind, counts[kind]))

        def recheck(m, serving):
            error = event('recheck')
            if error is not None:
                raise error
            return real_recheck(m, serving)

        def update(part, current, destination):
            error = event('update', part)
            updates.append((part, cd.production_revision(destination)))
            if error is not None and counts['update'] not in uncertain_updates:
                raise error
            state[part]['traffic'] = deepcopy(destination)
            state[part]['production'] = deepcopy(revisions[cd.production_revision(destination)])
            if error is not None:
                raise error

        def smoke(m):
            error = event('smoke')
            if error is not None:
                raise error

        stdout, stderr = io.StringIO(), io.StringIO()
        with tempfile.TemporaryDirectory(prefix='cd-diagnostic-') as temp:
            summary = Path(temp) / 'summary.md'
            env = {**ENV, 'CD_MANIFEST_HASH': cd.digest(manifest), 'CD_E2E_HASH': cd.digest(manifest),
                   'GITHUB_STEP_SUMMARY': str(summary)}
            with patch.dict(os.environ, env, clear=True), patch.object(cd.sys, 'argv', ['cd_release.py', 'promote']), \
                 patch.object(cd, 'input_manifest', return_value=manifest), \
                 patch.object(cd, 'preflight', return_value='99'), patch.object(cd.proof, 'check_credentials'), \
                 patch.object(cd, 'read_state', side_effect=read_state), \
                 patch.object(cd, 'read_revision', side_effect=lambda name: revisions[name]), \
                 patch.object(cd, 'recheck', side_effect=recheck), patch.object(cd, 'cas_traffic', side_effect=update), \
                 patch.object(cd, 'smoke', side_effect=smoke), redirect_stdout(stdout), redirect_stderr(stderr):
                status = cd.main()
            summary_text = summary.read_text()
        record = json.loads(summary_text.split('```json\n')[1].split('\n```')[0])
        lines = stdout.getvalue().splitlines()
        self.assertEqual(len(lines), 2)
        self.assertEqual(lines[0], 'CD-C1: ' + record['result'] + ' / ' + record['phase'])
        self.assertTrue(lines[1].startswith('CD-C1 diagnostic: '))
        diagnostic = json.loads(lines[1].removeprefix('CD-C1 diagnostic: '))
        self.assertEqual(set(diagnostic), {'result', 'phase', 'failureCode', 'promotionFailureCode',
                                         'promotionFailureStage', 'rollback', 'rollbackFailureCode', 'rollbackFailureStage',
                                         'runApiFailureKind', 'runApiFailureStage', 'runApiHttpStatus'})
        self.assertEqual(diagnostic, {key: record.get(key) for key in diagnostic})
        self.assertEqual(lines[1], 'CD-C1 diagnostic: ' + cd.canonical(diagnostic))
        self.assertEqual(stderr.getvalue(), '')
        self.assertEqual(record['pair'], cd.pair_record(manifest))
        self.assertNotIn('pair', diagnostic)
        self.assertNotIn('https://', lines[1])
        self.assertNotIn('workout-journal-', lines[1])
        self.assertEqual(status, 0 if record['result'] == 'PASS' else 1)
        return record, events, updates, state, manifest, stdout.getvalue() + stderr.getvalue() + summary_text

    def assert_restored(self, state, manifest):
        for part in ('backend', 'frontend'):
            self.assertEqual(state[part]['traffic'], manifest['trafficCurrent'][part])
            self.assertEqual(state[part]['production']['metadata']['name'], manifest['production'][part]['revision'])

    def test_backend_post_update_failure_survives_successful_rollback(self):
        record, _, updates, state, m, _ = self.exercise({('recheck', 3): cd.proof.GateError('STALE_PRODUCTION_OR_TAGS')})
        self.assertEqual(record['result'], 'FAIL')
        self.assertEqual(record['failureCode'], 'RELEASE_NOT_VERIFIED')
        self.assertEqual(record['phase'], 'promotion')
        self.assertEqual(record['promotionFailureCode'], 'STALE_PRODUCTION_OR_TAGS')
        self.assertEqual(record['promotionFailureStage'], 'backend-post-update-recheck')
        self.assertEqual(record['rollback'], 'EXACT_PREVIOUS_PAIR_VERIFIED')
        self.assertIsNone(record['rollbackFailureCode'])
        self.assertIsNone(record['rollbackFailureStage'])
        self.assertEqual(updates, [('backend', m['backend']['revision']), ('backend', m['production']['backend']['revision'])])
        self.assert_restored(state, m)

    def test_frontend_precheck_and_update_failures_remain_distinct(self):
        for fault, code, stage, attempts in [
                (('recheck', 4), 'SERVICE_POLICY_CHANGED', 'frontend-pre-update-recheck', ['backend', 'backend']),
                (('update', 2), 'TRAFFIC_OPERATION_FAILED', 'frontend-traffic-update', ['backend', 'frontend', 'backend'])]:
            with self.subTest(stage=stage):
                record, _, updates, state, m, _ = self.exercise({fault: cd.proof.GateError(code)})
                self.assertEqual(record['promotionFailureCode'], code)
                self.assertEqual(record['promotionFailureStage'], stage)
                self.assertEqual(record['rollback'], 'EXACT_PREVIOUS_PAIR_VERIFIED')
                self.assertEqual([p for p, _ in updates], attempts)
                self.assert_restored(state, m)

    def test_post_deploy_smoke_failure_preserves_diagnostic_and_rollback_order(self):
        record, _, updates, state, m, _ = self.exercise({('smoke', 1): cd.proof.GateError('POST_DEPLOY_SMOKE_FAILED')})
        self.assertEqual(record['promotionFailureCode'], 'POST_DEPLOY_SMOKE_FAILED')
        self.assertEqual(record['promotionFailureStage'], 'post-deploy-smoke')
        self.assertEqual(record['rollback'], 'EXACT_PREVIOUS_PAIR_VERIFIED')
        self.assertEqual([p for p, _ in updates], ['backend', 'frontend', 'frontend', 'backend'])
        self.assert_restored(state, m)

    def test_rollback_failure_preserves_both_codes_and_stages(self):
        record, _, updates, _, _, _ = self.exercise(
            {('update', 2): cd.proof.GateError('TRAFFIC_OPERATION_FAILED'),
             ('update', 3): cd.proof.GateError('SERVICE_CONCURRENT_CHANGE')}, uncertain_updates=(2,))
        self.assertEqual(record['failureCode'], 'RELEASE_NOT_VERIFIED')
        self.assertEqual(record['promotionFailureCode'], 'TRAFFIC_OPERATION_FAILED')
        self.assertEqual(record['promotionFailureStage'], 'frontend-traffic-update')
        self.assertEqual(record['rollback'], 'HUMAN_DECISION_REQUIRED')
        self.assertEqual(record['rollbackFailureCode'], 'SERVICE_CONCURRENT_CHANGE')
        self.assertEqual(record['rollbackFailureStage'], 'frontend-rollback-update')
        self.assertEqual([p for p, _ in updates], ['backend', 'frontend', 'frontend'])

    def test_arbitrary_exception_and_unlisted_gate_error_are_not_public(self):
        private = 'SECRET_MARKER secret token Authorization user@synthetic.invalid UUID_MARKER raw exception https://private.invalid raw HTTP response'
        for error_type in (RuntimeError, cd.proof.GateError):
            for rollback in (False, True):
                with self.subTest(error_type=error_type, rollback=rollback):
                    faults = {('recheck', 3): cd.proof.GateError('REVISION_CHANGED'), ('update', 2): error_type(private)} if rollback else {
                        ('recheck', 3): error_type(private)}
                    record, _, _, _, _, output = self.exercise(faults)
                    field = 'rollbackFailureCode' if rollback else 'promotionFailureCode'
                    self.assertEqual(record[field], 'CD_CONTROLLER_FAILED')
                    if rollback:
                        self.assertEqual(record['promotionFailureCode'], 'REVISION_CHANGED')
                        self.assertEqual(record['rollbackFailureStage'], 'backend-rollback-update')
                    for marker in private.split():
                        self.assertNotIn(marker, output)

    def test_success_has_no_failure_diagnostics_and_identical_operation_order(self):
        record, events, updates, state, m, _ = self.exercise()
        self.assertEqual(record['promotion'], 'VERIFIED')
        self.assertEqual(record['result'], 'PASS')
        for key in ('promotionFailureCode', 'promotionFailureStage', 'rollback', 'rollbackFailureCode', 'rollbackFailureStage',
                    'runApiFailureKind', 'runApiFailureStage', 'runApiHttpStatus'):
            self.assertIsNone(record[key])
        self.assertNotIn('failureCode', record)
        self.assertEqual(events, [('recheck', None), ('recheck', None), ('update', 'backend'), ('recheck', None),
                                  ('recheck', None), ('update', 'frontend'), ('recheck', None), ('smoke', None), ('recheck', None)])
        self.assertEqual(updates, [(p, m[p]['revision']) for p in ('backend', 'frontend')])
        for part in ('backend', 'frontend'):
            self.assertEqual(state[part]['traffic'], cd.expected_traffic(m, part, m[part]['revision']))

    def test_pre_write_failure_does_not_change_error_or_start_rollback(self):
        for check, stage in [(1, 'pre-promotion-recheck'), (2, 'backend-pre-update-recheck')]:
            with self.subTest(stage=stage):
                record, _, updates, state, m, _ = self.exercise({('recheck', check): cd.proof.GateError('REVISION_CHANGED')})
                self.assertEqual(record['promotionFailureCode'], 'REVISION_CHANGED')
                self.assertEqual(record['promotionFailureStage'], stage)
                self.assertEqual(record['failureCode'], 'REVISION_CHANGED' if check == 1 else 'RELEASE_NOT_VERIFIED')
                self.assertIsNone(record['rollback'])
                self.assertEqual(updates, [])
                self.assert_restored(state, m)

    def test_remaining_promotion_and_rollback_recheck_stages(self):
        for fault, stage in [(('update', 1), 'backend-traffic-update'),
                             (('recheck', 5), 'frontend-post-update-recheck'),
                             (('recheck', 6), 'post-deploy-final-recheck')]:
            with self.subTest(stage=stage):
                record = self.exercise({fault: cd.proof.GateError('RUN_NOT_READY')})[0]
                self.assertEqual(record['promotionFailureCode'], 'RUN_NOT_READY')
                self.assertEqual(record['promotionFailureStage'], stage)
        # After the post-Backend failure, rollback starts at recheck 4.
        for fault, stage in [(('read', 3), 'rollback-state-read'),
                             (('recheck', 4), 'rollback-state-recheck'),
                             (('recheck', 5), 'frontend-rollback-precheck'),
                             (('recheck', 6), 'backend-rollback-precheck'),
                             (('recheck', 7), 'rollback-final-recheck'),
                             (('smoke', 1), 'rollback-smoke'),
                             (('recheck', 8), 'rollback-post-smoke-recheck')]:
            with self.subTest(stage=stage):
                record = self.exercise({('recheck', 3): cd.proof.GateError('REVISION_CHANGED'),
                                        fault: cd.proof.GateError('RUN_NOT_READY')})[0]
                self.assertEqual(record['promotionFailureCode'], 'REVISION_CHANGED')
                self.assertEqual(record['promotionFailureStage'], 'backend-post-update-recheck')
                self.assertEqual(record['rollback'], 'HUMAN_DECISION_REQUIRED')
                self.assertEqual(record['rollbackFailureCode'], 'RUN_NOT_READY')
                self.assertEqual(record['rollbackFailureStage'], stage)


if __name__ == '__main__':
    unittest.main()
