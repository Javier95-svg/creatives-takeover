import { expect, test, type Page, type Route } from '@playwright/test';

const encode = (value: Record<string, unknown>) => Buffer.from(JSON.stringify(value)).toString('base64url');
const fulfill = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function mockFounder(page: Page, enrolled: boolean) {
  const userId = '11111111-1111-4111-8111-111111111119';
  const now = Math.floor(Date.now() / 1000);
  const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'sprint@example.invalid', app_metadata: {}, user_metadata: { full_name: 'Sprint Founder' }, identities: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
  const session = { access_token: `${encode({ alg: 'HS256' })}.${encode({ sub: userId, role: 'authenticated', exp: now + 3600 })}.signature`, refresh_token: 'sprint-refresh', expires_at: now + 3600, expires_in: 3600, token_type: 'bearer', user };
  let activeSprint: Record<string, unknown> | null = null;
  const variants = [
    { key: 'discovery', label: 'Discovery-led', body: 'Hi {{first_name}}, may I learn how your team handles onboarding today?' },
    { key: 'problem', label: 'Problem-led', body: 'Hi {{first_name}}, is slow onboarding a priority for your team right now?' },
    { key: 'offer', label: 'Offer-led', body: 'Hi {{first_name}}, I am testing a fixed-scope onboarding audit for SaaS teams.' },
  ];
  const snapshot = () => ({
    version: 1, enrolled, sprint: activeSprint, contacts: [], availableContacts: [],
    cycleDefaults: { businessModel: 'b2b_saas', customerCount: 0, weeklyCapacityHours: 4, primaryGoal: 'Win a design partner' },
    ...(activeSprint ? { evidence: { attachedProspects: 0, contactedProspects: 0, replies: 0, conversations: 0, commitments: 0, payments: 0 }, targets: { prospects: 20, outreach: 10, conversations: 3, mentorCheckpoints: 1 }, linkedCall: null, derivedStep: 'target_list', awaitingFinalReview: false, canComplete: false } : {}),
  });

  await page.addInitScript(({ stored }) => localStorage.setItem('sb-dummy-auth-token', JSON.stringify(stored)), { stored: session });
  await page.route('**/rest/v1/**', (route) => fulfill(route, []));
  await page.route('**/auth/v1/user', (route) => fulfill(route, user));
  await page.route('**/rest/v1/founder_cycle_state**', (route) => fulfill(route, { beta_cohort: enrolled }));
  await page.route('**/rest/v1/profiles**', (route) => fulfill(route, null));
  await page.route('**/rest/v1/mentors**', (route) => fulfill(route, []));
  await page.route('**/rest/v1/rpc/get_founder_cycle_snapshot_v1*', (route) => fulfill(route, {
    version: 1, generatedAt: new Date().toISOString(), eligible: enrolled, betaCohort: enrolled,
    businessModel: 'b2b_saas', customerCount: 0, recommendedLoop: 'PROVE', selectedLoop: 'PROVE',
    assignmentReason: 'No commitment yet.', primaryGoal: 'Win a design partner', raiseActive: false,
    strongestEvidence: 'No evidence yet.', missingEvidence: ['Conversations'],
    evidence: { prospects: 0, qualifiedProspects: 0, outreachSent: 0, replies: 0, interviews: 0, commitments: 0, payingCustomers: 0, retentionSignals: 0, channelReviews: 0, thisWeek: 0 },
    primaryAction: { key: 'prospects', title: 'Add prospects', description: 'Build a list.', route: '/bizmap-ai', expectedEvidence: 'prospect_added', reason: 'Start with people.', priority: 3 }, secondaryActions: [],
  }));
  await page.route('**/rest/v1/rpc/get_first_customer_sprint_snapshot_v1*', (route) => fulfill(route, snapshot()));
  await page.route('**/rest/v1/rpc/start_first_customer_sprint_v1*', (route) => {
    activeSprint = {
      id: '22222222-2222-4222-8222-222222222222', founder_id: userId, status: 'active',
      starts_at: '2026-08-03T00:00:00Z', ends_at: '2026-09-02T00:00:00Z', business_model_snapshot: 'b2b_saas',
      customer_count_snapshot: 0, primary_goal_snapshot: 'Win a design partner', offer: 'Onboarding audit',
      target_segment: 'B2B SaaS operations teams', problem_hypothesis: 'Manual onboarding is slow',
      proof_url: null, proof_description: 'Clickable prototype', estimated_customer_value_usd: 2500,
      weekly_capacity_hours: 4, mentor_decision_question: 'Which buyer should I prioritize?', message_variants: variants,
      selected_message_variant: null, message_generation_count: 0, mentor_id: null, discovery_call_id: null,
      mentor_brief_version: 1, mentor_brief_snapshot: null, mentor_checkpoint_completed_at: null,
      mentor_recommendation_summary: null, final_decision: null, final_notes: null, completed_at: null,
      created_at: '2026-08-03T00:00:00Z', updated_at: '2026-08-03T00:00:00Z',
    };
    return fulfill(route, activeSprint);
  });
  await page.route('**/functions/v1/first-customer-sprint-assistant', (route) => {
    if (activeSprint) activeSprint.message_generation_count = 1;
    return fulfill(route, { variants, fallback: true, generationCount: 1 });
  });
}

test('signed-out visits preserve the sprint return path', async ({ page }) => {
  await page.goto('/first-customer-sprint');
  await expect(page).toHaveURL(/\/signup\?source=first-customer-sprint&return=%2Ffirst-customer-sprint/);
});

test('a signed-in founder outside the cohort sees the invite-only boundary', async ({ page }) => {
  await mockFounder(page, false);
  await page.goto('/first-customer-sprint');
  await expect(page.getByText('This sprint is currently invite-only')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start the 30-day sprint' })).toHaveCount(0);
});

test('an invited founder can complete intake and start the 30-day sprint', async ({ page }) => {
  await mockFounder(page, true);
  await page.goto('/first-customer-sprint');
  await page.getByLabel('Offer *').fill('Onboarding audit');
  await page.getByLabel('Target buyer *').fill('B2B SaaS operations teams');
  await page.getByLabel('Problem hypothesis *').fill('Manual onboarding is slow');
  await page.getByLabel('Or proof description *').fill('Clickable prototype');
  await page.getByLabel('Estimated customer value (USD) *').fill('2500');
  await page.getByRole('button', { name: 'Start the 30-day sprint' }).click();
  await expect(page.getByRole('heading', { name: 'First Customer Sprint' })).toBeVisible();
  await expect(page.getByText('Recommended next step')).toBeVisible();
  await expect(page.getByText('0/20').first()).toBeVisible();
});
