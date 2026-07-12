import { useCallback, useEffect, useState } from 'react';
import { mapQuote, messagingV2, type DirectMessageQuote } from '@/lib/messagingV2';

export const useMessageComposer = (conversationId: string | null) => {
  const [quote, setQuote] = useState<DirectMessageQuote | null>(null);
  const refreshQuote = useCallback(async () => {
    if (!conversationId) return setQuote(null);
    setQuote(mapQuote(await messagingV2.quote(conversationId)));
  }, [conversationId]);
  useEffect(() => {
    // Pricing/request state is ancillary to the transcript. Let the cached
    // message page win the network slot after conversation selection.
    const timeoutId = window.setTimeout(() => {
      void refreshQuote().catch(() => setQuote(null));
    }, 150);
    return () => window.clearTimeout(timeoutId);
  }, [refreshQuote]);
  return { quote, refreshQuote };
};
