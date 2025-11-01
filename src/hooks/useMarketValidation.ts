import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { MarketValidationScore } from '@/types/founderOS';

export const useMarketValidation = (sessionId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [validation, setValidation] = useState<MarketValidationScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch validation score for session
  const fetchValidation = async () => {
    if (!user || !sessionId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('market_validation_scores')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      if (data) {
        setValidation({
          ...data,
          top_competitors: (data.top_competitors as any) || [],
          demand_trends: (data.demand_trends as any) || {},
          search_volume_data: (data.search_volume_data as any) || {},
          competitor_gaps: (data.competitor_gaps as any) || [],
          data_sources: (data.data_sources as any) || [],
        } as MarketValidationScore);
      } else {
        setValidation(null);
      }
    } catch (err) {
      console.error('Error fetching validation:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch validation');
    } finally {
      setLoading(false);
    }
  };

  // Run market validation
  const runValidation = async (businessIdea: string, industry: string, targetMarket: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to validate your idea",
        variant: "destructive",
      });
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Call edge function to run validation
      const { data, error: functionError } = await supabase.functions.invoke('market-validation-engine', {
        body: {
          business_idea: businessIdea,
          industry,
          target_market: targetMarket,
          session_id: sessionId,
        },
      });

      if (functionError) throw functionError;

      if (data?.validation_score) {
        setValidation(data.validation_score);
        toast({
          title: "Validation Complete",
          description: `Overall score: ${data.validation_score.overall_validation_score}/100`,
        });
        return data.validation_score;
      }

      return null;
    } catch (err) {
      console.error('Error running validation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate idea';
      setError(errorMessage);
      toast({
        title: "Validation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get validation score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Get validation level text
  const getValidationLevel = (score: number): string => {
    if (score >= 75) return 'Strong Validation';
    if (score >= 50) return 'Moderate Validation';
    return 'Needs Improvement';
  };

  useEffect(() => {
    if (sessionId) {
      fetchValidation();
    }
  }, [sessionId, user]);

  return {
    validation,
    loading,
    error,
    runValidation,
    refreshValidation: fetchValidation,
    getScoreColor,
    getValidationLevel,
  };
};
