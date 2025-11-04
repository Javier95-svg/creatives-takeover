import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safe } from '@/integrations/supabase/safe';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logError, logWarn } from '@/lib/logger';
import { APIError } from '@/lib/errors';

interface CreditBalance {
  balance: number;
  monthly_quota: number;
}

interface CreditTransaction {
  id: string;
  amount: number;
  tx_type: 'grant' | 'deduct' | 'purchase' | 'refund' | 'adjustment' | 'reset';
  reason: string;
  feature: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export const CREDIT_COSTS = {
  LAUNCH_REPORT: 5,
  ASSET_GENERATION: 5,
  PREMIUM_FEATURE: 3
} as const;

export function useCredits() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const { user } = useAuth();

  // Fetch current credit balance
  const fetchBalance = async () => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await safe.select(async () =>
        await safe.client
          .from('user_credits')
          .select('balance, monthly_quota')
          .eq('user_id', user.id)
          .maybeSingle()
      );

      if (error) {
        logError('Error fetching credit balance', error, { userId: user.id });
        await initializeCredits();
      } else if (data) {
        setBalance(data);
      } else {
        await initializeCredits();
      }
    } catch (error) {
      logError('Unexpected error in fetchBalance', error, { userId: user.id });
    } finally {
      setLoading(false);
    }
  };

  // Initialize credits for new users
  const initializeCredits = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('credit-service', {
        body: { action: 'initialize', userId: user.id }
      });

      if (error) {
        throw new APIError('Failed to initialize credits', 'credit-service', 500);
      }

      if (data?.success) {
        await fetchBalance();
        toast.success('Welcome! You received 5 free credits to get started!');
      }
    } catch (error) {
      logError('Error initializing credits', error, { userId: user.id });
    }
  };

  // Check if user has sufficient credits
  const hasCredits = (requiredAmount: number): boolean => {
    return balance ? balance.balance >= requiredAmount : false;
  };

  // Deduct credits (handled by edge functions, this is for UI feedback)
  const handleCreditDeduction = (amount: number) => {
    if (balance) {
      setBalance(prev => prev ? { ...prev, balance: prev.balance - amount } : null);
    }
  };

  // Add credits (for purchases, etc.)
  const addCredits = async (amount: number, reason: string = 'Credit purchase'): Promise<boolean> => {
    if (!user) {
      logWarn('Attempted to add credits without user', { amount, reason });
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('credit-service', {
        body: {
          action: 'addCredits',
          user_id: user.id,
          amount,
          tx_type: 'purchase',
          reason
        }
      });

      if (error) {
        throw new APIError('Failed to add credits', 'credit-service', 500);
      }

      if (data?.success) {
        setBalance(prev => prev ? { ...prev, balance: data.newBalance } : null);
        toast.success(`${amount} credits added to your account!`);
        return true;
      }
      
      toast.error('Failed to add credits');
      return false;
    } catch (error) {
      logError('Error adding credits', error, { userId: user.id, amount, reason });
      toast.error('Failed to add credits');
      return false;
    }
  };

  // Fetch transaction history
  const fetchTransactionHistory = async (limit: number = 50): Promise<void> => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('credit-service', {
        body: { action: 'getHistory', userId: user.id, limit }
      });

      if (error) {
        throw new APIError('Failed to fetch transaction history', 'credit-service', 500);
      }

      if (data?.history) {
        setTransactions(data.history);
      }
    } catch (error) {
      logError('Error fetching transaction history', error, { userId: user.id, limit });
    }
  };

  // Refresh balance from server
  const refreshBalance = async () => {
    setLoading(true);
    await fetchBalance();
  };

  // Effect to load balance when user changes
  useEffect(() => {
    fetchBalance();
  }, [user]);

  return {
    balance: balance?.balance ?? 0,
    monthlyQuota: balance?.monthly_quota ?? 0,
    loading,
    hasCredits,
    addCredits,
    fetchTransactionHistory,
    transactions,
    refreshBalance,
    handleCreditDeduction,
    CREDIT_COSTS
  };
}