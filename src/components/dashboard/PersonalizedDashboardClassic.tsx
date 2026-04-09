import { useNavigate } from 'react-router-dom';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, ArrowRight } from 'lucide-react';
import { DailyGoalModal } from './DailyGoalModal';
import { useAuth } from '@/contexts/AuthContext';
import { TaskCalendar } from './TaskCalendar';
import { TaskOverview } from './TaskOverview';
import { useDashboardInitialization } from '@/hooks/useDashboardInitialization';
import { ActiveProjects } from './ActiveProjects';
import { MonthlyRevenueTarget } from './MonthlyRevenueTarget';
import { GmailIntegration } from './GmailIntegration';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SmartRecommendations } from '@/components/smart/SmartRecommendations';
import { BusinessHealthScore } from './BusinessHealthScore';
import { BusinessHealthSummary } from './BusinessHealthSummary';
import { RevenueHub } from './RevenueHub';
import { ProgressTimeline } from './ProgressTimeline';
import { KeyMilestones } from './KeyMilestones';
import { FounderHealthCheck } from './FounderHealthCheck';
import { MarketValidationHub } from './MarketValidationHub';
import { MomentumMeter } from './MomentumMeter';
import { CoreMetrics } from './CoreMetrics';
import { DailyPriorities } from './DailyPriorities';
import { QuickWins } from './QuickWins';
import { RecentWins } from './RecentWins';
import { FounderResources } from './FounderResources';
import { RookieUpgradeBanner } from './RookieUpgradeBanner';
import { JourneyStageGrid } from './JourneyStageGrid';
import { QuotaCounterWidgets } from './QuotaCounterWidgets';
import { RetentionActionFeed } from './RetentionActionFeed';
import { DailyPromptResumeCard } from './DailyPromptResumeCard';
import { useDashboardDailyPrompt } from '@/hooks/useDashboardDailyPrompt';
import { SavedMentorsCard } from './SavedMentorsCard';

