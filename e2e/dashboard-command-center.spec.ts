import { expect, test, type Page, type Route } from '@playwright/test';

type Plan = 'rookie' | 'starter' | 'rising' | 'pro';

const MODE_LABELS: Record<Plan, string> = {
  rookie: 'PROVE Preview',
  starter: 'PROVE Mode',
  rising: 'SELL + GROW Mode',
  pro: 'Expert Execution Mode',
};

const encode = (value: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const fulfillJson = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

async function mockCommandCenter(page: Page, plan: Plan) {
  const now = Math.floor(Date.now() / 1000);
  const userId = `11111111-1111-4111-8111-11111111111${plan === 'rookie' ? 1 : plan === 'starter' ? 2 : plan === 'rising' ? 3 : 4}`;
  const email = `dashboard-${plan}@example.invalid`;
  const user = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'Dashboard Founder' },
    identities: [],
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
    sub: userId,
    email,
    role: 'authenticated',
    user_metadata: user.user_metadata,
  })}.test-signature`;
  const session = {
    access_token: accessToken,
    refresh_token: `dashboard-${plan}-refresh-token`,
    expires_at: now + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user,
  };
  const profile = {
    id: userId,
    created_at: user.created_at,
    onboarding_completed: true,
    onboarding_steps_completed: ['profile', 'intent'],
    quiz_completed: true,
    quiz_current_stage: 'ideation',
    quiz_biggest_challenge: 'validation',
    dashboard_bootstrap_source: 'guided_onboarding',
    subscription_tier: plan,
    routine_config: null,
    routine_primary_goal: null,
    routine_reminder_preferences: null,
    creative_niche: null,
    business_stage: null,
    startup_stage: null,
    startup_name: null,
    startup_industry: null,
    sidebar_preferences: null,
    user_preferences: {
      activationIntent: 'run_icp',
      activationGateVariant: 'forced_gate',
      requires_guided_onboarding: true,
      onboarding_path: 'icp',
      onboarding_path_completed: true,
    },
  };

  await page.addInitScript(({ storedSession }) => {
    window.localStorage.setItem('sb-dummy-auth-token', JSON.stringify(storedSession));
    window.localStorage.setItem(`ct_dashboard_tour_done_${storedSession.user.id}`, '1');
  }, { storedSession: session });

  await page.route('**/rest/v1/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/0' },
      body: route.request().method() === 'HEAD' ? '' : '[]',
    }),
  );
  await page.route('**/functions/v1/**', (route) =>
    fulfillJson(route, { code: 'NOT_MOCKED' }, 404),
  );
  await page.route('**/auth/v1/user', (route) => fulfillJson(route, user));
  await page.route('**/rest/v1/profiles**', (route) => {
    if (route.request().method() !== 'GET') return fulfillJson(route, []);
    const wantsObject = route.request().headers().accept?.includes('application/vnd.pgrst.object+json');
    return fulfillJson(route, wantsObject ? profile : [profile]);
  });
  await page.route('**/rest/v1/rpc/get_credit_wallet_v1*', (route) =>
    fulfillJson(route, {
      walletFound: true,
      persistentBalance: 0,
      monthlyQuotaRemaining: plan === 'rookie' ? 50 : plan === 'starter' ? 100 : plan === 'rising' ? 250 : 600,
      heldCredits: 0,
      totalAvailable: plan === 'rookie' ? 50 : plan === 'starter' ? 100 : plan === 'rising' ? 250 : 600,
      subscriptionTier: plan,
      currentPeriodEnd: null,
    }),
  );
  await page.route('**/functions/v1/check-subscription', (route) =>
    fulfillJson(route, {
      subscribed: plan !== 'rookie',
      subscription_tier: plan,
      subscription_end: null,
    }),
  );
}

for (const plan of ['rookie', 'starter', 'rising', 'pro'] as const) {
  test(`${plan} receives the canonical command center without losing its plan identity`, async ({ page }) => {
    await mockCommandCenter(page, plan);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Command Center', { exact: true })).toBeVisible();
    await expect(page.getByText(MODE_LABELS[plan], { exact: true })).toBeVisible();
    await expect(page.getByText('Finish your first result', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome back, Dashboard.' })).toBeVisible();
    await expect(page.getByText('Startup journey', { exact: true })).toBeVisible();
    await expect(page.getByText('Complete your first action to unlock your full dashboard.')).toHaveCount(0);
  });
}

test('first-result banner stacks without horizontal overflow on mobile', async ({ page }) => {
  await mockCommandCenter(page, 'rookie');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');

  const bannerHeading = page.getByText('Finish your first result', { exact: true });
  await expect(bannerHeading).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome back, Dashboard.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /ICP quickstart/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
