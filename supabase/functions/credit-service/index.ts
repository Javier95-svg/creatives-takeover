import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { withErrorBoundary, logInfo, logWarn } from "../_shared/logger.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { checkAndDeductCredits, getUserFromAuth } from '../_shared/credit-deduction.ts';
import { type EnforcedFeature } from '../_shared/plan-enforcement.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

interface CreditTransaction {
  user_id: string;
  amount: number;
  tx_type: 'grant' | 'deduct' | 'purchase' | 'refund' | 'adjustment' | 'reset';
  reason?: string;
  feature?: string;
  feature_code?: EnforcedFeature;
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
      console.error('Error fetching credit balance:', error);
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
  async deductCredits(transaction: CreditTransaction): Promise<{ success: boolean; newBalance?: number; newQuota?: number; usedFromQuota?: number; usedFromBalance?: number; error?: string; errorCode?: string; requiredCredits?: number }> {
    try {
      const amount = Math.abs(transaction.amount);
      const featureLabel = transaction.feature || 'Credit Deduction';

      const result = await checkAndDeductCredits(
        transaction.user_id,
        amount,
        featureLabel,
        transaction.session_id,
        {
          ...(transaction.metadata || {}),
          ...(transaction.feature_code ? { entitlementFeature: transaction.feature_code } : {}),
        }
      );

      return {
        success: result.success,
        newBalance: result.newBalance,
        newQuota: result.newQuota,
        usedFromQuota: result.usedFromQuota,
        usedFromBalance: result.usedFromBalance,
        error: result.error,
        errorCode: result.errorCode,
        requiredTier: result.requiredTier,
        requiredCredits: result.requiredCredits,
        limit: result.limit,
        remaining: result.remaining,
      };
    } catch (error) {
      console.error('Error in deductCredits:', error);
      return { success: false, error: 'Transaction failed', errorCode: 'DEDUCTION_FAILED' };
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
        console.error('Error updating credit balance:', updateError);
        return { success: false, error: 'Failed to update balance' };
      }

      // Log transaction
      const { error: logError } = await this.supabase
        .from('credit_transactions')
        .insert([transaction]);

      if (logError) {
        console.error('Error logging credit transaction:', logError);
      }

      return { success: true, newBalance };

    } catch (error) {
      console.error('Error in addCredits:', error);
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
      console.error('Error fetching transaction history:', error);
      return [];
    }
    return data || [];
  }

  // Initialize credits for new users (50 free monthly credits)
  async initializeUserCredits(userId: string): Promise<{ success: boolean; isNewUser: boolean }> {
    try {
      // Check if user already has a credit record
      const existing = await this.getBalance(userId);
      
      // If user already has a record (even with 0 balance), don't overwrite.
      // Normalize legacy bootstrap rows from older migrations (5 balance / 0 quota).
      if (existing !== null) {
        if (existing.balance === 5 && existing.monthly_quota === 0) {
          const { error: normalizeError } = await this.supabase
            .from('user_credits')
            .update({
              balance: 0,
              monthly_quota: 50,
              subscription_tier: 'rookie',
              last_reset_at: new Date().toISOString(),
              last_credit_grant: new Date().toISOString(),
            })
            .eq('user_id', userId);

          if (normalizeError) {
            console.error('Error normalizing legacy bootstrap credits:', normalizeError);
            return { success: false, isNewUser: false };
          }
        }

        console.log('User already has credit record, skipping initialization', { 
          userId, 
          existingBalance: existing.balance,
          existingQuota: existing.monthly_quota,
        });
        return { success: true, isNewUser: false }; // Already initialized, don't overwrite
      }

      // Free plan starts with monthly quota (not spendable balance).
      const initialMonthlyQuota = 50;
      const subscriptionTier = 'rookie';
      const welcomeReason = 'Monthly free-tier allocation on signup';

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
          balance: 0,
          monthly_quota: initialMonthlyQuota,
          subscription_tier: subscriptionTier,
          last_reset_at: new Date().toISOString(),
          last_credit_grant: new Date().toISOString(),
        }])
        .select();

      // If insert failed due to conflict (race condition), user already exists
      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          console.log('Credit record already exists (race condition), skipping initialization', { userId });
          return { success: true, isNewUser: false };
        }
        console.error('Error initializing user credits:', insertError);
        return { success: false, isNewUser: false };
      }

      // Only log transaction if this is truly a new user
      if (isNewUser) {
        const { error: txError } = await this.supabase
          .from('credit_transactions')
          .insert([{
            user_id: userId,
            amount: initialMonthlyQuota,
            tx_type: 'grant',
            reason: welcomeReason,
            feature: 'Account Creation',
            metadata: {
              grantType: 'monthly_quota',
              quotaGranted: initialMonthlyQuota,
            }
          }]);

        if (txError) {
          console.error('Error logging welcome transaction:', txError);
          // Don't fail initialization if transaction logging fails
        }
      }

      return { success: true, isNewUser };
    } catch (error) {
      console.error('Error in initializeUserCredits:', error);
      return { success: false, isNewUser: false };
    }
  }
}

