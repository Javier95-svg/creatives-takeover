import { CREDIT_COSTS, getCreditCostForPlan, type CreditFeature } from './credit-constants.ts';

export type Plan = 'rookie' | 'starter' | 'rising' | 'pro';
export type EnforcedFeature = CreditFeature | 'DISCOVERY_CALL';

type EnforcementMode = 'charge' | 'included' | 'blocked' | 'quota';

interface FeatureRule {
  mode: EnforcementMode;
  requiredPlan?: Plan;
  monthlyLimit?: number;
}

export interface FeatureEnforcement {
  feature: EnforcedFeature;
  plan: Plan;
  mode: EnforcementMode;
  requiredPlan?: Plan;
  monthlyLimit?: number;
  creditCost: number;
}

export const PLAN_SEQUENCE: Plan[] = ['rookie', 'starter', 'rising', 'pro'];

export const PLAN_MONTHLY_CREDITS: Record<Plan, number> = {
  rookie: 10,
  starter: 30,
  rising: 75,
  pro: 150,
};

const FEATURE_RULES: Partial<Record<EnforcedFeature, Record<Plan, FeatureRule>>> = {
  WAITLIST_GENERATION: {
    rookie: { mode: 'charge' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  PMF_ANALYSIS: {
    rookie: { mode: 'blocked', requiredPlan: 'starter' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  PMF_SCORING: {
    rookie: { mode: 'blocked', requiredPlan: 'starter' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  APP_BUILDER_GENERATE: {
    rookie: { mode: 'charge' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  APP_BUILDER_REFINE: {
    rookie: { mode: 'charge' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  APP_BUILDER_DEBUG: {
    rookie: { mode: 'charge' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  APP_BUILDER_ADD_PAGE: {
    rookie: { mode: 'charge' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  APP_BUILDER_ADD_FEATURE: {
    rookie: { mode: 'charge' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  APP_BUILDER_DESIGN_OVERHAUL: {
    rookie: { mode: 'charge' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  APP_BUILDER_DEPLOY: {
    rookie: { mode: 'charge' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  APP_BUILDER_RESTORE: {
    rookie: { mode: 'charge' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  APP_BUILDER_EXPORT: {
    rookie: { mode: 'charge' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  APP_BUILDER_CHAT: {
    rookie: { mode: 'charge' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  APP_BUILDER_GITHUB_EDIT: {
    rookie: { mode: 'charge' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  GTM_ANALYSIS: {
    rookie: { mode: 'blocked', requiredPlan: 'rising' },
    starter: { mode: 'blocked', requiredPlan: 'rising' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  TECH_STACK_GENERATION: {
    rookie: { mode: 'blocked', requiredPlan: 'rising' },
    starter: { mode: 'blocked', requiredPlan: 'rising' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  PITCH_DECK_ANALYZER: {
    rookie: { mode: 'blocked', requiredPlan: 'rising' },
    starter: { mode: 'blocked', requiredPlan: 'rising' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  EMAIL_TEMPLATE_GENERATION: {
    rookie: { mode: 'blocked', requiredPlan: 'starter' },
    starter: { mode: 'included' },
    rising: { mode: 'included' },
    pro: { mode: 'included' },
  },
  PROMPT_GENERATION: {
    rookie: { mode: 'blocked', requiredPlan: 'rising' },
    starter: { mode: 'blocked', requiredPlan: 'rising' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
  FUNDRAISING_READINESS_ANALYSIS: {
    rookie: { mode: 'included' },
    starter: { mode: 'included' },
    rising: { mode: 'included' },
    pro: { mode: 'included' },
  },
  ICP_ANALYSIS: {
    rookie: { mode: 'included' },
    starter: { mode: 'included' },
    rising: { mode: 'included' },
    pro: { mode: 'included' },
  },
  DISCOVERY_CALL: {
    rookie: { mode: 'charge' },
    starter: { mode: 'charge' },
    rising: { mode: 'charge' },
    pro: { mode: 'charge' },
  },
};

export function normalizePlan(value: string | null | undefined): Plan {
  const normalized = (value || 'rookie').trim().toLowerCase();

  if (['pro', 'professional', 'elite', 'team', 'teams', 'enterprise'].includes(normalized)) {
    return 'pro';
  }

  if (['rising', 'creator', 'premium'].includes(normalized)) {
    return 'rising';
  }

  if (['starter', 'basic'].includes(normalized)) {
    return 'starter';
  }

  return 'rookie';
}

export function isPlanAtLeast(plan: Plan, minimumPlan: Plan): boolean {
  return PLAN_SEQUENCE.indexOf(plan) >= PLAN_SEQUENCE.indexOf(minimumPlan);
}

export function resolveFeatureEnforcement(plan: Plan, feature: EnforcedFeature): FeatureEnforcement {
  const defaultCreditCost = getCreditCostForPlan(feature, plan) ?? 0;
  const rule = FEATURE_RULES[feature]?.[plan];

  if (!rule) {
    return {
      feature,
      plan,
      mode: 'charge',
      creditCost: defaultCreditCost,
    };
  }

  return {
    feature,
    plan,
    mode: rule.mode,
    requiredPlan: rule.requiredPlan,
    monthlyLimit: rule.monthlyLimit,
    creditCost: rule.mode === 'charge' ? defaultCreditCost : 0,
  };
}
