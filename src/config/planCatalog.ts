import { CREDIT_COSTS } from './constants.ts';
import {
  PLAN_HIGHLIGHTS,
  PLAN_LABELS,
  PLAN_MONTHLY_CREDITS,
  PLAN_SEQUENCE,
  PLAN_SUMMARIES,
  type Plan,
} from './planPermissions.ts';
import { PLAN_PRICING, TOP_UP_PACKS } from './pricing.ts';
import { COMPETITIVE_HARDENING_FLAGS } from './competitiveHardeningFlags.ts';

export type PlanOutcome = 'PROVE Preview' | 'PROVE' | 'SELL + GROW' | 'Expert + RAISE';

export interface PlanCatalogEntry {
  id: Plan;
  name: string;
  outcome: PlanOutcome;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyCredits: number;
  description: string;
  features: string[];
}

const OUTCOMES: Record<Plan, PlanOutcome> = {
  rookie: 'PROVE Preview', starter: 'PROVE', rising: 'SELL + GROW', pro: 'Expert + RAISE',
};

export const PLAN_CATALOG: PlanCatalogEntry[] = PLAN_SEQUENCE.map((id) => ({
  id,
  name: PLAN_LABELS[id],
  outcome: OUTCOMES[id],
  monthlyPrice: PLAN_PRICING[id].monthly,
  yearlyPrice: PLAN_PRICING[id].yearly,
  monthlyCredits: PLAN_MONTHLY_CREDITS[id],
  description: PLAN_SUMMARIES[id].description,
  features: PLAN_HIGHLIGHTS[id],
}));

export const PLAN_CATALOG_BY_ID = Object.fromEntries(
  PLAN_CATALOG.map((plan) => [plan.id, plan]),
) as Record<Plan, PlanCatalogEntry>;

export const OUTCOME_WORKLOADS = [
  {
    id: 'validate_hypothesis',
    label: 'Validate one customer hypothesis',
    credits: CREDIT_COSTS.PMF_DISCOVERY + CREDIT_COSTS.PMF_SCORING,
    actions: ['One PMF discovery run', 'One PMF evidence score'],
  },
  {
    id: 'test_proof_demo',
    label: 'Create and test one proof demo',
    credits: CREDIT_COSTS.WAITLIST_GENERATION + CREDIT_COSTS.PMF_SCORING,
    actions: ['One Demo Studio generation', 'One PMF evidence score'],
  },
  {
    id: 'activate_gtm_experiment',
    label: 'Generate and activate one GTM experiment',
    credits: CREDIT_COSTS.GTM_ANALYSIS + CREDIT_COSTS.TRACTION_ENGINE_SCORECARD,
    actions: ['One researched GTM generation', 'One Traction Engine scorecard'],
  },
] as const;

const BASE_PROJECT_PACKS = TOP_UP_PACKS.map((pack, index) => ({
  ...pack,
  label: ['Experiment Pack', 'Validation Pack', 'Launch Pack'][index] ?? pack.label,
  persistent: true,
}));

export const PROJECT_PACK_PRICE_VARIANT = {
  pack_20: 6,
  pack_40: 12,
  pack_60: 18,
} as const;

export const PROJECT_PACKS = BASE_PROJECT_PACKS.map((pack) => ({
  ...pack,
  priceUsd: COMPETITIVE_HARDENING_FLAGS.projectPackPriceVariant
    ? PROJECT_PACK_PRICE_VARIANT[pack.id as keyof typeof PROJECT_PACK_PRICE_VARIANT]
    : pack.priceUsd,
}));

export const ACTIVE_PROJECT_PACKS = PROJECT_PACKS;

export const FIRST_CUSTOMER_SPRINT_OFFER = {
  id: 'first_customer_sprint_2026_299',
  priceUsd: 299,
  durationDays: 30,
  rerunCreditExpiresMonths: 12,
} as const;
