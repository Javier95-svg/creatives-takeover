import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logError } from '@/lib/logger';

export interface CreditWalletSummary {
  /** Lifetime credits purchased through the Quick Top Ups packs (Starter/Boost/Power). */
  topUpCredits: number;
  /** Net credits spent (deduct minus refund) since the current billing period start. */
  creditsSpent: number;
  /** Start of the current billing period (the plan's monthly anchor day). */
  periodStart: string | null;
  /** When the spent counter rolls back to 0 (next billing period start). */
  periodEnd: string | null;
}

interface CreditWalletSummaryRow {
  top_up_credits: number | null;
  credits_spent: number | null;
  period_start: string | null;
  period_end: string | null;
}

const EMPTY_SUMMARY: CreditWalletSummary = {
  topUpCredits: 0,
  creditsSpent: 0,
  periodStart: null,
  periodEnd: null,
};

/**
 * Reads the authenticated user's credit wallet summary from the
 * `get_credit_wallet_summary` RPC (top-ups + credits spent this billing period).
 * Pass `enabled: false` to skip the fetch where the summary is not displayed.
 */
export function useCreditWalletSummary(enabled = true) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['credit-wallet-summary', user?.id],
    enabled: enabled && !!user?.id,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<CreditWalletSummary> => {
      const { data, error } = await supabase.rpc('get_credit_wallet_summary' as never);
      if (error) throw error;

      const row = (Array.isArray(data) ? data[0] : data) as CreditWalletSummaryRow | undefined;
      if (!row) return EMPTY_SUMMARY;

      return {
        topUpCredits: Number(row.top_up_credits ?? 0),
        creditsSpent: Number(row.credits_spent ?? 0),
        periodStart: row.period_start ?? null,
        periodEnd: row.period_end ?? null,
      };
    },
    onError: (error) => {
      logError('Failed to fetch credit wallet summary', error, { userId: user?.id });
    },
  });

  return {
    topUpCredits: query.data?.topUpCredits ?? 0,
    creditsSpent: query.data?.creditsSpent ?? 0,
    periodStart: query.data?.periodStart ?? null,
    periodEnd: query.data?.periodEnd ?? null,
    loading: query.isLoading,
  };
}
