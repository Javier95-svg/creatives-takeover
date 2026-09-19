import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceRollout } from '@/contexts/WorkspaceRolloutContext';
import { isWorkspaceRoute, WORKSPACE_HOME_CONCEPT } from '@/lib/workspacePolicy';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { WorkspaceSkeleton } from '@/components/workspace/WorkspaceSkeleton';
import { isProjectSubdomain } from '@/lib/demoStudio/publishedHost';

// Named factories so the shell can be warmed before authentication resolves.
const importWorkspaceLive = () => import('./workspace/WorkspaceLive');
const importPulseHomeLive = () => import('./pulse/PulseHomeLive');
const importOnboardingGate = () => import('@/pages/AppEntry');

const WorkspaceLive = lazy(importWorkspaceLive);
const PulseHomeLive = lazy(importPulseHomeLive);
const WorkspaceOnboardingGate = lazy(importOnboardingGate);

export default function WorkspaceRouteFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const { enabled, pending } = useWorkspaceRollout();
  const applicable = !isProjectSubdomain() && isWorkspaceRoute(pathname);
  // The branch below renders none of the lazy tree, so the shell chunks used to
  // start downloading only once the session round trip had already finished.
  // Warming them here overlaps the two instead of queueing one behind the other.
  // Repeat calls reuse the in-flight module promise, so this costs one request.
  const warm = applicable && (loading || Boolean(user));
  const warmHome = warm && pathname === '/';
  useEffect(() => {
    if (!warm) return;
    void importWorkspaceLive();
    if (warmHome) {
      void importPulseHomeLive();
      void importOnboardingGate();
    }
  }, [warm, warmHome]);
  if (applicable && (loading || (user && pending))) return <WorkspaceSkeleton />;
  if (!user || !enabled || !applicable) return <>{children}</>;
  return <RouteErrorBoundary routeName="Guided Journey"><Suspense fallback={<WorkspaceSkeleton />}>
    <WorkspaceLive key={user.id} home={pathname === '/'}>{pathname === '/' ? <WorkspaceOnboardingGate><PulseHomeLive concept={WORKSPACE_HOME_CONCEPT} /></WorkspaceOnboardingGate> : children}</WorkspaceLive>
  </Suspense></RouteErrorBoundary>;
}
