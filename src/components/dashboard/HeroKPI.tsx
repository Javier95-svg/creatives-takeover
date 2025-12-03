import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useKPIGoals } from '@/hooks/useKPIGoals';

export const HeroKPI = () => {
  const { primaryGoal, progressPercentage, isLoading } = useKPIGoals();

  if (isLoading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-24 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <Card className="backdrop-blur-sm bg-card/95 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
      <CardContent className="p-4 sm:p-6 relative">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Progress Gauge - More Compact */}
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              {primaryGoal.goal_name}
            </h3>
            <div className="relative">
              <svg width="120" height="120" className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="10"
                />
                {/* Progress circle */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">
                  {Math.round(progressPercentage)}%
                </span>
                <span className="text-xs text-muted-foreground">complete</span>
              </div>
            </div>
          </div>

          {/* Metrics - More Compact */}
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-xl font-bold">
                  {primaryGoal.unit}{primaryGoal.current_value.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="text-xl font-bold">
                  {primaryGoal.unit}{primaryGoal.target_value.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Trend Indicator - More Compact */}
            {primaryGoal.trend_percentage !== 0 && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                primaryGoal.trend_percentage > 0 
                  ? 'bg-green-500/10 text-green-500' 
                  : 'bg-red-500/10 text-red-500'
              }`}>
                {primaryGoal.trend_percentage > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-semibold">
                  {Math.abs(primaryGoal.trend_percentage).toFixed(1)}%
                </span>
                <span className="text-xs">
                  vs last {primaryGoal.period}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
