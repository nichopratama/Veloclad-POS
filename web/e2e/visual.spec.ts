/**
 * M4 visual baseline capture — full-page screenshots at 4 breakpoints.
 *
 * Pages captured:
 *   - /login         (no auth — fresh context)
 *   - /dashboard     (auth required)
 *   - /pos           (auth required)
 *   - /sales         (auth required)
 *   - /library       (auth required)
 *   - /inventory     (auth required)
 *   - /settings      (auth required)
 *
 * Breakpoints (width × height): 375×812, 768×1024, 1024×768, 1440×900.
 *
 * After each capture, horizontal overflow is detected and reported
 * (run does NOT fail on overflow — just collects findings).
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// ─── Config ──────────────────────────────────────────────────────────────────

const AUTH_FILE = path.resolve(__dirname, '.auth/state.json');

const BREAKPOINTS: Array<{ width: number; height: number }> = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const SCREENSHOTS_DIR = path.resolve(__dirname, 'screenshots');

/** Pages that need an authenticated session. */
const AUTH_PAGES: Array<{ name: string; path: string; stableSelector: string }> =
  [
    { name: 'dashboard', path: '/', stableSelector: 'h1, main, [class*="dashboard"]' },
    { name: 'pos', path: '/pos', stableSelector: 'h1, main, [class*="pos"], [class*="kasir"]' },
    { name: 'sales', path: '/sales', stableSelector: 'h1, main, table, [class*="sales"]' },
    { name: 'library', path: '/library', stableSelector: 'h1, main, [class*="library"]' },
    { name: 'inventory', path: '/inventory', stableSelector: 'h1, main, [class*="inventory"]' },
    { name: 'settings', path: '/settings', stableSelector: 'h1, main, [class*="settings"]' },
  ];

/** Overflow findings accumulator — populated during capture, logged at end. */
const overflowFindings: Array<{ page: string; width: number; scrollWidth: number }> = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function screenshotPath(name: string, width: number): string {
  return path.join(SCREENSHOTS_DIR, `${name}-${width}.png`);
}

async function captureAndInspect(
  page: Page,
  pageName: string,
  width: number,
  height: number,
  targetPath: string
): Promise<void> {
  await page.setViewportSize({ width, height });

  // Wait until the page is stable.
  await page.waitForLoadState('networkidle');

  // Capture.
  await page.screenshot({ path: targetPath, fullPage: true });

  // Detect horizontal overflow.
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth
  );
  const hasOverflow = scrollWidth > width + 1;

  if (hasOverflow) {
    overflowFindings.push({ page: pageName, width, scrollWidth });
    console.warn(
      `[overflow] ${pageName} @ ${width}px — scrollWidth=${scrollWidth}px (overflow ${scrollWidth - width}px)`
    );
  }
}

// ─── Setup ───────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
});

// ─── /login — no auth ────────────────────────────────────────────────────────

test.describe('/login', () => {
  for (const { width, height } of BREAKPOINTS) {
    test(`login @ ${width}px`, async ({ browser }) => {
      // Fresh context with no stored auth.
      const context: BrowserContext = await browser.newContext();
      const page: Page = await context.newPage();

      await page.setViewportSize({ width, height });
      await page.goto('/login', { waitUntil: 'networkidle' });

      // Wait for the login form to be present.
      await expect(page.locator('form, [class*="login"], input[type="email"], input[type="password"]').first()).toBeVisible({ timeout: 15_000 });

      await captureAndInspect(page, 'login', width, height, screenshotPath('login', width));

      await context.close();
    });
  }
});

// ─── Authenticated pages ──────────────────────────────────────────────────────

for (const { name, path: pagePath, stableSelector } of AUTH_PAGES) {
  test.describe(`/${name}`, () => {
    for (const { width, height } of BREAKPOINTS) {
      test(`${name} @ ${width}px`, async ({ browser }) => {
        // Load auth state from file saved during global setup.
        if (!fs.existsSync(AUTH_FILE)) {
          throw new Error(
            `[visual.spec] Auth state not found at ${AUTH_FILE}. Did global setup run?`
          );
        }

        const context: BrowserContext = await browser.newContext({
          storageState: AUTH_FILE,
        });
        const page: Page = await context.newPage();

        await page.setViewportSize({ width, height });
        await page.goto(pagePath, { waitUntil: 'networkidle' });

        // If redirected to login, bail with a clear message.
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
          throw new Error(
            `[visual.spec] ${name} @ ${width}px redirected to login — auth state may be invalid.`
          );
        }

        // Wait for a stable content signal.
        await expect(page.locator(stableSelector).first()).toBeVisible({
          timeout: 20_000,
        });

        await captureAndInspect(
          page,
          name,
          width,
          height,
          screenshotPath(name, width)
        );

        await context.close();
      });
    }
  });
}

// ─── Summary ─────────────────────────────────────────────────────────────────

test.afterAll(() => {
  if (overflowFindings.length === 0) {
    console.log('[visual] No horizontal overflow detected on any page/breakpoint.');
  } else {
    console.warn(`[visual] Overflow findings (${overflowFindings.length}):`);
    for (const f of overflowFindings) {
      console.warn(`  • ${f.page} @ ${f.width}px — scrollWidth=${f.scrollWidth}px`);
    }
  }

  // Count screenshots produced.
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.endsWith('.png'));
  console.log(`[visual] Screenshots produced: ${files.length}`);
  for (const f of files) {
    console.log(`  ${f}`);
  }
});
