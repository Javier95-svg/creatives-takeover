import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  deriveOnboardingContextV1,
  deriveStageAnswersFromOnboarding,
  isAdaptiveOnboardingComplete,
  requiresCofounderSituation,
  requiresCustomerCount,
  requiresFundraisingStatus,
  type OnboardingAnswersV1,
} from '../src/lib/onboardingContext.ts';
import { createRoutineConfig } from '../src/lib/routineTemplates.ts';

const completeAnswers: OnboardingAnswersV1 = {
  startupBrief: 'We help independent agencies turn client calls into clear, approved project briefs.',
  businessModel: 'service',
  evidenceState: 'payment',
  customerCountBand: '2',
  primaryGoal: 'reach_three_customers',
  blocker: 'sales_conversion',
  weeklyCapacityHours: 5,
  fundraisingStatus: '',
  cofounderSituation: '',
  sectors: ['SaaS'],
  country: '',
  selectedIntent: 'plan_gtm',
};

test('adaptive branches require only relevant follow-up answers', () => {
  assert.equal(requiresCustomerCount('payment'), true);
  assert.equal(requiresCustomerCount('conversations'), false);
  assert.equal(requiresFundraisingStatus('raise', 'messaging'), true);
  assert.equal(requiresFundraisingStatus('launch', 'fundraising'), true);
  assert.equal(requiresCofounderSituation('team'), true);
  assert.equal(requiresCofounderSituation('sales_conversion'), false);
  assert.equal(isAdaptiveOnboardingComplete(completeAnswers), true);
  assert.equal(isAdaptiveOnboardingComplete({ ...completeAnswers, startupBrief: 'too short' }), false);
});

test('context derives SELL loop, stage, recommendation decision, and sales routine', () => {
  const context = deriveOnboardingContextV1(completeAnswers);
  const stageAnswers = deriveStageAnswersFromOnboarding(completeAnswers);

  assert.equal(context.founderLoop, 'SELL');
  assert.equal(context.routineGoal, 'grow_audience');
  assert.equal(context.selectedIntent, 'plan_gtm');
  assert.equal(context.recommendationAccepted, true);
  assert.equal(stageAnswers.tractionSignal, 'revenue');
  assert.equal(stageAnswers.mainFocus, 'launch_market');
});

test('adaptive evidence maps conservatively to operating maturity boundaries', () => {
  const stageFor = (
    evidenceState: OnboardingAnswersV1['evidenceState'],
    customerCountBand: OnboardingAnswersV1['customerCountBand'] = '',
  ) => deriveOnboardingContextV1({
    ...completeAnswers,
    evidenceState,
    customerCountBand,
    primaryGoal: 'raise',
    blocker: 'fundraising',
    fundraisingStatus: 'preparing',
    selectedIntent: 'analyze_pitch_deck',
  });

  assert.equal(stageFor('none').operatingStage, 1);
  assert.equal(stageFor('replies').operatingStage, 2);
  assert.equal(stageFor('conversations').operatingStage, 3);
  assert.equal(stageFor('commitment', '1').operatingStage, 4);
  assert.equal(stageFor('payment', '1').operatingStage, 5);
  assert.equal(stageFor('repeatable_growth', '4_plus').operatingStage, 6);
  assert.equal(stageFor('none').capitalMotion, 'preparing');
});

test('fundraising and team answers map to truthful specialized context', () => {
  const raise = deriveOnboardingContextV1({
    ...completeAnswers,
    evidenceState: 'commitment',
    customerCountBand: '1',
    primaryGoal: 'raise',
    blocker: 'fundraising',
    fundraisingStatus: 'raising_now',
    selectedIntent: 'analyze_pitch_deck',
  });
  assert.equal(raise.recommendedIntent, 'analyze_pitch_deck');
  assert.equal(raise.routineGoal, 'raise_funding');

  const team = deriveOnboardingContextV1({
    ...completeAnswers,
    evidenceState: 'none',
    customerCountBand: '',
    primaryGoal: 'build_product',
    blocker: 'team',
    cofounderSituation: 'actively_looking',
    selectedIntent: 'find_mentor',
  });
  assert.equal(team.routineGoal, 'find_cofounders');
});

