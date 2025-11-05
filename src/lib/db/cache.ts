import { logInfo, logDebug } from '@/lib/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Simple in-memory cache for query results
 * Reduces unnecessary database calls for frequently accessed data
 */
class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxSize = 100; // Maximum number of entries

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      logDebug('Cache miss', { key });
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logDebug('Cache expired', { key });
      return null;
    }
    
    logDebug('Cache hit', { key });
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl = this.defaultTTL) {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      logDebug('Cache eviction', { evictedKey: oldestKey });
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
    
    logDebug('Cache set', { key, ttl });
  }

  invalidate(pattern: string) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    if (count > 0) {
      logInfo('Cache invalidated', { pattern, entriesRemoved: count });
    }
  }

  invalidateExact(key: string) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logDebug('Cache entry deleted', { key });
    }
  }

  clear() {
    const size = this.cache.size;
    this.cache.clear();
    logInfo('Cache cleared', { entriesRemoved: size });
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.keys())
    };
  }
}

export const queryCache = new QueryCache();

/**
 * Helper function to wrap queries with caching
 */
export async function withCache<T>(
  cacheKey: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  ttl?: number,
  useCache = true
): Promise<{ data: T | null; error: any }> {
  if (useCache) {
    const cached = queryCache.get<T>(cacheKey);
    if (cached) {
      return { data: cached, error: null };
    }
  }
  
  const result = await queryFn();
  
  if (result.data && useCache) {
    queryCache.set(cacheKey, result.data, ttl);
  }
  
  return result;
}
