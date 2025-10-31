import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DashboardAlert {
  id: string;
  alert_type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  is_dismissed: boolean;
  priority: number;
  action_link?: string;
  action_label?: string;
  created_at: string;
}

export const useDashboardAlerts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['dashboard-alerts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('dashboard_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DashboardAlert[];
    },
    enabled: !!user,
  });

  const dismissAlert = useMutation({
    mutationFn: async (alertId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('dashboard_alerts')
        .update({ 
          is_dismissed: true, 
          dismissed_at: new Date().toISOString() 
        })
        .eq('id', alertId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
      toast.success('Alert dismissed');
    },
    onError: (error) => {
      toast.error('Failed to dismiss alert');
      console.error('Error dismissing alert:', error);
    },
  });

  return {
    alerts,
    isLoading,
    dismissAlert: dismissAlert.mutate,
  };
};
