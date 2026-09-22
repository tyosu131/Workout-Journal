"""Independent disposable-source mutations; only assertion failures count."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class ObservabilityDetectionTests(unittest.TestCase):
    def test_eight_health_and_logging_mutants(self):
        mutations = [
            ('health body', 'server.js', '.json({ status: "ok" })', '.json({ status: "ok", version: "unexpected" })'),
            ('health after parser', 'server.js', 'app.route("/health")', 'app.use(express.json());\napp.route("/health")'),
            ('arbitrary name', 'utils/errorSummary.js', 'ERROR_NAMES.has(name) ? name : "UnknownError"', 'name'),
            ('invalid status', 'utils/errorSummary.js', 'status >= 400', 'status >= 399'),
            ('raw code', 'utils/errorSummary.js', 'name: ERROR_NAMES.has(name)', 'code: error.code,\n      name: ERROR_NAMES.has(name)'),
            ('raw message', 'utils/errorSummary.js', 'name: ERROR_NAMES.has(name)', 'message: error.message,\n      name: ERROR_NAMES.has(name)'),
            ('arbitrary operation', 'utils/structuredLogger.js', 'OPERATIONS.has(operation) ? operation : "unknown_operation"', 'operation'),
            ('raw response', 'services/noteService.js', '{ error: "Failed to fetch notes" }', '{ error: "Failed to fetch notes", details: error.message }'),
        ]
        detected = 0
        for name, relative, old, new in [('baseline', 'server.js', '', '')] + mutations:
            with self.subTest(mutant=name), tempfile.TemporaryDirectory(prefix='obs-backend-mutant-') as temp:
                root = Path(temp).resolve()
                shutil.copytree(ROOT / 'backend', root / 'backend',
                                ignore=shutil.ignore_patterns('node_modules', '.env*', 'package-lock.json'))
                (root / 'backend/node_modules').symlink_to(ROOT / 'backend/node_modules', target_is_directory=True)
                file = root / 'backend' / relative
                source = file.read_text()
                if name != 'baseline':
                    self.assertEqual(source.count(old), 1, 'mutation anchor changed')
                    file.write_text(source.replace(old, new))
                config = {'rootDir': str(root), 'testEnvironment': 'node', 'transform': {},
                          'modulePaths': [str(ROOT / 'backend/node_modules')]}
                run = subprocess.run(['node', str(ROOT / 'node_modules/jest/bin/jest.js'),
                                      '--config', json.dumps(config), '--runInBand', '--silent', '--json',
                                      '--runTestsByPath', str(root / 'backend/__tests__/health.spec.js'),
                                      str(root / 'backend/utils/__tests__/structuredLogger.spec.js'),
                                      str(root / 'backend/services/__tests__/failureResponses.spec.js')],
                                     cwd=root, capture_output=True, text=True, timeout=40)
                self.assertTrue(run.stdout, run.stderr)
                result = json.loads(run.stdout)
                if name == 'baseline':
                    self.assertEqual(run.returncode, 0, run.stderr)
                    self.assertGreater(result['numPassedTests'], 0)
                    continue
                self.assertNotEqual(run.returncode, 0, name + ': survived')
                self.assertEqual(result['numRuntimeErrorTestSuites'], 0, name + ': runner errors do not count\n' + run.stderr)
                self.assertGreater(result['numFailedTests'], 0, name + ': no failed assertion')
                failures = [case for suite in result['testResults'] for case in suite['assertionResults']
                            if case['status'] == 'failed']
                self.assertTrue(failures, name + ': no semantic assertion')
                self.assertTrue(all('expect(' in '\n'.join(case['failureMessages']) for case in failures),
                                name + ': non-assertion failure')
                detected += 1
        self.assertEqual(detected, 8)
        print('OBS health/logger detection: 8/8 semantic; 0 schema-only; 0 syntax/runtime-only')

    def test_seven_probe_mutants(self):
        source = (ROOT / '.github/scripts/cd_release.py').read_text()
        startup = next(line for line in source.splitlines(True) if line.startswith("    '--startup-probe="))
        liveness = next(line for line in source.splitlines(True) if line.startswith("    '--liveness-probe="))
        target = 'test_cd_probes.ProbeTests.'
        mutations = [
            ('remove startup', startup, '', target + 'test_backend_deploy_flags_and_frontend_preservation'),
            ('remove liveness', liveness, '', target + 'test_backend_deploy_flags_and_frontend_preservation'),
            ('wrong path', liveness, liveness.replace('/health', '/wrong'), target + 'test_backend_deploy_flags_and_frontend_preservation'),
            ('remove effective validation', "normalized_spec(revision, part) == expected_candidate_spec(prior['production'], part)",
             'True', target + 'test_candidate_probe_and_non_probe_drift_rejected'),
            ('permit all probe differences', '    return spec\n',
             "    if part == 'backend':\n        spec['containers'][0].update(startupProbe=deepcopy(BACKEND_STARTUP_PROBE), livenessProbe=deepcopy(BACKEND_LIVENESS_PROBE))\n    return spec\n",
             target + 'test_candidate_probe_and_non_probe_drift_rejected'),
            ('ignore unrelated env', '    return spec\n',
             "    spec['containers'][0]['env'] = []\n    return spec\n", target + 'test_candidate_probe_and_non_probe_drift_rejected'),
            ('hash omits probe-bearing containers', "'configHash': digest(revision['spec'])",
             "'configHash': digest({**revision['spec'], 'containers': []})", target + 'test_raw_config_hash_and_promotion_recheck_include_probes'),
        ]
        detected = 0
        for name, old, new, test in [('baseline', '', '', 'test_cd_probes')] + mutations:
            with self.subTest(mutant=name), tempfile.TemporaryDirectory(prefix='obs-probe-mutant-') as temp:
                root = Path(temp).resolve()
                for directory, suffixes in [('.github/scripts', {'.py'}), ('e2e', {'.mjs', '.json', '.cjs'})]:
                    (root / directory).mkdir(parents=True)
                    for file in (ROOT / directory).iterdir():
                        if file.is_file() and file.suffix in suffixes:
                            shutil.copyfile(file, root / directory / file.name)
                self.assertIn(old, source, 'mutation anchor missing')
                changed = source if name == 'baseline' else source.replace(old, new, 1)
                compile(changed, name, 'exec')
                (root / '.github/scripts/cd_release.py').write_text(changed)
                env = {**os.environ, 'PYTHONPATH': str(root / '.github/scripts'), 'PYTHONDONTWRITEBYTECODE': '1'}
                run = subprocess.run([sys.executable, '-B', '-m', 'unittest', test], cwd=root, env=env,
                                     capture_output=True, text=True, timeout=30)
                output = run.stdout + run.stderr
                if name == 'baseline':
                    self.assertEqual(run.returncode, 0, output)
                    continue
                self.assertNotEqual(run.returncode, 0, name + ': survived')
                self.assertIn('AssertionError', output, name + ': no semantic failure\n' + output)
                self.assertRegex(output, r'FAILED \(failures=[1-9][0-9]*\)', name + ': errors do not count\n' + output)
                detected += 1
        self.assertEqual(detected, 7)
        print('OBS probe detection: 7/7 semantic; 0 schema-only; 0 syntax/runtime-only')


if __name__ == '__main__':
    unittest.main()
