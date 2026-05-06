import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { ArrowRight, X } from 'lucide-react';
import { DailyGoalModal } from './DailyGoalModal';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardInitialization } from '@/hooks/useDashboardInitialization';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DashboardMode } from './modes/ModeToggle';
import { RookieModeView, StarterModeView, RisingModeView, ProModeView } from './modes/TierDashboardViews';
import { useActiveSection } from '@/hooks/useActiveSection';
import { ReactNode } from 'react';
import { getDashboardModeConfig, normalizePlan, resolveDashboardMode } from '@/config/planPermissions';
import { useSubscription } from '@/hooks/useSubscription';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { DailyPromptResumeCard } from './DailyPromptResumeCard';
import { useDashboardDailyPrompt } from '@/hooks/useDashboardDailyPrompt';
import { DashboardAccountabilityHero } from './DashboardAccountabilityHero';
import { IcpCompletionHandoffBanner } from './IcpCompletionHandoffBanner';
import { WelcomeBackBanner } from './WelcomeBackBanner';
import { StageBadge } from './StageBadge';
import { useAssignedStage } from '@/hooks/useAssignedStage';
import { UpgradeTriggerProvider } from '@/contexts/UpgradeTriggerContext';
import { UpgradeTriggerBanner } from './UpgradeTriggerBanner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

// Internal wrapper component that uses the navigation context
interface DashboardContentWrapperProps {
  sectionIds: string[];
  children: ReactNode;
}

const DashboardContentWrapper = ({ sectionIds, children }: DashboardContentWrapperProps) => {
  useActiveSection(sectionIds);

  return <>{children}</>;
};

export const PersonalizedDashboardV2 = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isInitializing } = useDashboardInitialization();
  const { subscriptionData } = useSubscription();
  const assignedStage = useAssignedStage();
  const dashboardMetrics = useDashboardMetrics();
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [firstVisitDismissed, setFirstVisitDismissed] = useState(() => {
    try { return localStorage.getItem(`first_visit_dismissed_${user?.id}`) === 'true'; }
    catch { return false; }
  });

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('first_login_at').eq('id', user.id).single().then(({ data }) => {
      if (!data?.first_login_at) return;
      const elapsed = (Date.now() - new Date(data.first_login_at).getTime()) / 1000;
      if (elapsed <= 300) setIsFirstVisit(true);
    });
  }, [user?.id]);

  const handleDismissFirstVisit = () => {
    setFirstVisitDismissed(true);
    try { localStorage.setItem(`first_visit_dismissed_${user?.id}`, 'true'); } catch { /* ignore */ }
  };
  const {
    data,
    loading,
    trackActivity,
  } = usePersonalizedDashboard();
  const {
    showDailyGoal,
    modalMode,
    todaysCheckInId,
    currentStreak,
    hasUnresolvedPrompt,
    unresolvedMode,
    handleDailyGoalOpenChange,
    handlePromptResume,
    handleCheckInComplete,
  } = useDashboardDailyPrompt({
    onFirstView: () => {
      trackActivity('dashboard_view');
    },
  });

  const metrics = {
    streak: data?.stats?.currentStreak || currentStreak,
    tasksCompletedToday: dashboardMetrics.tasksCompletedToday,
    totalTasksToday: dashboardMetrics.totalTasksToday,
    weeklyProgress: dashboardMetrics.weeklyProgress,
    tasksCompletedThisWeek: dashboardMetrics.tasksCompletedThisWeek,
    totalTasksThisWeek: dashboardMetrics.totalTasksThisWeek,
    activeSprints: data?.stats?.activeSprints || 0,
    completedSessions: data?.stats?.completedSessions || 0,
    totalCheckIns: data?.stats?.totalCheckIns || 0,
  };
  const currentPlan = normalizePlan(subscriptionData.subscription_tier);
  const dashboardMode = resolveDashboardMode(currentPlan) as DashboardMode;
  const modeConfig = getDashboardModeConfig(dashboardMode);

  if ((loading || dashboardMetrics.isLoading || isInitializing) && !data?.profile) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-40 bg-muted rounded-lg" />
            <div className="h-40 bg-muted rounded-lg" />
            <div className="h-40 bg-muted rounded-lg" />
          </div>
        </div>
        {isInitializing && (
          <div className="text-center text-muted-foreground">
            Setting up your dashboard...
          </div>
        )}
      </div>
    );
  }

  const { profile } = data || { profile: null };

  // Determine greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const founderName = profile?.full_name?.split(' ')[0] || 'Founder';
  const tierViewSharedProps = {
    userId: user?.id || '',
    founderName,
    startupName: profile?.startup_name ?? null,
    creativeNiche: profile?.creative_niche,
    businessStage: profile?.business_stage,
    recommendations: data?.recommendations || [],
    icpSummary: data?.primaryIcp?.summary ?? null,
    ...metrics,
  };

  return (
    <ErrorBoundary>
      <UpgradeTriggerProvider>
        <DashboardContentWrapper sectionIds={modeConfig.sectionIds}>
          <div className="space-y-8">
            {hasUnresolvedPrompt ? (
              <DailyPromptResumeCard
                mode={unresolvedMode}
                onResume={handlePromptResume}
              />
            ) : null}

            {isFirstVisit && !firstVisitDismissed && (
              <div className="relative flex items-start justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground font-space-grotesk">
                    Welcome, {founderName}. Your dashboard is ready.
                  </p>
                  {assignedStage.meta && (
                    <p className="text-sm text-muted-foreground">
                      You are in Stage {assignedStage.stage}: {assignedStage.meta.name}. Here is what matters most right now.
                    </p>
                  )}
                  {assignedStage.meta?.topFocus?.[0] && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => { handleDismissFirstVisit(); navigate(assignedStage.meta!.topFocus[0].href); }}
                    >
                      {assignedStage.meta.topFocus[0].label}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
                <button
                  onClick={handleDismissFirstVisit}
                  className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Dismiss welcome banner"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div>
              <h1 className="font-space-grotesk text-3xl sm:text-4xl font-semibold tracking-tight">
                {greeting}, {founderName}
              </h1>
              <p className="text-muted-foreground mt-1">
                {modeConfig.subtitle}
              </p>
            </div>

            <IcpCompletionHandoffBanner
              primaryIcp={data?.primaryIcp ?? null}
              recommendations={data?.recommendations || []}
            />

            <WelcomeBackBanner />

            <StageBadge stage={assignedStage} />

            <DashboardAccountabilityHero
              founderName={founderName}
              businessStage={profile?.business_stage}
              currentStreak={metrics.streak}
            />

            <UpgradeTriggerBanner />

            {dashboardMode === 'rookie' && <RookieModeView {...tierViewSharedProps} />}
            {dashboardMode === 'starter' && <StarterModeView {...tierViewSharedProps} />}
            {dashboardMode === 'rising' && <RisingModeView {...tierViewSharedProps} />}
            {dashboardMode === 'pro' && <ProModeView {...tierViewSharedProps} />}
          </div>

          <DailyGoalModal
            open={showDailyGoal}
            onOpenChange={handleDailyGoalOpenChange}
            currentStreak={currentStreak}
            mode={modalMode}
            todaysCheckInId={todaysCheckInId}
            onCheckInComplete={handleCheckInComplete}
          />
        </DashboardContentWrapper>
      </UpgradeTriggerProvider>
    </ErrorBoundary>
  );
};
