import { useState, useEffect, useCallback } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
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

type NotificationDedupeCandidate = Pick<NotificationRow, 'notification_type' | 'created_at' | 'metadata'>;

const getMetadata = (notification: NotificationDedupeCandidate): Record<string, unknown> => (
  notification.metadata && typeof notification.metadata === 'object'
    ? notification.metadata as Record<string, unknown>
    : {}
);

const getNotificationDay = (createdAt: string) => {
  const parsed = new Date(createdAt);
  return Number.isNaN(parsed.getTime())
    ? createdAt.slice(0, 10)
    : parsed.toISOString().slice(0, 10);
};

const getDedupeValue = (value: unknown) => (
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

const getNotificationDedupeKey = (notification: NotificationDedupeCandidate): string | null => {
  const day = getNotificationDay(notification.created_at);
  const metadata = getMetadata(notification);

  if (notification.notification_type === 'task_deadline_expired') {
    return `task_deadline_expired:${day}`;
  }

  if (notification.notification_type === 'platform_update') {
    const slug = getDedupeValue(metadata.slug);
    if (slug) return `platform_update:${slug}:${day}`;

    const title = getDedupeValue(metadata.title);
    const message = getDedupeValue(metadata.message);
    const route = getDedupeValue(metadata.route);
    const fallback = [title, message, route].filter(Boolean).join('|');

    return fallback ? `platform_update:${fallback}:${day}` : null;
  }

  return null;
};

const collapseDuplicateNotifications = (items: CommunityNotification[]): CommunityNotification[] => {
  const seen = new Set<string>();
  const collapsed: CommunityNotification[] = [];

  for (const item of items) {
    const key = getNotificationDedupeKey(item);

    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }

    collapsed.push(item);
  }

  return collapsed;
};

type ActorInfo = { actor_name: string; actor_avatar: string | null; actor_username: string | null } | null;

// The 50 latest notifications usually come from a handful of people, and each
// new notification refetches the list, so look each person up once and keep
// the answer for ten minutes instead of calling the RPC once per row.
const fetchActor = (queryClient: QueryClient, actorId: string) => queryClient.fetchQuery({
  queryKey: ['notification-actor', actorId],
  staleTime: 10 * 60 * 1000,
  queryFn: async (): Promise<ActorInfo> => {
    const { data } = await supabase.rpc('get_notification_actor_info', { actor_user_id: actorId });
    return (data?.[0] as ActorInfo) ?? null;
  },
}).catch((): ActorInfo => null);

const shouldShowRealtimeToast = (notification: NotificationRow) => {
  const key = getNotificationDedupeKey(notification);
  if (!key) return true;

  const storageKey = `ct-notification-toast:${key}`;

  try {
    if (window.localStorage.getItem(storageKey)) {
      return false;
    }

    window.localStorage.setItem(storageKey, new Date().toISOString());
  } catch {
    return true;
  }

  return true;
};

const getRealtimeToastMessage = (notification: NotificationRow) => {
  const metadata = getMetadata(notification);

  if (typeof metadata.message === 'string' && metadata.message.trim()) {
    return metadata.message;
  }

  if (typeof metadata.title === 'string' && metadata.title.trim()) {
    return metadata.title;
  }

  return notification.notification_type === 'platform_update'
    ? 'There is a new platform update'
    : 'You have a new notification';
};

export const useCommunityNotifications = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('community_notifications')
        .select('id, notification_type, post_id, comment_id, conversation_id, message_id, read, created_at, actor_id, metadata')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const rows = (data || []) as NotificationRow[];
      const actorIds = [...new Set(rows.map((row) => row.actor_id).filter(Boolean))];
      const actors = new Map(await Promise.all(actorIds.map(async (id) => [id, await fetchActor(queryClient, id)] as const)));
      const notificationsWithActors = rows.map((notification) => {
        const actor = notification.actor_id ? actors.get(notification.actor_id) : null;

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
            name: actor?.actor_name || 'Someone',
            avatar: actor?.actor_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Anonymous`,
            username: actor?.actor_username ?? undefined
          },
          metadata: notification.metadata || {}
        };
      });

      const visibleNotifications = collapseDuplicateNotifications(notificationsWithActors).slice(0, 20);
      setNotifications(visibleNotifications);
      // Exclude message notifications from unread count - they're handled separately in the messages icon
      setUnreadCount(visibleNotifications.filter(n => !n.read && n.notification_type !== 'message').length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [queryClient, userId]);

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
    void fetchNotifications();

    if (!userId) return;

    // Set up realtime subscription
    const channel = supabase
      .channel('community-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        void fetchNotifications();
        const nextNotification = payload.new as NotificationRow;
        if (shouldShowRealtimeToast(nextNotification)) {
          toast.info(getRealtimeToastMessage(nextNotification));
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchNotifications, userId]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
};
