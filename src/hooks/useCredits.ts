import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safe } from '@/integrations/supabase/safe';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logError, logWarn } from '@/lib/logger';
import { APIError } from '@/lib/errors';
import { CREDIT_COSTS } from '@/config/constants';

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

export function useCredits() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const { user } = useAuth();

  // Fetch current credit balance with retry logic
  const fetchBalance = async (retryCount: number = 0): Promise<void> => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    try {
      const { data, error } = await safe.select(async () =>
        await safe.client
          .from('user_credits')
          .select('balance, monthly_quota')
          .eq('user_id', user.id)
          .maybeSingle()
      );

      if (error) {
        // Check if it's a "not found" error (PGRST116) vs other errors
        const isNotFoundError = error.code === 'PGRST116' || error.message?.includes('not found');
        
        if (isNotFoundError) {
          // User truly has no credit record - initialize only in this case
          logWarn('No credit record found for user, initializing', { userId: user.id });
          await initializeCredits();
        } else if (retryCount < MAX_RETRIES) {
          // Transient error - retry with exponential backoff
          logError(`Error fetching credit balance, retrying (${retryCount + 1}/${MAX_RETRIES})`, error, { userId: user.id });
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount)));
          return fetchBalance(retryCount + 1);
        } else {
          // Max retries reached - log error but don't reset credits
          logError('Failed to fetch credit balance after retries', error, { userId: user.id });
          // Keep existing balance if available, don't reset
          if (!balance) {
            toast.error('Unable to load credit balance. Please refresh the page.');
          }
        }
      } else if (data) {
        // Successfully fetched balance
        setBalance(data);
      } else {
        // No data returned but no error - user has no record
        logWarn('No credit record found for user (null data), initializing', { userId: user.id });
        await initializeCredits();
      }
    } catch (error) {
      // Unexpected error - retry if possible
      if (retryCount < MAX_RETRIES) {
        logError(`Unexpected error in fetchBalance, retrying (${retryCount + 1}/${MAX_RETRIES})`, error, { userId: user.id });
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount)));
        return fetchBalance(retryCount + 1);
      } else {
        logError('Unexpected error in fetchBalance after retries', error, { userId: user.id });
        // Don't reset credits on unexpected errors
        if (!balance) {
          toast.error('Unable to load credit balance. Please refresh the page.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Initialize credits for new users only
  const initializeCredits = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.functions.invoke('credit-service', {
        body: { action: 'initialize', userId: user.id }
      });

      if (error) {
        throw new APIError('Failed to initialize credits', 'credit-service', 500);
      }

      if (data?.success) {
        await fetchBalance();
        // Only show welcome toast if this was a new initialization (not a re-initialization)
        if (data?.isNewUser) {
          toast.success('Welcome! You received 5 free credits to get started!');
        }
        return true;
      }
      return false;
    } catch (error) {
      logError('Error initializing credits', error, { userId: user.id });
      return false;
    }
  };

  // Check if user has sufficient credits (quota + balance)
  const hasCredits = (requiredAmount: number): boolean => {
    if (!balance) return false;
    const totalAvailable = (balance.balance || 0) + (balance.monthly_quota || 0);
    return totalAvailable >= requiredAmount;
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