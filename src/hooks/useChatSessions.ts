import { useState, useEffect, useCallback } from 'react';
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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { user } = useAuth();

  const loadSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
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
        return;
      }

      const transformedData = (data || []).map((session: ChatSessionRow): ChatSession => ({
        ...session,
        title: session.title || 'New Business Idea',
        answers: (session.answers as Record<string, string>) || {},
        launch_report: session.launch_report || undefined
      }));
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
      setCurrentSessionId(data.id);
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
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting session:', error);
        toast.error('Failed to delete chat');
        return;
      }

      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }

      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete chat');
    }
  }, [user, currentSessionId]);

  const togglePinSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const newPinnedState = !session.is_pinned;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ is_pinned: newPinnedState })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error toggling pin:', error);
        toast.error('Failed to update chat');
        return;
      }

      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId ? { ...s, is_pinned: newPinnedState } : s
        )
      );

      toast.success(newPinnedState ? 'Chat pinned' : 'Chat unpinned');
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update chat');
    }
  }, [user, sessions]);

  const getSession = useCallback((sessionId: string): ChatSession | null => {
    return sessions.find(session => session.id === sessionId) || null;
  }, [sessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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