import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  normalizePlan,
  PLAN_MONTHLY_CREDITS,
  resolveFeatureEnforcement,
} from '../supabase/functions/_shared/plan-enforcement.ts';
import { CREDIT_COSTS } from '../supabase/functions/_shared/credit-constants.ts';

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
    rookie: 50,
    starter: 100,
    rising: 250,
    pro: 600,
  });
});

test('rookie relief migration safely raises only rookie credits', () => {
  const source = readFileSync(new URL('../supabase/migrations/20260514_raise_rookie_credits.sql', import.meta.url), 'utf8');

  assert.match(source, /UPDATE public\.subscription_tiers[\s\S]*monthly_credits = 50[\s\S]*WHERE tier_name = 'rookie'/);
  assert.match(source, /UPDATE public\.user_credits[\s\S]*monthly_quota = 50[\s\S]*WHERE subscription_tier = 'rookie'/);
  assert.match(source, /SET balance = LEAST\(balance \+ 25, 50\)/);
  assert.match(source, /WHERE subscription_tier = 'rookie'[\s\S]*AND balance < 50/);
  assert.match(source, /SET credit_balance = uc\.balance/);
});

test('paid plan credit ladder migration safely raises only paid credits', () => {
  const source = readFileSync(new URL('../supabase/migrations/20260514120000_raise_paid_plan_credits.sql', import.meta.url), 'utf8');

  assert.match(source, /WHEN 'starter' THEN 100/);
  assert.match(source, /WHEN 'rising' THEN 250/);
  assert.match(source, /WHEN 'pro' THEN 600/);
  assert.match(source, /LEAST\(balance \+ 50, 100\)/);
  assert.match(source, /LEAST\(balance \+ 150, 250\)/);
  assert.match(source, /LEAST\(balance \+ 300, 600\)/);
  assert.match(source, /uc\.subscription_tier IN \('starter', 'rising', 'pro'\)/);
  assert.doesNotMatch(source, /subscription_tier\s*=\s*'rookie'/);
  assert.doesNotMatch(source, /tier_name\s*=\s*'rookie'/);
});

test('subscription checkout copy uses the paid plan credit ladder', () => {
  const source = readFileSync(new URL('../supabase/functions/create-checkout/index.ts', import.meta.url), 'utf8');

  assert.match(source, /starter: \{[\s\S]*monthly: \{[\s\S]*credits: 100/);
  assert.match(source, /rising: \{[\s\S]*monthly: \{[\s\S]*credits: 250/);
  assert.match(source, /pro: \{[\s\S]*monthly: \{[\s\S]*credits: 600/);
  assert.match(source, /description: `\$\{pricing\.credits\} monthly credits with \$\{billingCycle\} billing`/);
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

test('ICP analysis remains free and included for every backend plan', () => {
  assert.equal(CREDIT_COSTS.ICP_ANALYSIS, 0);

  for (const plan of ['rookie', 'starter', 'rising', 'pro'] as const) {
    const enforcement = resolveFeatureEnforcement(plan, 'ICP_ANALYSIS');
    assert.equal(enforcement.feature, 'ICP_ANALYSIS');
    assert.equal(enforcement.plan, plan);
    assert.equal(enforcement.mode, 'included');
    assert.equal(enforcement.creditCost, 0);
  }
});

test('shared credit deduction treats zero-credit operations as no-op success', () => {
  const source = readFileSync(new URL('../supabase/functions/_shared/credit-deduction.ts', import.meta.url), 'utf8');

  assert.match(source, /!Number\.isFinite\(amount\) \|\| amount < 0/);
  assert.match(source, /if \(amount === 0 && entitlementFeature !== 'DISCOVERY_CALL'\)/);
  assert.match(source, /usedFromQuota: 0/);
  assert.match(source, /usedFromBalance: 0/);
  assert.match(source, /Number\.isFinite\(amount\) && amount === 0[\s\S]*return true/);
});

test('ICP analyzer skips free saves and preserves ICP entitlement metadata for future charges', () => {
  const source = readFileSync(new URL('../supabase/functions/icp-analyzer/index.ts', import.meta.url), 'utf8');

  assert.match(source, /if \(shouldChargeIcpCredits\(CREDIT_COSTS\.ICP_ANALYSIS\)\)/);
  assert.match(source, /entitlementFeature: "ICP_ANALYSIS"/);
  assert.match(source, /Skipping ICP Analysis credit deduction because the configured credit cost is zero/);
  assert.match(source, /payload\.mode === "save" && user && creditsCharged/);
});
