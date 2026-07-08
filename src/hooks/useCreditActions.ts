import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useMonthlyQuotas } from '@/hooks/useMonthlyQuotas';
import { useSubscription } from '@/hooks/useSubscription';
import { useUpgradePrompt } from '@/contexts/UpgradePromptContext';
import { useCreditGate } from '@/contexts/CreditGateContext';
import { CREDIT_COSTS, CreditFeature, getCreditCostForPlan } from '@/config/constants';
import { normalizePlan, type Plan } from '@/config/planPermissions';
import { toast } from 'sonner';
import { createIdempotencyKey } from '@/lib/idempotency';
import { trackActivity } from '@/lib/activity';
import { isMVPBuilderCreditFeature, resolveMVPBuilderChargeAmount } from '@/lib/mvpBuilderCredits';

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
  PMF_SCORING: 'PMF Evidence Score',
  PMF_DISCOVERY: 'PMF Customer Discovery',
  GTM_ANALYSIS: 'GTM Strategist',
  WAITLIST_GENERATION: 'Demo Studio',
  APP_BUILDER_GENERATE: 'MVP Builder Generation',
  APP_BUILDER_REFINE: 'MVP Builder Refinement',
  APP_BUILDER_DEBUG: 'MVP Builder Bug Fix',
  APP_BUILDER_ADD_PAGE: 'MVP Builder Add Page',
  APP_BUILDER_ADD_FEATURE: 'MVP Builder Add Feature',
  APP_BUILDER_DESIGN_OVERHAUL: 'MVP Builder Design Overhaul',
  APP_BUILDER_DEPLOY: 'MVP Builder Publish',
  APP_BUILDER_RESTORE: 'MVP Builder Restore',
  APP_BUILDER_EXPORT: 'MVP Builder Export',
  APP_BUILDER_CHAT: 'MVP Builder Chat',
  APP_BUILDER_GITHUB_EDIT: 'MVP Builder GitHub Edit',
  INVESTOR_MATCHING: 'Investor Matching',
  PITCH_DECK_GENERATION: 'Pitch Deck Generation',
  COLD_EMAIL_GENERATION: 'Cold Email Generation',
  ONEPAGER_GENERATION: 'One-Pager Generation',
  SPRINT_TASK_GENERATION: 'Sprint Task Generation',
  ROADMAP_GENERATION: 'Roadmap Generation',
  TRACTION_ENGINE_SCORECARD: 'Traction Engine Scorecard',
  TECH_STACK_GENERATION: 'Tech Stack Generation',
  PDF_EXPORT: 'PDF Export',
  ADVANCED_ANALYTICS: 'Advanced Analytics',
  PITCH_DECK_ANALYZER: 'Pitch Deck Analyzer',
  EMAIL_TEMPLATE_GENERATION: 'Email Template Generation',
  PROMPT_GENERATION: 'Prompt Generation',
  DISCOVERY_CALL: 'Discovery Call',
  SERVICE_MARKETPLACE_MESSAGE: 'Service Marketplace Message',
  SERVICE_MARKETPLACE_EMAIL: 'Service Marketplace Email',
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
  allowPartialSpend?: boolean;
  suppressCreditPrompt?: boolean;
};

type MVPBuilderReservationResult = {
  success: boolean;
  reservationId?: string;
  reservationStatus?: 'pending' | 'finalized' | 'released' | 'expired';
  listedCreditCost?: number;
  heldCredits?: number;
  creditsUsed?: number;
  balanceAfter?: number;
  releaseReason?: string;
  error?: string;
  errorCode?: string;
};

export type CreditActionQuoteStatus = 'free' | 'metered' | 'locked';

export type CreditActionQuote = {
  feature: CreditFeature;
  featureName: string;
  requiredCredits: number;
  totalAvailable: number;
  requiredTier?: Plan;
  currentTier: Plan;
  status: CreditActionQuoteStatus;
  canProceed: boolean;
};

const resolveFeatureLabel = (feature: CreditFeature, override?: string) =>
  override || CREDIT_FEATURE_LABELS[feature] || feature;

