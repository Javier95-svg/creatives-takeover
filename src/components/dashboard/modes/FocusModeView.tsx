import { SmartFocusCard } from '../decision-engine/SmartFocusCard';
import { WeeklyMissionPanel } from '../decision-engine/WeeklyMissionPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, TrendingUp, Target, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FocusModeViewProps {
  streak: number;
  tasksCompletedToday: number;
  totalTasksToday: number;
  weeklyProgress: number;
}

export function FocusModeView({
  streak,
  tasksCompletedToday,
  totalTasksToday,
  weeklyProgress,
}: FocusModeViewProps) {
  return (
    <div className="space-y-6">
      {/* Hero Section: Smart Focus */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Your Focus Today</h2>
            <p className="text-muted-foreground">AI-recommended priority based on impact</p>
          </div>
          {streak > 0 && (
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-600 border-orange-500/30">
              <Flame className="h-4 w-4" />
              <span className="font-semibold">{streak} day streak</span>
            </Badge>
          )}
        </div>

        <SmartFocusCard />
      </div>

      {/* Key Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Today's Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasksCompletedToday}/{totalTasksToday}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalTasksToday > 0
                ? `${Math.round((tasksCompletedToday / totalTasksToday) * 100)}% complete`
                : 'No tasks scheduled'}
            </p>
          </CardContent>
        </Card>

        {/* Weekly Mission Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Mission</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyProgress.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              {weeklyProgress >= 80
                ? 'Almost there!'
                : weeklyProgress >= 50
                ? 'Good progress'
                : 'Keep going'}
            </p>
          </CardContent>
        </Card>

        {/* Consistency Streak */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consistency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              {streak}
            </div>
            <p className="text-xs text-muted-foreground">
              {streak === 0
                ? 'Start your streak today'
                : streak === 1
                ? 'Keep it going!'
                : `${streak} days in a row`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Mission Panel */}
      <div>
        <h3 className="text-lg font-semibold mb-3">This Week's Mission</h3>
        <WeeklyMissionPanel />
      </div>
    </div>
  );
}
