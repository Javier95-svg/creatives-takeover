import { lazy, Suspense, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceRollout } from '@/contexts/WorkspaceRolloutContext';
import { isWorkspaceRoute, WORKSPACE_HOME_CONCEPT } from '@/lib/workspacePolicy';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { isProjectSubdomain } from '@/lib/demoStudio/publishedHost';

const WorkspaceLive = lazy(() => import('./workspace/WorkspaceLive'));
const PulseHomeLive = lazy(() => import('./pulse/PulseHomeLive'));
const WorkspaceOnboardingGate = lazy(() => import('@/pages/AppEntry'));

export default function WorkspaceRouteFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const { enabled, pending } = useWorkspaceRollout();
  const applicable = !isProjectSubdomain() && isWorkspaceRoute(pathname);
  if (applicable && (loading || (user && pending))) return <div role="status" className="min-h-screen bg-background p-8 text-foreground">Loading your workspace…</div>;
  if (!user || !enabled || !applicable) return <>{children}</>;
  return <RouteErrorBoundary routeName="Guided Journey"><Suspense fallback={<div role="status" className="min-h-screen bg-background p-8 text-foreground">Loading your workspace…</div>}>
    <WorkspaceLive key={user.id} home={pathname === '/'}>{pathname === '/' ? <WorkspaceOnboardingGate><PulseHomeLive concept={WORKSPACE_HOME_CONCEPT} /></WorkspaceOnboardingGate> : children}</WorkspaceLive>
  </Suspense></RouteErrorBoundary>;
}
