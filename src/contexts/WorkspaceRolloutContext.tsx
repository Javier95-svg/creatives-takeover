import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { onPosthogReady } from '@/lib/analytics';
import { hasApplicationConfig } from '@/lib/hasApplicationConfig';
import { WORKSPACE_FLAG, workspaceEligible } from '@/lib/workspacePolicy';

const Context = createContext({ enabled: false, pending: true });
export const useWorkspaceRollout = () => useContext(Context);

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
  return <AccountDecision userId={user?.id} authLoading={loading}>{children}</AccountDecision>;
}

function AccountDecision({ userId, authLoading, children }: { userId?: string; authLoading: boolean; children: ReactNode }) {
  const [decision, setDecision] = useState<{ userId?: string; flag?: boolean; settled: boolean }>({ settled: false });
  useEffect(() => {
    if (!userId || authLoading || !hasApplicationConfig) { setDecision({ settled: false }); return; }
    setDecision({ userId, settled: false });
    let live = true;
    let detachFlags: (() => void) | undefined;
    // A missing/blocked analytics connection is legacy, never an endless spinner.
    const timeout = window.setTimeout(() => { if (live) setDecision({ userId, flag: false, settled: true }); }, 1500);
    const detach = onPosthogReady(client => {
      detachFlags?.();
      // Wait for refreshed flags for this authenticated identity; never reuse an
      // anonymous or previous account's cached positive flag.
      let registering = true;
      detachFlags = client.onFeatureFlags((_flags, _variants, context) => {
        if (registering || !live || client.get_distinct_id() !== userId) return;
        window.clearTimeout(timeout);
        setDecision({ userId, flag: !context?.errorsLoading && client.isFeatureEnabled(WORKSPACE_FLAG) === true, settled: true });
      });
      registering = false;
      client.reloadFeatureFlags();
    });
    return () => { live = false; window.clearTimeout(timeout); detach(); detachFlags?.(); };
  }, [userId, authLoading]);
  const matchesAccount = decision.userId === userId;
  const enabled = workspaceEligible(userId, authLoading, matchesAccount ? decision.flag : undefined, hasApplicationConfig);
  const pending = authLoading || Boolean(userId && hasApplicationConfig && (!matchesAccount || !decision.settled));
  return <Context.Provider value={{ enabled, pending }}>{children}</Context.Provider>;
}
