import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  normalizePlan,
  PLAN_MONTHLY_CREDITS,
  resolveFeatureEnforcement,
} from '../supabase/functions/_shared/plan-enforcement.ts';
import { CREDIT_COSTS } from '../supabase/functions/_shared/credit-constants.ts';
import { TOP_UP_PACKS_CENTS, PLAN_PRICING_CENTS } from '../supabase/functions/_shared/pricing.ts';

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

test('hybrid monetization migration updates plan metadata and disables legacy discovery-call overage credits', () => {
  const source = readFileSync(new URL('../supabase/migrations/20260514150000_hybrid_monetization_metadata.sql', import.meta.url), 'utf8');

  assert.match(source, /Waitlist Maker unlocked; uses 3 credits/);
  assert.match(source, /PMF Lab unlocked; uses 6 credits/);
  assert.match(source, /MVP Builder unlocked; uses 5 credits/);
  assert.match(source, /Tech Stack Builder unlocked; uses 3 credits/);
  assert.match(source, /GTM Strategist unlocked; uses 5 credits/);
  assert.match(source, /Pitch Deck Analyzer unlocked; uses 6 credits/);
  assert.match(source, /0 AS overage_credit_cost/);
  assert.match(source, /credits_charged = false/);
  assert.match(source, /'balance_before'/);
  assert.match(source, /'balance_after'/);
});

test('discovery call metering migration removes plan caps and charges 10 credits on confirmed bookings', () => {
  const source = readFileSync(new URL('../supabase/migrations/20260527120000_meter_discovery_calls.sql', import.meta.url), 'utf8');

  assert.match(source, /NULL::INTEGER AS included_limit/);
  assert.match(source, /10 AS overage_credit_cost/);
  assert.match(source, /'requiresCredits', true/);
  assert.match(source, /'canBookNow'[\s\S]*>= COALESCE\(v_policy\.overage_credit_cost, 10\)/);
  assert.match(source, /'errorCode', 'INSUFFICIENT_CREDITS'/);
  assert.match(source, /v_deduction := public\.deduct_credits_atomic/);
  assert.match(source, /'Discovery Call'/);
  assert.match(source, /'chargedCredits', v_charge_amount/);
});

test('provider-neutral discovery call migration records external booking confirmations', () => {
  const source = readFileSync(new URL('../supabase/migrations/20260527143000_provider_neutral_discovery_call_confirmations.sql', import.meta.url), 'utf8');

  assert.match(source, /ADD COLUMN IF NOT EXISTS booking_provider/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS public\.discovery_call_provider_events/);
  assert.match(source, /match_status IN \('matched', 'pending_review', 'ignored', 'failed'\)/);
  assert.match(source, /provider_name IN \('calendly', 'koalendar', 'email', 'manual', 'other'\)/);
  assert.match(source, /public\.infer_discovery_call_provider/);
  assert.match(source, /'bookingProvider', v_provider/);
  assert.match(source, /GRANT SELECT ON TABLE public\.discovery_call_admin_overview TO service_role/);
});

test('discovery call provider processor uses strict matching before charging', () => {
  const source = readFileSync(new URL('../supabase/functions/_shared/discovery-call-provider-events.ts', import.meta.url), 'utf8');

  assert.match(source, /processDiscoveryCallProviderEvent/);
  assert.match(source, /matchedBy: event\.providerName === "manual" \? "manual" : "tracking_id"/);
  assert.match(source, /matchedBy: "provider_invitee_id"/);
  assert.match(source, /matchedBy: "provider_event_id"/);
  assert.match(source, /ambiguous_recent_intent_for_email/);
  assert.match(source, /matchStatus: "pending_review"/);
  assert.match(source, /finalize_discovery_call_booking/);
  assert.match(source, /notify-discovery-call-event/);
});

test('calendly and koalendar webhooks share the provider-neutral processor', () => {
  const calendlySource = readFileSync(new URL('../supabase/functions/calendly-webhook/index.ts', import.meta.url), 'utf8');
  const koalendarSource = readFileSync(new URL('../supabase/functions/koalendar-webhook/index.ts', import.meta.url), 'utf8');

  assert.match(calendlySource, /normalizeCalendlyEvent/);
  assert.match(calendlySource, /processDiscoveryCallProviderEvent/);
  assert.match(koalendarSource, /normalizeKoalendarEvent/);
  assert.match(koalendarSource, /processDiscoveryCallProviderEvent/);
  assert.match(koalendarSource, /KOALENDAR_WEBHOOK_SECRET/);
});

