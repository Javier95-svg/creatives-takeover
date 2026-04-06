import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useMonthlyQuotas } from '@/hooks/useMonthlyQuotas';
import { useSubscription } from '@/hooks/useSubscription';
import { useUpgradePrompt } from '@/contexts/UpgradePromptContext';
import { CREDIT_COSTS, CreditFeature, getCreditCost } from '@/config/constants';
import { getQuotaStatus, normalizePlan, type Plan } from '@/config/planPermissions';
import { toast } from 'sonner';
import { createIdempotencyKey } from '@/lib/idempotency';

const CREDIT_FEATURE_LABELS: Record<CreditFeature, string> = {
  LAUNCH_REPORT: 'Launch Report Generation',
  ASSET_GENERATION: 'Asset Generation',
  PREMIUM_FEATURE: 'Premium Feature',
  AI_CHAT_MESSAGE: 'AI Chat Message',
  MARKET_RESEARCH: 'Market Research',
  MARKET_VALIDATION: 'Market Validation',
  FINANCIAL_ANALYSIS: 'Financial Analysis',
  FUNDRAISING_READINESS_ANALYSIS: 'Insighta Test',
  BUSINESS_INSIGHTS: 'Business Insights',
  PMF_ANALYSIS: 'Product-Market Fit Lab',
  INVESTOR_MATCHING: 'Investor Matching',
  PITCH_DECK_GENERATION: 'Pitch Deck Generation',
  COLD_EMAIL_GENERATION: 'Cold Email Generation',
  ONEPAGER_GENERATION: 'One-Pager Generation',
  SPRINT_TASK_GENERATION: 'Sprint Task Generation',
  ROADMAP_GENERATION: 'Roadmap Generation',
  TECH_STACK_GENERATION: 'Tech Stack Generation',
  PDF_EXPORT: 'PDF Export',
  ADVANCED_ANALYTICS: 'Advanced Analytics',
  PITCH_DECK_ANALYZER: 'Pitch Deck Analyzer',
  EMAIL_TEMPLATE_GENERATION: 'Email Template Generation',
  PROMPT_GENERATION: 'Prompt Generation',
  DISCOVERY_CALL: 'Discovery Call',
  ICP_ANALYSIS: 'ICP Analysis',
};

type CreditActionOptions = {
  featureName?: string;
  requiredCredits?: number;
  requiredTier?: 'starter' | 'rising' | 'pro';
  description?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  operationId?: string;
};

const resolveFeatureLabel = (feature: CreditFeature, override?: string) =>
  override || CREDIT_FEATURE_LABELS[feature] || feature;

const resolveCreditCost = (feature: CreditFeature, override?: number) => {
  if (typeof override === 'number') return override;
  return getCreditCost(feature) ?? CREDIT_COSTS[feature];
};

const PLAN_SEQUENCE: Plan[] = ['rookie', 'starter', 'rising', 'pro'];

const FEATURE_MINIMUM_PLAN: Partial<Record<CreditFeature, Plan>> = {
  EMAIL_TEMPLATE_GENERATION: 'starter',
  PMF_ANALYSIS: 'starter',
  PMF_SCORING: 'starter',
  APP_BUILDER_GENERATE: 'rising',
  APP_BUILDER_REFINE: 'rising',
  GTM_ANALYSIS: 'rising',
  TECH_STACK_GENERATION: 'rising',
  PITCH_DECK_ANALYZER: 'rising',
  PROMPT_GENERATION: 'rising',
};

const FEATURE_INCLUDED_ON_PLAN: Partial<Record<CreditFeature, Plan>> = {
  WAITLIST_GENERATION: 'rising',
  PMF_ANALYSIS: 'rising',
  PMF_SCORING: 'rising',
  TECH_STACK_GENERATION: 'rising',
  PITCH_DECK_ANALYZER: 'rising',
  EMAIL_TEMPLATE_GENERATION: 'starter',
  FUNDRAISING_READINESS_ANALYSIS: 'rookie',
  ICP_ANALYSIS: 'rookie',
  PROMPT_GENERATION: 'rising',
};

const ALWAYS_PAID_FEATURES = new Set<string>([
  'LAUNCH_REPORT',
  'GTM_ANALYSIS',
  'ROADMAP_GENERATION',
  'APP_BUILDER_GENERATE',
  'APP_BUILDER_REFINE',
]);

const ALWAYS_FREE_FEATURES = new Set<string>([
  'ICP_ANALYSIS',
  'FUNDRAISING_READINESS_ANALYSIS',
]);

const isPlanAtLeast = (plan: Plan, minimumPlan: Plan) =>
  PLAN_SEQUENCE.indexOf(plan) >= PLAN_SEQUENCE.indexOf(minimumPlan);

const isCreditError = (error?: any, data?: any) => {
  if (!error && !data) return false;
  if (error?.status === 402) return true;
  if (typeof error?.message === 'string' && error.message.toLowerCase().includes('credit')) return true;
  if (data?.creditError || data?.required || data?.requiredCredits) return true;
  if (typeof data?.error === 'string' && data.error.toLowerCase().includes('credit')) return true;
  if (data?.errorCode === 'PLAN_UPGRADE_REQUIRED' || data?.errorCode === 'QUOTA_LIMIT_REACHED') return true;
  return false;
};

