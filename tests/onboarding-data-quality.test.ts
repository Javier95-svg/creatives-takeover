import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  deriveUrgencyBand,
  EMPTY_ONBOARDING_ANSWERS_V1,
  normalizeWorkingDays,
  type OnboardingAnswersV1,
} from '../src/lib/onboardingContext.ts';
import { createRoutineConfig } from '../src/lib/routineTemplates.ts';
import {
  allowsExploration,
  contextSegmentKeys,
  rankWithCollectiveEvidence,
  urgencyAdjustment,
  type LearningCandidate,
} from '../supabase/functions/_shared/recommendation-policy-v2.ts';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

const answersWith = (patch: Partial<OnboardingAnswersV1>): OnboardingAnswersV1 => ({
  ...EMPTY_ONBOARDING_ANSWERS_V1,
  ...patch,
});

test('runway maps to the urgency band that drives prioritization', () => {
  assert.equal(deriveUrgencyBand(answersWith({ runwayMonths: 'under_3' })), 'critical');
  assert.equal(deriveUrgencyBand(answersWith({ runwayMonths: '3_6' })), 'high');
  assert.equal(deriveUrgencyBand(answersWith({ runwayMonths: '6_12' })), 'moderate');
  assert.equal(deriveUrgencyBand(answersWith({ runwayMonths: 'over_12' })), 'stable');
  assert.equal(deriveUrgencyBand(answersWith({ runwayMonths: 'not_applicable' })), 'stable');
});

test('an unstated runway never fabricates urgency, but an active raise imposes it', () => {
  assert.equal(deriveUrgencyBand(answersWith({})), 'stable');
  // The raise itself is a deadline even when the bank account is comfortable.
  assert.equal(
    deriveUrgencyBand(answersWith({ fundraisingStatus: 'raising_now' })),
    'high',
  );
  assert.equal(
    deriveUrgencyBand(answersWith({ runwayMonths: 'over_12', fundraisingStatus: 'raising_now' })),
    'moderate',
  );
  // A short runway is not softened by a comfortable fundraising status.
  assert.equal(
    deriveUrgencyBand(answersWith({ runwayMonths: 'under_3', fundraisingStatus: 'not_now' })),
    'critical',
  );
});

test('working days are de-duplicated, ordered, and stripped of out-of-range values', () => {
  assert.deepEqual(normalizeWorkingDays([5, 1, 1, 3]), [1, 3, 5]);
  assert.deepEqual(normalizeWorkingDays([7, -1, 2.5, 'x', null]), []);
  assert.deepEqual(normalizeWorkingDays(undefined), []);
  assert.deepEqual(normalizeWorkingDays([0, 6]), [0, 6]);
});

test('a routine is scheduled on the days the founder actually works', () => {
  const weekendFounder = createRoutineConfig('validate_idea', new Date(), 20, [0, 6]);
  for (const task of weekendFounder.tasks) {
    assert.ok(
      task.days.every((day) => day === 0 || day === 6),
      `${task.id} scheduled on ${task.days.join(',')}, outside the founder's weekend`,
    );
    assert.ok(task.days.length > 0, `${task.id} has no scheduled day`);
  }
});

test('omitting working days preserves the existing Monday-to-Friday templates', () => {
  const now = new Date('2026-07-30T00:00:00.000Z');
  const withoutDays = createRoutineConfig('launch_product', now, 20);
  const explicitWeekdays = createRoutineConfig('launch_product', now, 20, [1, 2, 3, 4, 5]);
  assert.deepEqual(
    withoutDays.tasks.map((task) => task.days),
    explicitWeekdays.tasks.map((task) => task.days),
  );
});

test('reduced capacity thins secondary tasks without clustering them on one day', () => {
  const lightWeek = createRoutineConfig('validate_idea', new Date(), 5, [1, 2, 3, 4, 5]);
  const secondaryDaily = lightWeek.tasks.filter(
    (task) => task.cadence === 'daily' && task.order > 0,
  );
  assert.ok(secondaryDaily.length > 0, 'expected a secondary daily task to thin');
  for (const task of secondaryDaily) {
    assert.ok(task.days.length <= 3, `${task.id} kept ${task.days.length} days at 5h capacity`);
    assert.equal(new Set(task.days).size, task.days.length, `${task.id} repeated a day`);
  }
});

