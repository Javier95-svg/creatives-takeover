import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePulseProvider } from '../supabase/functions/_shared/pulse-provider.ts';

const env = (values: Record<string, string | undefined>) => (name: string) => values[name];

test("the project's Google key is used first, with the provider's model spelling", () => {
  const provider = resolvePulseProvider(env({ GEMINI_API_KEY: 'g-key', LOVABLE_API_KEY: 'l-key' }));
  assert.equal(provider?.name, 'gemini');
  assert.match(provider!.url, /^https:\/\/generativelanguage\.googleapis\.com\//);
  assert.equal(provider!.key, 'g-key');
  assert.equal(provider!.model('google/gemini-2.5-flash'), 'gemini-2.5-flash');
  assert.equal(provider!.model('google/gemini-2.5-pro'), 'gemini-2.5-pro');
});

test('the Lovable gateway remains the fallback and keeps canonical model names', () => {
  const provider = resolvePulseProvider(env({ LOVABLE_API_KEY: 'l-key', GEMINI_API_KEY: '  ' }));
  assert.equal(provider?.name, 'lovable');
  assert.match(provider!.url, /lovable\.dev/);
  assert.equal(provider!.model('google/gemini-2.5-flash'), 'google/gemini-2.5-flash');
  assert.equal(resolvePulseProvider(env({})), null);
});
