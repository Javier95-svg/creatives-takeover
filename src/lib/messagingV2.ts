import { supabase } from '@/integrations/supabase/client';

export type InboxSection = 'inbox' | 'requests' | 'archived';

export type MessageRecipient = {
  userId: string;
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  headline: string | null;
  isConnection: boolean;
  isMentor: boolean;
};

export type MessageContext = {
  kind: 'profile' | 'cofounder_listing' | 'mentor' | 'booking' | 'artifact' | 'external_link';
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  route: string;
};

export type DirectMessageQuote = {
  isMentor: boolean;
  isFirstMentorMessage: boolean;
  creditsRequired: number;
  balance: number;
  canSend: boolean;
  requestState: string;
};

const rpc = async <T>(name: string, params: Record<string, unknown>): Promise<T> => {
  const { data, error } = await (supabase as any).rpc(name, params);
  if (error) throw error;
  return data as T;
};

const rpcWithLegacyFallback = async <T>(preferred: string, fallback: string, params: Record<string, unknown>): Promise<T> => {
  try {
    return await rpc<T>(preferred, params);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === 'object' && error
        ? [String((error as any).message || ''), String((error as any).code || ''), String((error as any).details || '')].join(' ')
        : String(error);
    if (!/function|schema cache|404|PGRST202/i.test(message)) throw error;
    return rpc<T>(fallback, params);
  }
};

export const messagingV2 = {
  inbox: (section: InboxSection, limit = 50, cursor?: string) =>
    rpcWithLegacyFallback<any>('get_inbox_v2', 'get_inbox_v1', { p_section: section, p_limit: limit, p_cursor: cursor ?? null }),
  messagePage: (conversationId: string, before?: { createdAt: string; id: string }, anchorMessageId?: string) =>
    rpcWithLegacyFallback<any>('get_message_page_v2', 'get_message_page_v1', {
      p_conversation_id: conversationId,
      p_limit: 30,
      p_before_created_at: before?.createdAt ?? null,
      p_before_id: before?.id ?? null,
      p_anchor_message_id: anchorMessageId ?? null
    }),
  recipients: (query: string, limit = 20) =>
    rpcWithLegacyFallback<any[]>('search_message_recipients_v2', 'search_message_recipients_v1', { p_query: query, p_limit: limit }),
  quote: (conversationId: string) =>
    rpc<any>('get_direct_message_quote_v1', { p_conversation_id: conversationId }),
  send: (input: {
    conversationId: string;
    content: string;
    clientMessageId: string;
    replyToId?: string;
    attachments?: Array<Record<string, unknown>>;
  }) => {
    const voiceAttachment = input.attachments?.length === 1 && String(input.attachments[0]?.mime_type || '').startsWith('audio/')
      ? input.attachments[0]
      : null;
    return voiceAttachment
      ? rpc<any>('send_voice_message_v1', {
          p_conversation_id: input.conversationId,
          p_client_message_id: input.clientMessageId,
          p_attachment: voiceAttachment,
          p_reply_to_id: input.replyToId ?? null
        })
      : rpc<any>('send_direct_message_v2', {
          p_conversation_id: input.conversationId,
          p_content: input.content,
          p_client_message_id: input.clientMessageId,
          p_reply_to_id: input.replyToId ?? null,
          p_attachments: input.attachments ?? []
        });
  },
  edit: (messageId: string, content: string) =>
    rpc<any>('edit_direct_message_v1', { p_message_id: messageId, p_content: content }),
  createGroup: (input: { name: string; participantIds: string[]; purpose: string; context?: MessageContext }) =>
    rpc<any>('create_message_group_v1', {
      p_name: input.name,
      p_participant_ids: input.participantIds,
      p_purpose: input.purpose,
      p_context: input.context ?? null
    }),
  sendGroup: (input: {
    conversationId: string;
    content: string;
    clientMessageId: string;
    replyToId?: string;
    attachments?: Array<Record<string, unknown>>;
    context?: MessageContext;
  }) => rpc<any>('send_group_message_v1', {
    p_conversation_id: input.conversationId,
    p_content: input.content,
    p_client_message_id: input.clientMessageId,
    p_reply_to_id: input.replyToId ?? null,
    p_attachments: input.attachments ?? [],
    p_context: input.context ?? null
  }),
  attachContext: (messageId: string, context: MessageContext) =>
    rpc<any>('set_message_context_v1', { p_message_id: messageId, p_context: context }),
  requestStatus: (conversationId: string, status: 'accepted' | 'refused') =>
    rpc<any>('set_message_request_status_v1', { p_conversation_id: conversationId, p_status: status }),
  markRead: (conversationId: string) =>
    rpc<void>('mark_conversation_read_v1', { p_conversation_id: conversationId }),
  conversationState: (conversationId: string, action: 'pin' | 'unpin' | 'mute' | 'unmute' | 'archive' | 'unarchive' | 'hide', mutedUntil?: string) =>
    rpc<any>('set_conversation_state_v1', { p_conversation_id: conversationId, p_action: action, p_muted_until: mutedUntil ?? null }),
  softDelete: (messageId: string) =>
    rpc<any>('soft_delete_message_v1', { p_message_id: messageId }),
  performance: (input: { eventName: 'inbox_loaded' | 'conversation_opened' | 'message_sent' | 'realtime_received'; durationMs: number; conversationId?: string; metadata?: Record<string, unknown> }) =>
    rpc<void>('record_message_performance_v1', {
      p_event_name: input.eventName,
      p_duration_ms: Math.max(0, Math.round(input.durationMs)),
      p_conversation_id: input.conversationId ?? null,
      p_connection_type: typeof navigator !== 'undefined' ? (navigator as any).connection?.effectiveType ?? null : null,
      p_metadata: input.metadata ?? {}
    })
};

export const mapRecipient = (row: any): MessageRecipient => ({
  userId: row.userId || row.user_id || row.id,
  fullName: row.fullName || row.full_name || 'Founder',
  username: row.username ?? null,
  avatarUrl: row.avatarUrl || row.avatar_url || null,
  headline: row.headline ?? null,
  isConnection: Boolean(row.isConnection ?? row.is_connection ?? row.connected),
  isMentor: Boolean(row.isMentor ?? row.is_mentor)
});

export const mapQuote = (row: any): DirectMessageQuote => ({
  isMentor: Boolean(row?.isMentor ?? row?.is_mentor ?? row?.recipientIsMentor),
  isFirstMentorMessage: Boolean(row?.isFirstMentorMessage ?? row?.is_first_mentor_message ?? row?.firstMentorMessageFree),
  creditsRequired: Number(row?.creditsRequired ?? row?.credits_required ?? row?.credits ?? 0),
  balance: Number(row?.balance ?? 0),
  canSend: Boolean(row?.canSend ?? row?.can_send ?? row?.canAfford ?? true),
  requestState: row?.requestState || row?.request_state || row?.requestStatus || 'accepted'
});
