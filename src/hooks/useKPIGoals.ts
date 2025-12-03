import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface KPIGoal {
  id: string;
  goal_type: 'revenue' | 'customers' | 'projects' | 'custom';
  goal_name: string;
  current_value: number;
  target_value: number;
  unit: string;
  trend_percentage: number;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  is_active: boolean;
}

export const useKPIGoals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['kpi-goals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('kpi_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KPIGoal[];
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<KPIGoal> }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('kpi_goals')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-goals'] });
      toast.success('Goal updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update goal');
      console.error('Error updating goal:', error);
    },
  });

  const createGoal = useMutation({
    mutationFn: async (goalData: Omit<KPIGoal, 'id'>) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('kpi_goals')
        .insert({
          user_id: user.id,
          ...goalData,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-goals'] });
      toast.success('Goal created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create goal');
      console.error('Error creating goal:', error);
    },
  });

  // Get primary goal (first active goal or create a default one)
  const primaryGoal = goals[0] || {
    id: 'default',
    goal_name: 'Monthly Revenue',
    current_value: 0,
    target_value: 10000,
    unit: '$',
    trend_percentage: 0,
    period: 'monthly' as const,
    goal_type: 'revenue' as const,
    is_active: true,
  };

  const progressPercentage = primaryGoal.target_value > 0 
    ? Math.min((primaryGoal.current_value / primaryGoal.target_value) * 100, 100)
    : 0;

  return {
    goals,
    primaryGoal,
    progressPercentage,
    isLoading,
    updateGoal: updateGoal.mutate,
    createGoal: createGoal.mutate,
  };
};
