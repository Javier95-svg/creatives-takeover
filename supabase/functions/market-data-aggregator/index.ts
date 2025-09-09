import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketDataRequest {
  industries: string[];
  geographic_regions?: string[];
  data_types?: string[]; // 'trend', 'news', 'competitor', 'market_size', 'regulation'
  keywords?: string[];
  refresh_cache?: boolean;
}

interface MarketDataResponse {
  data: MarketIntelligenceData[];
  freshness_avg: number;
  confidence_score: number;
  sources_used: string[];
  cache_hit: boolean;
}

interface MarketIntelligenceData {
  id: string;
  data_type: string;
  industry: string;
  geographic_region?: string;
  title: string;
  summary: string;
  insights: string[];
  market_impact: string;
  opportunity_score: number;
  relevance_score: number;
  freshness_score: number;
  source: string;
  created_at: string;
  expires_at: string;
  metadata: any;
}

class MarketDataAggregator {
  private supabase: any;
  private newsApiKey: string;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    this.newsApiKey = Deno.env.get('NEWSAPI_KEY') ?? '';
  }

  async aggregateMarketData(request: MarketDataRequest): Promise<MarketDataResponse> {
    console.log('Aggregating market data for:', request);

    // Check cache first
    if (!request.refresh_cache) {
      const cached = await this.getCachedInsights(request);
      if (cached) {
        return cached;
      }
    }

    const allData: MarketIntelligenceData[] = [];
    const sourcesUsed: string[] = [];

    // Fetch from multiple sources in parallel
    const dataPromises = [];

    // 1. Fetch news data
    if (this.newsApiKey && (!request.data_types || request.data_types.includes('news'))) {
      dataPromises.push(this.fetchNewsData(request.industries, request.keywords || []));
      sourcesUsed.push('News API');
    }

    // 2. Fetch trends data (simulated)
    if (!request.data_types || request.data_types.includes('trend')) {
      dataPromises.push(this.fetchTrendsData(request.industries, request.keywords || []));
      sourcesUsed.push('Trends Analysis');
    }

    // 3. Fetch market intelligence from database
    dataPromises.push(this.fetchExistingIntelligence(request));

    try {
      const results = await Promise.allSettled(dataPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          allData.push(...result.value);
        } else {
          console.error(`Data source ${index} failed:`, result.status === 'rejected' ? result.reason : 'No data');
        }
      });

      // Calculate aggregated metrics
      const freshnessAvg = allData.length > 0 
        ? allData.reduce((sum, item) => sum + item.freshness_score, 0) / allData.length 
        : 0;

      const confidenceScore = this.calculateConfidenceScore(allData, sourcesUsed);

      // Sort by relevance and freshness
      allData.sort((a, b) => (b.relevance_score * b.freshness_score) - (a.relevance_score * a.freshness_score));

      const response: MarketDataResponse = {
        data: allData.slice(0, 50), // Limit to top 50 items
        freshness_avg: freshnessAvg,
        confidence_score: confidenceScore,
        sources_used: sourcesUsed,
        cache_hit: false
      };

      // Cache the response
      await this.cacheInsights(request, response);

      return response;

    } catch (error) {
      console.error('Market data aggregation error:', error);
      throw error;
    }
  }

  private async fetchNewsData(industries: string[], keywords: string[]): Promise<MarketIntelligenceData[]> {
    if (!this.newsApiKey) return [];

    const searchQuery = [...industries, ...keywords].join(' OR ');
    
    try {
      const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&sortBy=publishedAt&pageSize=20&language=en`, {
        headers: {
          'X-API-Key': this.newsApiKey
        }
      });

      if (!response.ok) {
        console.error('News API error:', response.status, await response.text());
        return [];
      }

      const data = await response.json();
      
      return data.articles?.map((article: any) => ({
        id: `news-${Date.now()}-${Math.random()}`,
        data_type: 'news',
        industry: industries[0] || 'general',
        title: article.title,
        summary: article.description || article.content?.substring(0, 200) + '...',
        insights: this.extractInsights(article.title + ' ' + (article.description || '')),
        market_impact: this.assessMarketImpact(article.title + ' ' + (article.description || '')),
        opportunity_score: this.calculateOpportunityScore(article),
        relevance_score: this.calculateRelevanceScore(article, industries, keywords),
        freshness_score: this.calculateFreshnessScore(new Date(article.publishedAt)),
        source: article.source?.name || 'News API',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          url: article.url,
          author: article.author,
          published_at: article.publishedAt,
          source_name: article.source?.name
        }
      })) || [];

    } catch (error) {
      console.error('News fetch error:', error);
      return [];
    }
  }

  private async fetchTrendsData(industries: string[], keywords: string[]): Promise<MarketIntelligenceData[]> {
    // Simulated trends data - in production, integrate with Google Trends API or similar
    const trendTopics = [
      'AI automation', 'remote work tools', 'sustainable technology', 'fintech innovation',
      'health tech', 'e-commerce growth', 'blockchain applications', 'cybersecurity solutions'
    ];

    return trendTopics.map(topic => ({
      id: `trend-${Date.now()}-${Math.random()}`,
      data_type: 'trend',
      industry: industries[0] || 'technology',
      title: `Rising trend: ${topic}`,
      summary: `${topic} is showing significant growth in search volume and market interest.`,
      insights: [
        `${topic} search volume up 40% this month`,
        'Increasing investment activity in this sector',
        'New market opportunities emerging'
      ],
      market_impact: 'Medium to High',
      opportunity_score: Math.random() * 0.5 + 0.5, // 0.5-1.0
      relevance_score: this.calculateKeywordRelevance(topic, [...industries, ...keywords]),
      freshness_score: 0.9,
      source: 'Trends Analysis',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      metadata: {
        trend_type: 'search_volume',
        growth_rate: Math.floor(Math.random() * 50) + 20
      }
    })).filter(item => item.relevance_score > 0.3);
  }

  private async fetchExistingIntelligence(request: MarketDataRequest): Promise<MarketIntelligenceData[]> {
    try {
      let query = this.supabase
        .from('market_intelligence')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .gt('freshness_score', 0.1)
        .order('relevance_score', { ascending: false })
        .limit(30);

      if (request.industries.length > 0) {
        query = query.in('industry', request.industries);
      }

      if (request.data_types && request.data_types.length > 0) {
        query = query.in('data_type', request.data_types);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Database fetch error:', error);
        return [];
      }

      return data?.map(item => ({
        id: item.id,
        data_type: item.data_type,
        industry: item.industry,
        geographic_region: item.geographic_region,
        title: item.data_payload.title || 'Market Intelligence',
        summary: item.data_payload.summary || 'No summary available',
        insights: item.data_payload.insights || [],
        market_impact: item.data_payload.market_impact || 'Unknown',
        opportunity_score: item.data_payload.opportunity_score || 0,
        relevance_score: item.relevance_score,
        freshness_score: item.freshness_score,
        source: item.data_payload.source || 'Database',
        created_at: item.created_at,
        expires_at: item.expires_at,
        metadata: item.data_payload.metadata || {}
      })) || [];

    } catch (error) {
      console.error('Existing intelligence fetch error:', error);
      return [];
    }
  }

  private extractInsights(text: string): string[] {
    const insights = [];
    const lowercaseText = text.toLowerCase();

    // Simple keyword-based insight extraction
    if (lowercaseText.includes('growth') || lowercaseText.includes('increase')) {
      insights.push('Market growth indicators detected');
    }
    if (lowercaseText.includes('investment') || lowercaseText.includes('funding')) {
      insights.push('Investment activity in sector');
    }
    if (lowercaseText.includes('disruption') || lowercaseText.includes('innovation')) {
      insights.push('Disruptive innovation opportunity');
    }
    if (lowercaseText.includes('regulation') || lowercaseText.includes('policy')) {
      insights.push('Regulatory environment changes');
    }

    return insights.length > 0 ? insights : ['General market activity'];
  }

  private assessMarketImpact(text: string): string {
    const highImpactWords = ['breakthrough', 'revolutionary', 'massive', 'billion', 'disruptive'];
    const mediumImpactWords = ['significant', 'important', 'notable', 'emerging', 'growing'];
    
    const lowercaseText = text.toLowerCase();
    
    if (highImpactWords.some(word => lowercaseText.includes(word))) {
      return 'High';
    } else if (mediumImpactWords.some(word => lowercaseText.includes(word))) {
      return 'Medium';
    } else {
      return 'Low';
    }
  }

  private calculateOpportunityScore(item: any): number {
    // Simple scoring based on content analysis
    const text = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();
    let score = 0.3; // base score

    if (text.includes('opportunity') || text.includes('growth')) score += 0.2;
    if (text.includes('investment') || text.includes('funding')) score += 0.2;
    if (text.includes('market') || text.includes('demand')) score += 0.1;
    if (text.includes('innovation') || text.includes('technology')) score += 0.2;

    return Math.min(1.0, score);
  }

  private calculateRelevanceScore(item: any, industries: string[], keywords: string[]): number {
    const text = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();
    let score = 0;

    // Industry relevance
    industries.forEach(industry => {
      if (text.includes(industry.toLowerCase())) {
        score += 0.4;
      }
    });

    // Keyword relevance
    keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        score += 0.3;
      }
    });

    return Math.min(1.0, score);
  }

  private calculateKeywordRelevance(topic: string, terms: string[]): number {
    const topicLower = topic.toLowerCase();
    let score = 0;

    terms.forEach(term => {
      if (topicLower.includes(term.toLowerCase())) {
        score += 0.5;
      }
    });

    return Math.min(1.0, score);
  }

  private calculateFreshnessScore(publishedDate: Date): number {
    const now = new Date();
    const ageHours = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60);
    
    if (ageHours < 1) return 1.0;
    if (ageHours < 6) return 0.9;
    if (ageHours < 24) return 0.7;
    if (ageHours < 72) return 0.5;
    return 0.3;
  }

  private calculateConfidenceScore(data: MarketIntelligenceData[], sources: string[]): number {
    if (data.length === 0) return 0;

    const avgRelevance = data.reduce((sum, item) => sum + item.relevance_score, 0) / data.length;
    const avgFreshness = data.reduce((sum, item) => sum + item.freshness_score, 0) / data.length;
    const sourceMultiplier = Math.min(1.0, sources.length / 3); // More sources = higher confidence

    return Math.min(1.0, (avgRelevance * 0.4 + avgFreshness * 0.3 + sourceMultiplier * 0.3));
  }

  private async getCachedInsights(request: MarketDataRequest): Promise<MarketDataResponse | null> {
    try {
      const cacheKey = this.generateCacheKey(request);
      
      const { data, error } = await this.supabase
        .from('market_insights_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return {
        ...data.insights_data,
        cache_hit: true
      };

    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  private async cacheInsights(request: MarketDataRequest, response: MarketDataResponse): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(request);
      
      await this.supabase
        .from('market_insights_cache')
        .upsert({
          cache_key: cacheKey,
          query_params: request,
          insights_data: response,
          confidence_score: response.confidence_score,
          data_sources: response.sources_used,
          expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours
        });

    } catch (error) {
      console.error('Cache save error:', error);
    }
  }

  private generateCacheKey(request: MarketDataRequest): string {
    const keyData = {
      industries: request.industries.sort(),
      regions: (request.geographic_regions || []).sort(),
      types: (request.data_types || []).sort(),
      keywords: (request.keywords || []).sort()
    };
    
    return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const aggregator = new MarketDataAggregator();
    const request: MarketDataRequest = await req.json();
    
    // Validate request
    if (!request.industries || request.industries.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one industry must be specified' }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const response = await aggregator.aggregateMarketData(request);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Market data aggregator error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        data: [],
        freshness_avg: 0,
        confidence_score: 0,
        sources_used: [],
        cache_hit: false
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});