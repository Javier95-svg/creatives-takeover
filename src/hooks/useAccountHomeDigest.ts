import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAccountContext } from '@/hooks/useAccountContext';
import type { PersonaDigest } from '@/lib/personaHome';

/**
 * The counts behind a non founder home: open requests, new enquiries, matches.
 *
 * Only fetched for the three types that have a persona home. A founder's home
 * is driven by the dashboard snapshot it already loads, so asking for this as
 * well would be a round trip that changes nothing on screen.
 */
export function useAccountHomeDigest() {
  const { user } = useAuth();
  const { userType, isLoading: contextLoading } = useAccountContext();
  const wanted = userType === 'mentor' || userType === 'marketplace' || userType === 'investor';

  const query = useQuery({
    queryKey: ['account-home-digest', user?.id, userType],
    enabled: Boolean(user?.id) && !contextLoading && wanted,
    staleTime: 60_000,
    queryFn: async (): Promise<PersonaDigest> => {
      const { data, error } = await supabase.rpc('account_home_digest' as never);
      if (error) throw error;
      const row = (data ?? {}) as Record<string, unknown>;
      const digest: PersonaDigest = {};
      for (const [key, value] of Object.entries(row)) {
        const count = typeof value === 'number' ? value : Number(value);
        if (Number.isFinite(count)) digest[key] = count;
      }
      return digest;
    },
  });

  return { digest: query.data ?? {}, isLoading: query.isPending && wanted };
}
