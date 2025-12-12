import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache for web search results (30 minutes TTL)
const searchCache = new Map<string, { data: WebSearchResponse; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCacheKey(query: string, businessContext?: any): string {
  const normalizedQuery = query.toLowerCase().trim();
  const contextKey = businessContext ? JSON.stringify(businessContext) : '';
  return `${normalizedQuery}:${contextKey}`;
}

function getCachedResult(key: string): WebSearchResponse | null {
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('💾 Cache hit for web search:', key.substring(0, 50));
    return cached.data;
  }
  if (cached) {
    searchCache.delete(key); // Remove expired entry
  }
  return null;
}

function setCachedResult(key: string, data: WebSearchResponse): void {
  // Limit cache size to 100 entries
  if (searchCache.size >= 100) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(key, { data, timestamp: Date.now() });
}

interface WebSearchRequest {
  query: string;
  model?: string;
  maxResults?: number;
  searchRecency?: 'day' | 'week' | 'month' | 'year';
  businessContext?: {
    industry?: string;
    businessType?: string;
    location?: string;
  };
}

interface WebSearchSource {
  url: string;
  title: string;
  snippet?: string;
  relevanceScore?: number;
  publishedDate?: string;
}

interface WebSearchResponse {
  success: boolean;
  answer?: string;
  sources?: WebSearchSource[];
  citations?: string[];
  model?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebSearchRequest = await req.json();
    const { query, model = 'llama-3.1-sonar-large-128k-online', maxResults = 5, searchRecency = 'month', businessContext } = payload;

    if (!query || query.trim().length === 0) {
      throw new Error('Query is required');
    }

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Check cache first
    const cacheKey = getCacheKey(query, businessContext);
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
      return new Response(
        JSON.stringify(cachedResult),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        }
      );
    }

    console.log(`🔍 Web search request: "${query}" (model: ${model})`);

    // Optimize query for business context
    let optimizedQuery = query;
    if (businessContext) {
      if (businessContext.industry) {
        optimizedQuery = `${query} in ${businessContext.industry} industry`;
      }
      if (businessContext.location) {
        optimizedQuery = `${optimizedQuery} ${businessContext.location}`;
      }
    }

    // Build system prompt for better results
    const systemPrompt = businessContext?.industry 
      ? `You are a business intelligence assistant specializing in ${businessContext.industry}. Provide accurate, well-cited information from recent web sources. Always include specific citations with URLs.`
      : `You are a helpful assistant with access to real-time web information. Provide accurate, well-cited answers. Always include specific citations with URLs.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: optimizedQuery
          }
        ],
        max_tokens: 800,
        temperature: 0.2,
        return_citations: true,
        search_recency_filter: searchRecency,
        search_domain_filter: businessContext?.industry ? undefined : undefined, // Let Perplexity choose domains
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Perplexity API error: ${response.status} - ${errorText}`);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log(`✅ Web search completed: ${citations.length} citations found`);

    // Extract sources from citations
    const sources: WebSearchSource[] = citations.slice(0, maxResults).map((citation: any, index: number) => {
      return {
        url: citation.url || citation.source || '',
        title: citation.title || citation.name || `Source ${index + 1}`,
        snippet: citation.snippet || citation.summary || '',
        relevanceScore: citation.relevance || 1.0 - (index * 0.1), // Default scoring
        publishedDate: citation.published_date || citation.date || undefined,
      };
    });

    // Extract unique citation URLs for easy reference
    const citationUrls = [...new Set(citations.map((c: any) => c.url || c.source).filter(Boolean))];

    const searchResponse: WebSearchResponse = {
      success: true,
      answer,
      sources,
      citations: citationUrls,
      model,
    };

    // Cache the result
    setCachedResult(cacheKey, searchResponse);

    return new Response(
      JSON.stringify(searchResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      }
    );

  } catch (error) {
    console.error('Error in web-search function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as WebSearchResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