const resolveCreditCost = (feature: CreditFeature, plan: Plan, override?: number) => {
  if (typeof override === 'number') return override;
  return getCreditCostForPlan(feature, plan) ?? CREDIT_COSTS[feature];
};

const PLAN_SEQUENCE: Plan[] = ['rookie', 'starter', 'rising', 'pro'];

const FEATURE_MINIMUM_PLAN: Partial<Record<CreditFeature, Plan>> = {
  EMAIL_TEMPLATE_GENERATION: 'starter',
  // PMF Lab, GTM Strategist, Tech Stack Builder & Pitch Deck Analyzer are open to
  // every plan and billed per generation from credits (no plan floor). The Pitch
  // Deck Analyzer gives a free anonymous first score, then charges every signed-in
  // analysis on all plans — see plan-enforcement.ts + FEATURE_ENTITLEMENTS.
  PROMPT_GENERATION: 'rising',
};

const FEATURE_INCLUDED_ON_PLAN: Partial<Record<CreditFeature, Plan>> = {
  EMAIL_TEMPLATE_GENERATION: 'starter',
  FUNDRAISING_READINESS_ANALYSIS: 'rookie',
  ICP_ANALYSIS: 'rookie',
};

const FEATURE_JOURNEY_TRIGGER: Partial<Record<CreditFeature, string>> = {
  APP_BUILDER_GENERATE: 'starter_tool_mvp',
  APP_BUILDER_REFINE: 'starter_tool_mvp',
  APP_BUILDER_DEBUG: 'starter_tool_mvp',
  APP_BUILDER_ADD_PAGE: 'starter_tool_mvp',
  APP_BUILDER_ADD_FEATURE: 'starter_tool_mvp',
  APP_BUILDER_DESIGN_OVERHAUL: 'starter_tool_mvp',
  APP_BUILDER_DEPLOY: 'starter_tool_mvp',
  APP_BUILDER_RESTORE: 'starter_tool_mvp',
  APP_BUILDER_EXPORT: 'starter_tool_mvp',
  APP_BUILDER_CHAT: 'starter_tool_mvp',
  APP_BUILDER_GITHUB_EDIT: 'starter_tool_mvp',
  GTM_ANALYSIS: 'starter_tool_gtm',
  TECH_STACK_GENERATION: 'starter_tool_tech',
};

