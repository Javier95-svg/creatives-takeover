/**
 * Canonical plan-entitlement catalog.
 *
 * Route guards, dashboard rendering, quota widgets, and credit charging should
 * all resolve from this file instead of hardcoded tier checks.
 */

import { getCreditCost, TIER_MONTHLY_CREDITS, type CreditFeature } from './constants.ts';

export type Plan = 'rookie' | 'starter' | 'rising' | 'pro';

export interface PlanSummary {
  name: string;
  price: number;
  monthlyCredits: number;
  vcViewLimit: number;
  acceleratorViewLimit: number;
  description: string;
}

export type GateState =
  | 'full'
  | 'credit_gated'
  | 'preview_only'
  | 'quota_limited'
  | 'locked'
  | 'hidden';

export type AccessRule = GateState;

export type RestrictionReason =
  | 'plan_locked'
  | 'preview_only'
  | 'insufficient_credits'
  | 'monthly_limit_reached'
  | 'payment_lapsed';

export type DashboardModeVariant = 'rookie' | 'starter' | 'rising' | 'pro';

export type FeatureKey =
  | 'dashboard_mode'
  | 'icp_builder'
  | 'waitlist_maker'
  | 'pmf_lab'
  | 'mvp_builder'
  | 'tech_stack'
  | 'gtm_strategist'
  | 'directories'
  | 'discovery_calls'
  | 'cofounder_posts'
  | 'angels_community'
  | 'vc_search_browse'
  | 'vc_search_profile'
  | 'accelerator_browse'
  | 'accelerator_profile'
  | 'email_templates'
  | 'pitch_deck_analyzer'
  | 'prompt_library'
  | 'prompt_library_export'
  | 'insighta_test'
  | 'newspaper'
  | 'profile';

export type QuotaFeatureKey =
  | 'discovery_calls'
  | 'cofounder_posts'
  | 'vc_search_profile'
  | 'accelerator_profile';

interface FeatureEntitlementConfig {
  state: GateState;
  visibility?: 'visible' | 'hidden';
  requiredPlan?: Plan;
  monthlyLimit?: number;
  creditFeature?: CreditFeature;
  freeModelsOnly?: boolean;
  dashboardMode?: DashboardModeVariant;
}

export interface EntitlementResult {
  plan: Plan;
  state: GateState;
  reason?: RestrictionReason;
  upgradeTarget?: Plan;
  creditFeature?: CreditFeature;
  creditCost?: number;
  monthlyLimit?: number;
  usedThisMonth?: number;
  remaining?: number;
  resetsAt?: string;
  dashboardMode?: DashboardModeVariant;
  uiMode: 'full' | 'preview' | 'locked';
  isVisible: boolean;
  freeModelsOnly: boolean;
}

export interface QuotaStatus {
  feature: QuotaFeatureKey;
  plan: Plan;
  state: GateState;
  used: number;
  limit: number;
  remaining: number;
  hasUnlimited: boolean;
  canUse: boolean;
  isLocked: boolean;
  upgradeTarget?: Plan;
}

export const PLAN_LABELS: Record<Plan, string> = {
  rookie: 'Rookie',
  starter: 'Starter',
  rising: 'Rising',
  pro: 'Pro',
};

export const PLAN_SEQUENCE: Plan[] = ['rookie', 'starter', 'rising', 'pro'];

export const PLAN_MONTHLY_CREDITS: Record<Plan, number> = {
  rookie: TIER_MONTHLY_CREDITS.rookie,
  starter: TIER_MONTHLY_CREDITS.starter,
  rising: TIER_MONTHLY_CREDITS.rising,
  pro: TIER_MONTHLY_CREDITS.pro,
};

