/**
 * SINGLE SOURCE OF TRUTH for money (frontend).
 *
 * Plan prices (USD), top-up packs (USD), and the credit-value anchor live here.
 * The edge mirror is supabase/functions/_shared/pricing.ts, which holds the same
 * numbers in cents for Stripe. The two are kept in lock-step by a parity test
 * (tests/pricing-parity.test.ts) — the Deno/Vite module boundary stops us from
 * importing one from the other, so the test is the guardrail.
 *
 * Repricing a plan or pack = edit these two files (and nothing else).
 * Monthly credit allocations are NOT duplicated here — they stay in
 * planPermissions.ts / constants.ts (PLAN_MONTHLY_CREDITS) and are re-exported
 * for convenience.
 */

import { PLAN_MONTHLY_CREDITS, type Plan } from './planPermissions.ts';

export { PLAN_MONTHLY_CREDITS };

export type BillingCycle = 'monthly' | 'yearly';
export type PaidPlan = Exclude<Plan, 'rookie'>;

export interface PlanPrice {
  /** USD per month on the monthly plan. */
  monthly: number;
  /** USD per year on the annual plan. */
  yearly: number;
}

export const PLAN_PRICING: Record<Plan, PlanPrice> = {
  rookie: { monthly: 0, yearly: 0 },
  starter: { monthly: 9, yearly: 79 },
  rising: { monthly: 29, yearly: 239 },
  pro: { monthly: 65, yearly: 589 },
};

export interface TopUpPack {
  id: string;
  credits: number;
  /** One-time price in USD. */
  priceUsd: number;
  label: string;
}

/** One-time credit top-up packs (single platform wallet). */
export const TOP_UP_PACKS: TopUpPack[] = [
  { id: 'pack_20', credits: 20, priceUsd: 8, label: 'Starter Pack' },
  { id: 'pack_40', credits: 40, priceUsd: 16, label: 'Boost Pack' },
  { id: 'pack_60', credits: 60, priceUsd: 24, label: 'Power Pack' },
];

/**
 * Blended $ value of one subscription credit — the anchor for "X credits ≈ $Y"
 * framing and the reference point for any future top-up repricing. Derived from
 * the Rising plan ($29 / 250 credits ≈ $0.116), rounded. Kept explicit so a
 * reprice is an intentional edit, never an implicit side effect.
 */
export const CREDIT_VALUE_USD = 0.12;

/** USD price for a plan + billing cycle. */
export function getPlanPriceUsd(plan: Plan, cycle: BillingCycle): number {
  return PLAN_PRICING[plan][cycle];
}

/** Approximate USD value of a number of credits, at the subscription anchor. */
export function creditsToUsd(credits: number): number {
  return credits * CREDIT_VALUE_USD;
}
