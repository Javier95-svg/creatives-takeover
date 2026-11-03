import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { safe } from '@/integrations/supabase/safe';

// Whether the signed-in user holds the admin role. The lookup is shared through
// React Query: it used to run once per component that called this hook, on
// every mount, so one visit to /investors sent the same user_roles query twice
// (the page and useAngels) and every navigation sent it again.
export const useAdminRole = () => {
  const { user, loading: authLoading } = useAuth();
  const roleQuery = useQuery({
    queryKey: ['admin-role', user?.id],
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const { data, error } = await safe.select(async () =>
          await safe.client
            .from('user_roles')
            .select('role')
            .eq('user_id', user!.id)
            .eq('role', 'admin')
            .maybeSingle()
        );

        if (error) {
          console.error('Error checking admin role:', error);
        }

        return Boolean(data);
      } catch (error) {
        console.error('Error in admin role check:', error);
        return false;
      }
    },
  });

  if (!user) return { isAdmin: false, loading: authLoading };
  return { isAdmin: roleQuery.data ?? false, loading: roleQuery.isPending };
};
