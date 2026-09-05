import { check, STEPS } from './safety.mjs';
import { validateManifest, APPLICATION_SHA, REGION, PROJECT, SUPABASE_REF, SUPABASE_URL,
  operationalIdentity, candidateIdentity } from './candidate-target.mjs';

const traffic = rows => rows.map(t => ({ revision: t.revisionName, tag: t.tag,
  percent: t.percent || 0, url: t.url })).sort((a, b) => a.tag.localeCompare(b.tag));
export function manifestFromReadback(pre, current, build, candidateId) {
  const m = { version: 1, project: PROJECT, region: REGION, sourceSha: APPLICATION_SHA,
    candidateId, capturedAt: new Date().toISOString(), build,
    supabase: { projectRef: SUPABASE_REF, url: SUPABASE_URL }, production: {},
    trafficBefore: {}, trafficCurrent: {} };
  for (const part of ['backend', 'frontend']) {
    const { service, revision, productionRevision } = current[part];
    const prior = pre.services[part];
    check(service.metadata.name === prior.service && service.metadata.namespace === pre.projectNumber &&
      service.metadata.labels['cloud.googleapis.com/location'] === REGION &&
      service.status.latestReadyRevisionName === revision.metadata.name &&
      service.spec.template.metadata.name === revision.metadata.name &&
      service.status.conditions.some(c => c.type === 'Ready' && c.status === 'True') &&
      String(service.status.observedGeneration) === String(service.metadata.generation),
    'CLOUD_RUN_READBACK_NOT_READY');
    for (const key of ['run.googleapis.com/ingress', 'run.googleapis.com/invoker-iam-disabled', 'run.googleapis.com/maxScale']) {
      check(service.metadata.annotations[key] === prior.serviceAnnotations[key], 'SERVICE_POLICY_CHANGED');
    }
    check(productionRevision.metadata.name === prior.productionRevision &&
      productionRevision.status.imageDigest === prior.imageDigest, 'KNOWN_GOOD_REVISION_CHANGED');
    const normalizedSpec = input => {
      const spec = structuredClone(input);
      check(spec.containers.length === 1, 'MULTI_CONTAINER_NOT_APPROVED');
      spec.containers[0].image = '[APPROVED IMAGE]';
      if (part === 'frontend') {
        const pair = spec.containers[0].env.find(e => e.name === 'BACKEND_INTERNAL_URL');
        check(pair?.value, 'BACKEND_PAIR_MISSING'); pair.value = '[APPROVED PAIR]';
      }
      return spec;
    };
    check(JSON.stringify(normalizedSpec(revision.spec)) === JSON.stringify(normalizedSpec(productionRevision.spec)),
      'RUNTIME_CONFIGURATION_CHANGED');
    const env = revision.spec.containers[0].env;
    const tag = 'candidate-' + candidateId;
    const tagged = service.status.traffic.filter(t => t.tag === tag);
    check(tagged.length === 1 && tagged[0].revisionName === revision.metadata.name, 'TAG_REVISION_MISMATCH');
    const c = { service: service.metadata.name, revision: revision.metadata.name, tag,
      url: tagged[0].url, digest: build.digests[part], image: revision.status.imageDigest,
      traffic: service.status.traffic.filter(t => t.revisionName === revision.metadata.name)
        .reduce((sum, t) => sum + (t.percent || 0), 0),
      serviceAccount: revision.spec.serviceAccountName,
      maxInstances: Number(revision.metadata.annotations['autoscaling.knative.dev/maxScale']) };
    check(revision.spec.containers[0].image === c.image, 'IMAGE_READBACK_MISMATCH');
    if (part === 'backend') {
      c.supabaseUrl = env.find(e => e.name === 'SUPABASE_URL')?.value;
      c.secretRefs = Object.fromEntries(['SUPABASE_SECRET_KEY', 'JWT_SECRET'].map(name => {
        const ref = env.find(e => e.name === name)?.valueFrom?.secretKeyRef;
        return [name, { name: ref?.name, version: ref?.key }];
      }));
    } else {
      c.backendInternalUrl = env.find(e => e.name === 'BACKEND_INTERNAL_URL')?.value;
      check(productionRevision.spec.containers[0].env.find(e => e.name === 'BACKEND_INTERNAL_URL')?.value ===
        pre.services.backend.traffic[0].url, 'KNOWN_GOOD_PAIRING_CHANGED');
    }
    m[part] = c;
    m.production[part] = { revision: prior.productionRevision,
      traffic: service.status.traffic.filter(t => t.revisionName === prior.productionRevision)
        .reduce((sum, t) => sum + (t.percent || 0), 0) };
    m.trafficBefore[part] = traffic(prior.traffic);
    m.trafficCurrent[part] = traffic(service.status.traffic);
  }
  return validateManifest(m, 'candidate:' + candidateId);
}
export function finalizeCandidateEvidence(before, after, input) {
  validateManifest(after, 'candidate:' + before.candidateId);
  check(candidateIdentity(before) === candidateIdentity(after), 'CANDIDATE_CHANGED_DURING_SMOKE');
  check(input.result === 'PENDING_TRAFFIC_VERIFICATION' &&
    /^p2b-\d{13}-[a-f0-9]{16}$/.test(input.runId) && /^[a-f0-9]{64}$/.test(input.runnerDigest) &&
    /^chromium-[\d.]+$/.test(input.browser) && input.httpsCookieVerified === true &&
    input.secretLeakCheck === 'PASS' &&
    ['auth', 'users', 'notes', 'user_tags'].every(table => input.cleanup?.[table] === 0) &&
    STEPS.every(name => input.steps?.some(s => s.name === name && s.result === 'PASS')),
  'P2B_COMPLETION_EVIDENCE_INCOMPLETE');
  const identity = operationalIdentity(before);
  check(Object.entries(identity).every(([key, value]) => JSON.stringify(input[key]) === JSON.stringify(value)),
    'RUN_EVIDENCE_TARGET_MISMATCH');
  return { version: 1, runId: input.runId, ...identity, runnerDigest: input.runnerDigest,
    browser: input.browser, steps: STEPS.map(name => ({ name, result: 'PASS' })),
    httpsCookieVerified: true, cleanup: { auth: 0, users: 0, notes: 0, user_tags: 0 },
    secretLeakCheck: 'PASS', trafficBefore: before.trafficBefore, trafficAfter: after.trafficCurrent,
    trafficVerifiedAt: after.capturedAt, result: 'PASS' };
}
