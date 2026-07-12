import { useCallback, useEffect, useState } from 'react';
import { InboxSection, messagingV2 } from '@/lib/messagingV2';

export const useInbox = (section: InboxSection) => {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPage(await messagingV2.inbox(section));
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Unable to load inbox'));
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { page, loading, error, refresh };
};
