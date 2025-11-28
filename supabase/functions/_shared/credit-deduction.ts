import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

  try {
    // Check if quota needs reset (monthly reset logic)
    await checkAndResetMonthlyQuota(userId, supabase);

    // Get current balance and quota
    const { data: credits, error: fetchError } = await supabase
      .from('user_credits')
      .select('balance, monthly_quota, last_reset_at')
      .eq('user_id', userId)
      .single();

    if (fetchError || !credits) {
      return {
        success: false,
        error: 'User credit record not found',
        errorCode: 'USER_NOT_FOUND'
      };
    }

    // Calculate available credits: quota + balance
    const totalAvailable = credits.monthly_quota + credits.balance;

    // Check if user has sufficient credits (for better error message)
    if (totalAvailable < amount) {
      return {
        success: false,
        error: 'Insufficient credits',
        errorCode: 'INSUFFICIENT_CREDITS'
      };
    }

    // Strategy: Deduct from quota first, then from balance
    // This gives users their monthly allowance first before using purchased credits
    let usedFromQuota = 0;
    let usedFromBalance = 0;
    let newQuota = credits.monthly_quota;
    let newBalance = credits.balance;

    if (credits.monthly_quota >= amount) {
      // Enough quota available - use quota only
      usedFromQuota = amount;
      newQuota = credits.monthly_quota - amount;
    } else {
      // Use all available quota, then deduct remainder from balance
      usedFromQuota = credits.monthly_quota;
      usedFromBalance = amount - credits.monthly_quota;
      newQuota = 0;
      newBalance = credits.balance - usedFromBalance;
    }

    // ATOMIC UPDATE: Update both quota and balance atomically
    // The WHERE clause ensures we only update if sufficient credits exist (atomic check)
    const { data: updateResult, error: updateError } = await supabase
      .from('user_credits')
      .update({ 
        monthly_quota: newQuota,
        balance: newBalance
      })
      .eq('user_id', userId)
      .gte('balance', credits.balance - usedFromBalance) // Ensure balance doesn't go negative
      .gte('monthly_quota', credits.monthly_quota - usedFromQuota) // Ensure quota doesn't go negative
      .select('balance, monthly_quota');

    if (updateError) {
      console.error('Error updating credit balance:', updateError);
      return {
        success: false,
        error: 'Failed to update credit balance',
        errorCode: 'DEDUCTION_FAILED'
      };
    }

    // If no rows were updated, balance was insufficient or changed concurrently
    if (!updateResult || updateResult.length === 0) {
      // Re-check to see what changed (for better error message)
      const { data: recheck } = await supabase
        .from('user_credits')
        .select('balance, monthly_quota')
        .eq('user_id', userId)
        .single();

      if (recheck) {
        const recheckTotal = recheck.monthly_quota + recheck.balance;
        if (recheckTotal < amount) {
          return {
            success: false,
            error: 'Insufficient credits (balance may have changed)',
            errorCode: 'INSUFFICIENT_CREDITS'
          };
        }
      }

      // Concurrent modification detected
      return {
        success: false,
        error: 'Concurrent modification detected. Please try again.',
        errorCode: 'DEDUCTION_FAILED'
      };
    }

    // Success - use the updated values from the result
    const finalBalance = updateResult[0].balance;
    const finalQuota = updateResult[0].monthly_quota;

    // Log transaction with quota breakdown in metadata
    const { error: logError } = await supabase
      .from('credit_transactions')
      .insert([{
        user_id: userId,
        amount: -amount,
        tx_type: 'deduct',
        reason: `Used ${amount} credits for ${feature}`,
        feature,
        session_id: sessionId,
        metadata: {
          ...(metadata || {}),
          usedFromQuota,
          usedFromBalance,
          quotaRemaining: finalQuota,
          balanceRemaining: finalBalance
        }
      }]);

    if (logError) {
      console.error('Error logging credit transaction:', logError);
      // Don't fail the operation for logging errors, but log it
    }

    return {
      success: true,
      newBalance: finalBalance,
      newQuota: finalQuota,
      usedFromQuota,
      usedFromBalance
    };

  } catch (error) {
    console.error('Error in checkAndDeductCredits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
      errorCode: 'DEDUCTION_FAILED'
    };
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
        'free': 5,
        'creator': 20,
        'professional': 50,
        'admin': 100
      };

      // Prefer subscriber tier if available, otherwise use profile tier
      const tier = subscriber?.subscription_tier || profile?.subscription_tier || 'free';
      const newQuota = quotaAmounts[tier] || 5;

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
export async function getUserFromAuth(req: Request): Promise<{ id: string } | null> {
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

    return { id: user.id };
  } catch (error) {
    console.error('Error getting user from auth:', error);
    return null;
  }
}

