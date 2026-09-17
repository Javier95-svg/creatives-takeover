import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type WorkspaceHeaderCounts = {
  unreadMessages: number;
  pendingConnectionRequests: number;
};

const EMPTY: WorkspaceHeaderCounts = { unreadMessages: 0, pendingConnectionRequests: 0 };

/**
 * Badge counts for the workspace header.
 *
 * The legacy navigation read its unread number from useMessaging({ autoLoad: true }),
 * which loads every conversation and opens realtime subscriptions. The header renders
 * on every workspace route, so this uses a single RPC returning both counts instead.
 *
 * Polling rather than realtime is deliberate: a badge that is a minute stale is
 * acceptable, an extra socket on every route is not. Window focus refetches, so
 * returning to the tab updates it immediately.
 */
export function useWorkspaceHeaderCounts(): WorkspaceHeaderCounts {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['workspace-header-counts', user?.id],
    enabled: Boolean(user),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_workspace_header_counts');
      if (error) throw error;
      const row = (data ?? {}) as Partial<WorkspaceHeaderCounts>;
      return {
        unreadMessages: Number(row.unreadMessages ?? 0),
        pendingConnectionRequests: Number(row.pendingConnectionRequests ?? 0),
      } satisfies WorkspaceHeaderCounts;
    },
  });
  // A failed or in-flight count must never block the header from rendering.
  return data ?? EMPTY;
}
