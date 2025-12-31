import { SmartFocusCard } from '../decision-engine/SmartFocusCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Target, Calendar } from 'lucide-react';

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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero Section: Smart Focus Card Only */}
      <div id="dashboard-focus">
        <SmartFocusCard />
      </div>

      {/* Minimal Key Metrics - 3 Cards Only */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Today's Progress */}
        <Card className="border-muted">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
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
        <Card className="border-muted">
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

      {/* Minimal Footer Message */}
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          💡 Focus on your top priority. Switch to Dashboard Mode for more details.
        </p>
      </div>
    </div>
  );
}
