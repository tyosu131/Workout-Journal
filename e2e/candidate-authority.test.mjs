// Execute the real two-hop environment boundary. All hosted I/O is stubbed;
// Playwright --list loads the real config without running a browser or scenario.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { manifest } from './release-fixture.mjs';
import { browserBase, sha256 } from './candidate-target.mjs';
import { cleanEnv, ROOT } from './safety.mjs';

const CD_FIELDS = ['CD_MODE', 'CD_SOURCE_SHA', 'CD_CI_RUN_ID', 'CD_CI_RUN_ATTEMPT', 'E2E_SECRET_VERSION'];
const AUTHORITY = ['GITHUB_REPOSITORY', 'GITHUB_REF', 'GITHUB_SHA', 'GITHUB_WORKFLOW_SHA',
  'GITHUB_WORKFLOW_REF', 'GITHUB_EVENT_NAME', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', ...CD_FIELDS];
const PRIVATE = Object.fromEntries(['GH_TOKEN', 'GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_GHA_CREDS_PATH',
  'CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE', 'CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT',
  'Authorization', 'SUPABASE_SECRET_KEY', 'E2E_SECRET_VALUE'].map(k => [k, 'OFFLINE_PRIVATE_' + k]));
const controllerFile = path.join(ROOT, 'e2e/candidate-run.mjs');
const url = name => pathToFileURL(path.join(ROOT, 'e2e', name)).href;

async function launch(t, event, source) {
  const temp = await mkdtemp(path.join(tmpdir(), 'c4c-two-hop-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const m = manifest(); m.run.event = event;
  if (event === 'workflow_run') m.e2eSecret.version = '1';
  const file = path.join(temp, 'manifest.json'), resultFile = path.join(temp, 'result.json');
  const bytes = JSON.stringify(m), hash = sha256(bytes);
  await writeFile(file, bytes, { mode: 0o600 });
  await writeFile(resultFile, '', { mode: 0o600 });
  const repository = { id: 790375516, full_name: m.repository, owner: { id: 95160728 } };
  const eventFile = path.join(temp, 'event.json');
  const payload = event === 'workflow_run' ? { action: 'completed', repository, workflow_run: {
    id: Number(m.run.ciRunId), run_attempt: Number(m.run.ciRunAttempt), name: 'CI', workflow_id: 286209592,
    path: '.github/workflows/ci.yml', event: 'push', status: 'completed', conclusion: 'success',
    head_sha: m.sourceSha, head_branch: 'main', head_repository: repository } } : {
    repository, inputs: { mode: 'release', e2e_secret_version: m.e2eSecret.version } };
  await writeFile(eventFile, JSON.stringify(payload));
  const env = { PATH: process.env.PATH, GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: m.repository,
    GITHUB_REPOSITORY_ID: '790375516', GITHUB_REPOSITORY_OWNER_ID: '95160728', GITHUB_REF: 'refs/heads/main',
    GITHUB_SHA: m.sourceSha, GITHUB_WORKFLOW_SHA: m.sourceSha, GITHUB_WORKFLOW_REF: m.run.workflowRef,
    GITHUB_EVENT_NAME: event, GITHUB_EVENT_PATH: eventFile, GITHUB_RUN_ID: m.run.id,
    GITHUB_RUN_ATTEMPT: m.run.attempt, CD_MODE: event === 'workflow_run' ? 'automatic-release' : 'manual-release',
    CD_SOURCE_SHA: m.sourceSha, CD_CI_RUN_ID: m.run.ciRunId, CD_CI_RUN_ATTEMPT: m.run.ciRunAttempt,
    E2E_SECRET_VERSION: m.e2eSecret.version, CD_C1_ACTIVATION: 'approved', CD_MANIFEST_HASH: hash, ...PRIVATE };
  // First hop is the actual Python selector, not a second copy of its allowlist.
  const parent = JSON.parse(execFileSync('python3', ['-B', '-c', `
import json,sys
from candidate_e2e import child_environment
d=json.load(sys.stdin)
print(json.dumps(child_environment(d['env'],d['m'],d['file'],d['result'])))
`], { encoding: 'utf8', env: cleanEnv({ PYTHONDONTWRITEBYTECODE: '1',
    PYTHONPATH: path.join(ROOT, '.github/scripts') }), input: JSON.stringify({ env, m, file, result: resultFile }) }));
  for (const key of AUTHORITY) assert.equal(parent[key], env[key], 'Python hop: ' + key);
  for (const key of Object.keys(PRIVATE)) assert.equal(parent[key], undefined);
  const captured = path.join(temp, 'playwright-env.json');
  const stub = `
import { writeFile } from 'node:fs/promises';
import { browserBase } from ${JSON.stringify(url('candidate-target.mjs'))};
export { readCandidateManifest, readPrivateJson, operationalIdentity } from ${JSON.stringify(url('candidate-target.mjs'))};
export { newCandidateUser, validateResume } from ${JSON.stringify(url('candidate-user.mjs'))};
export { cleanEnv, STEPS, check, SafeError } from ${JSON.stringify(url('safety.mjs'))};
import { STEPS } from ${JSON.stringify(url('safety.mjs'))};
const m=${JSON.stringify(m)}, temp=${JSON.stringify(temp)};
export const ROOT=${JSON.stringify(ROOT)}, EVIDENCE=temp, WORK=temp, P2B_RUNS=temp;
export const receiptPath=()=>temp+'/receipt', saveCandidateReceipt=async()=>{};
export const credentialFromStdin=async()=> 'OFFLINE_ADMIN_ONLY';
export const candidateClient=()=>({create:async r=>{r.createAttempted=true;},cleanup:async()=>({counts:{auth:0,users:0,notes:0,user_tags:0},state:'PROVEN_ZERO',localReceiptState:'PERSISTED'})});
export const sourceDigest=async()=> 'unchanged', assertSafeOutputs=async()=>{};
export const quietExec=async(command,args,options)=>{
 if(command==='git') return args[0]==='rev-parse'?m.sourceSha:'';
 if(command!==process.execPath || args[0]!==ROOT+'/node_modules/playwright/cli.js') throw Error('UNEXPECTED_LAUNCH');
 await writeFile(${JSON.stringify(captured)},JSON.stringify(options.env));
 browserBase(options.env); // Same real authority entrypoint as Playwright config.
 await writeFile(options.env.E2E_BROWSER_REPORT,JSON.stringify({steps:STEPS.map(name=>({name,result:'PASS'})),browser:'chromium'}));
};
globalThis.fetch=async(raw)=>{
 const u=new URL(raw);
 if(u.origin===new URL(m.frontend.url).origin) return u.pathname==='/login'?new Response('',{status:200}):Response.json({error:'Authorization token missing'},{status:401});
 if(u.origin===new URL(m.backend.url).origin) return new Response('',{status:404});
 throw Error('NETWORK_FORBIDDEN');
};
`;
  const stubFile = path.join(temp, 'adapters.mjs'); await writeFile(stubFile, stub);
  const adapters = new Set(['safety.mjs', 'candidate-target.mjs', 'candidate-user.mjs', 'local-app.mjs']);
  const executable = source.replace(/from '\.\/([^']+)'/g, (_, name) =>
    'from ' + JSON.stringify(adapters.has(name) ? pathToFileURL(stubFile).href : url(name)));
  const executableFile = path.join(temp, 'controller.mjs'); await writeFile(executableFile, executable);
  // Re-inject private canaries to test the nested selector independently of Python's filter.
  const run = spawnSync(process.execPath, [executableFile], { encoding: 'utf8', timeout: 15_000,
    env: { ...parent, ...PRIVATE } });
  assert.equal(run.error, undefined); assert.equal(run.signal, null);
  assert.ok([0, 20].includes(run.status), 'controller reached scenario, not import/setup failure');
  const child = JSON.parse(await readFile(captured, 'utf8'));
  const result = JSON.parse(await readFile(resultFile, 'utf8'));
  assert.equal(result.cleanupState, 'PROVEN_ZERO');
  return { m, parent, child, result, exit: run.status };
}

function assertAuthority(child, parent) {
  for (const key of AUTHORITY) assert.equal(child[key], parent[key], 'Playwright hop: ' + key);
}

for (const event of ['workflow_dispatch', 'workflow_run']) {
  test('actual Python -> candidate-run -> Playwright authority: ' + event, async t => {
    const r = await launch(t, event, await readFile(controllerFile, 'utf8'));
    assertAuthority(r.child, r.parent);
    assert.equal(r.exit, 0);
    assert.equal(browserBase(r.child), r.m.frontend.url);
    for (const [key, value] of Object.entries(PRIVATE)) {
      assert.equal(r.child[key], undefined, key);
      assert.ok(!Object.values(r.child).includes(value), key);
    }
    assert.ok(!Object.values(r.child).includes('OFFLINE_ADMIN_ONLY'));
    // Real config/test discovery, not a hosted scenario or a mocked validator.
    const discovery = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/playwright/cli.js'),
      'test', '--config', 'e2e/playwright.config.ts', '--list', '--reporter=list'], {
      cwd: ROOT, env: r.child, encoding: 'utf8', timeout: 15_000 });
    assert.equal(discovery.status, 0);
    assert.match(discovery.stdout, /Total: 1 test in 1 file/);
    for (const key of CD_FIELDS) {
      const missing = { ...r.child }; delete missing[key];
      assert.throws(() => browserBase(missing), /EXECUTION_IDENTITY_MISMATCH/, 'missing ' + key);
      assert.throws(() => browserBase({ ...r.child, [key]: 'wrong' }), /EXECUTION_IDENTITY_MISMATCH/, key);
    }
    for (const [key, value] of [['CD_CI_RUN_ATTEMPT', '2'], ['CD_SOURCE_SHA', 'b'.repeat(40)],
      ['GITHUB_EVENT_NAME', event === 'workflow_run' ? 'workflow_dispatch' : 'workflow_run'],
      ['CD_MODE', event === 'workflow_run' ? 'manual-release' : 'automatic-release']]) {
      assert.throws(() => browserBase({ ...r.child, [key]: value }), /EXECUTION_IDENTITY_MISMATCH/);
    }
  });
}

test('six nested propagation mutants fail semantic authority assertions', async t => {
  const source = await readFile(controllerFile, 'utf8');
  for (const fields of [CD_FIELDS, ...CD_FIELDS.map(key => [key])]) {
    let mutant = source;
    for (const key of fields) {
      assert.equal(mutant.split("'" + key + "'").length, 2, 'mutation anchor: ' + key);
      mutant = mutant.replace(new RegExp("'" + key + "',\\s*"), '');
    }
    const r = await launch(t, 'workflow_run', mutant);
    assert.throws(() => assertAuthority(r.child, r.parent), { code: 'ERR_ASSERTION' });
    assert.throws(() => browserBase(r.child), /EXECUTION_IDENTITY_MISMATCH/);
    assert.equal(r.exit, 20);
    assert.equal(r.result.scenario, 'FAIL');
    assert.equal(r.result.failureCode, 'SCENARIO_FAILED');
    assert.ok(r.result.steps.every(s => s.result === 'NOT_RUN'));
  }
});
