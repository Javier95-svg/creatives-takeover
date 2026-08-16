import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type {
  FirstCustomerSprintApplication,
  FirstCustomerSprintApplicationInput,
} from '@/types/firstCustomerSprint';

// Generated Supabase types follow the additive migration deployment.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = supabase as any;

export const firstCustomerSprintApplicationQueryKey = (userId?: string | null) =>
  ['first-customer-sprint-application-v1', userId] as const;

export function useFirstCustomerSprintApplication() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: firstCustomerSprintApplicationQueryKey(user?.id),
    enabled: Boolean(user?.id),
    retry: 1,
    queryFn: async (): Promise<FirstCustomerSprintApplication | null> => {
      const { data, error } = await client.rpc('get_my_first_customer_sprint_application_v1');
      if (error) throw error;
      return data ?? null;
    },
  });

  const mutation = useMutation({
    mutationFn: async (input: FirstCustomerSprintApplicationInput) => {
      const { data, error } = await client.rpc('submit_first_customer_sprint_application_v1', {
        p_business_model: input.businessModel,
        p_founder_owns_sales: input.founderOwnsSales,
        p_has_sellable_product: input.hasSellableProduct,
        p_customer_count: input.customerCount,
        p_estimated_annual_customer_value_usd: input.estimatedAnnualCustomerValueUsd,
        p_weekly_capacity_hours: input.weeklyCapacityHours,
        p_can_name_ten_prospects: input.canNameTenProspects,
        p_recent_outreach: input.recentOutreach,
        p_primary_blocker: input.primaryBlocker,
        p_product_url: input.productUrl || null,
        p_product_summary: input.productSummary,
        p_acquisition_source: input.acquisitionSource,
        p_referring_mentor_id: input.referringMentorId || null,
        p_referral_code: input.referralCode || null,
      });
      if (error) throw error;
      return data as FirstCustomerSprintApplication;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: firstCustomerSprintApplicationQueryKey(user?.id) });
    },
  });

  const submit = useCallback(
    (input: FirstCustomerSprintApplicationInput) => mutation.mutateAsync(input),
    [mutation],
  );

  return useMemo(() => ({
    application: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    isSaving: mutation.isPending,
    submit,
  }), [mutation.isPending, query.data, query.error, query.isLoading, submit]);
}
