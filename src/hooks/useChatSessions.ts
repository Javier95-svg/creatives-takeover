import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ChatSessionRow = Database['public']['Tables']['chat_sessions']['Row'];

export interface ChatSession {
  id: string;
  title: string;
  user_id: string;
  current_step: number;
  is_completed: boolean;
  is_pinned?: boolean;
  answers: Record<string, string>;
  created_at: string;
  updated_at: string;
  launch_report?: string;
}

export const useChatSessions = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionIdState, setCurrentSessionIdState] = useState<string | null>(null);
  const { user } = useAuth();
  
  const setCurrentSessionId = useCallback((sessionId: string | null) => {
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatSessions.ts:25',message:'setCurrentSessionId called',data:{newSessionId:sessionId,previousSessionId:currentSessionIdState,hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    setCurrentSessionIdState(sessionId);
  }, [currentSessionIdState, user]);
  
  const currentSessionId = currentSessionIdState;

  const loadSessions = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatSessions.ts:28',message:'loadSessions called',data:{hasUser:!!user,userId:user?.id,currentSessionIdBefore:currentSessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!user) {
      setSessions([]);
      setLoading(false);
      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatSessions.ts:30',message:'loadSessions no user',data:{currentSessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading chat sessions:', error);
        toast.error('Failed to load chat history');
        // #region agent log
        fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatSessions.ts:42',message:'loadSessions error',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return;
      }

      const transformedData = (data || []).map((session: ChatSessionRow): ChatSession => ({
        ...session,
        title: session.title || 'New Business Idea',
        answers: (session.answers as Record<string, string>) || {},
        launch_report: session.launch_report || undefined
      }));
      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatSessions.ts:54',message:'loadSessions success',data:{sessionCount:transformedData.length,currentSessionIdBefore:currentSessionId,willSetToNull:transformedData.length===0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setSessions(transformedData);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createNewSession = useCallback(async (title?: string): Promise<string | null> => {
    if (!user) {
      toast.error('Please sign in to save your conversations');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: title || 'New Business Idea',
          current_step: 0,
          is_completed: false,
          answers: {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        toast.error('Failed to create new chat');
        return null;
      }

      const transformedSession: ChatSession = {
        ...data,
        title: data.title || 'New Business Idea',
        answers: (data.answers as Record<string, string>) || {},
        launch_report: data.launch_report || undefined
      };
      setSessions(prev => [transformedSession, ...prev]);
      setCurrentSessionIdState(data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create new chat');
      return null;
    }
  }, [user]);

  const updateSession = useCallback(async (
    sessionId: string, 
    updates: Partial<Pick<ChatSession, 'title' | 'current_step' | 'is_completed' | 'answers' | 'launch_report'>>
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating session:', error);
        return;
      }

      setSessions(prev =>
        prev.map(session =>
          session.id === sessionId
            ? { ...session, ...updates, updated_at: new Date().toISOString() }
            : session
        )
      );
    } catch (error) {
      console.error('Error updating session:', error);
    }
  }, [user]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) {
      toast.error('Please sign in to delete chats');
      return;
    }

    try {
      // If deleted session was current, clear it first
      const wasCurrentSession = currentSessionId === sessionId;
      if (wasCurrentSession) {
        setCurrentSessionIdState(null);
      }

      // Optimistically update local state immediately for better UX
      setSessions(prev => prev.filter(session => session.id !== sessionId));

      // Delete from database
      // Note: We don't filter by user_id here - RLS policies handle permissions
      // Regular users can only delete their own chats, admins can delete any chat
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Error deleting session:', error);
        // Revert optimistic update on error
        await loadSessions();
        throw new Error(error.message || 'Failed to delete chat');
      }

      // Reload sessions from database to ensure consistency
      await loadSessions();

      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete chat';
      toast.error(errorMessage);
      // Reload on error to ensure UI consistency
      await loadSessions();
      throw error; // Re-throw so caller can handle it
    }
  }, [user, currentSessionId, loadSessions]);

  const togglePinSession = useCallback(async (sessionId: string) => {
    if (!user) {
      toast.error('Please sign in to pin chats');
      return;
    }

    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      toast.error('Session not found');
      return;
    }

    const newPinnedState = !session.is_pinned;

    try {
      // Optimistically update UI
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId ? { ...s, is_pinned: newPinnedState } : s
        )
      );

      const { error } = await supabase
        .from('chat_sessions')
        .update({ is_pinned: newPinnedState })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error toggling pin:', error);
        // Revert optimistic update
        setSessions(prev =>
          prev.map(s =>
            s.id === sessionId ? { ...s, is_pinned: !newPinnedState } : s
          )
        );
        toast.error('Failed to update chat');
        return;
      }

      toast.success(newPinnedState ? 'Chat pinned' : 'Chat unpinned');
    } catch (error) {
      console.error('Error toggling pin:', error);
      // Revert optimistic update
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId ? { ...s, is_pinned: !newPinnedState } : s
        )
      );
      toast.error('Failed to update chat');
    }
  }, [user, sessions]);

  const getSession = useCallback((sessionId: string): ChatSession | null => {
    return sessions.find(session => session.id === sessionId) || null;
  }, [sessions]);

  // Cache to prevent refetching on every mount
  const hasLoadedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatSessions.ts:243',message:'user effect triggered',data:{hasUser:!!user,userId:user?.id,currentSessionId,hasLoaded:hasLoadedRef.current,lastUserId:lastUserIdRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Only load if user changed or we haven't loaded before
    if (user && (!hasLoadedRef.current || lastUserIdRef.current !== user.id)) {
      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatSessions.ts:246',message:'calling loadSessions from effect',data:{userId:user.id,currentSessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      loadSessions();
      hasLoadedRef.current = true;
      lastUserIdRef.current = user.id;
    } else if (!user) {
      hasLoadedRef.current = false;
      lastUserIdRef.current = null;
      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatSessions.ts:252',message:'user cleared',data:{currentSessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }
  }, [user?.id]); // Only depend on user id

  return {
    sessions,
    loading,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    updateSession,
    deleteSession,
    togglePinSession,
    getSession,
    loadSessions
  };
};