test('discovery call notifications fan out beyond admin-only Calendly emails', () => {
  const source = readFileSync(new URL('../supabase/functions/notify-discovery-call-event/index.ts', import.meta.url), 'utf8');

  assert.match(source, /discovery_call_event/);
  assert.match(source, /founderEmailResult/);
  assert.match(source, /mentorEmailResult/);
  assert.match(source, /adminEmailResult/);
  assert.match(source, /Discovery Call Needs Review/);
  assert.match(source, /community_notifications/);
});

test('subscription checkout copy uses the paid plan credit ladder', () => {
  const source = readFileSync(new URL('../supabase/functions/create-checkout/index.ts', import.meta.url), 'utf8');

  // Credit ladder is the single source of truth (PLAN_MONTHLY_CREDITS); prices live
  // in the shared pricing module; create-checkout composes copy from PLAN_VALUE_PROPS.
  assert.equal(PLAN_MONTHLY_CREDITS.starter, 100);
  assert.equal(PLAN_MONTHLY_CREDITS.rising, 250);
  assert.equal(PLAN_MONTHLY_CREDITS.pro, 600);
  assert.equal(PLAN_PRICING_CENTS.starter.monthly, 900);
  assert.equal(PLAN_PRICING_CENTS.rising.monthly, 2900);
  assert.equal(PLAN_PRICING_CENTS.pro.monthly, 6500);
  assert.match(source, /PMF Lab credit-metered access/);
  assert.match(source, /per-action MVP Builder/);
  assert.match(source, /Find Your Angel[\s\S]*unlimited research views/);
  assert.match(source, /\$\{credits\} \$\{connector\} \$\{PLAN_VALUE_PROPS\[tier\]\}/);
  assert.match(source, /description: `\$\{pricing\.description\} with \$\{billingCycle\} billing`/);
});

test('platform top-up packs are available through checkout', () => {
  const checkoutSource = readFileSync(new URL('../supabase/functions/create-checkout/index.ts', import.meta.url), 'utf8');
  const webhookSource = readFileSync(new URL('../supabase/functions/stripe-webhook/index.ts', import.meta.url), 'utf8');

  // Pack catalog is the shared pricing source of truth; checkout + webhook derive from it.
  for (const [packId, credits] of [
    ['pack_20', 20],
    ['pack_40', 40],
    ['pack_60', 60],
  ] as const) {
    assert.equal(TOP_UP_PACKS_CENTS[packId].credits, credits);
  }
  assert.match(checkoutSource, /TOP_UP_PACKS_CENTS/);
  assert.match(webhookSource, /TOP_UP_PACKS_CENTS/);
});

test('credit audit main inventory follows Compare Our Plans tools only', () => {
  const source = readFileSync(new URL('../docs/audit/credit-system-deep-audit-2026-05-14.md', import.meta.url), 'utf8');

  for (const section of [
    'BizMap AI: Startup Development Cycle',
    'Insighta',
    'Community',
    'Resources',
  ]) {
    assert.match(source, new RegExp(section));
  }

  for (const tool of [
    'ICP Builder',
    'Waitlist Maker',
    'PMF Lab',
    'MVP Builder',
    'Tech Stack Builder',
    'GTM Strategist',
    'Directories',
    'VC Search',
    'Accelerator Hunt',
    'Email Templates',
    'Pitch Deck Analyzer',
    'Insighta Test',
    'Discovery Calls',
    'Find a Co-Founder Posting',
    'Find Your Angel',
    'Newspaper',
    'Prompt Library',
  ]) {
    assert.match(source, new RegExp(tool));
  }

  for (const offTableTool of [
    'Sprint Task Generation',
    'Market Research',
    'Financial Analysis',
    'Business Insights',
    'Roadmap Generation',
    'Public Commitment',
    'Asset Generation',
    'Investor Matching',
  ]) {
    assert.doesNotMatch(source, new RegExp(offTableTool));
  }
});

test('waitlist maker is credit-metered on every plan', () => {
  assert.equal(resolveFeatureEnforcement('rookie', 'WAITLIST_GENERATION').mode, 'charge');
  assert.equal(resolveFeatureEnforcement('rookie', 'WAITLIST_GENERATION').creditCost, 4);

  for (const plan of ['starter', 'rising', 'pro'] as const) {
    const enforcement = resolveFeatureEnforcement(plan, 'WAITLIST_GENERATION');
    assert.equal(enforcement.mode, 'charge');
    assert.equal(enforcement.creditCost, 3);
  }
});

