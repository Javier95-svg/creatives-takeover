import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDailyFocus } from '@/hooks/decision-engine/useDailyFocus';
import { Target, Clock, Zap, ChevronDown, ChevronUp, CheckCircle2, Calendar, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SmartFocusCard() {
  const {
    recommendation,
    alternativeRecommendations,
    isLoading,
    error,
    acceptRecommendation,
    deferRecommendation,
    overrideRecommendation
  } = useDailyFocus();

  const [showRationale, setShowRationale] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle>Your Focus Today</CardTitle>
          </div>
          <CardDescription>Loading your daily recommendation...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Unable to load recommendation</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!recommendation) {
    return (
      <Card className="border-2 border-muted">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <CardTitle>All Clear!</CardTitle>
          </div>
          <CardDescription>
            No pending tasks for today. Great work! 🎉
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { task, score, rationale, expectedImpact, estimatedTime } = recommendation;

  return (
    <div className="space-y-4">
      {/* Main Focus Card */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-xl">Your Focus Today</CardTitle>
                <CardDescription className="text-xs">AI-recommended priority</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Score: {score.score.toFixed(0)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Task Title */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold leading-tight">
              {task.task_text}
            </h3>

            {/* Priority Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {task.priority} priority
              </Badge>
              {task.contributes_to_weekly_mission && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                  Routine
                </Badge>
              )}
            </div>
          </div>

          {/* Impact Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Impact</p>
                <p className="font-semibold">{expectedImpact}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Effort</p>
                <p className="font-semibold">{estimatedTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Due</p>
                <p className="font-semibold text-xs">
                  {task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No deadline'}
                </p>
              </div>
            </div>
          </div>

          {/* Rationale (Collapsible) */}
          <div className="border-t pt-3">
            <button
              onClick={() => setShowRationale(!showRationale)}
              className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Why this matters</span>
              {showRationale ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showRationale && (
              <ul className="mt-3 space-y-2 text-sm">
                {rationale.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span className="text-muted-foreground">{reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={async () => {
                await acceptRecommendation();
              }}
              className="flex-1"
              size="lg"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Start Now
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={async () => {
                  await deferRecommendation();
                }}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Defer to Tomorrow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAlternatives(!showAlternatives)}>
                  <Target className="mr-2 h-4 w-4" />
                  Choose Different Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Alternative Recommendations (if shown) */}
      {showAlternatives && alternativeRecommendations.length > 0 && (
        <Card className="border border-muted">
          <CardHeader>
            <CardTitle className="text-base">Alternative Tasks</CardTitle>
            <CardDescription>Other high-priority tasks you could work on</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alternativeRecommendations.map((alt, index) => (
              <button
                key={alt.task.id}
                onClick={() => overrideRecommendation(alt.task.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border border-muted hover:border-primary/50 hover:bg-primary/5 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2 mb-1">
                      {alt.task.task_text}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{alt.expectedImpact}</span>
                      <span>•</span>
                      <span>{alt.estimatedTime}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    Score: {alt.score.score.toFixed(0)}
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
