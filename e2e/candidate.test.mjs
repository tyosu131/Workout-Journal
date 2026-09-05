import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, chmod, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { APPLICATION_SHA, PROJECT, REGION, SUPABASE_REF, SUPABASE_URL, taggedUrl,
  validateManifest, readPrivateJson, sha256, browserBase, operationalIdentity } from './candidate-target.mjs';
import { newCandidateUser, validateCandidateOwner, candidateClient, receiptPath, validateResume } from './candidate-user.mjs';
import { finalizeCandidateEvidence } from './candidate-evidence.mjs';
import { STEPS } from './safety.mjs';
import { quietExec, ROOT, cleanEnv } from './safety.mjs';

test('browser discovery excludes archived copies and contains exactly one scenario', async () => {
  await mkdir(path.join(ROOT, 'e2e/.work'), { recursive: true, mode: 0o700 });
  const dir = await mkdtemp(path.join(ROOT, 'e2e/.work/discovery-'));
  try {
    await writeFile(path.join(dir, 'smoke.spec.ts'), 'throw new Error("ARCHIVE_MUST_NOT_EXECUTE");');
    const output = await quietExec(process.execPath, [path.join(ROOT, 'node_modules/playwright/cli.js'),
      'test', '--config', 'e2e/playwright.config.ts', '--list', '--reporter=list'], {
      env: cleanEnv({ E2E_BROWSER_BASE_URL: 'http://127.0.0.1:3100',
        E2E_BROWSER_REPORT: path.join(dir, 'unused.json'), E2E_USER_ID: 'discovery-only' }),
    });
    assert.match(output, /Total: 1 test in 1 file/);
    assert.doesNotMatch(output, /\.work/);
  } finally { await rm(dir, { recursive: true }); } // Only this dummy-only test directory.
});

