import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safe } from '@/integrations/supabase/safe';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

export const useMessaging = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Load user's conversations
  useEffect(() => {
    if (!user) return;

    const loadConversations = async () => {
      try {
        const { data, error } = await safe.select(async () =>
          await supabase
            .from('conversations')
            .select('*')
            .contains('participants', [user.id])
            .order('last_message_at', { ascending: false, nullsFirst: false })
        );

        if (error) throw error;
        setConversations(data || []);
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    };

    loadConversations();

    // Subscribe to conversation changes
    const conversationSubscription = supabase
      .channel('user-conversations')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'conversations',
          filter: `participants.cs.{${user.id}}`
        }, 
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationSubscription);
    };
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
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Error loading messages:', error);
        }
      }
    };

    loadMessages();

    // Subscribe to new messages in this conversation
    const messageSubscription = supabase
      .channel(`messages-${activeConversationId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`
        },
        async (payload) => {
          // Get sender info for the new message (cached if already loaded)
          const existingMessages = messages[activeConversationId] || [];
          const existingSender = existingMessages.find(m => m.sender_id === payload.new.sender_id)?.sender;
          
          let senderData = existingSender;
          if (!senderData) {
            const { data } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', payload.new.sender_id)
              .single();
            senderData = data || undefined;
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

          setMessages(prev => ({
            ...prev,
            [activeConversationId]: [...(prev[activeConversationId] || []), newMessage]
          }));
        }
      )
      .subscribe();

    return () => {
      abortController.abort();
      supabase.removeChannel(messageSubscription);
    };
  }, [activeConversationId, messages]);

  const startConversation = async (participantId: string): Promise<string | null> => {
    if (!user || loading) return null;

    setLoading(true);
    try {
      // Check if conversation already exists
      const existingConversation = conversations.find(conv => 
        conv.participants.length === 2 && 
        conv.participants.includes(participantId) && 
        conv.participants.includes(user.id)
      );

      if (existingConversation) {
        setActiveConversationId(existingConversation.id);
        return existingConversation.id;
      }

      // Create new conversation
      const { data, error } = await safe.insert(async () =>
        await supabase
          .from('conversations')
          .insert({
            participants: [user.id, participantId],
            is_group: false
          })
          .select()
          .single()
      );

      if (error) throw error;

      setConversations(prev => [data, ...prev]);
      setActiveConversationId(data.id);
      return data.id;
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (conversationId: string, content: string, replyToId?: string) => {
    if (!user || loading || !content.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await safe.insert(async () =>
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: content.trim(),
            message_type: 'text',
            reply_to_id: replyToId
          })
          .select()
          .single()
      );

      if (error) throw error;

      // Update conversation's last message timestamp
      await safe.update(async () =>
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId)
      );

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await safe.update(async () =>
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .eq('is_read', false)
      );

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const getUnreadCount = (conversationId: string): number => {
    const conversationMessages = messages[conversationId] || [];
    return conversationMessages.filter(msg => 
      msg.sender_id !== user?.id && !msg.is_read
    ).length;
  };

  return {
    conversations,
    messages,
    loading,
    activeConversationId,
    setActiveConversationId,
    startConversation,
    sendMessage,
    markAsRead,
    getUnreadCount
  };
};