import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, RUNS, EVIDENCE, localTarget, staleCleanup, createUser,
  removeOwnedUser, cleanEnv, quietExec, writeEvidence, check, SafeError } from './safety.mjs';
import { prepareApp, startApp, assertSafeOutputs, sourceDigest, BASE, WORK } from './local-app.mjs';

let user, runtime, reportDir, ownsLock = false;
let result = 'FAIL';
let cleanup;
let browser = 'chromium';
let steps = [];
let suiteSha = 'uncommitted';
let digest;
let target;
const jwt = 'P2A_JWT_MARKER_' + randomBytes(32).toString('hex');
const canary = 'P2A_ARTIFACT_MARKER_' + randomBytes(24).toString('hex');
const lock = path.join(RUNS, 'active.json');
const abort = new AbortController();
const onSignal = () => abort.abort();
process.once('SIGTERM', onSignal);
process.once('SIGINT', onSignal);

try {
  const faultModes = { '--verify-failure': 'step', '--verify-framework-error': 'framework',
    '--verify-timeout': 'timeout' };
  check(process.argv.length === 2 ||
    process.argv.length === 3 && Object.hasOwn(faultModes, process.argv[2]), 'UNKNOWN_ARGUMENTS');
  target = await localTarget();
  await mkdir(RUNS, { recursive: true, mode: 0o700 });
  try {
    const previous = JSON.parse(await readFile(lock, 'utf8'));
    check(Number.isSafeInteger(previous.pid) && previous.pid > 0, 'INVALID_LOCK');
    let alive = true;
    try { process.kill(previous.pid, 0); } catch (error) { alive = error.code !== 'ESRCH'; }
    check(!alive, 'RUN_ALREADY_ACTIVE');
    await unlink(lock);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeFile(lock, JSON.stringify({ pid: process.pid }), { flag: 'wx', mode: 0o600 });
  ownsLock = true;
  await staleCleanup(target);
  suiteSha = (await quietExec('git', ['rev-parse', 'HEAD'])).trim();
  digest = await sourceDigest();
  console.log('P2A target verified: isolated/local. Building dotenv-free source copy.');
  const app = await prepareApp(target, jwt);
  check(!abort.signal.aborted, 'RUN_CANCELLED');
  runtime = await startApp(app);
  user = await createUser(target);
  reportDir = path.join(WORK, 'report-' + user.runId);
  await mkdir(reportDir, { mode: 0o700 });
  const reportFile = path.join(reportDir, 'browser.json');
  console.log('P2A Chromium scenario started: ' + user.runId);
  try {
    await quietExec(process.execPath, [path.join(ROOT, 'node_modules/playwright/cli.js'),
      'test', '--config', 'e2e/playwright.config.ts'],
    { timeout: 270_000, signal: abort.signal, env: cleanEnv({
      E2E_BROWSER_BASE_URL: BASE, E2E_BROWSER_REPORT: reportFile,
      E2E_PW_OUTPUT: path.join(reportDir, 'playwright'),
      E2E_USER_ID: user.userId, E2E_USER_EMAIL: user.email, E2E_USER_PASSWORD: user.password,
      E2E_RUN_ID: user.runId, E2E_ARTIFACT_CANARY: canary,
      E2E_VERIFY_FAILURE: faultModes[process.argv[2]] || '',
      PLAYWRIGHT_NO_COPY_PROMPT: '1',
    }) });
    result = 'PASS';
  } finally {
    try {
      const data = JSON.parse(await readFile(reportFile, 'utf8'));
      steps = data.steps;
      browser = data.browser;
    } catch { result = 'FAIL'; }
  }
} catch (error) {
  result = 'FAIL';
  console.error('P2A stopped: ' + (error instanceof SafeError ? error.code : 'CONTROLLER_FAILED'));
} finally {
  // Lifecycle belongs to this supervisor, not to a browser afterAll hook.
  if (user) {
    try { cleanup = await removeOwnedUser(target, user.receipt); }
    catch {
      result = 'FAIL';
      try {
        cleanup = JSON.parse(await readFile(path.join(RUNS, user.runId + '.json'), 'utf8')).cleanup;
      } catch { /* missing cleanup proof is a failure */ }
      console.error('P2A cleanup FAIL; inspect the private receipt counts; do not delete residuals.');
    }
  }
  if (runtime) await runtime.stop();
  if (ownsLock) await unlink(lock);
}
if (user) {
  const secrets = [user.password, jwt, canary, target.secret];
  try {
    if (reportDir) await assertSafeOutputs(reportDir, secrets);
    check(digest === await sourceDigest(), 'SOURCE_CHANGED_DURING_RUN');
    const safe = await writeEvidence({ runId: user.runId, suiteSha, sourceDigest: digest,
      browser, steps, cleanup, result }, secrets);
    await assertSafeOutputs(EVIDENCE, secrets);
    for (const step of safe.steps) console.log(step.name + ': ' + step.result);
    console.log('cleanup residual rows: ' + safe.cleanup.residualRows);
    console.log('secret-marker inspection: PASS');
    console.log('P2A result: ' + safe.result);
    result = safe.result;
  } catch {
    result = 'FAIL';
    console.error('P2A evidence rejected: output safety validation failed.');
  }
}
process.exitCode = result === 'PASS' ? 0 : 1;
