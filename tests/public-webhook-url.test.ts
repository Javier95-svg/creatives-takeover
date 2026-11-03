import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPublicWebhookUrl } from '../supabase/functions/_shared/public-url-guard.ts';

const originalDeno = (globalThis as any).Deno;

test.after(() => {
  (globalThis as any).Deno = originalDeno;
});

test('webhook destinations require HTTPS and a public DNS answer', async () => {
  (globalThis as any).Deno = {
    resolveDns: async (_host: string, type: string) => type === 'A' ? ['8.8.8.8'] : [],
  };

  assert.equal((await checkPublicWebhookUrl('https://hooks.example.com/lead')).ok, true);
  assert.equal((await checkPublicWebhookUrl('http://hooks.example.com/lead')).ok, false);
  assert.equal((await checkPublicWebhookUrl('https://127.0.0.1/lead')).ok, false);
  assert.equal((await checkPublicWebhookUrl('https://user:pass@hooks.example.com/lead')).ok, false);
});

test('webhook destinations reject private or unresolved DNS answers', async () => {
  (globalThis as any).Deno = {
    resolveDns: async (_host: string, type: string) => type === 'A' ? ['10.0.0.5'] : [],
  };
  assert.equal((await checkPublicWebhookUrl('https://hooks.example.com/lead')).ok, false);

  (globalThis as any).Deno.resolveDns = async () => [];
  assert.equal((await checkPublicWebhookUrl('https://hooks.example.com/lead')).ok, false);
});
