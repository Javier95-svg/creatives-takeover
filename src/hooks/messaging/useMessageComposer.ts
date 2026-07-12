import { useCallback, useEffect, useState } from 'react';
import { mapQuote, messagingV2, type DirectMessageQuote } from '@/lib/messagingV2';

export const useMessageComposer = (conversationId: string | null) => {
  const [quote, setQuote] = useState<DirectMessageQuote | null>(null);
  const refreshQuote = useCallback(async () => {
    if (!conversationId) return setQuote(null);
    setQuote(mapQuote(await messagingV2.quote(conversationId)));
  }, [conversationId]);
  useEffect(() => { void refreshQuote().catch(() => setQuote(null)); }, [refreshQuote]);
  return { quote, refreshQuote };
};
