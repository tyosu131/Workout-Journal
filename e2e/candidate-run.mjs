import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, EVIDENCE, STEPS, quietExec, cleanEnv, check, SafeError } from './safety.mjs';
import { readCandidateManifest, readPrivateJson, operationalIdentity } from './candidate-target.mjs';
import { newCandidateUser, saveCandidateReceipt, candidateClient, credentialFromStdin,
  P2B_RUNS, receiptPath, validateResume } from './candidate-user.mjs';
import { WORK, sourceDigest, assertSafeOutputs } from './local-app.mjs';
import { candidateExitCode } from './release-contract.mjs';

let m, secret, client, user, cleanup, reportDir, runnerDigest;
let steps = [], browser = 'chromium', passed = false;
let cleanupFailed = false, evidenceFailed = false;
const canary = 'P2B_ARTIFACT_MARKER_' + randomBytes(24).toString('hex');
const abort = new AbortController();
process.once('SIGTERM', () => abort.abort());
process.once('SIGINT', () => abort.abort());
try {
  check(process.argv.length === 2 && process.versions.node.split('.')[0] === '24', 'P2B_INPUT_REFUSED');
  m = readCandidateManifest(); // Before reading the credential pipe.
  await quietExec('git', ['diff', '--exit-code', m.sourceSha, '--', 'frontend', 'backend', 'shared', 'cloudbuild.yaml']);
  if (m.version === 2) {
    check((await quietExec('git', ['rev-parse', 'HEAD'])).trim() === m.sourceSha, 'CD_CHECKOUT_MISMATCH');
    await quietExec('git', ['diff', '--exit-code', 'HEAD', '--']);
    check(!process.env.E2E_RESUME_AFTER_RUN, 'CD_AUTOMATIC_RESUME_FORBIDDEN');
  }
  runnerDigest = await sourceDigest();
  // Bounded readiness; no fixed sleep, no authenticated writes or test retry.
  let ready = false;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline && !abort.signal.aborted) {
    try {
      const options = { redirect: 'error', signal: AbortSignal.timeout(10_000) };
      const front = await fetch(m.frontend.url + '/login', options);
      const back = await fetch(m.backend.url + '/', options);
      const session = await fetch(m.frontend.url + '/api/auth/session', options);
      if (front.status === 200 && back.status === 404 && session.status === 401 &&
        (await session.json()).error === 'Authorization token missing') { ready = true; break; }
    } catch { /* cold start, bounded independently from test retries */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  check(ready, 'P2B_READINESS_FAILED');
  secret = await credentialFromStdin(m);
  client = candidateClient(m, secret);
  await mkdir(P2B_RUNS, { recursive: true, mode: 0o700 });
  const attemptFile = path.join(P2B_RUNS, m.candidateId + '-attempt.json');
  const resumeAfterRun = process.env.E2E_RESUME_AFTER_RUN;
  let claimFile = attemptFile;
  if (resumeAfterRun) {
    // Only after a separate Human authorization. Preserve the original attempt;
    // neither deletion of its marker nor an automatic retry is permitted.
    const previous = readPrivateJson(receiptPath(resumeAfterRun));
    validateResume(m, readPrivateJson(attemptFile), previous, resumeAfterRun);
    await client.cleanup(previous, true); // Fresh exact-UUID residual proof before any new user.
    claimFile = path.join(P2B_RUNS, m.candidateId + '-resume-after-' + resumeAfterRun + '.json');
  }
  check(!abort.signal.aborted, 'P2B_CANCELLED');
  const proposed = newCandidateUser(m);
  // One attempt per explicit authorization. A repeated resume hits EEXIST.
  await writeFile(claimFile, JSON.stringify({ runId: proposed.receipt.runId,
    candidateId: m.candidateId, ...(resumeAfterRun ? { resumeAfterRun } : {}) }),
  { mode: 0o600, flag: 'wx' });
  user = proposed;
  await saveCandidateReceipt(user.receipt); // Preallocate UUID before the create request/crash window.
  await client.create(user.receipt, user.password);
  user.receipt.created = true;
  await saveCandidateReceipt(user.receipt);
  reportDir = path.join(WORK, 'report-' + user.receipt.runId);
  await mkdir(reportDir, { recursive: true, mode: 0o700 });
  const reportFile = path.join(reportDir, 'browser.json');
  console.log('P2B exact candidate scenario started: ' + user.receipt.runId);
  try {
    await quietExec(process.execPath, [path.join(ROOT, 'node_modules/playwright/cli.js'),
      'test', '--config', 'e2e/playwright.config.ts'], { timeout: 270_000, signal: abort.signal,
      env: cleanEnv({ ...Object.fromEntries(['GITHUB_ACTIONS', 'GITHUB_REPOSITORY', 'GITHUB_REF',
        'GITHUB_SHA', 'GITHUB_WORKFLOW_SHA', 'GITHUB_WORKFLOW_REF', 'GITHUB_EVENT_NAME',
        'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT'].filter(k => process.env[k]).map(k => [k, process.env[k]])),
        E2E_TARGET: process.env.E2E_TARGET,
        E2E_TARGET_MANIFEST: process.env.E2E_TARGET_MANIFEST,
        E2E_MANIFEST_SHA256: process.env.E2E_MANIFEST_SHA256,
        E2E_BROWSER_BASE_URL: m.frontend.url, E2E_BROWSER_REPORT: reportFile,
        E2E_PW_OUTPUT: path.join(reportDir, 'playwright'), E2E_USER_ID: user.receipt.userId,
        E2E_USER_EMAIL: user.receipt.email, E2E_USER_PASSWORD: user.password,
        E2E_RUN_ID: user.receipt.runId, E2E_ARTIFACT_CANARY: canary,
        PLAYWRIGHT_NO_COPY_PROMPT: '1' }) });
    passed = true;
  } finally {
    try { const data = JSON.parse(await readFile(reportFile, 'utf8')); steps = data.steps; browser = data.browser; }
    catch { passed = false; }
  }
} catch (error) {
  passed = false;
  console.error('P2B stopped: ' + (error instanceof SafeError ? error.code : 'CANDIDATE_CONTROLLER_FAILED'));
} finally {
  if (user && client) {
    try { cleanup = await client.cleanup(user.receipt); }
    catch {
      passed = false;
      cleanupFailed = true;
      try { cleanup = JSON.parse(await readFile(receiptPath(user.receipt.runId), 'utf8')).cleanup; } catch { /* absent proof fails */ }
      console.error('P2B exact cleanup not proven; HUMAN_DECISION_REQUIRED. No SQL/list-user fallback.');
    }
  }
}
if (user) {
  try {
    const forbidden = [secret, user.password, user.receipt.email, user.receipt.userId, canary];
    if (reportDir) await assertSafeOutputs(reportDir, forbidden);
    check(runnerDigest === await sourceDigest(), 'RUNNER_CHANGED_DURING_P2B');
    const safeSteps = STEPS.map(name => ({ name,
      result: ['PASS', 'FAIL'].includes(steps.find(s => s.name === name)?.result) ?
        steps.find(s => s.name === name).result : 'NOT_RUN' }));
    const counts = Object.fromEntries(['auth', 'users', 'notes', 'user_tags'].map(table => [table,
      Number.isSafeInteger(cleanup?.[table]) ? cleanup[table] : null]));
    passed = passed && safeSteps.every(s => s.result === 'PASS') && Object.values(counts).every(n => n === 0);
    const report = { version: 1, runId: user.receipt.runId, ...operationalIdentity(m),
      runnerDigest, browser: /^chromium-[\d.]+$/.test(browser) ? browser : 'chromium',
      steps: safeSteps, httpsCookieVerified: safeSteps[0].result === 'PASS', cleanup: counts,
      secretLeakCheck: 'PASS', trafficBefore: m.trafficBefore,
      result: passed ? 'PENDING_TRAFFIC_VERIFICATION' : 'FAIL' };
    const json = JSON.stringify(report, null, 2) + '\n';
    check(forbidden.every(value => !value || !json.includes(value)), 'P2B_SECRET_IN_REPORT');
    await mkdir(EVIDENCE, { recursive: true, mode: 0o700 });
    await writeFile(path.join(EVIDENCE, user.receipt.runId + '.json'), json, { mode: 0o600, flag: 'wx' });
    await assertSafeOutputs(EVIDENCE, forbidden);
    for (const s of safeSteps) console.log(s.name + ': ' + s.result);
    console.log('P2B cleanup: ' + JSON.stringify(counts));
    console.log('P2B secret-leak check: PASS');
    console.log('P2B scenario: ' + report.result);
  } catch { passed = false; evidenceFailed = true; console.error('P2B evidence rejected; HUMAN_DECISION_REQUIRED.'); }
}
secret = undefined; // Process-private only; no temporary credential file exists.
process.exitCode = m?.version === 2 ? candidateExitCode({ passed, cleanupRequired: Boolean(user),
  cleanup, cleanupFailed, evidenceFailed }) : passed ? 0 : 1;