// Edge function for credit management operations
serve(withErrorBoundary(async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logInfo('credit-service:start', { method: req.method });
    const { action, ...params } = await req.json();
    const idempotencyKey = req.headers.get('Idempotency-Key')?.trim();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const creditService = new CreditService(supabaseUrl, serviceRoleKey);
    const authenticatedUser = await getUserFromAuth(req);
    const requestedUserId = (params.userId || params.user_id) as string | undefined;

    if (action !== 'getCreditCosts' && !authenticatedUser) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (authenticatedUser && requestedUserId && requestedUserId !== authenticatedUser.id) {
      return new Response(JSON.stringify({ error: 'Forbidden user scope' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const effectiveUserId = authenticatedUser?.id;
    const executeAction = async () => {
      switch (action) {
        case 'getBalance': {
          const balance = await creditService.getBalance(effectiveUserId!);
          return new Response(JSON.stringify({ balance }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        case 'checkCredits': {
          const amount = Number(params.amount || 0);
          const hasCredits = await creditService.hasCredits(effectiveUserId!, amount);
          return new Response(JSON.stringify({ hasCredits }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        case 'deductCredits': {
          if (!idempotencyKey) {
            return new Response(JSON.stringify({ error: 'Idempotency-Key header is required for deductCredits' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const amount = Number(params.amount || 0);
          const feature = (params.feature as string) || 'Credit Deduction';
          const featureCode = params.featureCode as EnforcedFeature | undefined;
          const sessionId = params.session_id as string | undefined;
          const metadata = {
            ...(params.metadata as Record<string, unknown> | undefined),
            idempotencyKey,
          };

          const result = await creditService.deductCredits({
            user_id: effectiveUserId!,
            amount,
            tx_type: 'deduct',
            feature,
            feature_code: featureCode,
            reason: `Used ${amount} credits for ${feature}`,
            session_id: sessionId,
            metadata,
          });

          if (result.success && effectiveUserId) {
            const totalRemaining = (result.newBalance ?? 0) + (result.newQuota ?? 0);
            const emailEvent =
              totalRemaining <= 0 ? 'credit_exhausted'
              : totalRemaining <= 5 ? 'credit_warning'
              : null;
            if (emailEvent) {
              fetch(`${supabaseUrl}/functions/v1/email-sequences`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${serviceRoleKey}`,
                },
                body: JSON.stringify({ mode: 'event', event: emailEvent, user_id: effectiveUserId }),
              }).catch((err) => console.error('credit-service: email trigger failed', err));
            }
          }

          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        case 'addCredits': {
          if (!idempotencyKey) {
            return new Response(JSON.stringify({ error: 'Idempotency-Key header is required for addCredits' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const amount = Number(params.amount || 0);
          const reason = (params.reason as string) || 'Credit purchase';
          const result = await creditService.addCredits({
            user_id: effectiveUserId!,
            amount,
            tx_type: 'purchase',
            reason,
            feature: (params.feature as string) || 'Credit Purchase',
            session_id: params.session_id as string | undefined,
            metadata: {
              ...(params.metadata as Record<string, unknown> | undefined),
              idempotencyKey,
            },
          });

          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        case 'getHistory': {
          const limit = Number(params.limit || 50);
          const history = await creditService.getTransactionHistory(effectiveUserId!, limit);
          return new Response(JSON.stringify({ history }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        case 'initialize': {
          const result = await creditService.initializeUserCredits(effectiveUserId!);
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        case 'getCreditCosts': {
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
    };

    if (action === 'deductCredits' || action === 'addCredits') {
      return await withIdempotency(req, `credit-service:${action}`, async () => executeAction());
    }

    return await executeAction();
  } catch (error) {
    console.error('Error in credit-service function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}, { fn: 'credit-service' }));
