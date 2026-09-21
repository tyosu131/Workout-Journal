"""C4B counterproof: each independent mutant must fail a semantic assertion.

Disposable offline copies only. Syntax/import/runner errors are not detection.
"""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class TriggerDetectionTests(unittest.TestCase):
    def test_nineteen_authority_and_graph_mutants(self):
        proof = '.github/scripts/wif_submission.py'
        controller = '.github/scripts/cd_release.py'
        workflow = '.github/workflows/cd.yml'
        reusable = '.github/workflows/candidate-e2e.yml'
        authority = 'test_cd_trigger.AuthorityTests.'
        graph = 'test_cd_trigger.WorkflowTests.'
        mutants = [
            ('remove success requirement', proof, "run.get('conclusion') == 'success'", 'True',
             authority + 'test_each_unqualified_event_is_rejected_before_any_api_or_cloud'),
            ('allow upstream PR', proof, "run.get('event') == 'push'", "run.get('event') in ('push', 'pull_request')",
             authority + 'test_each_unqualified_event_is_rejected_before_any_api_or_cloud'),
            ('remove main branch requirement', proof, "run.get('head_branch') == 'main'", 'True',
             authority + 'test_each_unqualified_event_is_rejected_before_any_api_or_cloud'),
            ('remove current-main equality', proof, 'remote == f"{sha}\\trefs/heads/main"', 'True',
             authority + 'test_current_main_guard_stops_before_authority_reads_and_mutation'),
            ('checkout main instead of qualified source', workflow, 'ref: ${{ needs.preflight.outputs.source_sha }}', 'ref: main',
             graph + 'test_all_release_checkouts_and_authority_outputs_are_bound'),
            ('remove CI workflow ID verification', proof, "run.get('workflow_id') == CI_WORKFLOW_ID", 'True',
             authority + 'test_api_identity_and_attempt_must_match_trigger'),
            ('reselect CI in later phases', controller, "if discover and authority['mode'] == 'manual-release':", 'if True:',
             authority + 'test_manual_discovery_once_then_no_reselection'),
            ('ignore CI attempt mismatch', controller, "str(run['run_attempt']) == attempt", 'True',
             authority + 'test_api_identity_and_attempt_must_match_trigger'),
            ('accept automatic latest secret version', proof, "matches(r'[1-9][0-9]{0,19}', version)", 'isinstance(version, str)',
             authority + 'test_automatic_reviewed_version_is_numeric_even_if_constant_is_broken'),
            ('bypass manual activation', proof, "env.get('CD_C1_ACTIVATION') == 'approved'", 'True',
             authority + 'test_manual_activation_and_numeric_actual_input'),
            ('remove production Environment', workflow, '    environment: production\n', '',
             graph + 'test_production_requires_environment_dependencies_and_no_bypass_command'),
            ('promote before Environment approval', workflow, 'run: python3 -B .github/scripts/cd_release.py candidate',
             'run: python3 -B .github/scripts/cd_release.py promote',
             graph + 'test_production_requires_environment_dependencies_and_no_bypass_command'),
            ('drop CI attempt from producer', controller, ", 'ciRunAttempt': authority['ciRunAttempt']", '',
             authority + 'test_manifest_producer_retains_distinct_cd_and_ci_identity'),
            ('allow workflow SHA different from source', proof, "env.get('GITHUB_WORKFLOW_SHA') == sha", 'True',
             authority + 'test_env_hints_cannot_select_mode_source_ci_or_secret'),
            ('remove YAML success guard', workflow, "github.event.workflow_run.conclusion == 'success' && ", '',
             graph + 'test_trigger_and_qualification_graph'),
            ('unqualified event takes shared pending slot', workflow, "&& 'workout-journal-production-delivery' || github.run_id",
             "&& 'workout-journal-production-delivery' || 'workout-journal-production-delivery'",
             graph + 'test_invalid_events_do_not_displace_pending_delivery'),
            ('remove reusable caller guard', reusable,
             "github.workflow_ref == 'tyosu131/Workout-Journal/.github/workflows/cd.yml@refs/heads/main' && ", '',
             graph + 'test_reusable_automatic_and_manual_routes'),
            ('remove reusable pre-auth validation step', reusable,
             'run: python3 -B .github/scripts/candidate_e2e.py preflight', "run: ':'",
             graph + 'test_reusable_preflight_is_mandatory_before_authentication'),
            ('skip reusable preflight validation in entrypoint', '.github/scripts/candidate_e2e.py',
             'm = preflight(env)', "m = {} if sys.argv[1:] == ['preflight'] else preflight(env)",
             authority + 'test_reusable_preflight_rejects_caller_metadata_and_manifest_before_auth'),
        ]
        self.assertEqual(len(mutants), 19)  # 19 semantic; 0 schema-only.
        for name, relative, old, new, target in mutants:
            with self.subTest(mutant=name), tempfile.TemporaryDirectory(prefix='cd-trigger-mutant-') as temp:
                root = Path(temp)
                for directory, suffixes in [('e2e', {'.mjs', '.cjs', '.json'}),
                                            ('.github/scripts', {'.py'}), ('.github/workflows', {'.yml'})]:
                    (root / directory).mkdir(parents=True)
                    for file in (ROOT / directory).iterdir():
                        if file.is_file() and file.suffix in suffixes:
                            shutil.copyfile(file, root / directory / file.name)
                file = root / relative
                source = file.read_text()
                expected = 3 if name == 'checkout main instead of qualified source' else 2 if name == 'remove YAML success guard' else 1
                self.assertEqual(source.count(old), expected, name + ': mutation anchor changed')
                source = source.replace(old, new)
                if name == 'reselect CI in later phases':
                    source = source.replace("require(authority['ciRunId'] is None, 'CI_AUTHORITY_CHANGED')", 'pass')
                file.write_text(source)
                if file.suffix == '.py': compile(source, str(file), 'exec')
                env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1',
                       'PYTHONPATH': str(root / '.github/scripts'), 'NODE_PATH': str(ROOT / 'node_modules')}
                run = subprocess.run([sys.executable, '-B', '-m', 'unittest', target], cwd=root,
                                     env=env, capture_output=True, text=True, timeout=30)
                output = run.stdout + run.stderr
                self.assertNotEqual(run.returncode, 0, name + ': survived')
                self.assertIn('AssertionError', output, name + ': no semantic assertion\n' + output)
                self.assertRegex(output, r'FAILED \(failures=[1-9][0-9]*\)', name + ': errors do not count\n' + output)


if __name__ == '__main__':
    unittest.main()
