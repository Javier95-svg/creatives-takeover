import { useSubscription } from '@/hooks/useSubscription';
import {
  type Plan,
  type AccessRule,
  type FeatureKey,
  resolveEntitlement,
  getMonthlyQuotaLimit,
  normalizePlan,
} from '@/config/planPermissions';

export interface PlanAccessResult {
  rule: AccessRule;
  hasAccess: boolean;
  requiresCredits: boolean;
  isQuotaLimited: boolean;
  isProgressiveLock: boolean;
  plan: Plan;
  monthlyFreeQuota: number;
  state: AccessRule;
  upgradeTarget?: Plan;
  uiMode: 'full' | 'preview' | 'locked';
  isVisible: boolean;
  freeModelsOnly: boolean;
}

export function usePlanAccess(feature: FeatureKey): PlanAccessResult {
  const { subscriptionData } = useSubscription();
  const plan = normalizePlan(subscriptionData?.subscription_tier);
  const entitlement = resolveEntitlement(feature, plan);

  const hasAccess =
    entitlement.state === 'full' ||
    entitlement.state === 'credit_gated' ||
    entitlement.state === 'quota_limited';

  const monthlyFreeQuota = getMonthlyQuotaLimit(feature, plan);

  return {
    rule: entitlement.state,
    hasAccess,
    requiresCredits: entitlement.state === 'credit_gated',
    isQuotaLimited: entitlement.state === 'quota_limited',
    isProgressiveLock: false,
    plan,
    monthlyFreeQuota,
    state: entitlement.state,
    upgradeTarget: entitlement.upgradeTarget,
    uiMode: entitlement.uiMode,
    isVisible: entitlement.isVisible,
    freeModelsOnly: entitlement.freeModelsOnly,
  };
}
