import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safe } from '@/integrations/supabase/safe';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logError, logWarn } from '@/lib/logger';
import { APIError } from '@/lib/errors';
import { CREDIT_COSTS } from '@/config/constants';
import { createIdempotencyKey } from '@/lib/idempotency';

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

const grantedMonthlyCredits = new Set<string>();

export function useCredits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const hasShownErrorRef = useRef(false);

  const initializeCredits = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.functions.invoke('credit-service', {
        headers: { 'Idempotency-Key': createIdempotencyKey(`credit-initialize-${user.id}`) },
        body: { action: 'initialize', userId: user.id }
      });

      if (error) {
        throw new APIError('Failed to initialize credits', 'credit-service', 500);
      }

      if (data?.success && data?.isNewUser) {
        toast.success('Welcome! You received 25 free credits to get started!');
      }

      return Boolean(data?.success);
    } catch (error) {
      logError('Error initializing credits', error, { userId: user.id });
      return false;
    }
  };

  const fetchBalance = async (): Promise<CreditBalance> => {
    if (!user) {
      return { balance: 0, monthly_quota: 0 };
    }

    const { data, error } = await safe.select(async () =>
      await safe.client
        .from('user_credits')
        .select('balance, monthly_quota')
        .eq('user_id', user.id)
        .maybeSingle()
    );

    if (error) {
      const isNotFoundError = error.code === 'PGRST116' || error.message?.includes('not found');

      if (isNotFoundError) {
        logWarn('No credit record found for user, initializing', { userId: user.id });
        const initialized = await initializeCredits();

        if (initialized) {
          const retry = await safe.select(async () =>
            await safe.client
              .from('user_credits')
              .select('balance, monthly_quota')
              .eq('user_id', user.id)
              .maybeSingle()
          );

          if (retry.data) {
            return retry.data;
          }
        }

        return { balance: 0, monthly_quota: 0 };
      }

      throw error;
    }

    if (!data) {
      logWarn('No credit record found for user (null data), initializing', { userId: user.id });
      const initialized = await initializeCredits();

      if (initialized) {
        const retry = await safe.select(async () =>
          await safe.client
            .from('user_credits')
            .select('balance, monthly_quota')
            .eq('user_id', user.id)
            .maybeSingle()
        );

        if (retry.data) {
          return retry.data;
        }
      }

      return { balance: 0, monthly_quota: 0 };
    }

    return data;
  };

  const creditsQuery = useQuery({
    queryKey: ['credits', user?.id],
    enabled: !!user?.id,
    queryFn: fetchBalance,
    staleTime: 30_000,
    retry: false,
    onError: (error) => {
      logError('Failed to fetch credit balance', error, { userId: user?.id });
      if (!hasShownErrorRef.current) {
        toast.error('Unable to load credit balance. Please refresh the page.');
        hasShownErrorRef.current = true;
      }
    },
  });

  const balanceData = creditsQuery.data ?? { balance: 0, monthly_quota: 0 };
  const loading = creditsQuery.isLoading;
  const refreshing = creditsQuery.isFetching;

  useEffect(() => {
    if (!user?.id) return;
    if (import.meta.env.VITE_ENABLE_MONTHLY_CREDITS_GRANT !== 'true') return;
    if (grantedMonthlyCredits.has(user.id)) return;

    grantedMonthlyCredits.add(user.id);
    (async () => {
      try {
        await supabase.rpc('grant_monthly_credits');
      } catch (error) {
        logError('Failed to grant monthly credits', error, { userId: user.id });
      }
    })();
  }, [user?.id]);

  const updateBalanceCache = (updater: (prev: CreditBalance) => CreditBalance) => {
    if (!user?.id) return;
    queryClient.setQueryData<CreditBalance>(['credits', user.id], (prev) => {
      const current = prev ?? { balance: 0, monthly_quota: 0 };
      return updater(current);
    });
  };

  const hasCredits = (requiredAmount: number): boolean => {
    const totalAvailable = (balanceData.balance || 0) + (balanceData.monthly_quota || 0);
    return totalAvailable >= requiredAmount;
  };

  const handleCreditDeduction = (amount: number) => {
    updateBalanceCache((prev) => ({
      ...prev,
      balance: Math.max(0, (prev.balance || 0) - amount),
    }));
  };

  const addCredits = async (amount: number, reason: string = 'Credit purchase'): Promise<boolean> => {
    if (!user) {
      logWarn('Attempted to add credits without user', { amount, reason });
      return false;
    }

    try {
      const requestIdempotencyKey = createIdempotencyKey('credit-add');

      const { data, error } = await supabase.functions.invoke('credit-service', {
        headers: { 'Idempotency-Key': requestIdempotencyKey },
        body: {
          action: 'addCredits',
          amount,
          tx_type: 'purchase',
          reason
        }
      });

      if (error) {
        throw new APIError('Failed to add credits', 'credit-service', 500);
      }

      if (data?.success) {
        updateBalanceCache((prev) => ({
          ...prev,
          balance: Number(data.newBalance ?? prev.balance ?? 0),
        }));
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

  const refreshBalance = async () => {
    await creditsQuery.refetch();
  };

  return {
    balance: balanceData.balance ?? 0,
    monthlyQuota: balanceData.monthly_quota ?? 0,
    loading,
    refreshing,
    hasCredits,
    addCredits,
    fetchTransactionHistory,
    transactions,
    refreshBalance,
    handleCreditDeduction,
    CREDIT_COSTS,
  };
}
