import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type RealtimeCallbacks = {
  onInboxChange: () => void;
  onMessageChange: (payload: unknown) => void;
  onSettingsChange: () => void;
};

export const useMessagingRealtime = (
  userId: string | null,
  conversationId: string | null,
  callbacks: RealtimeCallbacks
) => {
  useEffect(() => {
    if (!userId) return;
    const inbox = supabase.channel(`messaging-inbox-v2-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `participants.cs.{${userId}}` }, callbacks.onInboxChange)
      .subscribe();
    const settings = supabase.channel(`messaging-settings-v2-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_user_settings', filter: `user_id=eq.${userId}` }, callbacks.onSettingsChange)
      .subscribe();
    const active = conversationId
      ? supabase.channel(`messaging-active-v2-${conversationId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, callbacks.onMessageChange)
          .subscribe()
      : null;
    return () => {
      void supabase.removeChannel(inbox);
      void supabase.removeChannel(settings);
      if (active) void supabase.removeChannel(active);
    };
  }, [callbacks, conversationId, userId]);
};
