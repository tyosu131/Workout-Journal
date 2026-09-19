import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, chmod, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { manifest } from './release-fixture.mjs';
import { uuidV5, candidateUuid, REPOSITORY } from './candidate-identity.mjs';
import { newCandidateUser, validateReceipt } from './candidate-user.mjs';
import { releaseCandidateClient, inspectCandidateRecovery, validateRecoveryOwner } from './candidate-client.mjs';
import { initialResult, setFailure, validateResult, resultExitCode, writeResult, cleanupState } from './candidate-result.mjs';

const HASH = '9'.repeat(64), ZERO = { auth: 0, users: 0, notes: 0, user_tags: 0 };
const SECRET = 'sb_secret_OFFLINE_ONLY_SECRET_MARKER';
const RAW = 'RAW_EXCEPTION_RESPONSE_TOKEN_https://private.invalid/path';

test('standard UUID v5 known vector; actual candidate identity binds repo and candidate', () => {
  assert.equal(uuidV5('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'www.example.com'),
    '2ed6657d-e927-568b-95e1-2665a8aea6a2'); // RFC 9562 Appendix A.4.
  const a = manifest(), b = manifest('a'.repeat(40), '123457');
  const first = newCandidateUser(a), second = newCandidateUser(a);
  assert.equal(first.receipt.userId, candidateUuid(REPOSITORY, a.candidateId));
  assert.equal(first.receipt.userId, second.receipt.userId);
  assert.notEqual(first.receipt.userId, newCandidateUser(b).receipt.userId);
  assert.notEqual(first.receipt.userId, newCandidateUser(manifest('a'.repeat(40), '123456', '2')).receipt.userId);
  assert.match(first.receipt.userId, /^[a-f0-9-]{14}5[a-f0-9-]{21}$/);
  for (const id of ['', 'cd-0-1', 'cd-123-0', 'cd-0123-1', 'cd-1-01', 'cd-1-1\n', '../cd-1-1', 'cd-1-10000', 'cd-' + '9'.repeat(20) + '-1']) {
    assert.throws(() => candidateUuid(REPOSITORY, id));
  }
  assert.throws(() => candidateUuid('other/Repository', a.candidateId));
  const old = structuredClone(a); delete old.e2eIdentityVersion;
  assert.throws(() => newCandidateUser(old)); // Never retroactively locate C3A's random UUID.
});

test('different process and actual hostname dependency changes preserve locator', () => {
  const script = `import os from 'node:os'; import { syncBuiltinESMExports } from 'node:module';
    os.hostname=()=>process.argv[1]; syncBuiltinESMExports();
    const { newCandidateUser }=await import('./e2e/candidate-user.mjs');
    const { manifest }=await import('./e2e/release-fixture.mjs');
    const r=newCandidateUser(manifest()).receipt;
    process.stdout.write(JSON.stringify({id:r.userId,host:r.metadata.creatorHost,pid:r.metadata.creatorPid}));`;
  const run = host => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script, host], { encoding: 'utf8' }));
  const a = run('original-host'), b = run('different-host');
  assert.notEqual(a.pid, b.pid); assert.notEqual(a.host, b.host);
  assert.equal(a.id, b.id); assert.equal(a.id, newCandidateUser(manifest()).receipt.userId);
});

