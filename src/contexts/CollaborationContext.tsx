import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface CollaborationContextType {
  isCollaborating: boolean;
  activeCollaborators: number;
  startCollaboration: (resourceType: string, resourceId: string) => void;
  stopCollaboration: () => void;
}

const CollaborationContext = createContext<CollaborationContextType>({
  isCollaborating: false,
  activeCollaborators: 0,
  startCollaboration: () => {},
  stopCollaboration: () => {},
});

export const useCollaborationContext = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaborationContext must be used within a CollaborationProvider');
  }
  return context;
};

interface CollaborationProviderProps {
  children: React.ReactNode;
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [activeCollaborators, setActiveCollaborators] = useState(0);
  const [currentSession, setCurrentSession] = useState<string | null>(null);

  const startCollaboration = async (resourceType: string, resourceId: string) => {
    if (!user) return;

    try {
      // Check for existing session
      const { data: existingSession } = await supabase
        .from('collaboration_sessions')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      let sessionId = existingSession?.id;

      if (!sessionId) {
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
        sessionId = newSession.id;
      }

      // Join session
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          session_id: sessionId,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        });

      setCurrentSession(sessionId);
      setIsCollaborating(true);

      // Subscribe to presence updates
      const presenceChannel = supabase
        .channel(`collaboration:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_presence',
            filter: `session_id=eq.${sessionId}`,
          },
          async () => {
            // Update active collaborators count
            const { data, error } = await supabase
              .from('user_presence')
              .select('id')
              .eq('session_id', sessionId)
              .eq('is_active', true);

            if (!error && data) {
              setActiveCollaborators(data.length);
            }
          }
        )
        .subscribe();

      // Store channel reference for cleanup
      (window as any).collaborationChannel = presenceChannel;

    } catch (error) {
      console.error('Error starting collaboration:', error);
    }
  };

  const stopCollaboration = async () => {
    if (!user || !currentSession) return;

    try {
      // Update presence to inactive
      await supabase
        .from('user_presence')
        .update({
          is_active: false,
          last_seen_at: new Date().toISOString(),
        })
        .eq('session_id', currentSession)
        .eq('user_id', user.id);

      // Clean up
      if ((window as any).collaborationChannel) {
        supabase.removeChannel((window as any).collaborationChannel);
        (window as any).collaborationChannel = null;
      }

      setIsCollaborating(false);
      setActiveCollaborators(0);
      setCurrentSession(null);

    } catch (error) {
      console.error('Error stopping collaboration:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCollaborating) {
        stopCollaboration();
      }
    };
  }, []);

  // Update presence periodically
  useEffect(() => {
    if (!isCollaborating || !currentSession || !user) return;

    const interval = setInterval(async () => {
      await supabase
        .from('user_presence')
        .update({
          last_seen_at: new Date().toISOString(),
        })
        .eq('session_id', currentSession)
        .eq('user_id', user.id);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isCollaborating, currentSession, user]);

  const value = {
    isCollaborating,
    activeCollaborators,
    startCollaboration,
    stopCollaboration,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};