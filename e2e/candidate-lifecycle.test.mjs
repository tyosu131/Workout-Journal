// Execute the actual controller body offline. Replace only its external adapters;
// the v2 client, ownership checks, result construction and writer remain real.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { manifest } from './release-fixture.mjs';
import { validateResult } from './candidate-result.mjs';

test('actual child preserves scenario/cleanup sub-results across independent failures', async t => {
  const root = path.resolve('e2e'), url = name => pathToFileURL(path.join(root, name)).href;
  const source = await readFile(path.join(root, 'candidate-run.mjs'), 'utf8');
  for (const c of [
    { name: 'pass', scenario: 'PASS', state: 'PROVEN_ZERO', exit: 0 },
    { name: 'scenario', scenario: 'FAIL', state: 'PROVEN_ZERO', exit: 20, code: 'SCENARIO_FAILED' },
    { name: 'query', scenario: 'PASS', state: 'UNPROVEN', exit: 21, code: 'CLEANUP_NOTES_QUERY_FAILED' },
    { name: 'residual', scenario: 'FAIL', state: 'RESIDUAL', exit: 21, code: 'CLEANUP_NOTES_RESIDUAL' },
    { name: 'receipt', scenario: 'PASS', state: 'PROVEN_ZERO', exit: 22, code: 'CLEANUP_LOCAL_RECEIPT_PERSIST_FAILED' },
    { name: 'receipt-before-browser', scenario: 'NOT_RUN', state: 'PROVEN_ZERO', exit: 22, code: 'LOCAL_RECEIPT_PERSIST_FAILED' },
    { name: 'collision', scenario: 'NOT_RUN', state: 'RESIDUAL', exit: 21, code: 'PREEXISTING_SYNTHETIC_IDENTITY_REFUSED' },
    { name: 'bad-report', scenario: 'FAIL', state: 'PROVEN_ZERO', exit: 20, code: 'SCENARIO_FAILED' },
  ]) await t.test(c.name, async () => {
    const temp = await mkdtemp(path.join(tmpdir(), 'cd-offline-child-'));
    try {
      const m = manifest(), hash = '8'.repeat(64), resultFile = path.join(temp, 'result');
      await writeFile(resultFile, '', { mode: 0o600 });
      const stub = `
import { writeFile } from 'node:fs/promises';
import { newCandidateUser } from ${JSON.stringify(url('candidate-user.mjs'))};
import { releaseCandidateClient } from ${JSON.stringify(url('candidate-client.mjs'))};
import { STEPS, check, SafeError } from ${JSON.stringify(url('safety.mjs'))};
export { newCandidateUser, STEPS, check, SafeError };
const m=${JSON.stringify(m)}, kind=${JSON.stringify(c.name)}, temp=${JSON.stringify(temp)};
const marker='RAW_EXCEPTION_RESPONSE_TOKEN_https://private.invalid/path';
export const ROOT=temp, EVIDENCE=temp, WORK=temp, P2B_RUNS=temp;
export const readCandidateManifest=()=>m, cleanEnv=e=>e;
export const readPrivateJson=()=>{throw Error('unexpected resume')}, operationalIdentity=()=>({});
export const validateResume=()=>{throw Error('unexpected resume')}, receiptPath=()=>temp+'/receipt';
export const credentialFromStdin=async()=> 'sb_secret_OFFLINE_PRIVATE_MARKER';
let saves=0, user=null, deletes=0, creates=0;
export const saveCandidateReceipt=async()=>{ if ((++saves===3 && kind==='receipt') || (saves===2 && kind==='receipt-before-browser')) throw Error(marker); };
export const candidateClient=(manifest,secret)=>releaseCandidateClient(manifest,secret,saveCandidateReceipt);
export const sourceDigest=async()=> 'unchanged', assertSafeOutputs=async()=>{};
export const quietExec=async(command,args,options)=>{
  if(command==='git') return args[0]==='rev-parse'? m.sourceSha : '';
  const steps=STEPS.map(name=>({name,result:'PASS'}));
  if(['scenario','residual'].includes(kind)) steps[3].result='FAIL';
  await writeFile(options.env.E2E_BROWSER_REPORT,JSON.stringify({steps:kind==='bad-report'?null:steps,browser:'chromium'}));
  if(['scenario','residual'].includes(kind)) throw Error(marker);
};
globalThis.fetch=async(raw,opts)=>{
 const u=new URL(raw);
 if(u.origin===new URL(m.frontend.url).origin) return u.pathname==='/login'?new Response('',{status:200}):Response.json({error:'Authorization token missing'},{status:401});
 if(u.origin===new URL(m.backend.url).origin) return new Response('',{status:404});
 if(u.origin!==m.supabase.url) throw Error('NETWORK_FORBIDDEN');
 if(opts.method==='POST'){creates++; const b=JSON.parse(opts.body);user={...b,created_at:new Date(b.app_metadata.p2b.createdAt).toISOString()};return Response.json(user);}
 if(opts.method==='DELETE'){deletes++;user=null;return Response.json({});}
 if(u.pathname.startsWith('/auth/')) return user?Response.json(user):new Response('{}',{status:404});
 const table=u.pathname.split('/').at(-1), col={users:'uuid',notes:'userid',user_tags:'user_id'}[table];
 if(!col) throw Error('GENERIC_QUERY_FORBIDDEN');
 if(table==='notes' && deletes && kind==='query') throw Error(marker);
 const count=table==='notes' && (kind==='collision'||kind==='residual'&&deletes)?1:0;
 return Response.json(count?[{[col]:u.searchParams.get(col).slice(3)}]:[],{headers:{'content-range':count?'0-0/1':'*/0'}});
};
process.on('exit',()=>{if(kind==='collision'&&(creates||deletes))process.exitCode=99;});
`;
      const stubFile = path.join(temp, 'adapters.mjs');
      await writeFile(stubFile, stub);
      const adapters = new Set(['safety.mjs', 'candidate-target.mjs', 'candidate-user.mjs', 'local-app.mjs']);
      const executable = source.replace(/from '\.\/([^']+)'/g, (_, name) =>
        'from ' + JSON.stringify(adapters.has(name) ? pathToFileURL(stubFile).href : url(name)));
      const executableFile = path.join(temp, 'controller.mjs'); await writeFile(executableFile, executable);
      let stdout = '', stderr = '', exit = 0;
      try {
        stdout = execFileSync(process.execPath, [executableFile], { encoding: 'utf8', timeout: 15000,
          env: { PATH: process.env.PATH, E2E_RESULT_FILE: resultFile, E2E_MANIFEST_SHA256: hash } });
      } catch (error) { stdout = error.stdout; stderr = error.stderr; exit = error.status; }
      assert.equal(exit, c.exit);
      const r = JSON.parse(await readFile(resultFile, 'utf8')); validateResult(r, m, hash);
      assert.equal(r.scenario, c.scenario); assert.equal(r.cleanupState, c.state);
      assert.equal(r.failureCode, c.code ?? null);
      if (c.name.startsWith('receipt')) assert.equal(r.localReceiptState, 'FAILED');
      if (c.name === 'query') assert.equal(r.cleanup.notes, null);
      if (c.name === 'collision') assert.ok(r.steps.every(s => s.result === 'NOT_RUN'));
      for (const marker of ['RAW_EXCEPTION', 'sb_secret_OFFLINE', '@p2b.invalid', 'P2B_PASSWORD_MARKER']) {
        assert.ok(!(stdout + stderr + JSON.stringify(r)).includes(marker));
      }
    } finally { await rm(temp, { recursive: true, force: true }); }
  });
});
