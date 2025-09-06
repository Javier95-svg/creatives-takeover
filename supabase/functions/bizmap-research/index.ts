import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResearchRequest {
  businessConcept: string;
  industry: string;
  targetMarket: string;
  region?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessConcept, industry, targetMarket, region }: ResearchRequest = await req.json();

    console.log('Starting market research for:', businessConcept);

    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityKey) {
      throw new Error('Perplexity API key not configured');
    }

    const researchPrompt = `
Research the following business concept for market insights:

Business: ${businessConcept}
Industry: ${industry}
Target Market: ${targetMarket}
Region: ${region || 'Global'}

Please provide:
1. Market size and growth trends
2. Key competitors and their positioning
3. Recent industry developments
4. Regulatory considerations
5. Customer behavior insights
6. Pricing benchmarks
7. Marketing channel effectiveness

Focus on actionable insights that would help validate this business idea and inform strategic decisions.
`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a market research analyst providing comprehensive business intelligence. Use current data and cite sources when possible.'
          },
          {
            role: 'user',
            content: researchPrompt
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      throw new Error(`Research API error: ${response.status}`);
    }

    const data = await response.json();
    const researchInsights = data.choices[0].message.content;

    console.log('Market research completed');

    return new Response(
      JSON.stringify({
        success: true,
        insights: researchInsights
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in bizmap-research function:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});