import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useUpgradePrompt } from '@/contexts/UpgradePromptContext';
import { CREDIT_COSTS, CreditFeature, getCreditCost } from '@/config/constants';
import { toast } from 'sonner';

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
};

type CreditActionOptions = {
  featureName?: string;
  requiredCredits?: number;
  requiredTier?: 'creator' | 'professional';
  description?: string;
  metadata?: Record<string, unknown>;
};

const resolveFeatureLabel = (feature: CreditFeature, override?: string) =>
  override || CREDIT_FEATURE_LABELS[feature] || feature;

const resolveCreditCost = (feature: CreditFeature, override?: number) => {
  if (typeof override === 'number') return override;
  return getCreditCost(feature) ?? CREDIT_COSTS[feature];
};

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
  const { hasCredits, refreshBalance } = useCredits();
  const { openUpgradePrompt } = useUpgradePrompt();

  const ensureCredits = useCallback(
    (feature: CreditFeature, options: CreditActionOptions = {}) => {
      if (!user) {
        toast.error('Please sign in to use this feature.');
        return null;
      }

      const requiredCredits = resolveCreditCost(feature, options.requiredCredits);
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
    [hasCredits, openUpgradePrompt, user]
  );

  const handleCreditError = useCallback(
    (error: any, data: any, feature: CreditFeature, options: CreditActionOptions = {}) => {
      if (!isCreditError(error, data)) return false;
      const requiredCredits = resolveCreditCost(
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
    [openUpgradePrompt]
  );

  const deductCredits = useCallback(
    async (feature: CreditFeature, options: CreditActionOptions = {}) => {
      if (!user) {
        toast.error('Please sign in to use this feature.');
        return false;
      }

      const requiredCredits = ensureCredits(feature, options);
      if (requiredCredits === null) return false;
      if (requiredCredits === 0) return true;

      const featureLabel = resolveFeatureLabel(feature, options.featureName);

      const { data, error } = await supabase.functions.invoke('credit-service', {
        body: {
          action: 'deductCredits',
          user_id: user.id,
          amount: requiredCredits,
          tx_type: 'deduct',
          feature: featureLabel,
          reason: `Used ${requiredCredits} credits for ${featureLabel}`,
          metadata: options.metadata,
        },
      });

      if (error || !data?.success) {
        handleCreditError(error, data, feature, options);
        return false;
      }

      await refreshBalance();
      return true;
    },
    [ensureCredits, handleCreditError, refreshBalance, user]
  );

  return {
    ensureCredits,
    handleCreditError,
    deductCredits,
  };
};

