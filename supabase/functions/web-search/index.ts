import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { searchWeb } from "../_shared/web-research.ts";

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
    if (firstKey !== undefined) searchCache.delete(firstKey);
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
    const { query, maxResults = 5, searchRecency = 'month', businessContext } = payload;

    if (!query || query.trim().length === 0) {
      throw new Error('Query is required');
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

    console.log(`🔍 Web search request: "${query}"`);

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
      ? `You are a business intelligence assistant specializing in ${businessContext.industry}. Search the web and answer from what you find, accurately and concisely.`
      : `You are a helpful assistant with access to real-time web information. Search the web and answer from what you find, accurately and concisely.`;

    const result = await searchWeb({
      query: optimizedQuery,
      maxResults,
      recency: searchRecency,
      // Callers wait 8-12 seconds; leave room for their own overhead.
      timeoutMs: 10_000,
      withAnswer: true,
      systemInstruction: systemPrompt,
    });

    console.log(`✅ Web search completed with ${result.model}: ${result.sources.length} sources found`);

    const hostLabel = (url: string) => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    };

    const sources: WebSearchSource[] = result.sources.map((source, index) => ({
      url: source.url,
      title: source.title || hostLabel(source.url) || `Source ${index + 1}`,
      snippet: source.snippet,
      relevanceScore: 1.0 - (index * 0.1),
    }));

    const searchResponse: WebSearchResponse = {
      success: true,
      answer: result.answer,
      sources,
      citations: result.sources.map((source) => source.url),
      model: result.model,
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

