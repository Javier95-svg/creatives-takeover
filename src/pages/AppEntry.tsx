import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceRollout } from '@/contexts/WorkspaceRolloutContext';
import { supabase } from '@/integrations/supabase/client';
import { shouldRedirectToGuidedOnboarding } from '@/lib/guidedOnboarding';
import { defaultWorkspaceDestination } from '@/lib/workspacePolicy';

export function WorkspaceOnboardingGate({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth();
  const { enabled, pending } = useWorkspaceRollout();
  const profile = useQuery({ queryKey: ['workspace-entry', user?.id], enabled: Boolean(user) && enabled && !pending,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.schema('public').from('profiles').select('onboarding_completed, dashboard_bootstrap_source, user_preferences').eq('id', user!.id).abortSignal(signal).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Account profile unavailable');
      return data;
    },
  });
  if (loading || pending) return <div role="status" className="min-h-screen bg-background p-8 text-foreground">Loading your workspace…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!enabled) return <Navigate to="/dashboard" replace />;
  if (profile.isPending) return <div role="status" className="p-8">Loading your workspace…</div>;
  if (profile.isError) return <div role="alert" className="p-8">Could not load your account. <button onClick={() => void profile.refetch()} className="underline">Retry</button></div>;
  if (shouldRedirectToGuidedOnboarding(profile.data)) return <Navigate to="/onboarding?return=%2Fapp-entry" replace />;
  return children ? <>{children}</> : <Navigate to={defaultWorkspaceDestination(enabled)} replace />;
}

export default WorkspaceOnboardingGate;
