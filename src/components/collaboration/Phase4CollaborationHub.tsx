import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEnhancedCollaboration } from '@/hooks/useEnhancedCollaboration';
import { VoiceVideoCall } from './VoiceVideoCall';
import { ActivityFeed } from './ActivityFeed';
import { NotificationCenter } from './NotificationCenter';
import { EnhancedPresenceIndicator } from './EnhancedPresenceIndicator';
import { LiveChat } from './LiveChat';
import { 
  Users, 
  Video, 
  MessageSquare, 
  Activity, 
  Settings,
  Maximize2,
  Minimize2,
  Share2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface Phase4CollaborationHubProps {
  sessionId: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const Phase4CollaborationHub: React.FC<Phase4CollaborationHubProps> = ({
  sessionId,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('presence');

  const {
    messages,
    userStatuses,
    notifications,
    activities,
    activeCall,
    loading,
    sendMessage,
    updateUserStatus,
    markNotificationAsRead,
    startCall,
    endCall,
  } = useEnhancedCollaboration(sessionId);

  const shareSession = async () => {
    try {
      const shareUrl = `${window.location.origin}/collaboration-demo?session=${sessionId}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Session link copied",
        description: "Share this link to invite others to collaborate",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy session link",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className={isFullscreen ? "h-screen" : "h-full"}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Initializing collaboration...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const onlineCount = userStatuses.filter(u => u.status === 'online' && u.user_id !== user?.id).length;
  const unreadNotifications = notifications.filter(n => !n.read_at).length;

  return (
    <Card className={`${isFullscreen ? "h-screen rounded-none" : "h-full"} overflow-hidden`}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collaboration Hub
            <Badge variant="secondary">Phase 4</Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={shareSession}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            
            <NotificationCenter 
              notifications={notifications}
              onMarkAsRead={markNotificationAsRead}
            />
            
            {onToggleFullscreen && (
              <Button variant="outline" size="sm" onClick={onToggleFullscreen}>
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced presence indicator */}
        <div className="mt-3">
          <EnhancedPresenceIndicator 
            userStatuses={userStatuses}
            currentUserId={user?.id}
          />
        </div>
      </CardHeader>

      <CardContent className="p-0 h-full">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <TabsList className="adaptive-tabs grid w-full grid-cols-4 rounded-none border-b">
            <TabsTrigger value="presence" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Presence</span>
              {onlineCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {onlineCount}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="calls" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Calls</span>
              {activeCall && (
                <Badge variant="destructive" className="ml-1">
                  Live
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
              {messages.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {messages.length}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
              {activities.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activities.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="presence" className="h-full m-0 p-4">
              <PresenceOverview 
                userStatuses={userStatuses}
                currentUserId={user?.id}
                onUpdateStatus={updateUserStatus}
              />
            </TabsContent>

            <TabsContent value="calls" className="h-full m-0 p-4">
              <VoiceVideoCall
                activeCall={activeCall}
                userStatuses={userStatuses}
                currentUserId={user?.id}
                onStartCall={startCall}
                onEndCall={endCall}
              />
            </TabsContent>

            <TabsContent value="chat" className="h-full m-0 p-4">
              <LiveChat
                messages={messages}
                onSendMessage={sendMessage}
                currentUserId={user?.id}
              />
            </TabsContent>

            <TabsContent value="activity" className="h-full m-0 p-4">
              <ActivityFeed activities={activities} />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

interface PresenceOverviewProps {
  userStatuses: any[];
  currentUserId?: string;
  onUpdateStatus: (status: any, customStatus?: string, statusEmoji?: string, activityType?: any) => void;
}

const PresenceOverview: React.FC<PresenceOverviewProps> = ({
  userStatuses,
  currentUserId,
  onUpdateStatus,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const currentUser = userStatuses.find(u => u.user_id === currentUserId);
  const otherUsers = userStatuses.filter(u => u.user_id !== currentUserId);
  
  const handleStatusUpdate = async (status: any, activityType?: any) => {
    setIsUpdatingStatus(true);
    await onUpdateStatus(status, undefined, undefined, activityType);
    setIsUpdatingStatus(false);
  };

  return (
    <div className="space-y-6 h-full">
      {/* Current user status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Your Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="font-medium">{currentUser?.status || 'Online'}</span>
            {currentUser?.activity_type && (
              <Badge variant="outline" className="capitalize">
                {currentUser.activity_type}
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="sm" 
              variant="outline"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusUpdate('online', 'working')}
            >
              🟢 Working
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusUpdate('busy', 'meeting')}
            >
              🔴 In Meeting
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusUpdate('away', 'break')}
            >
              🟡 On Break
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusUpdate('busy', 'focus')}
            >
              🔵 Focusing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Other users */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            Team Members
            <Badge variant="secondary">
              {otherUsers.length} online
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {otherUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No other team members online
            </p>
          ) : (
            <div className="space-y-3">
              {otherUsers.map((userStatus) => (
                <div key={userStatus.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      userStatus.status === 'online' ? 'bg-green-500' :
                      userStatus.status === 'away' ? 'bg-yellow-500' :
                      userStatus.status === 'busy' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="font-medium">
                        {userStatus.profiles?.full_name || 'Anonymous User'}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {userStatus.status}
                        {userStatus.activity_type && ` • ${userStatus.activity_type}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {new Date(userStatus.last_activity_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
