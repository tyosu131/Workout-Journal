import { validateReleaseManifest } from './release-contract.mjs';
try {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 64 * 1024) throw new Error();
  }
  const m = JSON.parse(input);
  validateReleaseManifest(m, 'candidate:' + m.candidateId);
} catch { console.error('RELEASE_MANIFEST_REJECTED'); process.exitCode = 1; }
