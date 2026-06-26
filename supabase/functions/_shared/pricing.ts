/**
 * SINGLE SOURCE OF TRUTH for money (edge / Stripe side).
 *
 * Mirrors src/config/pricing.ts but in CENTS (Stripe's unit). The Deno/Vite
 * module boundary stops the two files from importing each other, so they are
 * kept in lock-step by tests/pricing-parity.test.ts. Repricing = edit both files.
 *
 * Monthly credit allocations are NOT duplicated here — they live in
 * plan-enforcement.ts (PLAN_MONTHLY_CREDITS) and are re-exported for convenience.
 */

import { PLAN_MONTHLY_CREDITS, type Plan } from "./plan-enforcement.ts";

export { PLAN_MONTHLY_CREDITS };

export type BillingCycle = "monthly" | "yearly";
export type PaidPlan = Exclude<Plan, "rookie">;

/** Plan price in cents, by billing cycle. Keep in sync with src/config/pricing.ts. */
export const PLAN_PRICING_CENTS: Record<PaidPlan, Record<BillingCycle, number>> = {
  starter: { monthly: 900, yearly: 7900 },
  rising: { monthly: 2900, yearly: 23900 },
  pro: { monthly: 6500, yearly: 58900 },
};

export interface TopUpPackCents {
  amount: number; // cents
  credits: number;
  name: string;
}

/** One-time credit top-up packs (single platform wallet), in cents. */
export const TOP_UP_PACKS_CENTS: Record<string, TopUpPackCents> = {
  pack_20: { amount: 800, credits: 20, name: "Starter Pack" },
  pack_40: { amount: 1600, credits: 40, name: "Boost Pack" },
  pack_60: { amount: 2400, credits: 60, name: "Power Pack" },
};

/** Map a paid amount (cents) + interval back to its plan tier, or "rookie". */
export function inferTierFromAmountCents(amount: number, interval?: string | null): Plan {
  if (!amount || amount <= 0) return "rookie";
  const cycle: BillingCycle = interval === "year" ? "yearly" : "monthly";
  for (const [plan, cycles] of Object.entries(PLAN_PRICING_CENTS)) {
    if (cycles[cycle] === amount) return plan as Plan;
  }
  return "rookie";
}