export const PLAN_HIGHLIGHTS: Record<Plan, string[]> = {
  rookie: [
    'Dashboard Rookie Mode',
    'ICP Builder (free)',
    'Stage 1 guided dashboard',
    'Stages 4-5 preview cards',
    '1 free discovery call/month (mentorship)',
    '1 Find a Co-Founder post per month',
    'VC Search & Accelerator Hunt (browse only)',
    'Prompt Library (free models only)',
    'Insighta Test',
    'Newspaper',
  ],
  starter: [
    'Dashboard Starter Mode',
    'ICP Builder (free)',
    'Stages 1-3 active',
    'Waitlist Maker + PMF Lab',
    'Stages 4-5 (preview only)',
    '2 free discovery calls/month (mentorship)',
    '2 Find a Co-Founder posts per month',
    'VC Search & Accelerator Hunt (2 profiles view per month)',
    'Email Templates (full access)',
    'Prompt Library (free models only)',
    'Insighta Test',
    'Newspaper',
  ],
  rising: [
    'Dashboard Rising Mode',
    'Full BizMap AI tools access',
    'All five stages available in one cockpit',
    'MVP Builder + GTM Strategist',
    '3 free discovery calls/month (mentorship)',
    'Unlimited Find a Co-Founder posts',
    'VC Search & Accelerator Hunt (10 profile views per month)',
    'Email Templates (full access)',
    'Pitch Deck Analyzer (full access)',
    'Prompt Library (full access)',
    'Insighta Test',
    'Newspaper',
  ],
  pro: [
    'Dashboard Pro Mode',
    'Pro War Room with fundraising layer',
    'Find Your Angel (investors)',
    'Full BizMap AI tools access',
    'MVP Builder + GTM Strategist',
    'Unlimited discovery calls (mentorship)',
    'Unlimited Find a Co-Founder posts',
    'VC Search & Accelerator Hunt (unlimited profile views)',
    'Email Templates (full access)',
    'Pitch Deck Analyzer (full access)',
    'Prompt Library (full access)',
    'Insighta Test',
    'Newspaper',
  ],
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  dashboard_mode: 'Dashboard Mode',
  icp_builder: 'ICP Builder',
  waitlist_maker: 'Waitlist Maker',
  pmf_lab: 'PMF Lab',
  mvp_builder: 'MVP Builder',
  tech_stack: 'Tech Stack Builder',
  gtm_strategist: 'GTM Strategist',
  directories: 'Directories',
  discovery_calls: 'Discovery Calls',
  cofounder_posts: 'Find a Co-Founder posts',
  angels_community: 'Find Your Angel',
  vc_search_browse: 'VC Search',
  vc_search_profile: 'VC Search profiles',
  accelerator_browse: 'Accelerator Hunt',
  accelerator_profile: 'Accelerator Hunt profiles',
  email_templates: 'Email Templates',
  pitch_deck_analyzer: 'Pitch Deck Analyzer',
  prompt_library: 'Prompt Library',
  prompt_library_export: 'Prompt Library export',
  insighta_test: 'Insighta Test',
  newspaper: 'Newspaper',
  profile: 'Profile',
};

export const QUOTA_FEATURE_LABELS: Record<QuotaFeatureKey, { singular: string; plural: string }> = {
  discovery_calls: { singular: 'discovery call', plural: 'discovery calls' },
  cofounder_posts: { singular: 'Find a Co-Founder post', plural: 'Find a Co-Founder posts' },
  vc_search_profile: { singular: 'VC profile view', plural: 'VC profile views' },
  accelerator_profile: { singular: 'accelerator profile view', plural: 'accelerator profile views' },
};

