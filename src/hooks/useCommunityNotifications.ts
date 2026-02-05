import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CommunityNotification {
  id: string;
  notification_type: string;
  post_id: string | null;
  comment_id: string | null;
  conversation_id: string | null;
  message_id: string | null;
  read: boolean;
  created_at: string;
  actor_id?: string;
  actor: {
    name: string;
    avatar: string;
    username?: string;
  };
  metadata: any;
}

interface NotificationRow {
  id: string;
  notification_type: string;
  post_id: string | null;
  comment_id: string | null;
  conversation_id?: string | null;
  message_id?: string | null;
  read: boolean;
  created_at: string;
  actor_id: string;
  metadata: any;
}

export const useCommunityNotifications = (userId: string | undefined) => {
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('community_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch actor information for each notification
      const notificationsWithActors = await Promise.all(
        ((data || []) as NotificationRow[]).map(async (notification) => {
          const { data: actorData } = await supabase.rpc('get_notification_actor_info', {
            actor_user_id: notification.actor_id
          });

          return {
            id: notification.id,
            notification_type: notification.notification_type,
            post_id: notification.post_id,
            comment_id: notification.comment_id,
            conversation_id: notification.conversation_id || null,
            message_id: notification.message_id || null,
            read: notification.read,
            created_at: notification.created_at,
            actor_id: notification.actor_id,
            actor: {
              name: actorData?.[0]?.actor_name || 'Someone',
              avatar: actorData?.[0]?.actor_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Anonymous`,
              username: actorData?.[0]?.actor_username
            },
            metadata: notification.metadata || {}
          };
        })
      );

      setNotifications(notificationsWithActors);
      // Exclude message notifications from unread count - they're handled separately in the messages icon
      setUnreadCount(notificationsWithActors.filter(n => !n.read && n.notification_type !== 'message').length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('community_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => {
        const updated = prev.map(n => n.id === notificationId ? { ...n, read: true } : n);
        // Recalculate unread count excluding message notifications
        const newUnreadCount = updated.filter(n => !n.read && n.notification_type !== 'message').length;
        setUnreadCount(newUnreadCount);
        return updated;
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('community_notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      // Only mark system notifications as read, message notifications remain separate
      // Recalculate unread count excluding message notifications (should be 0 after marking all system notifications as read)
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!userId) return;

    // Set up realtime subscription
    const channel = supabase
      .channel('community-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_notifications',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchNotifications();
        toast.info('You have a new notification');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
};
