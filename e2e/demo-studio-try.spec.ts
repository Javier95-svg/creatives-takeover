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

test('#2 a mid-save failure rolls back the project (no orphan; retries do not accumulate)', async ({ page }) => {
  // Seed an authenticated session in localStorage so AuthProvider (storage-based
  // getSession, key sb-<ref>-auth-token; ref = "dummy" from the test Supabase URL)
  // reports a signed-in user and the save takes the real `hydrate` path.
  const session = {
    access_token: 'e2e-fake-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'e2e-fake-refresh-token',
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'e2e@example.com',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { full_name: 'E2E Tester' },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: 'sb-dummy-auth-token', value: JSON.stringify(session) },
  );

  let createProjectCount = 0;
  const deletedProjectIds: string[] = [];

  await page.route('**/functions/v1/demo-studio-generator', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        mode: 'storyboard',
        draft: true,
        kit: {
          storyboard: [
            { title: 'Welcome', caption: 'See the product', speaker_notes: '', hotspot_label: 'Start' },
            { title: 'Feature', caption: 'Core workflow', speaker_notes: '', hotspot_label: 'Next' },
          ],
        },
      }),
    }),
  );

  // Project create succeeds; project delete (the rollback) is recorded.
  await page.route('**/rest/v1/demo_studio_projects**', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      createProjectCount += 1;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `proj-e2e-${createProjectCount}`,
          owner_id: session.user.id,
          name: 'My product',
          tagline: null,
          category: null,
          slug: null,
          status: 'draft',
          created_at: new Date().toISOString(),
        }),
      });
      return;
    }
    if (method === 'DELETE') {
      const match = /id=eq\.([^&]+)/.exec(route.request().url());
      if (match) deletedProjectIds.push(decodeURIComponent(match[1]));
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.continue();
  });

  // Demo create succeeds...
  await page.route('**/rest/v1/demo_studio_demos**', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'demo-e2e',
        project_id: 'proj-e2e',
        owner_id: session.user.id,
        title: 'My product demo',
        status: 'draft',
        created_at: new Date().toISOString(),
      }),
    }),
  );

  // ...but the step asset upload fails — the injected mid-hydrate failure.
  await page.route('**/storage/v1/object/demo-assets/**', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'injected upload failure' }) }),
  );

  await page.goto('/demo-studio/try', { waitUntil: 'commit' });
  await expect(page.getByText(/Turn screenshots into a live demo/i)).toBeVisible();

  const upload = () =>
    page.locator('input[type="file"]').setInputFiles([
      { name: 'a.png', mimeType: 'image/png', buffer: PNG_1x1 },
      { name: 'b.png', mimeType: 'image/png', buffer: PNG_1x1 },
    ]);

  await upload();
  await page.getByRole('button', { name: /Generate the demo/i }).click();
  const saveButton = page.getByRole('button', { name: /Save and publish this demo/i });
  await expect(saveButton).toBeVisible();

  // Attempt 1: save -> create project -> mid-hydrate failure -> rollback.
  await saveButton.click();
  await expect.poll(() => deletedProjectIds.length).toBeGreaterThanOrEqual(1);
  expect(createProjectCount, 'took the authenticated hydrate path').toBe(1);
  expect(deletedProjectIds, 'the created project was rolled back').toContain('proj-e2e-1');
  await expect(page, 'did not navigate into the builder on failure').toHaveURL(/\/demo-studio\/try$/);

  // Attempt 2 (retry): every created project is still rolled back — the dashboard
  // never accumulates orphaned/duplicate projects.
  await saveButton.click();
  await expect.poll(() => createProjectCount).toBe(2);
  await expect.poll(() => deletedProjectIds.length).toBe(2);
  expect(deletedProjectIds).toContain('proj-e2e-2');
});
