import { createHash } from 'node:crypto';
import { check } from './errors.cjs';

export const REPOSITORY = 'tyosu131/Workout-Journal';
export const IDENTITY_VERSION = 2;
export const URL_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

// RFC 9562 section 5.5, network byte order. A locator, never an authorization secret.
export function uuidV5(namespace, name) {
  check(typeof namespace === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(namespace) &&
    typeof name === 'string', 'UUID_INPUT_INVALID');
  const bytes = createHash('sha1').update(Buffer.from(namespace.replaceAll('-', ''), 'hex'))
    .update(name, 'utf8').digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

export function candidateUuid(repository, candidateId) {
  check(repository === REPOSITORY && typeof candidateId === 'string' && candidateId.length <= 22 &&
    /^cd-[1-9][0-9]{0,19}-[1-9][0-9]{0,3}$/.test(candidateId), 'CANDIDATE_LOCATOR_INVALID');
  return uuidV5(URL_NAMESPACE, `https://github.com/${repository}/candidate-e2e/${candidateId}`);
}

export function ownershipBinding(m) {
  candidateUuid(m.repository, m.candidateId);
  check(m.version === 2 && m.e2eIdentityVersion === IDENTITY_VERSION &&
    /^[a-f0-9]{40}$/.test(m.sourceSha) && m.run?.workflowSha === m.sourceSha &&
    m.candidateId === `cd-${m.run.id}-${m.run.attempt}`, 'RECOVERY_IDENTITY_VERSION_REQUIRED');
  return { repository: REPOSITORY, purpose: 'portfolio-p2b', candidateId: m.candidateId,
    sourceSha: m.sourceSha, githubRunId: m.run.id, githubRunAttempt: m.run.attempt,
    version: IDENTITY_VERSION };
}
