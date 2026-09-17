import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { hasApplicationConfig } from '@/lib/hasApplicationConfig';
import { workspaceEligible, workspaceReleaseEnabled } from '@/lib/workspacePolicy';

const Context = createContext({ enabled: false, pending: true });
export const useWorkspaceRollout = () => useContext(Context);

// Released navigation cannot depend on analytics consent or network availability.
// Set VITE_GUIDED_JOURNEY_ENABLED=false and redeploy to restore the legacy layout.
const released = workspaceReleaseEnabled(import.meta.env.VITE_GUIDED_JOURNEY_ENABLED);

export function WorkspaceRolloutProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const previous = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    const next = user?.id;
    // `previous` is only empty before auth has resolved, so the first real id is
    // this load's hydration and not an account switch. Clearing there discarded
    // everything fetched during the auth bootstrap on every page load, and the
    // cache is memory-only, so a fresh load has nothing to leak anyway. A real
    // switch or a sign out still purges. AuthContext guards its own per-account
    // purge the same way.
    if (previous.current && previous.current !== next) {
      void queryClient.cancelQueries();
      queryClient.clear();
    }
    previous.current = next;
  }, [user?.id, queryClient]);
  const enabled = workspaceEligible(user?.id, loading, released, hasApplicationConfig);
  return <Context.Provider value={{ enabled, pending: loading }}>{children}</Context.Provider>;
}
