import { expect, test, type Page, type Route } from '@playwright/test';

const encode = (value: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const fulfillJson = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function mockAdaptiveOnboarding(page: Page, currentStep = 0) {
  const now = Math.floor(Date.now() / 1000);
  const userId = '22222222-2222-4222-8222-222222222222';
  const user = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'adaptive-founder@example.invalid',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'Adaptive Founder' },
    identities: [],
    created_at: '2026-07-30T12:00:00.000Z',
    updated_at: '2026-07-30T12:00:00.000Z',
  };
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
    sub: userId,
    email: user.email,
    role: 'authenticated',
  })}.test-signature`;
  const session = {
    access_token: accessToken,
    refresh_token: 'adaptive-refresh-token',
    expires_at: now + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user,
  };
  const profile = {
    id: userId,
    created_at: user.created_at,
    onboarding_completed: false,
    quiz_completed: false,
    subscription_tier: 'rookie',
    user_preferences: { requires_guided_onboarding: true },
  };
  const onboardingSession = {
    id: '33333333-3333-4333-8333-333333333333',
    user_id: userId,
    schema_version: 1,
    flow_version: 'adaptive_v1',
    rollout_variant: 'adaptive_v1',
    source: 'signup_redirect',
    plan_snapshot: 'rookie',
    device_snapshot: 'desktop',
    status: 'in_progress',
    current_step: currentStep,
    answers: currentStep >= 2
      ? {
          startupBrief: 'We help independent agencies turn client calls into approved project briefs.',
          businessModel: 'service',
        }
      : {},
    derived_context: null,
    started_at: '2026-07-30T12:00:00.000Z',
    completed_at: null,
    updated_at: '2026-07-30T12:00:00.000Z',
  };

  await page.addInitScript(({ storedSession }) => {
    window.localStorage.setItem('sb-dummy-auth-token', JSON.stringify(storedSession));
  }, { storedSession: session });

  await page.route('**/rest/v1/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/0' },
      body: route.request().method() === 'HEAD' ? '' : '[]',
    }),
  );
  await page.route('**/functions/v1/**', (route) => fulfillJson(route, {}));
  await page.route('**/auth/v1/user', (route) => fulfillJson(route, user));
  await page.route('**/rest/v1/profiles**', (route) => {
    const wantsObject = route.request().headers().accept?.includes('application/vnd.pgrst.object+json');
    return fulfillJson(route, wantsObject ? profile : [profile]);
  });
  await page.route('**/rest/v1/rpc/begin_onboarding_v1', (route) => fulfillJson(route, onboardingSession));
  await page.route('**/rest/v1/rpc/save_onboarding_progress_v1', (route) => fulfillJson(route, onboardingSession));
  await page.route('**/rest/v1/rpc/complete_onboarding_v1', (route) =>
    fulfillJson(route, { ...onboardingSession, status: 'completed', completed_at: new Date().toISOString() }),
  );
  await page.route('**/rest/v1/rpc/get_credit_wallet_v1*', (route) =>
    fulfillJson(route, {
      walletFound: true,
      persistentBalance: 0,
      monthlyQuotaRemaining: 50,
      heldCredits: 0,
      totalAvailable: 50,
      subscriptionTier: 'rookie',
      currentPeriodEnd: null,
    }),
  );
  await page.route('**/functions/v1/check-subscription', (route) =>
    fulfillJson(route, { subscribed: false, subscription_tier: 'rookie', subscription_end: null }),
  );
}

test('adaptive onboarding completes its seven-screen flow and opens the recommended action', async ({ page }) => {
  await mockAdaptiveOnboarding(page);
  await page.goto('/onboarding?source=signup_redirect');

  await page.getByPlaceholder(/We help independent agencies/i).fill(
    'We help independent agencies turn client calls into clear, approved project briefs.',
  );
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Agency, consultancy/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /No external evidence yet/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Validate an urgent customer problem/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /customer or problem is still too broad/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /About 5 hours/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Your Command Center focus is ready' })).toBeVisible();
  await expect(page.getByText('PROVE loop', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Open Define your first ICP/i }).click();
  await expect(page).toHaveURL(/\/icp-builder/);
});

test('server draft resumes on the persisted adaptive step', async ({ page }) => {
  await mockAdaptiveOnboarding(page, 2);
  await page.goto('/onboarding');

  await expect(page.getByRole('heading', { name: 'What is the strongest customer evidence you have?' })).toBeVisible();
  await expect(page.getByText('3 of 7', { exact: true })).toBeVisible();
});

// Feedback 2026-11-21: an account that opened the service provider form "to
// have a look" met it on every visit, with no way to close it.
test('an unfinished application can be closed and stops coming back', async ({ page }) => {
  await mockAdaptiveOnboarding(page);
  const userId = '22222222-2222-4222-8222-222222222222';
  let preferences: Record<string, unknown> = { requires_guided_onboarding: true };
  const profileWrites: Record<string, unknown>[] = [];
  // Registered after the shared mocks, so these take priority.
  await page.route('**/rest/v1/profiles**', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as { user_preferences?: Record<string, unknown> };
      profileWrites.push(body);
      if (body.user_preferences) preferences = body.user_preferences;
      return fulfillJson(route, []);
    }
    const profile = {
      id: userId,
      created_at: '2026-07-30T12:00:00.000Z',
      onboarding_completed: false,
      quiz_completed: false,
      subscription_tier: 'rookie',
      user_type: 'founder',
      dashboard_bootstrap_source: null,
      onboarding_steps_completed: null,
      user_preferences: preferences,
    };
    const wantsObject = route.request().headers().accept?.includes('application/vnd.pgrst.object+json');
    return fulfillJson(route, wantsObject ? profile : [profile]);
  });
  const providerSession = {
    id: '33333333-3333-4333-8333-333333333333',
    user_id: userId,
    schema_version: 1,
    flow_version: 'adaptive_v1',
    rollout_variant: 'adaptive_v1',
    source: 'dashboard_prompt',
    plan_snapshot: 'rookie',
    device_snapshot: 'desktop',
    status: 'in_progress',
    current_step: 0,
    answers: { situation: 'deliver_services', founderSegment: 'marketplace', entryStage: 'details', roleProfile: {} },
    derived_context: null,
    started_at: '2026-07-30T12:00:00.000Z',
    completed_at: null,
    updated_at: '2026-07-30T12:00:00.000Z',
  };
  await page.route('**/rest/v1/rpc/begin_onboarding_v1', (route) => fulfillJson(route, providerSession));
  await page.route('**/rest/v1/rpc/account_context**', (route) => fulfillJson(route, {
    userType: 'founder', approvalStatus: 'approved', hasCategoryAccess: true, roleProfile: {},
    requiresProject: false, hasProject: false, startupName: null, investorMatchVisible: false, investmentStage: null,
  }));
  await page.route('**/rest/v1/rpc/save_onboarding_progress_v1', (route) => fulfillJson(route, providerSession));

  // Before: opening the site signed in leads back to the application.
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole('heading', { name: 'Apply as a service provider' })).toBeVisible();
  await page.screenshot({ path: 'test-results/onboarding-close-before.png' });

  await page.getByRole('button', { name: 'Close setup and finish it later' }).click();
  await expect(page).not.toHaveURL(/\/onboarding/, { timeout: 15_000 });
  expect(profileWrites).toHaveLength(1);
  expect(profileWrites[0].user_preferences).toMatchObject({
    requires_guided_onboarding: true,
    onboarding_dismissed_at: expect.any(String),
  });

  await page.screenshot({ path: 'test-results/onboarding-close-after.png' });
  // After: coming back does not reopen it.
  await page.goto('/');
  await page.waitForTimeout(3_000);
  await expect(page).not.toHaveURL(/\/onboarding/);
  await expect(page.getByRole('heading', { name: 'Apply as a service provider' })).toHaveCount(0);
});
