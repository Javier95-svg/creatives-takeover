import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MVP_CREDIT_COSTS, type MVPCreditFeature } from '@/config/constants';
import { createIdempotencyKey } from '@/lib/idempotency';
import { toast } from 'sonner';

type MVPCreditBalance = {
  balance: number;
  monthly_quota: number;
  subscription_tier: string | null;
};

export function useMVPCredits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchBalance = useCallback(async (): Promise<MVPCreditBalance> => {
    if (!user?.id) return { balance: 0, monthly_quota: 0, subscription_tier: 'rookie' };

    await supabase.rpc('ensure_mvp_credit_balance' as never, {
      p_user_id: user.id,
      p_subscription_tier: 'rookie',
    } as never);

    const { data, error } = await supabase
      .from('mvp_credit_balances' as never)
      .select('balance, monthly_quota, subscription_tier')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    const row = data as unknown as Partial<MVPCreditBalance> | null;
    return {
      balance: Number(row?.balance ?? 0),
      monthly_quota: Number(row?.monthly_quota ?? 0),
      subscription_tier: row?.subscription_tier ?? 'rookie',
    };
  }, [user?.id]);

  const query = useQuery({
    queryKey: ['mvp-credits', user?.id],
    enabled: Boolean(user?.id),
    queryFn: fetchBalance,
    staleTime: 30_000,
    retry: false,
  });

  const balanceData = query.data ?? { balance: 0, monthly_quota: 0, subscription_tier: 'rookie' };
  const totalAvailable = Number(balanceData.balance ?? 0);

  const refreshBalance = useCallback(async () => {
    if (!user?.id) return;
    await queryClient.invalidateQueries({ queryKey: ['mvp-credits', user.id] });
  }, [queryClient, user?.id]);

  const hasMVPCredits = useCallback((requiredAmount: number) => totalAvailable >= requiredAmount, [totalAvailable]);

  const deductMVPCredits = useCallback(
    async (
      feature: MVPCreditFeature,
      options: {
        requiredCredits?: number;
        featureName?: string;
        metadata?: Record<string, unknown>;
        idempotencyKey?: string;
      } = {}
    ) => {
      if (!user?.id) {
        toast.error('Please sign in to use MVP Builder.');
        return null;
      }
      const requiredCredits = options.requiredCredits ?? MVP_CREDIT_COSTS[feature];
      if (requiredCredits > totalAvailable) {
        toast.error(`You need ${requiredCredits} MVP Builder credits. Upgrade your plan or buy MVP credits.`);
        return null;
      }

      const { data, error } = await supabase.rpc('deduct_mvp_credits_atomic' as never, {
        p_user_id: user.id,
        p_amount: requiredCredits,
        p_feature: feature,
        p_reason: options.featureName ?? feature,
        p_metadata: {
          ...(options.metadata ?? {}),
          idempotencyKey: options.idempotencyKey ?? createIdempotencyKey(`mvp-${feature.toLowerCase()}`),
        },
      } as never);

      if (error || (data as { success?: boolean } | null)?.success === false) {
        toast.error('Unable to process MVP Builder credits.');
        return null;
      }

      await refreshBalance();
      return requiredCredits;
    },
    [refreshBalance, totalAvailable, user?.id]
  );

  return {
    balance: Number(balanceData.balance ?? 0),
    monthlyQuota: Number(balanceData.monthly_quota ?? 0),
    totalAvailable,
    loading: query.isLoading,
    refreshing: query.isFetching,
    hasMVPCredits,
    deductMVPCredits,
    refreshBalance,
  };
}

