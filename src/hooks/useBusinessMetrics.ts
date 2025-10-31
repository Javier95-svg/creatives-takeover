import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

export interface BusinessMetric {
  id: string;
  user_id: string;
  metric_date: string;
  revenue: number;
  expenses: number;
  customers_count: number;
  active_users: number;
  hours_worked: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface MetricsSummary {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
  averageHoursWorked: number;
  totalCustomers: number;
  revenueGrowth: number;
  expenseGrowth: number;
}

export const useBusinessMetrics = (days: number = 30) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<BusinessMetric[]>([]);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user, days]);

  const fetchMetrics = async () => {
    if (!user) return;

    try {
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('business_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('metric_date', startDate)
        .order('metric_date', { ascending: false });

      if (error) throw error;

      const metricsData = data || [];
      setMetrics(metricsData);

      // Calculate summary
      if (metricsData.length > 0) {
        const totalRevenue = metricsData.reduce((sum, m) => sum + Number(m.revenue), 0);
        const totalExpenses = metricsData.reduce((sum, m) => sum + Number(m.expenses), 0);
        const profit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        const averageHoursWorked = metricsData.reduce((sum, m) => sum + Number(m.hours_worked), 0) / metricsData.length;
        
        // Get unique customers (take max)
        const totalCustomers = Math.max(...metricsData.map(m => Number(m.customers_count)), 0);

        // Calculate growth (compare last 7 days vs previous 7 days)
        const last7Days = metricsData.slice(0, Math.min(7, metricsData.length));
        const previous7Days = metricsData.slice(7, Math.min(14, metricsData.length));
        
        const last7Revenue = last7Days.reduce((sum, m) => sum + Number(m.revenue), 0);
        const prev7Revenue = previous7Days.reduce((sum, m) => sum + Number(m.revenue), 0);
        const revenueGrowth = prev7Revenue > 0 ? ((last7Revenue - prev7Revenue) / prev7Revenue) * 100 : 0;

        const last7Expenses = last7Days.reduce((sum, m) => sum + Number(m.expenses), 0);
        const prev7Expenses = previous7Days.reduce((sum, m) => sum + Number(m.expenses), 0);
        const expenseGrowth = prev7Expenses > 0 ? ((last7Expenses - prev7Expenses) / prev7Expenses) * 100 : 0;

        setSummary({
          totalRevenue,
          totalExpenses,
          profit,
          profitMargin,
          averageHoursWorked,
          totalCustomers,
          revenueGrowth,
          expenseGrowth,
        });
      } else {
        setSummary({
          totalRevenue: 0,
          totalExpenses: 0,
          profit: 0,
          profitMargin: 0,
          averageHoursWorked: 0,
          totalCustomers: 0,
          revenueGrowth: 0,
          expenseGrowth: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching business metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const addOrUpdateMetric = async (date: string, data: Partial<Omit<BusinessMetric, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('business_metrics')
        .upsert({
          user_id: user.id,
          metric_date: date,
          ...data,
        }, {
          onConflict: 'user_id,metric_date'
        });

      if (error) throw error;
      
      await fetchMetrics();
      return { success: true };
    } catch (error) {
      console.error('Error adding/updating metric:', error);
      return { success: false, error };
    }
  };

  const getMetricForDate = async (date: string): Promise<BusinessMetric | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('business_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('metric_date', date)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching metric for date:', error);
      return null;
    }
  };

  return {
    metrics,
    summary,
    loading,
    addOrUpdateMetric,
    getMetricForDate,
    refreshMetrics: fetchMetrics,
  };
};
