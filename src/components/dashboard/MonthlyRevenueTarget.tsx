import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, ChevronLeft, ChevronRight, Edit2, Save, X } from 'lucide-react';
import { useKPIGoals } from '@/hooks/useKPIGoals';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isFirstDayOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface MonthlyRevenueData {
  current: number;
  target: number;
  month: string;
  year: number;
}

interface HistoricalData {
  month: string;
  revenue: number;
  target: number;
}

export const MonthlyRevenueTarget = () => {
  const { user } = useAuth();
  const { goals, isLoading, updateGoal, createGoal } = useKPIGoals();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenueData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({ current: 0, target: 0 });
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const lastResetCheckRef = useRef<string>('');

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

  // Check for first day of month reset
  useEffect(() => {
    if (!user) return;

    const checkAndReset = async () => {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      
      // Only check once per day
      if (lastResetCheckRef.current === todayStr) return;
      lastResetCheckRef.current = todayStr;

      if (isFirstDayOfMonth(today)) {
        try {
          // Check if we already reset today
          const { data: existingGoal } = await supabase
            .from('kpi_goals')
            .select('*')
            .eq('user_id', user.id)
            .eq('goal_type', 'revenue')
            .gte('created_at', startOfMonth(today).toISOString())
            .lte('created_at', endOfMonth(today).toISOString())
            .maybeSingle();

          // If no goal exists for this month, create one with reset values
          if (!existingGoal) {
            const baseGoal = goals.find(g => g.goal_type === 'revenue');
            await supabase
              .from('kpi_goals')
              .insert({
                user_id: user.id,
                goal_type: 'revenue',
                goal_name: `Monthly Revenue - ${format(today, 'MMMM yyyy')}`,
                current_value: 0, // Reset current to 0
                target_value: baseGoal?.target_value || 10000, // Keep previous target
                unit: '$',
                period: 'monthly',
                is_active: true
              });
            
            toast.success('Monthly revenue target reset for new month');
          }
        } catch (error) {
          console.error('Error resetting monthly goal:', error);
        }
      }
    };

    checkAndReset();
  }, [user, goals]);

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
            target: monthlyGoal.target_value || baseRevenueGoal.target_value,
            month: format(selectedDate, 'MMMM'),
            year: selectedDate.getFullYear()
          });
          setEditValues({
            current: monthlyGoal.current_value || 0,
            target: monthlyGoal.target_value || baseRevenueGoal.target_value
          });
        } else {
          // Use base goal values
          setMonthlyData({
            current: baseRevenueGoal.current_value || 0,
            target: baseRevenueGoal.target_value || 10000,
            month: format(selectedDate, 'MMMM'),
            year: selectedDate.getFullYear()
          });
          setEditValues({
            current: baseRevenueGoal.current_value || 0,
            target: baseRevenueGoal.target_value || 10000
          });
        }
      } catch (error) {
        console.error('Error loading monthly data:', error);
        setMonthlyData({
          current: baseRevenueGoal.current_value || 0,
          target: baseRevenueGoal.target_value || 10000,
          month: format(selectedDate, 'MMMM'),
          year: selectedDate.getFullYear()
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadMonthlyData();
  }, [user, selectedDate, baseRevenueGoal.target_value]);

  // Load historical data for chart
  useEffect(() => {
    if (!user) return;

    const loadHistoricalData = async () => {
      setLoadingHistory(true);
      try {
        // Get last 12 months of revenue data
        const twelveMonthsAgo = subMonths(new Date(), 12);
        
        const { data: historicalGoals } = await supabase
          .from('kpi_goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('goal_type', 'revenue')
          .gte('created_at', twelveMonthsAgo.toISOString())
          .order('created_at', { ascending: true });

        if (historicalGoals && historicalGoals.length > 0) {
          // Group by month and get the latest goal for each month
          const monthlyMap = new Map<string, { revenue: number; target: number; date: Date }>();
          
          historicalGoals.forEach(goal => {
            const goalDate = new Date(goal.created_at);
            const monthKey = format(goalDate, 'MMM yyyy');
            
            const existing = monthlyMap.get(monthKey);
            // Keep the latest goal for each month
            if (!existing || goalDate > existing.date) {
              monthlyMap.set(monthKey, {
                revenue: goal.current_value || 0,
                target: goal.target_value || 0,
                date: goalDate
              });
            }
          });

          const history: HistoricalData[] = Array.from(monthlyMap.entries())
            .map(([month, data]) => ({
              month,
              revenue: data.revenue,
              target: data.target
            }))
            .sort((a, b) => {
              // Sort by date
              const dateA = new Date(a.month);
              const dateB = new Date(b.month);
              return dateA.getTime() - dateB.getTime();
            });

          setHistoricalData(history);
        }
      } catch (error) {
        console.error('Error loading historical data:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistoricalData();
  }, [user]);

  const handleSave = async () => {
    if (!user || !monthlyData) return;

    try {
      // Check if goal exists for this month
      const { data: existingGoal } = await supabase
        .from('kpi_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('goal_type', 'revenue')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .maybeSingle();

      if (existingGoal) {
        // Update existing goal
        await supabase
          .from('kpi_goals')
          .update({
            current_value: editValues.current,
            target_value: editValues.target,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingGoal.id);
      } else {
        // Create new goal for this month
        await supabase
          .from('kpi_goals')
          .insert({
            user_id: user.id,
            goal_type: 'revenue',
            goal_name: `Monthly Revenue - ${format(selectedDate, 'MMMM yyyy')}`,
            current_value: editValues.current,
            target_value: editValues.target,
            unit: '$',
            period: 'monthly',
            is_active: true
          });
      }

      setMonthlyData({
        ...monthlyData,
        current: editValues.current,
        target: editValues.target
      });
      setIsEditing(false);
      toast.success('Revenue target updated successfully');
      
      // Refresh historical data
      const loadHistoricalData = async () => {
        try {
          const twelveMonthsAgo = subMonths(new Date(), 12);
          
          const { data: historicalGoals } = await supabase
            .from('kpi_goals')
            .select('*')
            .eq('user_id', user.id)
            .eq('goal_type', 'revenue')
            .gte('created_at', twelveMonthsAgo.toISOString())
            .order('created_at', { ascending: true });

          if (historicalGoals && historicalGoals.length > 0) {
            const monthlyMap = new Map<string, { revenue: number; target: number; date: Date }>();
            
            historicalGoals.forEach(goal => {
              const goalDate = new Date(goal.created_at);
              const monthKey = format(goalDate, 'MMM yyyy');
              
              const existing = monthlyMap.get(monthKey);
              if (!existing || goalDate > existing.date) {
                monthlyMap.set(monthKey, {
                  revenue: goal.current_value || 0,
                  target: goal.target_value || 0,
                  date: goalDate
                });
              }
            });

            const history: HistoricalData[] = Array.from(monthlyMap.entries())
              .map(([month, data]) => ({
                month,
                revenue: data.revenue,
                target: data.target
              }))
              .sort((a, b) => {
                const dateA = new Date(a.month);
                const dateB = new Date(b.month);
                return dateA.getTime() - dateB.getTime();
              });

            setHistoricalData(history);
          }
        } catch (error) {
          console.error('Error refreshing historical data:', error);
        }
      };

      loadHistoricalData();
    } catch (error) {
      console.error('Error saving revenue target:', error);
      toast.error('Failed to save revenue target');
    }
  };

  const handleCancel = () => {
    if (monthlyData) {
      setEditValues({
        current: monthlyData.current,
        target: monthlyData.target
      });
    }
    setIsEditing(false);
  };

  const revenueGoal = monthlyData ? {
    current: monthlyData.current,
    target: monthlyData.target
  } : {
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
        <div className="space-y-6">
          {/* Editable Revenue Fields */}
          <div className="space-y-4">
            {!isEditing ? (
              <div className="flex items-baseline justify-between">
                <div className="flex-1">
                  <p className="text-2xl font-bold">
                    ${revenueGoal.current.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Current Revenue</p>
                </div>
                <div className="flex-1 text-right">
                  <p className="text-2xl font-bold text-muted-foreground">
                    ${revenueGoal.target.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Target</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="ml-4"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-revenue">Current Revenue ($)</Label>
                    <Input
                      id="current-revenue"
                      type="number"
                      value={editValues.current}
                      onChange={(e) => setEditValues(prev => ({ ...prev, current: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-revenue">Target Revenue ($)</Label>
                    <Input
                      id="target-revenue"
                      type="number"
                      value={editValues.target}
                      onChange={(e) => setEditValues(prev => ({ ...prev, target: parseFloat(e.target.value) || 0 }))}
                      placeholder="10000"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Status Message */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {revenueGoal.target - revenueGoal.current > 0 
                ? `$${(revenueGoal.target - revenueGoal.current).toLocaleString()} remaining to reach target`
                : 'Target achieved! 🎉'}
            </p>
          </div>

          {/* Historical Revenue Chart */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-4">Revenue Performance Over Time</h3>
            {loadingHistory ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading chart data...</div>
              </div>
            ) : historicalData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      name="Revenue"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="target" 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: 'hsl(var(--muted-foreground))', r: 4 }}
                      name="Target"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">No historical data yet</p>
                  <p className="text-xs text-muted-foreground">Chart will appear as you track revenue over time</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

