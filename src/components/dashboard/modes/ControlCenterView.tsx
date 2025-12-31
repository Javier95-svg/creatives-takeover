import { SmartFocusCard } from '../decision-engine/SmartFocusCard';
import { WeeklyMissionPanel } from '../decision-engine/WeeklyMissionPanel';
import { ActiveProjects } from '../ActiveProjects';
import { TaskOverview } from '../TaskOverview';
import { TaskCalendar } from '../TaskCalendar';
import { SmartRecommendations } from '@/components/smart/SmartRecommendations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Target, Calendar, CheckCircle2 } from 'lucide-react';

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
  return (
    <div className="space-y-8">
      {/* Hero Section: Smart Focus + Mission */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="dashboard-focus">
          <SmartFocusCard />
        </div>
        <div id="weekly-mission">
          <WeeklyMissionPanel />
        </div>
      </div>

      {/* Key Metrics - Same as Dashboard Mode */}
      <div className="grid gap-4 md:grid-cols-4">
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
      </div>

      {/* AI Insights - Added Value */}
      <div id="ai-insights">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">AI Insights</h3>
          <p className="text-xs text-muted-foreground">Smart recommendations</p>
        </div>
        <SmartRecommendations />
      </div>

      {/* Active Projects */}
      <div id="active-projects">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Active Projects</h3>
          <p className="text-xs text-muted-foreground">What you're building</p>
        </div>
        <ActiveProjects />
      </div>

      {/* Task Management - Calendar + List */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="calendar-view">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Calendar View</h3>
            <p className="text-xs text-muted-foreground">Schedule overview</p>
          </div>
          <TaskCalendar />
        </div>
        <div id="your-tasks">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">All Tasks</h3>
            <p className="text-xs text-muted-foreground">Complete list</p>
          </div>
          <TaskOverview />
        </div>
      </div>
    </div>
  );
}
