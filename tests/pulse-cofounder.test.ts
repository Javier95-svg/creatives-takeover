import assert from 'node:assert/strict';
import test from 'node:test';
import { handlePulseHome } from '../supabase/functions/_shared/pulse-home.ts';
import { asksForStrategy, pulseDepth, PULSE_FAST_MODEL, PULSE_STRATEGY_DAILY_CAP, PULSE_STRATEGY_MODEL } from '../supabase/functions/_shared/pulse-routing.ts';
import { PulseDatabase } from './helpers/pulseDatabase.ts';
import { handlePulseInsights } from '../supabase/functions/_shared/pulse-insights.ts';
import { worthRemembering } from '../supabase/functions/_shared/pulse-memory.ts';
import { parseMemorySuggestions } from '../src/lib/pulseMemory.ts';
import { parsePulseInsights } from '../src/lib/pulseInsights.ts';

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

// ---- Phase 2: memory -----------------------------------------------------
const memoryId = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
const memory = (overrides: Record<string, unknown> = {}) => ({
  id: memoryId, user_id: 'owner', project_id: null, kind: 'decision', text: 'Target dental clinics first', status: 'active',
  due_on: null, last_asked_on: null, created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z', ...overrides,
});

test('memory suggestions are validated: known kinds, no duplicates, dates only on commitments, at most two', () => {
  assert.deepEqual(parseMemorySuggestions({ memories: [
    { kind: 'decision', text: 'Target dental clinics first' },
    { kind: 'commitment', text: 'Run 5 interviews', dueOn: '2026-10-03' },
    { kind: 'fact', text: 'Third one is dropped' },
  ] }, ['target dental clinics first']), [
    { kind: 'commitment', text: 'Run 5 interviews', dueOn: '2026-10-03' },
    { kind: 'fact', text: 'Third one is dropped', dueOn: null },
  ], 'the saved duplicate is skipped before the limit of two applies');
  assert.equal(parseMemorySuggestions({ memories: Array.from({ length: 5 }, (_, i) => ({ kind: 'fact', text: `Fact number ${i}` })) }).length, 2);
  assert.deepEqual(parseMemorySuggestions({ memories: [{ kind: 'decision', text: 'Price at $49', dueOn: '2026-10-03' }, { kind: 'wish', text: 'nope' }] }),
    [{ kind: 'decision', text: 'Price at $49', dueOn: null }]);
  assert.ok(worthRemembering('We decided to focus on dentists'));
  assert.ok(worthRemembering('I will run five interviews by Friday'));
  assert.equal(worthRemembering('What should I build first?'), false);
  assert.equal(worthRemembering('How do I define my customer persona?'), false);
});

test('saved memory reaches the prompt, other accounts never do, and statements get suggestions', async () => {
  const originalFetch = globalThis.fetch;
  (globalThis as any).Deno = { env: { get: () => 'test-only-key' } };
  try {
    const db = new PulseDatabase();
    db.tables.pulse_memories = [memory(), memory({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002', user_id: 'someone-else', text: 'Secret pivot to crypto' })];
    const calls: { stream: boolean; system: string }[] = [];
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      const system = body.messages.filter((m: { role: string }) => m.role === 'system').map((m: { content: string }) => m.content).join('\n');
      calls.push({ stream: body.stream, system });
      if (body.stream) return new Response('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Good call.' } }] }) + '\n\ndata: [DONE]\n\n');
      const content = system.includes('extract at most 2') ? { memories: [{ kind: 'commitment', text: 'Interview 5 dentists', dueOn: '2026-10-10' }, { kind: 'decision', text: 'Target dental clinics first' }] } : { depth: 'quick' };
      return Response.json({ choices: [{ message: { content: JSON.stringify(content) } }] });
    };
    const { text, saved } = await run(db, { ...input, message: 'We decided to interview 5 dentists by next week' });
    const answer = calls.find(call => call.stream)!;
    assert.match(answer.system, /Target dental clinics first/);
    assert.match(answer.system, /founder's own confirmed decisions/);
    assert.doesNotMatch(answer.system, /Secret pivot/);
    assert.deepEqual(saved.metadata.memorySuggestions, [{ kind: 'commitment', text: 'Interview 5 dentists', dueOn: '2026-10-10' }], 'already-saved memory is not suggested again');
    assert.match(text, /"type":"memory_suggestions"/);
  } finally { globalThis.fetch = originalFetch; delete (globalThis as any).Deno; }
});

