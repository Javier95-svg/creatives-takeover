import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserPresence } from '@/hooks/useCollaboration';
import { Users } from 'lucide-react';

interface PresenceIndicatorProps {
  activeUsers: UserPresence[];
  currentUserId?: string;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  activeUsers,
  currentUserId,
}) => {
  const otherUsers = activeUsers.filter(user => user.user_id !== currentUserId);

  if (otherUsers.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="h-4 w-4" />
        <span className="text-sm">Working alone</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <div className="flex -space-x-2">
        {otherUsers.slice(0, 3).map((user) => (
          <TooltipProvider key={user.id}>
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-primary/20">
                  <AvatarImage src={user.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user.profiles?.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.profiles?.full_name || 'Anonymous User'}</p>
                <p className="text-xs text-muted-foreground">
                  Active {new Date(user.last_seen_at).toLocaleTimeString()}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {otherUsers.length > 3 && (
          <Badge 
            variant="secondary" 
            className="ml-2 h-8 w-8 rounded-full p-0 flex items-center justify-center"
          >
            +{otherUsers.length - 3}
          </Badge>
        )}
      </div>
      <span className="text-sm text-muted-foreground">
        {otherUsers.length === 1 
          ? '1 person online' 
          : `${otherUsers.length} people online`
        }
      </span>
    </div>
  );
};