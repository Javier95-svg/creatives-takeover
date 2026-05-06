import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

import DashboardPreview from '@/components/DashboardPreview';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardNavigationProvider } from '@/contexts/DashboardNavigationContext';
import { DashboardDataProvider, useDashboardData } from '@/contexts/DashboardDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useActivationGate } from '@/hooks/useActivationGate';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import {
  shouldRedirectToGuidedOnboarding,
  shouldRedirectToSetupQuiz,
} from '@/lib/guidedOnboarding';
import { cn } from '@/lib/utils';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTabsHost } from './DashboardTabsHost';
import { TaskCountContext } from './TaskCountContext';

const DASHBOARD_MAX_WIDTH = 'max-w-7xl';

function DashboardFrame() {
  const navigate = useNavigate();
  const { incompleteTaskCount } = useDashboardData();

  return (
    <TaskCountContext.Provider value={incompleteTaskCount}>
      <SidebarProvider>
        <DashboardNavigationProvider>
          <DashboardSidebar />
          <SidebarInset>
            <div className="relative min-h-screen overflow-hidden bg-[#090a0f] text-slate-100">
              <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
                <div className={cn('container mx-auto flex items-start justify-between px-4 pt-4 sm:px-6', DASHBOARD_MAX_WIDTH)}>
                  <div className="pointer-events-auto flex items-start gap-4">
                    <SidebarTrigger className="rounded-full border border-white/10 bg-slate-950/80 text-slate-200 shadow-xl shadow-black/20 backdrop-blur-md hover:bg-white/[0.06]" />
                  </div>
                  <button
                    onClick={() => navigate('/')}
                    className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm font-medium text-slate-400 shadow-xl shadow-black/20 backdrop-blur-md transition-colors hover:border-cyan-400/30 hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    aria-label="Exit dashboard and return to platform"
                    type="button"
                  >
                    <span>Platform</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-[#090a0f]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.09),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(244,114,182,0.07),transparent_30%)]" />
                <div
                  className="absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
                    backgroundSize: '56px 56px',
                  }}
                />
              </div>

              <div className={cn('relative z-10 container mx-auto px-4 pb-24 pt-24 sm:px-6', DASHBOARD_MAX_WIDTH)}>
                <DashboardTabsHost />
              </div>
            </div>
          </SidebarInset>
        </DashboardNavigationProvider>
      </SidebarProvider>
    </TaskCountContext.Provider>
  );
}

export function DashboardShell() {
  const { user } = useAuth();
  const { checkFeatureAccess } = useFeatureGating();
  const activationGate = useActivationGate();
  const navigate = useNavigate();
  const [profileLoading, setProfileLoading] = useState(true);
  const validatedUserIdRef = useRef<string | null>(null);
  const userId = user?.id ?? null;
  const userCreatedAt = user?.created_at ?? null;

  useEffect(() => {
    let isCancelled = false;

    if (!userId) {
      validatedUserIdRef.current = null;
      setProfileLoading(false);
      return () => {
        isCancelled = true;
      };
    }

    if (validatedUserIdRef.current === userId) {
      setProfileLoading(false);
      return () => {
        isCancelled = true;
      };
    }

    const loadDashboardProfile = async () => {
      setProfileLoading(true);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, dashboard_bootstrap_source, quiz_completed, user_preferences')
        .eq('id', userId)
        .single();

      if (isCancelled) return;

      if (error) {
        console.error('Error loading dashboard profile:', error);
        setProfileLoading(false);
        return;
      }

      if (shouldRedirectToGuidedOnboarding(profile)) {
        navigate('/onboarding', { replace: true });
        return;
      }

      if (shouldRedirectToSetupQuiz(profile)) {
        navigate('/setup-quiz', { replace: true });
        return;
      }

      validatedUserIdRef.current = userId;
      setProfileLoading(false);
    };

    void loadDashboardProfile();

    return () => {
      isCancelled = true;
    };
  }, [navigate, userId]);

  useEffect(() => {
    if (!userId || !userCreatedAt || !activationGate.shouldEnforceGate) return;

    const accountAgeMs = Date.now() - new Date(userCreatedAt).getTime();
    const isNewUser = accountAgeMs < 24 * 60 * 60 * 1000;
    if (!isNewUser) return;

    toast.info('Complete your first action to unlock your full dashboard.');
    const timer = setTimeout(() => {
      navigate(activationGate.redirectUrl, { replace: true });
    }, 1500);
    return () => clearTimeout(timer);
  }, [activationGate.redirectUrl, activationGate.shouldEnforceGate, navigate, userCreatedAt, userId]);

  if (!user) {
    return (
      <>
        <Helmet>
          <title>Dashboard Preview - Creatives Takeover</title>
          <meta name="description" content="Preview the Creatives Takeover dashboard. Sign up to access BizMap AI progress tracking, business plans, community analytics, and project timeline management." />
        </Helmet>
        <DashboardPreview />
      </>
    );
  }

  if (activationGate.loading || profileLoading) {
    return <DashboardSkeleton />;
  }

  let access;
  try {
    access = checkFeatureAccess('dashboard_access');
  } catch (error) {
    console.error('Error checking dashboard access in render:', error);
    access = { hasAccess: false };
  }

  if (!access.hasAccess) {
    return (
      <>
        <Helmet>
          <title>Dashboard Preview - Creatives Takeover</title>
          <meta name="description" content="Preview the Creatives Takeover dashboard. Sign up to access BizMap AI progress tracking, business plans, community analytics, and project timeline management." />
        </Helmet>
        <DashboardPreview />
      </>
    );
  }

  return (
    <ErrorBoundary>
      <DashboardDataProvider>
        <DashboardFrame />
      </DashboardDataProvider>
    </ErrorBoundary>
  );
}

export default DashboardShell;
