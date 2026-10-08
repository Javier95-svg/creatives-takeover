import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { trackRetentionEvent } from '@/lib/retentionSystem';

// Pages render the shell, so their own handlers sit outside any provider it
// could offer. A module-level opener lets any component ask the mounted join
// dialog (JoinGateProvider) to show.
const listeners = new Set<(intent: string) => void>();

export function subscribeJoinPrompt(open: (intent: string) => void) {
  listeners.add(open);
  return () => { listeners.delete(open); };
}

/** Returns true when the viewer can act; otherwise shows the join prompt and returns false. */
export function useRequireAccount() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  return useCallback((intent: string) => {
    if (user) return true;
    listeners.forEach((open) => open(intent));
    void trackRetentionEvent('community_join_prompt_shown', { intent, path: pathname });
    return false;
  }, [user, pathname]);
}
