import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserStatus } from '@/hooks/useEnhancedCollaboration';
import { Users, Circle, Briefcase, Coffee, Focus, Phone } from 'lucide-react';

interface EnhancedPresenceIndicatorProps {
  userStatuses: UserStatus[];
  currentUserId?: string;
}

export const EnhancedPresenceIndicator: React.FC<EnhancedPresenceIndicatorProps> = ({
  userStatuses,
  currentUserId,
}) => {
  const otherUsers = userStatuses.filter(user => user.user_id !== currentUserId);
  const onlineUsers = otherUsers.filter(user => user.status === 'online');

  if (otherUsers.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="h-4 w-4" />
        <span className="text-sm">Working alone</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Users className="h-4 w-4 text-muted-foreground" />
      
      {/* User avatars with status */}
      <div className="flex -space-x-2">
        {otherUsers.slice(0, 4).map((userStatus) => (
          <TooltipProvider key={userStatus.id}>
            <Tooltip>
              <TooltipTrigger>
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-primary/20">
                    <AvatarImage src={userStatus.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {userStatus.profiles?.full_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Status indicator */}
                  <div className="absolute -bottom-1 -right-1">
                    <StatusIndicator status={userStatus.status} />
                  </div>
                  
                  {/* Activity type indicator */}
                  {userStatus.activity_type && (
                    <div className="absolute -top-1 -right-1">
                      <ActivityIndicator activityType={userStatus.activity_type} />
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">
                    {userStatus.profiles?.full_name || 'Anonymous User'}
                  </p>
                  <div className="flex items-center gap-2">
                    <StatusIndicator status={userStatus.status} />
                    <span className="text-xs capitalize">{userStatus.status}</span>
                  </div>
                  {userStatus.custom_status && (
                    <p className="text-xs flex items-center gap-1">
                      {userStatus.status_emoji} {userStatus.custom_status}
                    </p>
                  )}
                  {userStatus.activity_type && (
                    <p className="text-xs flex items-center gap-1">
                      <ActivityIndicator activityType={userStatus.activity_type} />
                      <span className="capitalize">{userStatus.activity_type}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Last seen {new Date(userStatus.last_activity_at).toLocaleTimeString()}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        
        {otherUsers.length > 4 && (
          <Badge 
            variant="secondary" 
            className="ml-2 h-8 w-8 rounded-full p-0 flex items-center justify-center"
          >
            +{otherUsers.length - 4}
          </Badge>
        )}
      </div>

      {/* Status summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          {onlineUsers.length === 0 
            ? 'No one online' 
            : onlineUsers.length === 1 
            ? '1 person online' 
            : `${onlineUsers.length} people online`
          }
        </span>
        
        {/* Activity breakdown */}
        {onlineUsers.length > 0 && (
          <div className="flex items-center gap-1">
            {getActivityBreakdown(onlineUsers).map(({ activity, count, icon }) => (
              <TooltipProvider key={activity}>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-xs px-1">
                      {icon}
                      {count}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{count} {activity === 'working' ? 'working' : activity === 'meeting' ? 'in meeting' : activity === 'break' ? 'on break' : 'focusing'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface StatusIndicatorProps {
  status: UserStatus['status'];
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getStatusColor = (status: UserStatus['status']) => {
    switch (status) {
      case 'online':
        return 'bg-success';
      case 'away':
        return 'bg-warning';
      case 'busy':
        return 'bg-destructive';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={`w-3 h-3 rounded-full border-2 border-background ${getStatusColor(status)}`} />
  );
};

interface ActivityIndicatorProps {
  activityType: NonNullable<UserStatus['activity_type']>;
}

const ActivityIndicator: React.FC<ActivityIndicatorProps> = ({ activityType }) => {
  const getActivityIcon = (activity: NonNullable<UserStatus['activity_type']>) => {
    switch (activity) {
      case 'working':
        return <Briefcase className="h-2 w-2" />;
      case 'meeting':
        return <Phone className="h-2 w-2" />;
      case 'break':
        return <Coffee className="h-2 w-2" />;
      case 'focus':
        return <Focus className="h-2 w-2" />;
    }
  };

  const getActivityColor = (activity: NonNullable<UserStatus['activity_type']>) => {
    switch (activity) {
      case 'working':
        return 'bg-info';
      case 'meeting':
        return 'bg-purple-500';
      case 'break':
        return 'bg-warning';
      case 'focus':
        return 'bg-indigo-500';
    }
  };

  return (
    <div className={`w-4 h-4 rounded-full border border-background ${getActivityColor(activityType)} flex items-center justify-center text-white`}>
      {getActivityIcon(activityType)}
    </div>
  );
};

const getActivityBreakdown = (users: UserStatus[]) => {
  const activities = users.reduce((acc, user) => {
    const activity = user.activity_type || 'working';
    acc[activity] = (acc[activity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(activities).map(([activity, count]) => ({
    activity,
    count,
    icon: activity === 'working' ? <Briefcase className="h-3 w-3 mr-1" /> :
          activity === 'meeting' ? <Phone className="h-3 w-3 mr-1" /> :
          activity === 'break' ? <Coffee className="h-3 w-3 mr-1" /> :
          <Focus className="h-3 w-3 mr-1" />
  }));
};