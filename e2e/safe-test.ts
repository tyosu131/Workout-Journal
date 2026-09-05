import { test as base } from '@playwright/test';

// Playwright 1.63.0 writes error-context.md even with trace/screenshot off and
// PLAYWRIGHT_NO_COPY_PROMPT=1. Disable the recorder BEFORE it installs listeners,
// not by deleting a sensitive file afterwards. This internal fixture is pinned
// and covered by real uncaught-error/timeout fault runs with output preserved.
export const test = base.extend<{ _setupArtifacts: void }>({
  _setupArtifacts: async ({}, use) => { await use(); },
  // The disabled recorder normally injects context options. Supply only the
  // explicit safe browser options here; never accept HAR/video/storage state.
  context: async ({ browser, baseURL, viewport, timezoneId, locale, actionTimeout,
    navigationTimeout }, use) => {
    const context = await browser.newContext({ baseURL, viewport, timezoneId, locale,
      serviceWorkers: 'block', acceptDownloads: false });
    context.setDefaultTimeout(actionTimeout);
    context.setDefaultNavigationTimeout(navigationTimeout);
    try { await use(context); } finally { await context.close(); }
  },
});
