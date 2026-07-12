import { useQuery } from '@tanstack/react-query';
import { InboxSection, messagingV2 } from '@/lib/messagingV2';

export const useInbox = (section: InboxSection) => {
  const query = useQuery({
    queryKey: ['messages', 'inbox-v2', section],
    queryFn: () => messagingV2.inbox(section),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false
  });
  return { page: query.data ?? null, loading: query.isLoading, refreshing: query.isFetching, error: query.error, refresh: query.refetch };
};
