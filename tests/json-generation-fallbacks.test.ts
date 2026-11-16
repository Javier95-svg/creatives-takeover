import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

type Reply = (url: string, init?: RequestInit) => Response | Promise<Response>;

/** Runs `body` with mocked Deno.env and fetch; records every provider called. */
async function withProviders(keys: Record<string, string>, reply: Reply, body: (called: string[], bodies: any[]) => Promise<void>) {
  const original = { fetch: globalThis.fetch, Deno: (globalThis as any).Deno };
  (globalThis as any).Deno = { env: { get: (name: string) => keys[name] } };
  const called: string[] = [];
  const bodies: any[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const name = url.includes('generativelanguage') ? 'gemini'
      : url.includes('api.openai.com') ? 'openai'
      : url.includes('ai.gateway.lovable.dev') ? 'lovable'
      : url.includes('api.groq.com') ? 'groq'
      : url.includes('/rest/v1/') ? 'ledger'
      : null;
    if (!name) throw new Error(`Unexpected call: ${url}`);
    called.push(name);
    if (init?.body && typeof init.body === 'string') bodies.push({ name, body: JSON.parse(init.body) });
    return reply(url, init);
  }) as typeof fetch;
  const module = await import('../supabase/functions/_shared/json-generation.ts');
  module.resetProviderBreakers();
  try {
    await body(called, bodies);
  } finally {
    globalThis.fetch = original.fetch;
    (globalThis as any).Deno = original.Deno;
    module.resetProviderBreakers();
  }
}

