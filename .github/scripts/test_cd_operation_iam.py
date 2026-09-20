"""Evaluate real Terraform HCL with a mock provider; reject broader IAM semantics.

Requires Terraform 1.16.x and the initialized, locked Google 7.45.0 provider.
All executions use disposable roots without backend/import blocks, mock Google,
and command=plan. No credentials, remote state or cloud API calls are required.
"""
import copy
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
TF_ROOT = ROOT / 'infra/terraform'
PROJECT = 'workout-journal-506909'
DEPLOY = f'serviceAccount:workout-journal-deploy@{PROJECT}.iam.gserviceaccount.com'
ROLE_ID = 'workoutJournalRunOperationReader'
ROLE_NAME = f'projects/{PROJECT}/roles/{ROLE_ID}'
ROLE = 'google_project_iam_custom_role.deploy_run_operation_reader'
MEMBER = 'google_project_iam_member.deploy_run_operation_reader'
SERVICE_TYPE = 'google_cloud_run_v2_service_iam_member'


def assert_iam_contract(plan):
    """Check evaluated grants and permission sets, not presence of source strings."""
    resources = {r['address']: r for r in plan['resource_changes']
                 if r['mode'] == 'managed' and r['change']['after'] is not None}

    def values(address):
        assert address in resources, f'missing required IAM resource: {address}'
        return resources[address]['change']['after']

    assert not any(r['type'] in {'google_project_iam_policy', 'google_project_iam_binding'}
                   for r in resources.values()), 'authoritative project IAM is forbidden'
    custom_roles = {a for a, r in resources.items() if r['type'].endswith('_iam_custom_role')}
    assert custom_roles == {ROLE}, 'only the approved project custom role is allowed'
    role = values(ROLE)
    assert role['project'] == PROJECT, 'custom role project scope changed'
    assert role['role_id'] == ROLE_ID, 'custom role identity changed'
    assert role['permissions'] == ['run.operations.get'], 'operation permission set broadened or missing'
    assert role.get('stage') in (None, 'GA'), 'custom role must remain enabled at GA'

    if 'resource_dependencies' in plan:
        assert (MEMBER, ROLE) in plan['resource_dependencies'], 'member must depend on the new custom role'

    # The mock supplies computed email/name only; check their configured identity too.
    deploy = values('google_service_account.deploy')
    assert deploy['project'] == PROJECT, 'Deploy SA project changed'
    assert deploy['account_id'] == 'workout-journal-deploy', 'Deploy SA identity changed'

    expected_project_roles = {
        'google_project_iam_member.deploy_cloud_build_editor': 'roles/cloudbuild.builds.editor',
        'google_project_iam_member.deploy_service_usage_consumer': 'roles/serviceusage.serviceUsageConsumer',
        'google_project_iam_member.build_log_writer': 'roles/logging.logWriter',
        MEMBER: ROLE_NAME,
    }
    project_members = {a for a, r in resources.items() if r['type'] == 'google_project_iam_member'}
    assert project_members == set(expected_project_roles), 'unexpected or missing project IAM grant'
    for address, expected_role in expected_project_roles.items():
        grant = values(address)
        assert grant['project'] == PROJECT, f'wrong project scope: {address}'
        assert grant.get('role') == expected_role, f'wrong project role: {address}'
        if address != 'google_project_iam_member.build_log_writer':
            assert grant.get('member') == DEPLOY, f'wrong Deploy principal: {address}'
            assert not grant.get('condition'), f'unexpected condition: {address}'

    for part in ('backend', 'frontend'):
        address = f'{SERVICE_TYPE}.deploy_{part}_run_developer'
        grant = values(address)
        expected = {'project': PROJECT, 'location': 'asia-northeast1',
                    'role': 'roles/run.developer', 'member': DEPLOY}
        assert all(grant.get(k) == v for k, v in expected.items()), f'service grant changed: {part}'
        short_name = f'workout-journal-{part}'
        full_name = f'projects/{PROJECT}/locations/asia-northeast1/services/{short_name}'
        assert grant.get('name') in (short_name, full_name), f'wrong service: {part}'
        assert not grant.get('condition'), f'service grant condition changed: {part}'


