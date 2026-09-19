"""Offline result boundary tests: fake child, private marker payloads, no API calls."""
from contextlib import redirect_stdout, redirect_stderr
from copy import deepcopy
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import candidate_result as result
import candidate_e2e as e2e
import cd_release as cd
from test_cd_release import ENV, SECRET, fixture, passing_result

MARKERS = ['00000000-0000-4000-8000-000000000099', 'private@example.invalid',
           'password_PRIVATE', SECRET, 'token_PRIVATE', 'https://raw.invalid/private',
           'raw_RESPONSE_PRIVATE', 'raw_EXCEPTION_PRIVATE']


class ResultTests(unittest.TestCase):
    def setUp(self):
        self.m = fixture()[3]
        self.hash = cd.digest(self.m)
        self.good = passing_result(self.m)

    def test_independent_scenario_cleanup_and_local_evidence(self):
        for scenario, counts, receipt, expected in [
            ('PASS', [0]*4, 'PERSISTED', 0), ('FAIL', [0]*4, 'PERSISTED', 20),
            ('PASS', [None]*4, 'PERSISTED', 21), ('FAIL', [0, 0, 1, 0], 'PERSISTED', 21),
            ('PASS', [0]*4, 'FAILED', 22), ('PASS', [0, None, 0, 0], 'PERSISTED', 21)]:
            with self.subTest(scenario=scenario, counts=counts, receipt=receipt):
                r = deepcopy(self.good)
                r.update(scenario=scenario, cleanup=dict(zip(result.TABLES, counts)), localReceiptState=receipt)
                r['cleanupState'] = result.state(r['cleanup'])
                if receipt == 'FAILED': result.set_failure(r, 'CLEANUP_LOCAL_RECEIPT_PERSIST_FAILED')
                result.validate(r, self.m, self.hash)
                self.assertEqual(result.exit_code(r), expected)
                if receipt == 'FAILED': self.assertEqual(r['cleanupState'], 'PROVEN_ZERO')

    def test_strict_binding_keys_types_and_fixed_codes(self):
        for key in ('candidateId', 'sourceSha', 'githubRunId', 'githubRunAttempt', 'manifestHash'):
            with self.subTest(key=key):
                r = deepcopy(self.good); r[key] = 'foreign'
                with self.assertRaises(cd.proof.GateError): result.validate(r, self.m, self.hash)
        mutations = [lambda r: r.update(version=True), lambda r: r.update(uuid=MARKERS[0]),
                     lambda r: r.update(email=MARKERS[1]), lambda r: r.update(failureCode=MARKERS[-1]),
                     lambda r: r['steps'][0].update(name=MARKERS[1]),
                     lambda r: r['steps'][0].update(extra=SECRET),
                     lambda r: r['cleanup'].update(auth=True), lambda r: r['cleanup'].update(auth=-1),
                     lambda r: r['cleanup'].update(auth=None),
                     lambda r: r['recoveryHandle'].update(candidateId='cd-99-1'),
                     lambda r: r['recoveryHandle'].update(uuid=MARKERS[0]),
                     lambda r: r.update(failureCode='CLEANUP_AUTH_READ_FAILED', failureOperation='DELETE'),
                     lambda r: r.update(scenario='NOT_RUN'), lambda r: r.update(httpsCookieVerified=1)]
        for mutate in mutations:
            r = deepcopy(self.good); mutate(r)
            with self.assertRaises(cd.proof.GateError): result.validate(r, self.m, self.hash)

    def test_private_file_identity_bounded_json_and_duplicate_keys(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp) / 'result'
            p.touch(mode=0o600); original = p.stat()
            def read(): return result.read(p, original, self.m, self.hash)
            for text in ['', '{', 'x' * (result.CONTRACT['maxBytes'] + 1),
                         json.dumps(self.good).replace('"version": 1', '"version": 1, "version": 1')]:
                p.write_text(text)
                with self.assertRaises(cd.proof.GateError): read()
            p.write_text(json.dumps(self.good)); self.assertEqual(read(), self.good)
            p.chmod(0o644)
            with self.assertRaises(cd.proof.GateError): read()
            p.chmod(0o600)
            other = Path(temp) / 'other'; other.touch(mode=0o600); other.write_text(json.dumps(self.good))
            p.unlink(); p.symlink_to(other)
            with self.assertRaises(cd.proof.GateError): read()
            p.unlink(); other.rename(p)
            with self.assertRaises(cd.proof.GateError): read()
            p.unlink()
            with self.assertRaisesRegex(cd.proof.GateError, 'MISSING'): read()

    def test_real_node_envelope_agrees_with_python_schema_and_hash(self):
        script = '''import { writeResult } from './e2e/candidate-result.mjs';
const [file,m,h,r]=JSON.parse(process.argv[1]); await writeResult(file,r,m,h);'''
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp) / 'result'; p.touch(mode=0o600); original = p.stat()
            run = subprocess.run(['node', '--input-type=module', '-e', script,
                                  json.dumps([str(p), self.m, self.hash, self.good])],
                                 cwd=cd.ROOT, capture_output=True, timeout=15)
            self.assertEqual(run.returncode, 0, run.stderr.decode())
            self.assertEqual(result.read(p, original, self.m, self.hash), self.good)

    def test_parent_always_reads_before_exit_and_never_publishes_child_payload(self):
        variants = []
        for code, edit in [(0, {}), (20, {'scenario': 'FAIL'}),
                           (21, {'cleanup': dict.fromkeys(result.TABLES), 'cleanupState': 'UNPROVEN'}),
                           (21, {'cleanup': dict(auth=0, users=0, notes=2, user_tags=0), 'cleanupState': 'RESIDUAL'}),
                           (22, {'localReceiptState': 'FAILED', 'failureCode': 'CLEANUP_LOCAL_RECEIPT_PERSIST_FAILED',
                                 'failureOperation': 'LOCAL_RECEIPT'})]:
            r = deepcopy(self.good); r.update(edit); variants.append((code, json.dumps(r), r))
        for raw in [None, '', '{', 'x' * 16385, json.dumps({**self.good, 'uuid': MARKERS[0]})]:
            variants.append((0, raw, None))
        for key in ('candidateId', 'sourceSha', 'githubRunId', 'githubRunAttempt', 'manifestHash'):
            variants.append((0, json.dumps({**self.good, key: MARKERS[-1]}), None))
        for code, raw, expected in variants:
            with self.subTest(code=code, available=expected is not None), tempfile.TemporaryDirectory() as temp:
                summary, outputs = Path(temp) / 'summary', Path(temp) / 'outputs'
                env = {**ENV, 'RUNNER_TEMP': temp, 'CD_MANIFEST': cd.canonical(self.m),
                       'CD_MANIFEST_HASH': self.hash, 'GITHUB_STEP_SUMMARY': str(summary),
                       'GITHUB_OUTPUT': str(outputs)}
                child = MagicMock(); child.returncode = code
                child.communicate.return_value = tuple((' '.join(MARKERS)).encode() for _ in range(2))
                def spawn(args, **kwargs):
                    self.assertEqual(kwargs['stdout'], subprocess.DEVNULL)
                    self.assertEqual(kwargs['stderr'], subprocess.DEVNULL)
                    p = Path(kwargs['env']['E2E_RESULT_FILE'])
                    if raw is None: p.unlink()
                    else: p.write_text(raw)
                    return child
                with patch.object(e2e.subprocess, 'Popen', side_effect=spawn) as process, \
                     redirect_stdout(io.StringIO()) as out, redirect_stderr(io.StringIO()) as err:
                    if expected is not None and code == 0:
                        e2e.controller(env, self.m, SECRET)
                    else:
                        with self.assertRaises(cd.proof.GateError): e2e.controller(env, self.m, SECRET)
                process.assert_called_once(); child.communicate.assert_called_once()
                public = out.getvalue() + err.getvalue() + summary.read_text()
                self.assertFalse(outputs.exists())  # No success hash on these controller-only paths.
                for marker in MARKERS: self.assertNotIn(marker, public)
                envelope = json.loads(next(line.removeprefix('CD-C3 E2E result: ') for line in out.getvalue().splitlines()
                                           if line.startswith('CD-C3 E2E result: ')))
                if expected is not None:
                    self.assertEqual(envelope, expected)
                else:
                    self.assertEqual(envelope['scenario'], 'UNKNOWN')
                    self.assertEqual(envelope['cleanup'], dict.fromkeys(result.TABLES))
                    self.assertIn(envelope['failureCode'], ('RESULT_ENVELOPE_MISSING', 'RESULT_ENVELOPE_INVALID'))


if __name__ == '__main__':
    unittest.main()
