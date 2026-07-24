import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { resolveMonthlyBillingWindow } from './billing-period.ts';
import { emitBusinessEvent } from './analytics.ts';
import { triggerEmailSequenceEvent } from './email-sequence-events.ts';
import {
  PLAN_MONTHLY_CREDITS,
  normalizePlan,
  resolveFeatureEnforcement,
  type EnforcedFeature,
  type Plan,
} from './plan-enforcement.ts';

/**
 * Shared credit deduction utility for edge functions
 * Provides consistent credit checking and deduction across all features
 */

export interface CreditDeductionResult {
  success: boolean;
  newBalance?: number;
  newQuota?: number;
  usedFromQuota?: number;
  usedFromBalance?: number;
  error?: string;
  errorCode?: 'INSUFFICIENT_CREDITS' | 'USER_NOT_FOUND' | 'DEDUCTION_FAILED' | 'PLAN_UPGRADE_REQUIRED' | 'QUOTA_LIMIT_REACHED';
  requiredTier?: Plan;
  requiredCredits?: number;
  limit?: number;
  remaining?: number;
}

async function getCurrentCreditSnapshot(userId: string, supabase: any) {
  const { data } = await supabase
    .from('user_credits')
    .select('balance, monthly_quota')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    balance: data?.balance ?? 0,
    monthlyQuota: data?.monthly_quota ?? 0,
  };
}

const getDaysSinceSignup = (createdAt?: string | null): number => {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 86_400_000));
};

