import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const ADMIN_EMAIL = 'admin@creatives-takeover.com';

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
  errorCode?: 'INSUFFICIENT_CREDITS' | 'USER_NOT_FOUND' | 'DEDUCTION_FAILED';
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
    if (!Number.isFinite(amount) || amount <= 0) {
      return await returnWithIdempotency({
        success: false,
        error: 'Invalid credit amount',
        errorCode: 'DEDUCTION_FAILED'
      }, false);
    }

    const { data: adminUserData, error: adminUserError } = await supabase.auth.admin.getUserById(userId);
    const isAdmin =
      !adminUserError &&
      typeof adminUserData?.user?.email === 'string' &&
      adminUserData.user.email.toLowerCase() === ADMIN_EMAIL;

    if (isAdmin) {
      const { data: currentCredits } = await supabase
        .from('user_credits')
        .select('balance, monthly_quota')
        .eq('user_id', userId)
        .maybeSingle();

      return await returnWithIdempotency({
        success: true,
        newBalance: currentCredits?.balance ?? 0,
        newQuota: currentCredits?.monthly_quota ?? 0,
        usedFromQuota: 0,
        usedFromBalance: 0
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

    // Check if quota needs reset (monthly reset logic)
    await checkAndResetMonthlyQuota(userId, supabase);

    const deductionMetadata = {
      ...(metadata || {}),
      ...(idempotencyKey ? { idempotencyKey } : {}),
    };

    const { data: deductionData, error: deductionError } = await supabase.rpc('deduct_credits_atomic', {
      p_user_id: userId,
      p_amount: amount,
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
        errorCode: result.errorCode || 'DEDUCTION_FAILED'
      }, shouldPersist);
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
      .select('last_reset_at, monthly_quota')
      .eq('user_id', userId)
      .single();

    if (!credits || !credits.last_reset_at) return;

    const lastReset = new Date(credits.last_reset_at);
    const now = new Date();
    
    // Check if a month has passed since last reset
    // Reset if it's been 30+ days or if we're in a different month
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
    const isDifferentMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();

    if (daysSinceReset >= 30 || isDifferentMonth) {
      // Get user's subscription tier to determine quota amount
      // Check both profiles and subscribers tables for tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      // Also check subscribers table as it might be more up-to-date
      const { data: subscriber } = await supabase
        .from('subscribers')
        .select('subscription_tier')
        .eq('user_id', userId)
        .eq('subscribed', true)
        .single();

      // Default quota amounts by tier (can be customized)
      const quotaAmounts: Record<string, number> = {
        'free': 25,
        'creator': 100,
        'professional': 300,
        'admin': 300
      };

      // Prefer subscriber tier if available, otherwise use profile tier
      const tier = subscriber?.subscription_tier || profile?.subscription_tier || 'free';
      const newQuota = quotaAmounts[tier] || 25;

      // Reset quota atomically
      await supabase
        .from('user_credits')
        .update({
          monthly_quota: newQuota,
          last_reset_at: now.toISOString()
        })
        .eq('user_id', userId);

      // Log reset transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: newQuota - (credits.monthly_quota || 0),
          tx_type: 'reset',
          reason: `Monthly quota reset - ${newQuota} credits`,
          feature: 'Monthly Quota Reset',
          metadata: { 
            previousQuota: credits.monthly_quota || 0,
            newQuota,
            tier 
          }
        });

      console.log(`✅ Monthly quota reset for user ${userId}: ${newQuota} credits (tier: ${tier})`);
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
    // Add credits back to the balance pool
    const { data: current, error: fetchError } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (fetchError || !current) {
      console.error('[refundCredits] User not found:', fetchError);
      return false;
    }

    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ balance: (current.balance || 0) + amount })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[refundCredits] Failed to update balance:', updateError);
      return false;
    }

    // Log the refund transaction
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: amount,
      tx_type: 'refund',
      reason,
      feature,
      metadata: metadata || {},
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

