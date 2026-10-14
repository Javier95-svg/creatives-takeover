import { test, expect, type Page } from '@playwright/test';

const description = 'A scheduling tool for independent hairdressers';
const token = 'a'.repeat(43);
const draft = { kind: 'demo_story', v: 1, description, productName: 'Hairdresser scheduling',
  brief: { audience: 'Independent hairdressers', problem: 'Missed appointments leave gaps', product_promise: 'Make scheduling easier', aha_moment: 'See the next appointment' },
  pitch: 'Keep appointments organized so you can focus on clients.',
  steps: ['Problem', 'Product action', 'Outcome'].map(title => ({ title, caption: `${title} for hairdressers`, speaker_notes: `Explain ${title.toLowerCase()} to the customer.`, hotspot_label: 'Continue', suggested_action: 'next' })) };
const compact = { personaName: 'Independent barber', roleLine: 'Runs their own shop', primarySegment: 'Barbers with recurring no-shows',
  urgentProblem: 'Empty appointment slots cost income', buyingTrigger: 'Another missed appointment', nonFitSegment: 'Large chains',
  messagingHook: 'Keep your chair booked', validationStep: 'Ask three barbers about their last missed appointment and what it cost them.' };
const ref = { artifactId: '20000000-0000-0000-0000-000000000001', resumeToken: token, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() };

async function mocks(page: Page, options: { failFirst?: boolean; delay?: number } = {}) {
  let generations = 0;
  let current = draft;
  const calls: Array<Record<string, unknown>> = [];
  await page.route('**/functions/v1/**', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    const body = route.request().postDataJSON() ?? {};
    calls.push({ name, ...body });
    if (name === 'demo-studio-generator' && body.mode === 'story') {
      generations++;
      if (options.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
      if (options.failFirst && generations === 1) return route.fulfill({ status: 502, json: { success: false, error: 'Story generation is temporarily unavailable.' } });
      return route.fulfill({ json: { success: true, draft: { ...draft, description: body.description } } });
    }
    if (body.operation === 'create_story') { current = body.draft; return route.fulfill({ json: { success: true, ...ref } }); }
    if (body.operation === 'load_story') return route.fulfill({ json: { success: true, draft: current, ...ref } });
    if (body.operation === 'start_hero_generation') return route.fulfill({ json: { success: true, ...ref, compact, generationStatus: 'deep_running' } });
    if (body.operation === 'load_guest_artifact') return route.fulfill({ json: { success: true, ...ref, compact, generationStatus: 'deep_failed' } });
    return route.fulfill({ json: { success: true, data: [] } });
  });
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  return { calls, generations: () => generations };
}

