import { Button } from "@/components/ui/button";
import { MessageCircle, UserPlus, UserCheck, UserX, Users } from "lucide-react";
import { useSocial } from "@/hooks/useSocial";
import { useMessaging } from "@/hooks/useMessaging";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SocialButtonsProps {
  userId: string;
  userName?: string;
  compact?: boolean;
}

export const SocialButtons = ({ userId, userName, compact = false }: SocialButtonsProps) => {
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
  
  const { startConversation } = useMessaging();

  // Don't show social buttons for own profile
  if (!user || user.id === userId) return null;

  const handleSendMessage = async () => {
    try {
      const conversationId = await startConversation(userId);
      if (conversationId) {
        navigate('/messages');
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
    </div>
  );
};