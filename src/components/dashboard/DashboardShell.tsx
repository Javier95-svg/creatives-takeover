import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

import DashboardPreview from '@/components/DashboardPreview';
import { Day1Welcome, type Day1Profile } from '@/components/dashboard/Day1Welcome';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardNavigationProvider } from '@/contexts/DashboardNavigationContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useActivationGate } from '@/hooks/useActivationGate';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useSubscription } from '@/hooks/useSubscription';
import { normalizePlan, resolveDashboardMode } from '@/config/planPermissions';
import { shouldRedirectToGuidedOnboarding } from '@/lib/guidedOnboarding';
import { shouldShowOnboardingPathGate } from '@/lib/onboardingPath';
import { OnboardingPathGate } from '@/components/onboarding/OnboardingPathGate';
import { cn } from '@/lib/utils';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardCommandSignalStrip } from './DashboardCommandSignalStrip';
import { DashboardStreakChip } from './DashboardStreakChip';
import { DashboardTabsHost } from './DashboardTabsHost';
import { DashboardMetricsContext, TaskCountContext, type DashboardWeeklyMetrics } from './TaskCountContext';
import { ModeToggle, type DashboardMode } from './modes/ModeToggle';

const DASHBOARD_MAX_WIDTH = 'max-w-7xl';

function DashboardFrame() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dashboardMetrics = useDashboardMetrics();
  const { subscriptionData } = useSubscription();
  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const dashboardMode = resolveDashboardMode(currentPlan) as DashboardMode;
  const isHome = pathname === '/dashboard';
  const incompleteTaskCount = Math.max(dashboardMetrics.totalTasksToday - dashboardMetrics.tasksCompletedToday, 0);

  useEffect(() => {
    if (pathname === '/dashboard/weekly-mission') {
      navigate('/dashboard/routine', { replace: true });
    }
  }, [navigate, pathname]);

  const weeklyMetrics = useMemo<DashboardWeeklyMetrics>(
    () => ({
      weeklyMissionGoal: dashboardMetrics.weeklyMissionGoal,
      weeklyMissionProgress: dashboardMetrics.weeklyMissionProgress,
      tasksCompletedThisWeek: dashboardMetrics.tasksCompletedThisWeek,
      totalTasksThisWeek: dashboardMetrics.totalTasksThisWeek,
    }),
    [
      dashboardMetrics.weeklyMissionGoal,
      dashboardMetrics.weeklyMissionProgress,
      dashboardMetrics.tasksCompletedThisWeek,
      dashboardMetrics.totalTasksThisWeek,
    ],
  );

  return (
    <TaskCountContext.Provider value={incompleteTaskCount}>
      <DashboardMetricsContext.Provider value={weeklyMetrics}>
      <SidebarProvider>
        <DashboardNavigationProvider>
          <DashboardSidebar />
          <SidebarInset>
            <div className="relative min-h-screen overflow-hidden bg-background">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-50">
                <div className={cn('container mx-auto grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 px-6 pt-4', DASHBOARD_MAX_WIDTH)}>
                  <div className="pointer-events-auto flex items-start gap-2">
                    <SidebarTrigger className="rounded-full border border-border/70 bg-background/88 shadow-sm backdrop-blur-md" />
                    <DashboardStreakChip />
                    {isHome ? (
                      <ModeToggle currentMode={dashboardMode} />
                    ) : null}
                  </div>
                  <div aria-hidden="true" />
                  <button
                    onClick={() => navigate('/')}
                    className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/88 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:border-primary/30 hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label="Exit dashboard and return to platform"
                    type="button"
                  >
                    <span>Platform</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-background" />
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 15% 20%, hsl(var(--primary) / 0.08), transparent 40%), radial-gradient(circle at 85% 30%, hsl(var(--accent) / 0.06), transparent 45%)',
                  }}
                />
                <div
                  className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
                    backgroundSize: '64px 64px',
                  }}
                />
              </div>

              <div className={cn('relative z-10 container mx-auto p-6 pb-24 pt-24', DASHBOARD_MAX_WIDTH)}>
                {!isHome ? <DashboardCommandSignalStrip /> : null}
                <DashboardTabsHost />
              </div>
            </div>
          </SidebarInset>
        </DashboardNavigationProvider>
      </SidebarProvider>
      </DashboardMetricsContext.Provider>
    </TaskCountContext.Provider>
  );
}

export function DashboardShell() {
  const { user } = useAuth();
  const { checkFeatureAccess } = useFeatureGating();
  const activationGate = useActivationGate();
  const navigate = useNavigate();
  const [profileLoading, setProfileLoading] = useState(true);
  const [day1Profile, setDay1Profile] = useState<Day1Profile | null>(null);
  const validatedUserIdRef = useRef<string | null>(null);
  const userId = user?.id ?? null;
  const userCreatedAt = user?.created_at ?? null;

  useEffect(() => {
    let isCancelled = false;

    if (!userId) {
      validatedUserIdRef.current = null;
      setDay1Profile(null);
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
        .select('dashboard_bootstrap_source, onboarding_completed, onboarding_steps_completed, quiz_completed, quiz_current_stage, quiz_biggest_challenge, user_preferences')
        .eq('id', userId)
        .single();

      if (isCancelled) return;

      if (error) {
        console.error('Error loading dashboard profile:', error);
        setProfileLoading(false);
        return;
      }

      setDay1Profile(profile);
      validatedUserIdRef.current = userId;
      setProfileLoading(false);
    };

    void loadDashboardProfile();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  const handleDay1ProfilePatch = (patch: Partial<Day1Profile>) => {
    setDay1Profile((current) => (current ? { ...current, ...patch } : current));
  };

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

  // The onboarding quiz is the single path for new accounts: it records stage,
  // sector, country, and activation intent (dashboard personalization + mentor
  // matching), and its final step already routes into a first action — so it
  // must run before the path-chooser gate, which marks onboarding complete
  // without capturing any of that.
  if (day1Profile && shouldRedirectToGuidedOnboarding(day1Profile)) {
    return <Navigate to="/onboarding?source=dashboard_prompt" replace />;
  }

  // Task 4 path chooser remains as a fallback for accounts exempt from the
  // guided quiz (legacy profiles without the flag, icp_unlock bootstraps).
  if (day1Profile && shouldShowOnboardingPathGate(day1Profile)) {
    return <OnboardingPathGate profile={day1Profile} onProfilePatch={handleDay1ProfilePatch} />;
  }

  if (day1Profile && day1Profile.onboarding_completed !== true) {
    return <Day1Welcome profile={day1Profile} onProfilePatch={handleDay1ProfilePatch} />;
  }

  return (
    <ErrorBoundary>
      <DashboardFrame />
    </ErrorBoundary>
  );
}

export default DashboardShell;
