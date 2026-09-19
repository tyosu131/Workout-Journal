import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReleaseManifest, bindWorkflow, RELEASE_TTL, CALLER, E2E_SECRET } from './release-contract.mjs';
import { validateManifest, candidateIdentity, sha256 } from './candidate-target.mjs';
import { newCandidateUser, validateReceipt } from './candidate-user.mjs';

import { manifest } from './release-fixture.mjs';

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
