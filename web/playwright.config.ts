import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — M4 visual baseline capture.
 *
 * Port 3100 is intentional: Mipro (parallel deputy) may occupy 3000.
 * BETTER_AUTH_URL is injected via webServer.env so the Next.js dev server
 * returns it in process.env, satisfying Better Auth's CSRF origin check.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',

  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL: 'http://localhost:3100',
    trace: 'off',
  },

  projects: [
    {
      name: 'setup',
      testMatch: '**/global-setup.ts',
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev -- -p 3100',
    url: 'http://localhost:3100/api/health',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      BETTER_AUTH_URL: 'http://localhost:3100',
    },
  },
});
