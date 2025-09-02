import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface Trend {
  id: string;
  title: string;
  description: string;
  category: string;
  trend_score: number;
  opportunity_score: number;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  market_size_indicator: string;
  geographic_relevance: string[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export const useTrends = () => {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('trends')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('trend_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) {
        throw fetchError;
      }

      setTrends((data || []).map(item => ({
        ...item,
        sentiment: (item.sentiment as 'positive' | 'negative' | 'neutral') || 'neutral'
      })));
    } catch (err) {
      console.error('Error fetching trends:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trends');
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewTrends = async (categories: string[] = ['business', 'startup', 'ai', 'technology']) => {
    try {
      setError(null);
      
      const { data, error: functionError } = await supabase.functions.invoke('trends-analyzer', {
        body: { categories, limit: 10 }
      });

      if (functionError) {
        throw functionError;
      }

      if (data?.success) {
        // Refresh trends after generation
        await fetchTrends();
        return data.trends;
      } else {
        throw new Error(data?.error || 'Failed to generate trends');
      }
    } catch (err) {
      console.error('Error generating trends:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate trends');
      throw err;
    }
  };

  const refetch = async () => {
    // Try to fetch existing trends first
    await fetchTrends();
    
    // If no recent trends, generate new ones
    if (trends.length === 0) {
      try {
        await generateNewTrends();
      } catch (err) {
        console.error('Failed to generate new trends:', err);
      }
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  // Auto-generate trends if none exist
  useEffect(() => {
    if (!isLoading && trends.length === 0 && !error) {
      generateNewTrends().catch(console.error);
    }
  }, [isLoading, trends.length, error]);

  return {
    trends,
    isLoading,
    error,
    refetch,
    generateNewTrends
  };
};