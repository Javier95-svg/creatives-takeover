import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categories = ['business', 'startup', 'ai', 'technology'], limit = 10 } = await req.json();

    console.log('Analyzing trends for categories:', categories);

    // Generate trends for each category
    const trendPromises = categories.map(async (category: string) => {
      const prompt = `Analyze the latest trends in ${category} for entrepreneurs and business builders. Focus on:
1. Emerging opportunities with high growth potential
2. Market shifts and disruptions
3. Consumer behavior changes
4. Technology adoption patterns
5. Investment and funding trends

Provide 3-5 specific, actionable trends with:
- Clear trend title (max 60 chars)
- Brief description (max 200 chars)
- Opportunity score (0-10)
- Key keywords
- Market size indicator (emerging/growing/mature)
- Geographic relevance

Format as structured data.`;

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are a business trend analyst. Provide structured, actionable insights for entrepreneurs. Be specific and data-driven.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
          search_recency_filter: 'week'
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      return { category, analysis: data.choices[0].message.content };
    });

    const categoryAnalyses = await Promise.all(trendPromises);

    // Parse and structure the trends
    const trends = [];
    for (const { category, analysis } of categoryAnalyses) {
      // Extract structured data from AI response
      const trendMatches = analysis.match(/\d+\.\s*([^\n]+)/g) || [];
      
      for (let i = 0; i < Math.min(trendMatches.length, 2); i++) {
        const trendText = trendMatches[i];
        const title = trendText.replace(/^\d+\.\s*/, '').substring(0, 60);
        
        // Extract keywords from the trend text
        const keywords = extractKeywords(trendText);
        
        // Calculate trend scores based on content
        const trendScore = calculateTrendScore(trendText);
        const opportunityScore = calculateOpportunityScore(trendText);
        
        trends.push({
          title: title,
          description: generateDescription(trendText, analysis),
          category: category,
          trend_score: trendScore,
          keywords: keywords,
          sentiment: determineSentiment(trendText),
          opportunity_score: opportunityScore,
          market_size_indicator: determineMarketSize(trendText),
          geographic_relevance: extractGeography(analysis),
          source_urls: [],
          is_active: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }

    // Store trends in database
    const { data: storedTrends, error: insertError } = await supabase
      .from('trends')
      .insert(trends)
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    // Clean up expired trends
    await supabase
      .from('trends')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString());

    console.log(`Successfully stored ${storedTrends?.length || 0} trends`);

    return new Response(JSON.stringify({
      success: true,
      trends: storedTrends,
      message: `Analyzed and stored ${storedTrends?.length || 0} trends`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in trends-analyzer function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractKeywords(text: string): string[] {
  const keywords = [];
  const commonPatterns = [
    /AI|artificial intelligence/gi,
    /blockchain|crypto|web3/gi,
    /sustainability|ESG|green/gi,
    /remote work|digital nomad/gi,
    /fintech|payments/gi,
    /healthcare|medtech/gi,
    /education|edtech/gi,
    /e-commerce|marketplace/gi,
    /SaaS|software/gi,
    /automation|robotics/gi
  ];

  commonPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      keywords.push(...matches.map(m => m.toLowerCase()));
    }
  });

  return [...new Set(keywords)].slice(0, 10);
}

function calculateTrendScore(text: string): number {
  let score = 5.0; // Base score
  
  // Boost for growth indicators
  if (/growing|increasing|rising|surge|boom/gi.test(text)) score += 1.5;
  if (/billion|million|funding|investment/gi.test(text)) score += 1.0;
  if (/new|emerging|innovative|breakthrough/gi.test(text)) score += 0.8;
  if (/market|demand|adoption/gi.test(text)) score += 0.7;
  
  return Math.min(10.0, Math.max(1.0, score));
}

function calculateOpportunityScore(text: string): number {
  let score = 5.0;
  
  if (/opportunity|potential|untapped/gi.test(text)) score += 1.5;
  if (/early stage|nascent|emerging/gi.test(text)) score += 1.2;
  if (/disruption|transformation/gi.test(text)) score += 1.0;
  if (/gap|need|problem/gi.test(text)) score += 0.8;
  
  return Math.min(10.0, Math.max(1.0, score));
}

function determineSentiment(text: string): string {
  const positiveWords = /growth|opportunity|success|innovation|positive|bullish|optimistic/gi;
  const negativeWords = /decline|challenge|risk|negative|bearish|pessimistic|problem/gi;
  
  const positiveCount = (text.match(positiveWords) || []).length;
  const negativeCount = (text.match(negativeWords) || []).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function determineMarketSize(text: string): string {
  if (/billion|massive|huge|dominant/gi.test(text)) return 'mature';
  if (/growing|expanding|scaling/gi.test(text)) return 'growing';
  return 'emerging';
}

function extractGeography(text: string): string[] {
  const regions = [];
  const patterns = [
    { pattern: /US|United States|America/gi, region: 'North America' },
    { pattern: /Europe|EU|European/gi, region: 'Europe' },
    { pattern: /Asia|China|India|Japan/gi, region: 'Asia' },
    { pattern: /global|worldwide|international/gi, region: 'Global' }
  ];

  patterns.forEach(({ pattern, region }) => {
    if (pattern.test(text)) {
      regions.push(region);
    }
  });

  return regions.length > 0 ? regions : ['Global'];
}

function generateDescription(trendText: string, fullAnalysis: string): string {
  // Extract a concise description from the trend
  const sentences = trendText.split(/[.!?]+/);
  let description = sentences[0] || trendText;
  
  // Clean up and limit length
  description = description.replace(/^\d+\.\s*/, '').trim();
  if (description.length > 200) {
    description = description.substring(0, 197) + '...';
  }
  
  return description;
}