test('pmf lab is credit-metered on every plan', () => {
  assert.equal(CREDIT_COSTS.PMF_ANALYSIS, 6);
  assert.equal(CREDIT_COSTS.PMF_SCORING, 5);

  for (const plan of ['rookie', 'starter', 'rising', 'pro'] as const) {
    assert.equal(resolveFeatureEnforcement(plan, 'PMF_ANALYSIS').mode, 'charge');
    assert.equal(resolveFeatureEnforcement(plan, 'PMF_ANALYSIS').creditCost, 6);
    assert.equal(resolveFeatureEnforcement(plan, 'PMF_SCORING').mode, 'charge');
    assert.equal(resolveFeatureEnforcement(plan, 'PMF_SCORING').creditCost, 5);
  }
});

test('MVP Builder is universal and Phase 2 app builder actions are credit-metered', () => {
  const expectedCosts = {
    APP_BUILDER_GENERATE: 15,
    APP_BUILDER_REFINE: 4,
    APP_BUILDER_DEBUG: 3,
    APP_BUILDER_ADD_PAGE: 6,
    APP_BUILDER_ADD_FEATURE: 8,
    APP_BUILDER_DESIGN_OVERHAUL: 8,
    APP_BUILDER_DEPLOY: 5,
    APP_BUILDER_RESTORE: 1,
    APP_BUILDER_EXPORT: 0,
    APP_BUILDER_CHAT: 1,
    APP_BUILDER_GITHUB_EDIT: 3,
  } as const;

  for (const feature of Object.keys(expectedCosts) as Array<keyof typeof expectedCosts>) {
    for (const plan of ['rookie', 'starter', 'rising', 'pro'] as const) {
      const access = resolveFeatureEnforcement(plan, feature);
      assert.equal(access.mode, 'charge');
      assert.equal(access.creditCost, expectedCosts[feature]);
    }
  }
});

test('GTM Strategist and Tech Stack Builder are credit-metered on every plan', () => {
  const expectedCosts = {
    GTM_ANALYSIS: 6,
    TECH_STACK_GENERATION: 4,
  } as const;

  for (const feature of Object.keys(expectedCosts) as Array<keyof typeof expectedCosts>) {
    for (const plan of ['rookie', 'starter', 'rising', 'pro'] as const) {
      const access = resolveFeatureEnforcement(plan, feature);
      assert.equal(access.mode, 'charge');
      assert.equal(access.creditCost, expectedCosts[feature]);
    }
  }
});

test('Prompt Library generation stays Rising-gated and credit-metered', () => {
  for (const plan of ['rookie', 'starter'] as const) {
    const access = resolveFeatureEnforcement(plan, 'PROMPT_GENERATION');
    assert.equal(access.mode, 'blocked');
    assert.equal(access.requiredPlan, 'rising');
  }

  for (const plan of ['rising', 'pro'] as const) {
    assert.equal(resolveFeatureEnforcement(plan, 'PROMPT_GENERATION').mode, 'charge');
    assert.equal(resolveFeatureEnforcement(plan, 'PROMPT_GENERATION').creditCost, 2);
  }
});

test('Pitch Deck Analyzer is credit-metered (charge) on every tier', () => {
  for (const plan of ['rookie', 'starter', 'rising', 'pro'] as const) {
    const access = resolveFeatureEnforcement(plan, 'PITCH_DECK_ANALYZER');
    assert.equal(access.mode, 'charge');
    assert.equal(access.creditCost, 10);
  }
});

test('discovery calls are credit-metered across all plans', () => {
  assert.deepEqual(resolveFeatureEnforcement('rookie', 'DISCOVERY_CALL'), {
    feature: 'DISCOVERY_CALL',
    plan: 'rookie',
    mode: 'charge',
    requiredPlan: undefined,
    monthlyLimit: undefined,
    creditCost: 10,
  });

  for (const plan of ['starter', 'rising', 'pro'] as const) {
    const enforcement = resolveFeatureEnforcement(plan, 'DISCOVERY_CALL');
    assert.equal(enforcement.mode, 'charge');
    assert.equal(enforcement.creditCost, 10);
    assert.equal(enforcement.requiredPlan, undefined);
    assert.equal(enforcement.monthlyLimit, undefined);
  }
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
  assert.match(source, /feature_key: entitlementFeature/);
  assert.match(source, /credit_cost: chargeAmount/);
  assert.match(source, /balance_before: creditsBeforeDeduction\.balance/);
});

test('ICP analyzer skips free saves and preserves ICP entitlement metadata for future charges', () => {
  const source = readFileSync(new URL('../supabase/functions/icp-analyzer/index.ts', import.meta.url), 'utf8');

  assert.match(source, /if \(shouldChargeIcpCredits\(icpDraftCost\)\)/);
  assert.match(source, /entitlementFeature: "ICP_ANALYSIS"/);
  assert.match(source, /First ICP draft is free for this account; no credits charged/);
  assert.match(source, /payload\.mode === "save" && user && creditsCharged/);
});
