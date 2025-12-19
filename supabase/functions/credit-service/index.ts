import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { withErrorBoundary, logInfo, logWarn, logError } from "../_shared/logger.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreditTransaction {
  user_id: string;
  amount: number;
  tx_type: 'grant' | 'deduct' | 'purchase' | 'refund' | 'adjustment' | 'reset';
  reason?: string;
  feature?: string;
  session_id?: string;
  metadata?: Record<string, any>;
}

// Credit service class with all core functionality
export class CreditService {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
  }

  // Check user's current credit balance
  async getBalance(userId: string): Promise<{ balance: number; monthly_quota: number } | null> {
    const { data, error } = await this.supabase
      .from('user_credits')
      .select('balance, monthly_quota')
      .eq('user_id', userId)
      .single();

    if (error) {
      logError('Error fetching credit balance', { error, userId });
      return null;
    }
    return data;
  }

  // Check if user has sufficient credits for an operation
  // Checks both monthly_quota and balance (quota-first deduction strategy)
  async hasCredits(userId: string, requiredAmount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    if (!balance) return false;
    const totalAvailable = (balance.balance || 0) + (balance.monthly_quota || 0);
    return totalAvailable >= requiredAmount;
  }

  // Deduct credits for API operations
  // Uses atomic update pattern to prevent race conditions
  async deductCredits(transaction: CreditTransaction): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    if (transaction.amount > 0) {
      transaction.amount = -transaction.amount; // Ensure negative for deduction
    }

    const deductionAmount = Math.abs(transaction.amount);

    try {
      // Read current balance (for validation and atomic check)
      const { data: currentCredits, error: fetchError } = await this.supabase
        .from('user_credits')
        .select('balance, monthly_quota')
        .eq('user_id', transaction.user_id)
        .single();

      if (fetchError || !currentCredits) {
        return { success: false, error: 'User credit record not found' };
      }

      // Check if user has sufficient credits
      const totalAvailable = (currentCredits.balance || 0) + (currentCredits.monthly_quota || 0);
      if (totalAvailable < deductionAmount) {
        return { success: false, error: 'Insufficient credits' };
      }

      // Calculate new values (deduct from balance first, then quota)
      let newBalance = currentCredits.balance;
      let newQuota = currentCredits.monthly_quota;
      let usedFromBalance = 0;
      let usedFromQuota = 0;

      if (currentCredits.balance >= deductionAmount) {
        // Use balance only
        usedFromBalance = deductionAmount;
        newBalance = currentCredits.balance - usedFromBalance;
      } else {
        // Use balance + quota
        usedFromBalance = currentCredits.balance;
        usedFromQuota = deductionAmount - usedFromBalance;
        newBalance = 0;
        newQuota = currentCredits.monthly_quota - usedFromQuota;
      }

      // ATOMIC UPDATE: Update with WHERE clause to ensure balance hasn't changed
      // This prevents race conditions - if balance changed, no rows will be updated
      const { data: updateResult, error: updateError } = await this.supabase
        .from('user_credits')
        .update({ 
          balance: newBalance,
          monthly_quota: newQuota
        })
        .eq('user_id', transaction.user_id)
        .gte('balance', currentCredits.balance - usedFromBalance) // Ensure balance hasn't decreased
        .gte('monthly_quota', currentCredits.monthly_quota - usedFromQuota) // Ensure quota hasn't decreased
        .select('balance, monthly_quota')
        .single();

      if (updateError) {
        logError('Error updating credit balance', { error: updateError, userId: transaction.user_id, amount: deductionAmount });
        return { success: false, error: 'Failed to update balance' };
      }

      // If no rows were updated, balance was changed concurrently
      if (!updateResult) {
        // Re-check to provide better error message
        const { data: recheck } = await this.supabase
          .from('user_credits')
          .select('balance, monthly_quota')
          .eq('user_id', transaction.user_id)
          .single();

        if (recheck) {
          const recheckTotal = (recheck.balance || 0) + (recheck.monthly_quota || 0);
          if (recheckTotal < deductionAmount) {
            return { success: false, error: 'Insufficient credits (balance may have changed)' };
          }
        }

        logWarn('Concurrent credit modification detected', { userId: transaction.user_id, amount: deductionAmount });
        return { success: false, error: 'Concurrent modification detected. Please try again.' };
      }

      // Success - log transaction (non-blocking with retry)
      const logTransaction = async (retries = 3): Promise<void> => {
        for (let attempt = 0; attempt < retries; attempt++) {
          const { error: logErr } = await this.supabase
            .from('credit_transactions')
            .insert([{
              ...transaction,
              metadata: {
                ...transaction.metadata,
                usedFromBalance,
                usedFromQuota,
                previousBalance: currentCredits.balance,
                previousQuota: currentCredits.monthly_quota
              }
            }]);

          if (!logErr) return;

          if (attempt < retries - 1) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Final attempt failed - log to error tracking
            logError('CRITICAL: Failed to log credit transaction after retries', { 
              error: logErr, 
              userId: transaction.user_id, 
              attempts: retries,
              transaction 
            });
          }
        }
      };

      // Log transaction asynchronously (don't block response)
      logTransaction().catch(err => {
        logError('Non-critical: Transaction log failed', { error: err, userId: transaction.user_id });
      });

      return { success: true, newBalance: updateResult.balance };

    } catch (error) {
      logError('Error in deductCredits', { error, userId: transaction.user_id, amount: deductionAmount });
      return { success: false, error: 'Transaction failed' };
    }
  }

  // Add credits (for purchases, gifts, etc.)
  async addCredits(transaction: CreditTransaction): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    if (transaction.amount < 0) {
      transaction.amount = Math.abs(transaction.amount); // Ensure positive for addition
    }

    try {
      // Get current balance and update
      const { data: currentCredits, error: fetchError } = await this.supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', transaction.user_id)
        .single();

      if (fetchError || !currentCredits) {
        return { success: false, error: 'User credit record not found' };
      }

      const newBalance = currentCredits.balance + transaction.amount;

      const { error: updateError } = await this.supabase
        .from('user_credits')
        .update({ balance: newBalance })
        .eq('user_id', transaction.user_id);

      if (updateError) {
        logError('Error updating credit balance', { error: updateError, userId: transaction.user_id });
        return { success: false, error: 'Failed to update balance' };
      }

      // Log transaction
      const { error: logErr } = await this.supabase
        .from('credit_transactions')
        .insert([transaction]);

      if (logErr) {
        logError('Error logging credit transaction', { error: logErr, userId: transaction.user_id });
      }

      return { success: true, newBalance };

    } catch (error) {
      logError('Error in addCredits', { error, userId: transaction.user_id });
      return { success: false, error: 'Transaction failed' };
    }
  }

  // Get user's credit transaction history
  async getTransactionHistory(userId: string, limit: number = 50) {
    const { data, error } = await this.supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logError('Error fetching transaction history', { error, userId, limit });
      return [];
    }
    return data || [];
  }

  // Initialize credits for new users (5 free credits)
  async initializeUserCredits(userId: string): Promise<{ success: boolean; isNewUser: boolean }> {
    try {
      // Check if user already has a credit record
      const existing = await this.getBalance(userId);
      
      // If user already has a record (even with 0 balance), don't overwrite
      if (existing !== null) {
        logInfo('User already has credit record, skipping initialization', { 
          userId, 
          existingBalance: existing.balance 
        });
        return { success: true, isNewUser: false }; // Already initialized, don't overwrite
      }

      // Determine credits and tier - admin gets professional tier but normal credits
      const initialCredits = 5; // Standard free credits for all new users
      const subscriptionTier = 'free'; // Will be updated to professional by other mechanisms
      const welcomeReason = 'Welcome bonus - 5 free credits';

      // Check if there's already a welcome transaction to avoid duplicate grants
      const { data: existingTx } = await this.supabase
        .from('credit_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('tx_type', 'grant')
        .eq('reason', welcomeReason)
        .limit(1);

      const isNewUser = !existingTx || existingTx.length === 0;

      // Only create new record if it truly doesn't exist
      // Use insert with ON CONFLICT DO NOTHING to prevent race conditions
      const { error: insertError } = await this.supabase
        .from('user_credits')
        .insert([{
          user_id: userId,
          balance: initialCredits,
          monthly_quota: initialCredits,
          subscription_tier: subscriptionTier
        }])
        .select();

      // If insert failed due to conflict (race condition), user already exists
      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          logInfo('Credit record already exists (race condition), skipping initialization', { userId });
          return { success: true, isNewUser: false };
        }
        logError('Error initializing user credits', { error: insertError, userId });
        return { success: false, isNewUser: false };
      }

      // Only log transaction if this is truly a new user
      if (isNewUser) {
        const { error: txError } = await this.supabase
          .from('credit_transactions')
          .insert([{
            user_id: userId,
            amount: initialCredits,
            tx_type: 'grant',
            reason: welcomeReason,
            feature: 'Account Creation'
          }]);

        if (txError) {
          logError('Error logging welcome transaction', { error: txError, userId });
          // Don't fail initialization if transaction logging fails
        }
      }

      return { success: true, isNewUser };
    } catch (error) {
      logError('Error in initializeUserCredits', { error, userId });
      return { success: false, isNewUser: false };
    }
  }
}

// Edge function for credit management operations
export default withErrorBoundary(async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logInfo('credit-service:start', { method: req.method });
    const { action, ...params } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const creditService = new CreditService(supabaseUrl, serviceRoleKey);

    switch (action) {
      case 'getBalance': {
        const { userId } = params;
        const balance = await creditService.getBalance(userId);
        return new Response(JSON.stringify({ balance }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'checkCredits': {
        const { userId, amount } = params;
        const hasCredits = await creditService.hasCredits(userId, amount);
        return new Response(JSON.stringify({ hasCredits }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'deductCredits': {
        const result = await creditService.deductCredits(params);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'addCredits': {
        const result = await creditService.addCredits(params);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'getHistory': {
        const { userId, limit } = params;
        const history = await creditService.getTransactionHistory(userId, limit);
        return new Response(JSON.stringify({ history }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'initialize': {
        const { userId } = params;
        const result = await creditService.initializeUserCredits(userId);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'getCreditCosts': {
        // Return all credit costs for transparency
        return new Response(JSON.stringify({ costs: CREDIT_COSTS }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        logWarn('credit-service:unknown_action', { action });
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    logError('Error in credit-service function', { error });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}, { fn: 'credit-service' });