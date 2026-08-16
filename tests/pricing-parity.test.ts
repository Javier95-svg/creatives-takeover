import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAN_PRICING as CLIENT_PLAN_PRICING,
  TOP_UP_PACKS as CLIENT_TOP_UP_PACKS,
  type PaidPlan,
} from '../src/config/pricing.ts';
import {
  PLAN_PRICING_CENTS as EDGE_PLAN_PRICING_CENTS,
  TOP_UP_PACKS_CENTS as EDGE_TOP_UP_PACKS_CENTS,
  inferTierFromAmountCents,
} from '../supabase/functions/_shared/pricing.ts';
import { CREDIT_COSTS as CLIENT_CREDIT_COSTS } from '../src/config/constants.ts';
import { GTM_STRATEGIST_PRICING } from '../src/config/gtmStrategist.ts';
import { CREDIT_COSTS as EDGE_CREDIT_COSTS } from '../supabase/functions/_shared/credit-constants.ts';
import { FEATURE_ENTITLEMENTS } from '../src/config/planPermissions.ts';

const PAID_PLANS: PaidPlan[] = ['starter', 'rising', 'pro'];

test('plan prices stay in sync between client (USD) and edge (cents)', () => {
  for (const plan of PAID_PLANS) {
    assert.equal(
      CLIENT_PLAN_PRICING[plan].monthly * 100,
      EDGE_PLAN_PRICING_CENTS[plan].monthly,
      `${plan} monthly price drifted`,
    );
    assert.equal(
      CLIENT_PLAN_PRICING[plan].yearly * 100,
      EDGE_PLAN_PRICING_CENTS[plan].yearly,
      `${plan} yearly price drifted`,
    );
  }
});

test('top-up packs stay in sync between client (USD) and edge (cents)', () => {
  assert.equal(CLIENT_TOP_UP_PACKS.length, Object.keys(EDGE_TOP_UP_PACKS_CENTS).length);
  for (const pack of CLIENT_TOP_UP_PACKS) {
    const edge = EDGE_TOP_UP_PACKS_CENTS[pack.id];
    assert.ok(edge, `pack ${pack.id} missing on edge`);
    assert.equal(pack.priceUsd * 100, edge.amount, `pack ${pack.id} price drifted`);
    assert.equal(pack.credits, edge.credits, `pack ${pack.id} credits drifted`);
    assert.equal(pack.label, edge.name, `pack ${pack.id} label drifted`);
  }
});

test('inferTierFromAmountCents round-trips every plan price', () => {
  for (const plan of PAID_PLANS) {
    assert.equal(inferTierFromAmountCents(EDGE_PLAN_PRICING_CENTS[plan].monthly, 'month'), plan);
    assert.equal(inferTierFromAmountCents(EDGE_PLAN_PRICING_CENTS[plan].yearly, 'year'), plan);
  }
  assert.equal(inferTierFromAmountCents(0, 'month'), 'rookie');
  assert.equal(inferTierFromAmountCents(12345, 'month'), 'rookie');
});

test('GTM price and entitlement stay aligned across UI, access, and Edge charging', () => {
  assert.equal(GTM_STRATEGIST_PRICING.creditsPerResearchGeneration, CLIENT_CREDIT_COSTS.GTM_ANALYSIS);
  assert.equal(CLIENT_CREDIT_COSTS.GTM_ANALYSIS, EDGE_CREDIT_COSTS.GTM_ANALYSIS);
  assert.equal(GTM_STRATEGIST_PRICING.availableOn, 'all_plans');
  for (const plan of ['rookie', 'starter', 'rising', 'pro'] as const) {
    assert.equal(FEATURE_ENTITLEMENTS.gtm_strategist[plan].state, 'full');
    assert.equal(FEATURE_ENTITLEMENTS.gtm_strategist[plan].creditFeature, 'GTM_ANALYSIS');
  }
});
