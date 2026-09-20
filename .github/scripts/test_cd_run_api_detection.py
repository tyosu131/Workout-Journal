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
        raised = '            raise RunApiFailure(run_api_failure_kind(error), stage) from None'
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
                env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONPATH': str(root / '.github/scripts')}
                run = subprocess.run([sys.executable, '-B', '-m', 'unittest', 'test_cd_run_api_diagnostics'],
                                     cwd=root, env=env, capture_output=True, text=True, timeout=30)
                self.assertNotEqual(run.returncode, 0, name + ': mutant survived')
                output = run.stdout + run.stderr
                self.assertIn('AssertionError', output, name + ': no semantic assertion detected the mutant')
                self.assertRegex(output, r'FAILED \(failures=[1-9][0-9]*\)', name + ': require assertions, not errors')


if __name__ == '__main__':
    unittest.main()
