import { expect, test } from '@playwright/test';

const COMPACT = {
  personaName: 'Independent salon owner Sam',
  roleLine: 'Runs a small salon and still coordinates bookings manually.',
  primarySegment: 'Independent salon owners with two to eight chairs',
  urgentProblem: 'Last-minute schedule changes create empty chairs and lost revenue.',
  buyingTrigger: 'A no-show or double booking disrupts a fully booked week.',
  nonFitSegment: 'Large salon chains with enterprise scheduling software',
  messagingHook: 'Keep every chair booked without chasing customers by phone.',
  validationStep: 'Interview five salon owners about their last costly schedule change.',
};

const ARTIFACT = {
  version: 5,
  generatedAt: '2026-08-02T12:00:00.000Z',
  founderInputs: {
    mode: 'fast',
    fastDescription: 'A booking app for independent salon owners.',
    guided: null,
  },
  draftDocument: {
    customer: { summary: 'An owner-operator responsible for keeping every chair productive.' },
    pain: { quote: 'One cancellation can leave a chair empty for hours.' },
    build: {
      valueProposition: 'Fill schedule gaps before they become lost revenue.',
      replaces: ['Phone calls', 'Paper calendars'],
    },
    decisionBrief: { currentAlternative: 'Phone calls and paper calendars' },
  },
};

for (const viewport of [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`homepage input and submit stay above the fold on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/', { waitUntil: 'commit' });
    const field = page.locator('#hero-idea-input');
    const submit = page.locator('.ct-hero__idea-send');
    const showcase = page.locator('.ct-hero__spotlight');
    await expect(field).toBeVisible();
    await expect(submit).toBeVisible();
    const fieldBox = await field.boundingBox();
    const submitBox = await submit.boundingBox();
    const showcaseBox = await showcase.boundingBox();
    expect(fieldBox && fieldBox.y + fieldBox.height).toBeLessThanOrEqual(viewport.height);
    expect(submitBox && submitBox.y + submitBox.height).toBeLessThanOrEqual(viewport.height);
    expect(showcaseBox?.y).toBeGreaterThanOrEqual(viewport.height);
  });
}

test('Idea resume keeps the compact brief through a deep failure and retries in place', async ({ page }) => {
  let deepRetried = false;
  await page.route('**/functions/v1/icp-analyzer', async (route) => {
    const request = route.request().postDataJSON() as { operation?: string };
    if (request.operation === 'retry_guest_deep') {
      deepRetried = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, artifactId: 'hero-guest-e2e', generationStatus: 'deep_running' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        artifactId: 'hero-guest-e2e',
        artifactType: 'icp',
        compact: COMPACT,
        artifact: deepRetried ? ARTIFACT : null,
        generationStatus: deepRetried ? 'deep_ready' : 'deep_failed',
        claimState: 'unclaimed',
        expiresAt: '2026-08-09T12:00:00.000Z',
      }),
    });
  });

  const token = 'hero-resume-token-that-is-long-enough-1234567890';
  await page.goto(`/?resume=${token}`, { waitUntil: 'commit' });

  await expect(page.getByText('Independent salon owner Sam')).toBeVisible();
  await expect(page.getByText(COMPACT.validationStep)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry deeper report' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save and continue free' })).toBeVisible();

  await page.getByRole('button', { name: 'Retry deeper report' }).click();
  await expect(page.getByText('Deep customer report ready')).toBeVisible();
  await page.getByText('Deep customer report ready').click();
  await expect(page.getByText(ARTIFACT.draftDocument.build.valueProposition)).toBeVisible();

  await page.getByRole('button', { name: 'Save and continue free' }).click();
  await expect(page.getByRole('dialog')).toContainText('Save your customer decision brief');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});
