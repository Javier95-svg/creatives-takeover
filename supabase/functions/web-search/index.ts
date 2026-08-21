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
    /*
     * Perplexity returns `citations` as an array of bare URL strings, and puts
     * the titled records in `search_results`. Reading `.url` off a string
     * yields undefined, so every source used to come back with an empty url
     * and the citation list came back empty. Accept both shapes: prefer
     * search_results when present, fall back to citations either way.
     */
    const rawCitations: any[] = Array.isArray(data.citations) ? data.citations : [];
    const searchResults: any[] = Array.isArray(data.search_results) ? data.search_results : [];
    const normalizedCitations = (searchResults.length > 0 ? searchResults : rawCitations)
      .map((citation: any, index: number) => {
        if (typeof citation === 'string') {
          return { url: citation, title: '', snippet: '', relevance: undefined, publishedDate: undefined, index };
        }
        return {
          url: citation?.url || citation?.source || '',
          title: citation?.title || citation?.name || '',
          snippet: citation?.snippet || citation?.summary || '',
          relevance: citation?.relevance,
          publishedDate: citation?.published_date || citation?.date || undefined,
          index,
        };
      })
      .filter((citation) => Boolean(citation.url));

    console.log(`✅ Web search completed: ${normalizedCitations.length} citations found`);

    const hostLabel = (url: string) => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    };

    const sources: WebSearchSource[] = normalizedCitations.slice(0, maxResults).map((citation, index) => ({
      url: citation.url,
      // A bare URL still deserves a readable label, and the host is the honest
      // one. "Source 3" told the caller nothing about what it was citing.
      title: citation.title || hostLabel(citation.url) || `Source ${index + 1}`,
      snippet: citation.snippet,
      relevanceScore: citation.relevance ?? 1.0 - (index * 0.1),
      publishedDate: citation.publishedDate,
    }));

    // Extract unique citation URLs for easy reference
    const citationUrls = [...new Set(normalizedCitations.map((citation) => citation.url))];

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

