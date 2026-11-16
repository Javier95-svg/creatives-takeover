import assert from 'node:assert/strict';
import test from 'node:test';

// 2026-11-16: Gemini answered 503 "high demand" and OpenAI had no credits, so
// every customer-research analysis failed. The Lovable gateway and Groq now
// follow OpenAI.
test('when Gemini is busy and OpenAI has no credits, the Lovable gateway answers; Groq after that', async () => {
  const original = { fetch: globalThis.fetch, Deno: (globalThis as any).Deno };
  const keys: Record<string, string> = { GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o', LOVABLE_API_KEY: 'l', GROQ_API_KEY: 'q' };
  (globalThis as any).Deno = { env: { get: (name: string) => keys[name] } };
  const called: string[] = [];
  let lovableUp = true;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('generativelanguage')) { called.push('gemini'); return Response.json({ error: { code: 503, message: 'high demand' } }, { status: 503 }); }
    if (url.includes('api.openai.com')) { called.push('openai'); return Response.json({ error: { message: 'You have no credits remaining.' } }, { status: 429 }); }
    if (url.includes('ai.gateway.lovable.dev')) {
      called.push('lovable');
      return lovableUp ? Response.json({ choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }] }) : new Response('down', { status: 500 });
    }
    if (url.includes('api.groq.com')) { called.push('groq'); return Response.json({ choices: [{ message: { content: '{"ok":"groq"}' }, finish_reason: 'stop' }] }); }
    throw new Error(`Unexpected call: ${url}`);
  }) as typeof fetch;
  try {
    const { generateJsonText } = await import('../supabase/functions/_shared/json-generation.ts');
    const request = { label: 'test', system: 'Return JSON', prompt: 'Return JSON only', temperature: 0, maxTokens: 50, timeoutMs: 40_000, openaiModel: 'gpt-4o-mini' };
    const first = await generateJsonText(request);
    assert.equal(first.provider, 'lovable');
    assert.equal(first.text, '{"ok":true}');
    assert.ok(called.indexOf('openai') < called.indexOf('lovable'), 'OpenAI is tried first, once it has credits again it answers');

    lovableUp = false;
    called.length = 0;
    const second = await generateJsonText(request);
    assert.equal(second.provider, 'groq');
    assert.deepEqual(called.filter((name) => name !== 'gemini'), ['openai', 'lovable', 'groq']);
  } finally {
    globalThis.fetch = original.fetch;
    (globalThis as any).Deno = original.Deno;
  }
});
