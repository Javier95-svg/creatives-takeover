import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safe } from '@/integrations/supabase/safe';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logError, logWarn, logInfo } from '@/lib/logger';
import { handleError, getUserMessage } from '@/lib/errors';
import { completeActivationJourney, trackRetentionEvent } from '@/lib/retentionSystem';
import { messagingV2 } from '@/lib/messagingV2';
import { useQueryClient } from '@tanstack/react-query';

export interface Conversation {
  id: string;
  participants: string[];
  is_group: boolean;
  name?: string;
  last_message_at?: string;
  last_message_preview?: string;
  created_at: string;
  updated_at: string;
  group_purpose?: string | null;
  context?: Record<string, unknown> | null;
  other_user?: {
    id: string;
    fullName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  };
}

export interface ConversationUserSettings {
  conversation_id: string;
  user_id: string;
  archived_at?: string | null;
  muted_until?: string | null;
  pinned_at?: string | null;
  request_status?: 'accepted' | 'pending' | 'refused' | null;
  request_updated_at?: string | null;
  hidden_at?: string | null;
}

export interface MessageAttachment {
  id?: string;
  message_id?: string;
  uploader_id?: string;
  storage_path?: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  width?: number | null;
  height?: number | null;
  signed_url?: string | null;
}

export type MessageDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'audio';
  attachments?: any;
  attachment_rows?: MessageAttachment[];
  client_message_id?: string | null;
  delivery_status?: MessageDeliveryStatus;
  error_message?: string;
  upload_progress?: number;
  local_failed?: boolean;
  is_read: boolean;
  reply_to_id?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  edited_at?: string | null;
  context?: Record<string, unknown> | null;
  reaction_rows?: Array<{ emoji: string; user_id: string }>;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface LoadMessagesOptions {
  before?: {
    created_at: string;
    id: string;
  };
  limit?: number;
  mode?: 'replace' | 'prepend' | 'append';
  anchorMessageId?: string;
}

export interface MessageSearchResult {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  attachments?: any;
  client_message_id?: string | null;
  created_at: string;
  updated_at: string;
  rank: number;
}

export interface SendMessageOptions {
  replyToId?: string;
  clientMessageId?: string;
  files?: File[];
}

export interface MessagePageState {
  hasMore: boolean;
  loadingOlder: boolean;
  loadingInitial?: boolean;
  oldestCursor?: {
    created_at: string;
    id: string;
  };
}

type UseMessagingOptions = {
  autoLoad?: boolean;
  suppressLoadErrors?: boolean;
};

const MESSAGE_PAGE_SIZE = 30;
const messagePageQueryKey = (userId: string, conversationId: string) =>
  ['messages', 'page-v1', userId, conversationId] as const;
const FAILED_MESSAGES_STORAGE_KEY = 'ct_failed_direct_messages_v1';
const MESSAGE_ATTACHMENT_BUCKET = 'message-attachments';
const MAX_MESSAGE_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_MESSAGE_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/zip',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg'
]);

type StoredFailedMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  client_message_id: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
};

const generateClientMessageId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

const sortMessagesAscending = (items: Message[]): Message[] =>
  [...items].sort((a, b) => {
    const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });

const mergeMessageLists = (currentMessages: Message[], incomingMessages: Message[]): Message[] => {
  const byStableKey = new Map<string, Message>();

  currentMessages.forEach((message) => {
    const stableKey = message.client_message_id || message.id;
    byStableKey.set(stableKey, message);
  });

  incomingMessages.forEach((message) => {
    const stableKey = message.client_message_id || message.id;
    const existing = byStableKey.get(stableKey);

    if (!existing) {
      byStableKey.set(stableKey, message);
      return;
    }

    const existingUpdatedAt = new Date(existing.updated_at || existing.created_at).getTime();
    const incomingUpdatedAt = new Date(message.updated_at || message.created_at).getTime();
    const shouldPreferIncoming =
      incomingUpdatedAt >= existingUpdatedAt ||
      existing.local_failed ||
      existing.delivery_status === 'pending';

    byStableKey.set(stableKey, shouldPreferIncoming ? { ...existing, ...message } : existing);
  });

  return sortMessagesAscending(Array.from(byStableKey.values()));
};

const loadStoredFailedMessages = (userId: string): StoredFailedMessage[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(`${FAILED_MESSAGES_STORAGE_KEY}:${userId}`);
    return raw ? JSON.parse(raw) as StoredFailedMessage[] : [];
  } catch {
    return [];
  }
};

