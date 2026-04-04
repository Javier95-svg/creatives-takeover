/**
 * Canonical plan-entitlement catalog.
 *
 * Route guards, dashboard rendering, quota widgets, and credit charging should
 * all resolve from this file instead of hardcoded tier checks.
 */

import type { CreditFeature } from '@/config/constants';

export type Plan = 'rookie' | 'starter' | 'rising' | 'pro';

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
  creditCost?: number;
  monthlyLimit?: number;
  usedThisMonth?: number;
  remaining?: number;
  resetsAt?: string;
  uiMode: 'full' | 'preview' | 'locked';
  isVisible: boolean;
  freeModelsOnly: boolean;
}

export const PLAN_LABELS: Record<Plan, string> = {
  rookie: 'Rookie',
  starter: 'Starter',
  rising: 'Rising',
  pro: 'Pro',
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
    rising: { state: 'quota_limited', monthlyLimit: 5, requiredPlan: 'pro' },
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
    rising: { state: 'quota_limited', monthlyLimit: 5, requiredPlan: 'pro' },
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
  vc_profiles: { rookie: 0, starter: 2, rising: 5, pro: Infinity },
  accelerator_profiles: { rookie: 0, starter: 2, rising: 5, pro: Infinity },
};

export function normalizePlan(value: string | null | undefined): Plan {
  const normalized = (value || 'rookie').trim().toLowerCase();

  if (['pro', 'professional', 'elite', 'team', 'teams', 'enterprise'].includes(normalized)) {
    return 'pro';
  }
  if (['rising', 'creator'].includes(normalized)) {
    return 'rising';
  }
  if (normalized === 'starter') {
    return 'starter';
  }

  return 'rookie';
}

export function resolveEntitlement(feature: FeatureKey, plan: Plan): EntitlementResult {
  const config = FEATURE_ENTITLEMENTS[feature]?.[plan] ?? { state: 'full' as const };
  const state = config.state;
  const monthlyLimit = config.monthlyLimit;

  let reason: RestrictionReason | undefined;
  if (state === 'preview_only') reason = 'preview_only';
  if (state === 'locked' || state === 'hidden') reason = 'plan_locked';

  return {
    plan,
    state,
    reason,
    upgradeTarget: config.requiredPlan,
    monthlyLimit,
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

export function getMonthlyQuotaLimit(feature: FeatureKey, plan: Plan): number {
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
