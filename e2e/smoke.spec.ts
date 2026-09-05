import { expect, type Locator } from '@playwright/test';
import { test } from './safe-test';
import { writeFileSync } from 'node:fs';
const { browserBase } = require('./candidate-target.mjs');

test('isolated or approved candidate serial smoke', async ({ page, context, browser }) => {
  const base: string = browserBase(process.env);
  const candidate = process.env.E2E_TARGET?.startsWith('candidate:') === true;
  const runId = process.env.E2E_RUN_ID!;
  const tag = runId + '-tag';
  const memo = runId + '-note';
  const steps: { name: string; result: string }[] = [];
  let failed = false;
  let date = '';
  let unexpectedRemote = false;
  // The product requests a Google font; block it deliberately (system fallback).
  // All authenticated/API navigation must remain on the validated Frontend origin.
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === base) return route.continue();
    if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) unexpectedRemote = true;
    return route.abort();
  });
  const save = () => writeFileSync(process.env.E2E_BROWSER_REPORT!,
    JSON.stringify({ browser: 'chromium-' + browser.version(), steps }), { mode: 0o600 });
  const step = async (name: string, work: () => Promise<void>) => {
    if (failed) return;
    // Contain raw assertion errors before Playwright can persist call logs or DOM.
    // Reporter returns failed if any named step fails, even though this callback catches.
    await test.step(name, async () => {
      try { await work(); expect(unexpectedRemote).toBe(false); steps.push({ name, result: 'PASS' }); }
      catch { failed = true; steps.push({ name, result: 'FAIL' }); }
      save();
    });
  };
  const responseFor = (suffix: string, method: string) => page.waitForResponse(response =>
    new URL(response.url()).pathname === suffix && response.request().method() === method);
  const assertSavedNote = async () => {
    await expect(page.getByLabel('Exercise 1 name', { exact: true })).toHaveValue('Bench Press');
    await expect(page.getByPlaceholder('Write something about this exercise...')).toHaveValue(memo);
    await expect(page.getByLabel('Exercise 1 set 1 weight', { exact: true })).toHaveValue('60');
    await expect(page.getByLabel('Exercise 1 set 1 reps', { exact: true })).toHaveValue('5');
    await expect(page.getByLabel('Exercise 1 set 1 rest', { exact: true })).toHaveValue('60');
  };
  const authenticatedRead = async (suffix: string) => page.evaluate(async route => {
    const response = await fetch(route, { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
    if (!response.ok) throw new Error('READ_FAILED');
    return response.json();
  }, suffix);
  const fillSaved = async (input: Locator, value: string,
    matches: (body: any) => boolean) => {
    const saved = page.waitForResponse(response => {
      if (new URL(response.url()).pathname !== '/api/notes/' + date ||
        response.request().method() !== 'POST') return false;
      try { return matches(response.request().postDataJSON()); } catch { return false; }
    });
    await input.fill(value);
    expect((await saved).ok()).toBe(true);
  };
  const exercises = (body: any) => typeof body.exercises === 'string' ?
    JSON.parse(body.exercises) : body.exercises;

  await step('login', async () => {
    await page.goto('/login');
    await page.getByPlaceholder('Email', { exact: true }).fill(process.env.E2E_USER_EMAIL!);
    await page.getByPlaceholder('Password', { exact: true }).fill(process.env.E2E_USER_PASSWORD!);
    const loggedIn = responseFor('/api/auth/login', 'POST');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    expect((await loggedIn).ok()).toBe(true);
    await expect(page).toHaveURL(base + '/top');
    await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeVisible();
    const session = await authenticatedRead('/api/auth/session');
    expect(session.user.uuid === process.env.E2E_USER_ID).toBe(true);
    // Dummy canary exercises the no-console-capture boundary without logging a real token.
    await page.evaluate(marker => console.info(marker), process.env.E2E_ARTIFACT_CANARY!);
    const cookie = (await context.cookies()).find(item => item.name === 'refreshToken');
    expect(Boolean(cookie?.httpOnly && cookie.path === '/api/auth' && cookie.sameSite === 'Lax')).toBe(true);
    if (candidate) {
      expect(cookie?.secure === true && cookie.domain === new URL(base).hostname).toBe(true);
    }
  });
  await step('tag-create', async () => {
    await page.goto('/tag-management');
    await page.getByPlaceholder('Enter new tag').fill(tag);
    const created = responseFor('/api/notes/tag', 'POST');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    expect((await created).ok()).toBe(true);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Delete tag ' + tag, exact: true })).toBeVisible();
    expect((await authenticatedRead('/api/notes/all-tags')).tags.includes(tag)).toBe(true);
  });
  await step('note-create-save-read', async () => {
    await page.goto('/top');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page).toHaveURL(/\/note\/new\?/);
    date = new URL(page.url()).searchParams.get('date')!;
    expect(/^\d{4}-\d{2}-\d{2}$/.test(date)).toBe(true);
    expect((await authenticatedRead('/api/notes/' + date)).notes.length).toBe(0);
    await expect(page.getByLabel('Exercise 1 name', { exact: true })).toHaveValue('');
    await fillSaved(page.getByLabel('Exercise 1 name', { exact: true }), 'Bench Press',
      body => exercises(body)[0].exercise === 'Bench Press');
    await fillSaved(page.getByPlaceholder('Write something about this exercise...'), memo,
      body => exercises(body)[0].note === memo);
    await fillSaved(page.getByLabel('Exercise 1 set 1 weight', { exact: true }), '60',
      body => String(exercises(body)[0].sets[0].weight) === '60');
    await fillSaved(page.getByLabel('Exercise 1 set 1 reps', { exact: true }), '5',
      body => String(exercises(body)[0].sets[0].reps) === '5');
    await fillSaved(page.getByLabel('Exercise 1 set 1 rest', { exact: true }), '60',
      body => String(exercises(body)[0].sets[0].rest) === '60');
    await page.goto('/note/' + date);
    await page.reload();
    await assertSavedNote();
  });
  await step('tag-use', async () => {
    await page.getByPlaceholder('Select an option or create one').click();
    const saved = page.waitForResponse(response => {
      if (new URL(response.url()).pathname !== '/api/notes/' + date ||
        response.request().method() !== 'POST') return false;
      try { return response.request().postDataJSON().tags.includes(tag); } catch { return false; }
    });
    await page.getByText(tag, { exact: true }).filter({ visible: true }).click();
    expect((await saved).ok()).toBe(true);
    await page.reload();
    await expect(page.getByText(tag, { exact: true }).filter({ visible: true })).toBeVisible();
    expect((await authenticatedRead('/api/notes/' + date)).notes[0].tags.includes(tag)).toBe(true);
  });
  // Exercise framework-level errors outside the normal safe step catch. Neither
  // these nor test timeouts may create an error-context file or raw report.
  if (!failed && process.env.E2E_VERIFY_FAILURE === 'framework') {
    throw new Error(process.env.E2E_USER_PASSWORD! + process.env.E2E_ARTIFACT_CANARY!);
  }
  if (!failed && process.env.E2E_VERIFY_FAILURE === 'timeout') {
    test.setTimeout(1);
    await new Promise(() => {});
  }
  await step('Calendar', async () => {
    if (process.env.E2E_VERIFY_FAILURE === 'step') {
      // Deliberately hostile error payload: containment must discard every value.
      throw new Error(process.env.E2E_USER_PASSWORD! + process.env.E2E_ARTIFACT_CANARY!);
    }
    await page.goto('/top?month=' + date.slice(0, 7));
    const day = page.getByRole('button').filter({ has: page.getByText(tag, { exact: true }) });
    await expect(day).toHaveCount(1);
    await day.click();
    await expect(page).toHaveURL(new RegExp('/note/' + date + '(\\?|$)'));
    await assertSavedNote();
  });
  await step('Analytics', async () => {
    await page.goto('/analytics');
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
    const big3 = page.getByRole('region', { name: 'BIG3', exact: true });
    const bench = big3.getByRole('group', { name: 'Bench Press summary', exact: true });
    await expect(bench.getByText('Latest top set', { exact: true })).toBeVisible();
    await expect(bench.getByText(date + ' | 60 x 5', { exact: true })).toBeVisible();
    await expect(bench.getByText('Estimated 1RM: 70', { exact: true })).toBeVisible();
  });
  await step('tag-delete', async () => {
    await page.goto('/tag-management');
    const deleted = responseFor('/api/notes/tag/' + tag, 'DELETE');
    await page.getByRole('button', { name: 'Delete tag ' + tag, exact: true }).click();
    expect((await deleted).ok()).toBe(true);
    await page.reload();
    await expect(page.getByText('No tags found.', { exact: true })).toBeVisible();
    expect((await authenticatedRead('/api/notes/all-tags')).tags.includes(tag)).toBe(false);
    await page.goto('/note/' + date);
    await page.reload();
    await assertSavedNote();
    expect((await authenticatedRead('/api/notes/' + date)).notes[0].tags.includes(tag)).toBe(false);
    await expect(page.getByText(tag, { exact: true })).toHaveCount(0);
  });
  await step('logout', async () => {
    await page.goto('/top');
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    const loggedOut = responseFor('/api/auth/logout', 'POST');
    await page.getByRole('menuitem', { name: 'Log Out', exact: true }).click();
    expect((await loggedOut).ok()).toBe(true);
    await expect(page).toHaveURL(base + '/login');
    expect(await page.evaluate(() => localStorage.getItem('token') === null)).toBe(true);
    expect((await context.cookies()).some(cookie => cookie.name === 'refreshToken')).toBe(false);
    expect((await context.request.post(base + '/api/auth/refresh')).status()).toBe(401);
    await page.goto('/top');
    await expect(page).toHaveURL(base + '/login');
    expect(await page.evaluate(() => localStorage.getItem('token') === null)).toBe(true);
  });
  save();
});
