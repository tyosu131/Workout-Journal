"""Evaluate locked Monitoring HCL offline; no backend, import execution or credentials."""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
TF = ROOT / 'infra/terraform'
PROJECT = 'workout-journal-506909'
CHANNEL = 'google_monitoring_notification_channel.email'
UPTIME = 'google_monitoring_uptime_check_config.frontend'
FRONTEND = 'google_monitoring_alert_policy.frontend_availability'
BACKEND = 'google_monitoring_alert_policy.backend_server_errors'
API = 'google_project_service.monitoring'
EMAIL = 'fixture@example.invalid'  # Synthetic test-only destination; never apply.


def mock_plan(overrides=None, email=EMAIL):
    with tempfile.TemporaryDirectory(prefix='obs-monitoring-mock-') as temp:
        root = Path(temp)
        for file in TF.glob('*.tf'):
            if file.name not in {'backend.tf', 'imports.tf'}:
                shutil.copyfile(file, root / file.name)
        for name, source in (overrides or {}).items():
            (root / name).write_text(source)
        shutil.copyfile(TF / '.terraform.lock.hcl', root / '.terraform.lock.hcl')
        (root / '.terraform').mkdir()
        (root / '.terraform/providers').symlink_to(TF / '.terraform/providers', target_is_directory=True)
        (root / 'tests').mkdir()
        test = (TF / 'tests/monitoring.tftest.hcl').read_text().replace(json.dumps(EMAIL), json.dumps(email))
        (root / 'tests/monitoring.tftest.hcl').write_text(test)
        env = {k: v for k, v in os.environ.items()
               if not k.startswith(('TF_', 'GOOGLE_', 'GCLOUD_', 'CLOUDSDK_'))}
        env['TF_IN_AUTOMATION'] = '1'
        run = subprocess.run(['terraform', f'-chdir={root}', 'test', '-json', '-verbose',
                              '-filter=tests/monitoring.tftest.hcl'], env=env,
                             capture_output=True, text=True, timeout=60)
        messages = [json.loads(line) for line in run.stdout.splitlines()]
        errors = [m['diagnostic'] for m in messages if m['type'] == 'diagnostic'
                  and m['diagnostic']['severity'] == 'error']
        if run.returncode or errors:
            raise RuntimeError(f'Terraform failed before semantic assertions: {errors!r}; {run.stderr}')
        plans = [m['test_plan'] for m in messages if m['type'] == 'test_plan']
        if len(plans) != 1:
            raise RuntimeError('expected one evaluated mock plan')
        graph = subprocess.run(['terraform', f'-chdir={root}', 'graph'], env=env,
                               capture_output=True, text=True, timeout=60)
        if graph.returncode:
            raise RuntimeError('dependency graph failed: ' + graph.stderr)
        plans[0]['dependencies'] = set(re.findall(r'^\s*"([^"]+)" -> "([^"]+)";', graph.stdout, re.MULTILINE))
        return plans[0]


