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
  depth?: 'basic' | 'comprehensive' | 'expert';
}

interface ResearchResponse {
  success: boolean;
  insights?: string;
  structured_data?: {
    market_size: {
      data: string;
      sources: string[];
    };
    competitors: {
      data: string;
      sources: string[];
    };
    industry_trends: {
      data: string;
      sources: string[];
    };
    regulatory: {
      data: string;
      sources: string[];
    };
    customer_behavior: {
      data: string;
      sources: string[];
    };
    pricing: {
      data: string;
      sources: string[];
    };
    marketing_channels: {
      data: string;
      sources: string[];
    };
  };
  all_sources?: string[];
  research_quality?: 'high' | 'medium' | 'low';
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessConcept, industry, targetMarket, region = "Global", depth = 'comprehensive' }: ResearchRequest = await req.json();

    console.log('Starting market research for:', businessConcept, 'with depth:', depth);

    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityKey) {
      throw new Error('Perplexity API key not configured');
    }

    // Adjust research depth based on user preference
    const depthConfigs = {
      basic: { maxTokens: 1500, model: 'llama-3.1-sonar-small-128k-online' },
      comprehensive: { maxTokens: 2500, model: 'llama-3.1-sonar-large-128k-online' },
      expert: { maxTokens: 3500, model: 'llama-3.1-sonar-huge-128k-online' }
    };

    const config = depthConfigs[depth];

    const researchPrompt = `
Research the following business concept and provide STRUCTURED data with CITATIONS:

Business: ${businessConcept}
Industry: ${industry}
Target Market: ${targetMarket}
Region: ${region || 'Global'}

Please provide detailed information in the following structure:

## Market Size & Growth
[Provide current market size, growth trends, and projections with specific numbers and dates. Cite all sources.]

## Key Competitors
[List major competitors, their positioning, market share, and recent developments. Include specific company names and data. Cite sources.]

## Industry Trends
[Recent developments, emerging technologies, regulatory changes, and market shifts. Include dates and specific events. Cite sources.]

## Regulatory Environment
[Current regulations, compliance requirements, and upcoming policy changes. Be specific about jurisdictions and dates. Cite sources.]

## Customer Behavior
[How customers currently solve this problem, spending patterns, decision factors, and behavioral trends. Include survey data or studies if available. Cite sources.]

## Pricing Benchmarks
[Current pricing models, average costs, pricing trends, and competitive pricing strategies. Include specific numbers. Cite sources.]

## Marketing Channels
[Most effective channels for reaching this target market, with performance data, costs, and success rates. Cite sources.]

IMPORTANT: Include specific citations and sources for all claims. Use recent data (2023-2024 preferred).
`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a senior market research analyst with access to the latest business intelligence. Provide comprehensive, well-cited research with specific data points, dates, and sources. Always include proper citations and be specific about numbers, companies, and timeframes.'
          },
          {
            role: 'user',
            content: researchPrompt
          }
        ],
        max_tokens: config.maxTokens,
        temperature: 0.2,
        return_citations: true,
        search_recency_filter: 'month'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      throw new Error(`Research API error: ${response.status}`);
    }

    const data = await response.json();
    const researchInsights = data.choices[0].message.content;
    const citations = data.citations || [];

    console.log('Market research completed with', citations.length, 'citations');

    // Parse structured data from response
    const sections = {
      market_size: extractSection(researchInsights, 'Market Size & Growth'),
      competitors: extractSection(researchInsights, 'Key Competitors'),
      industry_trends: extractSection(researchInsights, 'Industry Trends'),
      regulatory: extractSection(researchInsights, 'Regulatory Environment'),
      customer_behavior: extractSection(researchInsights, 'Customer Behavior'),
      pricing: extractSection(researchInsights, 'Pricing Benchmarks'),
      marketing_channels: extractSection(researchInsights, 'Marketing Channels')
    };

    // Extract all unique sources
    const allSources = [...new Set(citations.map((c: any) => c.url || c.title).filter(Boolean))];

    const researchResponse: ResearchResponse = {
      success: true,
      insights: researchInsights,
      structured_data: sections,
      all_sources: allSources,
      research_quality: allSources.length > 5 ? 'high' : allSources.length > 2 ? 'medium' : 'low'
    };

    return new Response(
      JSON.stringify(researchResponse),
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
      } as ResearchResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to extract sections from research text
function extractSection(text: string, sectionName: string) {
  const regex = new RegExp(`## ${sectionName}([\\s\\S]*?)(?=## |$)`, 'i');
  const match = text.match(regex);
  const content = match ? match[1].trim() : 'No data available';
  
  // Extract sources from citations in the content
  const sourceRegex = /\[(.*?)\]/g;
  const sources: string[] = [];
  let sourceMatch;
  while ((sourceMatch = sourceRegex.exec(content)) !== null) {
    sources.push(sourceMatch[1]);
  }
  
  return {
    data: content,
    sources: [...new Set(sources)]
  };
}