import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { newIdentity, validateOwnership, validateTarget, validateRunId, safeReport,
  STEPS, TARGET, API, TTL, cleanEnv, api, validateStack, check,
  assertRecoveryAllowed, removeOwnedUser } from './safety.mjs';
import { assertSafeOutputs } from './local-app.mjs';
import { validateGateway } from './gateway.mjs';

test('target guard rejects absent, hosted, alternate hosts, redirects and remote Docker', () => {
  assert.doesNotThrow(() => validateTarget({ E2E_TARGET: TARGET, E2E_SUPABASE_URL: API }));
  for (const url of [undefined, 'https://krpnnkcipyeasddzbpma.supabase.co',
    'http://localhost:54321', API + '/redirect', 'http://127.0.0.1:54321@evil.invalid',
    'http://2130706433:54321']) {
    assert.throws(() => validateTarget({ E2E_TARGET: TARGET, E2E_SUPABASE_URL: url }));
  }
  assert.throws(() => validateTarget({ E2E_SUPABASE_URL: API }));
  assert.throws(() => validateTarget({ E2E_TARGET: TARGET, E2E_SUPABASE_URL: API,
    DOCKER_HOST: 'ssh://remote' }));
});
function owned(now = Date.now()) {
  const id = newIdentity(now);
  const user = { id: '00000000-0000-4000-8000-000000000001', email: id.email,
    created_at: new Date(now).toISOString(), app_metadata: { p2a: id.metadata } };
  return { id, user, now };
}
test('cleanup requires UUID plus exact authoritative ownership, not a prefix', () => {
  const { user, id, now } = owned();
  assert.equal(validateOwnership(user, id.runId, now).expires, now + TTL);
  for (const alter of [
    value => { delete value.app_metadata; },
    value => { value.app_metadata.p2a.owner = 'someone-else'; },
    value => { value.app_metadata.p2a.target = 'production'; },
    value => { value.email = 'human@example.invalid'; },
    value => { value.app_metadata.p2a.runId = newIdentity().runId; },
    value => { value.id = '../users'; },
    value => { value.app_metadata.p2a.expires = 1; },
    value => { value.created_at = new Date(now - TTL).toISOString(); },
    value => { delete value.app_metadata.p2a.creator; },
    value => { value.app_metadata.p2a.creator.host = 'ambiguous-other-machine'; },
    value => { value.app_metadata.p2a.creator.pid = 0; },
  ]) {
    const changed = structuredClone(user);
    alter(changed);
    assert.throws(() => validateOwnership(changed, id.runId, now));
  }
  assert.throws(() => validateRunId('../../receipt'));
});
test('expiry has a bounded, immutable one-hour contract', () => {
  const { user, id, now } = owned();
  assert.ok(validateOwnership(user, id.runId, now).expires > now);
  assert.ok(validateOwnership(user, id.runId, now + TTL).expires <= now + TTL);
});
test('expiry never permits deleting active or ambiguous creators; stale also requires expiry', () => {
  const { id, now } = owned();
  for (const stale of [false, true]) {
    assert.throws(() => assertRecoveryAllowed(id.metadata,
      { stale, now: now + TTL * 2, alive: () => true }), /ACTIVE_RUN_REFUSED/);
  }
  assert.throws(() => assertRecoveryAllowed(id.metadata,
    { stale: true, now, alive: () => false }), /UNEXPIRED_RUN_REFUSED/);
  assert.doesNotThrow(() => assertRecoveryAllowed(id.metadata,
    { stale: true, now: now + TTL, alive: () => false }));
  assert.doesNotThrow(() => assertRecoveryAllowed(id.metadata, { now, alive: () => false }));
});
test('forging the receipt PID cannot delete a live creator, even after expiry', async t => {
  const { id, user, now } = owned(Date.now() - TTL * 2);
  const methods = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    methods.push(options.method);
    return new Response(JSON.stringify({ user }), { status: 200 });
  });
  await assert.rejects(removeOwnedUser({ api: API, secret: 'dummy' },
    { runId: id.runId, userId: user.id, target: TARGET, pid: 1, expires: now + TTL },
    { recovery: true }), /ACTIVE_RUN_REFUSED/);
  assert.deepEqual(methods, ['GET']);
});
test('allowlist drops dummy credentials, error bodies, headers, DOM and extra fields', () => {
  const dummy = 'P2A_DUMMY_SECRET_MARKER_DO_NOT_PERSIST';
  const report = safeReport({ runId: newIdentity().runId, suiteSha: 'a'.repeat(40),
    sourceDigest: 'b'.repeat(64),
    browser: 'chromium-1.2.3', steps: STEPS.map(name => ({ name, result: 'PASS',
      error: dummy, request: { password: dummy }, dom: dummy })),
    cleanup: { authUserRemoved: true, residualRows: 0, secret: dummy },
    result: 'PASS', stdout: dummy, authorization: dummy });
  assert.equal(report.result, 'PASS');
  assert.ok(!JSON.stringify(report).includes(dummy));
  assert.equal(safeReport({ ...report, steps: [] }).result, 'FAIL');
  assert.equal(safeReport({ ...report, cleanup: { authUserRemoved: true, residualRows: 1 } }).result, 'FAIL');
  assert.equal(safeReport({ ...report, cleanup: undefined }).result, 'FAIL');
});
test('child environments do not inherit dotenv, credentials or debug logging', () => {
  const originalSecret = process.env.SUPABASE_SECRET_KEY;
  const originalDebug = process.env.DEBUG;
  process.env.SUPABASE_SECRET_KEY = 'P2A_DUMMY_ADMIN_MARKER';
  process.env.DEBUG = '*';
  const env = cleanEnv();
  assert.equal(env.SUPABASE_SECRET_KEY, undefined);
  assert.equal(env.DEBUG, undefined);
  if (originalSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY = originalSecret;
  if (originalDebug === undefined) delete process.env.DEBUG;
  else process.env.DEBUG = originalDebug;
});
test('API guard refuses a hosted origin and network-path redirect before fetch', async () => {
  await assert.rejects(api({ api: 'https://example.supabase.co', secret: 'dummy' }, '/auth/v1/admin/users'));
  await assert.rejects(api({ api: API, secret: 'dummy' }, '//example.supabase.co/auth/v1/admin/users'));
});
test('local gateway must pair Auth and REST with the owned local database', () => {
  const containers = ['db', 'kong', 'auth', 'rest'].map(service => ({
    Name: '/supabase_' + service + '_Workout-Journal',
    Config: { Labels: { 'com.supabase.cli.project': 'Workout-Journal' },
      Env: ['GOTRUE_DB_DATABASE_URL=postgres://dummy@supabase_db_Workout-Journal:5432/postgres',
        'PGRST_DB_URI=postgres://dummy@supabase_db_Workout-Journal:5432/postgres'] },
    State: { Running: true },
    NetworkSettings: { Networks: { 'supabase_network_Workout-Journal': {} },
      Ports: { '8000/tcp': [{ HostPort: '54321' }] } }
  }));
  assert.doesNotThrow(() => validateStack(containers));
  for (const alter of [
    rows => { rows[2].Config.Env = ['GOTRUE_DB_DATABASE_URL=postgres://dummy@hosted.invalid:5432/postgres']; },
    rows => { rows[3].Config.Env = ['PGRST_DB_URI=postgres://dummy@hosted.invalid:5432/postgres']; },
    rows => { rows[3].Config.Env = ['PGRST_DB_URI=postgres://dummy@supabase_db_Workout-Journal:5432/postgres?host=hosted.invalid']; },
    rows => { rows[1].NetworkSettings.Ports = {}; },
    rows => { rows[0].State.Running = false; },
    rows => { rows[3].NetworkSettings.Networks = {}; },
  ]) {
    const changed = structuredClone(containers);
    alter(changed);
    assert.throws(() => validateStack(changed));
  }
});
test('loaded gateway routes cannot forward Admin credentials to hosted/shadow upstreams', () => {
  const specs = [
    ['/auth/v1/', 'auth-v1', 'auth', 9999, '/'],
    ['/auth/v1/verify', 'auth-v1-open', 'auth', 9999, '/verify'],
    ['/auth/v1/callback', 'auth-v1-open-callback', 'auth', 9999, '/callback'],
    ['/auth/v1/authorize', 'auth-v1-open-authorize', 'auth', 9999, '/authorize'],
    ['/rest/v1/', 'rest-v1', 'rest', 3000, '/'],
  ];
  const gateway = {
    services: specs.map((s, i) => ({ id: String(i), name: s[1],
      host: 'supabase_' + s[2] + '_Workout-Journal', port: s[3], path: s[4], protocol: 'http' })),
    routes: specs.map((s, i) => ({ paths: [s[0]], service: { id: String(i) },
      strip_path: true, protocols: ['http', 'https'] })),
    plugins: [{ name: 'cors' }, { name: 'request-transformer' }], upstreams: [],
  };
  assert.doesNotThrow(() => validateGateway(gateway, check));
  for (const change of [
    g => { g.services[0].host = 'example.supabase.co'; },
    g => { g.services[4].host = 'hosted.invalid'; },
    g => { g.routes.push({ ...g.routes[0], paths: ['/auth/v1/admin'] }); },
    g => { g.routes.push({ ...g.routes[0], paths: ['/'] }); },
    g => { g.routes.push({ ...g.routes[0], paths: ['~/auth/.*'] }); },
    g => { g.routes[0].service.id = '4'; },
    g => { g.upstreams.push({ name: 'supabase_auth_Workout-Journal' }); },
    g => { g.plugins.push({ name: 'http-log' }); },
    g => { g.routes.pop(); },
  ]) {
    const changed = structuredClone(gateway);
    change(changed);
    assert.throws(() => validateGateway(changed, check));
  }
});
test('artifact inspection detects dummy secrets, JWTs and forbidden artifact types', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'wj-p2a-unit-'));
  const marker = 'P2A_DUMMY_SECRET_ARTIFACT_MARKER';
  try {
    await writeFile(path.join(dir, 'report.json'), JSON.stringify({ raw: marker }));
    await assert.rejects(assertSafeOutputs(dir, [marker]));
    await writeFile(path.join(dir, 'report.json'), JSON.stringify({ result: 'PASS' }));
    await assertSafeOutputs(dir, [marker]);
    await writeFile(path.join(dir, 'trace.zip'), 'dummy, not a real trace');
    await assert.rejects(assertSafeOutputs(dir, [marker]));
    await rm(path.join(dir, 'trace.zip'));
    await writeFile(path.join(dir, 'report.json'), JSON.stringify({ token: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJkdW1teSJ9.ZHVtbXk' }));
    await assert.rejects(assertSafeOutputs(dir, [marker]));
  } finally {
    // This exact mkdtemp-created unit fixture contains only dummy markers.
    await rm(dir, { recursive: true });
  }
});
