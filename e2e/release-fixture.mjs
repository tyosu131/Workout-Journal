// Offline synthetic metadata only. No cloud calls.
import { RELEASE_TTL, CALLER, E2E_SECRET } from './release-contract.mjs';

// Synthetic *changing* state; no historical P2B release constants.
export function manifest(sha = 'a'.repeat(40), run = '123456', attempt = '1') {
  const project = 'workout-journal-506909', region = 'asia-northeast1', candidateId = 'cd-' + run + '-' + attempt;
  const m = { version: 2, e2eIdentityVersion: 2, repository: 'tyosu131/Workout-Journal', project, region,
    sourceSha: sha, candidateId, capturedAt: new Date().toISOString(), ttlMs: RELEASE_TTL,
    run: { id: run, attempt, event: 'workflow_dispatch', workflowRef: CALLER,
      workflowSha: sha, ownerId: '95160728', repositoryId: '790375516', ciRunId: '99', ciRunAttempt: '1' },
    e2eSecret: { project, name: E2E_SECRET, version: '17' },
    supabase: { projectRef: 'krpnnkcipyeasddzbpma', url: 'https://krpnnkcipyeasddzbpma.supabase.co' },
    build: { id: '00000000-0000-4000-8000-000000000001', sourceSha: sha, status: 'SUCCESS',
      serviceAccount: 'projects/' + project + '/serviceAccounts/workout-journal-build@' + project + '.iam.gserviceaccount.com',
      digests: { backend: 'sha256:' + 'c'.repeat(64), frontend: 'sha256:' + 'd'.repeat(64) } },
    production: {}, trafficBefore: {}, trafficCurrent: {} };
  for (const part of ['backend', 'frontend']) {
    const service = 'workout-journal-' + part, tag = candidateId;
    const url = t => 'https://' + t + '---' + service + '-test-an.a.run.app';
    m[part] = { service, revision: service + '-' + candidateId, tag, url: url(tag),
      digest: m.build.digests[part], image: region + '-docker.pkg.dev/' + project + '/workout-journal/' + service + '@' + m.build.digests[part],
      serviceAccount: service + '-run@' + project + '.iam.gserviceaccount.com', maxInstances: 2,
      traffic: 0, configHash: 'e'.repeat(64), policyHash: 'f'.repeat(64) };
    m.production[part] = { revision: service + '-arbitrary-serving', traffic: 100,
      digest: 'sha256:' + '0'.repeat(64), configHash: '1'.repeat(64), url: 'https://' + service + '-test-an.a.run.app' };
    m.trafficBefore[part] = [
      { revision: m.production[part].revision, tag: 'retained-good', percent: 100, url: url('retained-good') },
      { revision: service + '-older-unused', tag: 'retained-unused', percent: 0, url: url('retained-unused') },
    ];
    m.trafficCurrent[part] = [...structuredClone(m.trafficBefore[part]), { revision: m[part].revision, tag, percent: 0, url: url(tag) }];
  }
  m.frontend.backendInternalUrl = m.backend.url;
  m.backend.supabaseUrl = m.supabase.url;
  m.production.frontend.backendInternalUrl = m.trafficBefore.backend[0].url;
  m.backend.secretRefs = { SUPABASE_SECRET_KEY: { name: 'workout-journal-supabase-secret-key', version: '27' },
    JWT_SECRET: { name: 'workout-journal-jwt-secret', version: '32' } };
  return m;
}
