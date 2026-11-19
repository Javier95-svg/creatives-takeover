import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  // Never send test leads or analytics to external services.
  await context.route('https://cal.com/**', route => route.fulfill({ body: '<p>Mock calendar</p>', contentType: 'text/html' }));
  await page.route('**/*.supabase.co/**', route => route.fulfill({ json: [] }));
  await page.route('**/*posthog.com/**', route => route.abort());
  await page.route('**/*amplitude.com/**', route => route.abort());
});

for (const theme of ['light', 'dark']) {
  for (const width of [390, 1440]) {
    test(`enterprise ${theme} at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 960 });
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme as 'light' | 'dark' });
      await page.addInitScript(value => localStorage.setItem('theme-preference', value), theme);
      await page.goto('/enterprise');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('See cohort progress. Focus your support.');
      await expect(page.getByText('Real product · Sample data', { exact: true }).first()).toBeVisible();
      await expect(page.getByText(/Free for our first/)).toHaveCount(0);
      await expect(page.locator('.ent main')).not.toContainText('—');
      for (const section of await page.locator('.ent main > section').all()) {
        // The approved FAQ is intentionally text-only.
        if (await section.locator('.ent-faq').count()) {
          await expect(section.locator('img, .ent-shot')).toHaveCount(0);
          continue;
        }
        expect(await section.locator('img, .ent-evidence-card, .ent-report, .ent-setup').count()).toBeGreaterThan(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole('link', { name: 'Book a pilot call' }).first()).toHaveAttribute('href', 'https://cal.com/javier-creatives-takeover/30min');
      const trigger = page.getByRole('button', { name: 'Enlarge dashboard' });
      await trigger.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(dialog).toBeHidden();
      await page.getByRole('link', { name: 'See the sample report' }).click();
      await expect(page).toHaveURL(/#report$/);
      await expect(page.getByText('Illustrative report · Fictional data', { exact: true })).toBeVisible();
      await page.locator('.ent img').evaluateAll(async images => {
        await Promise.all(images.map(async image => {
          const img = image as HTMLImageElement;
          img.loading = 'eager';
          await img.decode();
        }));
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath('enterprise-full.png'), fullPage: true });
    });
  }
}

for (const success of [true, false]) {
  test(`contact submission ${success ? 'succeeds' : 'fails'} without sending a lead`, async ({ page, context }) => {
    let submissions = 0;
    await page.route('**/functions/v1/contact-form-submission', async route => {
      submissions++;
      const body = route.request().postDataJSON();
      expect(body.email).toBe('preview@example.com');
      expect(body.message).toContain('Organization: Preview Program');
      await route.fulfill({ status: success ? 200 : 500, json: success ? { success: true } : { error: 'Mock failure' } });
    });
    await page.goto('/enterprise#talk');
    await page.getByLabel('Your name').fill('Preview Tester');
    await page.getByLabel('Work email').fill('preview@example.com');
    await page.getByLabel('Organization', { exact: false }).fill('Preview Program');
    await page.getByRole('combobox', { name: 'Cohort or portfolio size' }).click();
    await page.getByRole('option', { name: 'Under 10 teams', exact: true }).click();
    await page.getByLabel('Anything we should know?').fill('Preview test only.');
    await page.getByRole('button', { name: 'Book a pilot call' }).click();
    if (success) {
      await expect(page.getByRole('status').filter({ hasText: 'Thanks' })).toContainText('got your details');
      await expect(page.getByRole('link', { name: /Book a time/ })).toHaveAttribute('href', /cal.com.*preview%40example.com/);
    } else {
      await expect(page.getByRole('alert').filter({ hasText: 'send the form' })).toContainText('javier@creatives-takeover.com');
      await expect(page.getByRole('button', { name: 'Book a pilot call' })).toBeEnabled();
    }
    expect(submissions).toBe(1);
    for (const tab of context.pages()) if (tab !== page) await tab.close();
  });
}
