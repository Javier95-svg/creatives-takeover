import { Button } from "@/components/ui/button";
import { MessageCircle, UserPlus, UserCheck, UserX, Users, Handshake } from "lucide-react";
import { useSocial } from "@/hooks/useSocial";
import { useMessaging } from "@/hooks/useMessaging";
import { useAccountabilityPartners } from "@/hooks/useAccountabilityPartners";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SocialButtonsProps {
  userId: string;
  userName?: string;
  compact?: boolean;
  showAccountabilityPartner?: boolean;
}

export const SocialButtons = ({ 
  userId, 
  userName, 
  compact = false, 
  showAccountabilityPartner = true 
}: SocialButtonsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    followStatus,
    friendStatus,
    loading,
    followUser,
    unfollowUser,
    sendFriendRequest,
    cancelFriendRequest
  } = useSocial(userId);
  
  const { startConversation, getUsernameByUserId } = useMessaging({ autoLoad: false });
  const { sendPartnershipRequest } = useAccountabilityPartners();
  const [showPartnerDialog, setShowPartnerDialog] = useState(false);
  const [partnershipType, setPartnershipType] = useState<'sprint_buddy' | 'daily_accountability' | 'goal_tracker'>('sprint_buddy');
  const [partnerMessage, setPartnerMessage] = useState('');

  // Don't show social buttons for own profile
  if (!user || user.id === userId) return null;

  const handleSendMessage = async () => {
    try {
      const conversationId = await startConversation(userId);
      if (conversationId) {
        // Get username and navigate to username-based route
        const username = await getUsernameByUserId(userId);
        if (username) {
          navigate(`/messages/${username}`);
        } else {
          // Fallback to generic messages if username not found
          navigate('/messages');
        }
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const handleFollowToggle = () => {
    if (followStatus === 'following') {
      unfollowUser();
    } else {
      followUser();
    }
  };

  const handleFriendAction = () => {
    if (friendStatus === 'none') {
      sendFriendRequest();
    } else if (friendStatus === 'pending_sent') {
      cancelFriendRequest();
    }
  };

  const handlePartnershipRequest = async () => {
    const { error } = await sendPartnershipRequest(
      userId,
      partnershipType,
      undefined,
      partnerMessage || undefined
    );

    if (!error) {
      setShowPartnerDialog(false);
      setPartnerMessage('');
    }
  };

  const getFollowButtonText = () => {
    switch (followStatus) {
      case 'following':
        return compact ? 'Following' : 'Following';
      case 'pending':
        return compact ? 'Pending' : 'Pending';
      case 'blocked':
        return compact ? 'Blocked' : 'Blocked';
      default:
        return compact ? 'Follow' : 'Follow';
    }
  };

  const getFollowButtonIcon = () => {
    switch (followStatus) {
      case 'following':
        return <UserCheck className="h-4 w-4" />;
      case 'pending':
        return <UserPlus className="h-4 w-4" />;
      case 'blocked':
        return <UserX className="h-4 w-4" />;
      default:
        return <UserPlus className="h-4 w-4" />;
    }
  };

  const getFriendButtonText = () => {
    switch (friendStatus) {
      case 'friends':
        return compact ? 'Friends' : 'Friends';
      case 'pending_sent':
        return compact ? 'Pending' : 'Request Sent';
      case 'pending_received':
        return compact ? 'Respond' : 'Respond to Request';
      default:
        return compact ? 'Add Friend' : 'Send Friend Request';
    }
  };

  const getFriendButtonIcon = () => {
    switch (friendStatus) {
      case 'friends':
        return <Users className="h-4 w-4" />;
      case 'pending_sent':
      case 'pending_received':
        return <UserPlus className="h-4 w-4" />;
      default:
        return <UserPlus className="h-4 w-4" />;
    }
  };

  const buttonSize = compact ? "sm" : "default";
  const containerClass = compact ? "flex gap-1" : "flex gap-2 flex-wrap";

  return (
    <div className={containerClass}>
      {/* Message Button */}
      <Button
        variant="outline"
        size={buttonSize}
        onClick={handleSendMessage}
        disabled={loading}
        className="bg-card/50 border-border/50 hover:bg-accent"
      >
        <MessageCircle className="h-4 w-4" />
        {!compact && <span className="ml-2">Message</span>}
      </Button>

      {/* Follow Button */}
      <Button
        variant={followStatus === 'following' ? "default" : "outline"}
        size={buttonSize}
        onClick={handleFollowToggle}
        disabled={loading || followStatus === 'blocked'}
        className={
          followStatus === 'following'
            ? "bg-primary hover:bg-primary/90"
            : "bg-card/50 border-border/50 hover:bg-accent"
        }
      >
        {getFollowButtonIcon()}
        {!compact && <span className="ml-2">{getFollowButtonText()}</span>}
      </Button>

      {/* Friend Request Button */}
      {friendStatus !== 'pending_received' && (
        <Button
          variant={friendStatus === 'friends' ? "default" : "outline"}
          size={buttonSize}
          onClick={handleFriendAction}
          disabled={loading || friendStatus === 'friends'}
          className={
            friendStatus === 'friends'
              ? "bg-secondary hover:bg-secondary/90"
              : "bg-card/50 border-border/50 hover:bg-accent"
          }
        >
          {getFriendButtonIcon()}
          {!compact && <span className="ml-2">{getFriendButtonText()}</span>}
        </Button>
      )}

      {/* Accountability Partner Button */}
      {showAccountabilityPartner && (
        <Dialog open={showPartnerDialog} onOpenChange={setShowPartnerDialog}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size={buttonSize}
              disabled={loading}
              className="bg-card/50 border-border/50 hover:bg-accent"
            >
              <Handshake className="h-4 w-4" />
              {!compact && <span className="ml-2">Partner Up</span>}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Accountability Partnership</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Partnership Type</Label>
                <Select value={partnershipType} onValueChange={(value: any) => setPartnershipType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sprint_buddy">Sprint Buddy</SelectItem>
                    <SelectItem value="daily_accountability">Daily Accountability</SelectItem>
                    <SelectItem value="goal_tracker">Goal Tracker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Message (Optional)</Label>
                <Textarea
                  placeholder="Why would you like to be accountability partners?"
                  value={partnerMessage}
                  onChange={(e) => setPartnerMessage(e.target.value)}
                  className="min-h-20"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowPartnerDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePartnershipRequest}>
                  Send Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
