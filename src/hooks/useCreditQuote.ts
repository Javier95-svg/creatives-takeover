import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import type { CreditFeature } from '@/config/constants';

export interface CreditQuote {
  schemaVersion: 1;
  feature: CreditFeature;
  plan: 'rookie' | 'starter' | 'rising' | 'pro';
  cost: number;
  baseCost: number;
  available: number;
  balanceAfter: number;
  affordable: boolean;
  giftEligible: boolean;
  giftApplied: boolean;
  recommendedPurchase: 'none' | 'top_up' | 'plan';
  coveredNextActions: number;
}

export function useCreditQuote(
  feature: CreditFeature | null | undefined,
  options: { model?: string | null; forecastFeatures?: CreditFeature[]; source?: string; enabled?: boolean } = {},
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['credit-quote-v1', user?.id, feature, options.model, options.forecastFeatures],
    enabled: Boolean(user && feature && options.enabled !== false),
    staleTime: 30_000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('credit-quote', {
        body: {
          feature,
          model: options.model ?? null,
          forecastFeatures: options.forecastFeatures ?? [],
        },
      });
      if (error) throw error;
      const quote = data as CreditQuote;
      captureEvent('credit_quote_viewed', {
        feature: quote.feature,
        plan: quote.plan,
        credit_cost: quote.cost,
        credits_available: quote.available,
        affordable: quote.affordable,
        purchase_recommendation: quote.recommendedPurchase,
        source: options.source ?? 'unknown',
      });
      return quote;
    },
  });
}
