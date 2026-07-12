import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logError, logWarn } from '@/lib/logger';
import { APIError } from '@/lib/errors';
import { CREDIT_COSTS } from '@/config/constants';
import { createIdempotencyKey } from '@/lib/idempotency';

interface CreditBalance {
  balance: number;
  monthly_quota: number;
  held_credits: number;
  total_available: number;
  subscription_tier: string | null;
  current_period_end: string | null;
}

interface CreditWalletV1 {
  walletFound?: boolean;
  persistentBalance?: number;
  monthlyQuotaRemaining?: number;
  heldCredits?: number;
  totalAvailable?: number;
  subscriptionTier?: string | null;
  currentPeriodEnd?: string | null;
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
        toast.success('Welcome! You received 50 free credits to get started!');
      }

      return Boolean(data?.success);
    } catch (error) {
      logError('Error initializing credits', error, { userId: user.id });
      return false;
    }
  };

  const fetchBalance = async (): Promise<CreditBalance> => {
    if (!user) {
      return { balance: 0, monthly_quota: 0, held_credits: 0, total_available: 0, subscription_tier: 'rookie', current_period_end: null };
    }

    const readWallet = async () => {
      const { data, error } = await supabase.rpc('get_credit_wallet_v1' as never);
      if (error) throw error;
      return data as CreditWalletV1;
    };

    let wallet = await readWallet();
    if (wallet.walletFound === false) {
      logWarn('No credit wallet found for user, initializing', { userId: user.id });
      if (await initializeCredits()) wallet = await readWallet();
    }

    return {
      balance: Number(wallet.persistentBalance ?? 0),
      monthly_quota: Number(wallet.monthlyQuotaRemaining ?? 0),
      held_credits: Number(wallet.heldCredits ?? 0),
      total_available: Number(wallet.totalAvailable ?? 0),
      subscription_tier: wallet.subscriptionTier ?? 'rookie',
      current_period_end: wallet.currentPeriodEnd ?? null,
    };
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

  const balanceData = creditsQuery.data ?? {
    balance: 0,
    monthly_quota: 0,
    held_credits: 0,
    total_available: 0,
    subscription_tier: 'rookie',
    current_period_end: null,
  };
  const loading = creditsQuery.isLoading;
  const refreshing = creditsQuery.isFetching;

  useEffect(() => {
    if (!user?.id) return;
    if (import.meta.env.VITE_ENABLE_MONTHLY_CREDITS_GRANT !== 'true') return;
    if (grantedMonthlyCredits.has(user.id)) return;

    grantedMonthlyCredits.add(user.id);
    void (async () => {
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
      const current = prev ?? { balance: 0, monthly_quota: 0, held_credits: 0, total_available: 0, subscription_tier: 'rookie', current_period_end: null };
      return updater(current);
    });
  };

  const hasCredits = (requiredAmount: number): boolean => {
    return balanceData.total_available >= requiredAmount;
  };

  const handleCreditDeduction = (amount: number) => {
    updateBalanceCache((prev) => {
      const usedFromQuota = Math.min(prev.monthly_quota, amount);
      const usedFromBalance = Math.max(0, amount - usedFromQuota);
      return {
        ...prev,
        monthly_quota: prev.monthly_quota - usedFromQuota,
        balance: Math.max(0, prev.balance - usedFromBalance),
        total_available: Math.max(0, prev.total_available - amount),
      };
    });
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
          total_available: Number(data.newBalance ?? prev.balance ?? 0) + prev.monthly_quota,
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
    heldCredits: balanceData.held_credits ?? 0,
    totalAvailable: balanceData.total_available ?? 0,
    subscriptionTier: balanceData.subscription_tier ?? 'rookie',
    currentPeriodEnd: balanceData.current_period_end ?? null,
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
