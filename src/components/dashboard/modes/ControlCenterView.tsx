import { SmartFocusCard } from '../decision-engine/SmartFocusCard';
import { WeeklyMissionPanel } from '../decision-engine/WeeklyMissionPanel';
import { ActiveProjects } from '../ActiveProjects';
import { TaskOverview } from '../TaskOverview';
import { TaskCalendar } from '../TaskCalendar';
import { MonthlyRevenueTarget } from '../MonthlyRevenueTarget';
import { GmailIntegration } from '../GmailIntegration';
import { SmartRecommendations } from '@/components/smart/SmartRecommendations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, TrendingUp, Target, Calendar, CheckCircle2, BarChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  activeSprints,
  completedSessions,
}: ControlCenterViewProps) {
  return (
    <div className="space-y-6">
      {/* Hero Section: Smart Focus + Mission */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Today's Focus</h2>
            {streak > 0 && (
              <Badge variant="outline" className="gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-600 border-orange-500/30">
                <Flame className="h-3 w-3" />
                <span className="text-xs font-semibold">{streak}</span>
              </Badge>
            )}
          </div>
          <SmartFocusCard />
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-bold">Weekly Mission</h2>
          <WeeklyMissionPanel />
        </div>
      </div>

      {/* Comprehensive Metrics Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Full Metrics Overview</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Today's Tasks */}
          <Card>
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
          <Card>
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
          <Card>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Streak</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Flame className="h-6 w-6 text-orange-500" />
                {streak}
              </div>
              <p className="text-xs text-muted-foreground">Days in a row</p>
            </CardContent>
          </Card>

          {/* Active Sprints */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sprints</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSprints}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          {/* Completed Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessions</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedSessions}</div>
              <p className="text-xs text-muted-foreground">Total completed</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Recommendations */}
      <div>
        <h3 className="text-lg font-semibold mb-3">AI Insights</h3>
        <SmartRecommendations />
      </div>

      {/* Active Projects */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Active Projects</h3>
        <ActiveProjects />
      </div>

      {/* Task Management */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold mb-3">Task Calendar</h3>
          <TaskCalendar />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-3">Task Overview</h3>
          <TaskOverview />
        </div>
      </div>

      {/* Business Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold mb-3">Revenue Target</h3>
          <MonthlyRevenueTarget />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-3">Gmail Integration</h3>
          <GmailIntegration />
        </div>
      </div>
    </div>
  );
}
