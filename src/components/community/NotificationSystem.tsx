import React, { useState, useEffect } from "react";
import { Bell, Check, MessageCircle, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: 'comment' | 'vote' | 'mention' | 'follow';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  avatar?: string;
  fromUser?: string;
}

const NotificationSystem: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadNotifications();
      // Set up real-time subscription for new notifications
      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=in.(${user.id})` // This would need proper implementation
        }, (payload) => {
          // Handle new comment notifications
          generateCommentNotification(payload.new as any);
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isAuthenticated, user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      // For now, we'll create mock notifications based on user's posts and comments
      // In a real implementation, you'd have a notifications table
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'comment',
          title: 'New comment on your story',
          message: 'Someone commented on "From zero to first 100 customers"',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          read: false,
          fromUser: 'Alex Rivera'
        },
        {
          id: '2',
          type: 'vote',
          title: 'Your story is trending!',
          message: 'Your post received 10 new upvotes in the last hour',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          read: false
        },
        {
          id: '3',
          type: 'mention',
          title: 'You were mentioned',
          message: 'John mentioned you in a comment',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          read: true,
          fromUser: 'John Doe'
        }
      ];

      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const generateCommentNotification = (comment: any) => {
    const newNotification: Notification = {
      id: `comment-${comment.id}`,
      type: 'comment',
      title: 'New comment on your story',
      message: `${comment.profiles?.full_name || 'Someone'} commented on your post`,
      timestamp: comment.created_at,
      read: false,
      fromUser: comment.profiles?.full_name,
      avatar: comment.profiles?.avatar_url
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    toast.success('New comment on your story!');
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'vote':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'mention':
        return <User className="h-4 w-4 text-purple-500" />;
      case 'follow':
        return <User className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const timeAgo = (timestamp: string) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-80">
          {notifications.length > 0 ? (
            <div className="space-y-1 p-2">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.read ? 'bg-muted/30' : ''
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {notification.avatar ? (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={notification.avatar} />
                            <AvatarFallback className="text-xs">
                              {notification.fromUser?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            {getNotificationIcon(notification.type)}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {timeAgo(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">
                You'll see updates about your posts and interactions here
              </p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationSystem;