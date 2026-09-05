import { defineConfig } from '@playwright/test';
import path from 'node:path';

// Defense in depth; safe-test.ts also disables the pinned automatic recorder.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';
if (require('@playwright/test/package.json').version !== '1.63.0') {
  throw new Error('ARTIFACT_BOUNDARY_REVIEW_REQUIRED');
}
if (process.env.E2E_BROWSER_BASE_URL !== 'http://127.0.0.1:3100' ||
    !process.env.E2E_BROWSER_REPORT || !process.env.E2E_USER_ID) {
  throw new Error('CONTROLLER_REQUIRED');
}
export default defineConfig({
  testDir: '.',
  testMatch: 'smoke.spec.ts',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 10_000 },
  reporter: [[path.join(__dirname, 'reporter.cjs')]],
  outputDir: process.env.E2E_PW_OUTPUT,
  // Keep all output so the controller's inspection cannot hide a leak by deletion.
  preserveOutput: 'always',
  use: {
    browserName: 'chromium',
    baseURL: process.env.E2E_BROWSER_BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 900 },
    timezoneId: 'Asia/Tokyo',
    locale: 'en-US',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    serviceWorkers: 'block',
  },
});
