import { useCallback, useEffect, useState } from 'react';
import { messagingV2 } from '@/lib/messagingV2';

export const useConversation = (conversationId: string | null) => {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (anchorMessageId?: string) => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      setPage(await messagingV2.messagePage(conversationId, undefined, anchorMessageId));
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Unable to load conversation'));
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => { void load(); }, [load]);
  return { page, loading, error, load };
};