const ALWAYS_PAID_FEATURES = new Set<string>([
  'LAUNCH_REPORT',
  'ROADMAP_GENERATION',
  'WAITLIST_GENERATION',
  'PMF_ANALYSIS',
  'PMF_SCORING',
  'PMF_DISCOVERY',
  'APP_BUILDER_GENERATE',
  'APP_BUILDER_REFINE',
  'APP_BUILDER_DEBUG',
  'APP_BUILDER_ADD_PAGE',
  'APP_BUILDER_ADD_FEATURE',
  'APP_BUILDER_DESIGN_OVERHAUL',
  'APP_BUILDER_DEPLOY',
  'APP_BUILDER_RESTORE',
  'APP_BUILDER_EXPORT',
  'APP_BUILDER_CHAT',
  'APP_BUILDER_GITHUB_EDIT',
  'GTM_ANALYSIS',
  'TECH_STACK_GENERATION',
  'PITCH_DECK_ANALYZER',
  'PROMPT_GENERATION',
  'TRACTION_ENGINE_SCORECARD',
  'SERVICE_MARKETPLACE_MESSAGE',
  'SERVICE_MARKETPLACE_EMAIL',
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
  const { totalAvailable, hasCredits, refreshBalance, loading: creditsLoading } = useCredits();
  const { subscriptionData } = useSubscription();
  const { refreshQuotas } = useMonthlyQuotas();
  const { openUpgradePrompt } = useUpgradePrompt();
  const { showHardGate } = useCreditGate();
  const currentTier = normalizePlan(subscriptionData?.subscription_tier);

  const getEffectiveRequiredCredits = useCallback(
    (feature: string, override?: number) => {
      if (typeof override === 'number') {
        return override;
      }

      if (ALWAYS_FREE_FEATURES.has(feature)) {
        return 0;
      }

      const includedOnPlan = FEATURE_INCLUDED_ON_PLAN[feature as CreditFeature];
      if (includedOnPlan && isPlanAtLeast(currentTier, includedOnPlan) && !ALWAYS_PAID_FEATURES.has(feature)) {
        return 0;
      }

      return resolveCreditCost(feature as CreditFeature, currentTier, override);
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

      const requiredCredits = getEffectiveRequiredCredits(feature, options.requiredCredits);
      if (!requiredCredits || requiredCredits <= 0) {
        return 0;
      }

      const minimumPlan = FEATURE_MINIMUM_PLAN[feature];
      if (minimumPlan && !isPlanAtLeast(currentTier, minimumPlan)) {
        const featureLabel = resolveFeatureLabel(feature, options.featureName);
        openUpgradePrompt({
          reason: 'feature',
          featureName: featureLabel,
          requiredTier: minimumPlan,
          description: options.description,
          journeyTrigger: FEATURE_JOURNEY_TRIGGER[feature],
          sourceTool: featureLabel,
        });
        return null;
      }

      if (options.allowPartialSpend && isMVPBuilderCreditFeature(feature)) {
        if (totalAvailable === 0) {
          // The browser cache can briefly be stale or unavailable. MVP Builder
          // actions ask the authenticated backend wallet to make the final call.
          return requiredCredits;
        }
        return resolveMVPBuilderChargeAmount(feature, requiredCredits, totalAvailable, true);
      }

      if (currentTier === 'rookie' && totalAvailable === 0 && showHardGate()) {
        return null;
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
    [creditsLoading, currentTier, getEffectiveRequiredCredits, hasCredits, openUpgradePrompt, showHardGate, totalAvailable, user]
  );

  const getCreditActionQuote = useCallback(
    (feature: CreditFeature, options: CreditActionOptions = {}): CreditActionQuote => {
      const requiredCredits = getEffectiveRequiredCredits(feature, options.requiredCredits) || 0;
      const minimumPlan = options.requiredTier || FEATURE_MINIMUM_PLAN[feature];
      const locked = Boolean(minimumPlan && !isPlanAtLeast(currentTier, minimumPlan));
      const status: CreditActionQuoteStatus = locked
        ? 'locked'
        : requiredCredits > 0
        ? 'metered'
        : 'free';

      return {
        feature,
        featureName: resolveFeatureLabel(feature, options.featureName),
        requiredCredits,
        totalAvailable,
        requiredTier: minimumPlan,
        currentTier,
        status,
        canProceed: !locked && (requiredCredits <= 0 || hasCredits(requiredCredits)),
      };
    },
    [currentTier, getEffectiveRequiredCredits, hasCredits, totalAvailable]
  );

  const showCreditReceipt = useCallback(
    (feature: CreditFeature, creditsUsed: number, balanceAfter?: number, options: CreditActionOptions = {}) => {
      const featureLabel = resolveFeatureLabel(feature, options.featureName);
      const nextBalance = typeof balanceAfter === 'number' ? balanceAfter : Math.max(0, totalAvailable - creditsUsed);

      // NOTE: credit_action_completed is now emitted server-side (single source)
      // by checkAndDeductCredits / MVP finalize / discovery-call-service, so every
      // charge is counted exactly once. The frontend only owns the toast + the
      // tool_completed activity feed entry below.

      void trackActivity('tool_completed', {
        feature_key: feature,
        feature_name: featureLabel,
        credits_charged: creditsUsed,
        charge_status: creditsUsed > 0 ? 'charged' : 'free',
        operation_id: options.operationId || options.idempotencyKey || options.metadata?.operationId,
        balance_after: nextBalance,
        plan: currentTier,
        source_tool: featureLabel,
      }, user?.id);

      if (creditsUsed <= 0) {
        toast.success(`${featureLabel} completed.`);
        return;
      }

      toast.success(`${featureLabel} completed · ${creditsUsed} credits used · ${nextBalance} remaining.`);
    },
    [currentTier, totalAvailable, user?.id]
  );

  const handleCreditError = useCallback(
    (error: any, data: any, feature: CreditFeature, options: CreditActionOptions = {}) => {
      if (!isCreditError(error, data)) return false;
      if (options.suppressCreditPrompt && data?.errorCode === 'INSUFFICIENT_CREDITS') {
        return true;
      }
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
        void trackActivity('tool_completed', {
          feature_key: feature,
          feature_name: resolveFeatureLabel(feature, options.featureName),
          credits_charged: 0,
          charge_status: 'free',
          operation_id: options.operationId || options.idempotencyKey || options.metadata?.operationId,
          balance_after: totalAvailable,
          plan: currentTier,
          source_tool: resolveFeatureLabel(feature, options.featureName),
        }, user.id);
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
        ...(options.allowPartialSpend ? { allowPartialMvpSpend: true } : {}),
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
      const balanceAfter = typeof data?.newBalance === 'number' || typeof data?.newQuota === 'number'
        ? Number(data?.newBalance ?? 0) + Number(data?.newQuota ?? 0)
        : undefined;
      const actualCreditsUsed =
        typeof data?.usedFromQuota === 'number' || typeof data?.usedFromBalance === 'number'
          ? Number(data?.usedFromQuota ?? 0) + Number(data?.usedFromBalance ?? 0)
          : requiredCredits;
      showCreditReceipt(feature, actualCreditsUsed, balanceAfter, options);
      return true;
    },
    [currentTier, ensureCredits, handleCreditError, refreshBalance, refreshQuotas, showCreditReceipt, totalAvailable, user]
  );

  const reserveMVPBuilderCredits = useCallback(
    async (feature: CreditFeature, options: CreditActionOptions = {}) => {
      if (!user || !isMVPBuilderCreditFeature(feature)) return null;
      const requiredCredits = ensureCredits(feature, { ...options, allowPartialSpend: true });
      if (requiredCredits === null || requiredCredits <= 0) return null;
      const requestIdempotencyKey = options.idempotencyKey || createIdempotencyKey(
        `mvp-builder-reserve-${feature.toLowerCase()}`,
        options.operationId
      );
      const { data, error } = await supabase.functions.invoke('credit-service', {
        headers: { 'Idempotency-Key': requestIdempotencyKey },
        body: {
          action: 'reserveMVPBuilderCredits',
          amount: CREDIT_COSTS[feature] ?? requiredCredits,
          featureCode: feature,
          metadata: {
            ...(options.metadata || {}),
            operationId: options.operationId || requestIdempotencyKey,
          },
        },
      });
      if (error || !data?.success) {
        handleCreditError(error, data, feature, { ...options, suppressCreditPrompt: true });
        return null;
      }
      await refreshBalance();
      return data as MVPBuilderReservationResult;
    },
    [ensureCredits, handleCreditError, refreshBalance, user]
  );

  const finalizeMVPBuilderCredits = useCallback(
    async (feature: CreditFeature, reservationId: string, options: CreditActionOptions = {}) => {
      const { data, error } = await supabase.functions.invoke('credit-service', {
        body: {
          action: 'finalizeMVPBuilderCredits',
          reservationId,
          metadata: options.metadata || {},
        },
      });
      if (error || !data?.success) return null;
      await refreshBalance();
      showCreditReceipt(feature, Number(data.creditsUsed ?? 0), Number(data.balanceAfter ?? 0), options);
      return data as MVPBuilderReservationResult;
    },
    [refreshBalance, showCreditReceipt]
  );

  const releaseMVPBuilderCredits = useCallback(
    async (reservationId: string, releaseReason: string, metadata: Record<string, unknown> = {}) => {
      const { data } = await supabase.functions.invoke('credit-service', {
        body: {
          action: 'releaseMVPBuilderCredits',
          reservationId,
          releaseReason,
          metadata,
        },
      });
      await refreshBalance();
      return data as MVPBuilderReservationResult | null;
    },
    [refreshBalance]
  );

  return {
    ensureCredits,
    handleCreditError,
    deductCredits,
    reserveMVPBuilderCredits,
    finalizeMVPBuilderCredits,
    releaseMVPBuilderCredits,
    getCreditActionQuote,
    showCreditReceipt,
  };
};