test('the urgency segment is appended so existing priors keep their meaning', () => {
  const context = {
    stage: 3,
    goal: 'win_first_customer',
    blocker: 'prospect_access',
    capacityBand: 'light',
    plan: 'starter',
    urgencyBand: 'critical',
  };
  const keys = contextSegmentKeys(context);

  // Every previously aggregated key must survive byte-identical, in position.
  assert.deepEqual(keys.slice(0, 5), [
    'global',
    'stage:3',
    'stage:3|goal:win_first_customer',
    'stage:3|goal:win_first_customer|blocker:prospect_access',
    'stage:3|goal:win_first_customer|blocker:prospect_access|capacity:light|plan:starter',
  ]);
  assert.equal(
    keys[5],
    'stage:3|goal:win_first_customer|blocker:prospect_access|capacity:light|plan:starter|urgency:critical',
  );
});

test('a missing urgency degrades to "unknown" rather than dropping the segment', () => {
  const keys = contextSegmentKeys({ stage: 1, goal: 'validate_problem', blocker: 'customer_clarity' });
  assert.equal(keys.length, 6);
  assert.match(keys[5], /\|urgency:unknown$/);
});

test('the SQL segment builder stays in lockstep with the TypeScript one', async () => {
  const migration = await read(
    '../supabase/migrations/20260801130000_recommendation_urgency_segment_v2.sql',
  );
  // Both sides write and read the same keys; a drift here silently splits the
  // learning set between the aggregator and the ranker.
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.recommendation_segment_keys_v1/);
  assert.match(migration, /\|\| '\|urgency:' \|\| COALESCE\(NULLIF\(p_context->>'urgencyBand', ''\), 'unknown'\)/);
  assert.match(migration, /\|\| '\|plan:' \|\| COALESCE\(NULLIF\(p_context->>'plan', ''\), 'rookie'\)/);
  // The context provider must actually emit the key the segment builder reads.
  assert.match(migration, /'urgencyBand', v_urgency/);
  assert.match(migration, /WHEN 'under_3' THEN 'critical'/);
});

test('abandoning onboarding records the drop without discarding the answers', async () => {
  const migration = await read(
    '../supabase/migrations/20260801120000_onboarding_data_quality_v1.sql',
  );
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.abandon_onboarding_v1/);
  // status must stay 'in_progress' -- the partial unique index is what lets a
  // returning founder resume the same session instead of starting over.
  assert.match(migration, /SET\s+abandoned_at = now\(\)/);
  assert.doesNotMatch(migration, /SET[\s\S]{0,120}status = 'abandoned'/);
  assert.match(migration, /AND status = 'in_progress'/);
  assert.match(migration, /':abandoned:' \|\| p_current_step::text/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.abandon_onboarding_v1/);
});

