import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MarketValidationScore } from '@/types/founderOS';

export const useMarketValidation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch validation scores
  const { data: validationScores = [], isLoading } = useQuery({
    queryKey: ['market-validation', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('market_validation_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('validation_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Parse JSONB fields
      return (data || []).map((score) => ({
        ...score,
        top_competitors: (score.top_competitors || []) as any[],
        demand_trends: (score.demand_trends || {}) as any,
        search_volume_data: (score.search_volume_data || {}) as any,
        competitor_gaps: (score.competitor_gaps || []) as any[],
        differentiation_opportunities: (score.differentiation_opportunities || []) as string[],
        data_sources: (score.data_sources || []) as any[],
      })) as MarketValidationScore[];
    },
    enabled: !!user,
  });

  // Get latest validation score
  const latestValidation = validationScores[0] || null;

  // Trigger new validation
  const triggerValidation = useMutation({
    mutationFn: async (params: {
      business_idea: string;
      industry?: string;
      target_market?: string;
      session_id?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('market-validation-engine', {
        body: {
          business_idea: params.business_idea,
          industry: params.industry,
          target_market: params.target_market,
          session_id: params.session_id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-validation'] });
      toast.success('Market validation completed');
    },
    onError: (error) => {
      toast.error('Failed to validate market');
      console.error('Error validating market:', error);
    },
  });

  // Calculate average validation score
  const averageScore = validationScores.length > 0
    ? validationScores.reduce((sum, score) => sum + (score.overall_validation_score || 0), 0) / validationScores.length
    : 0;

  // Get score trend (comparing latest to previous)
  const scoreTrend = validationScores.length >= 2
    ? (validationScores[0].overall_validation_score || 0) - (validationScores[1].overall_validation_score || 0)
    : 0;

  return {
    validationScores,
    latestValidation,
    averageScore,
    scoreTrend,
    isLoading,
    triggerValidation: triggerValidation.mutate,
    isTriggering: triggerValidation.isPending,
  };
};