function manifest() {
  const m = { version: 1, project: PROJECT, region: REGION, sourceSha: APPLICATION_SHA,
    candidateId: 'p2b-deadbeef', capturedAt: new Date().toISOString(),
    build: { id: '00000000-0000-4000-8000-000000000001', sourceSha: APPLICATION_SHA,
      status: 'SUCCESS', serviceAccount: 'projects/' + PROJECT + '/serviceAccounts/workout-journal-build@' + PROJECT + '.iam.gserviceaccount.com',
      digests: { backend: 'sha256:' + 'a'.repeat(64), frontend: 'sha256:' + 'b'.repeat(64) } },
    supabase: { projectRef: SUPABASE_REF, url: SUPABASE_URL },
    production: { backend: { revision: 'workout-journal-backend-00003-luc', traffic: 100 },
      frontend: { revision: 'workout-journal-frontend-00003-xar', traffic: 100 } },
    trafficBefore: {}, trafficCurrent: {} };
  for (const part of ['backend', 'frontend']) {
    const service = 'workout-journal-' + part, tag = 'candidate-' + m.candidateId;
    m[part] = { service, revision: service + '-' + m.candidateId, tag, url: taggedUrl(part, tag),
      traffic: 0, digest: m.build.digests[part], image: REGION + '-docker.pkg.dev/' + PROJECT + '/workout-journal/' + service + '@' + m.build.digests[part],
      serviceAccount: service + '-run@' + PROJECT + '.iam.gserviceaccount.com', maxInstances: 2 };
    m.trafficBefore[part] = [{ revision: m.production[part].revision, percent: 100,
      tag: 'candidate-0829-923536', url: taggedUrl(part, 'candidate-0829-923536') }];
    m.trafficCurrent[part] = [...m.trafficBefore[part], { revision: m[part].revision, percent: 0, tag, url: m[part].url }];
  }
  m.frontend.backendInternalUrl = m.backend.url;
  m.backend.supabaseUrl = SUPABASE_URL;
  m.backend.secretRefs = { SUPABASE_SECRET_KEY: { name: 'workout-journal-supabase-secret-key', version: '1' },
    JWT_SECRET: { name: 'workout-journal-jwt-secret', version: '2' } };
  return m;
}
test('candidate guard requires the complete approved pair, not run.app or candidate text', () => {
  const valid = manifest();
  assert.doesNotThrow(() => validateManifest(valid, 'candidate:' + valid.candidateId));
  for (const change of [
    m => { m.project = 'other-project'; }, m => { m.region = 'us-central1'; },
    m => { m.sourceSha = 'a'.repeat(40); }, m => { m.frontend.url = 'https://candidate.evil.run.app'; },
    m => { m.frontend.url = m.frontend.url.replace('https:', 'http:'); },
    m => { m.frontend.backendInternalUrl = taggedUrl('backend', 'candidate-0829-923536'); },
    m => { m.backend.digest = 'sha256:' + 'c'.repeat(64); },
    m => { m.backend.traffic = 1; }, m => { m.production.frontend.traffic = 99; },
    m => { m.trafficCurrent.backend[0].revision = m.backend.revision; },
    m => { m.trafficCurrent.frontend.push(m.trafficCurrent.frontend[0]); },
    m => { m.supabase.projectRef = 'other'; }, m => { m.supabase.url = 'https://other.supabase.co'; },
    m => { m.backend.secretRefs.SUPABASE_SECRET_KEY.version = 'latest'; },
    m => { m.backend.serviceAccount = 'default'; }, m => { m.backend.maxInstances = 20; },
    m => { m.build.status = 'WORKING'; }, m => { m.build.sourceSha = 'a'.repeat(40); },
    m => { m.capturedAt = new Date(Date.now() - 16 * 60_000).toISOString(); },
  ]) {
    const changed = structuredClone(valid); change(changed);
    assert.throws(() => validateManifest(changed, 'candidate:' + valid.candidateId));
  }
  assert.throws(() => validateManifest(valid, 'local:Workout-Journal'));
});
test('manifest file must be owned, 0600, regular, hash-bound and fresh; local mode remains strict', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'p2b-guard-test-'));
  const file = path.join(dir, 'manifest.json');
  try {
    const m = manifest(), bytes = JSON.stringify(m);
    await writeFile(file, bytes, { mode: 0o600 });
    const env = { E2E_TARGET: 'candidate:' + m.candidateId, E2E_TARGET_MANIFEST: file,
      E2E_MANIFEST_SHA256: sha256(bytes), E2E_BROWSER_BASE_URL: m.frontend.url };
    assert.equal(browserBase(env), m.frontend.url);
    assert.throws(() => browserBase({ ...env, E2E_VERIFY_FAILURE: 'framework' }));
    assert.throws(() => readPrivateJson(file, '0'.repeat(64)));
    await chmod(file, 0o644); assert.throws(() => readPrivateJson(file)); await chmod(file, 0o600);
    await symlink(file, path.join(dir, 'link')); assert.throws(() => readPrivateJson(path.join(dir, 'link')));
    assert.equal(browserBase({ E2E_BROWSER_BASE_URL: 'http://127.0.0.1:3100' }), 'http://127.0.0.1:3100');
    assert.throws(() => browserBase({ E2E_BROWSER_BASE_URL: m.frontend.url }));
  } finally { await rm(dir, { recursive: true }); } // Exact test-created dummy-only directory.
});
function owned(m) {
  const user = newCandidateUser(m);
  const r = user.receipt;
  const auth = { id: r.userId, email: r.email, created_at: new Date(r.metadata.createdAt).toISOString(),
    app_metadata: { p2b: r.metadata } };
  return { user, r, auth };
}
test('explicit resume requires the original exact run and complete zero-residual recovery', () => {
  const m = manifest(), { r } = owned(m);
  const attempt = { candidateId: m.candidateId, runId: r.runId };
  assert.throws(() => validateResume(m, attempt, r, r.runId));
  r.complete = true; r.cleanup = { auth: 0, users: 0, notes: 0, user_tags: 0 };
  assert.doesNotThrow(() => validateResume(m, attempt, r, r.runId));
  assert.throws(() => validateResume(m, attempt, r, r.runId + '-other'));
  assert.throws(() => validateResume(m, { ...attempt, candidateId: 'p2b-00000000' }, r, r.runId));
  for (const table of Object.keys(r.cleanup)) {
    const changed = structuredClone(r); changed.cleanup[table] = 1;
    assert.throws(() => validateResume(m, attempt, changed, r.runId));
  }
});
test('production cleanup rejects another UUID/run/nonce/owner, never scans or deletes by expiry', async t => {
  const m = manifest(), { r, auth } = owned(m), methods = [];
  assert.doesNotThrow(() => validateCandidateOwner(m, r, auth));
  for (const mutate of [
    a => { a.id = '00000000-0000-4000-8000-000000000001'; },
    a => { a.app_metadata.p2b.ownerNonce = '0'.repeat(48); },
    a => { a.app_metadata.p2b.purpose = 'human'; },
    a => { a.app_metadata.p2b.runId += '-other'; },
    a => { a.app_metadata.p2b.candidateId = 'p2b-00000000'; },
  ]) { const a = structuredClone(auth); mutate(a); assert.throws(() => validateCandidateOwner(m, r, a)); }
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    methods.push({ url, method: opts.method });
    return new Response(JSON.stringify({ ...auth, app_metadata: {} }));
  });
  const client = candidateClient(m, 'P2B_DUMMY_ADMIN_SECRET_MARKER');
  assert.equal(client.listUsers, undefined);
  await assert.rejects(client.cleanup(r), /AUTHORITATIVE_OWNERSHIP/);
  assert.equal(methods.length, 1); assert.equal(methods[0].method, 'GET');
  assert.ok(methods[0].url.endsWith('/' + r.userId));
  await assert.rejects(client.cleanup(r, true), /ACTIVE_P2B_RUN_REFUSED/);
  assert.equal(methods.length, 1);
});
test('only the exact UUID is hard-deleted; residual rows fail without SQL/data-delete fallback', async t => {
  const m = manifest(), { r, auth } = owned(m), calls = [];
  let deleted = false;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, method: options.method });
    if (options.method === 'DELETE') {
      assert.equal(url, SUPABASE_URL + '/auth/v1/admin/users/' + r.userId);
      assert.deepEqual(JSON.parse(options.body), { should_soft_delete: false });
      deleted = true; return new Response('{}');
    }
    if (url.includes('/auth/')) return deleted ? new Response('{}', { status: 404 }) : new Response(JSON.stringify(auth));
    assert.ok(url.includes('=eq.' + r.userId));
    return new Response(JSON.stringify(url.includes('/notes?') ? [{ userid: r.userId }] : []));
  });
  try {
    await assert.rejects(candidateClient(m, 'P2B_DUMMY_ADMIN_SECRET_MARKER').cleanup(r), /P2B_CLEANUP_RESIDUALS/);
    assert.equal(calls.filter(c => c.method === 'DELETE').length, 1);
    assert.equal(r.cleanup.notes, 1); assert.equal(r.complete, false);
  } finally { await rm(receiptPath(r.runId), { force: true }); } // Only this dummy fixture receipt.
});
test('final PASS requires all browser/cleanup/HTTPS/secret gates plus actual post-traffic identity', () => {
  const m = manifest();
  const input = { runId: 'p2b-' + Date.now() + '-0000000000000000', ...operationalIdentity(m),
    runnerDigest: 'c'.repeat(64), browser: 'chromium-1.2.3',
    steps: STEPS.map(name => ({ name, result: 'PASS' })), httpsCookieVerified: true,
    cleanup: { auth: 0, users: 0, notes: 0, user_tags: 0 }, secretLeakCheck: 'PASS',
    result: 'PENDING_TRAFFIC_VERIFICATION', password: 'DUMMY_SECRET_NOT_REPORTABLE' };
  const result = finalizeCandidateEvidence(m, m, input);
  assert.equal(result.result, 'PASS'); assert.ok(!JSON.stringify(result).includes(input.password));
  for (const changed of [{ ...input, steps: [] }, { ...input, httpsCookieVerified: false },
    { ...input, cleanup: { ...input.cleanup, notes: 1 } }, { ...input, secretLeakCheck: 'FAIL' },
    { ...input, candidateId: 'p2b-00000000' }]) assert.throws(() => finalizeCandidateEvidence(m, m, changed));
  const after = structuredClone(m); after.frontend.traffic = 10;
  assert.throws(() => finalizeCandidateEvidence(m, after, input));
});
