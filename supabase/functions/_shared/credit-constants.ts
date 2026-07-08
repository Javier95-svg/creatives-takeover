/**
 * Credit cost constants for edge functions
 * IMPORTANT: These must match CREDIT_COSTS in src/config/constants.ts
 * Keep both files in sync manually until a better solution is implemented
 */

export const CREDIT_COSTS = {
  // BizMap AI Features
  LAUNCH_REPORT: 5,
  ASSET_GENERATION: 5,
  PREMIUM_FEATURE: 3,
  WAITLIST_GENERATION: 3,
  PMF_SCORING: 5,
  PMF_DISCOVERY: 5,
  GTM_ANALYSIS: 6,
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
  
  // AI Chat Features
  AI_CHAT_MESSAGE: 1,
  
  // Research & Analysis
  MARKET_RESEARCH: 5,
  MARKET_VALIDATION: 10,
  FINANCIAL_ANALYSIS: 8,
  FUNDRAISING_READINESS_ANALYSIS: 8,
  BUSINESS_INSIGHTS: 5,
  PMF_ANALYSIS: 6,
  ICP_ANALYSIS: 0,
  // First ICP draft per account is free; every additional draft costs this.
  ICP_EXTRA_DRAFT: 5,

  // Investor Matching & Outreach
  INVESTOR_MATCHING: 5,
  PITCH_DECK_GENERATION: 8,
  COLD_EMAIL_GENERATION: 3,
  ONEPAGER_GENERATION: 3,
  
  // Sprint & Task Features
  SPRINT_TASK_GENERATION: 2,
  ROADMAP_GENERATION: 5,
  TRACTION_ENGINE_SCORECARD: 2,
  
  // Tech Stack Generator (first analysis free per account — see feature_gifts)
  TECH_STACK_GENERATION: 4,
  
  // Other Premium Features
  PDF_EXPORT: 3,
  ADVANCED_ANALYTICS: 5,

  // Insighta + BizMap Add-ons
  // First analysis is free (anonymous, one per IP); every signed-in analysis costs this.
  PITCH_DECK_ANALYZER: 10,
  EMAIL_TEMPLATE_GENERATION: 3,
  PROMPT_GENERATION: 2,

  // Community Features
  DISCOVERY_CALL: 10,
  SERVICE_MARKETPLACE_MESSAGE: 5,
  SERVICE_MARKETPLACE_EMAIL: 10,
  // First message to each mentor is free; every message after that costs this.
  // Enforced server-side by the charge_mentor_dm trigger on message insert.
  MENTOR_DM: 3,
} as const;

// Type for credit cost feature names
export type CreditFeature = keyof typeof CREDIT_COSTS;
export type CreditPlan = 'rookie' | 'starter' | 'rising' | 'pro';

export const PLAN_CREDIT_COST_OVERRIDES: Partial<Record<CreditPlan, Partial<Record<CreditFeature, number>>>> = {
  rookie: {
    WAITLIST_GENERATION: 4,
  },
} as const;

/**
 * Get credit cost for a specific feature
 * @param feature - The feature name (key from CREDIT_COSTS)
 * @returns The credit cost, or null if feature doesn't consume credits
 */
export function getCreditCost(feature: CreditFeature | string): number | null {
  if (feature in CREDIT_COSTS) {
    return CREDIT_COSTS[feature as CreditFeature];
  }
  return null;
}

export function getCreditCostForPlan(
  feature: CreditFeature | string,
  plan: CreditPlan = 'rookie'
): number | null {
  if (!(feature in CREDIT_COSTS)) {
    return null;
  }

  const typedFeature = feature as CreditFeature;
  return PLAN_CREDIT_COST_OVERRIDES[plan]?.[typedFeature] ?? CREDIT_COSTS[typedFeature];
}

/**
 * MVP Builder model cost weights (proportional to Anthropic output pricing, the
 * dominant cost driver). Used to keep cost-per-credit invariant to model choice:
 * upgrading above an action's default model is surcharged proportionally so margin
 * is guaranteed regardless of which model the user picks.
 *   Haiku 4.5  $5/M out  -> 1
 *   Sonnet 4.6 $15/M out -> 3
 *   Opus 4.8   $75/M out -> 15
 *   Gemini and DeepSeek Flash (cheap) -> 1
 * IMPORTANT: keep in sync with src/config/constants.ts
 */
export const MVP_MODEL_COST_WEIGHTS: Record<string, number> = {
  'claude-haiku-4-5-20251001': 1,
  'claude-sonnet-4-6': 3,
  'claude-opus-4-8': 15,
  'gemini-3.5-flash': 1,
  'gemini-3.1-flash-lite': 1,
  'deepseek-v4-flash': 1,
};

// Unknown/unlisted models are treated as Sonnet-class so we never under-charge a
// premium model that slips through.
export const MVP_DEFAULT_MODEL_WEIGHT = 3;
export const MVP_FREE_DEFAULT_MODEL = 'gemini-3.5-flash';
export const MVP_PREMIUM_DEFAULT_MODEL = 'claude-sonnet-4-6';

// Each MVP action's premium default model. MVP Builder resolves a plan-specific
// default at runtime: Gemini for Rookie/Starter, Sonnet for Rising/Pro.
export const MVP_ACTION_DEFAULT_MODEL: Partial<Record<CreditFeature, string>> = {
  APP_BUILDER_GENERATE: MVP_PREMIUM_DEFAULT_MODEL,
  APP_BUILDER_REFINE: MVP_PREMIUM_DEFAULT_MODEL,
  APP_BUILDER_DEBUG: MVP_PREMIUM_DEFAULT_MODEL,
  APP_BUILDER_ADD_PAGE: MVP_PREMIUM_DEFAULT_MODEL,
  APP_BUILDER_ADD_FEATURE: MVP_PREMIUM_DEFAULT_MODEL,
  APP_BUILDER_DESIGN_OVERHAUL: MVP_PREMIUM_DEFAULT_MODEL,
  APP_BUILDER_CHAT: MVP_PREMIUM_DEFAULT_MODEL,
};

export function resolveMVPActionDefaultModelForPlan(
  _feature: CreditFeature,
  plan: CreditPlan = 'rookie'
): string {
  return plan === 'rising' || plan === 'pro'
    ? MVP_PREMIUM_DEFAULT_MODEL
    : MVP_FREE_DEFAULT_MODEL;
}

export function getMvpModelCostWeight(model?: string | null): number {
  if (!model) return MVP_DEFAULT_MODEL_WEIGHT;
  return MVP_MODEL_COST_WEIGHTS[model] ?? MVP_DEFAULT_MODEL_WEIGHT;
}

/**
 * Credit cost for an MVP action adjusted for the chosen model. Charges the base
 * cost at the action's default model and surcharges proportionally when the user
 * upgrades to a more expensive model (never discounts below base). Zero-cost
 * actions (e.g. export) stay free.
 */
export function resolveModelAdjustedCreditCost(
  baseCost: number,
  chosenModel?: string | null,
  defaultModel?: string | null,
): number {
  if (!Number.isFinite(baseCost) || baseCost <= 0) return baseCost;
  const chosenWeight = getMvpModelCostWeight(chosenModel);
  const defaultWeight = getMvpModelCostWeight(defaultModel ?? null);
  const multiplier = Math.max(1, chosenWeight / defaultWeight);
  return Math.ceil(baseCost * multiplier);
}

