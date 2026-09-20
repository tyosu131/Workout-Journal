"""Semantic counterproofs for API failure provenance in disposable source copies."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class RunApiDetectionTests(unittest.TestCase):
    def test_eight_wrong_implementations_are_detected_by_assertions(self):
        raised = '            raise RunApiFailure(run_api_failure_kind(error), stage, http_status) from None'
        captured = ("        capture_run_api_failure(record, error)\n"
                    "        record['promotionFailureCode'] = safe_failure_code(error)\n"
                    "        record['promotionFailureStage'] = stage\n        if attempted:")
        mutations = [
            ('stage lost by wrapper', "code='RUN_API_FAILED', stage=stage)", "code='RUN_API_FAILED')"),
            ('failure kind lost', "record['runApiFailureKind'] = safe_enum(error.kind, RUN_API_FAILURE_KINDS, 'UNKNOWN')",
             "record['runApiFailureKind'] = None"),
            ('raw exception leaked', raised, '            print(error)\n' + raised),
            ('operation GET confused with PATCH', "cloud_run(op['name'], stage='OPERATION_GET')",
             "cloud_run(op['name'], stage='PATCH')"),
            ('timeout classified as connection', "return 'TIMEOUT'", "return 'CONNECTION'"),
            ('rollback overwrites original API failure',
             "isinstance(error, RunApiFailure) and record.get('runApiFailureKind') is None",
             'isinstance(error, RunApiFailure)'),
            ('API provenance lost before generic promotion error', captured,
             captured.replace('capture_run_api_failure(record, error)', 'pass')),
            ('unclosed HTTP response leaks on finalization', '                    error.close()',
             '                    pass'),
        ]
        self.assertEqual(len(mutations), 8)
        self.assert_mutants_detected(mutations)

    def test_ten_http_status_mutants_are_detected_by_assertions(self):
        captured = ("        record['runApiHttpStatus'] = (safe_http_status(error.http_status)\n"
                    "                                      if record['runApiFailureKind'] == 'HTTP_STATUS' else None)")
        sanitized = 'return value if type(value) is int and 400 <= value <= 599 else None'
        raised = '            raise RunApiFailure(run_api_failure_kind(error), stage, http_status) from None'
        mutations = [
            ('status field removed from diagnostic JSON',
             "'runApiFailureKind', 'runApiFailureStage', 'runApiHttpStatus')",
             "'runApiFailureKind', 'runApiFailureStage')"),
            ('every HTTP failure becomes 403',
             'http_status = error.code if isinstance(error, HTTPError) else None',
             'http_status = 403 if isinstance(error, HTTPError) else None'),
            ('status inferred from stage instead of the same failure', captured,
             "        record['runApiHttpStatus'] = 409 if error.stage == 'OPERATION_GET' else 403"),
            ('rollback overwrites only status leaving first kind and stage', captured,
             captured + "\n    if isinstance(error, RunApiFailure):\n"
             "        record['runApiHttpStatus'] = safe_http_status(error.http_status)"),
            ('non-HTTP constructor retains status',
             "self.http_status = safe_http_status(http_status) if self.kind == 'HTTP_STATUS' else None",
             'self.http_status = safe_http_status(http_status)'),
            ('non-HTTP capture retains altered status', captured,
             "        record['runApiHttpStatus'] = safe_http_status(error.http_status)"),
            ('bool accepted as status', sanitized,
             'return value if type(value) is bool or (type(value) is int and 400 <= value <= 599) else None'),
            ('out-of-range integer accepted', sanitized,
             'return value if type(value) is int else None'),
            ('raw HTTP exception leaked with status', raised, '            print(error)\n' + raised),
            ('HTTP body read and leaked before close', '                    error.close()',
             '                    print(error.read())\n                    error.close()'),
        ]
        self.assertEqual(len(mutations), 10)
        self.assert_mutants_detected(mutations)

    def assert_mutants_detected(self, mutations):
        for name, old, new in mutations:
            with self.subTest(mutant=name), tempfile.TemporaryDirectory(prefix='cd-run-api-mutant-') as temp:
                root = Path(temp)
                for directory, suffixes in [('e2e', {'.mjs', '.cjs', '.json'}), ('.github/scripts', {'.py'})]:
                    (root / directory).mkdir(parents=True)
                    for file in (ROOT / directory).iterdir():
                        if file.is_file() and file.suffix in suffixes:
                            shutil.copyfile(file, root / directory / file.name)
                file = root / '.github/scripts/cd_release.py'
                source = file.read_text()
                self.assertEqual(source.count(old), 1, name + ': mutation anchor must be unique')
                file.write_text(source.replace(old, new))
                compile(file.read_text(), str(file), 'exec')
                env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONPATH': str(root / '.github/scripts')}
                run = subprocess.run([sys.executable, '-B', '-m', 'unittest', 'test_cd_run_api_diagnostics'],
                                     cwd=root, env=env, capture_output=True, text=True, timeout=30)
                self.assertNotEqual(run.returncode, 0, name + ': mutant survived')
                output = run.stdout + run.stderr
                self.assertIn('AssertionError', output, name + ': no semantic assertion detected the mutant')
                self.assertRegex(output, r'FAILED \(failures=[1-9][0-9]*\)', name + ': require assertions, not errors')


if __name__ == '__main__':
    unittest.main()
