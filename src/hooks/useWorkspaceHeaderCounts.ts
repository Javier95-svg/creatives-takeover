import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CONNECTION_EVENT, getSeenAcceptedIds, getSeenPendingIds } from '@/lib/connectionSeenState';
import { MESSAGES_READ_EVENT, readCountFromEvent } from '@/lib/messagesReadState';
import { refreshHeaderCounts, subscribeWorkspaceHeader } from '@/lib/workspaceHeaderRealtime';

export type WorkspaceHeaderCounts = {
  unreadMessages: number;
  connectionNotifications: number;
};

type HeaderCountsRow = {
  unreadMessages: number;
  pendingConnectionRequestIds: string[];
  acceptedConnectionRequestIds: string[];
};

const EMPTY: HeaderCountsRow = {
  unreadMessages: 0,
  pendingConnectionRequestIds: [],
  acceptedConnectionRequestIds: [],
};

/**
 * Badge counts for the workspace header.
 *
 * The legacy navigation read its unread number from useMessaging({ autoLoad: true }),
 * which loads every conversation and opens realtime subscriptions. The header renders
 * on every workspace route, so this uses a single RPC plus a shared lightweight
 * realtime channel, without loading inboxes. Polling/focus remain recovery paths.
 *
 * The connection number counts two things, matching useSocial's connectionNotificationCount:
 * incoming requests still awaiting an answer, and requests this user sent that the other
 * person accepted. Which of those have been seen is stored per browser in localStorage,
 * so the RPC returns ids and the filtering happens here against the same helpers the
 * modal uses. Otherwise the badge would keep counting notifications the modal has cleared.
 */
export function useWorkspaceHeaderCounts(): WorkspaceHeaderCounts {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data } = useQuery({
    queryKey: ['workspace-header-counts', userId],
    enabled: Boolean(userId),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('get_workspace_header_counts').abortSignal(signal);
      if (error) throw error;
      const row = (data ?? {}) as Partial<HeaderCountsRow>;
      return {
        unreadMessages: Number(row.unreadMessages ?? 0),
        pendingConnectionRequestIds: row.pendingConnectionRequestIds ?? [],
        acceptedConnectionRequestIds: row.acceptedConnectionRequestIds ?? [],
      } satisfies HeaderCountsRow;
    },
  });

  // Answering a request or acknowledging an acceptance changes the badge without
  // any refetch, so recompute when useSocial broadcasts.
  const refresh = useCallback(() => {
    return refreshHeaderCounts(queryClient, userId);
  }, [queryClient, userId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeWorkspaceHeader(supabase, userId, refresh);
  }, [userId, refresh]);

  // Reading a conversation subtracts from the badge on the spot, then the
  // refetch confirms it. Invalidating alone would still leave the old number on
  // screen for the length of the round trip, which is what made clearing a DM
  // feel slow next to the bell.
  const applyRead = useCallback((event: Event) => {
    const count = readCountFromEvent(event);
    if (count > 0) {
      queryClient.setQueryData<HeaderCountsRow>(['workspace-header-counts', userId], (current) =>
        current ? { ...current, unreadMessages: Math.max(0, current.unreadMessages - count) } : current);
    }
    refresh();
  }, [queryClient, userId, refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener(CONNECTION_EVENT, refresh);
    window.addEventListener(MESSAGES_READ_EVENT, applyRead);
    return () => {
      window.removeEventListener(CONNECTION_EVENT, refresh);
      window.removeEventListener(MESSAGES_READ_EVENT, applyRead);
    };
  }, [refresh, applyRead]);

  const row = data ?? EMPTY;

  return useMemo(() => {
    if (!userId) return { unreadMessages: 0, connectionNotifications: 0 };
    const seenPending = new Set(getSeenPendingIds(userId));
    const seenAccepted = new Set(getSeenAcceptedIds(userId));
    const unseenPending = row.pendingConnectionRequestIds.filter((id) => !seenPending.has(id)).length;
    const unseenAccepted = row.acceptedConnectionRequestIds.filter((id) => !seenAccepted.has(id)).length;
    return {
      unreadMessages: row.unreadMessages,
      connectionNotifications: unseenPending + unseenAccepted,
    };
  }, [userId, row]);
}
