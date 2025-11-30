import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface CollaborationSession {
  id: string;
  resource_type: string;
  resource_id: string;
  created_by: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserPresence {
  id: string;
  user_id: string;
  session_id: string;
  cursor_position?: any;
  is_active: boolean;
  last_seen_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface LiveComment {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  context_path?: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

export const useCollaboration = (resourceType: string, resourceId: string) => {
  const { user } = useAuth();
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeChannels, setRealtimeChannels] = useState<RealtimeChannel[]>([]);

  // Create or join collaboration session
  const startCollaboration = useCallback(async () => {
    if (!user) return;

    try {
      // Check for existing active session
      const { data: existingSession } = await supabase
        .from('collaboration_sessions')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      let sessionData = existingSession;

      if (!sessionData) {
        // Create new session
        const { data: newSession, error } = await supabase
          .from('collaboration_sessions')
          .insert({
            resource_type: resourceType,
            resource_id: resourceId,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        sessionData = newSession;
      }

      setSession(sessionData);

      // Join session by updating presence
      const { error: presenceError } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          session_id: sessionData.id,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        });

      if (presenceError) throw presenceError;

      // Set up real-time subscriptions
      setupRealtimeSubscriptions(sessionData.id);

    } catch (error) {
      console.error('Error starting collaboration:', error);
    } finally {
      setLoading(false);
    }
  }, [user, resourceType, resourceId]);

  // Set up real-time subscriptions
  const setupRealtimeSubscriptions = useCallback((sessionId: string) => {
    // Subscribe to presence changes
    const presenceChannel = supabase
      .channel(`presence:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchActiveUsers(sessionId);
        }
      )
      .subscribe();

    // Subscribe to comment changes
    const commentsChannel = supabase
      .channel(`comments:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_comments',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchComments(sessionId);
        }
      )
      .subscribe();

    setRealtimeChannels([presenceChannel, commentsChannel]);
  }, []);

  // Fetch active users in session
  const fetchActiveUsers = useCallback(async (sessionId: string) => {
    const { data, error } = await supabase
      .from('user_presence')
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .eq('session_id', sessionId)
      .eq('is_active', true);

    if (!error && data) {
      setActiveUsers(data as any);
    }
  }, []);

  // Fetch comments for session
  const fetchComments = useCallback(async (sessionId: string) => {
    const { data, error } = await supabase
      .from('live_comments')
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data as any);
    }
  }, []);

  // Add a comment
  const addComment = useCallback(async (content: string, contextPath?: string) => {
    if (!session || !user) return;

    const { error } = await supabase
      .from('live_comments')
      .insert({
        session_id: session.id,
        user_id: user.id,
        content,
        context_path: contextPath,
      });

    if (error) {
      console.error('Error adding comment:', error);
    }
  }, [session, user]);

  // Resolve a comment
  const resolveComment = useCallback(async (commentId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('live_comments')
      .update({
        is_resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', commentId);

    if (error) {
      console.error('Error resolving comment:', error);
    }
  }, [user]);

  // Update cursor position
  const updateCursorPosition = useCallback(async (position: any) => {
    if (!session || !user) return;

    const { error } = await supabase
      .from('user_presence')
      .update({
        cursor_position: position,
        last_seen_at: new Date().toISOString(),
      })
      .eq('session_id', session.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating cursor position:', error);
    }
  }, [session, user]);

  // Leave collaboration session
  const leaveCollaboration = useCallback(async () => {
    if (!session || !user) return;

    // Update presence to inactive
    await supabase
      .from('user_presence')
      .update({
        is_active: false,
        last_seen_at: new Date().toISOString(),
      })
      .eq('session_id', session.id)
      .eq('user_id', user.id);

    // Clean up realtime subscriptions
    realtimeChannels.forEach(channel => {
      supabase.removeChannel(channel);
    });

    setSession(null);
    setActiveUsers([]);
    setComments([]);
    setRealtimeChannels([]);
  }, [session, user, realtimeChannels]);

  // Initialize collaboration when component mounts
  useEffect(() => {
    if (user && resourceType && resourceId) {
      startCollaboration();
    }

    return () => {
      leaveCollaboration();
    };
  }, [user, resourceType, resourceId, startCollaboration, leaveCollaboration]);

  // Fetch initial data when session is established
  useEffect(() => {
    if (session) {
      fetchActiveUsers(session.id);
      fetchComments(session.id);
    }
  }, [session, fetchActiveUsers, fetchComments]);

  return {
    session,
    activeUsers,
    comments,
    loading,
    startCollaboration,
    leaveCollaboration,
    addComment,
    resolveComment,
    updateCursorPosition,
  };
};