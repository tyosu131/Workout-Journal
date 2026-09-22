"""OBS probe transition and raw configuration provenance, using actual CD code."""
from copy import deepcopy
import unittest
from unittest.mock import MagicMock, patch

import cd_release as cd
from test_cd_release import fixture, ENV, AUTHORITY, BUILD


class ProbeTests(unittest.TestCase):
    def test_backend_deploy_flags_and_frontend_preservation(self):
        before, after, revisions, _ = fixture()
        state = deepcopy(before)
        calls = {}

        def deploy(args, code, **kwargs):
            part = args[2].removeprefix('workout-journal-')
            calls[part] = args
            state[part] = deepcopy(after[part])

        with patch.object(cd, 'preflight', return_value=AUTHORITY), patch.object(cd.proof, 'check_credentials'), \
             patch.object(cd, 'read_state', side_effect=lambda: deepcopy(state)), \
             patch.object(cd, 'read_revision', side_effect=lambda name: revisions[name]), \
             patch.object(cd, 'cloud_run', return_value={'revisions': []}), \
             patch.object(cd.proof, 'prove', side_effect=lambda env, build, **kwargs: build.update(BUILD)), \
             patch.object(cd.proof, 'cloud', side_effect=deploy), patch.object(cd, 'emit'), \
             patch.object(cd, 'candidate_health') as health:
            cd.candidate({**ENV, 'NEXT_PUBLIC_SUPABASE_URL': cd.SUPABASE_URL}, {})
        self.assertEqual([a for a in calls['backend'] if '-probe=' in a], [
            '--startup-probe=httpGet.path=/health,httpGet.port=8080,initialDelaySeconds=0,timeoutSeconds=2,periodSeconds=5,failureThreshold=24',
            '--liveness-probe=httpGet.path=/health,httpGet.port=8080,initialDelaySeconds=0,timeoutSeconds=2,periodSeconds=30,failureThreshold=3',
        ])
        self.assertEqual([a for a in calls['frontend'] if '-probe=' in a], [])
        health.assert_called_once()

    def test_candidate_probe_and_non_probe_drift_rejected(self):
        before, after, revisions, m = fixture()
        name = m['backend']['revision']
        mutations = [
            lambda c: c.pop('startupProbe'),
            lambda c: c.pop('livenessProbe'),
            lambda c: c['startupProbe']['httpGet'].update(path='/'),
            lambda c: c['livenessProbe'].update(failureThreshold=1),
            lambda c: c['startupProbe']['httpGet'].update(httpHeaders=[{'name': 'x-test', 'value': 'test'}]),
            lambda c: c['env'].append({'name': 'UNAPPROVED_SETTING', 'value': 'test'}),
        ]
        for mutate in mutations:
            with self.subTest(mutation=mutate):
                bad = deepcopy(revisions)
                mutate(bad[name]['spec']['containers'][0])
                with patch.object(cd, 'read_revision', side_effect=lambda n: bad[n]):
                    with self.assertRaises(cd.proof.GateError):
                        cd.make_manifest(before, after, BUILD, ENV, AUTHORITY)

    def test_capacity_accepts_only_old_or_exact_approved_latest(self):
        before, _, revisions, m = fixture()
        with patch.object(cd, 'cloud_run', return_value={'revisions': []}), \
             patch.object(cd, 'read_revision', side_effect=lambda name: revisions[name]):
            cd.capacity(before, 'cd-54321-1')
            before['backend']['service']['status']['latestReadyRevisionName'] = m['backend']['revision']
            cd.capacity(before, 'cd-54321-1')
            for mutate in [lambda r: r['spec']['containers'][0].pop('livenessProbe'),
                           lambda r: r['spec']['containers'][0]['startupProbe']['httpGet'].update(path='/wrong'),
                           lambda r: r['spec'].update(serviceAccountName='unexpected'),
                           lambda r: r['metadata']['annotations'].update({'autoscaling.knative.dev/maxScale': '3'})]:
                original = deepcopy(revisions[m['backend']['revision']])
                mutate(revisions[m['backend']['revision']])
                with self.assertRaises(cd.proof.GateError): cd.capacity(before, 'cd-54321-1')
                revisions[m['backend']['revision']] = original

    def test_approved_http_production_supports_next_candidate_and_zero_default(self):
        before, after, revisions, m = fixture()
        prior = before['backend']['production']['spec']['containers'][0]
        candidate = revisions[m['backend']['revision']]['spec']['containers'][0]
        for key in ('startupProbe', 'livenessProbe'):
            prior[key] = deepcopy(candidate[key])
            candidate[key]['initialDelaySeconds'] = 0
        with patch.object(cd, 'read_revision', side_effect=lambda name: revisions[name]):
            cd.make_manifest(before, after, BUILD, ENV, AUTHORITY)

    def test_raw_config_hash_and_promotion_recheck_include_probes(self):
        _, after, revisions, m = fixture()
        for part in cd.PARTS:
            self.assertEqual(m[part]['configHash'], cd.digest(revisions[m[part]['revision']]['spec']))
        revisions[m['backend']['revision']]['spec']['containers'][0]['livenessProbe']['timeoutSeconds'] = 1
        with patch.object(cd, 'read_state', return_value=after), \
             patch.object(cd, 'read_revision', side_effect=lambda name: revisions[name]):
            with self.assertRaisesRegex(cd.proof.GateError, 'REVISION_CHANGED'):
                cd.recheck(m, {p: m['production'][p]['revision'] for p in cd.PARTS})

    def test_candidate_health_checks_fixed_body_without_changing_rollback_smoke(self):
        m = fixture()[3]
        response = MagicMock()
        response.__enter__.return_value = response
        response.status = 200
        response.read.return_value = b'{"status":"ok"}'
        opener = MagicMock()
        opener.open.return_value = response
        with patch.object(cd, 'build_opener', return_value=opener):
            cd.candidate_health(m)
            opener.open.assert_called_once_with(m['backend']['url'] + '/health', timeout=20)
            for status, body in [(404, b''), (200, b'{"status":"bad"}')]:
                response.status, response.read.return_value = status, body
                with self.assertRaisesRegex(cd.proof.GateError, 'CANDIDATE_HEALTH_FAILED'): cd.candidate_health(m)
            opener.open.reset_mock()
            def old_smoke(url, **kwargs):
                response.status = 200 if url.endswith('/login') else 401 if url.endswith('/session') else 404
                return response
            opener.open.side_effect = old_smoke
            cd.smoke(m)
            self.assertEqual(opener.open.call_args_list[-1].args[0], m['production']['backend']['url'] + '/')


if __name__ == '__main__':
    unittest.main()