const saveStoredFailedMessages = (userId: string, messages: StoredFailedMessage[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${FAILED_MESSAGES_STORAGE_KEY}:${userId}`, JSON.stringify(messages));
};

const toSafeStorageName = (fileName: string): string =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120) || 'attachment';

const createAttachmentSignedUrl = async (
  storagePath: string,
  options: { showToast?: boolean } = {}
): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from(MESSAGE_ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error) {
    logError('Error creating attachment signed URL', error);
    if (options.showToast) {
      toast.error('Unable to open attachment.');
    }
    return null;
  }

  return data?.signedUrl || null;
};

const mapAttachmentRow = (attachment: any): MessageAttachment => {
  const storagePath = attachment.storage_path;
  const mimeType = attachment.mime_type || 'application/octet-stream';

  return {
    id: attachment.id,
    message_id: attachment.message_id,
    uploader_id: attachment.uploader_id,
    storage_path: storagePath,
    file_name: attachment.file_name,
    mime_type: mimeType,
    file_size: Number(attachment.file_size || 0),
    width: attachment.width,
    height: attachment.height,
    // Storage signing is deferred until a virtualized attachment is visible.
    signed_url: null
  };
};

export const useMessaging = (options: UseMessagingOptions = {}) => {
  const { autoLoad = true, suppressLoadErrors = false } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [messagePageState, setMessagePageState] = useState<Record<string, MessagePageState>>({});
  const [conversationSettings, setConversationSettings] = useState<Record<string, ConversationUserSettings>>({});
  const [searchResults, setSearchResults] = useState<MessageSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  // Ref to track current messages for subscription callbacks
  const messagesRef = useRef<Record<string, Message[]>>({});
  const conversationIdsRef = useRef<Set<string>>(new Set());
  
  // Keep ref in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    conversationIdsRef.current = new Set(conversations.map((conversation) => conversation.id));
  }, [conversations]);

  const loadUnreadCounts = useCallback(async (conversationIds?: string[]) => {
    if (!user) return;

    const ids = conversationIds ?? Array.from(conversationIdsRef.current);

    if (ids.length === 0) {
      setUnreadCounts({});
      return;
    }

    try {
      const { data, error } = await safe.select(async () =>
        await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', ids)
          .neq('sender_id', user.id)
          .eq('is_read', false)
      );

      if (error) throw error;

      const nextUnreadCounts: Record<string, number> = {};
      ids.forEach((id) => {
        nextUnreadCounts[id] = 0;
      });

      (data || []).forEach((row) => {
        const conversationId = row.conversation_id;
        nextUnreadCounts[conversationId] = (nextUnreadCounts[conversationId] || 0) + 1;
      });

      setUnreadCounts(nextUnreadCounts);
    } catch (error) {
      logError('Error loading unread counts', error);
    }
  }, [user]);

  const resolveMentorUserId = useCallback(async (mentor: { name: string; user_id?: string | null }): Promise<string | null> => {
    if (!user || !mentor.user_id || mentor.user_id === user.id) {
      return null;
    }

    const { data, error } = await supabase
      .from('mentors')
      .select('user_id')
      .eq('user_id', mentor.user_id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      logError('resolveMentorUserId: Could not validate linked mentor account', error, {
        mentorUserId: mentor.user_id
      });
      return null;
    }

    return data?.user_id || null;
  }, [user]);
  const mapMessagesWithRelatedData = useCallback(async (rows: any[]): Promise<Message[]> => {
    if (rows.length === 0) return [];

    const senderIds = [...new Set(rows.map((message) => message.sender_id).filter(Boolean))];
    const messageIds = rows.map((message) => message.id).filter(Boolean);

    const [{ data: profilesData, error: profilesError }, { data: attachmentData, error: attachmentError }, { data: receiptData, error: receiptError }] = await Promise.all([
      senderIds.length > 0
        ? supabase.from('public_profiles').select('id, full_name, avatar_url').in('id', senderIds)
        : Promise.resolve({ data: [], error: null }),
      messageIds.length > 0
        ? (supabase as any).from('message_attachments').select('*').in('message_id', messageIds)
        : Promise.resolve({ data: [], error: null }),
      messageIds.length > 0
        ? (supabase as any).from('message_receipts').select('message_id, user_id, delivered_at, read_at').in('message_id', messageIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (profilesError) throw profilesError;
    if (attachmentError) throw attachmentError;
    if (receiptError) throw receiptError;

    const profilesMap = new Map((profilesData || []).map((profile) => [profile.id, profile]));
    const attachmentsByMessage = new Map<string, MessageAttachment[]>();
    const receiptsByMessage = new Map<string, any[]>();

    const mappedAttachments = (attachmentData || []).map(mapAttachmentRow);

    mappedAttachments.forEach((attachment) => {
      if (!attachment.message_id) return;
      const current = attachmentsByMessage.get(attachment.message_id) || [];
      current.push(attachment);
      attachmentsByMessage.set(attachment.message_id, current);
    });

    (receiptData || []).forEach((receipt: any) => {
      const current = receiptsByMessage.get(receipt.message_id) || [];
      current.push(receipt);
      receiptsByMessage.set(receipt.message_id, current);
    });

    return rows.map((message) => {
      const messageReceipts = receiptsByMessage.get(message.id) || [];
      const recipientReceipts = messageReceipts.filter((receipt) => receipt.user_id !== message.sender_id);
      const hasReadReceipt = recipientReceipts.some((receipt) => !!receipt.read_at);
      const hasDeliveredReceipt = recipientReceipts.some((receipt) => !!receipt.delivered_at);
      const deliveryStatus: MessageDeliveryStatus = message.sender_id === user?.id
        ? hasReadReceipt || message.is_read
          ? 'read'
          : hasDeliveredReceipt
            ? 'delivered'
            : 'sent'
        : message.is_read
          ? 'read'
          : 'delivered';

      return {
        ...message,
        client_message_id: message.client_message_id || null,
        message_type: message.message_type as 'text' | 'image' | 'file',
        attachment_rows: attachmentsByMessage.get(message.id) || [],
        delivery_status: deliveryStatus,
        sender: profilesMap.get(message.sender_id) || undefined
      } as Message;
    });
  }, [user?.id]);

  const loadConversationsFromServer = useCallback(async (includeArchived = false) => {
    if (!user) return;
    const inboxStartedAt = performance.now();

    try {
      const pages = await Promise.all([
        messagingV2.inbox('inbox', 50),
        messagingV2.inbox('requests', 50),
        ...(includeArchived ? [messagingV2.inbox('archived', 50)] : [])
      ]);
      const rows = pages.flatMap((page) => page?.items || []);
      const uniqueRows = Array.from(new Map(rows.map((row: any) => [row.id, row])).values()) as any[];
      const nextSettings: Record<string, ConversationUserSettings> = {};
      const nextUnread: Record<string, number> = {};

      const nextConversations: Conversation[] = uniqueRows.map((row) => {
        nextSettings[row.id] = {
          conversation_id: row.id,
          user_id: user.id,
          request_status: row.requestStatus || 'accepted',
          request_updated_at: null,
          archived_at: row.archivedAt || null,
          hidden_at: row.hiddenAt || null,
          muted_until: row.mutedUntil || null,
          pinned_at: row.pinnedAt || null
        };
        nextUnread[row.id] = Number(row.unreadCount || 0);
        const timestamp = row.lastMessageAt || new Date().toISOString();
        return {
          id: row.id,
          participants: row.participants || [user.id, row.otherUser?.id].filter(Boolean),
          is_group: Boolean(row.isGroup),
          name: row.name || undefined,
          group_purpose: row.groupPurpose || null,
          context: row.context || null,
          last_message_at: row.lastMessageAt || undefined,
          last_message_preview: row.lastMessagePreview || '',
          other_user: row.otherUser || undefined,
          created_at: timestamp,
          updated_at: timestamp
        };
      });

      setConversationSettings(nextSettings);
      setUnreadCounts(nextUnread);
      setConversations(nextConversations);
      void messagingV2.performance({
        eventName: 'inbox_loaded',
        durationMs: performance.now() - inboxStartedAt,
        metadata: { conversationCount: nextConversations.length, compatibilityFallback: false }
      }).catch(() => undefined);
      return;
    } catch (rpcError) {
      logWarn('Messaging V2 inbox unavailable; using RLS-safe compatibility reads', {
        error: rpcError instanceof Error ? rpcError.message : String(rpcError)
      });
    }

    try {
      const { data: conversationRows, error: conversationError } = await safe.select(async () =>
        await supabase
          .from('conversations')
          .select('*')
          .contains('participants', [user.id])
          .order('last_message_at', { ascending: false, nullsFirst: false })
      );
      if (conversationError) throw conversationError;

      const rawConversations = (conversationRows || []) as Conversation[];
      const conversationIds = rawConversations.map((conversation) => conversation.id);
      const [{ data: settingRows, error: settingsError }, { data: unreadRows, error: unreadError }] =
        await Promise.all([
          conversationIds.length > 0
            ? (supabase as any)
                .from('conversation_user_settings')
                .select('*')
                .eq('user_id', user.id)
                .in('conversation_id', conversationIds)
            : Promise.resolve({ data: [], error: null }),
          conversationIds.length > 0
            ? supabase
                .from('messages')
                .select('conversation_id')
                .in('conversation_id', conversationIds)
                .neq('sender_id', user.id)
                .eq('is_read', false)
            : Promise.resolve({ data: [], error: null })
        ]);
      if (settingsError) throw settingsError;
      if (unreadError) throw unreadError;

      const settingsByConversation = ((settingRows || []) as ConversationUserSettings[]).reduce(
        (accumulator, settings) => {
          accumulator[settings.conversation_id] = settings;
          return accumulator;
        },
        {} as Record<string, ConversationUserSettings>
      );
      const nextUnread = conversationIds.reduce((accumulator, id) => {
        accumulator[id] = 0;
        return accumulator;
      }, {} as Record<string, number>);
      (unreadRows || []).forEach((row) => {
        nextUnread[row.conversation_id] = (nextUnread[row.conversation_id] || 0) + 1;
      });

      const visibleConversations = rawConversations
        .filter((conversation) => {
          const settings = settingsByConversation[conversation.id];
          const lastActivity = new Date(conversation.last_message_at || conversation.created_at).getTime();
          const hiddenAt = settings?.hidden_at ? new Date(settings.hidden_at).getTime() : 0;
          if (hiddenAt && lastActivity <= hiddenAt) return false;
          if (includeArchived) return true;
          return !settings?.archived_at && settings?.request_status !== 'refused';
        })
        .sort((left, right) => {
          const leftSettings = settingsByConversation[left.id];
          const rightSettings = settingsByConversation[right.id];
          const leftPinned = leftSettings?.pinned_at ? new Date(leftSettings.pinned_at).getTime() : 0;
          const rightPinned = rightSettings?.pinned_at ? new Date(rightSettings.pinned_at).getTime() : 0;
          if (leftPinned !== rightPinned) return rightPinned - leftPinned;
          return new Date(right.last_message_at || right.created_at).getTime() -
            new Date(left.last_message_at || left.created_at).getTime();
        });

      setConversationSettings(settingsByConversation);
      setUnreadCounts(nextUnread);
      setConversations(visibleConversations);
      void messagingV2.performance({
        eventName: 'inbox_loaded',
        durationMs: performance.now() - inboxStartedAt,
        metadata: { conversationCount: visibleConversations.length, compatibilityFallback: true }
      }).catch(() => undefined);
    } catch (fallbackError) {
      logError('Error loading conversations through compatibility reads', fallbackError);
      if (!suppressLoadErrors) {
        toast.error('Failed to load conversations. Please refresh the page.');
      }
    }
  }, [suppressLoadErrors, user]);

  const loadArchivedConversations = useCallback(
    () => loadConversationsFromServer(true),
    [loadConversationsFromServer]
  );

  // Load user's conversations and keep them synced with backend as source of truth
  useEffect(() => {
    if (!user || !autoLoad) return;

    void loadConversationsFromServer();

    const conversationSubscription = supabase
      .channel(`user-conversations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participants.cs.{${user.id}}`
        },
        () => {
          void loadConversationsFromServer();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(conversationSubscription);
    };
  }, [user, autoLoad, loadConversationsFromServer, loadUnreadCounts]);

  useEffect(() => {
    if (user) return;
    setConversations([]);
    setMessages({});
    setUnreadCounts({});
    setActiveConversationId(null);
  }, [user]);

  const loadMessages = useCallback(async (
    conversationId: string,
    options: LoadMessagesOptions = {}
  ): Promise<Message[]> => {
    if (options.mode === 'prepend') {
      setMessagePageState((prev) => ({
        ...prev,
        [conversationId]: {
          ...(prev[conversationId] || { hasMore: true }),
          loadingOlder: true,
          loadingInitial: false
        }
      }));
    } else {
      setMessagePageState((prev) => ({
        ...prev,
        [conversationId]: {
          ...(prev[conversationId] || { hasMore: true, loadingOlder: false }),
          loadingInitial: !(messagesRef.current[conversationId]?.length > 0)
        }
      }));
    }

    try {
      let page: any;
      let loadedMessages: Message[];

      try {
        const isInitialPage = !options.before && !options.anchorMessageId && options.mode !== 'prepend';
        page = isInitialPage && user
          ? await queryClient.fetchQuery({
              queryKey: messagePageQueryKey(user.id, conversationId),
              queryFn: () => messagingV2.messagePage(conversationId),
              staleTime: 30_000,
              gcTime: 10 * 60_000,
              retry: false
            })
          : await messagingV2.messagePage(
              conversationId,
              options.before ? { createdAt: options.before.created_at, id: options.before.id } : undefined,
              options.anchorMessageId
            );
        const rows = (page?.items || []) as any[];
        loadedMessages = await Promise.all(rows.map(async (row) => ({
          ...row,
          sender: row.sender ? {
            id: row.sender.id,
            full_name: row.sender.fullName || row.sender.full_name,
            avatar_url: row.sender.avatarUrl || row.sender.avatar_url
          } : undefined,
          attachment_rows: (row.attachment_rows || []).map(mapAttachmentRow),
          delivery_status: row.is_read ? 'read' as const : 'sent' as const
        })));
      } catch (rpcError) {
        logWarn('Messaging V2 message page unavailable; using RLS-safe compatibility read', {
          conversationId,
          error: rpcError instanceof Error ? rpcError.message : String(rpcError)
        });

        let query = supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(options.limit || MESSAGE_PAGE_SIZE);
        if (options.before) {
          query = query.lt('created_at', options.before.created_at);
        }
        const { data: fallbackRows, error: fallbackError } = await safe.select(async () => await query);
        if (fallbackError) throw fallbackError;
        const chronologicalRows = [...(fallbackRows || [])].reverse();
        loadedMessages = await mapMessagesWithRelatedData(chronologicalRows);
        const oldest = chronologicalRows[0];
        page = {
          hasMore: chronologicalRows.length === (options.limit || MESSAGE_PAGE_SIZE),
          oldestCursor: oldest ? { createdAt: oldest.created_at, id: oldest.id } : null
        };
      }

      const storedFailedMessages = user
        ? loadStoredFailedMessages(user.id)
            .filter((message) => message.conversation_id === conversationId)
            .map((message) => ({
              ...message,
              message_type: 'text' as const,
              attachments: null,
              attachment_rows: [],
              is_read: false,
              delivery_status: 'failed' as const,
              local_failed: true,
              sender: {
                id: user.id,
                full_name: user.user_metadata?.full_name || undefined,
                avatar_url: user.user_metadata?.avatar_url || undefined
              }
            }))
        : [];

      setMessages((prev) => {
        const current = options.mode === 'replace' || !options.mode ? [] : prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: mergeMessageLists(current, [...loadedMessages, ...storedFailedMessages])
        };
      });

      setMessagePageState((prev) => ({
        ...prev,
        [conversationId]: {
          hasMore: Boolean(page?.hasMore),
          loadingOlder: false,
          loadingInitial: false,
          oldestCursor: page?.oldestCursor
            ? {
                created_at: page.oldestCursor.createdAt,
                id: page.oldestCursor.id
              }
            : prev[conversationId]?.oldestCursor
        }
      }));

      const unreadForActiveConversation = loadedMessages.filter(
        (message) => message.sender_id !== user?.id && !message.is_read
      ).length;

      setUnreadCounts((prev) => ({
        ...prev,
        [conversationId]: unreadForActiveConversation
      }));

      return loadedMessages;
    } catch (error) {
      logError('Error loading messages', error);
      toast.error('Failed to load messages. Please try again.');
      setMessagePageState((prev) => ({
        ...prev,
        [conversationId]: {
          ...(prev[conversationId] || { hasMore: true }),
          loadingOlder: false,
          loadingInitial: false
        }
      }));
      return [];
    }
  }, [mapMessagesWithRelatedData, queryClient, user]);

  const prefetchConversation = useCallback((conversationId: string) => {
    if (!user || !conversationId) return Promise.resolve();
    return queryClient.prefetchQuery({
      queryKey: messagePageQueryKey(user.id, conversationId),
      queryFn: () => messagingV2.messagePage(conversationId),
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: false
    });
  }, [queryClient, user]);

  useEffect(() => {
    if (!user || activeConversationId || conversations.length === 0) return;
    void prefetchConversation(conversations[0].id);
  }, [activeConversationId, conversations, prefetchConversation, user]);

  // Load messages for active conversation and reconcile realtime events by stable IDs.
  useEffect(() => {
    if (!activeConversationId) return;

    void loadMessages(activeConversationId, { mode: 'replace', limit: MESSAGE_PAGE_SIZE });

    const messageSubscription = supabase
      .channel(`messages-${activeConversationId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            setMessages(prev => ({
              ...prev,
              [activeConversationId]: (prev[activeConversationId] || []).filter(
                (msg) => msg.id !== payload.old.id
              )
            }));
            await loadUnreadCounts([activeConversationId]);
            return;
          }

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const [mappedMessage] = await mapMessagesWithRelatedData([payload.new]);
            if (!mappedMessage) return;

            setMessages((prev) => ({
              ...prev,
              [activeConversationId]: mergeMessageLists(prev[activeConversationId] || [], [mappedMessage])
            }));

            if (payload.eventType === 'INSERT' && payload.new.sender_id !== user?.id) {
              const serverCreatedAt = new Date(payload.new.created_at || Date.now()).getTime();
              void messagingV2.performance({
                eventName: 'realtime_received',
                durationMs: Math.max(0, Date.now() - serverCreatedAt),
                conversationId: activeConversationId
              }).catch(() => undefined);
              void trackRetentionEvent('message_reply_received', {
                user_id: user?.id,
                conversation_id: activeConversationId,
                message_id: payload.new.id,
                source: 'messages_realtime',
              });
            }
            if (user?.id) {
              void queryClient.invalidateQueries({
                queryKey: messagePageQueryKey(user.id, activeConversationId),
                refetchType: 'none'
              });
            }
          }

          await loadUnreadCounts([activeConversationId]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          void loadMessages(activeConversationId, { mode: 'replace', limit: MESSAGE_PAGE_SIZE });
        }
      });

    return () => {
      void supabase.removeChannel(messageSubscription);
    };
  }, [activeConversationId, user?.id, loadUnreadCounts, loadMessages, mapMessagesWithRelatedData, queryClient]);

  const startConversation = useCallback(async (participantId: string): Promise<string | null> => {
    if (!user || loading || participantId === user.id) {
      if (participantId === user?.id) toast.error('You cannot start a conversation with yourself.');
      return null;
    }

    setLoading(true);
    try {
      const existing = conversations.find((conversation) =>
        conversation.participants.length === 2 &&
        conversation.participants.includes(participantId) &&
        conversation.participants.includes(user.id)
      );

      if (existing) {
        setActiveConversationId(existing.id);
        return existing.id;
      }

      const { data, error } = await safe.rpc(async () =>
        await supabase.rpc('create_or_get_direct_conversation', {
          p_other_user_id: participantId
        })
      );
      if (error) throw error;

      const conversation = data as Conversation | null;
      if (!conversation?.id) throw new Error('The conversation could not be created.');

      setConversations((previous) => [
        conversation,
        ...previous.filter((item) => item.id !== conversation.id)
      ]);
      setActiveConversationId(conversation.id);
      return conversation.id;
    } catch (error) {
      logError('startConversation: Safe RPC failed', error, { participantId });
      toast.error(getUserMessage(error));
      return null;
    } finally {
      setLoading(false);
    }
  }, [conversations, loading, user]);

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    optionsOrReplyToId?: SendMessageOptions | string
  ): Promise<Message | null> => {
    const trimmedContent = content.trim();
    const options: SendMessageOptions =
      typeof optionsOrReplyToId === 'string'
        ? { replyToId: optionsOrReplyToId }
        : optionsOrReplyToId || {};
    const files = options.files || [];

    if (!user || (!trimmedContent && files.length === 0)) {
      logWarn('sendMessage: Invalid parameters', {
        hasUser: !!user,
        hasContent: !!trimmedContent,
        fileCount: files.length
      });
      return null;
    }

    const invalidFile = files.find((file) =>
      file.size > MAX_MESSAGE_ATTACHMENT_BYTES ||
      !ALLOWED_MESSAGE_ATTACHMENT_TYPES.has(file.type)
    );

    if (invalidFile) {
      toast.error('Attachment must be a supported file type and 10MB or smaller.');
      return null;
    }

    // Use separate sending state so the input stays enabled
    setSending(true);
    const clientMessageId = options.clientMessageId || generateClientMessageId();
    const optimisticId = `temp-${clientMessageId}`;
    const optimisticTimestamp = new Date().toISOString();
    const hadUserMessageBefore = (messagesRef.current[conversationId] || []).some(
      (message) => message.sender_id === user.id && !message.id.startsWith('temp-')
    );
    const existingSender = (messagesRef.current[conversationId] || []).find(
      (message) => message.sender_id === user.id
    )?.sender;
    const optimisticSender = existingSender || {
      id: user.id,
      full_name: user.user_metadata?.full_name || undefined,
      avatar_url: user.user_metadata?.avatar_url || undefined
    };
    const messageType: Message['message_type'] =
      files.length === 0
        ? 'text'
        : files[0].type.startsWith('image/')
          ? 'image'
          : 'file';
    const contentForMessage = trimmedContent || files.map((file) => file.name).join(', ');
    const optimisticAttachments = files.map((file) => ({
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      signed_url: null
    }));

    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: contentForMessage,
      message_type: messageType,
      attachments: null,
      attachment_rows: optimisticAttachments,
      client_message_id: clientMessageId,
      delivery_status: files.length > 0 ? 'pending' : 'pending',
      upload_progress: files.length > 0 ? 10 : undefined,
      is_read: false,
      reply_to_id: options.replyToId,
      created_at: optimisticTimestamp,
      updated_at: optimisticTimestamp,
      sender: optimisticSender
    };

    // Show message immediately in UI before waiting for network/realtime events.
    setMessages(prev => {
      const currentMessages = prev[conversationId] || [];
      return {
        ...prev,
        [conversationId]: mergeMessageLists(currentMessages, [optimisticMessage])
      };
    });

    // Keep active conversation order fresh immediately.
    setConversations(prev => {
      const index = prev.findIndex(conversation => conversation.id === conversationId);
      if (index === -1) return prev;

      const updatedConversation = {
        ...prev[index],
        last_message_at: optimisticTimestamp,
        updated_at: optimisticTimestamp
      };

      const remaining = prev.filter((_, currentIndex) => currentIndex !== index);
      return [updatedConversation, ...remaining];
    });

    const uploadedPaths: string[] = [];
    const pendingAttachments: Array<Record<string, unknown>> = [];

    try {
      logInfo('sendMessage: Sending message', {
        conversationId,
        senderId: user.id,
        contentLength: contentForMessage.length,
        replyToId: options.replyToId,
        clientMessageId,
        fileCount: files.length
      });

      for (const file of files) {
          const storagePath = `${conversationId}/pending/${user.id}/${clientMessageId}/${Date.now()}-${toSafeStorageName(file.name)}`;
          const { error: uploadError } = await supabase.storage
            .from(MESSAGE_ATTACHMENT_BUCKET)
            .upload(storagePath, file, { contentType: file.type, upsert: false });
          if (uploadError) throw uploadError;
          uploadedPaths.push(storagePath);
          pendingAttachments.push({
            storage_path: storagePath,
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size
          });
      }

        const targetConversation = conversations.find((conversation) => conversation.id === conversationId);
        const sendStartedAt = performance.now();
        const result = targetConversation?.is_group
          ? await messagingV2.sendGroup({
              conversationId,
              content: contentForMessage,
              clientMessageId,
              replyToId: options.replyToId,
              attachments: pendingAttachments
            })
          : await messagingV2.send({
              conversationId,
              content: contentForMessage,
              clientMessageId,
              replyToId: options.replyToId,
              attachments: pendingAttachments
            });
        void messagingV2.performance({
          eventName: 'message_sent',
          durationMs: performance.now() - sendStartedAt,
          conversationId,
          metadata: { attachmentCount: files.length, group: Boolean(targetConversation?.is_group) }
        }).catch(() => undefined);
        const data = result?.message || result?.savedMessage || result;
        if (!data?.id) throw new Error('The message could not be saved.');

        const attachmentRows = await Promise.all(
          (result?.attachments || []).map(mapAttachmentRow)
        );
        const persistedMessage: Message = {
          ...data,
          content: data.deleted_at ? 'Message deleted' : data.content,
          attachment_rows: attachmentRows,
          client_message_id: data.client_message_id || clientMessageId,
          delivery_status: 'sent',
          upload_progress: files.length > 0 ? 100 : undefined,
          sender: optimisticSender
        };
        void queryClient.invalidateQueries({
          queryKey: messagePageQueryKey(user.id, conversationId),
          refetchType: 'none'
        });

      // Replace optimistic message with persisted row and prevent duplicates if realtime already inserted it.
      setMessages(prev => {
        const currentMessages = prev[conversationId] || [];
        const withoutOptimistic = currentMessages.filter((message) => message.id !== optimisticId);

        if (withoutOptimistic.some((message) => message.id === persistedMessage.id)) {
          return {
            ...prev,
            [conversationId]: mergeMessageLists(withoutOptimistic, [persistedMessage])
          };
        }

        return {
          ...prev,
          [conversationId]: mergeMessageLists(withoutOptimistic, [persistedMessage])
        };
      });

      const storedFailures = loadStoredFailedMessages(user.id).filter(
        (message) => message.client_message_id !== clientMessageId
      );
      saveStoredFailedMessages(user.id, storedFailures);

      // Keep local ordering/timestamp in sync regardless of realtime latency.
      setConversations(prev => {
        const index = prev.findIndex(conversation => conversation.id === conversationId);
        if (index === -1) return prev;

        const updatedConversation = {
          ...prev[index],
          last_message_at: data.created_at || optimisticTimestamp,
          updated_at: data.updated_at || optimisticTimestamp
        };

        const remaining = prev.filter((_, currentIndex) => currentIndex !== index);
        return [updatedConversation, ...remaining];
      });

      if (!hadUserMessageBefore) {
        try {
          await trackRetentionEvent('first_message_sent', {
            user_id: user.id,
            conversation_id: conversationId,
            source: 'messages',
          });
          await completeActivationJourney({
            user,
            action: 'send_message',
            source: 'messages',
            conversationId,
            actionUrl: `/messages?conversationId=${conversationId}`,
          });
        } catch (trackingError) {
          logWarn('sendMessage: Message sent but retention tracking failed', {
            conversationId,
            error: trackingError instanceof Error ? trackingError.message : String(trackingError)
          });
        }
      }

      return persistedMessage;
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(MESSAGE_ATTACHMENT_BUCKET).remove(uploadedPaths);
      }
      const appError = handleError(error);
      logError('sendMessage: Error sending message', appError, {
        conversationId,
        senderId: user?.id
      });

      // The mentor-DM charge trigger raises INSUFFICIENT_CREDITS when the sender
      // can't afford the 3-credit message; surface that specifically.
      const rawMessage = error instanceof Error ? error.message : String(error ?? '');
      const isCreditBlock = /INSUFFICIENT_CREDITS/i.test(rawMessage) || /Messaging a mentor costs/i.test(rawMessage);
      const errorMessage = isCreditBlock
        ? 'Messaging a mentor costs 3 credits and your balance is too low. Top up to keep the conversation going.'
        : getUserMessage(error);
      const failedMessage: Message = {
        ...optimisticMessage,
        id: optimisticId,
        local_failed: true,
        delivery_status: 'failed',
        error_message: errorMessage,
        upload_progress: undefined,
        updated_at: new Date().toISOString()
      };

      setMessages(prev => ({
        ...prev,
        [conversationId]: mergeMessageLists(prev[conversationId] || [], [failedMessage])
      }));

      if (files.length === 0) {
        const nextFailures = [
          ...loadStoredFailedMessages(user.id).filter(
            (message) => message.client_message_id !== clientMessageId
          ),
          {
            id: optimisticId,
            conversation_id: conversationId,
            sender_id: user.id,
            content: contentForMessage,
            client_message_id: clientMessageId,
            created_at: optimisticTimestamp,
            updated_at: new Date().toISOString(),
            error_message: errorMessage
          }
        ];
        saveStoredFailedMessages(user.id, nextFailures);
      }

      toast.error(errorMessage);
      return failedMessage;
    } finally {
      setSending(false);
    }
  }, [conversations, queryClient, user]);

  const editMessage = useCallback(async (conversationId: string, messageId: string, content: string): Promise<boolean> => {
    const previous = messagesRef.current[conversationId] || [];
    const target = previous.find((message) => message.id === messageId);
    if (!user || !target || target.sender_id !== user.id || target.deleted_at) return false;
    const nextContent = content.trim();
    if (!nextContent || nextContent.length > 5000) return false;
    setMessages((state) => ({
      ...state,
      [conversationId]: (state[conversationId] || []).map((message) =>
        message.id === messageId ? { ...message, content: nextContent, edited_at: new Date().toISOString() } : message
      )
    }));
    try {
      const updated = await messagingV2.edit(messageId, nextContent);
      setMessages((state) => ({
        ...state,
        [conversationId]: (state[conversationId] || []).map((message) =>
          message.id === messageId ? { ...message, ...updated } : message
        )
      }));
      return true;
    } catch (error) {
      setMessages((state) => ({ ...state, [conversationId]: previous }));
      toast.error(error instanceof Error ? error.message : 'The message could not be edited.');
      return false;
    }
  }, [user]);

  const startGroupConversation = useCallback(async (input: { name: string; participantIds: string[]; purpose: string }) => {
    if (!user) return null;
    try {
      const conversation = await messagingV2.createGroup(input);
      if (!conversation?.id) throw new Error('The founder workspace could not be created.');
      const mapped: Conversation = { ...conversation, is_group: true };
      setConversations((previous) => [mapped, ...previous.filter((item) => item.id !== mapped.id)]);
      setActiveConversationId(mapped.id);
      return mapped.id as string;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The founder workspace could not be created.');
      return null;
    }
  }, [user]);

  const retryFailedMessage = useCallback(async (
    conversationId: string,
    clientMessageId: string
  ): Promise<Message | null> => {
    const failedMessage = (messagesRef.current[conversationId] || []).find(
      (message) => message.client_message_id === clientMessageId && message.local_failed
    );

    if (!failedMessage) {
      return null;
    }

    return sendMessage(conversationId, failedMessage.content, { clientMessageId });
  }, [sendMessage]);

  const discardFailedMessage = useCallback((conversationId: string, clientMessageId: string) => {
    if (!user) return;

    setMessages((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).filter(
        (message) => message.client_message_id !== clientMessageId
      )
    }));

    saveStoredFailedMessages(
      user.id,
      loadStoredFailedMessages(user.id).filter(
        (message) => message.client_message_id !== clientMessageId
      )
    );
  }, [user]);

  const applyConversationAction = useCallback(async (
    conversationId: string,
    action: 'pin' | 'unpin' | 'mute' | 'unmute' | 'archive' | 'unarchive' | 'hide',
    mutedUntil?: string
  ): Promise<boolean> => {
    try {
      const settings = await messagingV2.conversationState(conversationId, action, mutedUntil);
      setConversationSettings((previous) => ({ ...previous, [conversationId]: settings }));
      await loadConversationsFromServer();
      return true;
    } catch (error) {
      logError('Conversation action failed', error, { conversationId, action });
      toast.error('The conversation could not be updated.');
      return false;
    }
  }, [loadConversationsFromServer]);

  const setRequestStatus = useCallback(async (
    conversationId: string,
    status: 'accepted' | 'refused'
  ): Promise<boolean> => {
    try {
      const settings = await messagingV2.requestStatus(conversationId, status);
      setConversationSettings((previous) => ({ ...previous, [conversationId]: settings }));
      await loadConversationsFromServer();
      if (status === 'refused' && activeConversationId === conversationId) {
        setActiveConversationId(null);
      }
      toast.success(status === 'accepted' ? 'Message request accepted' : 'Message request refused');
      return true;
    } catch (error) {
      logError('Message request update failed', error, { conversationId, status });
      toast.error('The request could not be updated.');
      return false;
    }
  }, [activeConversationId, loadConversationsFromServer]);

  const acceptMessageRequest = useCallback(
    (conversationId: string) => setRequestStatus(conversationId, 'accepted'),
    [setRequestStatus]
  );

  const refuseMessageRequest = useCallback(
    (conversationId: string) => setRequestStatus(conversationId, 'refused'),
    [setRequestStatus]
  );

  const pinConversation = useCallback(
    (conversationId: string, shouldPin: boolean) =>
      applyConversationAction(conversationId, shouldPin ? 'pin' : 'unpin'),
    [applyConversationAction]
  );

  const muteConversation = useCallback(
    (conversationId: string, shouldMute: boolean, durationMs?: number) =>
      applyConversationAction(
        conversationId,
        shouldMute ? 'mute' : 'unmute',
        shouldMute && durationMs ? new Date(Date.now() + durationMs).toISOString() : undefined
      ),
    [applyConversationAction]
  );

  const archiveConversation = useCallback(
    (conversationId: string, shouldArchive = true) =>
      applyConversationAction(conversationId, shouldArchive ? 'archive' : 'unarchive'),
    [applyConversationAction]
  );

  const deleteMessage = useCallback(async (conversationId: string, messageId: string): Promise<boolean> => {
    if (!user || messageId.startsWith('temp-')) return false;

    const previous = messagesRef.current[conversationId] || [];
    const target = previous.find((message) => message.id === messageId);
    if (!target || target.sender_id !== user.id) {
      toast.error('You can only delete messages you sent.');
      return false;
    }

    const tombstone = {
      ...target,
      content: 'Message deleted',
      attachment_rows: [],
      attachments: null,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id
    };
    setMessages((state) => ({
      ...state,
      [conversationId]: state[conversationId]?.map((message) =>
        message.id === messageId ? tombstone : message
      ) || []
    }));

    try {
      await messagingV2.softDelete(messageId);
      toast.success('Message deleted');
      return true;
    } catch (error) {
      setMessages((state) => ({ ...state, [conversationId]: previous }));
      toast.error(getUserMessage(error));
      return false;
    }
  }, [user]);

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;
    setMessages((state) => ({
      ...state,
      [conversationId]: (state[conversationId] || []).map((message) =>
        message.sender_id !== user.id ? { ...message, is_read: true, delivery_status: 'read' } : message
      )
    }));
    setUnreadCounts((state) => ({ ...state, [conversationId]: 0 }));

    try {
      await messagingV2.markRead(conversationId);
    } catch (error) {
      logError('Error marking conversation read', error, { conversationId });
      await loadUnreadCounts([conversationId]);
    }
  }, [loadUnreadCounts, user]);

  const getUnreadCount = (conversationId: string): number => {
    return unreadCounts[conversationId] || 0;
  };

  // Get total unread messages count across all conversations
  const getTotalUnreadCount = useCallback((): number => {
    return conversations.reduce((total, conversation) => total + (unreadCounts[conversation.id] || 0), 0);
  }, [conversations, unreadCounts]);

  const requestConversations = useMemo(
    () => conversations.filter((conversation) =>
      conversationSettings[conversation.id]?.request_status === 'pending' &&
      !conversationSettings[conversation.id]?.archived_at &&
      !conversationSettings[conversation.id]?.hidden_at
    ),
    [conversations, conversationSettings]
  );

  const mainConversations = useMemo(
    () => conversations.filter((conversation) =>
      conversationSettings[conversation.id]?.request_status !== 'pending' &&
      !conversationSettings[conversation.id]?.archived_at &&
      !conversationSettings[conversation.id]?.hidden_at
    ),
    [conversations, conversationSettings]
  );

  const archivedConversations = useMemo(
    () => conversations.filter((conversation) =>
      Boolean(conversationSettings[conversation.id]?.archived_at) &&
      !conversationSettings[conversation.id]?.hidden_at
    ),
    [conversations, conversationSettings]
  );

  // Get user ID by username
  const getUserIdByUsername = useCallback(async (username: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('public_profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      if (error) {
        logError('getUserIdByUsername: Error fetching profile', error, {
          code: error.code,
          message: error.message,
          username
        });
        return null;
      }

      if (!data) {
        logWarn('getUserIdByUsername: No profile found for username', { username });
        return null;
      }

      return data.id;
    } catch (error) {
      logError('getUserIdByUsername: Exception occurred', error, { username });
      return null;
    }
  }, []);

  // Get username by user ID
  const getUsernameByUserId = useCallback(async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('public_profiles')
        .select('username')
        .eq('id', userId)
        .single();

      if (error) {
        logError('getUsernameByUserId: Error fetching profile', error, {
          code: error.code,
          message: error.message,
          userId
        });
        return null;
      }

      if (!data || !data.username) {
        logWarn('getUsernameByUserId: No username found for user ID', { userId });
        return null;
      }

      return data.username;
    } catch (error) {
      logError('getUsernameByUserId: Exception occurred', error, { userId });
      return null;
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      await messagingV2.conversationState(conversationId, 'hide');
      setConversations((previous) => previous.filter((conversation) => conversation.id !== conversationId));
      setMessages((previous) => {
        const next = { ...previous };
        delete next[conversationId];
        return next;
      });
      setUnreadCounts((previous) => {
        const next = { ...previous };
        delete next[conversationId];
        return next;
      });
      if (activeConversationId === conversationId) setActiveConversationId(null);
      toast.success('Conversation hidden for you');
      return true;
    } catch (error) {
      logError('Error hiding conversation', error, { conversationId });
      toast.error('The conversation could not be hidden.');
      return false;
    }
  }, [activeConversationId, user]);

  const searchMessages = useCallback(async (
    query: string,
    conversationId?: string | null
  ): Promise<MessageSearchResult[]> => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      return [];
    }

    setSearchLoading(true);

    try {
      const { data, error } = await supabase.rpc('search_messages' as any, {
        p_query: trimmedQuery,
        p_conversation_id: conversationId || null,
        p_limit: 20,
        p_offset: 0
      });

      if (error) throw error;

      const results = ((data || []) as any[]).map((result) => ({
        ...result,
        message_type: result.message_type as 'text' | 'image' | 'file',
      })) as MessageSearchResult[];

      setSearchResults(results);
      return results;
    } catch (error) {
      logError('Error searching messages', error);
      toast.error('Message search failed.');
      return [];
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const clearMessageSearch = useCallback(() => {
    setSearchResults([]);
    setSearchLoading(false);
  }, []);

  const reportMessage = useCallback(async (
    messageId: string,
    reason = 'other',
    details?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await (supabase as any)
        .from('message_reports')
        .upsert({
          message_id: messageId,
          reporter_id: user.id,
          reason,
          details: details || null
        }, {
          onConflict: 'message_id,reporter_id'
        });

      if (error) throw error;

      toast.success('Message reported');
      return true;
    } catch (error) {
      logError('Error reporting message', error);
      toast.error('Failed to report message.');
      return false;
    }
  }, [user]);

  const blockUser = useCallback(async (
    blockedUserId: string,
    conversationId?: string
  ): Promise<boolean> => {
    if (!user || blockedUserId === user.id) return false;

    try {
      const { error } = await (supabase as any)
        .from('user_blocks')
        .upsert({
          blocker_id: user.id,
          blocked_id: blockedUserId
        }, {
          onConflict: 'blocker_id,blocked_id'
        });

      if (error) throw error;

      if (conversationId) {
        await archiveConversation(conversationId, true);
      }

      toast.success('User blocked');
      return true;
    } catch (error) {
      logError('Error blocking user', error);
      toast.error('Failed to block user.');
      return false;
    }
  }, [archiveConversation, user]);

  const getAttachmentSignedUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    return createAttachmentSignedUrl(storagePath, { showToast: true });
  }, []);

  // Add reaction to a message
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) {
      logWarn('addReaction: User not authenticated');
      return;
    }

    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji
        });

      if (error) {
        logError('Error adding reaction', error);
        toast.error('Failed to add reaction');
        throw error;
      }

      logInfo('Reaction added successfully', { messageId, emoji });
    } catch (error) {
      logError('Error adding reaction', error);
      toast.error('Failed to add reaction');
    }
  }, [user]);

  // Remove reaction from a message
  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) {
      logWarn('removeReaction: User not authenticated');
      return;
    }

    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (error) {
        logError('Error removing reaction', error);
        toast.error('Failed to remove reaction');
        throw error;
      }

      logInfo('Reaction removed successfully', { messageId, emoji });
    } catch (error) {
      logError('Error removing reaction', error);
      toast.error('Failed to remove reaction');
    }
  }, [user]);

  return {
    conversations,
    mainConversations,
    requestConversations,
    archivedConversations,
    messages,
    messagePageState,
    conversationSettings,
    searchResults,
    searchLoading,
    loading,
    sending,
    activeConversationId,
    setActiveConversationId,
    startConversation,
    startGroupConversation,
    sendMessage,
    editMessage,
    retryFailedMessage,
    discardFailedMessage,
    loadMessages,
    prefetchConversation,
    deleteMessage,
    markAsRead,
    getUnreadCount,
    getTotalUnreadCount,
    deleteConversation,
    acceptMessageRequest,
    refuseMessageRequest,
    pinConversation,
    muteConversation,
    archiveConversation,
    loadArchivedConversations,
    reportMessage,
    blockUser,
    searchMessages,
    clearMessageSearch,
    getAttachmentSignedUrl,
    resolveMentorUserId,
    getUserIdByUsername,
    getUsernameByUserId,
    addReaction,
    removeReaction
  };
};
