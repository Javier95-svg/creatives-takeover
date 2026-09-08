import test from 'node:test';
import assert from 'node:assert/strict';

import { parseSupabaseBrowserEnv } from '../src/integrations/supabase/envSchema.ts';

test('Supabase browser env accepts the current key name', () => {
  assert.deepEqual(
    parseSupabaseBrowserEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_KEY: 'anon-key',
    }),
    {
      url: 'https://example.supabase.co',
      publishableKey: 'anon-key',
    },
  );
});

test('Supabase browser env accepts the publishable key alias', () => {
  const config = parseSupabaseBrowserEnv({
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  });

  assert.equal(config.publishableKey, 'publishable-key');
});

test('Supabase browser env reports all invalid required values', () => {
  assert.throws(
    () => parseSupabaseBrowserEnv({ VITE_SUPABASE_URL: 'not-a-url' }),
    /VITE_SUPABASE_URL must be a valid URL; VITE_SUPABASE_KEY VITE_SUPABASE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY is required/,
  );
});
