import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, DollarSign } from 'lucide-react';
import { useKPIGoals } from '@/hooks/useKPIGoals';

export const MonthlyRevenueTarget = () => {
  const { goals, isLoading } = useKPIGoals();

  // Get revenue goal
  const revenueGoal = goals.find(g => g.goal_type === 'revenue') || {
    current_value: 0,
    target_value: 10000,
    unit: '$'
  };

  const progress = revenueGoal.target_value > 0 
    ? Math.min((revenueGoal.current_value / revenueGoal.target_value) * 100, 100)
    : 0;

  if (isLoading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Monthly Revenue Target</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5 text-primary" />
          Monthly Revenue Target
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-2xl font-bold">
                {revenueGoal.unit}{revenueGoal.current_value.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Current Revenue</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-muted-foreground">
                {revenueGoal.unit}{revenueGoal.target_value.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Target</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {revenueGoal.target_value - revenueGoal.current_value > 0 
                ? `$${(revenueGoal.target_value - revenueGoal.current_value).toLocaleString()} remaining to reach target`
                : 'Target achieved! 🎉'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