def assert_saved_plan(plan):
    """Check the real saved plan's actions and dependency before resolving unknown name."""
    changes = {r['address']: r for r in plan['resource_changes']
               if r['change']['actions'] != ['no-op']}
    assert set(changes) == {ROLE, MEMBER}, 'saved plan must change only the two new addresses'
    assert all(r['change']['actions'] == ['create'] for r in changes.values()), 'only two creates allowed'
    assert not any(r['change'].get('importing') for r in plan['resource_changes']), 'no imports allowed'
    assert all(o['actions'] == ['no-op'] for o in plan.get('output_changes', {}).values()), 'outputs changed'
    configured = {r['address']: r for r in plan['configuration']['root_module']['resources']}
    expression = configured[MEMBER]['expressions']['role']
    refs = set(expression.get('references', []))
    assert ROLE + '.name' in refs and refs <= {ROLE, ROLE + '.name'}, 'member must reference new role.name'
    resolved = copy.deepcopy(plan)
    member = next(r for r in resolved['resource_changes'] if r['address'] == MEMBER)
    # name is computed by Google as projects/{project}/roles/{role_id}; both are
    # checked by assert_iam_contract, with the dependency checked above.
    if member['change'].get('after_unknown', {}).get('role') is True:
        assert member['change']['after'].get('role') is None, 'conflicting role value'
        member['change']['after']['role'] = ROLE_NAME
    assert_iam_contract(resolved)


def mock_plan(iam_source):
    with tempfile.TemporaryDirectory(prefix='cd-operation-iam-') as temp:
        root = Path(temp)
        for file in TF_ROOT.iterdir():
            if file.is_file() and file.name.endswith(('.tf', '.tf.json')) and file.name not in {'backend.tf', 'imports.tf'}:
                shutil.copyfile(file, root / file.name)
        (root / 'iam.tf').write_text(iam_source)
        shutil.copyfile(TF_ROOT / '.terraform.lock.hcl', root / '.terraform.lock.hcl')
        (root / '.terraform').mkdir()
        (root / '.terraform/providers').symlink_to(TF_ROOT / '.terraform/providers', target_is_directory=True)
        (root / 'tests').mkdir()
        shutil.copyfile(TF_ROOT / 'tests/operation_iam.tftest.hcl', root / 'tests/operation_iam.tftest.hcl')
        env = {k: v for k, v in os.environ.items()
               if not k.startswith(('TF_', 'GOOGLE_', 'GCLOUD_', 'CLOUDSDK_'))}
        env['TF_IN_AUTOMATION'] = '1'
        run = subprocess.run(['terraform', f'-chdir={root}', 'test', '-json', '-verbose',
                              '-filter=tests/operation_iam.tftest.hcl'],
                             env=env, capture_output=True, text=True, timeout=60)
        messages = [json.loads(line) for line in run.stdout.splitlines()]
        errors = [m['diagnostic'] for m in messages if m['type'] == 'diagnostic'
                  and m['diagnostic']['severity'] == 'error']
        if len(errors) == 1 and errors[0].get('address') == ROLE and (
                errors[0]['summary'] == 'Not enough list items' and
                errors[0]['detail'] == 'Attribute permissions requires 1 item minimum, but config has only 0 declared.'):
            # A valid HCL empty list is rejected by the locked provider schema,
            # before a plan exists. Syntax, startup and other failures still error.
            raise AssertionError('custom role permission set is empty (provider schema)')
        if run.returncode or errors:
            raise RuntimeError(f'mock plan failed before contract assertions: {errors!r}; {run.stderr}')
        plans = [m['test_plan'] for m in messages if m['type'] == 'test_plan']
        if len(plans) != 1:
            raise RuntimeError('expected exactly one evaluated mock plan')
        # Test-plan JSON omits configuration expressions. Read Terraform's own
        # dependency graph so an equivalent literal role name cannot erase the
        # creation ordering while still passing the evaluated-value assertions.
        graph = subprocess.run(['terraform', f'-chdir={root}', 'graph'],
                               env=env, capture_output=True, text=True, timeout=60)
        if graph.returncode:
            raise RuntimeError(f'dependency graph failed before contract assertions: {graph.stderr}')
        plans[0]['resource_dependencies'] = re.findall(r'^\s*"([^"]+)" -> "([^"]+)";',
                                                      graph.stdout, re.MULTILINE)
        return plans[0]


