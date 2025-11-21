import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCredits } from '@/hooks/useCredits';
import { CREDIT_COSTS } from '@/config/constants';
import { MarketValidationScore } from '@/types/founderOS';

export const useMarketValidation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { hasCredits } = useCredits();

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
        customer_needs_data: (score.customer_needs_data || undefined) as any,
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

      // Check credits before proceeding
      const requiredCredits = CREDIT_COSTS.MARKET_VALIDATION;
      if (!hasCredits(requiredCredits)) {
        throw new Error(`Insufficient credits. Market validation requires ${requiredCredits} credits.`);
      }

      const { data, error } = await supabase.functions.invoke('market-validation-engine', {
        body: {
          business_idea: params.business_idea,
          industry: params.industry,
          target_market: params.target_market,
          session_id: params.session_id,
        },
      });

      if (error) {
        // Handle credit errors specifically
        if (error.status === 402 || (error.message && error.message.includes('credits'))) {
          throw new Error(`Insufficient credits. Market validation requires ${requiredCredits} credits.`);
        }
        throw error;
      }

      if (data?.error) {
        if (data.error.includes('credits') || data.required) {
          throw new Error(`Insufficient credits. Market validation requires ${data.required || requiredCredits} credits.`);
        }
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-validation'] });
      toast.success(`Market validation completed! (Used ${CREDIT_COSTS.MARKET_VALIDATION} credits)`);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate market';
      if (errorMessage.includes('credits')) {
        toast.error(errorMessage);
      } else {
        toast.error('Failed to validate market');
      }
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
