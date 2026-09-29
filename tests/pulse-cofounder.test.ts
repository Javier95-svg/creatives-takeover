import assert from 'node:assert/strict';
import test from 'node:test';
import { handlePulseHome } from '../supabase/functions/_shared/pulse-home.ts';
import { asksForStrategy, pulseDepth, PULSE_FAST_MODEL, PULSE_STRATEGY_DAILY_CAP, PULSE_STRATEGY_MODEL } from '../supabase/functions/_shared/pulse-routing.ts';
import { PulseDatabase } from './helpers/pulseDatabase.ts';

const input = { sessionId: '11111111-1111-4111-8111-111111111111', turnId: '33333333-3333-4333-8333-333333333333', message: 'Should I raise a seed round now or keep validating?', businessContext: {} };
const today = `${new Date().toISOString().slice(0, 10)}T09:00:00Z`;

// Captures every model call; streams a short answer unless told to fail.
function mockGateway(plan: Record<string, unknown> = {}, failModel?: string) {
  const calls: { model: string; stream: boolean; system: string }[] = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    calls.push({ model: body.model, stream: body.stream, system: body.messages.filter((m: { role: string }) => m.role === 'system').map((m: { content: string }) => m.content).join('\n') });
    if (!body.stream) return Response.json({ choices: [{ message: { content: JSON.stringify(plan) } }] });
    if (body.model === failModel) return new Response('upstream down', { status: 503 });
    return new Response('data: ' + JSON.stringify({ choices: [{ delta: { content: 'The weakest assumption is demand.' } }] }) + '\n\ndata: [DONE]\n\n');
  };
  return calls;
}

async function run(db: PulseDatabase, turn = input) {
  const text = await (await handlePulseHome(db as never, 'owner', turn)).text();
  return { text, saved: db.tables.chatbot_messages.find(row => row.role === 'assistant' && row.metadata?.homeTurnId === turn.turnId) };
}

test('strategy questions are recognised; the keyword check can only upgrade a turn', () => {
  assert.ok(asksForStrategy('Should I raise a seed round now?'));
  assert.ok(asksForStrategy('Review my pricing'));
  assert.ok(asksForStrategy('What am I missing in my go-to-market?'));
  assert.equal(asksForStrategy('Open the ICP Builder'), false);
  assert.equal(pulseDepth('strategy', 'open my tasks'), 'strategy');
  assert.equal(pulseDepth('quick', 'Should I pivot?'), 'strategy');
  assert.equal(pulseDepth(undefined, 'Where are my tasks?'), 'quick');
});

test('strategy turns use the stronger model with the co-founder stance; quick turns stay fast', async () => {
  const originalFetch = globalThis.fetch;
  (globalThis as any).Deno = { env: { get: () => 'test-only-key' } };
  try {
    const calls = mockGateway({ depth: 'strategy' });
    const { text, saved } = await run(new PulseDatabase());
    const answer = calls.find(call => call.stream)!;
    assert.equal(answer.model, PULSE_STRATEGY_MODEL);
    assert.match(answer.system, /weakest assumption/);
    assert.match(answer.system, /measurable check/);
    assert.equal(saved.metadata.model, PULSE_STRATEGY_MODEL);
    assert.equal(saved.metadata.depth, 'strategy');
    assert.match(text, /"type":"complete","model":"google\/gemini-2.5-pro","depth":"strategy"/);

    const quickCalls = mockGateway({ depth: 'quick' });
    const quick = await run(new PulseDatabase(), { ...input, message: 'Where do I find my tasks?' });
    assert.equal(quickCalls.find(call => call.stream)!.model, PULSE_FAST_MODEL);
    assert.equal(quick.saved.metadata.depth, 'quick');
  } finally { globalThis.fetch = originalFetch; delete (globalThis as any).Deno; }
});

test('the stronger model falls back to the fast one, and the daily cap is respected', async () => {
  const originalFetch = globalThis.fetch;
  (globalThis as any).Deno = { env: { get: () => 'test-only-key' } };
  try {
    const failing = mockGateway({ depth: 'strategy' }, PULSE_STRATEGY_MODEL);
    const fallback = await run(new PulseDatabase());
    assert.deepEqual(failing.filter(call => call.stream).map(call => call.model), [PULSE_STRATEGY_MODEL, PULSE_FAST_MODEL]);
    assert.equal(fallback.saved.metadata.model, PULSE_FAST_MODEL);
    assert.match(fallback.text, /"type":"complete"/);

    const capped = new PulseDatabase();
    for (let index = 0; index < PULSE_STRATEGY_DAILY_CAP; index++) {
      capped.tables.chatbot_messages.push({ id: `old-${index}`, conversation_id: 'conv', role: 'assistant', content: 'x', created_at: today, metadata: { homeTurnId: `old-${index}`, model: PULSE_STRATEGY_MODEL } });
    }
    const cappedCalls = mockGateway({ depth: 'strategy' });
    const overCap = await run(capped);
    assert.equal(cappedCalls.find(call => call.stream)!.model, PULSE_FAST_MODEL);
    assert.equal(overCap.saved.metadata.depth, 'strategy', 'still a strategy answer, on the fast model');
  } finally { globalThis.fetch = originalFetch; delete (globalThis as any).Deno; }
});

test('clarifications never go to the stronger model', async () => {
  const originalFetch = globalThis.fetch;
  (globalThis as any).Deno = { env: { get: () => 'test-only-key' } };
  try {
    const calls = mockGateway({ depth: 'strategy', clarify: 'Which market do you mean?' });
    await run(new PulseDatabase(), { ...input, message: 'Help me with my plan for that market' });
    assert.equal(calls.find(call => call.stream)!.model, PULSE_FAST_MODEL);
  } finally { globalThis.fetch = originalFetch; delete (globalThis as any).Deno; }
});
