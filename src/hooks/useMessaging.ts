import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safe } from '@/integrations/supabase/safe';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logError, logWarn, logInfo } from '@/lib/logger';
import { handleError, getUserMessage } from '@/lib/errors';

export interface Conversation {
  id: string;
  participants: string[];
  is_group: boolean;
  name?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  attachments?: any;
  is_read: boolean;
  reply_to_id?: string;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

// Samuel Starkman's email, user ID, and username constants
export const SAMUEL_STARKMAN_EMAIL = 'sestarkman@gmail.com';
export const SAMUEL_STARKMAN_USER_ID = '22fdf3fa-b444-4949-a2c3-a5acc247b390'; // Known user ID from previous conversation
export const SAMUEL_STARKMAN_USERNAME = 'samuelstarkman'; // Username based on firstname + lastname pattern

// Nic M Rayce's email constant
export const NIC_M_RAYCE_EMAIL = 'nicmrayce@gmail.com';

// Karolina Żurawska's email constant
export const KAROLINA_ZURAWSKA_EMAIL = 'kz.zurawska@gmail.com';

type UseMessagingOptions = {
  autoLoad?: boolean;
  suppressLoadErrors?: boolean;
};

const normalizeIdentity = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const tokenizeIdentity = (value: string): string[] =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= 2);

