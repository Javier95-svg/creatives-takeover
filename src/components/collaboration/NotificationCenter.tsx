import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CollaborationNotification } from '@/hooks/useEnhancedCollaboration';
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck,
  UserPlus, 
  UserMinus, 
  MessageSquare, 
  MessageCircle, 
  Edit, 
  Phone, 
  PhoneOff,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface NotificationCenterProps {
  notifications: CollaborationNotification[];
  onMarkAsRead: (notificationId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
}) => {
  const [showAll, setShowAll] = useState(false);
  
  const unreadNotifications = notifications.filter(n => !n.read_at);
  const displayNotifications = showAll ? notifications : notifications.slice(0, 10);

  const getNotificationIcon = (type: CollaborationNotification['notification_type']) => {
    switch (type) {
      case 'user_joined':
        return <UserPlus className="h-4 w-4 text-success" />;
      case 'user_left':
        return <UserMinus className="h-4 w-4 text-warning" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-info" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-purple-500" />;
      case 'edit':
        return <Edit className="h-4 w-4 text-indigo-500" />;
      case 'call_started':
        return <Phone className="h-4 w-4 text-success" />;
      case 'call_ended':
        return <PhoneOff className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const markAllAsRead = () => {
    unreadNotifications.forEach(notification => {
      onMarkAsRead(notification.id);
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadNotifications.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
            </Badge>
          )}
          Notifications
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-96">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadNotifications.length > 0 && (
                <Badge variant="secondary">
                  {unreadNotifications.length} new
                </Badge>
              )}
            </div>
            {unreadNotifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          {notifications.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-sm">You'll see collaboration updates here</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="space-y-2">
                {displayNotifications.map((notification, index) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    isLast={index === displayNotifications.length - 1}
                  />
                ))}
                
                {notifications.length > 10 && !showAll && (
                  <div className="pt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setShowAll(true)}
                    >
                      Show all {notifications.length} notifications
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface NotificationItemProps {
  notification: CollaborationNotification;
  onMarkAsRead: (notificationId: string) => void;
  isLast: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  isLast,
}) => {
  const isRead = !!notification.read_at;
  
  const handleClick = () => {
    if (!isRead) {
      onMarkAsRead(notification.id);
    }
  };

  const getNotificationIcon = (type: CollaborationNotification['notification_type']) => {
    switch (type) {
      case 'user_joined':
        return <UserPlus className="h-4 w-4 text-success" />;
      case 'user_left':
        return <UserMinus className="h-4 w-4 text-warning" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-info" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-purple-500" />;
      case 'edit':
        return <Edit className="h-4 w-4 text-indigo-500" />;
      case 'call_started':
        return <Phone className="h-4 w-4 text-success" />;
      case 'call_ended':
        return <PhoneOff className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <>
      <div
        className={`p-3 rounded-lg cursor-pointer transition-colors ${
          isRead
            ? 'bg-background hover:bg-muted/50'
            : 'bg-primary/5 hover:bg-primary/10 border border-primary/20'
        }`}
        onClick={handleClick}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getNotificationIcon(notification.notification_type)}
          </div>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between">
              <h4 className={`text-sm font-medium ${!isRead ? 'font-semibold' : ''}`}>
                {notification.title}
              </h4>
              {!isRead && (
                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {notification.message}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
              
              {isRead && (
                <Check className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {!isLast && <Separator className="my-1" />}
    </>
  );
};