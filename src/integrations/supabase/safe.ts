import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './client';

type RetryOptions = {
  retries?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
};

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

function isRetryable(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  // Match on common transient errors and rate limits
  const code = (error as any).code || '';
  const message = (error.message || '').toLowerCase();
  return (
    code === '53300' || // too_many_connections
    code === '40001' || // serialization_failure
    code === '55P03' || // lock_not_available
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('timed out') ||
    message.includes('over rate limit') ||
    message.includes('retry')
  );
}

async function withRetry<T>(fn: () => Promise<{ data: T | null; error: PostgrestError | null }>, opts: RetryOptions = {}) {
  const { retries = 3, minDelayMs = 150, maxDelayMs = 1200 } = opts;

  let attempt = 0;
  while (true) {
    const { data, error } = await fn();
    if (!error) return { data: data as T, error: null };

    if (attempt >= retries || !isRetryable(error)) {
      return { data: null as T, error };
    }

    const backoff = Math.min(maxDelayMs, minDelayMs * Math.pow(2, attempt) + Math.random() * 100);
    await sleep(backoff);
    attempt += 1;
  }
}

export const safe = {
  select: withRetry,
  insert: withRetry,
  update: withRetry,
  delete: withRetry,
  rpc: withRetry,
  client: supabase,
};

export type { RetryOptions };