async function getCreditAnalyticsContext(userId: string, supabase: any) {
  const [{ count }, { data: profile }] = await Promise.all([
    supabase
      .from('credit_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('tx_type', 'deduct'),
    supabase
      .from('profiles')
      .select('created_at, subscription_tier')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  return {
    priorDeductCount: count ?? 0,
    daysSinceSignup: getDaysSinceSignup(profile?.created_at),
    subscriptionTier: normalizePlan(profile?.subscription_tier),
  };
}

async function getUserPlan(userId: string, supabase: any): Promise<Plan> {
  const { data: rpcTier } = await supabase.rpc('get_user_normalized_subscription_tier', {
    p_user_id: userId,
  });

  if (typeof rpcTier === 'string' && rpcTier.trim()) {
    return normalizePlan(rpcTier);
  }

  const [{ data: subscriber }, { data: credits }, { data: profile }] = await Promise.all([
    supabase
      .from('subscribers')
      .select('subscription_tier')
      .eq('user_id', userId)
      .eq('subscribed', true)
      .maybeSingle(),
    supabase
      .from('user_credits')
      .select('subscription_tier')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  return normalizePlan(subscriber?.subscription_tier || credits?.subscription_tier || profile?.subscription_tier);
}

/**
 * Check if user has sufficient credits and deduct them atomically
 * @param userId - User ID
 * @param amount - Amount of credits to deduct
 * @param feature - Feature name for transaction logging
 * @param sessionId - Optional session ID for tracking
 * @param metadata - Optional metadata for transaction
 * @returns CreditDeductionResult with success status and new balance
 */
export async function checkAndDeductCredits(
  userId: string,
  amount: number,
  feature: string,
  sessionId?: string,
  metadata?: Record<string, any>
): Promise<CreditDeductionResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      success: false,
      error: 'Supabase configuration missing',
      errorCode: 'DEDUCTION_FAILED'
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const idempotencyKey = typeof metadata?.idempotencyKey === 'string'
    ? metadata.idempotencyKey.trim()
    : undefined;
  const idempotencyLockId = idempotencyKey ? `credit-deduct:${userId}:${idempotencyKey}` : undefined;
  let idempotencyStarted = false;

  const finalizeIdempotency = async (result: CreditDeductionResult, persistResult: boolean) => {
    if (!idempotencyLockId || !idempotencyStarted) {
      return;
    }

    try {
      if (persistResult) {
        await supabase.rpc('idempotency_mark_completed', {
          p_id: idempotencyLockId,
          p_result: result
        });
      } else {
        await supabase.rpc('idempotency_clear', { p_id: idempotencyLockId });
      }
    } catch (idempotencyError) {
      console.error('Error finalizing idempotency state:', idempotencyError);
    }
  };

  const returnWithIdempotency = async (result: CreditDeductionResult, persistResult = true) => {
    await finalizeIdempotency(result, persistResult);
    return result;
  };

  try {
    const entitlementFeature = typeof metadata?.entitlementFeature === 'string'
      ? metadata.entitlementFeature.trim().toUpperCase() as EnforcedFeature
      : undefined;

    if (!Number.isFinite(amount) || amount < 0) {
      return await returnWithIdempotency({
        success: false,
        error: 'Invalid credit amount',
        errorCode: 'DEDUCTION_FAILED'
      }, false);
    }

    if (amount === 0 && entitlementFeature !== 'DISCOVERY_CALL') {
      const currentCredits = await getCurrentCreditSnapshot(userId, supabase);
      return await returnWithIdempotency({
        success: true,
        newBalance: currentCredits.balance,
        newQuota: currentCredits.monthlyQuota,
        usedFromQuota: 0,
        usedFromBalance: 0,
      }, false);
    }

    if (idempotencyLockId) {
      const { data: beginStatus, error: beginError } = await supabase.rpc('idempotency_try_begin', {
        p_id: idempotencyLockId
      });

      if (beginError) {
        console.error('Error starting idempotency lock:', beginError);
        return {
          success: false,
          error: 'Unable to process request safely. Please retry.',
          errorCode: 'DEDUCTION_FAILED'
        };
      }

      if (beginStatus === 'completed') {
        const { data: cachedResult } = await supabase.rpc('idempotency_get', { p_id: idempotencyLockId });
        if (cachedResult) {
          return cachedResult as CreditDeductionResult;
        }

        const { data: currentCredits } = await supabase
          .from('user_credits')
          .select('balance, monthly_quota')
          .eq('user_id', userId)
          .single();

        if (currentCredits) {
          return {
            success: true,
            newBalance: currentCredits.balance,
            newQuota: currentCredits.monthly_quota
          };
        }

        return {
          success: false,
          error: 'Unable to replay previous credit deduction result',
          errorCode: 'DEDUCTION_FAILED'
        };
      }

      if (beginStatus === 'processing') {
        return {
          success: false,
          error: 'Duplicate request is already being processed',
          errorCode: 'DEDUCTION_FAILED'
        };
      }

      idempotencyStarted = true;
    }

    const userPlan = await getUserPlan(userId, supabase);
    const enforcement = entitlementFeature ? resolveFeatureEnforcement(userPlan, entitlementFeature) : null;

    if (enforcement?.mode === 'blocked') {
      return await returnWithIdempotency({
        success: false,
        error: `This feature is not available on your ${userPlan} plan.`,
        errorCode: 'PLAN_UPGRADE_REQUIRED',
        requiredTier: enforcement.requiredPlan,
        requiredCredits: enforcement.creditCost,
      }, false);
    }

    if (enforcement?.mode === 'included') {
      const currentCredits = await getCurrentCreditSnapshot(userId, supabase);
      return await returnWithIdempotency({
        success: true,
        newBalance: currentCredits.balance,
        newQuota: currentCredits.monthlyQuota,
        usedFromQuota: 0,
        usedFromBalance: 0,
      }, false);
    }

    if (enforcement?.mode === 'quota') {
      const { data: quotaData, error: quotaError } = await supabase.rpc('consume_monthly_feature_quota', {
        p_user_id: userId,
        p_feature_name: 'discovery_calls',
        p_increment_by: 1,
      });

      if (quotaError || !quotaData?.allowed) {
        return await returnWithIdempotency({
          success: false,
          error: quotaData?.message || 'Usage limit reached for this billing cycle.',
          errorCode: quotaData?.error_code === 'PLAN_UPGRADE_REQUIRED' ? 'PLAN_UPGRADE_REQUIRED' : 'QUOTA_LIMIT_REACHED',
          requiredTier: quotaData?.required_tier ? normalizePlan(quotaData.required_tier) : enforcement.requiredPlan,
          limit: typeof quotaData?.limit === 'number' ? quotaData.limit : enforcement.monthlyLimit,
          remaining: typeof quotaData?.remaining === 'number' ? quotaData.remaining : undefined,
        }, false);
      }

      const currentCredits = await getCurrentCreditSnapshot(userId, supabase);
      return await returnWithIdempotency({
        success: true,
        newBalance: currentCredits.balance,
        newQuota: currentCredits.monthlyQuota,
        usedFromQuota: 0,
        usedFromBalance: 0,
      });
    }

    const listedChargeAmount = enforcement?.mode === 'charge' ? enforcement.creditCost : amount;

    // Check if quota needs reset (monthly reset logic)
    await checkAndResetMonthlyQuota(userId, supabase);
    const creditsBeforeDeduction = await getCurrentCreditSnapshot(userId, supabase);
    const analyticsContext = await getCreditAnalyticsContext(userId, supabase);
    const totalAvailableBeforeDeduction =
      creditsBeforeDeduction.balance + creditsBeforeDeduction.monthlyQuota;
    const allowPartialMvpSpend =
      metadata?.allowPartialMvpSpend === true &&
      entitlementFeature?.startsWith('APP_BUILDER_');
    const chargeAmount =
      allowPartialMvpSpend && totalAvailableBeforeDeduction > 0
        ? Math.min(listedChargeAmount, totalAvailableBeforeDeduction)
        : listedChargeAmount;

    const deductionMetadata = {
      ...(metadata || {}),
      ...(idempotencyKey ? { idempotencyKey } : {}),
      featureKey: entitlementFeature || metadata?.featureCode || feature,
      feature_key: entitlementFeature || metadata?.featureCode || feature,
      toolName: feature,
      tool_name: feature,
      plan: userPlan,
      creditCost: chargeAmount,
      credit_cost: chargeAmount,
      listedCreditCost: listedChargeAmount,
      listed_credit_cost: listedChargeAmount,
      balanceBefore: creditsBeforeDeduction.balance,
      balance_before: creditsBeforeDeduction.balance,
      monthlyQuotaBefore: creditsBeforeDeduction.monthlyQuota,
      monthly_quota_before: creditsBeforeDeduction.monthlyQuota,
    };

    const { data: deductionData, error: deductionError } = await supabase.rpc('deduct_credits_atomic', {
      p_user_id: userId,
      p_amount: chargeAmount,
      p_feature: feature,
      p_session_id: sessionId ?? null,
      p_metadata: deductionMetadata,
    });

    if (deductionError || !deductionData) {
      console.error('Error running deduct_credits_atomic:', deductionError);
      return await returnWithIdempotency({
        success: false,
        error: 'Failed to update credit balance',
        errorCode: 'DEDUCTION_FAILED'
      }, false);
    }

    const result = deductionData as {
      success: boolean;
      newBalance?: number;
      newQuota?: number;
      usedFromQuota?: number;
      usedFromBalance?: number;
      error?: string;
      errorCode?: CreditDeductionResult['errorCode'];
    };

    if (!result.success) {
      const shouldPersist = result.errorCode !== 'DEDUCTION_FAILED';
      return await returnWithIdempotency({
        success: false,
        error: result.error || 'Credit deduction failed',
        errorCode: result.errorCode || 'DEDUCTION_FAILED',
        requiredCredits: chargeAmount,
      }, shouldPersist);
    }

    const creditsRemaining = (result.newBalance ?? 0) + (result.newQuota ?? 0);
    const userProperties = {
      subscription_tier: analyticsContext.subscriptionTier,
      days_since_signup: analyticsContext.daysSinceSignup,
    };

    // Canonical credit-spend event for EVERY server-side charge (pitch deck, ICP,
    // chatbot, market validation, GTM, PMF, bizmap, MVP via credit-service, …).
    // This is the single emit point — the frontend no longer emits
    // credit_action_completed, so charges are counted exactly once. operation_id
    // mirrors the deduction's idempotency key so credit revenue can be joined to
    // the matching $ai_generation cost for per-feature margin (Phase 2.2).
    await emitBusinessEvent({
      eventName: 'credit_action_completed',
      userId,
      properties: {
        feature_key: entitlementFeature || metadata?.featureCode || feature,
        credit_cost: chargeAmount,
        current_plan: userPlan,
        balance_after: creditsRemaining,
        source_tool: feature,
        operation_id: idempotencyKey ?? metadata?.operationId,
      },
      userProperties,
    });

    if (analyticsContext.priorDeductCount === 0) {
      await emitBusinessEvent({
        eventName: 'first_tool_used',
        userId,
        properties: {
          tool_name: feature,
          credits_cost: chargeAmount,
          credits_remaining: creditsRemaining,
          days_since_signup: analyticsContext.daysSinceSignup,
        },
        userProperties,
      });
    }

    if (creditsRemaining === 0) {
      await emitBusinessEvent({
        eventName: 'credit_exhausted',
        userId,
        properties: {
          plan: analyticsContext.subscriptionTier,
          days_since_signup: analyticsContext.daysSinceSignup,
          last_feature_used: feature,
        },
        userProperties,
      });
      if (analyticsContext.subscriptionTier === 'rookie') {
        await triggerEmailSequenceEvent('credit_exhausted', userId);
      }
    } else if (
      analyticsContext.subscriptionTier === 'rookie' &&
      creditsBeforeDeduction.monthlyQuota > 0 &&
      creditsRemaining < creditsBeforeDeduction.monthlyQuota * 0.2
    ) {
      await triggerEmailSequenceEvent('credit_warning', userId);
    }

    return await returnWithIdempotency({
      success: true,
      newBalance: result.newBalance,
      newQuota: result.newQuota,
      usedFromQuota: result.usedFromQuota,
      usedFromBalance: result.usedFromBalance
    });

  } catch (error) {
    console.error('Error in checkAndDeductCredits:', error);
    return await returnWithIdempotency({
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
      errorCode: 'DEDUCTION_FAILED'
    }, false);
  }
}

/**
 * Check and reset monthly quota if needed
 * Resets quota on the same day each month based on last_reset_at
 */
async function checkAndResetMonthlyQuota(userId: string, supabase: any): Promise<void> {
  try {
    const { data: credits } = await supabase
      .from('user_credits')
      .select('created_at, last_reset_at, last_credit_grant, monthly_quota, current_period_start, current_period_end, billing_anchor_at')
      .eq('user_id', userId)
      .single();

    if (!credits) return;

    const now = new Date();
    const tier = await getUserPlan(userId, supabase);
    const newQuota = PLAN_MONTHLY_CREDITS[tier];

    const anchorSource = credits.billing_anchor_at
      || credits.current_period_start
      || credits.last_reset_at
      || credits.last_credit_grant
      || credits.created_at
      || now.toISOString();
    const billingWindow = resolveMonthlyBillingWindow(anchorSource, now);
    const storedPeriodStart = typeof credits.current_period_start === 'string' ? new Date(credits.current_period_start) : null;
    const storedPeriodEnd = typeof credits.current_period_end === 'string' ? new Date(credits.current_period_end) : null;
    const hasCrossedBoundary = !storedPeriodEnd || now >= storedPeriodEnd;
    const needsWindowSync = !credits.billing_anchor_at
      || !storedPeriodStart
      || !storedPeriodEnd
      || storedPeriodStart.getTime() !== billingWindow.periodStart.getTime()
      || storedPeriodEnd.getTime() !== billingWindow.periodEnd.getTime();

    if (!hasCrossedBoundary && !needsWindowSync) {
      return;
    }

    await supabase
      .from('user_credits')
      .update({
        monthly_quota: hasCrossedBoundary ? newQuota : (credits.monthly_quota || 0),
        last_reset_at: hasCrossedBoundary ? now.toISOString() : (credits.last_reset_at || now.toISOString()),
        billing_anchor_at: billingWindow.anchorAt.toISOString(),
        current_period_start: billingWindow.periodStart.toISOString(),
        current_period_end: billingWindow.periodEnd.toISOString(),
      })
      .eq('user_id', userId);

    if (hasCrossedBoundary) {
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: newQuota - (credits.monthly_quota || 0),
          tx_type: 'reset',
          reason: `Billing-anchor quota reset - ${newQuota} credits`,
          feature: 'Monthly Quota Reset',
          metadata: {
            previousQuota: credits.monthly_quota || 0,
            newQuota,
            tier,
            billingAnchorAt: billingWindow.anchorAt.toISOString(),
            currentPeriodStart: billingWindow.periodStart.toISOString(),
            currentPeriodEnd: billingWindow.periodEnd.toISOString(),
          }
        });

      console.log(`✅ Billing-anchor quota reset for user ${userId}: ${newQuota} credits (tier: ${tier})`);
    }
  } catch (error) {
    console.error('Error checking/resetting monthly quota:', error);
    // Don't fail the operation if quota reset check fails
  }
}

/**
 * Refund credits back to the user after a failed operation (e.g. AI API error).
 * Adds credits back to balance (purchased pool) and logs a refund transaction.
 * @param userId - User ID
 * @param amount - Amount of credits to refund
 * @param feature - Feature name for transaction logging
 * @param reason - Human-readable reason for the refund
 * @param metadata - Optional metadata for transaction
 * @returns true if refund succeeded
 */
export async function refundCredits(
  userId: string,
  amount: number,
  feature: string,
  reason: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  if (Number.isFinite(amount) && amount === 0) {
    return true;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey || !Number.isFinite(amount) || amount <= 0) {
    console.error('[refundCredits] Invalid config or amount', { userId, amount });
    return false;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  try {
    const { data, error } = await supabase.rpc('refund_platform_credits_atomic', {
      p_user_id: userId,
      p_amount: amount,
      p_feature: feature,
      p_reason: reason,
      p_metadata: metadata || {},
    });

    if (error || !data?.success) {
      console.error('[refundCredits] Atomic refund failed:', error || data);
      return false;
    }

    if (data.alreadyRefunded) {
      return true;
    }

    await emitBusinessEvent({
      eventName: 'credit_action_refunded',
      userId,
      properties: {
        feature_key: feature,
        credits_refunded: amount,
        source: 'automatic_failure_refund',
        operation_id:
          data.refundTransactionId ||
          metadata?.operationId ||
          metadata?.idempotencyKey ||
          metadata?.deductionTransactionId,
      },
    });

    console.log(`[refundCredits] Refunded ${amount} credits to user ${userId} for ${feature}`);
    return true;
  } catch (error) {
    console.error('[refundCredits] Unexpected error:', error);
    return false;
  }
}

/**
 * Get user's current credit balance and quota
 * @param userId - User ID
 * @returns Current balance and quota or null if user not found
 */
export async function getCreditBalance(userId: string): Promise<number | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  try {
    // Check and reset quota if needed
    await checkAndResetMonthlyQuota(userId, supabase);

    const { data, error } = await supabase
      .from('user_credits')
      .select('balance, monthly_quota')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    // Return total available (quota + balance) for backward compatibility
    return (data.balance || 0) + (data.monthly_quota || 0);
  } catch (error) {
    console.error('Error fetching credit balance:', error);
    return null;
  }
}

/**
 * Get user's credit balance and quota separately
 * @param userId - User ID
 * @returns Object with balance and quota, or null if user not found
 */
export async function getCreditBalanceAndQuota(userId: string): Promise<{ balance: number; monthly_quota: number } | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  try {
    // Check and reset quota if needed
    await checkAndResetMonthlyQuota(userId, supabase);

    const { data, error } = await supabase
      .from('user_credits')
      .select('balance, monthly_quota')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      balance: data.balance || 0,
      monthly_quota: data.monthly_quota || 0
    };
  } catch (error) {
    console.error('Error fetching credit balance and quota:', error);
    return null;
  }
}

/**
 * Get user from authorization header
 * @param req - Request object with Authorization header
 * @returns User object or null if not authenticated
 */
export async function getUserFromAuth(req: Request): Promise<{ id: string; email?: string | null } | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (error || !user) {
      return null;
    }

    return { id: user.id, email: user.email };
  } catch (error) {
    console.error('Error getting user from auth:', error);
    return null;
  }
}

