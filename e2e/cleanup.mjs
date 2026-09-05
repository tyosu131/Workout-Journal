import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { localTarget, staleCleanup, removeOwnedUser, validateRunId,
  check, RUNS, SafeError } from './safety.mjs';

try {
  const args = process.argv.slice(2);
  check(args.length === 1 && args[0] === '--stale' ||
    args.length === 2 && args[0] === '--run-id', 'CLEANUP_ARGUMENTS_REQUIRED');
  const target = await localTarget();
  if (args[0] === '--stale') {
    const removed = await staleCleanup(target);
    console.log('P2A stale cleanup PASS; expired owned users removed: ' + removed);
  } else {
    const runId = validateRunId(args[1]);
    const receipt = JSON.parse(await readFile(path.join(RUNS, runId + '.json'), 'utf8'));
    check(receipt.runId === runId, 'RECEIPT_MISMATCH');
    // Authoritative metadata, not a mutable receipt PID, proves the creator is gone.
    // Expiry never overrides a live/ambiguous creator (including PID reuse).
    const result = await removeOwnedUser(target, receipt, { recovery: true });
    console.log('P2A cleanup PASS; Auth removed; residual rows: ' + result.residualRows);
  }
} catch (error) {
  console.error('P2A cleanup FAIL: ' + (error instanceof SafeError ? error.code : 'CLEANUP_UNAVAILABLE'));
  process.exitCode = 1;
}