const ALL_KEYS = { GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o', LOVABLE_API_KEY: 'l', GROQ_API_KEY: 'q' };
const request = { label: 'test', system: 'Return JSON', prompt: 'Return JSON only', temperature: 0, maxTokens: 50, timeoutMs: 40_000, openaiModel: 'gpt-4o-mini' };
const chat = (content: string) => Response.json({ choices: [{ message: { content }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
// A plain 500 is not retried, which keeps these tests fast; the 503 retry is
// covered once, below.
const busyGemini = () => Response.json({ error: { code: 500, message: 'internal' } }, { status: 500 });
const noCredits = () => Response.json({ error: { message: 'You exceeded your current quota', code: 'insufficient_quota' } }, { status: 429 });

// 2026-11-16: Gemini answered 503 "high demand" and OpenAI had no credits, so
// every customer-research analysis failed. Free providers now follow Gemini,
// and OpenAI (kept for audio) comes last.
test('when Gemini is busy, the Lovable gateway answers, then Groq, and OpenAI only last', async () => {
  let lovableUp = true;
  let groqUp = true;
  await withProviders(ALL_KEYS, (url) => {
    if (url.includes('generativelanguage')) return busyGemini();
    if (url.includes('ai.gateway.lovable.dev')) return lovableUp ? chat('{"ok":true}') : new Response('down', { status: 500 });
    if (url.includes('api.groq.com')) return groqUp ? chat('{"ok":"groq"}') : new Response('down', { status: 500 });
    return chat('{"ok":"openai"}');
  }, async (called) => {
    const { generateJsonText } = await import('../supabase/functions/_shared/json-generation.ts');
    const first = await generateJsonText(request);
    assert.equal(first.provider, 'lovable');
    assert.equal(first.text, '{"ok":true}');
    assert.ok(!called.includes('openai'), 'OpenAI is not touched while a free provider answers');

    lovableUp = false;
    called.length = 0;
    assert.equal((await generateJsonText(request)).provider, 'groq');
    assert.deepEqual(called.filter((name) => name !== 'gemini'), ['lovable', 'groq']);

    groqUp = false;
    called.length = 0;
    assert.equal((await generateJsonText(request)).provider, 'openai');
    assert.deepEqual(called.filter((name) => name !== 'gemini'), ['lovable', 'groq', 'openai']);
  });
});

test('a 503 "high demand" from Gemini is retried once time allows, then the free providers answer', async () => {
  await withProviders(ALL_KEYS, (url) => {
    if (url.includes('generativelanguage')) return Response.json({ error: { code: 503, message: 'high demand' } }, { status: 503 });
    return chat('{"ok":true}');
  }, async (called) => {
    const { generateJsonText } = await import('../supabase/functions/_shared/json-generation.ts');
    // 40s budget, 15s kept for the fallbacks: Gemini gets a 2s and a 5s pause.
    assert.equal((await generateJsonText(request)).provider, 'lovable');
    assert.equal(called.filter((name) => name === 'gemini').length, 3 * 3, 'three rounds of the three fast models');
  });
});

test('a provider with no credits is skipped for a while instead of on every call', async () => {
  await withProviders(ALL_KEYS, (url) => {
    if (url.includes('generativelanguage')) return busyGemini();
    if (url.includes('api.openai.com')) return noCredits();
    return new Response('down', { status: 500 });
  }, async (called) => {
    const { generateJsonText } = await import('../supabase/functions/_shared/json-generation.ts');
    await assert.rejects(generateJsonText(request));
    assert.equal(called.filter((name) => name === 'openai').length, 1);
    called.length = 0;
    await assert.rejects(generateJsonText(request));
    assert.ok(!called.includes('openai'), 'the dead OpenAI key is not called again');
    assert.ok(called.includes('lovable'), 'the others are still tried');
  });
});

test('generateText asks for plain text, not JSON', async () => {
  await withProviders({ LOVABLE_API_KEY: 'l' }, () => chat('Hello, founder.'), async (_called, bodies) => {
    const { generateText } = await import('../supabase/functions/_shared/json-generation.ts');
    const answer = await generateText({ ...request, system: 'Answer kindly', prompt: 'Say hello' });
    assert.equal(answer.text, 'Hello, founder.');
    assert.equal(bodies[0].body.response_format, undefined);
  });
});

test('streaming callers get the first provider that answers, with its own model', async () => {
  await withProviders(ALL_KEYS, (url) => {
    if (url.includes('ai.gateway.lovable.dev')) return new Response('busy', { status: 503 });
    return new Response('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  }, async (called, bodies) => {
    const { streamChatWithFallbacks } = await import('../supabase/functions/_shared/json-generation.ts');
    const { response, provider } = await streamChatWithFallbacks({ label: 'bizmap', body: { messages: [{ role: 'user', content: 'x' }] }, openaiModel: 'gpt-4o-mini' });
    assert.equal(provider, 'groq');
    assert.match(await response.text(), /"hi"/);
    assert.deepEqual(called, ['lovable', 'groq']);
    assert.equal(bodies[1].body.model, 'llama-3.3-70b-versatile');
    assert.equal(bodies[1].body.stream, true);
  });
});

test('over the monthly AI budget, paid providers are skipped and calls still succeed', async () => {
  const keys = { ...ALL_KEYS, SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 's', AI_MONTHLY_BUDGET_USD: '10' };
  await withProviders(keys, (url, init) => {
    if (url.includes('/rest/v1/') && (init?.method ?? 'GET') === 'GET') return Response.json([{ est_cost_usd: '6' }, { est_cost_usd: '4.5' }]);
    if (url.includes('/rest/v1/')) return new Response(null, { status: 201 });
    if (url.includes('ai.gateway.lovable.dev')) return new Response('down', { status: 500 });
    return chat('{"ok":"free"}');
  }, async (called, bodies) => {
    const { generateJsonText } = await import('../supabase/functions/_shared/json-generation.ts');
    const answer = await generateJsonText({ ...request, feature: 'TEST' });
    assert.equal(answer.provider, 'groq');
    assert.ok(!called.includes('gemini') && !called.includes('openai'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const ledger = bodies.find((entry) => entry.name === 'ledger');
    assert.deepEqual(ledger?.body, { feature: 'TEST', provider: 'llm:groq', units: 1, est_cost_usd: 0 });
  });
});

test('under budget, Gemini answers and its estimated cost is written to the ledger', async () => {
  const keys = { ...ALL_KEYS, SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 's' };
  await withProviders(keys, (url, init) => {
    if (url.includes('/rest/v1/') && (init?.method ?? 'GET') === 'GET') return Response.json([{ est_cost_usd: '1' }]);
    if (url.includes('/rest/v1/')) return new Response(null, { status: 201 });
    return Response.json({ candidates: [{ content: { parts: [{ text: '{"ok":1}' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1_000_000, candidatesTokenCount: 0 } });
  }, async (_called, bodies) => {
    const { generateJsonText } = await import('../supabase/functions/_shared/json-generation.ts');
    assert.equal((await generateJsonText({ ...request, feature: 'TEST' })).provider, 'gemini');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(bodies.find((entry) => entry.name === 'ledger')?.body, { feature: 'TEST', provider: 'llm:gemini', units: 1, est_cost_usd: 0.15 });
  });
});

test('no edge function calls OpenAI chat completions directly any more', () => {
  const root = new URL('../supabase/functions/', import.meta.url);
  const allowed = new Set(['ai-provider-health', '_shared']);
  const offenders = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !allowed.has(entry.name))
    .filter((entry) => {
      try {
        return readFileSync(new URL(`${entry.name}/index.ts`, root), 'utf8').includes('api.openai.com/v1/chat/completions');
      } catch {
        return false;
      }
    })
    .map((entry) => entry.name);
  assert.deepEqual(offenders, []);
});
