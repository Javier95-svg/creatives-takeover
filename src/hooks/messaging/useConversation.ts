import { useQuery } from '@tanstack/react-query';
import { messagingV2 } from '@/lib/messagingV2';

export const useConversation = (conversationId: string | null) => {
  const query = useQuery({
    queryKey: ['messages', 'conversation-v2', conversationId],
    queryFn: () => messagingV2.messagePage(conversationId!),
    enabled: Boolean(conversationId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false
  });
  const load = (anchorMessageId?: string) => anchorMessageId
    ? messagingV2.messagePage(conversationId!, undefined, anchorMessageId)
    : query.refetch().then((result) => result.data);
  return { page: query.data ?? null, loading: query.isLoading, refreshing: query.isFetching, error: query.error, load };
};
