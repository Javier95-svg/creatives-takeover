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
  const previous = useRef(user?.id);
  useLayoutEffect(() => {
    if (previous.current !== user?.id) {
      void queryClient.cancelQueries();
      queryClient.clear();
      previous.current = user?.id;
    }
  }, [user?.id, queryClient]);
  const enabled = workspaceEligible(user?.id, loading, released, hasApplicationConfig);
  return <Context.Provider value={{ enabled, pending: loading }}>{children}</Context.Provider>;
}
