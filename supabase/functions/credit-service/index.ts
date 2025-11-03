import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { withErrorBoundary, logInfo, logWarn } from "../_shared/logger.ts";
import { withIdempotency } from "../_shared/idempotency.ts";

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
      console.error('Error fetching credit balance:', error);
      return null;
    }
    return data;
  }

  // Check if user has sufficient credits for an operation
  async hasCredits(userId: string, requiredAmount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance ? balance.balance >= requiredAmount : false;
  }

  // Deduct credits for API operations
  async deductCredits(transaction: CreditTransaction): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    if (transaction.amount > 0) {
      transaction.amount = -transaction.amount; // Ensure negative for deduction
    }

    try {
      // Start transaction
      const { data: currentCredits, error: fetchError } = await this.supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', transaction.user_id)
        .single();

      if (fetchError || !currentCredits) {
        return { success: false, error: 'User credit record not found' };
      }

      const newBalance = currentCredits.balance + transaction.amount; // amount is negative
      if (newBalance < 0) {
        return { success: false, error: 'Insufficient credits' };
      }

      // Update balance
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
        // Don't fail the operation for logging errors
      }

      return { success: true, newBalance };

    } catch (error) {
      console.error('Error in deductCredits:', error);
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

  // Initialize credits for new users (5 free credits)
  async initializeUserCredits(userId: string): Promise<boolean> {
    try {
      // First check if user already has credits
      const existing = await this.getBalance(userId);
      if (existing) {
        return true; // Already initialized
      }

      // Insert initial credit record
      const { error: insertError } = await this.supabase
        .from('user_credits')
        .insert([{
          user_id: userId,
          balance: 5, // 5 free credits for new users
          monthly_quota: 0
        }]);

      if (insertError) {
        console.error('Error initializing user credits:', insertError);
        return false;
      }

      // Log the grant transaction
      await this.supabase
        .from('credit_transactions')
        .insert([{
          user_id: userId,
          amount: 5,
          tx_type: 'grant',
          reason: 'Welcome bonus - 5 free credits'
        }]);

      return true;
    } catch (error) {
      console.error('Error in initializeUserCredits:', error);
      return false;
    }
  }
}

// Credit costs configuration
export const CREDIT_COSTS = {
  LAUNCH_REPORT: 5,
  ASSET_GENERATION: 5,
  PREMIUM_FEATURE: 3
} as const;

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
        const success = await creditService.initializeUserCredits(userId);
        return new Response(JSON.stringify({ success }), {
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
    console.error('Error in credit-service function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}, { fn: 'credit-service' });