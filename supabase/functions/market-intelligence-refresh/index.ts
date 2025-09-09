import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

class MarketIntelligenceRefresh {
  private supabase: any;
  private newsApiKey: string;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    this.newsApiKey = Deno.env.get('NEWSAPI_KEY') ?? '';
  }

  async refreshMarketIntelligence(): Promise<{ processed: number; errors: string[] }> {
    console.log('Starting market intelligence refresh...');
    
    const results = {
      processed: 0,
      errors: [] as string[]
    };

    try {
      // 1. Clean up expired data
      await this.cleanupExpiredData();

      // 2. Update freshness scores
      await this.updateFreshnessScores();

      // 3. Fetch new market data
      const industries = ['technology', 'healthcare', 'finance', 'retail', 'manufacturing', 'energy'];
      
      for (const industry of industries) {
        try {
          await this.fetchAndStoreIndustryData(industry);
          results.processed++;
        } catch (error) {
          results.errors.push(`Failed to refresh ${industry}: ${error.message}`);
        }
      }

      // 4. Generate market insights using AI
      await this.generateAIInsights();

      console.log('Market intelligence refresh completed:', results);
      return results;

    } catch (error) {
      console.error('Market intelligence refresh error:', error);
      results.errors.push(`Global error: ${error.message}`);
      return results;
    }
  }

  private async cleanupExpiredData(): Promise<void> {
    try {
      // Clean expired intelligence data
      const { error: intelligenceError } = await this.supabase
        .from('market_intelligence')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (intelligenceError) {
        console.error('Failed to clean intelligence data:', intelligenceError);
      }

      // Clean expired cache
      const { error: cacheError } = await this.supabase
        .from('market_insights_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (cacheError) {
        console.error('Failed to clean cache data:', cacheError);
      }

      console.log('Expired data cleanup completed');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  private async updateFreshnessScores(): Promise<void> {
    try {
      await this.supabase.rpc('update_market_data_freshness');
      console.log('Freshness scores updated');
    } catch (error) {
      console.error('Failed to update freshness scores:', error);
    }
  }

  private async fetchAndStoreIndustryData(industry: string): Promise<void> {
    console.log(`Fetching data for industry: ${industry}`);

    // Get data source configurations
    const { data: sources } = await this.supabase
      .from('market_data_sources')
      .select('*')
      .eq('is_active', true);

    if (!sources || sources.length === 0) {
      console.log('No active data sources found');
      return;
    }

    // Fetch news data for this industry
    if (this.newsApiKey) {
      await this.fetchAndStoreNewsData(industry);
    }

    // Fetch trend data (simulated)
    await this.fetchAndStoreTrendData(industry);

    // Update source last_updated_at
    await this.supabase
      .from('market_data_sources')
      .update({ last_updated_at: new Date().toISOString() })
      .in('source_name', ['News API', 'Trends Analysis']);
  }

  private async fetchAndStoreNewsData(industry: string): Promise<void> {
    try {
      const response = await fetch(`https://newsapi.org/v2/everything?q=${industry}&sortBy=publishedAt&pageSize=10&language=en&from=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`, {
        headers: {
          'X-API-Key': this.newsApiKey
        }
      });

      if (!response.ok) {
        throw new Error(`News API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.articles || data.articles.length === 0) {
        console.log(`No news articles found for ${industry}`);
        return;
      }

      // Get News API source ID
      const { data: newsSource } = await this.supabase
        .from('market_data_sources')
        .select('id')
        .eq('source_name', 'News API')
        .single();

      if (!newsSource) {
        console.error('News API source not found in database');
        return;
      }

      // Store articles as market intelligence
      for (const article of data.articles) {
        const keywords = this.extractKeywords(article.title + ' ' + (article.description || ''));
        const relevanceScore = this.calculateRelevanceScore(article, industry);
        
        if (relevanceScore < 0.3) continue; // Skip low relevance articles

        const intelligenceData = {
          source_id: newsSource.id,
          data_type: 'news',
          industry: industry,
          keywords: keywords,
          relevance_score: relevanceScore,
          freshness_score: this.calculateFreshnessScore(new Date(article.publishedAt)),
          data_payload: {
            title: article.title,
            summary: article.description || article.content?.substring(0, 200) + '...',
            url: article.url,
            author: article.author,
            published_at: article.publishedAt,
            source_name: article.source?.name,
            insights: this.extractInsights(article.title + ' ' + (article.description || '')),
            market_impact: this.assessMarketImpact(article.title + ' ' + (article.description || '')),
            opportunity_score: this.calculateOpportunityScore(article)
          },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        await this.supabase
          .from('market_intelligence')
          .upsert(intelligenceData);
      }

      console.log(`Stored ${data.articles.length} news articles for ${industry}`);

    } catch (error) {
      console.error(`Failed to fetch news for ${industry}:`, error);
      throw error;
    }
  }

  private async fetchAndStoreTrendData(industry: string): Promise<void> {
    try {
      // Simulated trend data - in production, integrate with Google Trends API
      const trendTopics = this.generateTrendTopics(industry);
      
      // Get Trends source ID
      const { data: trendsSource } = await this.supabase
        .from('market_data_sources')
        .select('id')
        .eq('source_name', 'Google Trends')
        .single();

      if (!trendsSource) {
        console.error('Trends source not found in database');
        return;
      }

      for (const topic of trendTopics) {
        const intelligenceData = {
          source_id: trendsSource.id,
          data_type: 'trend',
          industry: industry,
          keywords: [topic.keyword],
          relevance_score: topic.relevance,
          freshness_score: 0.9,
          data_payload: {
            title: `Trending: ${topic.keyword}`,
            summary: `${topic.keyword} is showing ${topic.trend_direction} trend in ${industry} sector`,
            trend_direction: topic.trend_direction,
            growth_rate: topic.growth_rate,
            search_volume: topic.search_volume,
            insights: [
              `${topic.keyword} search volume ${topic.trend_direction === 'upward' ? 'increased' : 'decreased'} by ${topic.growth_rate}%`,
              'Market opportunity detected in this trend',
              `Relevance to ${industry}: ${topic.relevance > 0.7 ? 'High' : topic.relevance > 0.4 ? 'Medium' : 'Low'}`
            ],
            market_impact: topic.relevance > 0.7 ? 'High' : topic.relevance > 0.4 ? 'Medium' : 'Low',
            opportunity_score: topic.relevance * 0.8 + Math.random() * 0.2
          },
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
        };

        await this.supabase
          .from('market_intelligence')
          .upsert(intelligenceData);
      }

      console.log(`Stored ${trendTopics.length} trend insights for ${industry}`);

    } catch (error) {
      console.error(`Failed to generate trends for ${industry}:`, error);
      throw error;
    }
  }

  private async generateAIInsights(): Promise<void> {
    try {
      console.log('Generating AI-powered market insights...');

      // Get recent market intelligence data
      const { data: recentData } = await this.supabase
        .from('market_intelligence')
        .select('*')
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('relevance_score', { ascending: false })
        .limit(20);

      if (!recentData || recentData.length === 0) {
        console.log('No recent data for AI analysis');
        return;
      }

      // Group by industry for analysis
      const industriesData = recentData.reduce((acc, item) => {
        if (!acc[item.industry]) acc[item.industry] = [];
        acc[item.industry].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      // Generate insights for each industry
      for (const [industry, data] of Object.entries(industriesData)) {
        const aiInsight = await this.generateIndustryInsight(industry, data);
        
        if (aiInsight) {
          // Store AI-generated insight
          const { data: aiSource } = await this.supabase
            .from('market_data_sources')
            .select('id')
            .eq('source_name', 'Market Research DB')
            .single();

          if (aiSource) {
            await this.supabase
              .from('market_intelligence')
              .insert({
                source_id: aiSource.id,
                data_type: 'ai_insight',
                industry: industry,
                keywords: aiInsight.keywords,
                relevance_score: aiInsight.confidence,
                freshness_score: 1.0,
                data_payload: aiInsight,
                expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
              });
          }
        }
      }

      console.log('AI insights generation completed');

    } catch (error) {
      console.error('AI insights generation error:', error);
    }
  }

  private async generateIndustryInsight(industry: string, data: any[]): Promise<any> {
    // Simulated AI insight generation - in production, use AI model
    const trends = data.filter(item => item.data_type === 'trend');
    const news = data.filter(item => item.data_type === 'news');

    const avgOpportunityScore = data.reduce((sum, item) => 
      sum + (item.data_payload?.opportunity_score || 0), 0) / data.length;

    const topKeywords = data.flatMap(item => item.keywords || [])
      .reduce((acc, keyword) => {
        acc[keyword] = (acc[keyword] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const sortedKeywords = Object.entries(topKeywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([keyword]) => keyword);

    return {
      title: `AI Market Analysis: ${industry} Sector`,
      summary: `Comprehensive AI analysis of ${industry} market based on ${data.length} data points`,
      insights: [
        `Average opportunity score: ${avgOpportunityScore.toFixed(2)}`,
        `${trends.length} trending topics identified`,
        `${news.length} relevant news articles analyzed`,
        `Top emerging themes: ${sortedKeywords.slice(0, 3).join(', ')}`
      ],
      market_impact: avgOpportunityScore > 0.7 ? 'High' : avgOpportunityScore > 0.4 ? 'Medium' : 'Low',
      opportunity_score: avgOpportunityScore,
      confidence: Math.min(1.0, data.length / 10), // More data = higher confidence
      keywords: sortedKeywords,
      analysis_type: 'automated_ai',
      data_points_analyzed: data.length,
      generated_at: new Date().toISOString()
    };
  }

  private generateTrendTopics(industry: string): Array<{keyword: string, relevance: number, trend_direction: string, growth_rate: number, search_volume: number}> {
    const industryTopics = {
      technology: ['AI automation', 'cloud computing', 'cybersecurity', 'blockchain', 'quantum computing'],
      healthcare: ['telemedicine', 'biotech', 'medical devices', 'digital health', 'personalized medicine'],
      finance: ['fintech', 'cryptocurrency', 'digital banking', 'robo-advisors', 'insurtech'],
      retail: ['e-commerce', 'omnichannel', 'social commerce', 'sustainable retail', 'personalization'],
      manufacturing: ['Industry 4.0', 'automation', 'IoT sensors', 'predictive maintenance', 'digital twins'],
      energy: ['renewable energy', 'energy storage', 'smart grid', 'carbon capture', 'hydrogen fuel']
    };

    const topics = industryTopics[industry as keyof typeof industryTopics] || ['digital transformation', 'sustainability', 'automation'];
    
    return topics.map(topic => ({
      keyword: topic,
      relevance: Math.random() * 0.4 + 0.6, // 0.6-1.0
      trend_direction: Math.random() > 0.3 ? 'upward' : 'downward',
      growth_rate: Math.floor(Math.random() * 50) + 10,
      search_volume: Math.floor(Math.random() * 10000) + 1000
    }));
  }

  private extractKeywords(text: string): string[] {
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must'];
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 10);
  }

  private calculateRelevanceScore(article: any, industry: string): number {
    const text = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();
    let score = 0.2; // base score

    if (text.includes(industry.toLowerCase())) score += 0.4;
    if (text.includes('market') || text.includes('business')) score += 0.2;
    if (text.includes('growth') || text.includes('trend')) score += 0.2;

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

  private extractInsights(text: string): string[] {
    const insights = [];
    const lowercaseText = text.toLowerCase();

    if (lowercaseText.includes('growth') || lowercaseText.includes('increase')) {
      insights.push('Market growth indicators detected');
    }
    if (lowercaseText.includes('investment') || lowercaseText.includes('funding')) {
      insights.push('Investment activity in sector');
    }
    if (lowercaseText.includes('disruption') || lowercaseText.includes('innovation')) {
      insights.push('Disruptive innovation opportunity');
    }

    return insights.length > 0 ? insights : ['Market activity detected'];
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
    const text = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();
    let score = 0.3;

    if (text.includes('opportunity') || text.includes('growth')) score += 0.2;
    if (text.includes('investment') || text.includes('funding')) score += 0.2;
    if (text.includes('market') || text.includes('demand')) score += 0.1;
    if (text.includes('innovation') || text.includes('technology')) score += 0.2;

    return Math.min(1.0, score);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const refresher = new MarketIntelligenceRefresh();
    const result = await refresher.refreshMarketIntelligence();
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Market intelligence refresh error:', error);
    return new Response(
      JSON.stringify({ 
        processed: 0,
        errors: [error.message]
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});