function fakeApi(t, m) {
  const id = candidateUuid(REPOSITORY, m.candidateId), calls = [];
  const state = { auth: null, counts: { users: 0, notes: 0, user_tags: 0 },
    residual: {}, fail: null, malformed: null, authResidual: false };
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    const u = new URL(url), method = opts.method;
    calls.push({ path: u.pathname, search: u.search, method });
    const operation = u.pathname.includes('/rest/v1/') ? u.pathname.split('/').at(-1) :
      method === 'POST' ? 'create' : method === 'DELETE' ? 'delete' : 'read';
    if (operation === state.fail) throw new Error(RAW + SECRET);
    if (operation === state.malformed) return new Response(RAW + SECRET);
    assert.equal(u.origin, m.supabase.url);
    if (operation === 'create') {
      assert.equal(method, 'POST'); assert.equal(u.pathname, '/auth/v1/admin/users');
      assert.equal(state.auth, null); assert.ok(Object.values(state.counts).every(n => n === 0));
      const data = JSON.parse(opts.body);
      assert.equal(data.id, id);
      state.auth = { ...data, created_at: new Date(data.app_metadata.p2b.createdAt).toISOString() };
      return Response.json(state.auth);
    }
    if (operation === 'read' || operation === 'delete') {
      assert.equal(u.pathname, '/auth/v1/admin/users/' + id);
      if (operation === 'delete') {
        assert.deepEqual(JSON.parse(opts.body), { should_soft_delete: false });
        if (!state.authResidual) state.auth = null;
        state.counts = { users: 0, notes: 0, user_tags: 0, ...state.residual };
        return Response.json({});
      }
      assert.equal(method, 'GET');
      return state.auth ? Response.json(state.auth) : new Response('{}', { status: 404 });
    }
    assert.equal(method, 'GET');
    const col = { users: 'uuid', notes: 'userid', user_tags: 'user_id' }[operation];
    assert.ok(col, 'NO_GENERIC_LIST_FALLBACK');
    assert.equal(u.search, `?${col}=eq.${id}&select=${col}`);
    assert.equal(opts.headers.Prefer, 'count=exact'); assert.equal(opts.headers.Range, '0-0');
    const count = state.counts[operation];
    return Response.json(count ? [{ [col]: id }] : [], { headers: { 'content-range': count ? `0-0/${count}` : '*/0' } });
  });
  t.after(() => {
    for (const c of calls) {
      if (c.path.startsWith('/auth/') && c.method !== 'POST') {
        assert.equal(c.path, '/auth/v1/admin/users/' + id, 'NO_GENERIC_LIST_FALLBACK');
      } else if (c.path.startsWith('/rest/')) {
        assert.ok(c.search.includes('=eq.' + id), 'NO_GENERIC_LIST_FALLBACK');
      }
    }
  });
  return { state, calls };
}

test('pre-create checks Auth and every exact table; any preexisting object refuses POST and DELETE', async t => {
  for (const table of Object.keys(ZERO)) await t.test(table, async t => {
    const m = manifest(), { state, calls } = fakeApi(t, m), user = newCandidateUser(m);
    if (table === 'auth') state.auth = { id: user.receipt.userId };
    else state.counts[table] = 1;
    const client = releaseCandidateClient(m, SECRET, async () => {});
    await assert.rejects(client.create(user.receipt, user.password), /PREEXISTING_SYNTHETIC_IDENTITY_REFUSED/);
    assert.equal(user.receipt.createAttempted, false);
    const cleanup = await client.cleanup(user.receipt);
    assert.equal(cleanup.failureCode, 'CANDIDATE_OWNERSHIP_REFUSED');
    assert.equal(calls.length, 4); assert.ok(calls.every(c => c.method === 'GET'));
    assert.equal(user.receipt.precreate.counts[table], 1);
  });
});

test('unknown pre-create state is never treated as zero', async t => {
  for (const failure of ['read', 'users', 'notes', 'user_tags']) await t.test(failure, async t => {
    const m = manifest(), { state, calls } = fakeApi(t, m), u = newCandidateUser(m);
    state.fail = failure;
    await assert.rejects(releaseCandidateClient(m, SECRET, async () => {}).create(u.receipt, u.password), /PRECREATE_READ_FAILED/);
    assert.equal(u.receipt.precreate.counts[failure === 'read' ? 'auth' : failure], null);
    assert.ok(calls.every(c => c.method === 'GET'));
  });
});

