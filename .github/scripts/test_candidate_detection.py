"""Detection-force check: nine source mutants, confined to disposable offline copies."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class DetectionTests(unittest.TestCase):
    def test_nine_wrong_implementations_are_detected(self):
        node = ['node', '--test', 'e2e/candidate-recovery.test.mjs']
        python = [sys.executable, '-B', '-m', 'unittest', 'test_candidate_result']
        mutations = [
            ('random locator', 'e2e/candidate-client.mjs', node, [
                ("import { randomBytes }", "import { randomBytes, randomUUID }"),
                ('userId: candidateUuid(m.repository, m.candidateId)', 'userId: randomUUID()')]),
            ('unbound candidate', 'e2e/candidate-identity.mjs', node, [
                ('/candidate-e2e/${candidateId}`', '/candidate-e2e/fixed`')]),
            ('public email', 'e2e/candidate-result.mjs', node, [
                ("return { ...resultBinding(m, manifestHash), scenario:",
                 "return { ...resultBinding(m, manifestHash), email: 'p2b-'+m.candidateId+'@p2b.invalid', scenario:")]),
            ('raw child stderr', '.github/scripts/candidate_e2e.py', python, [
                ('child.communicate(input=payload, timeout=600)',
                 'print(child.communicate(input=payload, timeout=600)[1])')]),
            ('unknown as zero', 'e2e/candidate-result.mjs', node, [
                ('TABLES.map(t => [t, null])', 'TABLES.map(t => [t, 0])')]),
            ('receipt as residual', 'e2e/candidate-client.mjs', node, [
                ("catch { o.localReceiptState = 'FAILED';", "catch { o.state = 'UNPROVEN'; o.localReceiptState = 'FAILED';")]),
            ('generic user fallback', 'e2e/candidate-client.mjs', node, [
                ('catch { throw new SafeError(code); }',
                 "catch { await fetch(SUPABASE_URL + '/auth/v1/admin/users', { method: 'GET' }).catch(() => {}); throw new SafeError(code); }")]),
            ('recovery bound to host', 'e2e/candidate-client.mjs', node, [
                ('validateMetadata(m, o);',
                 "validateMetadata(m, o); check(o.creatorHost === hostname() && o.creatorPid === process.pid, 'CANDIDATE_OWNERSHIP_REFUSED');")]),
            ('unvalidated result binding', '.github/scripts/candidate_result.py', python, [
                ("for key in ('version', 'candidateId', 'sourceSha', 'githubRunId', 'githubRunAttempt', 'manifestHash'):",
                 'for key in ():')]),
        ]
        for name, filename, command, edits in mutations:
            with self.subTest(mutant=name), tempfile.TemporaryDirectory(prefix='cd-offline-mutant-') as temp:
                root = Path(temp)
                for directory, suffixes in [('e2e', {'.mjs', '.cjs', '.json'}), ('.github/scripts', {'.py'})]:
                    (root / directory).mkdir(parents=True)
                    for file in (ROOT / directory).iterdir():
                        if file.is_file() and file.suffix in suffixes:
                            shutil.copyfile(file, root / directory / file.name)
                file = root / filename; source = file.read_text()
                for old, new in edits:
                    self.assertEqual(source.count(old), 1, name + ': mutation anchor must be unique')
                    source = source.replace(old, new)
                file.write_text(source)
                env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONPATH': str(root / '.github/scripts')}
                run = subprocess.run(command, cwd=root, env=env, capture_output=True, text=True, timeout=30)
                self.assertNotEqual(run.returncode, 0, name + ': mutant survived')
                # A broken import or invalid syntax is not evidence of test detection.
                self.assertIn('AssertionError', run.stdout + run.stderr, name + ': no assertion detected the mutant')


if __name__ == '__main__':
    unittest.main()
