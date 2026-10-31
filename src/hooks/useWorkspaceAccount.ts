import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * The name, username and photo the workspace shell shows. The shell's account
 * link and its avatar read this one cache entry instead of the same row twice.
 * The shell stays mounted across routes, so a cached username outlives a
 * rename and the avatar link 404s: it is re-read on focus, and Account saves
 * invalidate ['workspace-account', userId].
 */
export function useWorkspaceAccount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['workspace-account', user?.id],
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.schema('public').from('profiles').select('username, full_name, avatar_url').eq('id', user!.id).abortSignal(signal).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
