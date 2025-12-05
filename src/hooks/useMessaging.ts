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

// Samuel Starkman's email, user ID, and username constants
export const SAMUEL_STARKMAN_EMAIL = 'sestarkman@gmail.com';
export const SAMUEL_STARKMAN_USER_ID = '22fdf3fa-b444-4949-a2c3-a5acc247b390'; // Known user ID from previous conversation
export const SAMUEL_STARKMAN_USERNAME = 'samuelstarkman'; // Username based on firstname + lastname pattern

export const useMessaging = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Get user ID by email using database function with fallback
  const getUserIdByEmail = async (email: string): Promise<string | null> => {
    if (!user) {
      console.warn('getUserIdByEmail: User not authenticated');
      return null;
    }

    // Direct lookup for Samuel's email - use known user ID
    if (email.toLowerCase() === SAMUEL_STARKMAN_EMAIL.toLowerCase()) {
      console.log('getUserIdByEmail: Using known Samuel user ID', SAMUEL_STARKMAN_USER_ID);
      return SAMUEL_STARKMAN_USER_ID;
    }

    try {
      console.log('getUserIdByEmail: Looking up user ID for email', email);
      
      // Try RPC function first
      const { data, error } = await supabase.rpc('get_user_id_by_email', {
        user_email: email
      });

      if (error) {
        console.warn('getUserIdByEmail: RPC function failed, trying direct query:', {
          error,
          code: error.code,
          message: error.message
        });
        
        // Fallback: Try querying profiles table if email is stored there
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .single();
        
        if (!profileError && profileData?.id) {
          console.log('getUserIdByEmail: Found user ID via profiles table', { email, userId: profileData.id });
          return profileData.id;
        }
        
        return null;
      }

      if (!data) {
        console.warn('getUserIdByEmail: No user found for email', email);
        return null;
      }

      console.log('getUserIdByEmail: Found user ID', { email, userId: data });
      return data;
    } catch (error: any) {
      console.error('getUserIdByEmail: Exception occurred:', {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        stack: error?.stack,
        email,
        currentUserId: user?.id
      });
      return null;
    }
  };

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
    if (!user || loading) {
      console.warn('startConversation: User not authenticated or already loading');
      return null;
    }

    setLoading(true);
    try {
      console.log('startConversation: Starting conversation', {
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
        console.log('startConversation: Found existing conversation in memory', existingInMemory.id);
        setActiveConversationId(existingInMemory.id);
        return existingInMemory.id;
      }

      // Query database to check if conversation already exists
      // Query conversations where current user is a participant, then filter for exact match
      console.log('startConversation: Checking database for existing conversation');
      const { data: existingConversations, error: queryError } = await safe.select(async () =>
        await supabase
          .from('conversations')
          .select('*')
          .eq('is_group', false)
          .contains('participants', [user.id])
      );

      if (queryError) {
        console.error('startConversation: Error querying existing conversations:', {
          error: queryError,
          code: queryError.code,
          message: queryError.message,
          details: queryError.details,
          hint: queryError.hint
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
          console.log('startConversation: Found existing conversation in database', exactMatch.id);
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
      console.log('startConversation: Creating new conversation', {
        participants: [user.id, participantId],
        is_group: false
      });

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

      if (error) {
        console.error('startConversation: Error creating conversation:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          participants: [user.id, participantId]
        });
        throw error;
      }

      if (!data) {
        console.error('startConversation: No data returned from conversation creation');
        throw new Error('Failed to create conversation: No data returned');
      }

      console.log('startConversation: Conversation created successfully', {
        conversationId: data.id,
        participants: data.participants
      });

      setConversations(prev => [data, ...prev]);
      setActiveConversationId(data.id);
      return data.id;
    } catch (error: any) {
      console.error('startConversation: Error starting conversation:', {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint,
        stack: error?.stack,
        currentUserId: user?.id,
        participantId
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to start conversation';
      if (error?.code === '42501' || error?.message?.includes('permission denied') || error?.message?.includes('row-level security')) {
        errorMessage = 'Permission denied. You may not have access to create conversations.';
      } else if (error?.message) {
        errorMessage = `Failed to start conversation: ${error.message}`;
      }
      
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (conversationId: string, content: string, replyToId?: string) => {
    if (!user || loading || !content.trim()) {
      console.warn('sendMessage: Invalid parameters', {
        hasUser: !!user,
        loading,
        hasContent: !!content.trim()
      });
      return;
    }

    setLoading(true);
    try {
      console.log('sendMessage: Sending message', {
        conversationId,
        senderId: user.id,
        contentLength: content.trim().length,
        replyToId
      });

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

      if (error) {
        console.error('sendMessage: Error inserting message:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          conversationId,
          senderId: user.id
        });
        throw error;
      }

      if (!data) {
        console.error('sendMessage: No data returned from message insertion');
        throw new Error('Failed to send message: No data returned');
      }

      console.log('sendMessage: Message sent successfully', {
        messageId: data.id,
        conversationId
      });

      // Update conversation's last message timestamp
      const { error: updateError } = await safe.update(async () =>
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId)
      );

      if (updateError) {
        console.warn('sendMessage: Failed to update conversation timestamp:', {
          error: updateError,
          conversationId
        });
        // Don't throw - message was sent successfully
      }

      return data;
    } catch (error: any) {
      console.error('sendMessage: Error sending message:', {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint,
        stack: error?.stack,
        conversationId,
        senderId: user?.id
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send message';
      if (error?.code === '42501' || error?.message?.includes('permission denied') || error?.message?.includes('row-level security')) {
        errorMessage = 'Permission denied. You may not have access to send messages in this conversation.';
      } else if (error?.message) {
        errorMessage = `Failed to send message: ${error.message}`;
      }
      
      toast.error(errorMessage);
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

  // Get user ID by username
  const getUserIdByUsername = async (username: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      if (error) {
        console.error('getUserIdByUsername: Error fetching profile:', {
          error,
          code: error.code,
          message: error.message,
          username
        });
        return null;
      }

      if (!data) {
        console.warn('getUserIdByUsername: No profile found for username', username);
        return null;
      }

      return data.id;
    } catch (error: any) {
      console.error('getUserIdByUsername: Exception occurred:', {
        error,
        errorMessage: error?.message,
        username
      });
      return null;
    }
  };

  // Get username by user ID
  const getUsernameByUserId = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('getUsernameByUserId: Error fetching profile:', {
          error,
          code: error.code,
          message: error.message,
          userId
        });
        return null;
      }

      if (!data || !data.username) {
        console.warn('getUsernameByUserId: No username found for user ID', userId);
        return null;
      }

      return data.username;
    } catch (error: any) {
      console.error('getUsernameByUserId: Exception occurred:', {
        error,
        errorMessage: error?.message,
        userId
      });
      return null;
    }
  };

  const deleteConversation = async (conversationId: string) => {
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

      // Delete all messages in the conversation first (due to foreign key constraints)
      const { error: messagesError } = await safe.delete(async () =>
        await supabase
          .from('messages')
          .delete()
          .eq('conversation_id', conversationId)
      );

      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        toast.error('Failed to delete messages');
        return false;
      }

      // Delete the conversation
      const { error: conversationError } = await safe.delete(async () =>
        await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId)
      );

      if (conversationError) {
        console.error('Error deleting conversation:', conversationError);
        toast.error('Failed to delete conversation');
        return false;
      }

      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      setMessages(prev => {
        const updated = { ...prev };
        delete updated[conversationId];
        return updated;
      });

      // If this was the active conversation, clear it
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }

      toast.success('Conversation deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
      return false;
    }
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
    getUnreadCount,
    deleteConversation,
    getUserIdByEmail,
    getUserIdByUsername,
    getUsernameByUserId
  };
};