test('one Product sentence renders a copyable story in place; signup preserves it and login keeps the return', async ({ page, context }) => {
  const api = await mocks(page, { delay: 350 });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.getByRole('tab', { name: 'Idea', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Product', exact: true }).click();
  await page.getByRole('textbox', { name: 'What are you building?', exact: true }).fill(description);
  await page.getByRole('button', { name: 'Build my demo', exact: true }).dblclick();
  await expect(page.getByRole('heading', { name: draft.productName, exact: true })).toBeVisible();
  await page.locator('#get-started').screenshot({ path: '.cache/starting-experiences-desktop.png', animations: 'disabled' });
  expect(api.generations()).toBe(1);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Copy story', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(draft.pitch);
  await page.getByRole('button', { name: 'Save my demo story', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ct_demo_story_v1') || '{}').ref.resumeToken)).toBe(token);
  await page.getByRole('link', { name: 'I already have an account' }).click();
  await expect(page).toHaveURL(/\/login\?.*return=/);
  const returnPath = new URL(page.url()).searchParams.get('return');
  expect(returnPath).toBe(`/start/product?guest=${token}`);
  expect(api.calls.some(call => call.operation === 'create_story')).toBe(true);
});

test('refresh and corrections retain Product work without another generation', async ({ page }) => {
  const api = await mocks(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Product', exact: true }).click();
  await page.getByRole('textbox', { name: 'What are you building?', exact: true }).fill(description);
  await page.getByRole('button', { name: 'Build my demo', exact: true }).click();
  await expect(page.getByRole('heading', { name: draft.productName, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save my demo story' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByText('Edit your story (optional)', { exact: true }).click();
  await page.getByLabel('Customer', { exact: true }).fill('Mobile hairdressers');
  await page.reload();
  await expect(page.getByText('Mobile hairdressers', { exact: true }).first()).toBeVisible();
  expect(api.generations()).toBe(1);
  await page.getByRole('button', { name: 'Save my demo story' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const creates = api.calls.filter(call => call.operation === 'create_story');
  expect(creates).toHaveLength(2);
  expect((creates[1].draft as typeof draft).brief.audience).toBe('Mobile hairdressers');
});

test('Idea reveals its first test before signup, and deeper failure preserves the useful brief', async ({ page }) => {
  const api = await mocks(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Assess viability', exact: true }).click();
  await expect(page.locator('#hero-idea-input')).toBeFocused();
  await page.locator('#hero-idea-input').fill('An app that helps barbers reduce no-shows');
  await page.getByRole('button', { name: 'Assess viability', exact: true }).click();
  await expect(page.getByText(compact.validationStep, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry deeper report' })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(api.calls.filter(call => call.operation === 'start_hero_generation')).toHaveLength(1);
  await page.getByRole('button', { name: 'Save my brief', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Use email instead' }).click();
  await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Create a password', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').locator('input')).toHaveCount(2);
});

test('generation failure retries with the description retained', async ({ page }) => {
  const api = await mocks(page, { failFirst: true });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Product', exact: true }).click();
  await page.getByRole('textbox', { name: 'What are you building?', exact: true }).fill(description);
  await page.getByRole('button', { name: 'Build my demo', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
  await expect(page.getByRole('textbox', { name: 'What are you building?', exact: true })).toHaveValue(description);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: draft.productName, exact: true })).toBeVisible();
  expect(api.generations()).toBe(2);
});

test('original single input and toggle fit mobile, keyboard submits, and Join Today opens the same entry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mocks(page);
  await page.goto('/');
  await expect(page.locator('.ct-hero__idea-card')).toHaveCount(1);
  await expect(page.locator('.ct-start__card')).toHaveCount(0);
  await expect(page.locator('#hero-idea-input')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('.ct-hero__idea-card').screenshot({ path: '.cache/starting-experiences-mobile.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page.getByRole('link', { name: 'Join Today', exact: true }).click();
  await expect(page).toHaveURL(/#get-started$/);
  await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
  await page.getByRole('tab', { name: 'Product', exact: true }).click();
  await page.getByRole('textbox', { name: 'What are you building?', exact: true }).fill(description);
  await page.getByRole('textbox', { name: 'What are you building?', exact: true }).press('Enter');
  await expect(page.getByRole('heading', { name: draft.productName, exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('link', { name: 'Join Today', exact: true }).first().click();
  await expect(page).toHaveURL(/#get-started$/);
});

for (const authMethod of ['email', 'google'] as const) {
  test(`${authMethod} auth return automatically saves the exact Product story without another generation`, async ({ page }) => {
    const user = { id: '10000000-0000-0000-0000-000000000001', email: 'test@example.invalid', aud: 'authenticated',
      role: 'authenticated', created_at: '2025-01-01T00:00:00Z', app_metadata: { provider: authMethod === 'email' ? 'email' : 'google', providers: [authMethod] }, user_metadata: {} };
    const jwt = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fake`;
    const returnPath = `/start/product?guest=${token}`;
    await page.addInitScript(({ user, jwt, returnPath, authMethod }) => {
      localStorage.setItem('sb-dummy-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }));
      if (authMethod === 'google') {
        localStorage.setItem('oauth_return_url', returnPath);
        localStorage.setItem('oauth_source', 'hero-product-story');
        localStorage.setItem('oauth_signup_method', 'google');
      }
    }, { user, jwt, returnPath, authMethod });
    await page.route('**/auth/v1/user', route => route.fulfill({ json: user }));
    let claims = 0;
    let generations = 0;
    const projectId = '30000000-0000-0000-0000-000000000001';
    await page.route('**/functions/v1/**', route => {
      const body = route.request().postDataJSON() ?? {};
      if (body.mode === 'story') generations++;
      if (body.operation === 'load_story') return route.fulfill({ json: { success: true, draft, ...ref } });
      if (body.operation === 'claim_story') { claims++; return route.fulfill({ json: { success: true, projectId } }); }
      return route.fulfill({ json: { success: true } });
    });
    await page.route('**/rest/v1/**', route => {
      const path = new URL(route.request().url()).pathname;
      const single = route.request().headers().accept?.includes('application/vnd.pgrst.object');
      let row: unknown;
      if (path.endsWith('/profiles')) row = { id: user.id, created_at: user.created_at, username: 'test', user_type: 'founder', approval_status: 'approved',
        onboarding_completed: false, user_preferences: { requires_guided_onboarding: true, ...(claims ? { firstArtifactType: 'demo_studio_draft' } : {}) }, subscription_tier: 'rookie' };
      if (path.endsWith('/demo_studio_projects')) row = { id: projectId, owner_id: user.id, name: draft.productName, tagline: draft.pitch };
      if (path.endsWith('/demo_studio_briefs')) row = { id: projectId, project_id: projectId, owner_id: user.id, ...draft.brief, ai_storyboard: draft.steps, ai_launch_copy: {}, ai_vsl_scripts: [], primary_cta_label: 'Try it', tone: 'conversational', product_stage: 'prototype', demo_goal: 'collect_signups' };
      return route.fulfill({ json: single ? row ?? {} : row ? [row] : [] });
    });
    await page.goto(authMethod === 'google' ? '/auth/callback?code=mock-code' : `/auth/callback?return=${encodeURIComponent(returnPath)}`);
    await expect(page).toHaveURL(new RegExp(`/demo-studio/projects/${projectId}/brief`), { timeout: 35000 });
    expect(claims).toBe(1);
    expect(generations).toBe(0);
  });
}

test('an expired resume link explains recovery without asking for screenshots or account details', async ({ page }) => {
  await page.route('**/functions/v1/guest-activation-artifacts', route => route.fulfill({ status: 404, json: { success: false, error: 'This demo story has expired or is unavailable.' } }));
  await page.goto(`/start/product?guest=${token}`);
  await expect(page.getByRole('alert')).toContainText('expired');
  await expect(page.getByRole('link', { name: 'Back to the starting experiences' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

 test('mode switching keeps the original input and carries the selected mode into generation', async ({ page }) => {
  const api = await mocks(page);
  await page.goto('/');
  const field = page.locator('#hero-idea-input');
  await field.fill(description);
  await page.getByRole('tab', { name: 'Product', exact: true }).click();
  await expect(field).toHaveValue(description);
  await page.getByRole('tab', { name: 'Idea', exact: true }).click();
  await expect(field).toHaveValue(description);
  await expect(page.getByRole('button', { name: 'Assess viability', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Product', exact: true }).click();
  await page.getByRole('button', { name: 'Build my demo', exact: true }).click();
  await expect(page.getByRole('heading', { name: draft.productName, exact: true })).toBeVisible();
  expect(api.generations()).toBe(1);
  expect(api.calls.some(call => call.operation === 'start_hero_generation')).toBe(false);
  await expect(page).toHaveURL(/\/$/);
 });
