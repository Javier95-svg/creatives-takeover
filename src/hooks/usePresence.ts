import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logError, logInfo } from '@/lib/logger';

export type PresenceStatus = 'online' | 'offline' | 'away';

export interface PresenceData {
  status: PresenceStatus;
  lastSeenAt: string;
}

export const usePresence = (userIds: string[]) => {
  const { user } = useAuth();
  const [presenceData, setPresenceData] = useState<Record<string, PresenceData>>({});

  useEffect(() => {
    if (!user || userIds.length === 0) return;

    // Load initial presence data
    const loadPresence = async () => {
      try {
        const { data, error } = await supabase
          .from('user_presence')
          .select('*')
          .in('user_id', userIds);

        if (error) throw error;

        if (data) {
          const presenceMap: Record<string, PresenceData> = {};
          data.forEach(p => {
            presenceMap[p.user_id] = {
              status: p.status as PresenceStatus,
              lastSeenAt: p.last_seen_at
            };
          });
          setPresenceData(presenceMap);
          logInfo('Presence data loaded', { count: data.length });
        }
      } catch (error) {
        logError('Error loading presence data', error);
      }
    };

    void loadPresence();

    // Subscribe to presence changes
    const channel = supabase
      .channel('presence-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence',
        filter: `user_id=in.(${userIds.join(',')})`
      }, (payload) => {
        if (payload.new && 'user_id' in payload.new) {
          const newData = payload.new as any;
          setPresenceData(prev => ({
            ...prev,
            [newData.user_id]: {
              status: newData.status as PresenceStatus,
              lastSeenAt: newData.last_seen_at
            }
          }));
          logInfo('Presence updated', { userId: newData.user_id, status: newData.status });
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, userIds.join(',')]);

  // Update own presence
  const updatePresence = useCallback(async (status: PresenceStatus) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          status,
          last_seen_at: new Date().toISOString()
        });

      if (error) throw error;

      logInfo('Presence updated', { status });
    } catch (error) {
      logError('Error updating presence', error);
    }
  }, [user]);

  // Auto-update presence on mount/unmount and visibility changes
  useEffect(() => {
    void updatePresence('online');

    // Update presence every minute
    const interval = setInterval(() => {
      void updatePresence('online');
    }, 60000);

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        void updatePresence('away');
      } else {
        void updatePresence('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      void updatePresence('offline');
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updatePresence]);

  return { presenceData, updatePresence };
};
