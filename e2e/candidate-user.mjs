import { randomBytes, randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { check, SafeError, RUNS, processAlive } from './safety.mjs';
import { candidateIdentity, SUPABASE_URL, SUPABASE_REF, APPLICATION_SHA, validateManifest } from './candidate-target.mjs';

export const P2B_RUNS = path.join(RUNS, 'p2b');
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const RUN = /^p2b-(\d{13})-[a-f0-9]{16}$/;
export const EXPIRY = 60 * 60_000;
export function receiptPath(runId) {
  check(typeof runId === 'string' && RUN.test(runId), 'INVALID_P2B_RUN_ID');
  return path.join(P2B_RUNS, runId + '.json');
}
export function newCandidateUser(m, now = Date.now()) {
  const runId = 'p2b-' + now + '-' + randomBytes(8).toString('hex');
  const metadata = { repository: 'tyosu131/Workout-Journal', purpose: 'portfolio-p2b',
    candidateId: m.candidateId, runId, createdAt: now, expiresAt: now + EXPIRY,
    sourceSha: APPLICATION_SHA, version: 1, ownerNonce: randomBytes(24).toString('hex'),
    creatorPid: process.pid, creatorHost: hostname() };
  return { password: 'P2B_PASSWORD_MARKER_' + randomBytes(24).toString('hex'),
    receipt: { runId, userId: randomUUID(), email: runId + '@p2b.invalid', metadata,
      targetIdentity: candidateIdentity(m), supabaseProject: SUPABASE_REF, complete: false } };
}
export function validateReceipt(m, r) {
  receiptPath(r.runId);
  const o = r.metadata;
  check(UUID.test(r.userId) && r.email === r.runId + '@p2b.invalid' &&
    r.targetIdentity === candidateIdentity(m) && r.supabaseProject === SUPABASE_REF &&
    o?.repository === 'tyosu131/Workout-Journal' && o.purpose === 'portfolio-p2b' &&
    o.version === 1 && o.sourceSha === APPLICATION_SHA && o.candidateId === m.candidateId &&
    o.runId === r.runId && o.createdAt === Number(r.runId.split('-')[1]) &&
    o.expiresAt === o.createdAt + EXPIRY && /^[a-f0-9]{48}$/.test(o.ownerNonce) &&
    Number.isSafeInteger(o.creatorPid) && o.creatorPid > 0 && o.creatorHost === hostname(),
  'P2B_OWNERSHIP_UNPROVEN');
  return r;
}
export function validateCandidateOwner(m, r, user) {
  validateReceipt(m, r);
  const o = user?.app_metadata?.p2b;
  check(user?.id === r.userId && user.email === r.email && o &&
    Object.entries(r.metadata).every(([key, value]) => o[key] === value) &&
    Math.abs(Date.parse(user.created_at) - r.metadata.createdAt) <= 60_000,
  'P2B_AUTHORITATIVE_OWNERSHIP_MISMATCH');
}
export function validateResume(m, attempt, previous, runId) {
  validateReceipt(m, previous);
  check(attempt?.candidateId === m.candidateId && attempt.runId === runId &&
    previous.runId === runId && previous.complete === true &&
    ['auth', 'users', 'notes', 'user_tags'].every(table => previous.cleanup?.[table] === 0),
  'P2B_RESUME_NOT_PROVEN');
}
export async function saveCandidateReceipt(r) {
  const dest = receiptPath(r.runId);
  await mkdir(P2B_RUNS, { recursive: true, mode: 0o700 });
  const temp = path.join(P2B_RUNS, '.receipt-' + randomBytes(12).toString('hex'));
  await writeFile(temp, JSON.stringify(r), { mode: 0o600, flag: 'wx' });
  await rename(temp, dest);
}
export function candidateClient(m, secret) {
  // No generic URL/SQL/list-users interface: only current-run exact UUID operations.
  validateManifest(m, 'candidate:' + m.candidateId);
  check(m.supabase.url === SUPABASE_URL && typeof secret === 'string' && secret.length > 20,
    'CANDIDATE_CREDENTIAL_UNAVAILABLE');
  const request = async (r, operation, password) => {
    validateReceipt(m, r);
    let suffix, method = 'GET', body;
    if (operation === 'create') {
      suffix = '/auth/v1/admin/users'; method = 'POST';
      body = { id: r.userId, email: r.email, password, email_confirm: true,
        user_metadata: { username: r.runId }, app_metadata: { p2b: r.metadata } };
    } else if (operation === 'read' || operation === 'delete') {
      suffix = '/auth/v1/admin/users/' + r.userId;
      if (operation === 'delete') { method = 'DELETE'; body = { should_soft_delete: false }; }
    } else {
      const column = { users: 'uuid', notes: 'userid', user_tags: 'user_id' }[operation];
      check(column, 'P2B_OPERATION_REFUSED');
      suffix = '/rest/v1/' + operation + '?' + column + '=eq.' + r.userId + '&select=' + column;
    }
    let response;
    try {
      response = await fetch(SUPABASE_URL + suffix, { method, redirect: 'error',
        signal: AbortSignal.timeout(15_000), headers: { apikey: secret,
          Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}) });
    } catch { throw new SafeError('P2B_API_UNREACHABLE'); }
    if (operation === 'read' && response.status === 404) return null;
    check(response.ok, 'P2B_API_REJECTED');
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return ['read', 'create'].includes(operation) ? data?.user || data : data;
  };
  return {
    user: r => request(r, 'read'),
    create: async (r, password) => {
      check((await request(r, 'read')) === null, 'PREEXISTING_UUID_REFUSED');
      const user = await request(r, 'create', password);
      validateCandidateOwner(m, r, user);
      return user;
    },
    cleanup: async (r, recovery = false) => {
      validateReceipt(m, r);
      if (recovery) check(!processAlive(r.metadata.creatorPid), 'ACTIVE_P2B_RUN_REFUSED');
      else check(r.metadata.creatorPid === process.pid, 'P2B_CREATOR_MISMATCH');
      const user = await request(r, 'read');
      if (user) {
        validateCandidateOwner(m, r, user);
        await request(r, 'delete'); // Only destructive request; exact recorded UUID.
      }
      const counts = { auth: (await request(r, 'read')) === null ? 0 : 1 };
      for (const table of ['users', 'notes', 'user_tags']) {
        const rows = await request(r, table);
        check(Array.isArray(rows), 'P2B_RESIDUAL_QUERY_INVALID');
        counts[table] = rows.length;
      }
      r.cleanup = counts;
      r.complete = Object.values(counts).every(count => count === 0);
      await saveCandidateReceipt(r);
      check(r.complete, 'P2B_CLEANUP_RESIDUALS');
      return counts;
    },
  };
}
export async function credentialFromStdin(m) {
  // The caller reads only the candidate's exact Secret Manager version, then
  // injects { secretRef, value } via a private pipe. No argv, env or disk secret.
  let bytes = Buffer.alloc(0);
  const timer = setTimeout(() => process.stdin.destroy(new SafeError('CREDENTIAL_PIPE_TIMEOUT')), 10_000);
  try {
    for await (const chunk of process.stdin) {
      check(bytes.length + chunk.length <= 16_384, 'CREDENTIAL_PIPE_TOO_LARGE');
      bytes = Buffer.concat([bytes, chunk]);
    }
    const input = JSON.parse(bytes.toString('utf8'));
    const ref = m.backend.secretRefs.SUPABASE_SECRET_KEY;
    check(input.secretRef?.project === m.project && input.secretRef.name === ref.name &&
      input.secretRef.version === ref.version && typeof input.value === 'string' && input.value.length > 20,
    'SECRET_VERSION_INJECTION_MISMATCH');
    return input.value;
  } finally { clearTimeout(timer); bytes.fill(0); }
}
