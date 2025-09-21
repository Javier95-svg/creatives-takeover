import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Users, Globe, Lock, Video, User } from 'lucide-react';
import { DemoCall } from '@/hooks/useDemoCalls';
import { format } from 'date-fns';

interface DemoCallCardProps {
  call: DemoCall;
  participantCount?: number;
  isUserParticipant?: boolean;
  isOwner?: boolean;
  canJoin?: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
  onJoinRoom?: () => void;
  onViewDetails?: () => void;
}

const DemoCallCard: React.FC<DemoCallCardProps> = ({
  call,
  participantCount = 0,
  isUserParticipant = false,
  isOwner = false,
  canJoin = false,
  onJoin,
  onLeave,
  onJoinRoom,
  onViewDetails
}) => {
  const isScheduled = call.status === 'scheduled';
  const isInProgress = call.status === 'in_progress';
  const isCompleted = call.status === 'completed';
  const isCancelled = call.status === 'cancelled';
  
  const scheduledDate = new Date(call.scheduled_at);
  const now = new Date();
  const isUpcoming = scheduledDate > now && isScheduled;
  const canStartSoon = scheduledDate.getTime() - now.getTime() < 15 * 60 * 1000; // 15 minutes before

  const getStatusBadge = () => {
    switch (call.status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-500 hover:bg-green-600">Live</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const getActionButton = () => {
    if (isCancelled) return null;
    
    if (isInProgress) {
      return (
        <Button onClick={onJoinRoom} className="w-full">
          <Video className="w-4 h-4 mr-2" />
          Join Room
        </Button>
      );
    }
    
    if (isOwner && isUpcoming && canStartSoon) {
      return (
        <Button onClick={onJoinRoom} className="w-full">
          <Video className="w-4 h-4 mr-2" />
          Start Demo
        </Button>
      );
    }
    
    if (isUserParticipant && isUpcoming) {
      return (
        <div className="space-y-2">
          <Button onClick={onJoinRoom} className="w-full" disabled={!canStartSoon}>
            <Video className="w-4 h-4 mr-2" />
            {canStartSoon ? 'Join Room' : 'Join Soon'}
          </Button>
          <Button onClick={onLeave} variant="outline" size="sm" className="w-full">
            Leave Call
          </Button>
        </div>
      );
    }
    
    if (canJoin && isUpcoming) {
      return (
        <Button onClick={onJoin} className="w-full">
          <Users className="w-4 h-4 mr-2" />
          Join Call
        </Button>
      );
    }
    
    if (isCompleted) {
      return (
        <Button onClick={onViewDetails} variant="outline" className="w-full">
          View Recording
        </Button>
      );
    }
    
    return null;
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{call.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              {isOwner ? 'Your Demo' : 'Demo by User'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {call.is_public ? (
              <Globe className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
        
        {call.description && (
          <p className="text-sm text-muted-foreground mt-2">{call.description}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{format(scheduledDate, 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{format(scheduledDate, 'h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{participantCount}/{call.max_participants} joined</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{call.duration_minutes}min</span>
          </div>
        </div>
        
        {getActionButton()}
      </CardContent>
    </Card>
  );
};

export default DemoCallCard;