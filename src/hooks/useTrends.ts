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
  article_url?: string;
  article_source?: string;
  author?: string;
  publication_date?: string;
  summary?: string;
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
      console.log('📋 Fetching trends from database...');

      const { data, error: fetchError } = await supabase
        .from('trends')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('trend_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      console.log('📊 Fetch trends result:', { data, error: fetchError, count: data?.length });

      if (fetchError) {
        console.error('❌ Database fetch error:', fetchError);
        throw fetchError;
      }

      const processedTrends = (data || []).map(item => ({
        ...item,
        sentiment: (item.sentiment as 'positive' | 'negative' | 'neutral') || 'neutral'
      }));

      console.log('✅ Successfully fetched trends:', processedTrends.length);
      setTrends(processedTrends);
    } catch (err) {
      console.error('❌ Error fetching trends:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trends');
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewTrends = async () => {
    try {
      setError(null);
      console.log('🔍 Fetching fresh articles from NewsAPI...');
      
      // Try the new news-aggregator function first
      const { data, error: functionError } = await supabase.functions.invoke('news-aggregator', {
        body: { 
          topics: 'business OR technology OR AI OR startup OR innovation OR creator economy',
          pageSize: 20,
          recencyDays: 7
        }
      });

      console.log('📊 News aggregator response:', { data, error: functionError });

      if (functionError) {
        console.error('❌ News aggregator error:', functionError);
        throw functionError;
      }

      if (data?.success) {
        console.log('✅ News aggregation successful:', data.saved, 'new articles saved');
        // Refresh trends after generation
        await fetchTrends();
        return data.processed || [];
      } else {
        console.error('❌ News aggregation failed:', data?.error);
        throw new Error(data?.error || 'Failed to fetch news articles');
      }
    } catch (err) {
      console.error('❌ Error generating trends:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trending articles');
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
    console.log('🚀 useTrends: Force generating fresh NewsAPI articles...');
    generateNewTrends().catch((err) => {
      console.error('❌ Failed to generate fresh articles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch fresh articles');
    });
  }, []);

  return {
    trends,
    isLoading,
    error,
    refetch,
    generateNewTrends
  };
};