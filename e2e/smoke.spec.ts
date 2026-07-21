import { test, expect } from '@playwright/test';

/**
 * Smoke tests: every key public route must mount and paint real content
 * without throwing an uncaught exception. This catches the worst class of
 * visitor-facing bug — a page that blanks or crashes (e.g. a Rules-of-Hooks
 * violation, a render-time throw) — before it can ship.
 *
 * These run against the dev server with dummy Supabase env (see
 * playwright.config.ts), so they assert "renders / doesn't crash", not data.
 */
const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/about',
  '/faq',
  '/contact',
  '/services',
  '/newspaper',
  '/community',
  '/login',
  '/signup',
  '/icp-builder',
  '/demo-studio/try',
  '/pmf-lab',
  '/mvp-builder',
  '/go-to-market',
  '/traction-engine',
];

for (const route of PUBLIC_ROUTES) {
  test(`renders without crashing: ${route}`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // 'commit' = don't wait on load events (SPA module scripts load async); the
    // #root assertion below waits for the app to actually mount.
    await page.goto(route, { waitUntil: 'commit' });

    // The SPA mounted and painted real content into #root (not a blank/crashed shell).
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();
    const text = (await root.innerText()).trim();
    expect(text.length, `${route} rendered blank`).toBeGreaterThan(20);

    // No uncaught exceptions during render.
    expect(pageErrors, `${route} threw: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });
}
