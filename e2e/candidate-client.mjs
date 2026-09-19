// CD identity v2 only. Historical random-UUID P2B remains in candidate-user.mjs.
import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import { check, SafeError } from './errors.cjs';
import { candidateUuid, ownershipBinding } from './candidate-identity.mjs';
import { candidateIdentity, SUPABASE_URL, SUPABASE_REF, validateManifest } from './candidate-target.mjs';
import { validateReleaseManifest } from './release-contract.mjs';
import { TABLES, unknownCounts, cleanupState, RESULT_CONTRACT } from './candidate-result.mjs';

const EXPIRY = 60 * 60_000;
export function newReleaseUser(m, now = Date.now()) {
  const binding = ownershipBinding(m), runId = 'p2b-' + m.candidateId;
  const metadata = { ...binding, runId, createdAt: now, expiresAt: now + EXPIRY,
    ownerNonce: randomBytes(24).toString('hex'), creatorPid: process.pid, creatorHost: hostname() };
  return { password: 'P2B_PASSWORD_MARKER_' + randomBytes(24).toString('hex'),
    receipt: { runId, userId: candidateUuid(m.repository, m.candidateId),
      email: runId + '@p2b.invalid', metadata, targetIdentity: candidateIdentity(m),
      supabaseProject: SUPABASE_REF, complete: false, createAttempted: false } };
}

function validateMetadata(m, o) {
  check(o && Object.entries(ownershipBinding(m)).every(([k, v]) => o[k] === v) &&
    o.runId === 'p2b-' + m.candidateId && Number.isSafeInteger(o.createdAt) && o.createdAt > 0 &&
    o.createdAt <= Date.now() + 60_000 && o.expiresAt === o.createdAt + EXPIRY &&
    /^[a-f0-9]{48}$/.test(o.ownerNonce) && Number.isSafeInteger(o.creatorPid) && o.creatorPid > 0 &&
    typeof o.creatorHost === 'string' && /^[a-zA-Z0-9._-]{1,255}$/.test(o.creatorHost),
  'CANDIDATE_OWNERSHIP_REFUSED');
}

export function validateReleaseReceipt(m, r) {
  validateMetadata(m, r?.metadata);
  check(r.userId === candidateUuid(m.repository, m.candidateId) && r.runId === 'p2b-' + m.candidateId &&
    r.email === r.runId + '@p2b.invalid' && r.targetIdentity === candidateIdentity(m) &&
    r.supabaseProject === SUPABASE_REF && r.metadata.creatorHost === hostname() &&
    r.metadata.creatorPid === process.pid, 'CANDIDATE_OWNERSHIP_REFUSED');
  return r;
}

export function validateRecoveryOwner(m, user) {
  const o = user?.app_metadata?.p2b;
  validateMetadata(m, o);
  check(user.id === candidateUuid(m.repository, m.candidateId) &&
    user.email === 'p2b-' + m.candidateId + '@p2b.invalid' &&
    Math.abs(Date.parse(user.created_at) - o.createdAt) <= 60_000, 'CANDIDATE_OWNERSHIP_REFUSED');
  return user;
}

export function validateReleaseOwner(m, r, user) {
  validateReleaseReceipt(m, r);
  validateRecoveryOwner(m, user);
  check(Object.entries(r.metadata).every(([k, v]) => user.app_metadata.p2b[k] === v),
    'CANDIDATE_OWNERSHIP_REFUSED');
}

