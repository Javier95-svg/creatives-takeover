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
import { useCommunityNotifications } from '@/hooks/useCommunityNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const NotificationBell = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useCommunityNotifications(user?.id);
  const navigate = useNavigate();

  // Filter out message notifications - they're handled separately in the messages icon
  const systemNotifications = notifications.filter(n => n.notification_type !== 'message');

  const handleNotificationClick = async (notification: any) => {
    await markAsRead(notification.id);

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

    // Navigate to the post for community notifications
    if (notification.post_id) {
      navigate(`/community?post=${notification.post_id}`);
    }
  };

  const getNotificationText = (notification: any) => {
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
      default:
        return `${actor.name} interacted with your post`;
    }
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
                <img
                  src={notification.actor.avatar}
                  alt={notification.actor.name}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
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