test('a due commitment is asked about once a day, then not again', async () => {
  const originalFetch = globalThis.fetch;
  (globalThis as any).Deno = { env: { get: () => 'test-only-key' } };
  try {
    const db = new PulseDatabase();
    db.tables.pulse_memories = [memory({ kind: 'commitment', text: 'Interview 5 dentists', due_on: '2026-01-01' })];
    const calls = mockGateway({ depth: 'quick' });
    const first = await run(db, { ...input, message: 'Where are my tasks?' });
    assert.match(calls.find(call => call.stream)!.system, /A commitment the founder saved is due \(2026-01-01\): "Interview 5 dentists"/);
    assert.match(first.text, /"type":"commitment_check"/);
    assert.equal(first.saved.metadata.commitmentCheck.id, memoryId);
    assert.equal(db.tables.pulse_memories[0].last_asked_on, new Date().toISOString().slice(0, 10));
    const again = mockGateway({ depth: 'quick' });
    await run(db, { ...input, turnId: '44444444-4444-4444-8444-444444444444', message: 'Where are my tasks?' });
    assert.doesNotMatch(again.find(call => call.stream)!.system, /A commitment the founder saved is due/);
  } finally { globalThis.fetch = originalFetch; delete (globalThis as any).Deno; }
});

// ---- Phase 3: insights ---------------------------------------------------
test('insights keep only valid types, real evidence and known tools', () => {
  const insights = parsePulseInsights({ insights: [
    { type: 'risk', text: 'Your ICP is 40 days old and GTM depends on it', evidence: 'icp', ask: 'Is my ICP still right?', toolKey: 'icp_builder' },
    { type: 'risk', text: 'Invented stage evidence here', evidence: 'pmf', ask: 'x' },
    { type: 'vibes', text: 'Unknown type is dropped here', evidence: 'icp', ask: 'x' },
    { type: 'follow_up', text: 'Interview commitment is overdue', evidence: 'memory', ask: 'Help me plan interviews', toolKey: 'made_up_tool' },
  ] }, ['icp', 'memory']);
  assert.deepEqual(insights.map(item => [item.id, item.type, item.evidence, item.toolKey]), [['i1', 'risk', 'icp', 'icp_builder'], ['i2', 'follow_up', 'memory', undefined]]);
});

test('insights are generated once a day on the stronger model, cached, and empty without evidence', async () => {
  const originalFetch = globalThis.fetch;
  (globalThis as any).Deno = { env: { get: () => 'test-only-key' } };
  try {
    const models: string[] = [];
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      models.push(body.model);
      return Response.json({ choices: [{ message: { content: JSON.stringify({ insights: [{ type: 'follow_up', text: 'Your dental interviews were due last week', evidence: 'memory', ask: 'Help me run the interviews' }] }) } }] });
    };
    const db = new PulseDatabase();
    db.tables.pulse_memories = [memory()];
    const first = await (await handlePulseInsights(db as never, 'owner', { projectId: null })).json();
    assert.equal(first.insights.length, 1);
    assert.equal(first.fresh, true);
    assert.deepEqual(models, [PULSE_STRATEGY_MODEL]);
    assert.equal(db.tables.pulse_insights.length, 1);
    const second = await (await handlePulseInsights(db as never, 'owner', { projectId: null })).json();
    assert.equal(second.fresh, false);
    assert.equal(models.length, 1, 'the cached row is reused, no new model call');
    db.tables.pulse_insights[0].dismissed = ['i1'];
    assert.equal((await (await handlePulseInsights(db as never, 'owner', { projectId: null })).json()).insights.length, 0, 'dismissed insights stay hidden');

    const empty = new PulseDatabase();
    const none = await (await handlePulseInsights(empty as never, 'owner', { projectId: null })).json();
    assert.deepEqual(none.insights, []);
    assert.equal(models.length, 1, 'no evidence, no model call');
    assert.equal((await handlePulseInsights(empty as never, null, { projectId: null })).status, 401);
  } finally { globalThis.fetch = originalFetch; delete (globalThis as any).Deno; }
});