class OperationIamTests(unittest.TestCase):
    def test_actual_hcl_grants_only_operation_get_at_project_scope(self):
        assert_iam_contract(mock_plan((TF_ROOT / 'iam.tf').read_text()))

    def test_hcl_mutations_fail_semantic_contract(self):
        source = (TF_ROOT / 'iam.tf').read_text()
        member_block = '''resource "google_project_iam_member" "deploy_run_operation_reader" {
  project = var.project_id
  role    = google_project_iam_custom_role.deploy_run_operation_reader.name
  member  = "serviceAccount:${google_service_account.deploy.email}"
}'''
        role_start = source.index('resource "google_project_iam_custom_role" "deploy_run_operation_reader" {')
        role_end = source.index('\n}', role_start) + 2
        role_block = source[role_start:role_end]
        permission = '    "run.operations.get",'
        mutations = [
            ('remove operation get', permission, ''),
            ('add operation list', permission, permission + '\n    "run.operations.list",'),
            ('add operation delete', permission, permission + '\n    "run.operations.delete",'),
            ('add unrelated run permission', permission, permission + '\n    "run.services.update",'),
            ('replace with project developer', member_block,
             member_block.replace('google_project_iam_custom_role.deploy_run_operation_reader.name', '"roles/run.developer"')),
            ('replace with project admin', member_block,
             member_block.replace('google_project_iam_custom_role.deploy_run_operation_reader.name', '"roles/run.admin"')),
            ('literal role name removes dependency', member_block,
             member_block.replace('google_project_iam_custom_role.deploy_run_operation_reader.name', f'"{ROLE_NAME}"')),
            ('wrong principal', member_block,
             member_block.replace('${google_service_account.deploy.email}', 'wrong@workout-journal-506909.iam.gserviceaccount.com')),
            ('wrong role project', role_block, role_block.replace('var.project_id', '"wrong-project"')),
            ('wrong member project', member_block, member_block.replace('var.project_id', '"wrong-project"')),
            ('authoritative binding', member_block,
             member_block.replace('google_project_iam_member', 'google_project_iam_binding')
             .replace('  member  = "serviceAccount:${google_service_account.deploy.email}"',
                      '  members = ["serviceAccount:${google_service_account.deploy.email}"]')),
            ('authoritative policy', member_block, '''resource "google_project_iam_policy" "deploy_run_operation_reader" {
  project = var.project_id
  policy_data = jsonencode({ bindings = [{
    role = "roles/run.developer"
    members = ["serviceAccount:${google_service_account.deploy.email}"]
  }] })
}'''),
        ]
        for part in ('backend', 'frontend'):
            start = source.index(f'resource "{SERVICE_TYPE}" "deploy_{part}_run_developer" {{')
            end = source.index('\n}', start) + 2
            mutations.append((f'remove {part} service grant', source[start:end], ''))
        for broad_role in ('roles/run.developer', 'roles/run.admin', 'roles/run.viewer'):
            mutations.append((f'add extra {broad_role}', member_block,
                              member_block + '\n' + member_block.replace('"deploy_run_operation_reader"', '"extra"')
                              .replace('google_project_iam_custom_role.deploy_run_operation_reader.name', f'"{broad_role}"')))
        self.assertEqual(len(mutations), 17)
        for name, old, new in mutations:
            with self.subTest(mutant=name):
                self.assertEqual(source.count(old), 1, 'mutation anchor must be unique')
                with self.assertRaises(AssertionError, msg=name + ': mutant survived'):
                    assert_iam_contract(mock_plan(source.replace(old, new)))


if __name__ == '__main__':
    unittest.main()
