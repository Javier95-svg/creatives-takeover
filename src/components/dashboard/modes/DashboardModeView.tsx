import { Link } from 'react-router-dom';
import { PersonalizedRecommendation } from '@/hooks/usePersonalizedDashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Compass,
  Flame,
  Lightbulb,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { BizMapJourneyProgress } from '../BizMapJourneyProgress';

interface DashboardModeViewProps {
  streak: number;
  tasksCompletedToday: number;
  totalTasksToday: number;
  weeklyProgress: number;
  tasksCompletedThisWeek: number;
  totalTasksThisWeek: number;
  activeSprints: number;
  completedSessions: number;
  currentStage: string;
  recommendations: PersonalizedRecommendation[];
  activationMode?: boolean;
  activationActions?: CommandAction[];
}

interface CommandAction {
  id: string;
  title: string;
  description: string;
  actionUrl: string;
  priorityLabel: string;
}

export function DashboardModeView({
  streak,
  tasksCompletedToday,
  totalTasksToday,
  weeklyProgress,
  tasksCompletedThisWeek,
  totalTasksThisWeek,
  activeSprints,
  completedSessions,
  currentStage,
  recommendations = [],
  activationMode = false,
  activationActions = [],
}: DashboardModeViewProps) {
  const todayCompletion = totalTasksToday > 0 ? Math.round((tasksCompletedToday / totalTasksToday) * 100) : 0;
  const weeklyCompletion = totalTasksThisWeek > 0
    ? Math.round((tasksCompletedThisWeek / totalTasksThisWeek) * 100)
    : 0;
  const tasksRemainingToday = Math.max(totalTasksToday - tasksCompletedToday, 0);

  const missionStatus = weeklyProgress >= 80
    ? 'Strong trajectory this week'
    : weeklyProgress >= 50
      ? 'Solid progress, keep the pace'
      : 'Needs attention this week';

  const momentumLabel = streak >= 7
    ? 'High momentum'
    : streak >= 3
      ? 'Building momentum'
      : 'Momentum just starting';

  const recommendationActions: CommandAction[] = recommendations
    .filter((item) => !item.is_completed && !item.is_dismissed)
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      actionUrl: item.action_url?.startsWith('/') ? item.action_url : '/dashboard',
      priorityLabel: `P${item.priority}`,
    }));

  const fallbackActions: CommandAction[] = [
    {
      id: 'tasks',
      title: tasksRemainingToday > 0 ? `Close ${tasksRemainingToday} remaining task${tasksRemainingToday === 1 ? '' : 's'}` : 'Plan your next task block',
      description: 'Use Your Tasks to lock in clear execution for today.',
      actionUrl: '/tasks',
      priorityLabel: 'Now',
    },
    {
      id: 'mission',
      title: 'Review your weekly mission',
      description: 'Confirm that this week still aligns with your current stage.',
      actionUrl: '/weekly-mission',
      priorityLabel: 'Next',
    },
    {
      id: 'decision',
      title: 'Unblock one strategic decision',
      description: 'Use Decision Sprint for the single highest-leverage choice.',
      actionUrl: '/decision-sprint',
      priorityLabel: 'Then',
    },
  ];

  const commandActions = activationMode && activationActions.length > 0
    ? activationActions
    : recommendationActions.length > 0
      ? recommendationActions
      : fallbackActions;

  return (
    <div className="space-y-6">
      <div id="dashboard-focus">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Compass className="h-5 w-5 text-primary" />
                Command Center
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  Stage: {currentStage}
                </Badge>
                <Badge variant="outline">{momentumLabel}</Badge>
              </div>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              One clear view of where you are, what matters now, and the best next move.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border/70 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Today&apos;s clarity</p>
              <p className="mt-1 text-lg font-semibold">{todayCompletion}% execution</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Weekly direction</p>
              <p className="mt-1 text-lg font-semibold">{missionStatus}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Decision pressure</p>
              <p className="mt-1 text-lg font-semibold">
                {tasksRemainingToday > 0 ? `${tasksRemainingToday} items need action` : 'No pending blockers today'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

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
            <p className="text-xs text-muted-foreground">{weeklyCompletion}% completion</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mission</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyProgress.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">{missionStatus}</p>
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
            <p className="text-xs text-muted-foreground">{momentumLabel}</p>
          </CardContent>
        </Card>
      </div>

      <div id="journey-progress">
        <BizMapJourneyProgress />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div id="priority-radar">
          <Card className="h-full border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-primary" />
                Priority Radar
              </CardTitle>
              <CardDescription>What needs your attention right now, in order.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Now</p>
                <p className="mt-1 text-sm font-medium">
                  {tasksRemainingToday > 0
                    ? `Complete ${tasksRemainingToday} remaining task${tasksRemainingToday === 1 ? '' : 's'} today`
                    : 'Lock tomorrow’s top priority before ending the day'}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Next</p>
                <p className="mt-1 text-sm font-medium">
                  Weekly mission is at {weeklyProgress.toFixed(0)}%: {missionStatus.toLowerCase()}.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Maintain</p>
                <p className="mt-1 text-sm font-medium">
                  {streak > 0 ? `${streak}-day consistency streak` : 'Start a new consistency streak today'}.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div id="next-actions">
          <Card className="h-full border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-primary" />
                Recommended Next Actions
              </CardTitle>
              <CardDescription>Suggested moves to keep momentum high.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activationMode && activationActions.length > 0 ? (
                <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 text-sm text-sky-900 dark:text-sky-100">
                  Focus on one concrete output first. Exploration can wait until you have something saved.
                </div>
              ) : null}
              {commandActions.map((action, index) => (
                <div key={action.id} className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge variant={index === 0 ? 'default' : 'outline'}>{action.priorityLabel}</Badge>
                    <Button asChild size="sm" variant={index === 0 ? 'default' : 'outline'}>
                      <Link to={action.actionUrl}>
                        Open
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div id="command-links" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Execution</CardTitle>
            <CardDescription>Run today with structure.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/tasks">
                Go to Your Tasks
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Direction</CardTitle>
            <CardDescription>Set strategy for the week.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/weekly-mission">
                Open Weekly Mission
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Focus</CardTitle>
            <CardDescription>Identify the highest-leverage task.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/focus-funnel">
                Open Focus Funnel
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Decisions</CardTitle>
            <CardDescription>Resolve important blockers faster.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/decision-sprint">
                Open Decision Sprint
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div id="insight-brief">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-primary" />
              Insight Brief
            </CardTitle>
            <CardDescription>High-level signal summary across your work.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Execution Capacity</p>
              <p className="mt-1 text-sm font-medium">
                {tasksRemainingToday > 0 ? `${tasksRemainingToday} tasks still open today` : 'Today is fully closed'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Active Initiatives</p>
              <p className="mt-1 text-sm font-medium">
                {activeSprints} sprint{activeSprints === 1 ? '' : 's'} running now
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Learning Velocity</p>
              <p className="mt-1 flex items-center gap-1 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-primary" />
                {completedSessions} completed session{completedSessions === 1 ? '' : 's'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
