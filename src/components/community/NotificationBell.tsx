import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCommunityNotifications, type CommunityNotification } from '@/hooks/useCommunityNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { trackActivity } from '@/lib/activity';

export const NotificationBell = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useCommunityNotifications(user?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null);
  const [, startNotificationNavigation] = useTransition();

  useEffect(() => {
    setPendingNotificationId(null);
  }, [location.hash, location.pathname, location.search]);

  // Filter out message notifications - they're handled separately in the messages icon
  const systemNotifications = notifications.filter(n => n.notification_type !== 'message');

  const handleNotificationClick = async (notification: CommunityNotification) => {
    if (pendingNotificationId) return;
    setPendingNotificationId(notification.id);
    try {
      await markAsRead(notification.id);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
      setPendingNotificationId(null);
      return;
    }
    const actorProfilePath = notification.actor?.username
      ? `/profile/${notification.actor.username}`
      : null;
    const metadataRoute = typeof notification.metadata?.route === 'string'
      ? notification.metadata.route
      : null;

    const navigateTo = (route: string) => {
      startNotificationNavigation(() => {
        navigate(route);
      });
      window.setTimeout(() => {
        setPendingNotificationId(null);
      }, 1200);
    };

    // Navigate to messages if it's a message notification - go directly to /messages
    if (notification.notification_type === 'message') {
      navigateTo('/messages');
      return;
    }

    // Navigate to co-founders page if it's a post_published notification
    if (notification.notification_type === 'post_published') {
      navigateTo('/community/co-founders');
      return;
    }

    if (notification.notification_type === 'mentor_banner_created') {
      navigateTo('/community');
      return;
    }

    if (notification.notification_type === 'angel_banner_created') {
      navigateTo('/community/angels');
      return;
    }

    if (notification.notification_type === 'cofounder_post_created') {
      navigateTo('/community/co-founders');
      return;
    }

    if (notification.notification_type === 'newspaper_article_published') {
      navigateTo('/newspaper');
      return;
    }

    if (notification.notification_type === 'platform_update') {
      const notificationSlug = typeof notification.metadata?.slug === 'string'
        ? notification.metadata.slug
        : '';

      if (notificationSlug.startsWith('mentor-demand-')) {
        void trackActivity(
          'mentor_notification_clicked',
          {
            slug: notificationSlug,
            route: metadataRoute || '/community',
          },
          user?.id,
        );
      }

      navigateTo(metadataRoute || '/insighta');
      return;
    }

    if (notification.notification_type === 'credit_purchase_completed') {
      navigateTo(metadataRoute || '/pricing#credit-packs');
      return;
    }

    // Navigate to profile for follow requests
    if (notification.notification_type === 'follow_request') {
      navigateTo(actorProfilePath || '/community');
      return;
    }

    // Navigate to profile pictures tab for new picture notifications
    if (notification.notification_type === 'follower_new_picture') {
      navigateTo(actorProfilePath || '/community');
      return;
    }

    // Navigate to profile for new reel notifications
    if (notification.notification_type === 'follower_new_reel') {
      navigateTo(actorProfilePath || '/community');
      return;
    }

    // Navigate to profile startup tab for startup updates
    if (notification.notification_type === 'follower_startup_update') {
      navigateTo(actorProfilePath || '/community');
      return;
    }

    if (notification.notification_type === 'task_deadline_expired') {
      navigateTo(metadataRoute || '/dashboard/tasks');
      return;
    }

    // Navigate to the post for community notifications
    if (notification.post_id) {
      navigateTo(`/community?post=${notification.post_id}`);
      return;
    }

    setPendingNotificationId(null);
  };

  const getNotificationText = (notification: CommunityNotification) => {
    const { notification_type, actor, metadata } = notification;

    switch (notification_type) {
      case 'message':
        return `${actor.name} sent you a message`;
      case 'comment':
        return `${actor.name} commented on your post`;
      case 'like':
        return `${actor.name} liked your post`;
      case 'repost':
        return `${actor.name} reposted your post`;
      case 'share':
        return `${actor.name} shared your post`;
      case 'post_published':
        return metadata?.message || 'Your co-founder post is now live!';
      case 'mentor_banner_created':
        return metadata?.mentor_name
          ? `New consultant joins our network: ${metadata.mentor_name}`
          : 'A new consultant joined our network';
      case 'angel_banner_created':
        return metadata?.name
          ? `New investor joins our network: ${metadata.name}`
          : 'A new investor joined our network';
      case 'cofounder_post_created':
        return metadata?.project_name
          ? `${actor.name} posted: ${metadata.project_name}`
          : `${actor.name} created a new co-founder post`;
      case 'newspaper_article_published':
        return metadata?.title
          ? `Newspaper update: ${metadata.title}`
          : 'A new newspaper article was published';
      case 'follow_request':
        return `${actor.name} sent you a follow request`;
      case 'follower_new_picture':
        return `${actor.name} posted a new picture`;
      case 'follower_new_reel':
        return `${actor.name} shared a reel`;
      case 'follower_startup_update':
        return `${actor.name} posted a startup update`;
      case 'task_deadline_expired':
        if (typeof metadata?.message === 'string') {
          return metadata.message;
        }
        return metadata?.task_text
          ? `Task overdue: ${metadata.task_text}`
          : 'A task is overdue';
      case 'platform_update':
        return metadata?.message || metadata?.title || 'There is a new platform update';
      case 'credit_purchase_completed':
        return metadata?.message || (metadata?.creditsAdded
          ? `${metadata.creditsAdded} credits were added to your balance`
          : 'Your purchased credits were added to your balance');
      default:
        return `${actor.name} interacted with your post`;
    }
  };

  const getNotificationImage = (notification: CommunityNotification) => {
    const metadata = notification?.metadata || {};

    if (notification.notification_type === 'mentor_banner_created') {
      return metadata.image_url || metadata.picture || notification.actor.avatar;
    }

    if (notification.notification_type === 'angel_banner_created') {
      return metadata.image_url || metadata.picture || notification.actor.avatar;
    }

    if (notification.notification_type === 'newspaper_article_published') {
      return metadata.image_url || metadata.banner_image_url || notification.actor.avatar;
    }

    if (notification.notification_type === 'platform_update') {
      return metadata.image_url || notification.actor.avatar;
    }

    return notification.actor.avatar;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative nav-action-button h-10 w-10">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn("nav-dropdown-surface z-50 w-80")}>
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {systemNotifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            systemNotifications.map((notification) => {
              const isPending = pendingNotificationId === notification.id;

              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  aria-disabled={Boolean(pendingNotificationId)}
                  className={`cursor-pointer flex items-start gap-3 p-3 ${
                    !notification.read ? 'bg-primary/5' : ''
                  } ${pendingNotificationId ? 'pointer-events-none opacity-70' : ''}`}
                >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage
                    src={getNotificationImage(notification)}
                    alt={notification.actor.name}
                  />
                  <AvatarFallback>
                    {(notification.actor.name || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{getNotificationText(notification)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isPending ? 'Opening...' : formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                )}
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
