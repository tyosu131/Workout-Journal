// CD-C1: public, hash-bound release metadata; never a credential transport.
import { check } from './errors.cjs';

export const REPOSITORY = 'tyosu131/Workout-Journal';
export const CALLER = REPOSITORY + '/.github/workflows/cd.yml@refs/heads/main';
export const CALLED = REPOSITORY + '/.github/workflows/candidate-e2e.yml@refs/heads/main';
export const E2E_SECRET = 'workout-journal-e2e-supabase-secret-key';
export const RELEASE_TTL = 60 * 60_000;

// Fixed process status only; never forward child diagnostics to the CD runner.
export function candidateExitCode({ passed, cleanupRequired, cleanup, cleanupFailed, evidenceFailed }) {
  if (cleanupRequired && (cleanupFailed ||
    !['auth', 'users', 'notes', 'user_tags'].every(table => cleanup?.[table] === 0))) return 21;
  if (evidenceFailed) return 22;
  return passed ? 0 : 20;
}

const SHA = /^[a-f0-9]{40}$/, DIGEST = /^sha256:[a-f0-9]{64}$/;
const PROJECT = 'workout-journal-506909', REGION = 'asia-northeast1';
const SUPABASE_REF = 'krpnnkcipyeasddzbpma';
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const decimal = value => typeof value === 'string' && /^[1-9][0-9]{0,19}$/.test(value);
const runUrl = value => typeof value === 'string' &&
  /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.run\.app$/.test(value) &&
  new URL(value).hostname.split('.').every(label => label.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));

export function serving(traffic, service) {
  check(Array.isArray(traffic) && traffic.length > 0 && traffic.length <= 32, 'TRAFFIC_INVALID');
  const tags = new Set();
  for (const t of traffic) {
    check(typeof t.revision === 'string' && t.revision.startsWith(service + '-') &&
      /^[a-z0-9-]{1,63}$/.test(t.revision) && Number.isInteger(t.percent) &&
      [0, 100].includes(t.percent), 'TRAFFIC_INVALID');
    check(typeof t.tag === 'string' && (t.tag === '' || /^[a-z][a-z0-9-]{0,62}$/.test(t.tag)), 'TAG_INVALID');
    if (t.tag) {
      check(!tags.has(t.tag) && runUrl(t.url) &&
        t.url.startsWith('https://' + t.tag + '---'), 'TAG_INVALID');
      tags.add(t.tag);
    } else check(t.url === '', 'UNTAGGED_URL_INVALID');
  }
  const active = traffic.filter(t => t.percent === 100);
  check(active.length === 1, 'SPLIT_PRODUCTION_UNSUPPORTED');
  return active[0].revision;
}

