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
  // New business opportunity fields
  business_opportunity?: {
    market_gap: string;
    target_audience: string;
    revenue_model: string;
    entry_barrier: string;
    time_sensitivity: string;
    success_factors: string[];
  };
  market_size_estimate?: string;
  competition_level?: string;
  time_sensitivity?: string;
  revenue_models?: string[];
  target_audience?: string[];
  action_steps?: string[];
  entry_difficulty?: number;
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
        .order('opportunity_score', { ascending: false })
        .order('trend_score', { ascending: false })
        .limit(20);

      console.log('📊 Fetch trends result:', { data, error: fetchError, count: data?.length });

      if (fetchError) {
        console.error('❌ Database fetch error:', fetchError);
        throw fetchError;
      }

      const processedTrends = (data || []).map(item => ({
        ...item,
        sentiment: (item.sentiment as 'positive' | 'negative' | 'neutral') || 'neutral',
        business_opportunity: item.business_opportunity ? 
          (item.business_opportunity as any) :
          undefined,
        revenue_models: item.revenue_models || [],
        target_audience: item.target_audience || [],
        action_steps: item.action_steps || [],
        geographic_relevance: item.geographic_relevance || [],
        keywords: item.keywords || [],
        article_url: item.article_url || undefined,
        article_source: item.article_source || undefined,
        author: item.author || undefined,
        publication_date: item.publication_date || undefined,
        summary: item.summary || undefined
      })) as Trend[];

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
      
      // Try the news-aggregator function with business-focused queries
      const { data, error: functionError } = await supabase.functions.invoke('news-aggregator', {
        body: { 
          topics: 'business opportunity OR startup OR entrepreneurship OR market trends OR AI business',
          pageSize: 25,
          recencyDays: 14
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
    console.log('🚀 useTrends: Fetching existing trends from database...');
    fetchTrends();
  }, []);

  return {
    trends,
    isLoading,
    error,
    refetch,
    generateNewTrends
  };
};