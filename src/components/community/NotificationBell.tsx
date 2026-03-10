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
import { useNavigate } from 'react-router-dom';

export const NotificationBell = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useCommunityNotifications(user?.id);
  const navigate = useNavigate();

  // Filter out message notifications - they're handled separately in the messages icon
  const systemNotifications = notifications.filter(n => n.notification_type !== 'message');

  const handleNotificationClick = async (notification: CommunityNotification) => {
    await markAsRead(notification.id);
    const actorProfilePath = notification.actor?.username
      ? `/profile/${notification.actor.username}`
      : null;

    // Navigate to messages if it's a message notification - go directly to /messages
    if (notification.notification_type === 'message') {
      navigate('/messages');
      return;
    }

    // Navigate to co-founders page if it's a post_published notification
    if (notification.notification_type === 'post_published') {
      navigate('/community/co-founders');
      return;
    }

    if (notification.notification_type === 'mentor_banner_created') {
      navigate('/community');
      return;
    }

    if (notification.notification_type === 'angel_banner_created') {
      navigate('/community/angels');
      return;
    }

    if (notification.notification_type === 'cofounder_post_created') {
      navigate('/community/co-founders');
      return;
    }

    if (notification.notification_type === 'newspaper_article_published') {
      navigate('/newspaper');
      return;
    }

    // Navigate to profile for follow requests
    if (notification.notification_type === 'follow_request') {
      navigate(actorProfilePath || '/community');
      return;
    }

    // Navigate to profile pictures tab for new picture notifications
    if (notification.notification_type === 'follower_new_picture') {
      navigate(actorProfilePath || '/community');
      return;
    }

    // Navigate to profile for new reel notifications
    if (notification.notification_type === 'follower_new_reel') {
      navigate(actorProfilePath || '/community');
      return;
    }

    // Navigate to profile startup tab for startup updates
    if (notification.notification_type === 'follower_startup_update') {
      navigate(actorProfilePath || '/community');
      return;
    }

    if (notification.notification_type === 'task_deadline_expired') {
      navigate('/tasks');
      return;
    }

    // Navigate to the post for community notifications
    if (notification.post_id) {
      navigate(`/community?post=${notification.post_id}`);
    }
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
        return metadata?.task_text
          ? `Deadline reached: ${metadata.task_text}`
          : 'A task deadline has been reached';
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

    return notification.actor.avatar;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
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
      <DropdownMenuContent align="end" className="w-80 bg-background border shadow-lg z-50">
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
            systemNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`cursor-pointer flex items-start gap-3 p-3 ${
                  !notification.read ? 'bg-primary/5' : ''
                }`}
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
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
