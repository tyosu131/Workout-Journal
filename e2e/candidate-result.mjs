import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import contract from './candidate-result-contract.json' with { type: 'json' };
import { check } from './errors.cjs';
export { contract as RESULT_CONTRACT };
export const TABLES = ['auth', 'users', 'notes', 'user_tags'];
export const unknownCounts = () => Object.fromEntries(TABLES.map(t => [t, null]));
export const cleanupState = counts => TABLES.some(t => Number.isSafeInteger(counts[t]) && counts[t] > 0)
  ? 'RESIDUAL' : TABLES.every(t => counts[t] === 0) ? 'PROVEN_ZERO' : 'UNPROVEN';
const keys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value) &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());

export function resultBinding(m, manifestHash) {
  check(m.e2eIdentityVersion === 2 && /^cd-[1-9][0-9]*-[1-9][0-9]*$/.test(m.candidateId) &&
    m.candidateId === `cd-${m.run.id}-${m.run.attempt}` && /^[a-f0-9]{40}$/.test(m.sourceSha) &&
    /^[a-f0-9]{64}$/.test(manifestHash), 'RESULT_ENVELOPE_INVALID');
  return { version: contract.version, candidateId: m.candidateId, sourceSha: m.sourceSha,
    githubRunId: m.run.id, githubRunAttempt: m.run.attempt, manifestHash };
}

export function initialResult(m, manifestHash) {
  return { ...resultBinding(m, manifestHash), scenario: 'NOT_RUN',
    steps: contract.steps.map(name => ({ name, result: 'NOT_RUN' })), cleanup: unknownCounts(),
    cleanupState: 'UNPROVEN', localReceiptState: 'UNKNOWN', evidenceState: 'UNKNOWN',
    httpsCookieVerified: false, failureCode: null, failureOperation: null,
    recoveryHandle: { type: 'DETERMINISTIC_CANDIDATE_ID', candidateId: m.candidateId } };
}

export function setFailure(result, code) {
  check(Object.hasOwn(contract.failures, code), 'RESULT_ENVELOPE_INVALID');
  result.failureCode = code; result.failureOperation = contract.failures[code];
}

export function validateResult(r, m, manifestHash) {
  const expected = initialResult(m, manifestHash);
  check(keys(r, Object.keys(expected)), 'RESULT_ENVELOPE_INVALID');
  for (const [key, value] of Object.entries(resultBinding(m, manifestHash))) {
    check(r[key] === value, 'RESULT_ENVELOPE_INVALID');
  }
  check(['PASS', 'FAIL', 'NOT_RUN', 'UNKNOWN'].includes(r.scenario) &&
    Array.isArray(r.steps) && r.steps.length === contract.steps.length && r.steps.every((s, i) =>
      keys(s, ['name', 'result']) && s.name === contract.steps[i] && ['PASS', 'FAIL', 'NOT_RUN'].includes(s.result)),
  'RESULT_ENVELOPE_INVALID');
  check(r.scenario !== 'PASS' || r.steps.every(s => s.result === 'PASS'), 'RESULT_ENVELOPE_INVALID');
  check(r.scenario !== 'NOT_RUN' || r.steps.every(s => s.result === 'NOT_RUN'), 'RESULT_ENVELOPE_INVALID');
  check(keys(r.cleanup, TABLES) && TABLES.every(t => r.cleanup[t] === null ||
    Number.isSafeInteger(r.cleanup[t]) && r.cleanup[t] >= 0) && r.cleanupState === cleanupState(r.cleanup),
  'RESULT_ENVELOPE_INVALID');
  check(['UNKNOWN', 'PERSISTED', 'FAILED', 'NOT_REQUIRED'].includes(r.localReceiptState) &&
    ['UNKNOWN', 'PASS', 'FAIL'].includes(r.evidenceState) && typeof r.httpsCookieVerified === 'boolean' &&
    (!r.httpsCookieVerified || r.steps[0].result === 'PASS'), 'RESULT_ENVELOPE_INVALID');
  check(r.failureCode === null ? r.failureOperation === null :
    typeof r.failureCode === 'string' && Object.hasOwn(contract.failures, r.failureCode) && r.failureOperation === contract.failures[r.failureCode],
  'RESULT_ENVELOPE_INVALID');
  check(keys(r.recoveryHandle, ['type', 'candidateId']) &&
    r.recoveryHandle.type === 'DETERMINISTIC_CANDIDATE_ID' && r.recoveryHandle.candidateId === m.candidateId,
  'RESULT_ENVELOPE_INVALID');
  check(Buffer.byteLength(JSON.stringify(r)) <= contract.maxBytes, 'RESULT_ENVELOPE_INVALID');
  return r;
}

export function resultExitCode(r) {
  if (r.cleanupState !== 'PROVEN_ZERO') return 21;
  if (r.localReceiptState === 'FAILED' || r.evidenceState !== 'PASS') return 22;
  if (r.scenario !== 'PASS') return 20;
  return r.failureCode === null && r.httpsCookieVerified ? 0 : 22;
}

export async function writeResult(filename, result, m, manifestHash) {
  validateResult(result, m, manifestHash);
  const file = await open(filename, constants.O_WRONLY | constants.O_NOFOLLOW);
  try {
    const s = await file.stat();
    check(s.isFile() && s.nlink === 1 && s.uid === process.getuid() && (s.mode & 0o777) === 0o600,
      'RESULT_ENVELOPE_INVALID');
    await file.truncate(0);
    await file.writeFile(JSON.stringify(result));
    await file.sync();
  } finally { await file.close(); }
}