export const PersonalizedDashboardClassic = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isInitializing } = useDashboardInitialization();
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

  // Disable auto-refresh on visibility change - preserve state
  // Removed visibility change handler to prevent auto-refresh

  if (loading || isInitializing) {
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

  const { profile, stats } = data || { 
    profile: null, 
    stats: { 
      currentStreak: 0,
      activeSprints: 0,
      completedSessions: 0,
      totalCheckIns: 0
    } 
  };

  // Determine greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <ErrorBoundary>
      <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Exit Button - Fixed in top-right corner */}
      <button
        onClick={() => navigate('/')}
        className="fixed right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-all duration-300 hover:opacity-100 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background/80 backdrop-blur-sm border border-border/50 px-4 py-2 shadow-lg hover:shadow-xl hover:bg-accent flex items-center gap-2 text-sm font-medium"
        aria-label="Exit dashboard and return to platform"
        type="button"
      >
        <span>Platform</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Modern Wallpaper Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Base Gradient Mesh Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background via-primary/4 to-background" />
        
        {/* Animated Gradient Orbs for Depth */}
        <div 
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/12 rounded-full blur-3xl animate-pulse" 
          style={{ animationDuration: '8s' }} 
        />
        <div 
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse" 
          style={{ animationDuration: '12s', animationDelay: '2s' }} 
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/6 rounded-full blur-3xl animate-pulse" 
          style={{ animationDuration: '10s', animationDelay: '4s' }} 
        />
        
        {/* Subtle Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]" 
          style={{
            backgroundImage: `
              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(0deg, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px, 60px 60px'
          }} 
        />
        
        {/* Radial Gradient Vignette Effect */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, hsl(var(--background) / 0.4) 100%)'
          }}
        />
      </div>


      {/* Main Content Container with Right Sidebar */}
      <div className="relative container mx-auto px-4 sm:px-6 py-8 max-w-[1600px]">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Area */}
          <div className="flex-1 space-y-6 min-w-0">
        {/* Daily Goal Modal */}
        <DailyGoalModal 
          open={showDailyGoal}
          onOpenChange={handleDailyGoalOpenChange}
          currentStreak={currentStreak}
          mode={modalMode}
          todaysCheckInId={todaysCheckInId || undefined}
          onCheckInComplete={handleCheckInComplete}
        />

        {/* Header Section */}
        <div className="space-y-4">
          {/* Welcome Header */}
          <div className="relative overflow-hidden animate-fade-in-up">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-2xl blur-3xl" />
            <Card className="relative border-primary/20 shadow-lg backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-xl">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      {greeting}, {profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Creator'}! 👋
                    </h1>
                    <p className="text-sm text-muted-foreground" id="dashboard-welcome">
                      Welcome to your Founder Command Center.
                    </p>
                    <span className="sr-only">
                      Track your business progress, manage tasks, and monitor your entrepreneurial journey.
                    </span>
                  </div>
                  {((stats?.currentStreak || currentStreak) > 0) && (
                    <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500/20 to-orange-500/10 px-4 py-2 rounded-full border border-orange-500/20">
                      <Flame className="h-5 w-5 text-orange-500" />
                      <div className="flex flex-col">
                        <span className="text-xl font-bold text-orange-500">{stats?.currentStreak || currentStreak}</span>
                        <span className="text-xs text-orange-500/80">day streak</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Rookie plan upgrade banner */}
        <div className="animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          {hasUnresolvedPrompt ? (
            <DailyPromptResumeCard
              mode={unresolvedMode}
              onResume={handlePromptResume}
            />
          ) : null}
        </div>

        <div className="animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <RookieUpgradeBanner />
        </div>

        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.02s', animationFillMode: 'forwards' }}>
          <RetentionActionFeed />
        </div>

        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.025s', animationFillMode: 'forwards' }}>
          <SavedMentorsCard />
        </div>

        {/* Journey Stage Grid */}
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.03s', animationFillMode: 'forwards' }}>
          <JourneyStageGrid />
        </div>

        {/* Quota counters — Rising plan only */}
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.05s', animationFillMode: 'forwards' }}>
          <QuotaCounterWidgets />
        </div>

        {/* Smart Recommendations */}
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.07s', animationFillMode: 'forwards' }}>
          <SmartRecommendations maxRecommendations={2} />
        </div>

        {/* Core Metrics and Business Health - Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.08s', animationFillMode: 'forwards' }}>
          <CoreMetrics />
          <BusinessHealthScore />
        </div>

        {/* Daily Priorities and Quick Wins - Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <DailyPriorities />
          <QuickWins />
        </div>

        {/* Active Projects */}
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.12s', animationFillMode: 'forwards' }}>
          <ActiveProjects />
        </div>

        {/* Progress Timeline and Momentum Meter - Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}>
          <ProgressTimeline />
          <MomentumMeter />
        </div>

        {/* Key Milestones */}
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.18s', animationFillMode: 'forwards' }}>
          <KeyMilestones />
        </div>

        {/* Revenue Hub - Full Width */}
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          <RevenueHub />
        </div>

        {/* Monthly Revenue Target - Full Width */}
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.22s', animationFillMode: 'forwards' }}>
          <MonthlyRevenueTarget />
        </div>

        {/* Business Health Summary and Founder Health Check - Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}>
          <BusinessHealthSummary />
          <FounderHealthCheck />
        </div>

        {/* Market Validation Hub - Full Width */}
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.28s', animationFillMode: 'forwards' }}>
          <MarketValidationHub />
        </div>

        {/* Task Overview - Below Active Projects, Matching Width */}
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
          <TaskOverview />
        </div>

        {/* Recent Wins and Founder Resources - Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.32s', animationFillMode: 'forwards' }}>
          <RecentWins />
          <FounderResources />
        </div>
          </div>

          {/* Right Sidebar - Task Calendar and Gmail Integration (Fixed/Sticky) */}
          <div className="hidden xl:block w-80 flex-shrink-0">
            <div className="sticky top-8 space-y-6">
              <div className="animate-slide-in-right opacity-0" style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}>
                <TaskCalendar />
              </div>
              <div className="animate-slide-in-right opacity-0" style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}>
                <GmailIntegration />
              </div>
            </div>
          </div>
        </div>

        {/* Task Calendar and Gmail Integration for Mobile/Tablet (below main content) */}
        <div className="xl:hidden mt-6 space-y-6">
          <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
            <TaskCalendar />
          </div>
          <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
            <GmailIntegration />
          </div>
        </div>

      </div>
    </div>
    </ErrorBoundary>
  );
};
