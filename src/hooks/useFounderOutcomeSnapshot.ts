import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isFounderOutcomeSnapshot } from '@/lib/founderOutcomeSnapshot';
import { OUTCOME_FEATURE_FLAGS } from '@/lib/outcomeFeatureFlags';

export function useFounderOutcomeSnapshot() {
  const { user } = useAuth();
  const enabled = Boolean(user?.id) && OUTCOME_FEATURE_FLAGS.journeyOutcomeTruth();

  const query = useQuery({
    queryKey: ['founder-outcome-snapshot-v1', user?.id],
    enabled,
    staleTime: 30_000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_founder_outcome_snapshot_v1' as never);
      if (error) throw error;
      if (!isFounderOutcomeSnapshot(data)) {
        throw new Error('Founder outcome snapshot returned an invalid contract');
      }
      return data;
    },
  });

  return {
    snapshot: query.data ?? null,
    loading: enabled && query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
    enabled,
  };
}
