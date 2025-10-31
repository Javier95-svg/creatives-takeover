import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StripeMetrics {
  mrr: number;
  totalRevenue: number;
  churnRate: number;
  conversionRate: number;
  activeCustomers: number;
  previousRevenue: number;
}

export const useRevenueMetrics = () => {
  const { user } = useAuth();

  const { data: stripeMetrics, isLoading } = useQuery({
    queryKey: ['stripe-revenue-metrics', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase.functions.invoke('stripe-revenue-metrics');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
  });

  const isStripeConfigured = stripeMetrics?.isConfigured || false;
  const hasStripeAccount = stripeMetrics?.hasStripeAccount || false;
  const metrics = stripeMetrics?.metrics as StripeMetrics | null;

  const latestMetrics = {
    mrr: metrics?.mrr || 0,
    churn_rate: metrics?.churnRate || 0,
    conversion_rate: metrics?.conversionRate || 0,
    total_revenue: metrics?.totalRevenue || 0,
    active_customers: metrics?.activeCustomers || 0,
  };

  // Calculate trend vs previous period
  const getTrend = (key: 'mrr' | 'churn_rate' | 'conversion_rate') => {
    if (!metrics) return 0;
    
    if (key === 'mrr') {
      const current = metrics.totalRevenue;
      const previous = metrics.previousRevenue;
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    }
    
    return 0;
  };

  return {
    metrics: [],
    latestMetrics,
    isLoading,
    isStripeConfigured,
    hasStripeAccount,
    isStripeConnected: isStripeConfigured && hasStripeAccount,
    getTrend,
  };
};