test('cleanup exact data state remains separate from receipt persistence', async t => {
  const m = manifest(), { calls } = fakeApi(t, m), u = newCandidateUser(m);
  const client = releaseCandidateClient(m, SECRET, async () => { throw new Error(RAW); });
  await client.create(u.receipt, u.password);
  const result = await client.cleanup(u.receipt);
  assert.deepEqual(result.counts, ZERO); assert.equal(result.state, 'PROVEN_ZERO');
  assert.equal(result.localReceiptState, 'FAILED');
  assert.equal(result.failureCode, 'CLEANUP_LOCAL_RECEIPT_PERSIST_FAILED');
  assert.equal(calls.filter(c => c.method === 'DELETE').length, 1);
  const envelope = passing(m); Object.assign(envelope, { cleanup: result.counts, cleanupState: result.state,
    localReceiptState: result.localReceiptState }); setFailure(envelope, result.failureCode);
  assert.equal(resultExitCode(envelope), 22); // Not residual/unproven exit 21.
});

test('API and response failures keep unknown counts and fixed operation codes', async t => {
  for (const [op, code, unknown] of [['read', 'CLEANUP_AUTH_READ_FAILED', 'auth'],
    ['delete', 'CLEANUP_AUTH_DELETE_FAILED', 'auth'], ['users', 'CLEANUP_USERS_QUERY_FAILED', 'users'],
    ['notes', 'CLEANUP_NOTES_QUERY_FAILED', 'notes'], ['user_tags', 'CLEANUP_USER_TAGS_QUERY_FAILED', 'user_tags']]) {
    for (const kind of ['fail', 'malformed']) await t.test(op + kind, async t => {
      const m = manifest(), { state } = fakeApi(t, m), u = newCandidateUser(m);
      const client = releaseCandidateClient(m, SECRET, async () => {});
      await client.create(u.receipt, u.password); state[kind] = op;
      const result = await client.cleanup(u.receipt);
      if (op === 'delete' && kind === 'malformed') {
        // The response body cannot prove deletion; the fresh exact read still sees Auth.
        assert.equal(result.counts.auth, 1); assert.equal(result.state, 'RESIDUAL');
        assert.equal(result.failureCode, 'CLEANUP_AUTH_RESIDUAL');
      } else {
        assert.equal(result.counts[unknown], null); assert.equal(result.state, 'UNPROVEN');
        assert.equal(result.failureCode, code);
      }
      assert.ok(!JSON.stringify(result).includes(RAW));
    });
  }
});

test('each residual receives a fixed classification with observed counts', async t => {
  for (const table of Object.keys(ZERO)) await t.test(table, async t => {
    const m = manifest(), { state } = fakeApi(t, m), u = newCandidateUser(m);
    const client = releaseCandidateClient(m, SECRET, async () => {});
    await client.create(u.receipt, u.password);
    if (table === 'auth') state.authResidual = true; else state.residual[table] = 2;
    const r = await client.cleanup(u.receipt);
    assert.equal(r.state, 'RESIDUAL'); assert.ok(r.counts[table] > 0);
    assert.equal(r.failureCode, `CLEANUP_${table.toUpperCase()}_RESIDUAL`);
  });
});

test('cross-host recovery needs original immutable metadata, no local receipt; GET only', async t => {
  const m = manifest(), { state, calls } = fakeApi(t, m), u = newCandidateUser(m);
  await releaseCandidateClient(m, SECRET, async () => {}).create(u.receipt, u.password);
  calls.length = 0;
  state.auth.app_metadata.p2b.creatorHost = 'another-runner';
  state.auth.app_metadata.p2b.creatorPid = 987654;
  assert.throws(() => validateReceipt(m, { ...u.receipt, metadata: state.auth.app_metadata.p2b }));
  let result;
  await assert.doesNotReject(async () => { result = await inspectCandidateRecovery(m, SECRET); });
  assert.equal(result.cleanup.auth, 1); assert.equal(calls.length, 4);
  assert.ok(calls.every(c => c.method === 'GET'));
  for (const field of ['repository', 'purpose', 'candidateId', 'sourceSha', 'githubRunId', 'githubRunAttempt', 'version', 'runId']) {
    const bad = structuredClone(state.auth); bad.app_metadata.p2b[field] = 'foreign';
    assert.throws(() => validateRecoveryOwner(m, bad));
  }
  const old = structuredClone(m); delete old.e2eIdentityVersion;
  const n = calls.length; await assert.rejects(inspectCandidateRecovery(old, SECRET)); assert.equal(calls.length, n);
  state.auth = null; state.counts.notes = 3;
  assert.equal((await inspectCandidateRecovery(m, SECRET)).cleanup.notes, 3); // Auth absence alone is insufficient.
});