export const useCreditActions = () => {
  const { user } = useAuth();
  const { hasCredits, refreshBalance, loading: creditsLoading } = useCredits();
  const { subscriptionData } = useSubscription();
  const { quotas, refreshQuotas } = useMonthlyQuotas();
  const { openUpgradePrompt } = useUpgradePrompt();
  const currentTier = normalizePlan(subscriptionData?.subscription_tier);

  const getEffectiveRequiredCredits = useCallback(
    (feature: string, override?: number) => {
      if (typeof override === 'number') {
        return override;
      }

      if (feature === 'DISCOVERY_CALL') {
        return 0;
      }

      if (ALWAYS_FREE_FEATURES.has(feature)) {
        return 0;
      }

      const includedOnPlan = FEATURE_INCLUDED_ON_PLAN[feature as CreditFeature];
      if (includedOnPlan && isPlanAtLeast(currentTier, includedOnPlan) && !ALWAYS_PAID_FEATURES.has(feature)) {
        return 0;
      }

      return resolveCreditCost(feature as CreditFeature, override);
    },
    [currentTier]
  );

  const ensureCredits = useCallback(
    (feature: CreditFeature, options: CreditActionOptions = {}) => {
      if (!user) {
        toast.error('Please sign in to use this feature.');
        return null;
      }

      if (creditsLoading) {
        toast('Loading credit balance...');
        return null;
      }

      const minimumPlan = FEATURE_MINIMUM_PLAN[feature];
      if (minimumPlan && !isPlanAtLeast(currentTier, minimumPlan)) {
        openUpgradePrompt({
          reason: 'feature',
          featureName: resolveFeatureLabel(feature, options.featureName),
          requiredTier: minimumPlan,
          description: options.description,
        });
        return null;
      }

      if (feature === 'DISCOVERY_CALL') {
        const discoveryQuota = getQuotaStatus('discovery_calls', currentTier, quotas.discovery_calls_used ?? 0);

        if (!discoveryQuota.canUse) {

          openUpgradePrompt({
            reason: 'feature',
            featureName: 'Discovery Calls',
            requiredTier: discoveryQuota.upgradeTarget,
            description: `You have used all ${discoveryQuota.limit} discovery call${discoveryQuota.limit === 1 ? '' : 's'} for this month.`,
          });
          return null;
        }
      }

      const requiredCredits = getEffectiveRequiredCredits(feature, options.requiredCredits);
      if (!requiredCredits || requiredCredits <= 0) {
        return 0;
      }

      if (!hasCredits(requiredCredits)) {
        openUpgradePrompt({
          reason: 'credits',
          requiredCredits,
          featureName: resolveFeatureLabel(feature, options.featureName),
          requiredTier: options.requiredTier,
          description: options.description,
        });
        return null;
      }

      return requiredCredits;
    },
    [creditsLoading, currentTier, getEffectiveRequiredCredits, hasCredits, openUpgradePrompt, quotas.discovery_calls_used, user]
  );

  const handleCreditError = useCallback(
    (error: any, data: any, feature: CreditFeature, options: CreditActionOptions = {}) => {
      if (!isCreditError(error, data)) return false;
      if (data?.errorCode === 'PLAN_UPGRADE_REQUIRED' || data?.requiredTier) {
        openUpgradePrompt({
          reason: 'feature',
          featureName: resolveFeatureLabel(feature, options.featureName),
          requiredTier: (data?.requiredTier as Plan | undefined) || FEATURE_MINIMUM_PLAN[feature],
          description: data?.error || options.description,
        });
        return true;
      }
      if (data?.errorCode === 'QUOTA_LIMIT_REACHED') {
        openUpgradePrompt({
          reason: 'feature',
          featureName: resolveFeatureLabel(feature, options.featureName),
          requiredTier: data?.requiredTier as Plan | undefined,
          description: data?.error || options.description,
        });
        return true;
      }
      const requiredCredits = getEffectiveRequiredCredits(
        feature,
        options.requiredCredits ?? data?.requiredCredits ?? data?.required
      );
      openUpgradePrompt({
        reason: 'credits',
        requiredCredits,
        featureName: resolveFeatureLabel(feature, options.featureName),
        requiredTier: options.requiredTier,
        description: options.description,
      });
      return true;
    },
    [getEffectiveRequiredCredits, openUpgradePrompt]
  );

  const deductCredits = useCallback(
    async (feature: CreditFeature, options: CreditActionOptions = {}) => {
      if (!user) {
        toast.error('Please sign in to use this feature.');
        return false;
      }

      const requiredCredits = ensureCredits(feature, options);
      if (requiredCredits === null) return false;
      if (requiredCredits === 0 && feature !== 'DISCOVERY_CALL') {
        return true;
      }

      const featureLabel = resolveFeatureLabel(feature, options.featureName);
      const requestIdempotencyKey = options.idempotencyKey || createIdempotencyKey(
        `credit-deduct-${feature.toLowerCase()}`,
        options.operationId
      );
      const metadata = {
        ...(options.metadata || {}),
        operationId: options.operationId || requestIdempotencyKey,
      };

      const { data, error } = await supabase.functions.invoke('credit-service', {
        headers: { 'Idempotency-Key': requestIdempotencyKey },
        body: {
          action: 'deductCredits',
          amount: requiredCredits,
          tx_type: 'deduct',
          feature: featureLabel,
          featureCode: feature,
          reason: `Used ${requiredCredits} credits for ${featureLabel}`,
          metadata,
        },
      });

      if (error || !data?.success) {
        handleCreditError(error, data, feature, options);
        return false;
      }

      if (feature === 'DISCOVERY_CALL') {
        await refreshQuotas();
      }

      await refreshBalance();
      return true;
    },
    [ensureCredits, handleCreditError, refreshBalance, refreshQuotas, user]
  );

  return {
    ensureCredits,
    handleCreditError,
    deductCredits,
  };
};
