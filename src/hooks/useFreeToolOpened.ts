import { useEffect, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { trackFreeToolOpened, type CoreToolName } from '@/lib/analytics';

/**
 * Fires the free-tool open events exactly once per mount, without waiting for
 * auth to resolve.
 *
 * Gating on `loading` would drop the fastest bounces, and those are precisely
 * the visits the open→input ratio needs in its denominator — /demo-studio/try
 * recorded only 8 of 34 visits while it gated on authLoading. So the count is
 * complete and `is_authenticated` is best-effort, flagged by `auth_resolved`.
 *
 * This replaces the previous `if (!user) captureEvent(...)` pattern, which
 * silently counted every logged-in visitor as an anonymous open: `user` is null
 * while AuthContext is still loading, so the guard passed before auth settled.
 */
export function useFreeToolOpened(tool: CoreToolName) {
  const { isAuthenticated, loading } = useAuth();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    trackFreeToolOpened(tool, { isAuthenticated, authResolved: !loading });
  }, [tool, isAuthenticated, loading]);
}