def assert_contract(plan, email=EMAIL):
    resources = {r['address']: r for r in plan['resource_changes'] if r['mode'] == 'managed'}
    assert len(resources) == 42, 'exact approved state resource count changed'
    assert not any(r['type'] in {'google_cloud_run_service', 'google_cloud_run_v2_service',
                                'google_logging_metric'} for r in resources.values()), 'ownership/scope expanded'
    monitoring = {a for a, r in resources.items() if r['type'].startswith('google_monitoring_')}
    assert monitoring == {CHANNEL, UPTIME, FRONTEND, BACKEND}, 'Monitoring scope differs'
    values = {a: r['change']['after'] for a, r in resources.items()}
    apis = {v['service'] for a, v in values.items() if resources[a]['type'] == 'google_project_service'}
    assert apis == {'monitoring.googleapis.com', 'iam.googleapis.com', 'iamcredentials.googleapis.com',
                    'sts.googleapis.com', 'cloudresourcemanager.googleapis.com'}, 'API ownership differs'
    assert values[API]['project'] == PROJECT and values[API]['disable_on_destroy'] is False, 'API policy changed'
    def depends_on(start, target):
        # Terraform's graph removes redundant direct edges. Check effective
        # ordering, including policy -> channel/uptime -> API paths.
        pending, seen = [start], set()
        while pending:
            node = pending.pop()
            if node == target:
                return True
            if node not in seen:
                seen.add(node)
                pending.extend(b for a, b in plan['dependencies'] if a == node)
        return False

    for address in monitoring:
        assert values[address]['project'] == PROJECT, 'Monitoring project changed'
        assert depends_on(address, API), 'Monitoring API dependency missing: ' + address
    channel = values[CHANNEL]
    assert channel['type'] == 'email' and channel['enabled'] is True, 'email channel disabled/wrong type'
    assert channel['labels'] == {'email_address': email}, 'destination must consume the supplied variable'
    u = values[UPTIME]
    assert u['period'] == '300s' and u['timeout'] == '10s', 'uptime frequency/timeout changed'
    assert u['selected_regions'] == ['USA'] and u['checker_type'] == 'STATIC_IP_CHECKERS', 'checker scope changed'
    assert u['monitored_resource'] == [{'type': 'uptime_url', 'labels': {
        'project_id': PROJECT, 'host': 'workout-journal-frontend-cpbzb7lqza-an.a.run.app'}}], 'uptime target changed'
    h = u['http_check'][0]
    assert (h['path'], h['request_method'], h['port'], h['use_ssl'], h['validate_ssl']) == (
        '/login', 'GET', 443, True, True), 'uptime HTTP contract changed'
    codes = h['accepted_response_status_codes']
    assert len(codes) == 1 and codes[0]['status_value'] == 200 and not codes[0]['status_class'], 'non-200 accepted'
    assert not u['content_matchers'] and not h['auth_info'] and not h['headers'], 'uptime unnecessary content/auth'

    def threshold(address, severity, duration, period, aligner, reducer, groups, filters):
        p = values[address]
        assert p['enabled'] is True and p['combiner'] == 'OR' and p['severity'] == severity, 'policy routing changed'
        assert p['notification_channels'] == [channel['name']], 'notification disconnected'
        assert (address, CHANNEL) in plan['dependencies'], 'channel reference dependency missing'
        assert len(p['conditions']) == 1, 'unexpected conditions'
        c = p['conditions'][0]['condition_threshold'][0]
        assert set(c['filter'].split(' AND ')) == filters, 'metric filter differs'
        assert (c['comparison'], c['threshold_value'], c['duration']) == ('COMPARISON_GT', 1, duration), 'threshold changed'
        assert c['evaluation_missing_data'] == 'EVALUATION_MISSING_DATA_INACTIVE', 'missing-data policy changed'
        assert c['trigger'][0]['count'] == 1 and not c['trigger'][0]['percent'], 'trigger changed'
        assert len(c['aggregations']) == 1, 'unexpected aggregation'
        agg = c['aggregations'][0]
        assert (agg['alignment_period'], agg['per_series_aligner'], agg['cross_series_reducer']) == (
            period, aligner, reducer), 'aggregation changed'
        assert set(agg['group_by_fields']) == set(groups), 'grouping changed'
        doc = p['documentation'][0]
        assert doc['mime_type'] == 'text/markdown' and 'cloud-run-deployment-runbook.md#observability' in doc['content'], 'runbook missing'
        assert PROJECT in doc['content'], 'operator project context missing'

    threshold(FRONTEND, 'ERROR', '300s', '600s', 'ALIGN_NEXT_OLDER', 'REDUCE_COUNT_FALSE',
              ['resource.labels.project_id', 'resource.labels.host'], {
                  'resource.type = "uptime_url"', f'resource.labels.project_id = "{PROJECT}"',
                  'metric.type = "monitoring.googleapis.com/uptime_check/check_passed"',
                  f'metric.labels.check_id = "{u["uptime_check_id"]}"'})
    assert (FRONTEND, UPTIME) in plan['dependencies'], 'uptime reference dependency missing'
    threshold(BACKEND, 'WARNING', '60s', '300s', 'ALIGN_SUM', 'REDUCE_SUM',
              ['resource.labels.project_id', 'resource.labels.location', 'resource.labels.service_name'], {
                  'metric.type = "run.googleapis.com/request_count"', 'resource.type = "cloud_run_revision"',
                  f'resource.labels.project_id = "{PROJECT}"', 'resource.labels.location = "asia-northeast1"',
                  'resource.labels.service_name = "workout-journal-backend"', 'metric.labels.response_code_class = "5xx"'})
    assert 'zero-traffic candidate' in values[BACKEND]['documentation'][0]['content'], 'candidate scope not documented'


class MonitoringTests(unittest.TestCase):
    def test_actual_hcl_and_variable_destination(self):
        assert_contract(mock_plan())
        other = 'other-fixture@example.invalid'
        assert_contract(mock_plan(email=other), other)

    def test_email_variable_rejects_invalid_values(self):
        for email in ('', 'invalid', 'a@b', 'a@example.invalid\n', 'a b@example.invalid'):
            with self.subTest(email=email), self.assertRaisesRegex(RuntimeError, 'Invalid value for variable'):
                mock_plan(email=email)

    def test_ten_independent_semantic_mutants(self):
        assert_contract(mock_plan())  # Baseline must pass before any mutant gets credit.
        source = (TF / 'monitoring.tf').read_text()
        escaped = lambda value: value.replace('"', '\\"')
        mutations = [
            ('wrong host', 'workout-journal-frontend-cpbzb7lqza-an.a.run.app', 'wrong.example.invalid'),
            ('wrong path', 'path           = "/login"', 'path           = "/"'),
            ('non-200', 'status_value = 200', 'status_value = 201'),
            ('drop service', escaped(' AND resource.labels.service_name = "workout-journal-backend"'), ''),
            ('drop 5xx', escaped(' AND metric.labels.response_code_class = "5xx"'), ''),
            ('threshold', 'threshold_value = 1', 'threshold_value = 0'),
            ('disconnect notification', 'notification_channels = [google_monitoring_notification_channel.email.name]', 'notification_channels = []'),
            ('remove API dependency', 'depends_on = [google_project_service.monitoring]', 'depends_on = []'),
            ('literal email', 'email_address = var.monitoring_notification_email', 'email_address = "fixture@example.invalid"'),
        ]
        detected = 0
        for name, old, new in mutations:
            with self.subTest(mutant=name):
                self.assertIn(old, source, 'mutation anchor missing')
                value = 'other-fixture@example.invalid' if name == 'literal email' else EMAIL
                plan = mock_plan({'monitoring.tf': source.replace(old, new)}, email=value)
                with self.assertRaises(AssertionError): assert_contract(plan, value)
                detected += 1
        added = '\nresource "google_cloud_run_v2_service" "unapproved" {\n name = "unapproved"\n location = var.region\n template {\n containers {\n image = "example.invalid/test"\n }\n }\n}\n'
        plan = mock_plan({'monitoring.tf': source + added})
        with self.assertRaises(AssertionError): assert_contract(plan)
        detected += 1
        self.assertEqual(detected, 10)
        print('OBS Monitoring detection: 10/10 semantic; 0 schema-only; 0 syntax/runtime-only')


if __name__ == '__main__':
    unittest.main()
