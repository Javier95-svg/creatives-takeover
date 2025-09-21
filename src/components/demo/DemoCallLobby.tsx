import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Video, VideoOff, Mic, MicOff, Users, Clock, Settings } from 'lucide-react';
import { DemoCall, DemoCallParticipant } from '@/hooks/useDemoCalls';
import { format } from 'date-fns';

interface DemoCallLobbyProps {
  call: DemoCall;
  participants: DemoCallParticipant[];
  isOwner: boolean;
  onStartCall?: () => void;
  onJoinCall?: () => void;
  onLeaveCall?: () => void;
}

const DemoCallLobby: React.FC<DemoCallLobbyProps> = ({
  call,
  participants,
  isOwner,
  onStartCall,
  onJoinCall,
  onLeaveCall
}) => {
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [timeUntilStart, setTimeUntilStart] = useState('');

  // Calculate time until call starts
  useEffect(() => {
    const updateTimeUntilStart = () => {
      const now = new Date();
      const callTime = new Date(call.scheduled_at);
      const diffMs = callTime.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setTimeUntilStart('Starting now...');
        return;
      }
      
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      if (diffMinutes > 0) {
        setTimeUntilStart(`Starting in ${diffMinutes}m ${diffSeconds}s`);
      } else {
        setTimeUntilStart(`Starting in ${diffSeconds}s`);
      }
    };

    updateTimeUntilStart();
    const interval = setInterval(updateTimeUntilStart, 1000);
    
    return () => clearInterval(interval);
  }, [call.scheduled_at]);

  const canStart = () => {
    const now = new Date();
    const callTime = new Date(call.scheduled_at);
    const diffMs = callTime.getTime() - now.getTime();
    return diffMs <= 15 * 60 * 1000; // Can start 15 minutes before scheduled time
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'presenter':
        return <Badge>Presenter</Badge>;
      case 'moderator':
        return <Badge variant="secondary">Moderator</Badge>;
      default:
        return <Badge variant="outline">Participant</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Call Info Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{call.title}</CardTitle>
              <p className="text-muted-foreground mt-1">
                {format(new Date(call.scheduled_at), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">{timeUntilStart}</div>
              <div className="text-sm text-muted-foreground">
                {call.duration_minutes} minute demo
              </div>
            </div>
          </div>
          
          {call.description && (
            <p className="text-sm text-muted-foreground mt-2">{call.description}</p>
          )}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tech Check & Controls */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Tech Check
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Video Preview */}
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
                {videoEnabled ? (
                  <div className="text-center">
                    <Video className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Camera Preview</p>
                    <p className="text-xs text-muted-foreground">Your camera is ready</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <VideoOff className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Camera Off</p>
                  </div>
                )}
              </div>

              {/* Media Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={videoEnabled ? "default" : "secondary"}
                  size="lg"
                  onClick={() => setVideoEnabled(!videoEnabled)}
                >
                  {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>
                
                <Button
                  variant={audioEnabled ? "default" : "secondary"}
                  size="lg"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>
              </div>

              <Separator />

              {/* Join Controls */}
              <div className="space-y-3">
                {isOwner ? (
                  <Button 
                    onClick={onStartCall}
                    disabled={!canStart()}
                    className="w-full"
                    size="lg"
                  >
                    {canStart() ? 'Start Demo Call' : 'Demo will start soon'}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      onClick={onJoinCall}
                      disabled={!canStart()}
                      className="w-full"
                      size="lg"
                    >
                      {canStart() ? 'Join Demo Call' : 'Wait for host to start'}
                    </Button>
                    <Button 
                      onClick={onLeaveCall}
                      variant="outline"
                      className="w-full"
                    >
                      Leave Call
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Participants List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants ({participants.length}/{call.max_participants})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      U
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      User {participant.user_id.slice(0, 8)}
                    </p>
                  </div>
                  
                  {getRoleBadge(participant.role)}
                </div>
              ))}
              
              {participants.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No participants yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DemoCallLobby;