test('routine templates are capacity-sized without changing their goal', () => {
  const lowCapacity = createRoutineConfig('launch_product', new Date('2026-07-30T00:00:00.000Z'), 2);
  const mediumCapacity = createRoutineConfig('launch_product', new Date('2026-07-30T00:00:00.000Z'), 5);
  const highCapacity = createRoutineConfig('launch_product', new Date('2026-07-30T00:00:00.000Z'), 20);

  assert.equal(lowCapacity.primaryGoal, 'launch_product');
  assert.equal(lowCapacity.tasks.length, 2);
  assert.equal(mediumCapacity.tasks.length, 3);
  assert.deepEqual(mediumCapacity.tasks[1].days, [1, 3, 5]);
  assert.equal(highCapacity.tasks.length, 3);
  assert.deepEqual(highCapacity.tasks[1].days, [1, 2, 3, 4, 5]);
});

test('canonical migration enforces RLS, atomic completion, idempotency, cohorts, and PII boundaries', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260730120000_onboarding_command_center_context_v1.sql', import.meta.url),
    'utf8',
  );

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.onboarding_sessions/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.begin_onboarding_v1/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.save_onboarding_progress_v1/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.complete_onboarding_v1/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /IF v_session\.status = 'completed' THEN[\s\S]*RETURN v_session/);
  assert.match(sql, /onboarding_completed = true/);
  assert.match(sql, /get_onboarding_dashboard_outcomes_v1/);
  assert.match(sql, /maturedD7Users/);
  assert.match(sql, /recommendationDecision/);

  for (const event of ['onboarding_started', 'onboarding_step_completed', 'onboarding_completed', 'onboarding_focus_updated']) {
    const match = sql.match(new RegExp(
      `'${event}',\\s*jsonb_build_object\\(([\\s\\S]*?)\\)\\s*,\\s*'/(?:onboarding|dashboard)'`,
    ));
    assert.ok(match, `${event} must have a durable structured payload`);
    assert.doesNotMatch(match[1], /startupBrief|startup_brief|country|full_name|email/);
  }
});

test('unrelated setup surfaces cannot complete canonical onboarding', async () => {
  const [profileChecklist, cofounder, day1, pathGate, onboardingPage, form] = await Promise.all([
    readFile(new URL('../src/components/OnboardingChecklist.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ai-cofounder/CofounderOnboarding.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/dashboard/Day1Welcome.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/onboarding/OnboardingPathGate.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Onboarding.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/OnboardingForm.tsx', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(profileChecklist, /update\(\{\s*onboarding_completed:\s*true/);
  assert.doesNotMatch(cofounder, /(?<!cofounder_)onboarding_completed:\s*true/);
  assert.doesNotMatch(day1, /onboarding_completed:\s*true/);
  assert.doesNotMatch(pathGate, /onboarding_completed:\s*true/);
  assert.match(day1, /onboarding_steps_completed/);
  assert.match(pathGate, /withOnboardingPathCompleted/);
  assert.match(onboardingPage, /beginOnboardingSession/);
  assert.match(form, /completeOnboardingSession/);
  assert.match(form, /const founderCycleEnabled = false/);
});

test('dashboard personalization and feedback preserve the standardized shell', async () => {
  const [dashboard, mission, journey, feedback, analytics] = await Promise.all([
    readFile(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/functions/generate-daily-mission/index.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/founderJourney.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/dashboard/RecommendationFeedback.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(dashboard, /<DashboardTodayCockpit \/>[\s\S]*<FounderJourneyPanel \/>[\s\S]*<DashboardFocusEditor \/>/);
  assert.match(mission, /startupBrief/);
  assert.match(mission, /weeklyCapacityHours/);
  assert.match(mission, /founderLoop/);
  assert.match(journey, /onboardingContext\.selectedIntent/);
  assert.match(feedback, /already_completed/);
  assert.match(feedback, /wrong_stage/);
  assert.match(feedback, /wrong_goal/);
  assert.match(feedback, /too_much_time/);
  assert.match(analytics, /'startupBrief'/);
  assert.match(analytics, /'country'/);
});
