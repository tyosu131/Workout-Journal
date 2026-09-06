import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReleaseManifest, bindWorkflow, candidateExitCode, RELEASE_TTL, CALLER, E2E_SECRET } from './release-contract.mjs';
import { validateManifest, candidateIdentity, sha256 } from './candidate-target.mjs';
import { newCandidateUser, validateReceipt } from './candidate-user.mjs';

// Synthetic *changing* state; no historical P2B release constants.
function manifest(sha = 'a'.repeat(40), run = '123456', attempt = '1') {
  const project = 'workout-journal-506909', region = 'asia-northeast1', candidateId = 'cd-' + run + '-' + attempt;
  const m = { version: 2, repository: 'tyosu131/Workout-Journal', project, region,
    sourceSha: sha, candidateId, capturedAt: new Date().toISOString(), ttlMs: RELEASE_TTL,
    run: { id: run, attempt, event: 'workflow_dispatch', workflowRef: CALLER,
      workflowSha: sha, ownerId: '95160728', repositoryId: '790375516', ciRunId: '99' },
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

test('different release SHAs, attempts and arbitrary production revisions are accepted', () => {
  for (const [sha, run, attempt] of [['a'.repeat(40), '123456', '1'],
    ['b'.repeat(40), '234567', '1'], ['a'.repeat(40), '34007295086', '2']]) {
    const m = manifest(sha, run, attempt);
    assert.equal(validateManifest(m, 'candidate:' + m.candidateId), m);
    const user = newCandidateUser(m);
    assert.equal(user.receipt.metadata.sourceSha, sha);
    assert.doesNotThrow(() => validateReceipt(m, user.receipt));
  }
});

test('tag URL identity comes from read-back, not parsing the service identifier', () => {
  const m = manifest();
  for (const part of ['backend', 'frontend']) {
    const c = m[part];
    c.url = 'https://' + c.tag + '---opaque-' + part + '-identifier.a.run.app';
    m.trafficCurrent[part][2].url = c.url;
    m.production[part].url = 'https://workout-journal-' + part + '-437413312066.asia-northeast1.run.app';
  }
  m.frontend.backendInternalUrl = m.backend.url;
  assert.doesNotThrow(() => validateReleaseManifest(m, 'candidate:' + m.candidateId));
  m.frontend.url += '/not-an-origin';
  assert.throws(() => validateReleaseManifest(m, 'candidate:' + m.candidateId));
});

test('dynamic manifest rejects tampering of every authority and boundary', () => {
  const m = manifest();
  for (const mutate of [
    v => { v.sourceSha = 'b'.repeat(40); }, v => { v.run.id = '333'; },
    v => { v.run.workflowRef = CALLER.replace('cd.yml', 'evil.yml'); },
    v => { v.run.event = 'pull_request'; }, v => { v.run.ownerId = '1'; },
    v => { v.run.repositoryId = '1'; }, v => { v.run.ciRunId = ''; },
    v => { v.build.serviceAccount = 'default'; }, v => { v.build.sourceSha = 'b'.repeat(40); },
    v => { v.build.id = 'other'; }, v => { v.frontend.digest = 'sha256:' + 'e'.repeat(64); },
    v => { v.frontend.backendInternalUrl = v.production.frontend.backendInternalUrl; },
    v => { v.trafficCurrent.frontend[2].percent = 100; },
    v => { v.trafficCurrent.backend[1].revision += '-moved'; },
    v => { v.trafficCurrent.backend.push(v.trafficCurrent.backend[1]); },
    v => { v.production.backend.revision += '-other'; },
    v => { v.e2eSecret.name = 'workout-journal-supabase-secret-key'; },
    v => { v.e2eSecret.version = 'latest'; }, v => { v.e2eSecret.project = 'other'; },
    v => { v.supabase.projectRef = 'other'; },
    v => { v.capturedAt = new Date(Date.now() - RELEASE_TTL - 1000).toISOString(); },
    v => { v.ttlMs *= 2; }, v => { v.frontend.url = 'https://evil.example'; },
  ]) {
    const bad = structuredClone(m); mutate(bad);
    assert.throws(() => validateReleaseManifest(bad, 'candidate:' + bad.candidateId), mutate.toString());
  }
});

test('manifest must belong to this exact workflow run, not just a plausible document', () => {
  const m = manifest();
  const env = { GITHUB_REPOSITORY: m.repository, GITHUB_REF: 'refs/heads/main', GITHUB_SHA: m.sourceSha,
    GITHUB_WORKFLOW_SHA: m.sourceSha, GITHUB_WORKFLOW_REF: CALLER, GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_RUN_ID: m.run.id, GITHUB_RUN_ATTEMPT: m.run.attempt };
  assert.doesNotThrow(() => bindWorkflow(m, env));
  for (const key of Object.keys(env)) assert.throws(() => bindWorkflow(m, { ...env, [key]: 'wrong' }));
  const changed = structuredClone(m); changed.e2eSecret.version = '18';
  assert.notEqual(candidateIdentity(changed), candidateIdentity(m));
});

test('historical v1 receipt identity remains byte-for-byte compatible', () => {
  const m = manifest(); m.version = 1;
  assert.equal(candidateIdentity(m), sha256(JSON.stringify([m.project, m.region,
    m.sourceSha, m.candidateId, m.backend, m.frontend, m.production, m.supabase, m.build])));
});

test('CD distinguishes scenario, cleanup and evidence failures without child diagnostics', () => {
  const clean = { auth: 0, users: 0, notes: 0, user_tags: 0 };
  assert.equal(candidateExitCode({ passed: true, cleanupRequired: true, cleanup: clean }), 0);
  assert.equal(candidateExitCode({ passed: false, cleanupRequired: false }), 20);
  assert.equal(candidateExitCode({ passed: false, cleanupRequired: true, cleanup: clean }), 20);
  assert.equal(candidateExitCode({ passed: true, cleanupRequired: true }), 21);
  for (const table of Object.keys(clean)) {
    assert.equal(candidateExitCode({ passed: true, cleanupRequired: true,
      cleanup: { ...clean, [table]: 1 } }), 21);
  }
  assert.equal(candidateExitCode({ passed: true, cleanupRequired: true,
    cleanup: clean, cleanupFailed: true }), 21);
  assert.equal(candidateExitCode({ passed: true, cleanupRequired: true,
    cleanup: clean, evidenceFailed: true }), 22);
});
