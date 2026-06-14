import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, Calendar, Edit2, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Metric {
  id: string;
  name: string;
  current: number;
  goal: number;
  deadline: string;
  whyItMatters: string;
  icon: any;
  color: string;
}

export const CoreMetrics = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      void loadMetrics();
    }
  }, [user]);

  const loadMetrics = async () => {
    if (!user) return;

    try {
      // Load KPI goals
      const { data: goals } = await supabase
        .from('kpi_goals')
        .select('*')
        .eq('user_id', user.id)
        .in('goal_type', ['customers', 'revenue', 'custom']);

      // Get customers goal
      const customersGoal = goals?.find(g => g.goal_type === 'customers') || {
        current_value: 0,
        target_value: 10,
        unit: '',
        period: 'monthly'
      };

      // Get revenue goal
      const revenueGoal = goals?.find(g => g.goal_type === 'revenue') || {
        current_value: 0,
        target_value: 100,
        unit: '$',
        period: 'quarterly'
      };

      // Calculate runway (simplified - in real app, would calculate from financial data)
      const runwayMonths = 12; // Placeholder
      const runwayGoal = 6; // Raise before hitting 6 months

      const loadedMetrics: Metric[] = [
        {
          id: 'customers',
          name: 'Users/Customers',
          current: customersGoal.current_value,
          goal: customersGoal.target_value,
          deadline: 'End of month',
          whyItMatters: 'Your first customers validate that people actually want what you\'re building.',
          icon: Users,
          color: 'text-info'
        },
        {
          id: 'revenue',
          name: 'Revenue',
          current: revenueGoal.current_value,
          goal: revenueGoal.target_value,
          deadline: 'End of quarter',
          whyItMatters: 'Revenue proves your business model works and gives you options beyond fundraising.',
          icon: DollarSign,
          color: 'text-success'
        },
        {
          id: 'runway',
          name: 'Runway',
          current: runwayMonths,
          goal: runwayGoal,
          deadline: 'Before hitting 6 months',
          whyItMatters: 'Runway is how long you can operate. You need at least 6 months to raise without desperation.',
          icon: Calendar,
          color: 'text-warning'
        }
      ];

      setMetrics(loadedMetrics);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  const updateMetric = async (metricId: string, current: number, goal: number) => {
    if (!user) return;

    try {
      const goalType = metricId === 'customers' ? 'customers' : metricId === 'revenue' ? 'revenue' : 'custom';
      
      // Check if goal exists
      const { data: existing } = await supabase
        .from('kpi_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('goal_type', goalType)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('kpi_goals')
          .update({
            current_value: current,
            target_value: goal
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('kpi_goals')
          .insert({
            user_id: user.id,
            goal_type: goalType,
            goal_name: metricId === 'customers' ? 'Users/Customers' : metricId === 'revenue' ? 'Revenue' : 'Runway',
            current_value: current,
            target_value: goal,
            unit: metricId === 'revenue' ? '$' : '',
            period: metricId === 'revenue' ? 'quarterly' : 'monthly'
          });
      }

      void loadMetrics();
      setIsEditOpen(false);
      setEditingMetric(null);
    } catch (error) {
      console.error('Error updating metric:', error);
    }
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Core Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="text-base">Core Metrics</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Track these 3 things:</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric) => {
            const progress = getProgressPercentage(metric.current, metric.goal);
            const MetricIcon = metric.icon;
            
            return (
              <div key={metric.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MetricIcon className={`h-4 w-4 ${metric.color}`} />
                    <span className="text-sm font-medium">{metric.name}</span>
                  </div>
                  <Dialog open={isEditOpen && editingMetric === metric.id} onOpenChange={(open) => {
                    setIsEditOpen(open);
                    if (!open) setEditingMetric(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setEditingMetric(metric.id);
                          setIsEditOpen(true);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit {metric.name}</DialogTitle>
                        <DialogDescription>
                          Update your current value and goal
                        </DialogDescription>
                      </DialogHeader>
                      <MetricEditForm
                        metric={metric}
                        onSave={(current, goal) => updateMetric(metric.id, current, goal)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">{metric.id === 'revenue' ? '$' : ''}{metric.current}</span>
                  <span className="text-sm text-muted-foreground">→</span>
                  <span className="text-lg font-bold">{metric.id === 'revenue' ? '$' : ''}{metric.goal}</span>
                  <span className="text-xs text-muted-foreground">by {metric.deadline.toLowerCase()}</span>
                </div>
                
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      metric.color === 'text-info' ? 'bg-info' :
                      metric.color === 'text-success' ? 'bg-success' :
                      'bg-warning'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                <p className="text-xs text-muted-foreground">{metric.whyItMatters}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const MetricEditForm = ({ metric, onSave }: { metric: Metric; onSave: (current: number, goal: number) => void }) => {
  const [current, setCurrent] = useState(metric.current);
  const [goal, setGoal] = useState(metric.goal);

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="current">Current Value</Label>
        <Input
          id="current"
          type="number"
          value={current}
          onChange={(e) => setCurrent(parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal">Goal</Label>
        <Input
          id="goal"
          type="number"
          value={goal}
          onChange={(e) => setGoal(parseFloat(e.target.value) || 0)}
        />
      </div>
      <Button onClick={() => onSave(current, goal)} className="w-full">
        Save Changes
      </Button>
    </div>
  );
};

