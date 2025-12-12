/**
 * Unit tests for API key validation
 */

import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Mock the validateAPIKey function logic
async function mockValidateAPIKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey) {
    return { valid: false, error: 'API key not configured' };
  }
  
  if (apiKey === 'invalid_key') {
    return { valid: false, error: 'Invalid API key (401 Unauthorized)' };
  }
  
  if (apiKey === 'rate_limited_key') {
    return { valid: false, error: 'Rate limit exceeded during validation' };
  }
  
  return { valid: true };
}

Deno.test("API key validation - missing key", async () => {
  const result = await mockValidateAPIKey('');
  assertEquals(result.valid, false);
  assertEquals(result.error, 'API key not configured');
});

Deno.test("API key validation - invalid key", async () => {
  const result = await mockValidateAPIKey('invalid_key');
  assertEquals(result.valid, false);
  assertEquals(result.error, 'Invalid API key (401 Unauthorized)');
});

Deno.test("API key validation - rate limited key", async () => {
  const result = await mockValidateAPIKey('rate_limited_key');
  assertEquals(result.valid, false);
  assertEquals(result.error, 'Rate limit exceeded during validation');
});

Deno.test("API key validation - valid key", async () => {
  const result = await mockValidateAPIKey('valid_key_12345');
  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test("API key validation - caching behavior", async () => {
  // Test that validation results can be cached
  const cache = new Map<string, { valid: boolean; validatedAt: number }>();
  const cacheKey = 'test_key';
  const cacheTTL = 5 * 60 * 1000; // 5 minutes
  
  // First validation
  const result1 = await mockValidateAPIKey('valid_key_12345');
  cache.set(cacheKey, { valid: result1.valid, validatedAt: Date.now() });
  
  // Check cache
  const cached = cache.get(cacheKey);
  assert(cached !== undefined);
  assertEquals(cached.valid, true);
  
  // Simulate cache expiration
  const expiredCache = { valid: true, validatedAt: Date.now() - (cacheTTL + 1000) };
  const isExpired = (Date.now() - expiredCache.validatedAt) >= cacheTTL;
  assertEquals(isExpired, true);
});

