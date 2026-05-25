import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CollaborationCall, UserStatus } from '@/hooks/useEnhancedCollaboration';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff,
  Volume2,
  VolumeX,
  Users,
  Settings
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface VoiceVideoCallProps {
  activeCall: CollaborationCall | null;
  userStatuses: UserStatus[];
  currentUserId?: string;
  onStartCall: (callType: CollaborationCall['call_type']) => void;
  onEndCall: (callId: string) => void;
}

export const VoiceVideoCall: React.FC<VoiceVideoCallProps> = ({
  activeCall,
  userStatuses,
  currentUserId,
  onStartCall,
  onEndCall,
}) => {
  const { toast } = useToast();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const screenShareTrackRef = useRef<{ track: MediaStreamTrack; handler: () => void } | null>(null);

  // Clean up screen share track listener on unmount
  useEffect(() => {
    return () => {
      if (screenShareTrackRef.current) {
        const { track, handler } = screenShareTrackRef.current;
        track.removeEventListener('ended', handler);
        screenShareTrackRef.current = null;
      }
    };
  }, []);

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall && activeCall.status === 'active') {
      const startTime = new Date(activeCall.started_at).getTime();
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const startVoiceCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      setLocalStream(stream);
      onStartCall('voice');
      
      toast({
        title: "Voice call started",
        description: "You can now talk with other participants",
      });
    } catch (error) {
      console.error('Error starting voice call:', error);
      toast({
        title: "Error",
        description: "Failed to start voice call. Please check your microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      setLocalStream(stream);
      setIsVideoEnabled(true);
      onStartCall('video');
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      toast({
        title: "Video call started",
        description: "You can now see and talk with other participants",
      });
    } catch (error) {
      console.error('Error starting video call:', error);
      toast({
        title: "Error",
        description: "Failed to start video call. Please check your camera and microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      // Replace video track with screen share
      if (localStream) {
        const videoTrack = stream.getVideoTracks()[0];
        const sender = peerConnections.current.values().next().value?.getSenders().find(
          s => s.track && s.track.kind === 'video'
        );
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }
      
      setIsScreenSharing(true);
      onStartCall('screen_share');
      
      // Stop screen sharing when user stops it from the OS/browser
      const track = stream.getVideoTracks()[0];
      const handleEnded = () => {
        setIsScreenSharing(false);
        stopScreenShare();
      };
      track.addEventListener('ended', handleEnded);
      screenShareTrackRef.current = { track, handler: handleEnded };
      
      toast({
        title: "Screen sharing started",
        description: "Your screen is now being shared with other participants",
      });
    } catch (error) {
      console.error('Error starting screen share:', error);
      toast({
        title: "Error",
        description: "Failed to start screen sharing.",
        variant: "destructive",
      });
    }
  };

  const stopScreenShare = async () => {
    if (!isScreenSharing || !localStream) return;
    
    try {
      // Get camera stream back
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoEnabled
      });
      
      // Replace screen share track with camera track
      if (isVideoEnabled) {
        const videoTrack = stream.getVideoTracks()[0];
        const sender = peerConnections.current.values().next().value?.getSenders().find(
          s => s.track && s.track.kind === 'video'
        );
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }
      
      setLocalStream(stream);
      setIsScreenSharing(false);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  };

  const toggleVideo = async () => {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !isVideoEnabled;
      setIsVideoEnabled(!isVideoEnabled);
    } else if (!isVideoEnabled) {
      // Enable video
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
        setLocalStream(stream);
        setIsVideoEnabled(true);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error enabling video:', error);
      }
    }
  };

  const toggleAudio = () => {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !isAudioEnabled;
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerEnabled(!isSpeakerEnabled);
    // In a real implementation, you'd control the audio output device here
  };

  const endCall = () => {
    if (activeCall) {
      // Clean up streams
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      
      // Clean up peer connections
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      
      setIsVideoEnabled(false);
      setIsAudioEnabled(true);
      setIsScreenSharing(false);
      setCallDuration(0);
      
      onEndCall(activeCall.id);
      
      toast({
        title: "Call ended",
        description: `Call duration: ${formatDuration(callDuration)}`,
      });
    }
  };

  // Get participants info
  const getParticipantsInfo = () => {
    if (!activeCall) return [];
    
    return activeCall.participants.map(participantId => {
      const userStatus = userStatuses.find(u => u.user_id === participantId);
      return {
        id: participantId,
        name: userStatus?.profiles?.full_name || 'Anonymous User',
        avatar: userStatus?.profiles?.avatar_url,
      };
    });
  };

  if (!activeCall) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Voice & Video Calls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button onClick={startVoiceCall} className="flex-1">
              <Phone className="h-4 w-4 mr-2" />
              Voice Call
            </Button>
            <Button onClick={startVideoCall} className="flex-1">
              <Video className="h-4 w-4 mr-2" />
              Video Call
            </Button>
            <Button onClick={startScreenShare} className="flex-1">
              <Monitor className="h-4 w-4 mr-2" />
              Share Screen
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Start a call to collaborate with your team in real-time
          </p>
        </CardContent>
      </Card>
    );
  }

  const participants = getParticipantsInfo();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {activeCall.call_type === 'voice' && <Phone className="h-5 w-5" />}
            {activeCall.call_type === 'video' && <Video className="h-5 w-5" />}
            {activeCall.call_type === 'screen_share' && <Monitor className="h-5 w-5" />}
            {activeCall.call_type === 'voice' ? 'Voice Call' : 
             activeCall.call_type === 'video' ? 'Video Call' : 'Screen Share'}
            <Badge variant="secondary">{formatDuration(callDuration)}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-sm">{participants.length}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Local video */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {isVideoEnabled || isScreenSharing ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Avatar className="h-16 w-16">
                  <AvatarFallback>
                    {userStatuses.find(u => u.user_id === currentUserId)?.profiles?.full_name?.[0] || 'Y'}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
              You {isScreenSharing && '(Screen)'}
            </div>
            {!isAudioEnabled && (
              <div className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded">
                <MicOff className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* Remote videos */}
          {participants.filter(p => p.id !== currentUserId).map((participant) => (
            <div key={participant.id} className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <div className="flex items-center justify-center h-full">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={participant.avatar || undefined} />
                  <AvatarFallback>
                    {participant.name[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                {participant.name}
              </div>
            </div>
          ))}
        </div>

        {/* Call controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={isAudioEnabled ? "outline" : "destructive"}
            size="sm"
            onClick={toggleAudio}
          >
            {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>

          {(activeCall.call_type === 'video' || isVideoEnabled) && (
            <Button
              variant={isVideoEnabled ? "outline" : "secondary"}
              size="sm"
              onClick={toggleVideo}
            >
              {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
          )}

          <Button
            variant={isSpeakerEnabled ? "outline" : "secondary"}
            size="sm"
            onClick={toggleSpeaker}
          >
            {isSpeakerEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>

          {!isScreenSharing ? (
            <Button variant="outline" size="sm" onClick={startScreenShare}>
              <Monitor className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={stopScreenShare}>
              <MonitorOff className="h-4 w-4" />
            </Button>
          )}

          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>

          <Button variant="destructive" size="sm" onClick={endCall}>
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>

        {/* Participants list */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Participants:</span>
          {participants.map((participant) => (
            <Badge key={participant.id} variant="outline" className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={participant.avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {participant.name[0]}
                </AvatarFallback>
              </Avatar>
              {participant.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};