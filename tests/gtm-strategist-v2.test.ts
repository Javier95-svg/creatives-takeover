import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  GTM_CHANNEL_REGISTRY,
  createLegacyUpgradeIntake,
  deriveWeeklyReview,
  inferMotion,
  rankChannelDefinitions,
  scoreChannelDefinition,
  type GTMIntakeV2,
  type GTMPlay,
} from '../src/lib/gtmV2.ts';

const intake = (overrides: Partial<GTMIntakeV2> = {}): GTMIntakeV2 => ({
  productName: 'Signal Desk',
  productUrl: 'https://example.com',
  lifecycle: 'live',
  businessModel: 'b2b_saas',
  targetSegment: 'Revenue leaders at 20–100 person SaaS companies',
  geography: 'United States',
  problem: 'Teams cannot identify buying signals quickly.',
  solution: 'A signal workspace that prioritizes accounts.',
  buyerRole: 'VP Revenue',
  userRole: 'Growth operator',
  buyingTrigger: 'Pipeline coverage falls below target.',
  pricing: '$500/month',
  averageCustomerValue: 6000,
  currentTraction: '12 paying customers from founder outreach',
  weeklyTimeHours: 8,
  monthlyBudget: 800,
  founderStrengths: ['Writing', 'Networking', 'Cold outreach'],
  knownCompetitors: ['Legacy spreadsheets'],
  sixWeekOutcome: 'Book 20 qualified demos',
  salesCycle: '30 days',
  ...overrides,
});

test('branches to model-specific GTM motions', () => {
  assert.equal(inferMotion(intake()), 'sales_assisted');
  assert.equal(inferMotion(intake({ averageCustomerValue: 4999 })), 'founder_led_sales');
  assert.equal(inferMotion(intake({ businessModel: 'marketplace' })), 'marketplace_liquidity');
  assert.equal(inferMotion(intake({ businessModel: 'ecommerce' })), 'transactional');
  assert.equal(inferMotion(intake({ businessModel: 'media' })), 'audience_led');
});

test('applies hard eligibility before deterministic score ranking', () => {
  const paid = GTM_CHANNEL_REGISTRY.find((channel) => channel.id === 'paid-acquisition');
  assert.ok(paid);
  const result = scoreChannelDefinition(paid, intake({ businessModel: 'b2c_product', averageCustomerValue: 40, monthlyBudget: 100 }));
  assert.equal(result.eligible, false);
  assert.match(result.rejectionReason ?? '', /\$500/);
  assert.ok(result.score <= 49);

  const ranked = rankChannelDefinitions(intake());
  const firstRejected = ranked.findIndex((channel) => !channel.eligible);
  assert.ok(firstRejected > 0);
  assert.ok(ranked.slice(0, firstRejected).every((channel) => channel.eligible));
});

test('uses the documented 25/25/20/15/15 score arithmetic', () => {
  const outreach = GTM_CHANNEL_REGISTRY.find((channel) => channel.id === 'founder-outreach');
  assert.ok(outreach);
  const result = scoreChannelDefinition(outreach, intake(), { audienceEvidence: 80, tractionEvidence: 60 });
  const expected = Math.round(
    result.breakdown.audienceEvidence * 0.25 +
    result.breakdown.motionEconomicsFit * 0.25 +
    result.breakdown.tractionEvidence * 0.20 +
    result.breakdown.founderConstraints * 0.15 +
    result.breakdown.founderStrengths * 0.15,
  );
  assert.equal(result.score, expected);
});

test('normalizes a V1 brief into an explicit upgrade intake', () => {
  const normalized = createLegacyUpgradeIntake({
    planTitle: 'Acme GTM Strategy Plan',
    intakeAnswers: {
      businessType: 'E-commerce',
      targetAudience: 'Independent runners',
      problemAndSolution: 'Better recovery equipment',
      currentTraction: '40 orders',
      weeklyTimeForMarketing: '8 hours',
      budget: '$1,200/month',
    },
  });
  assert.equal(normalized.businessModel, 'ecommerce');
  assert.equal(normalized.targetSegment, 'Independent runners');
  assert.equal(normalized.weeklyTimeHours, 8);
  assert.equal(normalized.monthlyBudget, 1200);
});

test('weekly reviews never invent a decision without Traction evidence', () => {
  const play: GTMPlay = {
    id: 'play-1', channelId: 'founder-outreach', channelName: 'Founder outreach', status: 'active',
    audience: 'VP Revenue', buyingTrigger: 'Pipeline gap', offer: 'Diagnostic', message: 'Message',
    hypothesis: 'Five conversations', actions: ['Build list'], metric: 'Qualified conversations', target: 5,
    weeklyTimeHours: 4, weeklyBudget: 0, requiredAssets: [], recommendedDirectoryIds: [],
  };
  const empty = deriveWeeklyReview({ planId: 'plan-1', weekStart: '2026-07-13', activePlay: play });
  assert.equal(empty.decision, 'collect_evidence');
  assert.match(empty.nextBestAction, /Run and log/);

  const measured = deriveWeeklyReview({
    planId: 'plan-1', weekStart: '2026-07-13', activePlay: play,
    latestExperiment: { id: 'experiment-1', decision: 'kill', pass: true, resultValue: 7, targetValue: 5 },
  });
  assert.equal(measured.decision, 'kill');
  assert.equal(measured.tractionExperimentId, 'experiment-1');
});

test('migration and handoffs preserve ownership, versions, and exact source IDs', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260714120000_gtm_strategist_v2.sql', import.meta.url), 'utf8');
  const traction = readFileSync(new URL('../src/pages/TractionEnginePage.tsx', import.meta.url), 'utf8');
  const directories = readFileSync(new URL('../src/components/launch/DirectoriesTab.tsx', import.meta.url), 'utf8');
  const analyzer = readFileSync(new URL('../supabase/functions/gtm-analyzer/index.ts', import.meta.url), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.gtm_plan_versions/);
  assert.match(migration, /source_gtm_plan_id/);
  assert.match(migration, /source_gtm_play_id/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(traction, /\.eq\('plan_id', gtmPlanId\)/);
  assert.match(traction, /source_gtm_play_id: gtmSource/);
  assert.match(directories, /\.eq\('user_id', user\.id\)/);
  assert.match(analyzer, /schemaVersion === 2/);
  assert.match(analyzer, /checkAndDeductCredits/);
  assert.match(analyzer, /resolveCreditIdempotencyKey/);
});

test('fresh GTM visits require intake and omit the redundant related-tools section', () => {
  const hook = readFileSync(new URL('../src/hooks/useGTMStrategist.ts', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/pages/GTMStrategistPage.tsx', import.meta.url), 'utf8');
  const restoreStart = hook.indexOf('const loadExistingPlan');
  const restoreEnd = hook.indexOf('const loadPrefillData');
  const restoreFlow = hook.slice(restoreStart, restoreEnd);
  assert.ok(restoreStart >= 0 && restoreEnd > restoreStart);
  assert.doesNotMatch(restoreFlow, /setPhase\('results'\)/);
  assert.match(restoreFlow, /setPrefillV2/);
  assert.doesNotMatch(page, /RelatedToolsSection/);
});
