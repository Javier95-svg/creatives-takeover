import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logError } from '@/lib/logger';

export interface CollaborationMessage {
  id: string;
  session_id: string;
  user_id: string;
  message_type: 'text' | 'image' | 'file' | 'voice' | 'system';
  content: string;
  metadata?: any;
  reply_to_id?: string;
  edited_at?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface UserStatus {
  id: string;
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  custom_status?: string;
  status_emoji?: string;
  activity_type?: 'working' | 'meeting' | 'break' | 'focus';
  last_activity_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface CollaborationNotification {
  id: string;
  user_id: string;
  session_id?: string;
  notification_type: 'user_joined' | 'user_left' | 'message' | 'comment' | 'edit' | 'call_started' | 'call_ended';
  title: string;
  message: string;
  data?: any;
  read_at?: string;
  created_at: string;
}

export interface CollaborationActivity {
  id: string;
  session_id: string;
  user_id: string;
  activity_type: 'joined' | 'left' | 'message' | 'comment' | 'edit' | 'call_started' | 'call_ended' | 'screen_share_started' | 'screen_share_ended';
  activity_data?: any;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface CollaborationCall {
  id: string;
  session_id: string;
  initiated_by: string;
  call_type: 'voice' | 'video' | 'screen_share';
  status: 'active' | 'ended';
  participants: string[];
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  metadata?: any;
}

export const useEnhancedCollaboration = (sessionId: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [notifications, setNotifications] = useState<CollaborationNotification[]>([]);
  const [activities, setActivities] = useState<CollaborationActivity[]>([]);
  const [activeCall, setActiveCall] = useState<CollaborationCall | null>(null);
  const [loading, setLoading] = useState(true);
  const realtimeChannelsRef = useRef<RealtimeChannel[]>([]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;

    const { data, error } = await supabase
      .from('collaboration_messages')
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as any);
    }
  }, [sessionId]);

  // Fetch user statuses
  const fetchUserStatuses = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_status')
      .select(`
        *,
        profiles(full_name, avatar_url)
      `);

    if (!error && data) {
      setUserStatuses(data as any);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('collaboration_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as any);
    }
  }, [user]);

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    if (!sessionId) return;

    const { data, error } = await supabase
      .from('collaboration_activity')
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setActivities(data as any);
    }
  }, [sessionId]);

  // Fetch active call
  const fetchActiveCall = useCallback(async () => {
    if (!sessionId) return;

    const { data, error } = await supabase
      .from('collaboration_calls')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single();

    if (!error && data) {
      setActiveCall(data as any);
    }
  }, [sessionId]);

  // Send message
  const sendMessage = useCallback(async (content: string, messageType: CollaborationMessage['message_type'] = 'text', metadata?: any, replyToId?: string) => {
    if (!user || !sessionId) return;

    const { error } = await supabase
      .from('collaboration_messages')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        message_type: messageType,
        content,
        metadata,
        reply_to_id: replyToId,
      });

    if (error) {
      logError('Error sending message', error);
    }

    // Log activity
    await logActivity('message', { content: content.substring(0, 100) });
  }, [user, sessionId]);

  // Update user status
  const updateUserStatus = useCallback(async (status: UserStatus['status'], customStatus?: string, statusEmoji?: string, activityType?: UserStatus['activity_type']) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_status')
      .upsert({
        user_id: user.id,
        status,
        custom_status: customStatus,
        status_emoji: statusEmoji,
        activity_type: activityType,
        last_activity_at: new Date().toISOString(),
      });

    if (error) {
      logError('Error updating user status', error);
    }
  }, [user]);

  // Mark notification as read
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from('collaboration_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      logError('Error marking notification as read', error);
    }
  }, []);

  // Log activity
  const logActivity = useCallback(async (activityType: CollaborationActivity['activity_type'], activityData?: any) => {
    if (!user || !sessionId) return;

    const { error } = await supabase
      .from('collaboration_activity')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        activity_type: activityType,
        activity_data: activityData,
      });

    if (error) {
      logError('Error logging activity', error);
    }
  }, [user, sessionId]);

  // Start call
  const startCall = useCallback(async (callType: CollaborationCall['call_type']) => {
    if (!user || !sessionId) return;

    const { data, error } = await supabase
      .from('collaboration_calls')
      .insert({
        session_id: sessionId,
        initiated_by: user.id,
        call_type: callType,
        participants: [user.id],
      })
      .select()
      .single();

    if (error) {
      logError('Error starting call', error);
      return;
    }

    setActiveCall(data as any);
    await logActivity('call_started', { call_type: callType });
  }, [user, sessionId]);

  // End call
  const endCall = useCallback(async (callId: string) => {
    if (!user) return;

    const startTime = activeCall?.started_at;
    const endTime = new Date().toISOString();
    const durationSeconds = startTime ? Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000) : 0;

    const { error } = await supabase
      .from('collaboration_calls')
      .update({
        status: 'ended',
        ended_at: endTime,
        duration_seconds: durationSeconds,
      })
      .eq('id', callId);

    if (error) {
      logError('Error ending call', error);
      return;
    }

    setActiveCall(null);
    await logActivity('call_ended', { duration_seconds: durationSeconds });
  }, [user, activeCall]);

  // Set up real-time subscriptions
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!sessionId) return;

    const channels: RealtimeChannel[] = [];

    // Messages channel
    const messagesChannel = supabase
      .channel(`messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    channels.push(messagesChannel);

    // User status channel
    const statusChannel = supabase
      .channel('user_status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status',
        },
        () => {
          fetchUserStatuses();
        }
      )
      .subscribe();

    channels.push(statusChannel);

    // Notifications channel
    if (user) {
      const notificationsChannel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'collaboration_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      channels.push(notificationsChannel);
    }

    // Activity channel
    const activityChannel = supabase
      .channel(`activity:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_activity',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    channels.push(activityChannel);

    // Calls channel
    const callsChannel = supabase
      .channel(`calls:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_calls',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchActiveCall();
        }
      )
      .subscribe();

    channels.push(callsChannel);

    // Clean up old channels before setting new ones
    realtimeChannelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    realtimeChannelsRef.current = channels;
  }, [sessionId, user, fetchMessages, fetchUserStatuses, fetchNotifications, fetchActivities, fetchActiveCall]);

  // Initialize
  useEffect(() => {
    if (!sessionId || !user) return;

    const abortController = new AbortController();
    const signal = abortController.signal;

    const initializeData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchMessages(),
          fetchUserStatuses(),
          fetchNotifications(),
          fetchActivities(),
          fetchActiveCall(),
        ]);
        if (!signal.aborted) {
          setLoading(false);
        }
      } catch (error) {
        if (!signal.aborted) {
          logError('Error initializing collaboration', error);
          setLoading(false);
        }
      }
    };

    initializeData();
    setupRealtimeSubscriptions();

    // Update user status to online
    updateUserStatus('online');

    return () => {
      abortController.abort();
      // Clean up channels from ref
      realtimeChannelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      realtimeChannelsRef.current = [];
    };
  }, [sessionId, user, fetchMessages, fetchUserStatuses, fetchNotifications, fetchActivities, fetchActiveCall, setupRealtimeSubscriptions, updateUserStatus]);

  // Update activity on user interaction
  useEffect(() => {
    const updateActivity = () => {
      updateUserStatus('online');
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keypress', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keypress', updateActivity);
    };
  }, [updateUserStatus]);

  return {
    messages,
    userStatuses,
    notifications,
    activities,
    activeCall,
    loading,
    sendMessage,
    updateUserStatus,
    markNotificationAsRead,
    logActivity,
    startCall,
    endCall,
  };
};