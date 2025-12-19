// Response caching utility for similar queries

export interface CacheEntry {
  key: string;
  content: string;
  model: string;
  query: string;
  business_context: any;
  created_at: string;
  expires_at: string;
  ttl_hours: number;
}

// Generate cache key from query and context
export function generateCacheKey(
  query: string,
  businessContext: any,
  chatMode: string
): string {
  // Create a hash-like key from query and context
  const contextStr = JSON.stringify({
    industry: businessContext?.industry,
    stage: businessContext?.stage,
    location: businessContext?.location,
    chatMode,
  });
  
  // Simple hash function
  const hash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  };
  
  const queryHash = hash(query.toLowerCase().trim());
  const contextHash = hash(contextStr);
  
  return `chatbot_cache_${chatMode}_${queryHash}_${contextHash}`;
}

// Get cached response (compatible with existing ai_cache table)
export async function getCachedResponse(
  supabase: any,
  cacheKey: string
): Promise<CacheEntry | null> {
  try {
    const { data, error } = await supabase
      .from('ai_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Map ai_cache structure to CacheEntry
    return {
      key: data.cache_key,
      content: data.response_data?.content || '',
      model: data.model || 'unknown',
      query: '', // Not stored in ai_cache
      business_context: {}, // Not stored in ai_cache
      created_at: data.created_at || new Date().toISOString(),
      expires_at: data.expires_at,
      ttl_hours: 1, // Default
    } as CacheEntry;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

// Save response to cache (compatible with existing ai_cache table)
export async function saveResponseCache(
  supabase: any,
  cacheKey: string,
  content: string,
  model: string,
  query: string,
  businessContext: any,
  ttlHours: number = 1
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
    
    // Use existing ai_cache table structure
    await supabase
      .from('ai_cache')
      .upsert({
        cache_key: cacheKey,
        provider: 'lovable',
        model: model,
        input_hash: cacheKey, // Use cache key as hash
        response_data: { content },
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      }, {
        onConflict: 'cache_key',
      });
  } catch (error) {
    console.error('Cache write error:', error);
    // Don't throw - caching is non-critical
  }
}

// Determine TTL based on query type
export function getCacheTTL(query: string, chatMode: string): number {
  // Factual queries can be cached longer
  const factualPatterns = /^(what|when|where|who|how many|how much|which|list|show)/i;
  if (factualPatterns.test(query) && !/(think|feel|suggest|recommend|creative|strategy)/i.test(query)) {
    return 24; // 24 hours for factual queries
  }
  
  // General queries: 1 hour
  return 1;
}

