import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, RUNS, EVIDENCE, TARGET, API, localTarget, createUser, api, residuals,
  check, cleanEnv, quietExec, SafeError, removeOwnedUser } from './safety.mjs';

// Test-only fixture on the proven local API. It deliberately leaves all three
// application tables populated so cascade (not the UI's tag delete) is exercised.
if (process.argv[2] === '--fixture-child' && process.send) {
  let target, user;
  try {
    target = await localTarget();
    user = await createUser(target);
    process.send({ runId: user.runId, created: true });
    await api(target, '/rest/v1/users', { method: 'POST',
      body: { uuid: user.userId, name: user.runId, email: user.email } });
    await api(target, '/rest/v1/notes', { method: 'POST',
      body: { userid: user.userId, date: '2026-01-01', note: user.runId, exercises: '[]', tags: [user.runId] } });
    await api(target, '/rest/v1/user_tags', { method: 'POST',
      body: { user_id: user.userId, tag: user.runId } });
    const before = await residuals(target, user.userId);
    check(before.users === 1 && before.notes === 1 && before.user_tags === 1, 'FIXTURE_INCOMPLETE');
    process.send({ runId: user.runId, ready: true });
    setInterval(() => {}, 1000);
  } catch {
    if (user) {
      try { await removeOwnedUser(target, user.receipt); } catch { /* parent retries independently */ }
    }
    process.send({ ready: false }); process.exitCode = 1; process.disconnect();
  }
} else {
  let child, runId;
  try {
    await localTarget(); // Require the same explicit approval as the real suite.
    child = fork(path.join(ROOT, 'e2e/verify-cleanup.mjs'), ['--fixture-child'], {
      env: cleanEnv({ E2E_TARGET: TARGET, E2E_SUPABASE_URL: API }),
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    const message = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new SafeError('FIXTURE_TIMEOUT')), 60_000);
      child.on('message', message => {
        if (message.created) runId = message.runId;
        else { clearTimeout(timer); resolve(message); }
      });
      child.once('exit', () => { clearTimeout(timer); reject(new SafeError('FIXTURE_EXITED')); });
    });
    check(message.ready === true, 'FIXTURE_FAILED');
    const exited = once(child, 'exit');
    child.kill('SIGKILL');
    await exited;
    // A separate process must recover; no fixture finally/afterAll can run after SIGKILL.
    const output = await quietExec(process.execPath, ['e2e/cleanup.mjs', '--run-id', message.runId], {
      env: cleanEnv({ E2E_TARGET: TARGET, E2E_SUPABASE_URL: API })
    });
    check(output.includes('residual rows: 0'), 'CRASH_CLEANUP_FAILED');
    const receipt = JSON.parse(await readFile(path.join(RUNS, message.runId + '.json'), 'utf8'));
    check(receipt.complete && receipt.cleanup.authUserRemoved &&
      ['users', 'notes', 'user_tags'].every(table => receipt.cleanup.counts[table] === 0),
    'CRASH_RESIDUAL_PROOF_MISSING');
    await mkdir(EVIDENCE, { recursive: true, mode: 0o700 });
    await writeFile(path.join(EVIDENCE, message.runId + '-cleanup.json'), JSON.stringify({
      runId: message.runId, target: 'isolated', signal: 'SIGKILL',
      before: { profiles: 1, notes: 1, user_tags: 1 },
      after: { authUserRemoved: true, profiles: 0, notes: 0, user_tags: 0 },
      result: 'PASS',
    }, null, 2) + '\n', { mode: 0o600 });
    console.log('Cascade fixture before: profile=1 notes=1 user_tags=1');
    console.log('SIGKILL + independent cleanup: PASS; Auth removed; residual rows=0');
  } catch (error) {
    if (child?.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGKILL');
      await exited;
    }
    if (runId) {
      try {
        await quietExec(process.execPath, ['e2e/cleanup.mjs', '--run-id', runId], {
          env: cleanEnv({ E2E_TARGET: TARGET, E2E_SUPABASE_URL: API })
        });
      } catch { console.error('Independent recovery incomplete; use the private receipt/stale command.'); }
    }
    console.error('Cleanup proof FAIL: ' + (error instanceof SafeError ? error.code : 'PROOF_UNAVAILABLE'));
    process.exitCode = 1;
  }
}
