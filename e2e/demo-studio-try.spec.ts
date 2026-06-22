import { test, expect } from '@playwright/test';

/**
 * Live verification of the 2026-06-21 Demo Studio route-audit fixes, run against
 * the dev server with dummy Supabase env (see playwright.config.ts). With dummy
 * env a real `subscription_tiers` boot query would still be *attempted* (and fail)
 * — so asserting that none is even initiated is a true before/after signal for the
 * fix that stops the anon try route from fetching tiers.
 */

// 1x1 transparent PNG — enough for the uploader + canvas downscale path.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

test('#1 the hyphenated /demo-studio-try redirects to /demo-studio/try', async ({ page }) => {
  await page.goto('/demo-studio-try', { waitUntil: 'commit' });
  await expect(page).toHaveURL(/\/demo-studio\/try$/);
});

test('#4 no subscription_tiers request fires on the anonymous try route', async ({ page }) => {
  const tierRequests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('subscription_tiers')) tierRequests.push(req.url());
  });

  await page.goto('/demo-studio/try', { waitUntil: 'commit' });
  await expect(page.getByText(/Turn screenshots into a live demo/i)).toBeVisible();
  // Let any deferred boot queries fire before asserting none touched tiers.
  await page.waitForTimeout(2500);

  expect(tierRequests, `unexpected subscription_tiers calls: ${tierRequests.join(', ')}`).toHaveLength(0);
});

test('#3 generate -> preview -> start over -> regenerate loop is clean (mocked generator)', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  // Mock the anonymous generator so we don't hit OpenAI / the dummy Supabase host.
  await page.route('**/functions/v1/demo-studio-generator', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        mode: 'storyboard',
        draft: true,
        kit: {
          storyboard: [
            { title: 'Welcome', caption: 'See the product at a glance', speaker_notes: 'Intro', hotspot_label: 'Start' },
            { title: 'Key feature', caption: 'This is the core workflow', speaker_notes: 'Feature', hotspot_label: 'Next' },
          ],
        },
      }),
    });
  });

  await page.goto('/demo-studio/try', { waitUntil: 'commit' });
  await expect(page.getByText(/Turn screenshots into a live demo/i)).toBeVisible();

  const upload = async () =>
    page.locator('input[type="file"]').setInputFiles([
      { name: 'a.png', mimeType: 'image/png', buffer: PNG_1x1 },
      { name: 'b.png', mimeType: 'image/png', buffer: PNG_1x1 },
    ]);

  // First pass: upload -> generate -> preview.
  await upload();
  await page.getByRole('button', { name: /Generate the demo/i }).click();
  await expect(page.getByRole('button', { name: /Try different screenshots/i })).toBeVisible();

  // Start over returns to a clean uploader (runId bump invalidates in-flight work).
  await page.getByRole('button', { name: /Try different screenshots/i }).click();
  await expect(page.getByRole('button', { name: /Generate the demo/i })).toBeVisible();

  // Second pass works after reset (no stuck state).
  await upload();
  await page.getByRole('button', { name: /Generate the demo/i }).click();
  await expect(page.getByRole('button', { name: /Try different screenshots/i })).toBeVisible();

  expect(pageErrors, `try flow threw: ${pageErrors.join(' | ')}`).toHaveLength(0);
});
