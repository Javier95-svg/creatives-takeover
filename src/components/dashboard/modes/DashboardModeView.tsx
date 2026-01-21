import { SmartFocusCard } from '../decision-engine/SmartFocusCard';
import { WeeklyMissionPanel } from '../decision-engine/WeeklyMissionPanel';
import { TaskOverview } from '../TaskOverview';
import { MonthlyRevenueTarget } from '../MonthlyRevenueTarget';
import { CoreMetrics } from '../CoreMetrics';
import { QuickWins } from '../QuickWins';
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
      {/* Hero Section: Smart Focus + Weekly Mission Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="dashboard-focus">
          <SmartFocusCard />
        </div>
        <div id="weekly-mission">
          <WeeklyMissionPanel />
        </div>
      </div>

      {/* Metrics Grid - 4 Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Today's Tasks */}
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

        {/* This Week */}
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

        {/* Mission Progress */}
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

        {/* Streak */}
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

      {/* Revenue & Metrics Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="monthly-revenue">
          <MonthlyRevenueTarget />
        </div>
        <div id="core-metrics">
          <CoreMetrics />
        </div>
      </div>

      {/* Quick Wins & Tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="quick-wins">
          <QuickWins />
        </div>
        <div id="your-tasks">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-space-grotesk text-lg font-semibold tracking-tight">Your Tasks</h3>
            <p className="text-xs text-muted-foreground">Manage your daily work</p>
          </div>
          <TaskOverview />
        </div>
      </div>
    </div>
  );
}