function passing(m) {
  const r = initialResult(m, HASH);
  Object.assign(r, { scenario: 'PASS', cleanup: { ...ZERO }, cleanupState: 'PROVEN_ZERO',
    localReceiptState: 'PERSISTED', evidenceState: 'PASS', httpsCookieVerified: true });
  r.steps.forEach(s => { s.result = 'PASS'; }); return r;
}

test('scenario and cleanup are independent and unknown is never coerced to zero', () => {
  const m = manifest();
  for (const [scenario, state, code] of [['PASS', 'PROVEN_ZERO', 0], ['FAIL', 'PROVEN_ZERO', 20],
    ['PASS', 'UNPROVEN', 21], ['FAIL', 'RESIDUAL', 21]]) {
    const r = passing(m); r.scenario = scenario;
    if (state === 'UNPROVEN') r.cleanup.notes = null;
    if (state === 'RESIDUAL') r.cleanup.notes = 1;
    r.cleanupState = cleanupState(r.cleanup);
    validateResult(r, m, HASH); assert.equal(r.cleanupState, state); assert.equal(resultExitCode(r), code);
    assert.equal(r.scenario, scenario);
  }
});

test('strict result binding and schema exclude every arbitrary/sensitive field', () => {
  const m = manifest();
  for (const change of [r => { r.candidateId = 'cd-99-1'; }, r => { r.sourceSha = 'b'.repeat(40); },
    r => { r.githubRunId = '99'; }, r => { r.githubRunAttempt = '2'; }, r => { r.manifestHash = '0'.repeat(64); },
    r => { r.recoveryHandle.candidateId = 'cd-99-1'; }, r => { r.uuid = newCandidateUser(m).receipt.userId; },
    r => { r.recoveryHandle.email = 'private@p2b.invalid'; }, r => { r.cleanup.notes = false; },
    r => { r.cleanup.notes = null; }, r => { r.failureCode = RAW; }, r => { r.failureOperation = RAW; },
    r => { r.steps[0].name = RAW; }, r => { r.scenario = SECRET; }, r => { r.extra = 'x'.repeat(17000); }]) {
    const r = passing(m); change(r); assert.throws(() => validateResult(r, m, HASH));
  }
});

test('result writer uses only parent-owned 0600 regular IPC; excludes identities and credentials', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cd-result-test-')), file = path.join(dir, 'result.json');
  try {
    const m = manifest(), u = newCandidateUser(m), r = passing(m);
    await writeFile(file, '', { mode: 0o600 });
    await writeResult(file, r, m, HASH);
    const raw = await readFile(file, 'utf8');
    for (const marker of [u.receipt.userId, u.receipt.email, u.password, SECRET, RAW]) assert.ok(!raw.includes(marker));
    await chmod(file, 0o644); await assert.rejects(writeResult(file, r, m, HASH)); await chmod(file, 0o600);
    await symlink(file, path.join(dir, 'link')); await assert.rejects(writeResult(path.join(dir, 'link'), r, m, HASH));
    await assert.rejects(writeResult(path.join(dir, 'missing'), r, m, HASH));
  } finally { await rm(dir, { recursive: true }); }
});
