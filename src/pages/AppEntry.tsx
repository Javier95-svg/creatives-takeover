import { Navigate } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceRollout } from '@/contexts/WorkspaceRolloutContext';
import { supabase } from '@/integrations/supabase/client';
import { shouldRedirectToGuidedOnboarding } from '@/lib/guidedOnboarding';
import { defaultWorkspaceDestination } from '@/lib/workspacePolicy';
import { WorkspaceSkeleton } from '@/components/workspace/WorkspaceSkeleton';
import { clearOnboardingSettled, isOnboardingSettled, markOnboardingSettled } from '@/lib/onboardingSettled';

export function WorkspaceOnboardingGate({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth();
  const { enabled, pending } = useWorkspaceRollout();
  const profile = useQuery({ queryKey: ['workspace-entry', user?.id], enabled: Boolean(user) && enabled && !pending,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.schema('public').from('profiles').select('onboarding_completed, dashboard_bootstrap_source, user_preferences, user_type').eq('id', user!.id).abortSignal(signal).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Account profile unavailable');
      return data;
    },
  });

  // This gate is the second blocking round trip on the way in, after the
  // session restore. Its answer stops changing once somebody finishes
  // onboarding, so it is remembered and the wait is paid once per browser
  // rather than on every load. The query still runs and still redirects if it
  // disagrees, so a remembered answer can only ever save a wait.
  const redirectToOnboarding = profile.data ? shouldRedirectToGuidedOnboarding(profile.data) : false;
  useEffect(() => {
    if (!profile.data || !user) return;
    if (redirectToOnboarding) clearOnboardingSettled(user.id);
    else markOnboardingSettled(user.id);
  }, [profile.data, redirectToOnboarding, user]);

  if (loading || pending) return <WorkspaceSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (!enabled) return <Navigate to="/dashboard" replace />;
  if (profile.isPending && !isOnboardingSettled(user.id)) return <WorkspaceSkeleton />;
  // An error only blocks an account we have never cleared. One that has been
  // through onboarding should not lose its workspace to a failed profile read.
  if (profile.isError && !isOnboardingSettled(user.id)) return <div role="alert" className="p-8">Could not load your account. <button onClick={() => void profile.refetch()} className="underline">Retry</button></div>;
  if (redirectToOnboarding) return <Navigate to="/onboarding?return=%2Fapp-entry" replace />;
  return children ? <>{children}</> : <Navigate to={defaultWorkspaceDestination(enabled)} replace />;
}

export default WorkspaceOnboardingGate;
