import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { ArrowRight } from 'lucide-react';
import { DailyGoalModal } from './DailyGoalModal';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardInitialization } from '@/hooks/useDashboardInitialization';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ModeToggle, DashboardMode } from './modes/ModeToggle';
import { RookieModeView, StarterModeView, RisingModeView, ProModeView } from './modes/TierDashboardViews';
import { RetentionActionFeed } from './RetentionActionFeed';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardNavigationProvider } from '@/contexts/DashboardNavigationContext';
import { DashboardSidebar } from './DashboardSidebar';
import { useActiveSection } from '@/hooks/useActiveSection';
import { ReactNode } from 'react';
import { getDashboardModeConfig, normalizePlan, resolveDashboardMode } from '@/config/planPermissions';
import { useSubscription } from '@/hooks/useSubscription';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { DailyPromptResumeCard } from './DailyPromptResumeCard';
import { useDashboardDailyPrompt } from '@/hooks/useDashboardDailyPrompt';
import { DashboardAccountabilityHero } from './DashboardAccountabilityHero';
import { TaskCountContext } from './TaskCountContext';
import { IcpDashboardSummaryCard } from './IcpDashboardSummaryCard';
import { MyFilesSection } from './MyFilesSection';

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
  const dashboardMetrics = useDashboardMetrics();
  const {
    data,
    loading,
    trackActivity
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
  const incompleteTaskCount = Math.max(metrics.totalTasksToday - metrics.tasksCompletedToday, 0);
  const currentPlan = normalizePlan(subscriptionData.subscription_tier);
  const dashboardMode = resolveDashboardMode(currentPlan) as DashboardMode;
  const modeConfig = getDashboardModeConfig(dashboardMode);

  if (loading || isInitializing || dashboardMetrics.isLoading) {
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
    creativeNiche: profile?.creative_niche,
    businessStage: profile?.business_stage,
    recommendations: data?.recommendations || [],
    icpSummary: data?.primaryIcp?.summary ?? null,
    ...metrics,
  };

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <DashboardNavigationProvider>
          <TaskCountContext.Provider value={incompleteTaskCount}>
            <DashboardContentWrapper sectionIds={modeConfig.sectionIds}>
              <DashboardSidebar />
              <SidebarInset>
                <div className="min-h-screen relative overflow-hidden bg-background">
                  {/* Fixed Header with Exit Button and Mode Toggle */}
                  <div
                    style={{ top: 'var(--banner-height, 0)' } as React.CSSProperties}
                    className="fixed left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/60"
                  >
                    <div className="container mx-auto px-6 py-3 max-w-7xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <SidebarTrigger />
                          <ModeToggle currentMode={dashboardMode} />
                        </div>
                        <button
                          onClick={() => navigate('/')}
                          className="rounded-md border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center gap-2"
                          aria-label="Exit dashboard and return to platform"
                          type="button"
                        >
                          <span>Platform</span>
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Refined Background */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-background" />
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at 15% 20%, hsl(var(--primary) / 0.08), transparent 40%), radial-gradient(circle at 85% 30%, hsl(var(--accent) / 0.06), transparent 45%)'
                      }}
                    />
                    <div
                      className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
                      style={{
                        backgroundImage:
                          'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
                        backgroundSize: '64px 64px'
                      }}
                    />
                  </div>

                  {/* Dashboard Content */}
                  <div className="relative z-10 container mx-auto p-6 pb-24 space-y-8 max-w-7xl pt-24">
                    {hasUnresolvedPrompt ? (
                      // FIX(retention): dashboard — snoozed daily prompts now leave a pinned unresolved card so the habit loop still has a visible next step.
                      <DailyPromptResumeCard
                        mode={unresolvedMode}
                        onResume={handlePromptResume}
                      />
                    ) : null}

                    {/* Header */}
                    <div>
                      <h1 className="font-space-grotesk text-3xl sm:text-4xl font-semibold tracking-tight">
                        {greeting}, {founderName} 👋
                      </h1>
                      <p className="text-muted-foreground mt-1">
                        {modeConfig.subtitle}
                      </p>
                    </div>

                    {data?.primaryIcp && profile?.dashboard_bootstrap_source === 'icp_unlock' ? (
                      <IcpDashboardSummaryCard primaryIcp={data.primaryIcp} />
                    ) : null}

                    <DashboardAccountabilityHero
                      founderName={founderName}
                      businessStage={profile?.business_stage}
                      currentStreak={metrics.streak}
                    />

                    <RetentionActionFeed />

                    {/* Dynamic View Based on Mode */}
                    {dashboardMode === 'rookie' && <RookieModeView {...tierViewSharedProps} />}
                    {dashboardMode === 'starter' && <StarterModeView {...tierViewSharedProps} />}
                    {dashboardMode === 'rising' && <RisingModeView {...tierViewSharedProps} />}
                    {dashboardMode === 'pro' && <ProModeView {...tierViewSharedProps} />}

                    <MyFilesSection
                      files={data?.dashboardFiles || []}
                      primaryIcp={data?.primaryIcp ?? null}
                    />
                  </div>

                  {/* Daily Goal Modal */}
                  <DailyGoalModal
                    open={showDailyGoal}
                    onOpenChange={handleDailyGoalOpenChange}
                    currentStreak={currentStreak}
                    mode={modalMode}
                    todaysCheckInId={todaysCheckInId}
                    onCheckInComplete={handleCheckInComplete}
                  />
                </div>
              </SidebarInset>
            </DashboardContentWrapper>
          </TaskCountContext.Provider>
        </DashboardNavigationProvider>
      </SidebarProvider>
    </ErrorBoundary>
  );
};
