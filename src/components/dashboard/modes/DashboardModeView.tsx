import { MonthlyRevenueTarget } from '../MonthlyRevenueTarget';
import { CoreMetrics } from '../CoreMetrics';
import { TodaysMissionWidget } from '../TodaysMissionWidget';
import { BizMapJourneyProgress } from '../BizMapJourneyProgress';
import { CommunityActivityCard } from '../CommunityActivityCard';
import { InsightaActivityCard } from '../InsightaActivityCard';
import { ContentProgressCard } from '../ContentProgressCard';
import { SmartNextActions } from '../SmartNextActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Target, Calendar, CheckCircle2 } from 'lucide-react';

interface DashboardModeViewProps {
  streak: number;
  tasksCompletedToday: number;
  totalTasksToday: number;
  weeklyProgress: number;
  tasksCompletedThisWeek: number;
  totalTasksThisWeek: number;
}

export function DashboardModeView({
  streak,
  tasksCompletedToday,
  totalTasksToday,
  weeklyProgress,
  tasksCompletedThisWeek,
  totalTasksThisWeek,
}: DashboardModeViewProps) {
  return (
    <div className="space-y-6">
      {/* Metrics Strip — status at a glance */}
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

      {/* BizMap Journey — where am I in my startup journey? */}
      <div id="journey-progress">
        <BizMapJourneyProgress />
      </div>

      {/* Today's action plan — mission + next actions side by side */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3" id="todays-mission">
          <TodaysMissionWidget />
        </div>
        <div className="lg:col-span-2" id="smart-actions">
          <SmartNextActions />
        </div>
      </div>

      {/* Business health — revenue & core metrics */}
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
    </div>
  );
}