export function validateReleaseManifest(m, target, now = Date.now()) {
  check(m?.version === 2 && m.repository === REPOSITORY && m.project === PROJECT &&
    m.region === REGION && SHA.test(m.sourceSha), 'RELEASE_IDENTITY_INVALID');
  const r = m.run;
  check(decimal(r?.id) && decimal(r.attempt) && r.attempt.length <= 4 &&
    r.event === 'workflow_dispatch' && r.workflowRef === CALLER &&
    r.workflowSha === m.sourceSha && r.repositoryId === '790375516' &&
    r.ownerId === '95160728' && decimal(r.ciRunId), 'RELEASE_WORKFLOW_INVALID');
  check(m.candidateId === 'cd-' + r.id + '-' + r.attempt && target === 'candidate:' + m.candidateId,
    'CANDIDATE_IDENTITY_UNPROVEN');
  check(m.candidateId.length <= 22, 'CANDIDATE_TAG_TOO_LONG');
  const age = now - Date.parse(m.capturedAt);
  check(m.ttlMs === RELEASE_TTL && Number.isFinite(age) && age >= -60_000 &&
    age <= RELEASE_TTL, 'MANIFEST_STALE');
  check(m.supabase?.projectRef === SUPABASE_REF &&
    m.supabase.url === 'https://' + SUPABASE_REF + '.supabase.co', 'SUPABASE_PROJECT_MISMATCH');
  check(m.e2eSecret?.project === PROJECT && m.e2eSecret.name === E2E_SECRET &&
    decimal(m.e2eSecret.version), 'E2E_SECRET_REFERENCE_INVALID');
  check(m.build?.status === 'SUCCESS' && m.build.sourceSha === m.sourceSha &&
    /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(m.build.id) &&
    m.build.serviceAccount === 'projects/' + PROJECT + '/serviceAccounts/workout-journal-build@' +
      PROJECT + '.iam.gserviceaccount.com', 'BUILD_PROVENANCE_UNPROVEN');
  for (const part of ['backend', 'frontend']) {
    const c = m[part], service = 'workout-journal-' + part, p = m.production?.[part];
    check(c?.service === service && c.revision === service + '-' + m.candidateId &&
      c.tag === m.candidateId && c.traffic === 0 && DIGEST.test(c.digest) &&
      c.digest === m.build.digests?.[part] &&
      c.image === REGION + '-docker.pkg.dev/' + PROJECT + '/workout-journal/' + service + '@' + c.digest &&
      c.serviceAccount === service + '-run@' + PROJECT + '.iam.gserviceaccount.com' &&
      c.maxInstances === 2 && hash(c.configHash) && hash(c.policyHash), 'CANDIDATE_REVISION_UNPROVEN');
    check(p?.traffic === 100 && p.revision === serving(m.trafficBefore?.[part], service) &&
      p.revision === serving(m.trafficCurrent?.[part], service) &&
      p.revision !== c.revision && DIGEST.test(p.digest) && hash(p.configHash) && runUrl(p.url),
    'PRODUCTION_TRAFFIC_CHANGED');
    const current = m.trafficCurrent[part], before = m.trafficBefore[part];
    const next = current.filter(t => t.tag === c.tag);
    check(next.length === 1 && next[0].revision === c.revision && next[0].percent === 0 &&
      next[0].url === c.url && current.filter(t => t.revision === c.revision).every(t => t.percent === 0),
    'CANDIDATE_NOT_ZERO_TRAFFIC');
    check(!before.some(t => t.tag === c.tag || t.revision === c.revision) &&
      JSON.stringify(current.filter(t => t.tag !== c.tag)) === JSON.stringify(before),
    'RETAINED_TRAFFIC_CHANGED');
  }
  check(m.frontend.backendInternalUrl === m.backend.url && m.backend.supabaseUrl === m.supabase.url,
    'CANDIDATE_PAIRING_MISMATCH');
  check(m.trafficBefore.backend.some(t => t.url === m.production.frontend.backendInternalUrl &&
    t.revision === m.production.backend.revision && t.tag), 'PREVIOUS_PAIR_UNPROVEN');
  for (const [variable, name] of [['SUPABASE_SECRET_KEY', 'workout-journal-supabase-secret-key'],
    ['JWT_SECRET', 'workout-journal-jwt-secret']]) {
    const ref = m.backend.secretRefs?.[variable];
    check(ref?.name === name && decimal(ref.version), 'CANDIDATE_SECRET_REF_MISMATCH');
  }
  return m;
}

export function bindWorkflow(m, env) {
  validateReleaseManifest(m, 'candidate:' + m.candidateId);
  check(env.GITHUB_REPOSITORY === REPOSITORY && env.GITHUB_REF === 'refs/heads/main' &&
    env.GITHUB_SHA === m.sourceSha && env.GITHUB_WORKFLOW_SHA === m.sourceSha &&
    env.GITHUB_WORKFLOW_REF === CALLER && env.GITHUB_EVENT_NAME === 'workflow_dispatch' &&
    env.GITHUB_RUN_ID === m.run.id && env.GITHUB_RUN_ATTEMPT === m.run.attempt,
  'EXECUTION_IDENTITY_MISMATCH');
}
