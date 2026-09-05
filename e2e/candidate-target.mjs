import { readFileSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { check } from './errors.cjs';

export const APPLICATION_SHA = '9b6c3c69543784b3e02e4fd9b45d8e7a4b34300d';
export const PROJECT = 'workout-journal-506909';
export const REGION = 'asia-northeast1';
export const SUPABASE_REF = 'krpnnkcipyeasddzbpma';
export const SUPABASE_URL = 'https://' + SUPABASE_REF + '.supabase.co';
export const MANIFEST_TTL = 15 * 60_000;
const KNOWN = { backend: 'workout-journal-backend-00003-luc', frontend: 'workout-journal-frontend-00003-xar' };
const KNOWN_TAG = 'candidate-0829-923536';
const DIGEST = /^sha256:[a-f0-9]{64}$/;
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const taggedUrl = (part, tag) => 'https://' + tag + '---workout-journal-' + part + '-cpbzb7lqza-an.a.run.app';

export function validateManifest(m, target, now = Date.now()) {
  check(m?.version === 1 && m.project === PROJECT && m.region === REGION &&
    m.sourceSha === APPLICATION_SHA && /^p2b-[a-f0-9]{8}$/.test(m.candidateId) &&
    target === 'candidate:' + m.candidateId, 'CANDIDATE_IDENTITY_UNPROVEN');
  const age = now - Date.parse(m.capturedAt);
  check(Number.isFinite(age) && age >= -60_000 && age <= MANIFEST_TTL, 'MANIFEST_STALE');
  check(m.supabase?.projectRef === SUPABASE_REF && m.supabase.url === SUPABASE_URL,
    'SUPABASE_PROJECT_MISMATCH');
  check(m.build?.status === 'SUCCESS' && m.build.sourceSha === APPLICATION_SHA &&
    /^[a-f0-9-]{36}$/.test(m.build.id) && m.build.serviceAccount ===
    'projects/' + PROJECT + '/serviceAccounts/workout-journal-build@' + PROJECT + '.iam.gserviceaccount.com',
  'BUILD_PROVENANCE_UNPROVEN');
  for (const part of ['backend', 'frontend']) {
    const c = m[part], service = 'workout-journal-' + part;
    check(c?.service === service && c.revision === service + '-' + m.candidateId &&
      c.tag === 'candidate-' + m.candidateId && c.url === taggedUrl(part, c.tag) &&
      c.traffic === 0 && DIGEST.test(c.digest) && m.build.digests?.[part] === c.digest &&
      c.image === REGION + '-docker.pkg.dev/' + PROJECT + '/workout-journal/' + service + '@' + c.digest &&
      c.serviceAccount === service + '-run@' + PROJECT + '.iam.gserviceaccount.com' &&
      c.maxInstances === 2, 'CANDIDATE_REVISION_UNPROVEN');
    check(m.production?.[part]?.revision === KNOWN[part] && m.production[part].traffic === 100,
      'PRODUCTION_TRAFFIC_CHANGED');
    validateTraffic(m.trafficBefore?.[part], part, null);
    validateTraffic(m.trafficCurrent?.[part], part, c);
  }
  check(m.frontend.backendInternalUrl === m.backend.url && m.backend.supabaseUrl === SUPABASE_URL,
    'CANDIDATE_PAIRING_MISMATCH');
  const refs = m.backend.secretRefs;
  check(refs?.SUPABASE_SECRET_KEY?.name === 'workout-journal-supabase-secret-key' &&
    refs.SUPABASE_SECRET_KEY.version === '1' && refs.JWT_SECRET?.name === 'workout-journal-jwt-secret' &&
    refs.JWT_SECRET.version === '2', 'CANDIDATE_SECRET_REF_MISMATCH');
  return m;
}
function validateTraffic(traffic, part, candidate) {
  check(Array.isArray(traffic) && traffic.length === (candidate ? 2 : 1), 'UNEXPECTED_TRAFFIC_ENTRY');
  const old = traffic.filter(t => t.tag === KNOWN_TAG);
  check(old.length === 1 && old[0].revision === KNOWN[part] && old[0].percent === 100 &&
    old[0].url === taggedUrl(part, KNOWN_TAG), 'KNOWN_GOOD_PAIR_CHANGED');
  if (candidate) {
    const next = traffic.filter(t => t.tag === candidate.tag);
    check(next.length === 1 && next[0].revision === candidate.revision && next[0].percent === 0 &&
      next[0].url === candidate.url, 'CANDIDATE_NOT_ZERO_TRAFFIC');
  }
}
export function readPrivateJson(filename, expectedHash) {
  const info = lstatSync(filename);
  check(info.isFile() && !info.isSymbolicLink() && (info.mode & 0o777) === 0o600 &&
    info.uid === process.getuid() && info.size <= 64 * 1024, 'PRIVATE_FILE_UNPROVEN');
  const bytes = readFileSync(filename);
  if (expectedHash !== undefined) check(/^[a-f0-9]{64}$/.test(expectedHash) &&
    sha256(bytes) === expectedHash, 'MANIFEST_HASH_MISMATCH');
  return JSON.parse(bytes.toString('utf8'));
}
export function readCandidateManifest(env = process.env) {
  check(env.E2E_TARGET_MANIFEST && env.E2E_MANIFEST_SHA256, 'MANIFEST_REQUIRED');
  return validateManifest(readPrivateJson(env.E2E_TARGET_MANIFEST, env.E2E_MANIFEST_SHA256), env.E2E_TARGET);
}
export function candidateIdentity(m) {
  // Capture-time refresh for recovery does not broaden the approved pair/run.
  return sha256(JSON.stringify([m.project, m.region, m.sourceSha, m.candidateId,
    m.backend, m.frontend, m.production, m.supabase, m.build]));
}
export function browserBase(env = process.env) {
  if (env.E2E_TARGET?.startsWith('candidate:')) {
    const m = readCandidateManifest(env);
    check(!env.E2E_VERIFY_FAILURE && env.E2E_BROWSER_BASE_URL === m.frontend.url,
      'CANDIDATE_BROWSER_INPUT_REFUSED');
    return m.frontend.url;
  }
  check(env.E2E_BROWSER_BASE_URL === 'http://127.0.0.1:3100', 'CONTROLLER_REQUIRED');
  return env.E2E_BROWSER_BASE_URL;
}
export function operationalIdentity(m) {
  const pair = part => {
    const c = m[part];
    return { service: c.service, revision: c.revision, tag: c.tag, url: c.url,
      digest: c.digest, traffic: c.traffic };
  };
  return { project: PROJECT, region: REGION, sourceSha: APPLICATION_SHA, candidateId: m.candidateId,
    backend: pair('backend'), frontend: pair('frontend'), backendInternalUrl: m.frontend.backendInternalUrl };
}
