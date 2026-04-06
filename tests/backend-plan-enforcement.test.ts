import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizePlan,
  PLAN_MONTHLY_CREDITS,
  resolveFeatureEnforcement,
} from '../supabase/functions/_shared/plan-enforcement.ts';

test('normalizePlan preserves canonical and legacy aliases', () => {
  assert.equal(normalizePlan('creator'), 'rising');
  assert.equal(normalizePlan('premium'), 'rising');
  assert.equal(normalizePlan('professional'), 'pro');
  assert.equal(normalizePlan('enterprise'), 'pro');
  assert.equal(normalizePlan('basic'), 'starter');
  assert.equal(normalizePlan('free'), 'rookie');
});

test('plan monthly credits match pricing contract', () => {
  assert.deepEqual(PLAN_MONTHLY_CREDITS, {
    rookie: 25,
    starter: 50,
    rising: 100,
    pro: 300,
  });
});

test('waitlist maker is included only on rising and pro', () => {
  assert.equal(resolveFeatureEnforcement('rookie', 'WAITLIST_GENERATION').mode, 'charge');
  assert.equal(resolveFeatureEnforcement('starter', 'WAITLIST_GENERATION').mode, 'charge');
  assert.equal(resolveFeatureEnforcement('rising', 'WAITLIST_GENERATION').mode, 'included');
  assert.equal(resolveFeatureEnforcement('pro', 'WAITLIST_GENERATION').mode, 'included');
});

test('pmf lab and prompt generation enforce minimum-plan upgrades', () => {
  const rookiePmf = resolveFeatureEnforcement('rookie', 'PMF_ANALYSIS');
  assert.equal(rookiePmf.mode, 'blocked');
  assert.equal(rookiePmf.requiredPlan, 'starter');

  const starterPrompt = resolveFeatureEnforcement('starter', 'PROMPT_GENERATION');
  assert.equal(starterPrompt.mode, 'blocked');
  assert.equal(starterPrompt.requiredPlan, 'rising');
});

test('discovery calls stay quota-based across all plans', () => {
  assert.deepEqual(resolveFeatureEnforcement('rookie', 'DISCOVERY_CALL'), {
    feature: 'DISCOVERY_CALL',
    plan: 'rookie',
    mode: 'quota',
    requiredPlan: 'starter',
    monthlyLimit: 1,
    creditCost: 0,
  });
  assert.equal(resolveFeatureEnforcement('pro', 'DISCOVERY_CALL').monthlyLimit, Infinity);
});