test('both onboarding flows record a resumable drop marker and a timezone', async () => {
  const [control, adaptive] = await Promise.all([
    read('../src/components/OnboardingForm.tsx'),
    read('../src/components/AdaptiveOnboardingForm.tsx'),
  ]);

  for (const [name, source] of [['control', control], ['adaptive', adaptive]] as const) {
    assert.match(source, /abandonOnboardingSession\(/, `${name} flow lost its drop marker`);
    assert.match(source, /timezone: getBrowserTimezone\(\)/, `${name} flow lost timezone capture`);
  }

  // The adaptive teardown must not list currentStep as a dependency: its
  // cleanup would then fire an abandonment on every forward step.
  const teardown = adaptive.slice(
    adaptive.indexOf('const startedAt = startedAtRef.current;'),
  );
  const deps = teardown.slice(teardown.indexOf('};'), teardown.indexOf('};') + 200);
  assert.doesNotMatch(deps, /\[currentStep/);
});

test('runway tilts ranking toward revenue work without overriding evidence', () => {
  // A short runway favours getting paid over building.
  assert.ok(urgencyAdjustment('gtm_strategist', 'critical') > 0);
  assert.ok(urgencyAdjustment('traction_engine', 'critical') > 0);
  assert.ok(urgencyAdjustment('mvp_builder', 'critical') < 0);
  assert.ok(urgencyAdjustment('tech_stack', 'critical') < 0);

  // Pressure scales down as runway lengthens, and vanishes when stable.
  assert.ok(
    urgencyAdjustment('gtm_strategist', 'critical') > urgencyAdjustment('gtm_strategist', 'high'),
  );
  assert.equal(urgencyAdjustment('gtm_strategist', 'stable'), 0);
  assert.equal(urgencyAdjustment('gtm_strategist', null), 0);

  // Unclassified families are left alone rather than guessed at.
  assert.equal(urgencyAdjustment('find_mentor', 'critical'), 0);

  // Denominated in base-rank steps, and capped at one step so a family can move
  // past its neighbour without leaping the whole list.
  assert.ok(Math.abs(urgencyAdjustment('mvp_builder', 'critical')) <= 1);
});

test('exploration is suppressed only for founders who cannot afford it', () => {
  assert.equal(allowsExploration('critical'), false);
  assert.equal(allowsExploration('high'), true);
  assert.equal(allowsExploration('moderate'), true);
  assert.equal(allowsExploration('stable'), true);
  assert.equal(allowsExploration(null), true);
});

test('a critical runway reorders the ranking on day one, with no priors at all', () => {
  const candidates: LearningCandidate[] = [
    { key: 'build', urgency: 'high', reasonCodes: [], estimatedMinutes: 30, toolKey: 'mvp_builder' },
    { key: 'sell', urgency: 'high', reasonCodes: [], estimatedMinutes: 30, toolKey: 'gtm_strategist' },
  ];
  const shared = {
    candidates,
    baseOrder: ['build', 'sell'],
    priors: new Map(),
    recentExposures: [],
    tuning: {
      explorationPercent: 5,
      explorationMinSamples: 3,
      maxExplorationNegativeRate: 0.2,
      frequencyWindowDays: 7,
      frequencyCap: 3,
      diversityWindowDays: 3,
      repeatPenalty: 0.1,
    },
  };

  // With no pressure the deterministic base order stands.
  assert.deepEqual(
    rankWithCollectiveEvidence({ ...shared, urgencyBand: 'stable' }).orderedCandidateKeys,
    ['build', 'sell'],
  );
  // With two months of runway, selling outranks building.
  assert.deepEqual(
    rankWithCollectiveEvidence({ ...shared, urgencyBand: 'critical' }).orderedCandidateKeys,
    ['sell', 'build'],
  );
});

test('Core Metrics never invents runway or revenue', async () => {
  const source = await read('../src/components/dashboard/CoreMetrics.tsx');
  // The original bug: a hardcoded 12-month runway shown to every founder next
  // to advice about raising before hitting 6 months.
  assert.doesNotMatch(source, /const runwayMonths = \d+;/);
  assert.doesNotMatch(source, /Placeholder/);
  // Runway is only rendered when it came from the founder.
  assert.match(source, /typeof reportedRunway === 'number'/);
  assert.match(source, /RUNWAY_BAND_FLOOR/);
  // Revenue seeds from the reported band instead of defaulting everyone to 0.
  assert.match(source, /REVENUE_BAND_SEED/);
  // An explicit goal the founder set here always wins over the seed.
  assert.match(source, /goals\?\.find\(g => g\.goal_type === 'revenue'\) \|\|/);
});

test('the focus editor can reach every field the routine and ranking depend on', async () => {
  const source = await read('../src/components/dashboard/DashboardFocusEditor.tsx');
  // Existing founders complete onboarding before these questions existed, so
  // the editor is their only route to them.
  assert.match(source, /WORKING_DAY_OPTIONS/);
  assert.match(source, /workingDays: normalizeWorkingDays\(draft\.workingDays\)/);
  assert.match(source, /runwayMonths: draft\.runwayMonths/);
});

test('the adaptive rollout is ramped and stays server-owned', async () => {
  const migration = await read(
    '../supabase/migrations/20260801120000_onboarding_data_quality_v1.sql',
  );
  assert.match(migration, /UPDATE public\.onboarding_rollout_config/);
  assert.match(migration, /adaptive_percent = 50/);
  // Guard the ramp: re-running must never walk the percentage back down.
  assert.match(migration, /AND adaptive_percent < 50/);
});
