import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transform } from 'esbuild';

const raw = readFileSync(new URL('../supabase/functions/demo-studio-generator/index.ts', import.meta.url), 'utf8');
const shared = readFileSync(new URL('../supabase/functions/_shared/demo-story.ts', import.meta.url), 'utf8');
const stripped = shared.replaceAll('export ', '') + '\n' + raw.replace(/^import .*;\r?\n/gm, '');
const js = (await transform(stripped, { loader: 'ts', format: 'iife' })).code;

function fixture({ rateError = null, missingKey = false, invalidOutput = false } = {}) {
  let handler;
  let fetches = 0;
  let credits = 0;
  let prompt;
  const context = vm.createContext({
    Request, Response, AbortController, setTimeout, clearTimeout, console,
    Deno: { env: { get: key => key === 'OPENAI_API_KEY' && missingKey ? undefined : 'test-only' } },
    serve: value => { handler = value; },
    createClient: () => ({ rpc: async name => { assert.equal(name, 'assert_rate_limit'); return { error: rateError }; } }),
    getUserFromAuth: async () => null,
    checkAndDeductCredits: async () => { credits++; throw new Error('Unexpected credit deduction'); },
    refundCredits: async () => {}, CREDIT_COSTS: {}, resolveCreditIdempotencyKey: () => 'test',
    fetch: async (_url, request) => {
      fetches++;
      prompt = JSON.parse(request.body).messages[1].content;
      const result = invalidOutput ? { steps: [] } : { productName: 'Hairdresser scheduling', pitch: 'Organize your appointments.',
        brief: { audience: 'Hairdressers', problem: 'Missed appointments', product_promise: 'Easier scheduling', aha_moment: 'See the next booking' },
        steps: ['Problem', 'Product action', 'Outcome'].map(title => ({ title, caption: title, speaker_notes: title, hotspot_label: 'Next', suggested_action: 'next' })) };
      return Response.json({ choices: [{ message: { content: JSON.stringify(result) } }] });
    },
  });
  vm.runInContext(js, context);
  return { handler, fetches: () => fetches, credits: () => credits, prompt: () => prompt };
}
function request(body) { return new Request('https://example.invalid/demo-studio-generator', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}); }

test('anonymous story generation infers a brief in one request without screenshots or credit charges', async () => {
  const api = fixture();
  const response = await api.handler(request({ draft: true, mode: 'story', description: 'A scheduler for hairdressers' }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.draft.kind, 'demo_story');
  assert.equal(body.draft.steps.length, 3);
  assert.equal(body.draft.description, 'A scheduler for hairdressers');
  assert.equal(api.fetches(), 1);
  assert.equal(api.credits(), 0);
  assert.ok(api.prompt().includes('A scheduler for hairdressers'));
});

test('rate limits, invalid input, missing configuration and invalid generation never produce a fake success', async () => {
  for (const [options, description, status] of [
    [{ rateError: { message: 'rate_limit_exceeded' } }, 'A scheduler', 429],
    [{}, '', 400], [{ missingKey: true }, 'A scheduler', 503], [{ invalidOutput: true }, 'A scheduler', 502],
  ]) {
    const api = fixture(options);
    const response = await api.handler(request({ draft: true, mode: 'story', description }));
    assert.equal(response.status, status);
    assert.equal((await response.json()).success, false);
    assert.equal(api.credits(), 0);
  }
});

test('non-draft requests remain authenticated even though anonymous drafts are allowed', async () => {
  const api = fixture();
  const response = await api.handler(request({ mode: 'full_kit' }));
  assert.equal(response.status, 401);
  assert.equal(api.fetches(), 0);
  assert.equal(api.credits(), 0);
});
