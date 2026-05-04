import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { safe } from '@/integrations/supabase/safe';
import { isAdminEmail } from '@/lib/admin';

export const useAdminRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      setLoading(true);

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (isAdminEmail(user.email)) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      try {
        // Check if user has admin role with retry logic
        const { data, error } = await safe.select(async () =>
          await safe.client
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle()
        );

        if (error) {
          console.error('Error checking admin role:', error);
        }

        setIsAdmin(!!data);
      } catch (error) {
        console.error('Error in admin role check:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user]);

  return { isAdmin, loading };
};
