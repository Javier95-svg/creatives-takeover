import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { EMPTY_COHORT_CONTEXT, type CohortContext, type CohortDashboardData } from '@/lib/cohorts';

export const COHORT_CONTEXT_QUERY_KEY = 'cohort-context';

/**
 * Whether the signed-in user is in cohort mode: as a founder in a cohort
 * (member) and/or as program staff (staff). Any failure, including the cohort
 * functions not being deployed yet, means no cohort mode, so the usual
 * dashboard always works.
 */
export function useCohortContext() {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: [COHORT_CONTEXT_QUERY_KEY, userId],
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<CohortContext> => {
      const { data, error } = await supabase.rpc('cohort_context_v1' as never);
      if (error) return EMPTY_COHORT_CONTEXT;
      const row = (data ?? {}) as Partial<CohortContext>;
      return {
        member: row.member ?? null,
        staff: Array.isArray(row.staff) ? row.staff : [],
      };
    },
  });

  return {
    context: query.data ?? EMPTY_COHORT_CONTEXT,
    loading: Boolean(userId) && query.isLoading,
    refresh: query.refetch,
  };
}

/** The program dashboard for one cohort. Staff of that cohort and admins only. */
export function useCohortDashboard(cohortId: string | null) {
  return useQuery({
    queryKey: ['cohort-dashboard', cohortId],
    enabled: Boolean(cohortId),
    staleTime: 60 * 1000,
    retry: false,
    queryFn: async (): Promise<CohortDashboardData> => {
      const { data, error } = await supabase.rpc('cohort_dashboard_v1' as never, { p_cohort_id: cohortId } as never);
      if (error) throw error;
      return data as unknown as CohortDashboardData;
    },
  });
}
