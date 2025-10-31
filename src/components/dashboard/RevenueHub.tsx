import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Users, Edit2, Badge } from 'lucide-react';
import { useKPIGoals } from '@/hooks/useKPIGoals';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';

export const RevenueHub = () => {
  const { goals, isLoading, updateGoal, createGoal } = useKPIGoals();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editValues, setEditValues] = useState({
    current: 0,
    target: 10000,
  });

  // Get or create revenue goal
  const revenueGoal = goals.find(g => g.goal_type === 'revenue') || {
    id: 'temp',
    goal_type: 'revenue' as const,
    goal_name: 'Monthly Revenue',
    current_value: 0,
    target_value: 10000,
    unit: '$',
    trend_percentage: 0,
    period: 'monthly' as const,
    is_active: true,
  };

  const handleSaveRevenue = async () => {
    if (revenueGoal.id === 'temp') {
      // Create new goal
      createGoal({
        goal_type: 'revenue',
        goal_name: 'Monthly Revenue',
        current_value: editValues.current,
        target_value: editValues.target,
        unit: '$',
        trend_percentage: 0,
        period: 'monthly',
        is_active: true,
      });
    } else {
      // Update existing goal
      updateGoal({
        id: revenueGoal.id,
        updates: {
          current_value: editValues.current,
          target_value: editValues.target,
        },
      });
    }
    setIsEditOpen(false);
  };

  const openEditDialog = () => {
    setEditValues({
      current: revenueGoal.current_value,
      target: revenueGoal.target_value,
    });
    setIsEditOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle>Revenue Hub</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = revenueGoal.target_value > 0 
    ? Math.min((revenueGoal.current_value / revenueGoal.target_value) * 100, 100)
    : 0;

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-primary" />
          Revenue Hub
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
            Stripe: Coming Soon
          </span>
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-8" onClick={openEditDialog}>
                <Edit2 className="h-4 w-4" />
                Edit Revenue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Revenue Metrics</DialogTitle>
                <DialogDescription>
                  Manually set your current revenue and target for this month.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="current">Current Monthly Revenue ($)</Label>
                  <Input
                    id="current"
                    type="number"
                    value={editValues.current}
                    onChange={(e) => setEditValues(prev => ({ ...prev, current: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target">Target Monthly Revenue ($)</Label>
                  <Input
                    id="target"
                    type="number"
                    value={editValues.target}
                    onChange={(e) => setEditValues(prev => ({ ...prev, target: parseFloat(e.target.value) || 0 }))}
                    placeholder="10000"
                  />
                </div>
                <Button onClick={handleSaveRevenue} className="w-full">
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Monthly Revenue Progress</span>
              <span className="text-sm font-medium">{progressPercentage.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Current</span>
              </div>
              <p className="text-2xl font-bold">
                ${revenueGoal.current_value.toLocaleString()}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Target</span>
              </div>
              <p className="text-2xl font-bold">
                ${revenueGoal.target_value.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
