import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, readdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hostname } from 'node:os';
import { validateGateway } from './gateway.mjs';
import { SafeError, check } from './errors.cjs';
export { SafeError, check } from './errors.cjs';

export const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const RUNS = path.join(ROOT, 'e2e/.runs');
export const EVIDENCE = path.join(ROOT, 'e2e/evidence');
export const TARGET = 'local:Workout-Journal';
export const API = 'http://127.0.0.1:54321';
export const TTL = 60 * 60 * 1000;
export const STEPS = ['login', 'tag-create', 'note-create-save-read', 'tag-use',
  'Calendar', 'Analytics', 'tag-delete', 'logout'];
const RUN_PATTERN = /^p2a-(\d{13})-[a-f0-9]{16}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const exec = promisify(execFile);

export function validateTarget(env) {
  check(env.E2E_TARGET === TARGET && env.E2E_SUPABASE_URL === API, 'TARGET_NOT_APPROVED');
  check(!env.DOCKER_HOST || env.DOCKER_HOST.startsWith('unix:///'), 'REMOTE_DOCKER_REFUSED');
}
export function validateRunId(id) {
  check(typeof id === 'string' && RUN_PATTERN.test(id), 'INVALID_RUN_ID');
  return id;
}
export function newIdentity(now = Date.now()) {
  const runId = 'p2a-' + now + '-' + randomBytes(8).toString('hex');
  return { runId, email: runId + '@p2a.invalid',
    password: 'P2A_PASSWORD_MARKER_' + randomBytes(24).toString('hex'),
    metadata: { owner: 'tyosu131/Workout-Journal/P2A', target: TARGET, runId,
      created: now, expires: now + TTL, version: 2,
      creator: { pid: process.pid, host: hostname() } } };
}
export function validateOwnership(user, runId, now = Date.now()) {
  validateRunId(runId);
  const m = user?.app_metadata?.p2a;
  check(UUID_PATTERN.test(user?.id ?? ''), 'INVALID_USER_ID');
  check(m?.owner === 'tyosu131/Workout-Journal/P2A' && m.target === TARGET &&
    m.version === 2 && m.runId === runId && user.email === runId + '@p2a.invalid' &&
    Number.isSafeInteger(m.creator?.pid) && m.creator.pid > 0 && m.creator.host === hostname(),
  'OWNERSHIP_NOT_PROVEN');
  check(Number.isSafeInteger(m.created) && m.created === Number(runId.split('-')[1]) &&
    m.expires === m.created + TTL && m.created <= now + 60_000 &&
    Math.abs(Date.parse(user.created_at) - m.created) < 60_000,
  'OWNERSHIP_TIME_INVALID');
  return m;
}
export function processAlive(pid) {
  check(Number.isSafeInteger(pid) && pid > 0, 'CREATOR_NOT_PROVEN');
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code !== 'ESRCH'; } // EPERM/unknown/PID reuse: fail closed.
}
export function assertRecoveryAllowed(ownership, { stale = false, now = Date.now(),
  alive = processAlive } = {}) {
  check(ownership.creator?.host === hostname(), 'CREATOR_NOT_PROVEN');
  check(!alive(ownership.creator.pid), 'ACTIVE_RUN_REFUSED');
  if (stale) check(ownership.expires <= now, 'UNEXPIRED_RUN_REFUSED');
}
export function cleanEnv(extra = {}) {
  // Never inherit application secrets, dotenv paths, debug flags, or remote Docker overrides.
  return { PATH: path.dirname(process.execPath) + ':/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
    ...(process.env.HOME ? { HOME: process.env.HOME } : {}),
    ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}),
    SUPABASE_TELEMETRY_DISABLED: '1', NEXT_TELEMETRY_DISABLED: '1', TZ: 'Asia/Tokyo',
    ...extra };
}
export async function quietExec(command, args, options = {}) {
  try {
    return (await exec(command, args, { cwd: ROOT, env: cleanEnv(), encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024, timeout: 30_000, ...options })).stdout;
  } catch {
    // exec errors contain argv/env/output; never propagate or serialize them.
    throw new SafeError('LOCAL_COMMAND_FAILED');
  }
}
export function validateStack(containers) {
  const find = service => containers.find(item => item.Name === '/supabase_' + service + '_Workout-Journal');
  const network = 'supabase_network_Workout-Journal';
  for (const service of ['db', 'kong', 'auth', 'rest']) {
    const container = find(service);
    check(container?.Config?.Labels?.['com.supabase.cli.project'] === 'Workout-Journal' &&
      container.State?.Running && container.NetworkSettings?.Networks?.[network],
    'LOCAL_STACK_NOT_PROVEN');
  }
  check(find('kong').NetworkSettings.Ports?.['8000/tcp']?.some(binding =>
    binding.HostPort === '54321'), 'LOCAL_GATEWAY_NOT_PROVEN');
  // A localhost proxy alone is not isolation. Prove Auth and REST both target
  // the same local database, not a Hosted DB behind a local container.
  for (const [service, variable] of [['auth', 'GOTRUE_DB_DATABASE_URL'], ['rest', 'PGRST_DB_URI']]) {
    const entry = find(service).Config.Env?.find(value => value.startsWith(variable + '='));
    let url;
    try { url = new URL(entry?.slice(variable.length + 1)); }
    catch { throw new SafeError('LOCAL_DATABASE_ROUTE_INVALID'); }
    check(['postgres:', 'postgresql:'].includes(url.protocol) &&
      url.hostname === 'supabase_db_Workout-Journal' &&
      ['', '5432'].includes(url.port) && url.pathname === '/postgres' && !url.search && !url.hash,
    'HOSTED_DATABASE_REFUSED');
  }
}
export async function localTarget(env = process.env) {
  validateTarget(env);
  check(process.versions.node.split('.')[0] === '24', 'NODE_24_REQUIRED');
  const context = JSON.parse(await quietExec('docker', ['context', 'inspect']))[0];
  check(context?.Endpoints?.docker?.Host?.startsWith('unix:///'), 'REMOTE_DOCKER_REFUSED');
  const containers = JSON.parse(await quietExec('docker', ['inspect', 'supabase_db_Workout-Journal',
    'supabase_kong_Workout-Journal', 'supabase_auth_Workout-Journal', 'supabase_rest_Workout-Journal']));
  validateStack(containers);
  const gateway = {};
  for (const endpoint of ['services', 'routes', 'plugins', 'upstreams']) {
    const page = JSON.parse(await quietExec('docker', ['exec', 'supabase_kong_Workout-Journal',
      'wget', '-qO-', 'http://127.0.0.1:8001/' + endpoint + '?size=1000']));
    check(!page.next && Array.isArray(page.data), 'GATEWAY_SCAN_INCOMPLETE');
    gateway[endpoint] = page.data;
  }
  validateGateway(gateway, check);
  const status = JSON.parse(await quietExec('supabase', ['status', '-o', 'json']));
  check(status.API_URL === API, 'LOCAL_STATUS_TARGET_MISMATCH');
  const secret = status.SECRET_KEY || status.SERVICE_ROLE_KEY;
  const publishable = status.PUBLISHABLE_KEY || status.ANON_KEY;
  check(typeof secret === 'string' && secret.length > 20 &&
    typeof publishable === 'string' && publishable.length > 20, 'LOCAL_KEYS_UNAVAILABLE');
  return { secret, publishable, api: API };
}
export async function api(target, suffix, { method = 'GET', body, missing = false } = {}) {
  check(target.api === API && suffix.startsWith('/'), 'REMOTE_API_REFUSED');
  const url = new URL(suffix, API);
  check(url.origin === API && !url.username && !url.password, 'REMOTE_API_REFUSED');
  let response;
  try {
    response = await fetch(url, { method, redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { apikey: target.secret, Authorization: 'Bearer ' + target.secret,
        'Content-Type': 'application/json', Prefer: 'return=representation' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  } catch { throw new SafeError('LOCAL_API_UNREACHABLE'); }
  if (missing && response.status === 404) return null;
  check(response.ok, 'LOCAL_API_REJECTED');
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
export async function userById(target, id) {
  check(UUID_PATTERN.test(id), 'INVALID_USER_ID');
  const data = await api(target, '/auth/v1/admin/users/' + id, { missing: true });
  return data?.user || data;
}
export async function residuals(target, id) {
  check(UUID_PATTERN.test(id), 'INVALID_USER_ID');
  const tables = [['users', 'uuid'], ['notes', 'userid'], ['user_tags', 'user_id']];
  const counts = {};
  for (const [table, column] of tables) {
    // Only opaque IDs are read; application data, email and note bodies are never retrieved.
    const rows = await api(target, '/rest/v1/' + table + '?' + column + '=eq.' + id + '&select=' + column);
    check(Array.isArray(rows), 'RESIDUAL_QUERY_INVALID');
    counts[table] = rows.length;
  }
  return counts;
}
export async function saveReceipt(receipt) {
  validateRunId(receipt.runId);
  await mkdir(RUNS, { recursive: true, mode: 0o700 });
  const temporary = path.join(RUNS, '.receipt-' + randomBytes(12).toString('hex'));
  await writeFile(temporary, JSON.stringify(receipt), { mode: 0o600, flag: 'wx' });
  await rename(temporary, path.join(RUNS, receipt.runId + '.json'));
}
export async function createUser(target) {
  const identity = newIdentity();
  // Ownership is recorded atomically with creation: a crash before receipt writing is recoverable.
  const data = await api(target, '/auth/v1/admin/users', { method: 'POST', body: {
    email: identity.email, password: identity.password, email_confirm: true,
    user_metadata: { username: identity.runId },
    app_metadata: { p2a: identity.metadata }
  } });
  const user = data.user || data;
  validateOwnership(user, identity.runId);
  const receipt = { runId: identity.runId, userId: user.id, created: identity.metadata.created,
    expires: identity.metadata.expires, target: TARGET, complete: false, pid: process.pid };
  await saveReceipt(receipt);
  return { ...identity, userId: user.id, receipt };
}
export async function removeOwnedUser(target, receipt, { stale = false, recovery = false,
  now = Date.now() } = {}) {
  validateRunId(receipt.runId);
  check(receipt.target === TARGET && UUID_PATTERN.test(receipt.userId), 'INVALID_RECEIPT');
  const user = await userById(target, receipt.userId);
  if (user) {
    const ownership = validateOwnership(user, receipt.runId, now);
    if (stale || recovery) assertRecoveryAllowed(ownership, { stale, now });
    else check(ownership.creator.pid === process.pid, 'CREATOR_NOT_PROVEN');
    // Before the only destructive request, re-read authoritative ownership for this exact UUID.
    await saveReceipt({ ...receipt, complete: false });
    await api(target, '/auth/v1/admin/users/' + receipt.userId,
      { method: 'DELETE', body: { should_soft_delete: false } });
  }
  const authUserRemoved = (await userById(target, receipt.userId)) === null;
  const counts = await residuals(target, receipt.userId);
  const residualRows = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const result = { authUserRemoved, residualRows, counts };
  // Persist residual evidence even on failure. Never delete residual rows as a workaround.
  await saveReceipt({ ...receipt, complete: authUserRemoved && residualRows === 0, cleanup: result });
  check(authUserRemoved && residualRows === 0, 'CLEANUP_RESIDUALS');
  return result;
}
export async function staleCleanup(target, now = Date.now()) {
  let removed = 0;
  const expired = [];
  // A server-side marker survives runner/machine crashes. Never match by prefix alone.
  for (let page = 1; page <= 100; page++) {
    const data = await api(target, '/auth/v1/admin/users?page=' + page + '&per_page=100');
    check(Array.isArray(data.users), 'USER_LIST_INVALID');
    for (const user of data.users) {
      if (user.app_metadata?.p2a?.owner !== 'tyosu131/Workout-Journal/P2A') continue;
      const m = validateOwnership(user, user.app_metadata.p2a.runId, now);
      if (m.expires > now || processAlive(m.creator.pid)) continue;
      expired.push({ runId: m.runId, userId: user.id,
        created: m.created, expires: m.expires, target: TARGET });
    }
    if (data.users.length < 100) break;
    check(page < 100, 'STALE_SCAN_LIMIT');
  }
  // Gather before deleting: deleting during offset pagination would skip users.
  for (const receipt of expired) {
    await removeOwnedUser(target, receipt, { stale: true, now });
    removed++;
  }
  // Also recover the crash window after Auth deletion, before residual verification.
  await mkdir(RUNS, { recursive: true, mode: 0o700 });
  for (const name of await readdir(RUNS)) {
    if (!RUN_PATTERN.test(name.slice(0, -5)) || !name.endsWith('.json')) continue;
    const receipt = JSON.parse(await readFile(path.join(RUNS, name), 'utf8'));
    if (!receipt.complete && receipt.expires <= now) {
      await removeOwnedUser(target, receipt, { stale: true, now });
    }
  }
  return removed;
}
export function safeReport(input) {
  validateRunId(input.runId);
  return { runId: input.runId, target: 'isolated',
    suiteSha: /^[0-9a-f]{40}$/.test(input.suiteSha) ? input.suiteSha : 'uncommitted',
    sourceDigest: /^[0-9a-f]{64}$/.test(input.sourceDigest) ? input.sourceDigest : null,
    browser: /^chromium-[\d.]+$/.test(input.browser) ? input.browser : 'chromium',
    steps: STEPS.map(name => {
      const step = input.steps?.find(item => item.name === name);
      return { name, result: ['PASS', 'FAIL'].includes(step?.result) ? step.result : 'NOT_RUN' };
    }),
    cleanup: { authUserRemoved: input.cleanup?.authUserRemoved === true,
      residualRows: Number.isSafeInteger(input.cleanup?.residualRows) ? input.cleanup.residualRows : null },
    result: input.result === 'PASS' && /^[0-9a-f]{64}$/.test(input.sourceDigest) &&
      input.cleanup?.authUserRemoved === true &&
      input.cleanup.residualRows === 0 && STEPS.every(name =>
        input.steps?.some(step => step.name === name && step.result === 'PASS')) ? 'PASS' : 'FAIL'
  };
}
export async function writeEvidence(report, secrets = []) {
  const safe = safeReport(report);
  const json = JSON.stringify(safe, null, 2) + '\n';
  check(secrets.filter(Boolean).every(secret => !json.includes(secret)), 'SECRET_IN_EVIDENCE');
  await mkdir(EVIDENCE, { recursive: true, mode: 0o700 });
  await writeFile(path.join(EVIDENCE, safe.runId + '.json'), json, { mode: 0o600 });
  return safe;
}
