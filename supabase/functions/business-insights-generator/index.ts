import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAndDeductCredits, getUserFromAuth } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { resolveCreditIdempotencyKey } from '../_shared/request-idempotency.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { industry, businessStage, specificQuery } = await req.json();

    if (!industry) {
      throw new Error('Industry is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first (free if cached)
    const cacheKey = `${industry}-${businessStage || 'general'}`;
    const { data: cachedInsights } = await supabase
      .from('business_insights_cache')
      .select('*')
      .eq('industry', industry)
      .eq('business_stage', businessStage || 'general')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (cachedInsights && cachedInsights.length > 0) {
      return new Response(JSON.stringify({
        insights: cachedInsights[0].insights,
        source: 'cache',
        confidence: cachedInsights[0].confidence_score
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authenticate user (only needed for new generation)
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const idempotencyKey = await resolveCreditIdempotencyKey(req, {
      userId: user.id,
      feature: 'Business Insights Generation',
      requestFingerprint: { industry, businessStage, specificQuery },
    });

    // Check and deduct credits before generating new insights
    const creditCost = CREDIT_COSTS.BUSINESS_INSIGHTS;
    const creditCheck = await checkAndDeductCredits(
      user.id,
      creditCost,
      'Business Insights Generation',
      undefined,
      { industry, businessStage, specificQuery, idempotencyKey }
    );

    if (!creditCheck.success) {
      return new Response(
        JSON.stringify({ 
          error: creditCheck.error || 'Insufficient credits',
          required: creditCost
        }),
        { 
          status: creditCheck.errorCode === 'INSUFFICIENT_CREDITS' ? 402 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get market intelligence data
    const { data: marketData } = await supabase
      .from('market_intelligence')
      .select('*')
      .eq('industry', industry)
      .gte('freshness_score', 0.2)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get trending topics
    const { data: trendingData } = await supabase
      .from('trending_market_topics')
      .select('*')
      .eq('industry', industry)
      .order('mention_count', { ascending: false })
      .limit(5);

    // Generate AI-powered insights
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = buildInsightsPrompt(industry, businessStage, marketData, trendingData, specificQuery);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a business intelligence analyst specialized in market research and strategic insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API Error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedInsights = aiData.choices[0].message.content;

    // Parse insights into structured format
    const structuredInsights = parseInsights(generatedInsights);

    // Cache the insights
    await supabase
      .from('business_insights_cache')
      .insert({
        industry,
        business_stage: businessStage || 'general',
        insights: structuredInsights,
        confidence_score: 0.85,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });

    return new Response(JSON.stringify({
      insights: structuredInsights,
      source: 'generated',
      confidence: 0.85
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Business Insights Generator Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      insights: {
        opportunities: ['Market research ongoing'],
        challenges: ['Data collection in progress'],
        trends: ['Analysis pending'],
        recommendations: ['Please try again shortly']
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildInsightsPrompt(industry: string, businessStage: string, marketData: any[], trendingData: any[], specificQuery?: string): string {
  const marketSummary = marketData?.slice(0, 5).map(d => 
    `- ${d.data_payload?.title || 'Market Update'}: ${d.data_payload?.summary || 'Activity detected'}`
  ).join('\n') || 'Limited market data available';

  const trendingSummary = trendingData?.map(t => 
    `- ${t.keyword}: ${t.mention_count} mentions`
  ).join('\n') || 'No trending topics identified';

  return `Generate business insights for the ${industry} industry${businessStage ? ` at ${businessStage} stage` : ''}.

CURRENT MARKET DATA:
${marketSummary}

TRENDING TOPICS:
${trendingSummary}

${specificQuery ? `SPECIFIC FOCUS: ${specificQuery}` : ''}

Please provide insights in the following JSON structure:
{
  "opportunities": ["3-5 specific market opportunities"],
  "challenges": ["3-5 key challenges to be aware of"],
  "trends": ["3-5 important trends shaping the industry"],
  "recommendations": ["3-5 actionable recommendations"],
  "competitive_landscape": ["2-3 insights about competition"],
  "customer_insights": ["2-3 insights about target customers"]
}

Focus on:
- Actionable, specific insights rather than generic advice
- Current market conditions and recent developments
- Opportunities for new entrants or businesses at this stage
- Practical challenges and how to address them
- Data-driven recommendations when possible

Keep each insight concise (1-2 sentences) and business-focused.`;
}

function parseInsights(insightsText: string): any {
  try {
    // Try to extract JSON from the response
    const jsonMatch = insightsText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error parsing AI insights JSON:', error);
  }

  // Fallback: parse text format
  return {
    opportunities: extractSection(insightsText, 'opportunities') || ['Market analysis in progress'],
    challenges: extractSection(insightsText, 'challenges') || ['Assessment ongoing'],
    trends: extractSection(insightsText, 'trends') || ['Trend analysis pending'],
    recommendations: extractSection(insightsText, 'recommendations') || ['Recommendations being generated'],
    competitive_landscape: ['Competitive analysis available on request'],
    customer_insights: ['Customer research in development']
  };
}

function extractSection(text: string, sectionName: string): string[] | null {
  const patterns = [
    new RegExp(`${sectionName}[:\\s]*\\n([\\s\\S]*?)(?=\\n\\w+:|$)`, 'i'),
    new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=\\n\\n|$)`, 'i')
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1]
        .split('\n')
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 5);
    }
  }
  return null;
}
