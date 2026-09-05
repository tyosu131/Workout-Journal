import { check, SafeError } from './safety.mjs';
import { readCandidateManifest, readPrivateJson } from './candidate-target.mjs';
import { receiptPath, validateReceipt, candidateClient, credentialFromStdin } from './candidate-user.mjs';

try {
  check(process.argv.length === 4 && process.argv[2] === '--run-id', 'EXACT_P2B_RUN_REQUIRED');
  const m = readCandidateManifest();
  const r = readPrivateJson(receiptPath(process.argv[3]));
  check(r.runId === process.argv[3], 'P2B_RECEIPT_MISMATCH');
  validateReceipt(m, r);
  const secret = await credentialFromStdin(m);
  const counts = await candidateClient(m, secret).cleanup(r, true);
  console.log('P2B exact recovery: ' + JSON.stringify(counts));
} catch (error) {
  console.error('P2B recovery stopped: ' + (error instanceof SafeError ? error.code : 'RECOVERY_UNAVAILABLE'));
  process.exitCode = 1;
}
