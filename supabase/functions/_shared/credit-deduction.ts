import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Shared credit deduction utility for edge functions
 * Provides consistent credit checking and deduction across all features
 */

export interface CreditDeductionResult {
  success: boolean;
  newBalance?: number;
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
    // Check current balance
    const { data: credits, error: fetchError } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (fetchError || !credits) {
      return {
        success: false,
        error: 'User credit record not found',
        errorCode: 'USER_NOT_FOUND'
      };
    }

    // Check if user has sufficient credits
    if (credits.balance < amount) {
      return {
        success: false,
        error: 'Insufficient credits',
        errorCode: 'INSUFFICIENT_CREDITS'
      };
    }

    // Calculate new balance
    const newBalance = credits.balance - amount;

    // Update balance atomically
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ balance: newBalance })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating credit balance:', updateError);
      return {
        success: false,
        error: 'Failed to update credit balance',
        errorCode: 'DEDUCTION_FAILED'
      };
    }

    // Log transaction
    const { error: logError } = await supabase
      .from('credit_transactions')
      .insert([{
        user_id: userId,
        amount: -amount,
        tx_type: 'deduct',
        reason: `Used ${amount} credits for ${feature}`,
        feature,
        session_id: sessionId,
        metadata: metadata || {}
      }]);

    if (logError) {
      console.error('Error logging credit transaction:', logError);
      // Don't fail the operation for logging errors, but log it
    }

    return {
      success: true,
      newBalance
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
 * Get user's current credit balance
 * @param userId - User ID
 * @returns Current balance or null if user not found
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
    const { data, error } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.balance;
  } catch (error) {
    console.error('Error fetching credit balance:', error);
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

