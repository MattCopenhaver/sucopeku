import { defineConfig, devices } from '@playwright/test';

// One config, two modes.
//
//   SMOKE_URL unset → the full suite runs against a locally served production
//                     build. It must not depend on a deployment (FR-031), so
//                     that a failing test and a failing deploy stay
//                     distinguishable.
//   SMOKE_URL set   → only the smoke test runs, against that deployed URL
//                     (FR-032), verifying the deployment itself.
const smokeUrl = process.env.SMOKE_URL;
const localUrl = 'http://localhost:4173';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: smokeUrl ? '**/smoke.spec.ts' : undefined,
  testIgnore: smokeUrl ? undefined : '**/smoke.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: smokeUrl ?? localUrl,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // WebKit is the real compatibility floor: every iOS browser uses it, and
    // Principle IX makes mobile first-class.
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: smokeUrl
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        url: localUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