export const FEATURE_ENTITLEMENTS: Record<FeatureKey, Record<Plan, FeatureEntitlementConfig>> = {
  dashboard_mode: {
    rookie: { state: 'full', dashboardMode: 'rookie' },
    starter: { state: 'full', dashboardMode: 'starter' },
    rising: { state: 'full', dashboardMode: 'rising' },
    pro: { state: 'full', dashboardMode: 'pro' },
  },

  icp_builder: {
    rookie: { state: 'full' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  waitlist_maker: {
    rookie: { state: 'credit_gated', creditFeature: 'WAITLIST_GENERATION' },
    starter: { state: 'credit_gated', creditFeature: 'WAITLIST_GENERATION' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  pmf_lab: {
    rookie: { state: 'preview_only', requiredPlan: 'starter' },
    starter: { state: 'credit_gated', creditFeature: 'PMF_ANALYSIS' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  mvp_builder: {
    rookie: { state: 'preview_only', requiredPlan: 'rising' },
    starter: { state: 'preview_only', requiredPlan: 'rising' },
    rising: { state: 'credit_gated', creditFeature: 'APP_BUILDER_GENERATE' },
    pro: { state: 'credit_gated', creditFeature: 'APP_BUILDER_GENERATE' },
  },
  tech_stack: {
    rookie: { state: 'preview_only', requiredPlan: 'rising' },
    starter: { state: 'preview_only', requiredPlan: 'rising' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  gtm_strategist: {
    rookie: { state: 'preview_only', requiredPlan: 'rising' },
    starter: { state: 'preview_only', requiredPlan: 'rising' },
    rising: { state: 'credit_gated', creditFeature: 'GTM_ANALYSIS' },
    pro: { state: 'credit_gated', creditFeature: 'GTM_ANALYSIS' },
  },
  directories: {
    rookie: { state: 'preview_only', requiredPlan: 'rising' },
    starter: { state: 'preview_only', requiredPlan: 'rising' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },

  discovery_calls: {
    rookie: { state: 'quota_limited', monthlyLimit: 1, requiredPlan: 'starter' },
    starter: { state: 'quota_limited', monthlyLimit: 2, requiredPlan: 'rising' },
    rising: { state: 'quota_limited', monthlyLimit: 3, requiredPlan: 'pro' },
    pro: { state: 'full' },
  },
  cofounder_posts: {
    rookie: { state: 'quota_limited', monthlyLimit: 1, requiredPlan: 'starter' },
    starter: { state: 'quota_limited', monthlyLimit: 2, requiredPlan: 'rising' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  angels_community: {
    rookie: { state: 'locked', visibility: 'hidden', requiredPlan: 'pro' },
    starter: { state: 'locked', visibility: 'hidden', requiredPlan: 'pro' },
    rising: { state: 'locked', visibility: 'hidden', requiredPlan: 'pro' },
    pro: { state: 'full' },
  },

  vc_search_browse: {
    rookie: { state: 'full' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  vc_search_profile: {
    rookie: { state: 'locked', requiredPlan: 'starter', monthlyLimit: 0 },
    starter: { state: 'quota_limited', monthlyLimit: 2, requiredPlan: 'rising' },
    rising: { state: 'quota_limited', monthlyLimit: 10, requiredPlan: 'pro' },
    pro: { state: 'full' },
  },
  accelerator_browse: {
    rookie: { state: 'full' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  accelerator_profile: {
    rookie: { state: 'locked', requiredPlan: 'starter', monthlyLimit: 0 },
    starter: { state: 'quota_limited', monthlyLimit: 2, requiredPlan: 'rising' },
    rising: { state: 'quota_limited', monthlyLimit: 10, requiredPlan: 'pro' },
    pro: { state: 'full' },
  },

  email_templates: {
    rookie: { state: 'locked', visibility: 'hidden', requiredPlan: 'starter' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  pitch_deck_analyzer: {
    rookie: { state: 'locked', visibility: 'hidden', requiredPlan: 'rising' },
    starter: { state: 'locked', visibility: 'hidden', requiredPlan: 'rising' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  prompt_library: {
    rookie: { state: 'full', freeModelsOnly: true },
    starter: { state: 'full', freeModelsOnly: true },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  prompt_library_export: {
    rookie: { state: 'locked', requiredPlan: 'rising' },
    starter: { state: 'locked', requiredPlan: 'rising' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  insighta_test: {
    rookie: { state: 'full' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  newspaper: {
    rookie: { state: 'full' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  profile: {
    rookie: { state: 'full' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
};

export const PLAN_PERMISSIONS: Record<FeatureKey, Record<Plan, AccessRule>> = Object.fromEntries(
  Object.entries(FEATURE_ENTITLEMENTS).map(([feature, plans]) => [
    feature,
    Object.fromEntries(
      Object.entries(plans).map(([plan, config]) => [plan, config.state])
    ),
  ])
) as Record<FeatureKey, Record<Plan, AccessRule>>;

export const MONTHLY_FREE_QUOTAS: Record<string, Record<Plan, number>> = {
  discovery_calls: { rookie: 1, starter: 2, rising: 3, pro: Infinity },
  cofounder_posts: { rookie: 1, starter: 2, rising: Infinity, pro: Infinity },
  vc_profiles: { rookie: 0, starter: 2, rising: 10, pro: Infinity },
  accelerator_profiles: { rookie: 0, starter: 2, rising: 10, pro: Infinity },
};

export const PLAN_SUMMARIES: Record<Plan, PlanSummary> = {
  rookie: {
    name: PLAN_LABELS.rookie,
    price: 0,
    monthlyCredits: PLAN_MONTHLY_CREDITS.rookie,
    vcViewLimit: MONTHLY_FREE_QUOTAS.vc_profiles.rookie,
    acceleratorViewLimit: MONTHLY_FREE_QUOTAS.accelerator_profiles.rookie,
    description: 'A guided Stage 1 dashboard with light monthly usage and previews of the later build and launch layers.',
  },
  starter: {
    name: PLAN_LABELS.starter,
    price: 9,
    monthlyCredits: PLAN_MONTHLY_CREDITS.starter,
    vcViewLimit: MONTHLY_FREE_QUOTAS.vc_profiles.starter,
    acceleratorViewLimit: MONTHLY_FREE_QUOTAS.accelerator_profiles.starter,
    description: 'Structured execution across Stages 1 to 3 with PMF workflows, prompt shortcuts, and light investor research.',
  },
  rising: {
    name: PLAN_LABELS.rising,
    price: 29,
    monthlyCredits: PLAN_MONTHLY_CREDITS.rising,
    vcViewLimit: MONTHLY_FREE_QUOTAS.vc_profiles.rising,
    acceleratorViewLimit: MONTHLY_FREE_QUOTAS.accelerator_profiles.rising,
    description: 'Full operating cockpit across all five stages with 10 VC and 10 accelerator profile views per billing cycle.',
  },
  pro: {
    name: PLAN_LABELS.pro,
    price: 65,
    monthlyCredits: PLAN_MONTHLY_CREDITS.pro,
    vcViewLimit: MONTHLY_FREE_QUOTAS.vc_profiles.pro,
    acceleratorViewLimit: MONTHLY_FREE_QUOTAS.accelerator_profiles.pro,
    description: 'Premium war room with Angels access, unlimited research views, and added support for fundraising execution.',
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

export function getNextPlan(plan: Plan): Plan {
  const currentIndex = PLAN_SEQUENCE.indexOf(plan);
  if (currentIndex < 0 || currentIndex === PLAN_SEQUENCE.length - 1) {
    return 'pro';
  }

  return PLAN_SEQUENCE[currentIndex + 1];
}

export function resolveEntitlement(feature: FeatureKey, plan: Plan): EntitlementResult {
  const config = FEATURE_ENTITLEMENTS[feature]?.[plan] ?? { state: 'full' as const };
  const state = config.state;
  const monthlyLimit = config.monthlyLimit;
  const creditCost = config.creditFeature ? getCreditCost(config.creditFeature) ?? undefined : undefined;

  let reason: RestrictionReason | undefined;
  if (state === 'preview_only') reason = 'preview_only';
  if (state === 'locked' || state === 'hidden') reason = 'plan_locked';

  return {
    plan,
    state,
    reason,
    upgradeTarget: config.requiredPlan,
    creditFeature: config.creditFeature,
    creditCost,
    monthlyLimit,
    dashboardMode: config.dashboardMode,
    uiMode:
      state === 'preview_only'
        ? 'preview'
        : state === 'locked' || state === 'hidden'
          ? 'locked'
          : 'full',
    isVisible: config.visibility !== 'hidden',
    freeModelsOnly: Boolean(config.freeModelsOnly),
  };
}

export function getMonthlyQuotaLimit(feature: QuotaFeatureKey, plan: Plan): number {
  switch (feature) {
    case 'discovery_calls':
      return MONTHLY_FREE_QUOTAS.discovery_calls[plan];
    case 'cofounder_posts':
      return MONTHLY_FREE_QUOTAS.cofounder_posts[plan];
    case 'vc_search_profile':
      return MONTHLY_FREE_QUOTAS.vc_profiles[plan];
    case 'accelerator_profile':
      return MONTHLY_FREE_QUOTAS.accelerator_profiles[plan];
    default:
      return 0;
  }
}

export function isUnlimitedQuotaLimit(limit: number): boolean {
  return !Number.isFinite(limit) || limit === Infinity;
}

export function getQuotaStatus(feature: QuotaFeatureKey, plan: Plan, used: number = 0): QuotaStatus {
  const entitlement = resolveEntitlement(feature, plan);
  const limit = getMonthlyQuotaLimit(feature, plan);
  const hasUnlimited = isUnlimitedQuotaLimit(limit);
  const remaining = hasUnlimited ? Infinity : Math.max(0, limit - used);
  const isLocked = entitlement.state === 'locked' || entitlement.state === 'hidden';
  const canUse = entitlement.state === 'full' || (entitlement.state === 'quota_limited' && remaining > 0);

  return {
    feature,
    plan,
    state: entitlement.state,
    used,
    limit,
    remaining,
    hasUnlimited,
    canUse,
    isLocked,
    upgradeTarget: entitlement.upgradeTarget,
  };
}
