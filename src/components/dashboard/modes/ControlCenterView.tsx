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
        <div>
          <SmartFocusCard />
        </div>
        <div>
          <WeeklyMissionPanel />
        </div>
      </div>

      {/* Comprehensive Metrics Grid - 6 Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Complete Analytics</h3>
          <p className="text-xs text-muted-foreground">All your key metrics in one place</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Today's Tasks */}
          <Card className="border-muted">
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
          <Card className="border-muted">
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
          <Card className="border-muted">
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
          <Card className="border-muted">
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

          {/* Active Sprints */}
          <Card className="border-muted">
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
          <Card className="border-muted">
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">AI Insights & Recommendations</h3>
          <p className="text-xs text-muted-foreground">Smart suggestions for your business</p>
        </div>
        <SmartRecommendations />
      </div>

      {/* Active Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Active Projects</h3>
          <p className="text-xs text-muted-foreground">All projects in progress</p>
        </div>
        <ActiveProjects />
      </div>

      {/* Task Management - Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Task Calendar</h3>
            <p className="text-xs text-muted-foreground">Schedule view</p>
          </div>
          <TaskCalendar />
        </div>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Task List</h3>
            <p className="text-xs text-muted-foreground">All your tasks</p>
          </div>
          <TaskOverview />
        </div>
      </div>

      {/* Business Metrics - Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Revenue Tracking</h3>
            <p className="text-xs text-muted-foreground">Monthly targets</p>
          </div>
          <MonthlyRevenueTarget />
        </div>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Email Integration</h3>
            <p className="text-xs text-muted-foreground">Gmail connection</p>
          </div>
          <GmailIntegration />
        </div>
      </div>
    </div>
  );
}
