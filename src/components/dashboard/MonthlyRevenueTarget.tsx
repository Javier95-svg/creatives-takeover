import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { useKPIGoals } from '@/hooks/useKPIGoals';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const MonthlyRevenueTarget = () => {
  const { user } = useAuth();
  const { goals, isLoading } = useKPIGoals();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<{ current: number; target: number } | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Get current month/year
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  // Get base revenue goal
  const baseRevenueGoal = goals.find(g => g.goal_type === 'revenue') || {
    current_value: 0,
    target_value: 10000,
    unit: '$'
  };

  // Load monthly revenue data for selected month
  useEffect(() => {
    if (!user) return;

    const loadMonthlyData = async () => {
      setLoadingData(true);
      try {
        // Check if there's a specific goal for this month
        const { data: monthlyGoal } = await supabase
          .from('kpi_goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('goal_type', 'revenue')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString())
          .maybeSingle();

        if (monthlyGoal) {
          setMonthlyData({
            current: monthlyGoal.current_value || 0,
            target: monthlyGoal.target_value || baseRevenueGoal.target_value
          });
        } else {
          // Use base goal values
          setMonthlyData({
            current: baseRevenueGoal.current_value || 0,
            target: baseRevenueGoal.target_value || 10000
          });
        }
      } catch (error) {
        console.error('Error loading monthly data:', error);
        setMonthlyData({
          current: baseRevenueGoal.current_value || 0,
          target: baseRevenueGoal.target_value || 10000
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadMonthlyData();
  }, [user, selectedDate, baseRevenueGoal.target_value]);

  const revenueGoal = monthlyData || {
    current: baseRevenueGoal.current_value,
    target: baseRevenueGoal.target_value
  };

  const progress = revenueGoal.target > 0 
    ? Math.min((revenueGoal.current / revenueGoal.target) * 100, 100)
    : 0;

  const handlePreviousMonth = () => {
    setSelectedDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Generate year options (current year ± 2 years)
  const currentYearNum = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYearNum - 2 + i);
  const monthOptions = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (isLoading || loadingData) {
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

  const isCurrentMonth = format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Monthly Revenue Target
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-[200px] justify-center">
              <Select
                value={currentMonth.toString()}
                onValueChange={(value) => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(parseInt(value));
                  setSelectedDate(newDate);
                }}
              >
                <SelectTrigger className="w-[120px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={currentYear.toString()}
                onValueChange={(value) => {
                  const newDate = new Date(selectedDate);
                  newDate.setFullYear(parseInt(value));
                  setSelectedDate(newDate);
                }}
              >
                <SelectTrigger className="w-[80px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              className="h-8 w-8 p-0"
              disabled={!isCurrentMonth && format(selectedDate, 'yyyy-MM') > format(new Date(), 'yyyy-MM')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrentMonth && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="h-8 text-xs"
              >
                Today
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-2xl font-bold">
                ${revenueGoal.current.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Current Revenue</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-muted-foreground">
                ${revenueGoal.target.toLocaleString()}
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
              {revenueGoal.target - revenueGoal.current > 0 
                ? `$${(revenueGoal.target - revenueGoal.current).toLocaleString()} remaining to reach target`
                : 'Target achieved! 🎉'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

