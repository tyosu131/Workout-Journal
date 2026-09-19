"""Six diagnostic durability mutants; disposable copies, no cloud execution."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class DiagnosticDetectionTests(unittest.TestCase):
    def test_six_wrong_implementations_are_detected_by_assertions(self):
        original = "record['promotionFailureCode'] = safe_failure_code(error)\n        record['promotionFailureStage'] = stage\n        if attempted:"
        mutations = [
            ('original code lost', original, original.replace('safe_failure_code(error)', "'RELEASE_NOT_VERIFIED'")),
            ('generic promotion stage', "stage = f'{part}-post-update-recheck'", "stage = 'promotion'"),
            ('rollback overwrites promotion', "record['rollback'] = 'EXACT_PREVIOUS_PAIR_VERIFIED'",
             "record['rollback'] = 'EXACT_PREVIOUS_PAIR_VERIFIED'\n                record['promotionFailureCode'] = None"),
            ('rollback code lost', "record['rollbackFailureCode'] = safe_failure_code(rollback_error)",
             "record['rollbackFailureCode'] = None"),
            ('raw exception published', "return 'CD_CONTROLLER_FAILED'", 'return str(error)'),
            ('backend and frontend reversed', "stage = f'{part}-traffic-update'",
             "stage = f'{\"frontend\" if part == \"backend\" else \"backend\"}-traffic-update'"),
        ]
        self.assertEqual(len(mutations), 6)
        for name, old, new in mutations:
            with self.subTest(mutant=name), tempfile.TemporaryDirectory(prefix='cd-diagnostic-mutant-') as temp:
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
                run = subprocess.run([sys.executable, '-B', '-m', 'unittest', 'test_cd_diagnostics'],
                                     cwd=root, env=env, capture_output=True, text=True, timeout=30)
                self.assertNotEqual(run.returncode, 0, name + ': mutant survived')
                output = run.stdout + run.stderr
                self.assertIn('AssertionError', output, name + ': no semantic assertion detected the mutant')
                self.assertRegex(output, r'FAILED \(failures=[1-9][0-9]*\)', name + ': require assertions, not errors')


if __name__ == '__main__':
    unittest.main()
