import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { subDays, format } from 'date-fns';

export interface RevenueMetrics {
  id: string;
  metric_date: string;
  mrr: number;
  churn_rate: number;
  conversion_rate: number;
  total_revenue: number;
  active_customers: number;
  new_customers: number;
  churned_customers: number;
}

export const useRevenueMetrics = (days: number = 30) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['revenue-metrics', user?.id, days],
    queryFn: async () => {
      if (!user) return [];
      
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('revenue_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('metric_date', startDate)
        .order('metric_date', { ascending: true });

      if (error) throw error;
      return data as RevenueMetrics[];
    },
    enabled: !!user,
  });

  const { data: stripeConnection } = useQuery({
    queryKey: ['stripe-connection', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('stripe_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateMetrics = useMutation({
    mutationFn: async (metricData: Partial<RevenueMetrics>) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('revenue_metrics')
        .upsert({
          user_id: user.id,
          metric_date: metricData.metric_date || format(new Date(), 'yyyy-MM-dd'),
          ...metricData,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-metrics'] });
      toast.success('Metrics updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update metrics');
      console.error('Error updating metrics:', error);
    },
  });

  // Calculate latest metrics
  const latestMetrics = metrics[metrics.length - 1] || {
    mrr: 0,
    churn_rate: 0,
    conversion_rate: 0,
    total_revenue: 0,
    active_customers: 0,
  };

  // Calculate trend (compare last 7 days vs previous 7 days)
  const getTrend = (key: keyof RevenueMetrics) => {
    if (metrics.length < 14) return 0;
    
    const recent = metrics.slice(-7);
    const previous = metrics.slice(-14, -7);
    
    const recentAvg = recent.reduce((sum, m) => sum + Number(m[key] || 0), 0) / recent.length;
    const previousAvg = previous.reduce((sum, m) => sum + Number(m[key] || 0), 0) / previous.length;
    
    if (previousAvg === 0) return 0;
    return ((recentAvg - previousAvg) / previousAvg) * 100;
  };

  return {
    metrics,
    latestMetrics,
    isLoading,
    stripeConnection,
    isStripeConnected: stripeConnection?.is_connected || false,
    updateMetrics: updateMetrics.mutate,
    getTrend,
  };
};
