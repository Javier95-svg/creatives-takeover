/**
 * Unit tests for error handling
 */

import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";

interface ErrorResponse {
  status: number;
  errorCode: string;
  userMessage: string;
}

// Mock error handling logic
function handleAPIError(status: number, errorText: string): ErrorResponse | null {
  if (status === 401) {
    return {
      status: 401,
      errorCode: 'AUTH_FAILED',
      userMessage: "I'm experiencing authentication issues. Please contact support."
    };
  }
  
  if (status === 429) {
    return {
      status: 429,
      errorCode: 'RATE_LIMIT',
      userMessage: "I'm processing too many requests. Please try again in a moment."
    };
  }
  
  if (status === 500 || status === 502 || status === 503) {
    return {
      status: 500,
      errorCode: 'MODEL_ERROR',
      userMessage: "I'm experiencing technical difficulties. Please try again in a moment."
    };
  }
  
  return null;
}

Deno.test("Error handling - 401 authentication failure", () => {
  const response = handleAPIError(401, 'Unauthorized');
  assert(response !== null);
  assertEquals(response.status, 401);
  assertEquals(response.errorCode, 'AUTH_FAILED');
  assert(response.userMessage.includes('authentication'));
});

Deno.test("Error handling - 429 rate limit", () => {
  const response = handleAPIError(429, 'Rate limit exceeded');
  assert(response !== null);
  assertEquals(response.status, 429);
  assertEquals(response.errorCode, 'RATE_LIMIT');
  assert(response.userMessage.includes('too many requests'));
});

Deno.test("Error handling - 500 server error", () => {
  const response = handleAPIError(500, 'Internal server error');
  assert(response !== null);
  assertEquals(response.status, 500);
  assertEquals(response.errorCode, 'MODEL_ERROR');
  assert(response.userMessage.includes('technical difficulties'));
});

Deno.test("Error handling - 502 bad gateway", () => {
  const response = handleAPIError(502, 'Bad gateway');
  assert(response !== null);
  assertEquals(response.status, 500);
  assertEquals(response.errorCode, 'MODEL_ERROR');
});

Deno.test("Error handling - 503 service unavailable", () => {
  const response = handleAPIError(503, 'Service unavailable');
  assert(response !== null);
  assertEquals(response.status, 500);
  assertEquals(response.errorCode, 'MODEL_ERROR');
});

Deno.test("Error handling - unknown error", () => {
  const response = handleAPIError(404, 'Not found');
  assertEquals(response, null);
});

// Mock retry logic
async function retryWithBackoff(
  fn: () => Promise<Response>,
  maxRetries: number = 2
): Promise<Response | null> {
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      const response = await fn();
      if (response.ok) {
        return response;
      }
      // If not ok and retries left, continue
      if (retryCount < maxRetries) {
        retryCount++;
        const backoffDelay = Math.pow(2, retryCount - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        continue;
      }
      return response;
    } catch (error) {
      if (retryCount >= maxRetries) {
        return null;
      }
      retryCount++;
      const backoffDelay = Math.pow(2, retryCount - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  return null;
}

Deno.test("Retry logic - succeeds on first try", async () => {
  let callCount = 0;
  const mockFn = async () => {
    callCount++;
    return { ok: true } as Response;
  };
  
  const result = await retryWithBackoff(mockFn);
  assert(result !== null);
  assertEquals(result.ok, true);
  assertEquals(callCount, 1);
});

Deno.test("Retry logic - retries on failure", async () => {
  let callCount = 0;
  const mockFn = async () => {
    callCount++;
    if (callCount < 2) {
      throw new Error('Network error');
    }
    return { ok: true } as Response;
  };
  
  const result = await retryWithBackoff(mockFn);
  assert(result !== null);
  assertEquals(result.ok, true);
  assertEquals(callCount, 2);
});

Deno.test("Retry logic - gives up after max retries", async () => {
  let callCount = 0;
  const mockFn = async () => {
    callCount++;
    throw new Error('Persistent error');
  };
  
  const result = await retryWithBackoff(mockFn, 2);
  assertEquals(result, null);
  assertEquals(callCount, 3); // Initial + 2 retries
});

