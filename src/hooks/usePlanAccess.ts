import { useSubscription } from '@/hooks/useSubscription';
import {
  type Plan,
  type AccessRule,
  PLAN_PERMISSIONS,
  MONTHLY_FREE_QUOTAS,
} from '@/config/planPermissions';

export interface PlanAccessResult {
  /** The raw access rule for this feature on the user's plan */
  rule: AccessRule;
  /** True if the user can access this feature (rule is not 'locked') */
  hasAccess: boolean;
  /** True if the feature costs credits to use */
  requiresCredits: boolean;
  /** True if this feature is quota-limited (3/month style) */
  isQuotaLimited: boolean;
  /** True if this feature is locked due to stage progression (not plan) */
  isProgressiveLock: boolean;
  /** The user's current plan */
  plan: Plan;
  /** Monthly free quota for this feature (Infinity = unlimited, 0 = none) */
  monthlyFreeQuota: number;
}

/**
 * Determines a user's access to a specific feature based on their plan.
 *
 * This hook handles TIER-LEVEL access only.
 * Credit checking is still handled by useFeatureGating / useCreditActions.
 *
 * Usage:
 *   const { hasAccess, rule, plan } = usePlanAccess('angels_community');
 *   if (!hasAccess) return <LockedPageOverlay requiredPlan="pro" ... />;
 */
export function usePlanAccess(feature: string): PlanAccessResult {
  const { subscriptionData } = useSubscription();

  // Normalise the tier string from the DB to our Plan type.
  // Falls back to 'rookie' (was 'free') if unknown.
  const rawTier = subscriptionData?.subscription_tier ?? 'rookie';
  const plan: Plan = isValidPlan(rawTier) ? rawTier : 'rookie';

  const featureRules = PLAN_PERMISSIONS[feature];
  const rule: AccessRule = featureRules?.[plan] ?? 'full';

  const hasAccess = rule !== 'locked';
  const requiresCredits = rule === 'credits' || rule === 'quota_3_free_then_credits';
  const isQuotaLimited =
    rule === 'quota_1_per_month' ||
    rule === 'quota_2_per_month' ||
    rule === 'quota_10_per_month' ||
    rule === 'quota_3_free_then_credits';
  const isProgressiveLock = rule === 'locked_progressive';

  // Look up the monthly free quota for quota-limited features
  const quotaKey = featureToQuotaKey(feature);
  const monthlyFreeQuota = quotaKey
    ? (MONTHLY_FREE_QUOTAS[quotaKey]?.[plan] ?? 0)
    : 0;

  return {
    rule,
    hasAccess,
    requiresCredits,
    isQuotaLimited,
    isProgressiveLock,
    plan,
    monthlyFreeQuota,
  };
}

function isValidPlan(value: string): value is Plan {
  return value === 'rookie' || value === 'starter' || value === 'rising' || value === 'pro';
}

function featureToQuotaKey(feature: string): string | null {
  if (feature === 'discovery_calls') return 'discovery_calls';
  if (feature === 'vc_search_profile') return 'vc_profiles';
  if (feature === 'accelerator_profile') return 'accelerator_profiles';
  return null;
}
