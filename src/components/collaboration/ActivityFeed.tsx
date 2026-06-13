import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CollaborationActivity } from '@/hooks/useEnhancedCollaboration';
import { 
  Activity, 
  UserPlus, 
  UserMinus, 
  MessageSquare, 
  MessageCircle, 
  Edit, 
  Phone, 
  PhoneOff,
  Monitor,
  MonitorOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  activities: CollaborationActivity[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
}) => {
  const getActivityIcon = (type: CollaborationActivity['activity_type']) => {
    switch (type) {
      case 'joined':
        return <UserPlus className="h-4 w-4 text-success" />;
      case 'left':
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
      case 'screen_share_started':
        return <Monitor className="h-4 w-4 text-info" />;
      case 'screen_share_ended':
        return <MonitorOff className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityDescription = (activity: CollaborationActivity) => {
    const userName = activity.profiles?.full_name || 'Someone';
    
    switch (activity.activity_type) {
      case 'joined':
        return `${userName} joined the collaboration session`;
      case 'left':
        return `${userName} left the collaboration session`;
      case 'message':
        const messageContent = activity.activity_data?.content;
        return `${userName} sent a message${messageContent ? `: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"` : ''}`;
      case 'comment':
        return `${userName} added a comment`;
      case 'edit':
        const editType = activity.activity_data?.edit_type;
        return `${userName} made ${editType ? `a ${editType} edit` : 'an edit'}`;
      case 'call_started':
        const callType = activity.activity_data?.call_type;
        return `${userName} started a ${callType || 'voice'} call`;
      case 'call_ended':
        const duration = activity.activity_data?.duration_seconds;
        return `${userName} ended the call${duration ? ` (${formatDuration(duration)})` : ''}`;
      case 'screen_share_started':
        return `${userName} started sharing their screen`;
      case 'screen_share_ended':
        return `${userName} stopped sharing their screen`;
      default:
        return `${userName} performed an action`;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const groupActivitiesByDate = (activities: CollaborationActivity[]) => {
    const groups: { [key: string]: CollaborationActivity[] } = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });
    
    return groups;
  };

  const groupedActivities = groupActivitiesByDate(activities);
  const sortedDates = Object.keys(groupedActivities).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const isToday = (date: string) => {
    return new Date(date).toDateString() === new Date().toDateString();
  };

  const isYesterday = (date: string) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return new Date(date).toDateString() === yesterday.toDateString();
  };

  const formatDateGroup = (date: string) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Feed
          <Badge variant="secondary">
            {activities.length} activities
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activity yet</p>
            <p className="text-sm">Collaboration activities will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {sortedDates.map(date => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {formatDateGroup(date)}
                    </h3>
                    <Separator className="flex-1" />
                  </div>
                  
                  <div className="space-y-3">
                    {groupedActivities[date].map((activity, index) => (
                      <ActivityItem
                        key={activity.id}
                        activity={activity}
                        isLast={index === groupedActivities[date].length - 1}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

interface ActivityItemProps {
  activity: CollaborationActivity;
  isLast: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  isLast,
}) => {
  const getActivityIcon = (type: CollaborationActivity['activity_type']) => {
    switch (type) {
      case 'joined':
        return <UserPlus className="h-4 w-4 text-success" />;
      case 'left':
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
      case 'screen_share_started':
        return <Monitor className="h-4 w-4 text-info" />;
      case 'screen_share_ended':
        return <MonitorOff className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityDescription = (activity: CollaborationActivity) => {
    const userName = activity.profiles?.full_name || 'Someone';
    
    switch (activity.activity_type) {
      case 'joined':
        return `${userName} joined the collaboration session`;
      case 'left':
        return `${userName} left the collaboration session`;
      case 'message':
        const messageContent = activity.activity_data?.content;
        return `${userName} sent a message${messageContent ? `: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"` : ''}`;
      case 'comment':
        return `${userName} added a comment`;
      case 'edit':
        const editType = activity.activity_data?.edit_type;
        return `${userName} made ${editType ? `a ${editType} edit` : 'an edit'}`;
      case 'call_started':
        const callType = activity.activity_data?.call_type;
        return `${userName} started a ${callType || 'voice'} call`;
      case 'call_ended':
        const duration = activity.activity_data?.duration_seconds;
        return `${userName} ended the call${duration ? ` (${formatDuration(duration)})` : ''}`;
      case 'screen_share_started':
        return `${userName} started sharing their screen`;
      case 'screen_share_ended':
        return `${userName} stopped sharing their screen`;
      default:
        return `${userName} performed an action`;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-start gap-3">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center">
          {getActivityIcon(activity.activity_type)}
        </div>
        {!isLast && (
          <div className="w-px h-6 bg-border mt-2" />
        )}
      </div>

      {/* Activity content */}
      <div className="flex-1 space-y-1 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={activity.profiles?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {activity.profiles?.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm">
              {getActivityDescription(activity)}
            </p>
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Additional activity metadata */}
        {activity.activity_data && Object.keys(activity.activity_data).length > 0 && (
          <div className="ml-8 text-xs text-muted-foreground">
            {activity.activity_type === 'edit' && activity.activity_data.content_path && (
              <span>in {activity.activity_data.content_path}</span>
            )}
            {activity.activity_type === 'call_started' && activity.activity_data.call_type && (
              <Badge variant="outline" className="text-xs">
                {activity.activity_data.call_type} call
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};