import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  metadata?: Record<string, any>;
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
      const { data, error } = await supabase
        .from('user_credits')
        .select('balance, monthly_quota')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching credit balance:', error);
        // Try to initialize credits for new users
        await initializeCredits();
      } else {
        setBalance(data);
      }
    } catch (error) {
      console.error('Error in fetchBalance:', error);
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

      if (data?.success) {
        await fetchBalance(); // Refresh balance after initialization
        toast.success('Welcome! You received 5 free credits to get started!');
      }
    } catch (error) {
      console.error('Error initializing credits:', error);
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
  const addCredits = async (amount: number, reason: string = 'Credit purchase') => {
    if (!user) return false;

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

      if (data?.success) {
        setBalance(prev => prev ? { ...prev, balance: data.newBalance } : null);
        toast.success(`${amount} credits added to your account!`);
        return true;
      } else {
        toast.error('Failed to add credits');
        return false;
      }
    } catch (error) {
      console.error('Error adding credits:', error);
      toast.error('Failed to add credits');
      return false;
    }
  };

  // Fetch transaction history
  const fetchTransactionHistory = async (limit: number = 50) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('credit-service', {
        body: { action: 'getHistory', userId: user.id, limit }
      });

      if (data?.history) {
        setTransactions(data.history);
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error);
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