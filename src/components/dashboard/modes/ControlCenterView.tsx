import { SmartFocusCard } from '../decision-engine/SmartFocusCard';
import { RoutineSummaryCard } from '../RoutineSummaryCard';
import { TaskOverview } from '../TaskOverview';
import { BizMapJourneyProgress } from '../BizMapJourneyProgress';
import { TodaysMissionWidget } from '../TodaysMissionWidget';
import { CommunityActivityCard } from '../CommunityActivityCard';
import { InsightaActivityCard } from '../InsightaActivityCard';
import { ContentProgressCard } from '../ContentProgressCard';
import { SmartNextActions } from '../SmartNextActions';
import { TaskCalendar } from '../TaskCalendar';
import { SmartRecommendations } from '@/components/smart/SmartRecommendations';
import { MonthlyRevenueTarget } from '../MonthlyRevenueTarget';
import { CoreMetrics } from '../CoreMetrics';
import { QuickWins } from '../QuickWins';
import { BusinessHealthScore } from '../BusinessHealthScore';
import { GmailIntegration } from '../GmailIntegration';
import { RevenueHub } from '../RevenueHub';
import { ProgressTimeline } from '../ProgressTimeline';
import { KeyMilestones } from '../KeyMilestones';
import { FounderHealthCheck } from '../FounderHealthCheck';
import { MarketValidationHub } from '../MarketValidationHub';
import { BusinessHealthSummary } from '../BusinessHealthSummary';
import { MomentumMeter } from '../MomentumMeter';
import { DailyPriorities } from '../DailyPriorities';
import { RecentWins } from '../RecentWins';
import { FounderResources } from '../FounderResources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Target, Calendar, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FocusFunnelWidget } from '@/components/focus-funnel/FocusFunnelWidget';
import { DecisionSprintCard } from '../DecisionSprintCard';
import { useNavigate } from 'react-router-dom';

interface ControlCenterViewProps {
  streak: number;
  tasksCompletedToday: number;
  totalTasksToday: number;
  weeklyProgress: number;
  tasksCompletedThisWeek: number;
  totalTasksThisWeek: number;
  activeSprints: number;
  completedSessions: number;
}

export function ControlCenterView({
  streak,
  tasksCompletedToday,
  totalTasksToday,
  weeklyProgress,
  tasksCompletedThisWeek,
  totalTasksThisWeek,
}: ControlCenterViewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Hero Section: Smart Focus + Mission */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="dashboard-focus">
          <SmartFocusCard />
        </div>
        <div id="routine">
          <RoutineSummaryCard />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div id="focus-funnel">
          <FocusFunnelWidget onOpenAIPartner={() => navigate('/dashboard/focus-funnel')} />
        </div>
        <div id="decision-sprint">
          <DecisionSprintCard />
        </div>
      </div>

      {/* Key Metrics - Same as Dashboard Mode */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/70 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasksCompletedToday}/{totalTasksToday}
            </div>
            <p className="text-xs text-muted-foreground">Tasks completed</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasksCompletedThisWeek}/{totalTasksThisWeek}
            </div>
            <p className="text-xs text-muted-foreground">Tasks completed</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mission</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyProgress.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Weekly progress</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              {streak}
            </div>
            <p className="text-xs text-muted-foreground">Days in a row</p>
          </CardContent>
        </Card>
      </div>

      {/* BizMap Journey Progress */}
      <div id="journey-progress">
        <BizMapJourneyProgress />
      </div>

      {/* Today's Mission — unified task hub */}
      <div id="todays-mission">
        <TodaysMissionWidget />
      </div>

      {/* Revenue & Core Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="monthly-revenue">
          <MonthlyRevenueTarget />
        </div>
        <div id="core-metrics">
          <CoreMetrics />
        </div>
      </div>

      {/* Platform Activity — cross-section integration */}
      <div id="platform-activity">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-space-grotesk text-lg font-semibold tracking-tight">Platform Activity</h3>
          <p className="text-xs text-muted-foreground">Your activity across sections</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <CommunityActivityCard />
          <InsightaActivityCard />
          <ContentProgressCard />
        </div>
      </div>

      {/* AI Insights & Business Health */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="ai-insights">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-space-grotesk text-lg font-semibold tracking-tight">AI Insights</h3>
            <p className="text-xs text-muted-foreground">Smart recommendations</p>
          </div>
          <SmartRecommendations />
        </div>
        <div id="business-health">
          {user && <BusinessHealthScore userId={user.id} />}
        </div>
      </div>

      {/* Task Management - Calendar + Smart Next Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="calendar-view">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-space-grotesk text-lg font-semibold tracking-tight">Calendar View</h3>
            <p className="text-xs text-muted-foreground">Schedule overview</p>
          </div>
          <TaskCalendar />
        </div>
        <div id="smart-actions">
          <SmartNextActions />
        </div>
      </div>

      {/* Tasks & Integrations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="your-tasks">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-space-grotesk text-lg font-semibold tracking-tight">All Tasks</h3>
            <p className="text-xs text-muted-foreground">Complete list</p>
          </div>
          <TaskOverview />
        </div>
        <div id="gmail-integration">
          <GmailIntegration />
        </div>
      </div>

      {/* Daily Priorities & Progress Timeline */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="daily-priorities">
          <DailyPriorities />
        </div>
        <div id="progress-timeline">
          <ProgressTimeline />
        </div>
      </div>

      {/* Milestones & Momentum */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="key-milestones">
          <KeyMilestones />
        </div>
        <div id="momentum-meter">
          <MomentumMeter />
        </div>
      </div>

      {/* Revenue Hub - Full Width */}
      <div id="revenue-hub">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-space-grotesk text-lg font-semibold tracking-tight">Revenue Hub</h3>
          <p className="text-xs text-muted-foreground">Budget & financial tracking</p>
        </div>
        <RevenueHub />
      </div>

      {/* Business Health Summary & Founder Health */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="business-health-summary">
          <BusinessHealthSummary />
        </div>
        <div id="founder-health">
          <FounderHealthCheck />
        </div>
      </div>

      {/* Market Validation Hub - Full Width */}
      <div id="market-validation">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-space-grotesk text-lg font-semibold tracking-tight">Market Validation</h3>
          <p className="text-xs text-muted-foreground">Market intelligence & insights</p>
        </div>
        <MarketValidationHub />
      </div>

      {/* Recent Wins & Resources */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="recent-wins">
          <RecentWins />
        </div>
        <div id="founder-resources">
          <FounderResources />
        </div>
      </div>
    </div>
  );
}