export const useMessaging = (options: UseMessagingOptions = {}) => {
  const { autoLoad = true, suppressLoadErrors = false } = options;
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
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

  // Get user ID by email using database function with fallback
  const getUserIdByEmail = useCallback(async (email: string): Promise<string | null> => {
    if (!user) {
      logWarn('getUserIdByEmail: User not authenticated');
      return null;
    }

    // Direct lookup for Samuel's email - use known user ID
    if (email.toLowerCase() === SAMUEL_STARKMAN_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Samuel user ID', { userId: SAMUEL_STARKMAN_USER_ID });
      return SAMUEL_STARKMAN_USER_ID;
    }

    // Direct lookup for Nic M Rayce's email
    if (email.toLowerCase() === NIC_M_RAYCE_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Looking up Nic M Rayce user ID', { email });
      // Will use RPC function or profile lookup below
    }

    try {
      logInfo('getUserIdByEmail: Looking up user ID for email', { email });
      
      // Try RPC function first
      const { data, error } = await supabase.rpc('get_user_id_by_email', {
        user_email: email
      });

      if (error) {
        logWarn('getUserIdByEmail: RPC function failed, trying direct query', {
          error: error.message,
          code: error.code,
          email
        });
        
        // Fallback: Try querying profiles table if email is stored there
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .single();
        
        if (!profileError && profileData?.id) {
          logInfo('getUserIdByEmail: Found user ID via profiles table', { email, userId: profileData.id });
          return profileData.id;
        }
        
        return null;
      }

      if (!data) {
        logWarn('getUserIdByEmail: No user found for email', { email });
        return null;
      }

      logInfo('getUserIdByEmail: Found user ID', { email, userId: data });
      return data;
    } catch (error) {
      logError('getUserIdByEmail: Exception occurred', error, {
        email,
        currentUserId: user?.id
      });
      return null;
    }
  }, [user]);

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

      console.log('[UNREAD_SYNC] Reloaded unread counts:', nextUnreadCounts);
      setUnreadCounts(nextUnreadCounts);
    } catch (error) {
      logError('Error loading unread counts', error);
    }
  }, [user]);

  const resolveMentorUserId = useCallback(async (mentor: { name: string; user_id?: string | null }): Promise<string | null> => {
    if (!user) {
      logWarn('resolveMentorUserId: User not authenticated');
      return null;
    }

    if (mentor.user_id && mentor.user_id.trim() !== '') {
      return mentor.user_id;
    }

    const mentorName = mentor.name?.trim();
    if (!mentorName) {
      logWarn('resolveMentorUserId: Missing mentor name');
      return null;
    }

    const mentorTokens = tokenizeIdentity(mentorName);
    if (mentorTokens.length === 0) {
      logWarn('resolveMentorUserId: Could not tokenize mentor name', { mentorName });
      return null;
    }

    const firstToken = mentorTokens[0];
    const lastToken = mentorTokens[mentorTokens.length - 1];
    const searchTokens = Array.from(new Set([firstToken, lastToken].filter(Boolean)));
    const mentorNameNormalized = normalizeIdentity(mentorName);

    try {
      const orClauses = searchTokens.flatMap((token) => [
        `full_name.ilike.%${token}%`,
        `username.ilike.%${token}%`
      ]);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .or(orClauses.join(','))
        .limit(50);

      if (error) {
        logError('resolveMentorUserId: Error querying profiles', error, {
          mentorName,
          searchTokens
        });
        return null;
      }

      if (!data || data.length === 0) {
        logWarn('resolveMentorUserId: No profile candidates found', { mentorName, searchTokens });
        return null;
      }

      const ranked = data
        .map((profile) => {
          const profileFullNameNormalized = normalizeIdentity(profile.full_name || '');
          const profileUsernameNormalized = normalizeIdentity(profile.username || '');
          const combinedNormalized = `${profileFullNameNormalized} ${profileUsernameNormalized}`;

          const exactNameMatch = profileFullNameNormalized === mentorNameNormalized;
          const exactUsernameMatch = profileUsernameNormalized === mentorNameNormalized;
          const hasAllTokens = mentorTokens.every((token) => combinedNormalized.includes(token));
          const hasFirstLast = combinedNormalized.includes(firstToken) && combinedNormalized.includes(lastToken);

          let score = 0;
          if (exactNameMatch) score += 120;
          if (exactUsernameMatch) score += 110;
          if (hasAllTokens) score += 70;
          if (hasFirstLast) score += 45;
          score += mentorTokens.reduce((acc, token) => acc + (combinedNormalized.includes(token) ? 5 : 0), 0);

          return {
            profileId: profile.id,
            score
          };
        })
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score);

      if (ranked.length === 0) {
        logWarn('resolveMentorUserId: No ranked matches found', { mentorName, searchTokens });
        return null;
      }

      if (ranked.length > 1 && ranked[0].score - ranked[1].score < 25) {
        logWarn('resolveMentorUserId: Ambiguous mentor match; refusing auto-link', {
          mentorName,
          topScores: ranked.slice(0, 3).map((candidate) => candidate.score)
        });
        return null;
      }

      logInfo('resolveMentorUserId: Resolved mentor user ID via profile matching', {
        mentorName,
        resolvedUserId: ranked[0].profileId,
        score: ranked[0].score
      });
      return ranked[0].profileId;
    } catch (error) {
      logError('resolveMentorUserId: Exception occurred', error, { mentorName, searchTokens });
      return null;
    }
  }, [user]);

  const loadConversationsFromServer = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await safe.select(async () =>
        await supabase
          .from('conversations')
          .select('*')
          .contains('participants', [user.id])
          .order('last_message_at', { ascending: false, nullsFirst: false })
      );

      if (error) throw error;

      const loadedConversations = (data || []) as Conversation[];
      setConversations(loadedConversations);

      const conversationIds = loadedConversations.map((conversation) => conversation.id);
      await loadUnreadCounts(conversationIds);

      console.log('[CONVERSATION_SYNC] Reloaded conversations from backend:', {
        conversationCount: loadedConversations.length,
        conversationIds
      });
    } catch (error) {
      logError('Error loading conversations', error);
      if (!suppressLoadErrors) {
        toast.error('Failed to load conversations. Please refresh the page.');
      }
    }
  }, [user, loadUnreadCounts, suppressLoadErrors]);

  // Load user's conversations and keep them synced with backend as source of truth
  useEffect(() => {
    if (!user || !autoLoad) return;

    loadConversationsFromServer();

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
          console.log('[CONVERSATION_SYNC] Realtime conversation change received, reloading from backend');
          loadConversationsFromServer();
        }
      )
      .subscribe();

    const messageSyncSubscription = supabase
      .channel(`user-messages-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const payloadConversationId = (payload.new as { conversation_id?: string } | null)?.conversation_id
            ?? (payload.old as { conversation_id?: string } | null)?.conversation_id;

          console.log('[UNREAD_SYNC] Realtime message event received:', {
            eventType: payload.eventType,
            conversationId: payloadConversationId
          });

          if (payloadConversationId && conversationIdsRef.current.has(payloadConversationId)) {
            loadUnreadCounts([payloadConversationId]);
          } else {
            loadConversationsFromServer();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationSubscription);
      supabase.removeChannel(messageSyncSubscription);
    };
  }, [user, autoLoad, loadConversationsFromServer, loadUnreadCounts]);

  useEffect(() => {
    if (user) return;
    setConversations([]);
    setMessages({});
    setUnreadCounts({});
    setActiveConversationId(null);
  }, [user]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversationId) return;

    const abortController = new AbortController();

    const loadMessages = async () => {
      try {
        const { data, error } = await safe.select(async () =>
          await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', activeConversationId)
            .order('created_at', { ascending: true })
        );

        if (error) throw error;
        if (abortController.signal.aborted) return;

        // Get unique sender IDs
        const senderIds = [...new Set((data || []).map(msg => msg.sender_id))];
        
        if (senderIds.length === 0) {
          setMessages(prev => ({
            ...prev,
            [activeConversationId]: []
          }));
          setUnreadCounts(prev => ({
            ...prev,
            [activeConversationId]: 0
          }));
          return;
        }

        // Batch fetch all sender profiles in a single query
        const { data: profilesData, error: profilesError } = await safe.select(async () =>
          await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', senderIds)
        );

        if (profilesError) throw profilesError;
        if (abortController.signal.aborted) return;

        // Create a map of sender ID to profile data
        const profilesMap = new Map(
          (profilesData || []).map(profile => [profile.id, profile])
        );

        // Map messages with sender data
        const messagesWithSenders = (data || []).map((message) => ({
          ...message,
          message_type: message.message_type as 'text' | 'image' | 'file',
          sender: profilesMap.get(message.sender_id) || undefined
        })) as Message[];

        if (!abortController.signal.aborted) {
          setMessages(prev => ({
            ...prev,
            [activeConversationId]: messagesWithSenders
          }));

          const unreadForActiveConversation = messagesWithSenders.filter(
            (message) => message.sender_id !== user?.id && !message.is_read
          ).length;

          setUnreadCounts(prev => ({
            ...prev,
            [activeConversationId]: unreadForActiveConversation
          }));
        }
      } catch (error: any) {
        if (!abortController.signal.aborted) {
          logError('Error loading messages', error);
          toast.error('Failed to load messages. Please try again.');
        }
      }
    };

    loadMessages();

    // Subscribe to messages in this conversation (INSERT and UPDATE events)
    const messageSubscription = supabase
      .channel(`messages-${activeConversationId}`)
      .on('postgres_changes',
        {
          event: '*', // Listen to all events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`
        },
        async (payload) => {
          console.log('[REALTIME] Message event:', payload.eventType, payload);

          if (payload.eventType === 'INSERT') {
            // Handle new message insertion
            const existingMessages = messagesRef.current[activeConversationId] || [];

            // Check if message already exists (prevent duplicates)
            if (existingMessages.some(m => m.id === payload.new.id)) {
              return;
            }

            // Get sender info from existing messages if available
            let senderData = existingMessages.find(m => m.sender_id === payload.new.sender_id)?.sender;

            // If sender not found, fetch it
            if (!senderData) {
              try {
                const { data } = await supabase
                  .from('profiles')
                  .select('id, full_name, avatar_url')
                  .eq('id', payload.new.sender_id)
                  .single();
                senderData = data || undefined;
              } catch (error) {
                logError('Error fetching sender profile', error);
              }
            }

            const newMessage: Message = {
              id: payload.new.id,
              conversation_id: payload.new.conversation_id,
              sender_id: payload.new.sender_id,
              content: payload.new.content,
              message_type: payload.new.message_type as 'text' | 'image' | 'file',
              attachments: payload.new.attachments,
              is_read: payload.new.is_read,
              reply_to_id: payload.new.reply_to_id,
              created_at: payload.new.created_at,
              updated_at: payload.new.updated_at,
              sender: senderData
            };

            // Use functional update to add message
            setMessages(prev => {
              const currentMessages = prev[activeConversationId] || [];
              // Double-check for duplicates (race condition protection)
              if (currentMessages.some(m => m.id === newMessage.id)) {
                return prev;
              }
              return {
                ...prev,
                [activeConversationId]: [...currentMessages, newMessage]
              };
            });
          } else if (payload.eventType === 'UPDATE') {
            // Handle message updates (like is_read status changes)
            const updatedMessage: Message = {
              id: payload.new.id,
              conversation_id: payload.new.conversation_id,
              sender_id: payload.new.sender_id,
              content: payload.new.content,
              message_type: payload.new.message_type as 'text' | 'image' | 'file',
              attachments: payload.new.attachments,
              is_read: payload.new.is_read,
              reply_to_id: payload.new.reply_to_id,
              created_at: payload.new.created_at,
              updated_at: payload.new.updated_at,
              sender: messagesRef.current[activeConversationId]?.find(m => m.id === payload.new.id)?.sender
            };

            // Update the specific message in state
            setMessages(prev => ({
              ...prev,
              [activeConversationId]: (prev[activeConversationId] || []).map(msg =>
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            }));
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => ({
              ...prev,
              [activeConversationId]: (prev[activeConversationId] || []).filter(
                (msg) => msg.id !== payload.old.id
              )
            }));
          }

          loadUnreadCounts([activeConversationId]);
        }
      )
      .subscribe();

    return () => {
      abortController.abort();
      supabase.removeChannel(messageSubscription);
    };
  }, [activeConversationId, user?.id, loadUnreadCounts]);

  const startConversation = useCallback(async (participantId: string): Promise<string | null> => {
    if (!user || loading) {
      logWarn('startConversation: User not authenticated or already loading');
      return null;
    }

    setLoading(true);
    try {
      logInfo('startConversation: Starting conversation', {
        currentUserId: user.id,
        participantId,
        email: user.email
      });

      // First check in-memory state for quick lookup
      const existingInMemory = conversations.find(conv => 
        conv.participants.length === 2 && 
        conv.participants.includes(participantId) && 
        conv.participants.includes(user.id)
      );

      if (existingInMemory) {
        logInfo('startConversation: Found existing conversation in memory', { conversationId: existingInMemory.id });
        setActiveConversationId(existingInMemory.id);
        return existingInMemory.id;
      }

      // Query database to check if conversation already exists
      // Query conversations where current user is a participant, then filter for exact match
      logInfo('startConversation: Checking database for existing conversation');
      const { data: existingConversations, error: queryError } = await safe.select(async () =>
        await supabase
          .from('conversations')
          .select('*')
          .eq('is_group', false)
          .contains('participants', [user.id])
      );

      if (queryError) {
        logError('startConversation: Error querying existing conversations', queryError, {
          code: queryError.code,
          message: queryError.message
        });
        // Continue to create new conversation even if query fails
      } else if (existingConversations && existingConversations.length > 0) {
        // Filter to find exact match (both participants)
        const exactMatch = existingConversations.find(conv => 
          conv.participants.length === 2 &&
          conv.participants.includes(user.id) &&
          conv.participants.includes(participantId)
        );

        if (exactMatch) {
          logInfo('startConversation: Found existing conversation in database', { conversationId: exactMatch.id });
          setConversations(prev => {
            // Add to state if not already there
            if (!prev.find(c => c.id === exactMatch.id)) {
              return [exactMatch, ...prev];
            }
            return prev;
          });
          setActiveConversationId(exactMatch.id);
          return exactMatch.id;
        }
      }

      // Create new conversation
      logInfo('startConversation: Creating new conversation', {
        participants: [user.id, participantId],
        is_group: false
      });

      const { data, error } = await safe.insert(async () =>
        await supabase
          .from('conversations')
          .insert({
            participants: [user.id, participantId],
            is_group: false,
            // Ensure newly created conversations sort to the top immediately.
            last_message_at: new Date().toISOString()
          })
          .select()
          .single()
      );

      if (error) {
        logError('startConversation: Error creating conversation', error, {
          code: error.code,
          message: error.message,
          participants: [user.id, participantId]
        });
        throw error;
      }

      if (!data) {
        logError('startConversation: No data returned from conversation creation', new Error('No data returned'));
        throw new Error('Failed to create conversation: No data returned');
      }

      logInfo('startConversation: Conversation created successfully', {
        conversationId: data.id,
        participants: data.participants
      });

      setConversations(prev => [data, ...prev]);
      setActiveConversationId(data.id);
      return data.id;
    } catch (error) {
      const appError = handleError(error);
      logError('startConversation: Error starting conversation', appError, {
        currentUserId: user?.id,
        participantId
      });
      
      // Provide more specific error messages
      const errorMessage = getUserMessage(error);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, loading, conversations, setActiveConversationId]);

  const sendMessage = useCallback(async (conversationId: string, content: string, replyToId?: string) => {
    const trimmedContent = content.trim();

    if (!user || !trimmedContent) {
      logWarn('sendMessage: Invalid parameters', {
        hasUser: !!user,
        hasContent: !!trimmedContent
      });
      return;
    }

    // Use separate sending state so the input stays enabled
    setSending(true);
    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const optimisticTimestamp = new Date().toISOString();
    const existingSender = (messagesRef.current[conversationId] || []).find(
      (message) => message.sender_id === user.id
    )?.sender;
    const optimisticSender = existingSender || {
      id: user.id,
      full_name: user.user_metadata?.full_name || undefined,
      avatar_url: user.user_metadata?.avatar_url || undefined
    };

    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmedContent,
      message_type: 'text',
      attachments: null,
      is_read: false,
      reply_to_id: replyToId,
      created_at: optimisticTimestamp,
      updated_at: optimisticTimestamp,
      sender: optimisticSender
    };

    // Show message immediately in UI before waiting for network/realtime events.
    setMessages(prev => {
      const currentMessages = prev[conversationId] || [];
      return {
        ...prev,
        [conversationId]: [...currentMessages, optimisticMessage]
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

    try {
      logInfo('sendMessage: Sending message', {
        conversationId,
        senderId: user.id,
        contentLength: trimmedContent.length,
        replyToId
      });

      const { data, error } = await safe.insert(async () =>
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: trimmedContent,
            message_type: 'text',
            reply_to_id: replyToId
          })
          .select()
          .single()
      );

      if (error) {
        logError('sendMessage: Error inserting message', error, {
          code: error.code,
          message: error.message,
          conversationId,
          senderId: user.id
        });
        throw error;
      }

      if (!data) {
        logError('sendMessage: No data returned from message insertion', new Error('No data returned'));
        throw new Error('Failed to send message: No data returned');
      }

      logInfo('sendMessage: Message sent successfully', {
        messageId: data.id,
        conversationId
      });

      const persistedMessage: Message = {
        id: data.id,
        conversation_id: data.conversation_id,
        sender_id: data.sender_id,
        content: data.content,
        message_type: data.message_type as 'text' | 'image' | 'file',
        attachments: data.attachments,
        is_read: data.is_read,
        reply_to_id: data.reply_to_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        sender: optimisticSender
      };

      // Replace optimistic message with persisted row and prevent duplicates if realtime already inserted it.
      setMessages(prev => {
        const currentMessages = prev[conversationId] || [];
        const withoutOptimistic = currentMessages.filter((message) => message.id !== optimisticId);

        if (withoutOptimistic.some((message) => message.id === persistedMessage.id)) {
          return {
            ...prev,
            [conversationId]: withoutOptimistic
          };
        }

        return {
          ...prev,
          [conversationId]: [...withoutOptimistic, persistedMessage]
        };
      });

      // Update conversation's last message timestamp
      const { error: updateError } = await safe.update(async () =>
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId)
      );

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

      if (updateError) {
        logWarn('sendMessage: Failed to update conversation timestamp', {
          error: updateError.message,
          conversationId
        });
        // Don't throw - message was sent successfully
      }

      return data;
    } catch (error) {
      // Remove optimistic message if backend write failed.
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(
          (message) => message.id !== optimisticId
        )
      }));

      const appError = handleError(error);
      logError('sendMessage: Error sending message', appError, {
        conversationId,
        senderId: user?.id
      });
      
      // Provide more specific error messages
      const errorMessage = getUserMessage(error);
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    console.log('[MARK_READ] Marking conversation as read:', {
      conversationId,
      userId: user.id
    });

    try {
      const { data, error } = await safe.update(async () => {
        const result = await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .eq('is_read', false)
          .select('id');
        return result;
      });

      if (error) {
        console.error('[MARK_READ] Error:', error);
        throw error;
      }

      const updatedCount = data?.length || 0;
      console.log('[MARK_READ] Backend write succeeded:', {
        conversationId,
        updatedCount
      });

      // CRITICAL: Update local state immediately (don't wait for real-time subscription)
      // This ensures unread badges clear instantly
      setMessages(prev => {
        const conversationMessages = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: conversationMessages.map(msg =>
            msg.sender_id !== user.id && !msg.is_read
              ? { ...msg, is_read: true }
              : msg
          )
        };
      });

      setUnreadCounts(prev => ({
        ...prev,
        [conversationId]: 0
      }));

      // Force reload from source of truth to prevent stale badge reappearance.
      await loadUnreadCounts([conversationId]);
    } catch (error) {
      console.error('[MARK_READ] Exception:', error);
      logError('Error marking messages as read', error);
    }
  }, [user, loadUnreadCounts]);

  const getUnreadCount = (conversationId: string): number => {
    return unreadCounts[conversationId] || 0;
  };

  // Get total unread messages count across all conversations
  const getTotalUnreadCount = useCallback((): number => {
    return conversations.reduce((total, conversation) => total + (unreadCounts[conversation.id] || 0), 0);
  }, [conversations, unreadCounts]);

  // Get user ID by username
  const getUserIdByUsername = useCallback(async (username: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
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
        .from('profiles')
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
    if (!user) {
      toast.error('You must be logged in to delete conversations');
      return false;
    }

    try {
      // First, verify the user is a participant in this conversation
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation || !conversation.participants.includes(user.id)) {
        toast.error('You do not have permission to delete this conversation');
        return false;
      }

      console.log('[DELETE] Attempting conversation removal:', {
        conversationId,
        userId: user.id,
        participants: conversation.participants
      });

      // Try hard delete first and verify the backend actually deleted rows.
      const { data: deletedRows, error: deleteError } = await safe.delete(async () =>
        await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId)
          .select('id')
      );

      if (deleteError) {
        console.error('[DELETE] Hard delete failed:', deleteError);
        logError('Error deleting conversation', deleteError);
        toast.error('Failed to delete conversation');
        return false;
      }

      const hardDeleteCount = deletedRows?.length || 0;
      let removalMode: 'hard-delete' | 'participant-removal' = 'hard-delete';

      if (hardDeleteCount === 0) {
        // Fallback for environments where DELETE policy is unavailable:
        // remove current user from participants so the thread stays hidden for this user across sessions/devices.
        const updatedParticipants = conversation.participants.filter((participantId) => participantId !== user.id);

        const { data: participantUpdateRows, error: participantUpdateError } = await safe.update(async () =>
          await supabase
            .from('conversations')
            .update({ participants: updatedParticipants })
            .eq('id', conversationId)
            .select('id, participants')
        );

        if (participantUpdateError || !participantUpdateRows || participantUpdateRows.length === 0) {
          console.error('[DELETE] Fallback participant removal failed:', participantUpdateError);
          logError('Error removing participant from conversation during delete fallback', participantUpdateError);
          toast.error('Failed to delete conversation');
          return false;
        }

        removalMode = 'participant-removal';
      }

      console.log('[DELETE] Backend write succeeded:', {
        conversationId,
        hardDeleteCount,
        removalMode
      });

      // Remove from local state only after successful database deletion
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      setMessages(prev => {
        const updated = { ...prev };
        delete updated[conversationId];
        return updated;
      });
      setUnreadCounts(prev => {
        const updated = { ...prev };
        delete updated[conversationId];
        return updated;
      });

      // If this was the active conversation, clear it
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }

      // Always re-sync from source of truth after deletion.
      await loadConversationsFromServer();

      toast.success('Conversation deleted successfully');
      return true;
    } catch (error) {
      console.error('[DELETE] Exception:', error);
      logError('Error deleting conversation', error);
      toast.error('Failed to delete conversation');
      return false;
    }
  }, [user, conversations, activeConversationId, setActiveConversationId, loadConversationsFromServer]);

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
    messages,
    loading,
    sending,
    activeConversationId,
    setActiveConversationId,
    startConversation,
    sendMessage,
    markAsRead,
    getUnreadCount,
    getTotalUnreadCount,
    deleteConversation,
    getUserIdByEmail,
    resolveMentorUserId,
    getUserIdByUsername,
    getUsernameByUserId,
    addReaction,
    removeReaction
  };
};
