import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useMonthlyQuotas } from '@/hooks/useMonthlyQuotas';
import { useSubscription } from '@/hooks/useSubscription';
import { useUpgradePrompt } from '@/contexts/UpgradePromptContext';
import { CREDIT_COSTS, CreditFeature, getCreditCost } from '@/config/constants';
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

const ALWAYS_PAID_FEATURES = new Set<string>([
  'DISCOVERY_CALL',
  'LAUNCH_REPORT',
  'GTM_ANALYSIS',
  'ROADMAP_GENERATION',
  'APP_BUILDER_GENERATE',
  'APP_BUILDER_REFINE',
]);

const INCLUDED_ON_PAID_PLANS = new Set<string>([
  'WAITLIST_GENERATION',
  'PMF_ANALYSIS',
  'PMF_SCORING',
  'TECH_STACK_GENERATION',
  'PITCH_DECK_ANALYZER',
  'EMAIL_TEMPLATE_GENERATION',
  'FUNDRAISING_READINESS_ANALYSIS',
]);

const isCreditError = (error?: any, data?: any) => {
  if (!error && !data) return false;
  if (error?.status === 402) return true;
  if (typeof error?.message === 'string' && error.message.toLowerCase().includes('credit')) return true;
  if (data?.creditError || data?.required || data?.requiredCredits) return true;
  if (typeof data?.error === 'string' && data.error.toLowerCase().includes('credit')) return true;
  return false;
};

export const useCreditActions = () => {
  const { user } = useAuth();
  const { hasCredits, refreshBalance, loading: creditsLoading } = useCredits();
  const { subscriptionData } = useSubscription();
  const { quotas, cycleStart, refreshQuotas } = useMonthlyQuotas();
  const { openUpgradePrompt } = useUpgradePrompt();
  const currentTier = subscriptionData?.subscription_tier || 'rookie';

  const getDiscoveryCallRequiredCredits = useCallback(() => {
    if (currentTier === 'pro') return 0;

    const freeQuotaByTier: Record<string, number> = {
      rookie: 1,
      starter: 2,
      rising: 3,
      pro: Infinity,
    };

    const freeQuota = freeQuotaByTier[currentTier] ?? 0;
    if (freeQuota > quotas.discovery_calls_used) {
      return 0;
    }

    return CREDIT_COSTS.DISCOVERY_CALL;
  }, [currentTier, quotas.discovery_calls_used]);

  const getEffectiveRequiredCredits = useCallback(
    (feature: string, override?: number) => {
      if (typeof override === 'number') {
        return override;
      }

      if (feature === 'DISCOVERY_CALL') {
        return getDiscoveryCallRequiredCredits();
      }

      if (currentTier === 'rising' || currentTier === 'pro') {
        if (!ALWAYS_PAID_FEATURES.has(feature) && INCLUDED_ON_PAID_PLANS.has(feature)) {
          return 0;
        }
      }

      return resolveCreditCost(feature as CreditFeature, override);
    },
    [currentTier, getDiscoveryCallRequiredCredits]
  );

  const consumeDiscoveryCallQuota = useCallback(async () => {
    if (!user || !cycleStart) return false;

    const nextUsed = (quotas.discovery_calls_used ?? 0) + 1;
    const { error } = await supabase
      .from('user_monthly_quotas')
      .upsert({
        user_id: user.id,
        month: cycleStart,
        discovery_calls_used: nextUsed,
      }, { onConflict: 'user_id,month' });

    if (error) {
      toast.error('Unable to reserve your discovery-call quota right now.');
      return false;
    }

    await refreshQuotas();
    return true;
  }, [cycleStart, quotas.discovery_calls_used, refreshQuotas, user]);

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
    [creditsLoading, getEffectiveRequiredCredits, hasCredits, openUpgradePrompt, user]
  );

  const handleCreditError = useCallback(
    (error: any, data: any, feature: CreditFeature, options: CreditActionOptions = {}) => {
      if (!isCreditError(error, data)) return false;
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
      if (requiredCredits === 0) {
        if (feature === 'DISCOVERY_CALL' && currentTier !== 'pro') {
          return consumeDiscoveryCallQuota();
        }
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
          reason: `Used ${requiredCredits} credits for ${featureLabel}`,
          metadata,
        },
      });

      if (error || !data?.success) {
        handleCreditError(error, data, feature, options);
        return false;
      }

      await refreshBalance();
      return true;
    },
    [consumeDiscoveryCallQuota, currentTier, ensureCredits, handleCreditError, refreshBalance, user]
  );

  return {
    ensureCredits,
    handleCreditError,
    deductCredits,
  };
};
