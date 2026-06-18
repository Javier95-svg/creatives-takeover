import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Fired whenever connection-request state changes (a request is answered, or an
// acceptance notification is acknowledged). Every `useSocial` instance listens
// for it so the nav badge and the modal stay in sync without sharing a store.
const CONNECTION_EVENT = 'connection-requests-updated';

const SEEN_ACCEPTED_KEY_PREFIX = 'ct_seen_accepted_connections_';

// Track, per user, which "your connection request was accepted" notifications
// the sender has already seen. Kept in localStorage so the badge stays cleared
// across reloads without needing a backend column.
const getSeenAcceptedIds = (userId: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${SEEN_ACCEPTED_KEY_PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const addSeenAcceptedIds = (userId: string, ids: string[]) => {
  if (typeof window === 'undefined' || ids.length === 0) return;
  try {
    const merged = new Set([...getSeenAcceptedIds(userId), ...ids]);
    window.localStorage.setItem(`${SEEN_ACCEPTED_KEY_PREFIX}${userId}`, JSON.stringify([...merged]));
  } catch {
    // Storage may be unavailable (private mode); the badge simply won't persist.
  }
};

const emitConnectionUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CONNECTION_EVENT));
  }
};

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface PendingFollowRequest {
  id: string;
  follower_id: string;
  following_id: string;
  status: 'pending';
  created_at: string;
  follower: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

// A connection request the current user *sent* that the other person accepted,
// surfaced back to the sender as a notification.
export interface AcceptedConnectionNotification {
  id: string;
  receiver_id: string;
  updated_at: string;
  receiver: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useSocial = (targetUserId?: string) => {
  const { user } = useAuth();
  const [followStatus, setFollowStatus] = useState<'none' | 'following' | 'pending' | 'blocked'>('none');
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none');
  const [loading, setLoading] = useState(false);
  const [pendingFriendRequests, setPendingFriendRequests] = useState<FriendRequest[]>([]);
  const [pendingFollowRequests, setPendingFollowRequests] = useState<PendingFollowRequest[]>([]);
  const [acceptedConnectionNotifications, setAcceptedConnectionNotifications] = useState<AcceptedConnectionNotification[]>([]);
  // Bumped by the CONNECTION_EVENT listener so every hook instance re-reads
  // pending/accepted state when one of them changes it.
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setRefreshTick((tick) => tick + 1);
    window.addEventListener(CONNECTION_EVENT, handler);
    return () => window.removeEventListener(CONNECTION_EVENT, handler);
  }, []);

  // Check current relationship status
  useEffect(() => {
    if (!user || !targetUserId || user.id === targetUserId) return;

    const checkRelationship = async () => {
      try {
        // Check follow status
        const { data: followData } = await supabase
          .from('user_follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .maybeSingle();

        if (followData) {
          setFollowStatus(followData.status as 'none' | 'following' | 'pending' | 'blocked');
        } else {
          setFollowStatus('none');
        }

        // Check friend request status
        const { data: friendData } = await supabase
          .from('friend_requests')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`)
          .maybeSingle();

        if (friendData) {
          if (friendData.status === 'accepted') {
            setFriendStatus('friends');
          } else if (friendData.status === 'pending') {
            if (friendData.sender_id === user.id) {
              setFriendStatus('pending_sent');
            } else {
              setFriendStatus('pending_received');
            }
          }
        } else {
          setFriendStatus('none');
        }
      } catch (error) {
        console.error('Error checking relationship:', error);
      }
    };

    void checkRelationship();
  }, [user, targetUserId]);

  // Load pending friend requests
  useEffect(() => {
    if (!user) return;

    const loadFriendRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('friend_requests')
          .select('*')
          .eq('receiver_id', user.id)
          .eq('status', 'pending');

        if (error) throw error;
        
        // Get sender profiles separately to avoid relation issues
        const requestsWithSenders = await Promise.all(
          (data || []).map(async (request) => {
            const { data: senderData } = await supabase
              .from('public_profiles')
              .select('id, full_name, avatar_url')
              .eq('id', request.sender_id)
              .single();
            
            return {
              ...request,
              status: request.status as 'pending' | 'accepted' | 'declined' | 'cancelled',
              sender: senderData
            };
          })
        );
        
        setPendingFriendRequests(requestsWithSenders);
      } catch (error) {
        console.error('Error loading friend requests:', error);
      }
    };

    void loadFriendRequests();
  }, [user, refreshTick]);

  // Load accepted connection requests that *this* user sent, so the sender is
  // notified when the other person accepts. Already-seen ones are filtered out.
  useEffect(() => {
    if (!user) {
      setAcceptedConnectionNotifications([]);
      return;
    }

    const loadAcceptedConnections = async () => {
      try {
        const { data, error } = await supabase
          .from('friend_requests')
          .select('*')
          .eq('sender_id', user.id)
          .eq('status', 'accepted');

        if (error) throw error;

        const seenIds = new Set(getSeenAcceptedIds(user.id));
        const unseen = (data || []).filter((request) => !seenIds.has(request.id));

        const withReceivers = await Promise.all(
          unseen.map(async (request) => {
            const { data: receiverData } = await supabase
              .from('public_profiles')
              .select('id, full_name, avatar_url')
              .eq('id', request.receiver_id)
              .single();

            return {
              id: request.id,
              receiver_id: request.receiver_id,
              updated_at: request.updated_at,
              receiver: receiverData,
            };
          })
        );

        setAcceptedConnectionNotifications(withReceivers);
      } catch (error) {
        console.error('Error loading accepted connections:', error);
      }
    };

    void loadAcceptedConnections();
  }, [user, refreshTick]);

  // Load pending follow requests
  useEffect(() => {
    if (!user) return;

    const loadFollowRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('user_follows')
          .select('*')
          .eq('following_id', user.id)
          .eq('status', 'pending');

        if (error) throw error;

        // Get follower profiles
        const requestsWithFollowers = await Promise.all(
          (data || []).map(async (request) => {
            const { data: followerData } = await supabase
              .from('public_profiles')
              .select('id, full_name, avatar_url, username')
              .eq('id', request.follower_id)
              .single();

            return {
              ...request,
              status: 'pending' as const,
              follower: followerData
            };
          })
        );

        setPendingFollowRequests(requestsWithFollowers);
      } catch (error) {
        console.error('Error loading follow requests:', error);
      }
    };

    void loadFollowRequests();
  }, [user, refreshTick]);

  const followUser = async () => {
    if (!user || !targetUserId || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
          status: 'pending'
        });

      if (error) throw error;

      setFollowStatus('pending');
      toast.success('Follow request sent');
    } catch (error) {
      console.error('Error following user:', error);
      toast.error('Failed to follow user');
    } finally {
      setLoading(false);
    }
  };

  const unfollowUser = async () => {
    if (!user || !targetUserId || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (error) throw error;

      setFollowStatus('none');
      toast.success('User unfollowed successfully');
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast.error('Failed to unfollow user');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (message?: string) => {
    if (!user || !targetUserId || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: targetUserId,
          message: message,
          status: 'pending'
        });

      if (error) throw error;

      setFriendStatus('pending_sent');
      toast.success('Connection request sent');
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send connection request');
    } finally {
      setLoading(false);
    }
  };

  const respondToFriendRequest = async (requestId: string, action: 'accept' | 'decline') => {
    if (!user || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({
          status: action === 'accept' ? 'accepted' : 'declined'
        })
        .eq('id', requestId)
        .eq('receiver_id', user.id);

      if (error) throw error;

      setPendingFriendRequests(prev => prev.filter(req => req.id !== requestId));

      // Let other hook instances (e.g. the nav badge) refresh their counts, and
      // surface the acceptance to the original sender on their next load.
      emitConnectionUpdate();

      if (action === 'accept') {
        setFriendStatus('friends');
        toast.success('Connection request accepted');
      } else {
        toast.success('Connection request declined');
      }
    } catch (error) {
      console.error('Error responding to friend request:', error);
      toast.error(`Failed to ${action} connection request`);
    } finally {
      setLoading(false);
    }
  };

  const cancelFriendRequest = async () => {
    if (!user || !targetUserId || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'cancelled' })
        .eq('sender_id', user.id)
        .eq('receiver_id', targetUserId)
        .eq('status', 'pending');

      if (error) throw error;

      setFriendStatus('none');
      toast.success('Connection request cancelled');
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      toast.error('Failed to cancel connection request');
    } finally {
      setLoading(false);
    }
  };

  const acceptFollowRequest = async (followerId: string) => {
    if (!user || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_follows')
        .update({ status: 'accepted' })
        .eq('follower_id', followerId)
        .eq('following_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      // Remove from pending requests
      setPendingFollowRequests(prev => prev.filter(req => req.follower_id !== followerId));

      toast.success('Follow request accepted');
    } catch (error) {
      console.error('Error accepting follow request:', error);
      toast.error('Failed to accept follow request');
    } finally {
      setLoading(false);
    }
  };

  const rejectFollowRequest = async (followerId: string) => {
    if (!user || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      // Remove from pending requests
      setPendingFollowRequests(prev => prev.filter(req => req.follower_id !== followerId));

      toast.success('Follow request rejected');
    } catch (error) {
      console.error('Error rejecting follow request:', error);
      toast.error('Failed to reject follow request');
    } finally {
      setLoading(false);
    }
  };

  // Acknowledge "your connection request was accepted" notifications so they
  // stop counting toward the badge (persisted per user, broadcast to siblings).
  const markAcceptedConnectionsSeen = () => {
    if (!user || acceptedConnectionNotifications.length === 0) return;
    addSeenAcceptedIds(user.id, acceptedConnectionNotifications.map((n) => n.id));
    setAcceptedConnectionNotifications([]);
    emitConnectionUpdate();
  };

  return {
    followStatus,
    friendStatus,
    loading,
    pendingFriendRequests,
    pendingFollowRequests,
    acceptedConnectionNotifications,
    connectionNotificationCount: pendingFriendRequests.length + acceptedConnectionNotifications.length,
    followUser,
    unfollowUser,
    sendFriendRequest,
    respondToFriendRequest,
    cancelFriendRequest,
    acceptFollowRequest,
    rejectFollowRequest,
    markAcceptedConnectionsSeen
  };
};