function exactApi(m, secret) {
  ownershipBinding(m);
  check(m.supabase.url === SUPABASE_URL && typeof secret === 'string' && secret.length > 20,
    'CANDIDATE_OWNERSHIP_REFUSED');
  const uuid = candidateUuid(m.repository, m.candidateId);
  // No caller-supplied URL, query, SQL or list endpoint.
  return async (operation, code, body) => {
    const column = { users: 'uuid', notes: 'userid', user_tags: 'user_id' }[operation];
    check(['read', 'create', 'delete', 'users', 'notes', 'user_tags'].includes(operation), code);
    const suffix = column ? `/rest/v1/${operation}?${column}=eq.${uuid}&select=${column}` :
      '/auth/v1/admin/users' + (operation === 'create' ? '' : '/' + uuid);
    try {
      const response = await fetch(SUPABASE_URL + suffix, {
        method: operation === 'create' ? 'POST' : operation === 'delete' ? 'DELETE' : 'GET',
        redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { apikey: secret, Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json',
          ...(column ? { Prefer: 'count=exact', Range: '0-0', 'Range-Unit': 'items' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (operation === 'read' && response.status === 404) return null;
      check(response.ok, code);
      if (operation === 'delete') return null; // Verify absence by a separate exact read.
      const text = await response.text();
      check(Buffer.byteLength(text) <= 64 * 1024, code);
      const data = JSON.parse(text);
      if (column) {
        const range = /^(?:\*|0-0)\/([0-9]+)$/.exec(response.headers.get('content-range') || '');
        const count = range ? Number(range[1]) : NaN;
        check(Number.isSafeInteger(count) && count >= 0 && Array.isArray(data) &&
          data.length === (count === 0 ? 0 : 1) && data.every(row => row?.[column] === uuid), code);
        return count;
      }
      const user = data?.user || data;
      check(user && typeof user === 'object' && user.id === uuid, code);
      return user;
    } catch { throw new SafeError(code); } // Never carry request/response/error payloads.
  };
}

const outcome = () => ({ counts: unknownCounts(), state: 'UNPROVEN', failureCode: null,
  failureOperation: null, localReceiptState: 'NOT_REQUIRED' });
function fail(o, code) {
  if (!o.failureCode) { o.failureCode = code; o.failureOperation = RESULT_CONTRACT.failures[code]; }
}
async function tableCounts(api, o, prefix = 'CLEANUP') {
  for (const table of TABLES.slice(1)) {
    const failed = prefix === 'PRECREATE' ? 'PRECREATE_READ_FAILED' : `CLEANUP_${table.toUpperCase()}_QUERY_FAILED`;
    try { o.counts[table] = await api(table, failed); }
    catch { fail(o, failed); }
  }
  o.state = cleanupState(o.counts);
}

export function releaseCandidateClient(m, secret, persistReceipt) {
  validateManifest(m, 'candidate:' + m.candidateId);
  const api = exactApi(m, secret);
  return {
    create: async (r, password) => {
      validateReleaseReceipt(m, r);
      const pre = outcome(); r.precreate = pre;
      try { pre.counts.auth = (await api('read', 'PRECREATE_READ_FAILED')) === null ? 0 : 1; }
      catch { fail(pre, 'PRECREATE_READ_FAILED'); }
      await tableCounts(api, pre, 'PRECREATE');
      if (pre.state === 'RESIDUAL') {
        pre.failureCode = 'PREEXISTING_SYNTHETIC_IDENTITY_REFUSED'; pre.failureOperation = 'PRECREATE';
        throw new SafeError(pre.failureCode);
      }
      check(pre.state === 'PROVEN_ZERO', 'PRECREATE_READ_FAILED');
      // Cleanup is authorized only after this attempt may have created a user.
      // A collision/read failure MUST NOT trigger deletion in the outer finally.
      r.createAttempted = true;
      const user = await api('create', 'CANDIDATE_CREATE_FAILED', { id: r.userId, email: r.email,
        password, email_confirm: true, user_metadata: { username: r.runId }, app_metadata: { p2b: r.metadata } });
      validateReleaseOwner(m, r, user);
      return user;
    },
    cleanup: async r => {
      const o = outcome();
      try {
        validateReleaseReceipt(m, r);
        check(r.createAttempted === true, 'CANDIDATE_OWNERSHIP_REFUSED');
        const user = await api('read', 'CLEANUP_AUTH_READ_FAILED');
        if (user) {
          validateReleaseOwner(m, r, user);
          await api('delete', 'CLEANUP_AUTH_DELETE_FAILED', { should_soft_delete: false });
        }
        o.counts.auth = (await api('read', 'CLEANUP_AUTH_READ_FAILED')) === null ? 0 : 1;
        await tableCounts(api, o);
        for (const t of TABLES) if (o.counts[t] > 0) fail(o, `CLEANUP_${t.toUpperCase()}_RESIDUAL`);
      } catch (error) {
        fail(o, error instanceof SafeError && Object.hasOwn(RESULT_CONTRACT.failures, error.code)
          ? error.code : 'CANDIDATE_OWNERSHIP_REFUSED');
      }
      o.state = cleanupState(o.counts);
      r.cleanup = { ...o.counts }; r.complete = o.state === 'PROVEN_ZERO';
      try { await persistReceipt(r); o.localReceiptState = 'PERSISTED'; }
      catch { o.localReceiptState = 'FAILED'; fail(o, 'CLEANUP_LOCAL_RECEIPT_PERSIST_FAILED'); }
      return o; // Remote data proof survives a local persistence failure.
    },
  };
}

// Separate, read-only recovery contract. Call only under a future Human gate with
// the reviewed original manifest. No local receipt, live PID or same-host premise.
// This is deliberately not a deletion API and does not authorize a new scenario.
export async function inspectCandidateRecovery(m, secret) {
  validateReleaseManifest(m, 'candidate:' + m.candidateId, Date.parse(m.capturedAt));
  ownershipBinding(m); // Historical C3A manifests have no v2 identity contract.
  const api = exactApi(m, secret), o = outcome();
  const user = await api('read', 'CLEANUP_AUTH_READ_FAILED');
  if (user) validateRecoveryOwner(m, user);
  o.counts.auth = user === null ? 0 : 1;
  await tableCounts(api, o);
  return { candidateId: m.candidateId, cleanup: o.counts, cleanupState: o.state,
    failureCode: o.failureCode, failureOperation: o.failureOperation };
}
