import { cp, mkdir, mkdtemp, symlink, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import path from 'node:path';
import { ROOT, check, cleanEnv, quietExec, SafeError } from './safety.mjs';

export const BASE = 'http://127.0.0.1:3100';
const BACKEND = 'http://127.0.0.1:3101';
export const WORK = path.join(ROOT, 'e2e/.work');

export async function sourceDigest() {
  const hash = createHash('sha256');
  const names = (await quietExec('git', ['ls-files', '--cached', '--others', '--exclude-standard',
    '-z', '--', 'frontend', 'backend', 'shared', 'e2e', 'package.json', 'package-lock.json',
    'jest.config.js'])).split('\0').filter(Boolean).sort();
  for (const name of names) {
    if (path.basename(name).startsWith('.env')) continue;
    hash.update(name + '\0');
    hash.update(await readFile(path.join(ROOT, name)));
    hash.update('\0');
  }
  return hash.digest('hex');
}
async function freePort(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new SafeError('LOCAL_PORT_OCCUPIED')));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}
export async function prepareApp(target, jwt) {
  await freePort(3100);
  await freePort(3101);
  await mkdir(WORK, { recursive: true, mode: 0o700 });
  const dir = await mkdtemp(path.join(WORK, 'app-'));
  // backend/server.js intentionally gives .env.local override priority. Do not start
  // it in the developer checkout. Copy real sources, never dotenv or existing builds.
  const excluded = new Set(['node_modules', '.next', '.git', '.supabase', 'coverage']);
  const filter = source => !excluded.has(path.basename(source)) &&
    !path.basename(source).startsWith('.env') && !source.endsWith('.tsbuildinfo');
  for (const part of ['frontend', 'backend', 'shared']) {
    await cp(path.join(ROOT, part), path.join(dir, part), { recursive: true, filter });
  }
  await cp(path.join(ROOT, 'package.json'), path.join(dir, 'package.json'));
  for (const part of ['', 'frontend', 'backend']) {
    await symlink(path.join(ROOT, part, 'node_modules'), path.join(dir, part, 'node_modules'), 'dir');
  }
  const frontendEnv = cleanEnv({ NODE_ENV: 'production', BACKEND_INTERNAL_URL: BACKEND,
    NEXT_PUBLIC_SUPABASE_URL: target.api, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: target.publishable });
  const backendEnv = cleanEnv({ NODE_ENV: 'development', PORT: '3101', CORS_ORIGIN: BASE,
    SUPABASE_URL: target.api, SUPABASE_SECRET_KEY: target.secret,
    SUPABASE_PUBLISHABLE_KEY: target.publishable, JWT_SECRET: jwt,
    PASSWORD_RESET_REDIRECT_URL: BASE + '/reset-password' });
  await quietExec('npm', ['run', 'build'], { cwd: dir, env: frontendEnv, timeout: 300_000 });
  return { dir, frontendEnv, backendEnv };
}
function start(command, args, options) {
  const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
  // Drain without recording authenticated application or dependency output.
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  child.on('error', () => {});
  return child;
}
export async function startApp(app) {
  const watchdog = path.join(ROOT, 'e2e/parent-watchdog.cjs');
  const backend = start(process.execPath, ['--require', watchdog, 'server.js'],
    { cwd: path.join(app.dir, 'backend'), env: app.backendEnv });
  const frontend = start(process.execPath,
    ['--require', watchdog, path.join(ROOT, 'frontend/node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', '3100'],
    { cwd: path.join(app.dir, 'frontend'), env: app.frontendEnv });
  const stop = async () => {
    await Promise.all([frontend, backend].map(async child => {
      if (child.exitCode !== null || !child.pid) return;
      const finished = once(child, 'exit').catch(() => {});
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
      await finished;
      clearTimeout(timer);
    }));
  };
  try {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      check(frontend.exitCode === null && backend.exitCode === null, 'APP_EXITED');
      try {
        const login = await fetch(BASE + '/login', { redirect: 'error', signal: AbortSignal.timeout(5000) });
        const session = await fetch(BASE + '/api/auth/session',
          { redirect: 'error', signal: AbortSignal.timeout(5000) });
        if (login.status === 200 && session.status === 401 &&
          (await session.json()).error === 'Authorization token missing') {
          const frontPid = (await quietExec('lsof', ['-tiTCP:3100', '-sTCP:LISTEN'])).trim();
          const backPid = (await quietExec('lsof', ['-tiTCP:3101', '-sTCP:LISTEN'])).trim();
          check(frontPid === String(frontend.pid) && backPid === String(backend.pid), 'APP_OWNERSHIP_MISMATCH');
          return { stop };
        }
      } catch { /* bounded cold-start readiness, not E2E retries */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new SafeError('READINESS_TIMEOUT');
  } catch (error) { await stop(); throw error; }
}

export async function assertSafeOutputs(dir, secrets) {
  const visit = async folder => {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const filename = path.join(folder, entry.name);
      if (entry.isDirectory()) await visit(filename);
      else {
        // Includes Playwright's .last-run.json; never permit opaque artifacts.
        check(entry.isFile() && entry.name.endsWith('.json'), 'UNEXPECTED_ARTIFACT');
        const content = await readFile(filename, 'utf8');
        check(secrets.filter(Boolean).every(secret => !content.includes(secret)), 'SECRET_IN_OUTPUT');
        check(!/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(content),
          'JWT_IN_OUTPUT');
      }
    }
  };
  await visit(dir);
}
