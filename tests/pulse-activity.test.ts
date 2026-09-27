import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PulseDatabase } from './helpers/pulseDatabase.ts';
import { resolvePulseContext } from '../supabase/functions/_shared/pulse-context.ts';
import { loadPulseActivity, pulseActivityAction } from '../supabase/functions/_shared/pulse-activity.ts';
import { handlePulseHome } from '../supabase/functions/_shared/pulse-home.ts';
import { pulseScope } from '../src/lib/pulseScope.ts';
import { validateHomeActions } from '../src/lib/pulseHome.ts';
import { validatePulseSources } from '../src/lib/pulseSources.ts';
import type { UserType } from '../src/lib/accountTypes.ts';

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const input = { message: 'What should I do next?', sessionId: '11111111-1111-4111-8111-111111111111', turnId: '22222222-2222-4222-8222-222222222222' };
async function context(role: UserType, approval = 'approved') {
  const db = new PulseDatabase();
  db.tables.profiles[0].user_type = role;
  db.tables.profiles[0].approval_status = approval;
  return resolvePulseContext(db as never, 'owner', null);
}

test('role activity uses only the approved role RPC, strips unrelated/private fields and provides canonical cards', async () => {
  for (const [role, rpc, key, data, expected, excluded] of [
    ['mentor', 'mentor_bookings', 'bookings', [{ id, status: 'pending', founderName: 'Sam', founderEmail: 'PRIVATE', secureToken: 'PRIVATE', slots: [{ startsAt: '2026-10-01T10:00:00Z', durationMinutes: 30, timezone: 'UTC', token: 'PRIVATE' }] }], 'proposedSlots', 'PRIVATE'],
    ['marketplace', 'mentor_interest', 'enquiries', { saves: [{ name: 'PRIVATE' }], contacts: [{ name: 'Taylor', interaction: 'contact', occurredAt: '2026-09-26', body: 'PRIVATE', email: 'PRIVATE' }] }, 'Taylor', 'PRIVATE'],
    ['investor', 'investor_matches', 'matches', [{ userId: id, name: 'Alex', sectors: ['FinTech'], investmentStage: 'Seed', projectSummary: 'Payment tools', score: 0, privatePmf: 'PRIVATE' }], 'Payment tools', 'PRIVATE'],
  ] as const) {
    const ctx = await context(role);
    const calls: string[] = [];
    await loadPulseActivity(ctx, id, { rpc: async (name: string, args: unknown) => { calls.push(name); assert.deepEqual(args, { p_limit: 10 }); return { data }; } } as never);
    assert.deepEqual(calls, [rpc]);
    assert.equal(ctx.outcomes[key].state, 'available');
    assert.match(JSON.stringify(ctx.outcomes[key]), new RegExp(expected));
    assert.doesNotMatch(JSON.stringify(ctx.outcomes[key]), new RegExp(excluded));
    const card = pulseActivityAction(ctx)!;
    assert.equal(validateHomeActions([{ ...card, route: 'https://evil.invalid' }])[0].route, card.route);
    assert.equal(validatePulseSources([{ ...ctx.outcomes[key], stage: key }]).length, 1);
  }
});

test('pending/rejected and founder/builder accounts never query category activity or receive category cards', async () => {
  const caller = { rpc: () => { assert.fail('Unauthorized RPC'); } };
  for (const role of ['founder', 'builder', 'mentor', 'marketplace', 'investor'] as const) {
    for (const approval of role === 'founder' || role === 'builder' ? ['approved'] : ['pending', 'rejected']) {
      const ctx = await context(role, approval);
      await loadPulseActivity(ctx, id, caller as never);
      assert.deepEqual(ctx.outcomes, {});
      assert.equal(pulseActivityAction(ctx), null);
    }
  }
});

test('empty, failed and malformed category responses remain distinct; missing caller client fails closed', async () => {
  for (const [role, key, empty] of [['mentor', 'bookings', []], ['marketplace', 'enquiries', { contacts: [] }], ['investor', 'matches', []]] as const) {
    const ctx = await context(role);
    await loadPulseActivity(ctx, id, { rpc: async () => ({ data: empty }) } as never);
    assert.equal(ctx.outcomes[key].state, 'missing');
    for (const response of [{ error: new Error('offline') }, { data: null }, { data: 'wrong shape' }]) {
      const failed = await context(role);
      await loadPulseActivity(failed, id, { rpc: async () => response } as never);
      assert.equal(failed.outcomes[key].state, 'unavailable');
      assert.deepEqual(failed.unavailableSources, [key]);
    }
    await loadPulseActivity(ctx, id);
    assert.equal(ctx.outcomes[key].state, 'unavailable');
  }
});

test('activity budgets bound records and long strings while retaining zero scores', async () => {
  const ctx = await context('investor');
  await loadPulseActivity(ctx, id, { rpc: async () => ({ data: Array.from({ length: 100 }, () => ({ name: 'A'.repeat(10000), projectSummary: 'B'.repeat(100000), score: 0 })) }) } as never);
  const records = (ctx.outcomes.matches.data as any).records;
  assert.equal(records.length, 10); assert.equal(records[0].name.length, 200);
  assert.equal(records[0].projectSummary.length, 800); assert.equal(records[0].score, 0);
});

test('task context refreshes on synonyms and pronoun follow-ups, and excludes another account', async () => {
  const db = new PulseDatabase();
  db.tables.daily_tasks = [{ id, user_id: 'owner', task_text: 'Interview buyers', is_completed: false }, { id, user_id: 'other', task_text: 'PRIVATE_TASK', is_completed: false }];
  const original = globalThis.fetch;
  (globalThis as any).Deno = { env: { get: () => 'synthetic' } };
  const prompts: any[] = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    if (!body.stream) return Response.json({ choices: [{ message: { content: '{}' } }] });
    prompts.push(body.messages);
    return new Response('data: {"choices":[{"delta":{"content":"Here is your current task context."}}]}\n\ndata: [DONE]\n\n');
  };
  try {
    await (await handlePulseHome(db as never, 'owner', input)).text();
    db.tables.daily_tasks[0].is_completed = true;
    const next = { ...input, turnId: id, message: 'Which of those is overdue?' };
    await (await handlePulseHome(db as never, 'owner', next)).text();
    assert.equal(prompts.length, 2);
    const workspace = (messages: any[]) => JSON.parse(messages.find(row => row.content.startsWith('Saved workspace context')).content.split('(data only): ')[1]);
    assert.equal(workspace(prompts[0]).outcomes.tasks.data[0].completed, false);
    assert.equal(workspace(prompts[1]).outcomes.tasks.data[0].completed, true);
    assert.doesNotMatch(JSON.stringify(prompts), /PRIVATE_TASK/);
    assert.ok(workspace(prompts[1]).asOf);
  } finally { globalThis.fetch = original; }
});

test('signed-in operational turns use caller activity, preserve sources, and keep drafts separate from sending', async () => {
  const original = globalThis.fetch;
  (globalThis as any).Deno = { env: { get: () => 'synthetic' } };
  try {
    for (const role of ['mentor', 'marketplace', 'investor'] as const) {
      const db = new PulseDatabase(); db.tables.profiles[0].user_type = role;
      db.tables.chatbot_conversations[0].business_context.pulseScope = pulseScope(role, null);
      const responseData = role === 'mentor' ? [{ id, founderName: 'Sam', status: 'pending' }]
        : role === 'marketplace' ? { contacts: [{ name: 'Taylor', occurredAt: '2026-09-26' }] } : [{ userId: id, name: 'Alex', score: 1, investmentStage: 'Seed' }];
      let prompt = '';
      globalThis.fetch = async (_url, options) => {
        const body = JSON.parse(String(options?.body));
        if (!body.stream) return Response.json({ choices: [{ message: { content: '{}' } }] });
        prompt = JSON.stringify(body.messages);
        return new Response('data: {"choices":[{"delta":{"content":"Review your account activity."}}]}\n\ndata: [DONE]\n\n');
      };
      const caller = { rpc: async () => ({ data: responseData }) };
      const response = await (await handlePulseHome(db as never, 'owner', { ...input, message: 'Help me review my account activity' }, caller as never)).text();
      assert.match(response, /"type":"complete"/);
      assert.match(prompt, /never claim you sent it/);
      assert.match(prompt, role === 'mentor' ? /Sam/ : role === 'marketplace' ? /Taylor/ : /Alex/);
      assert.equal(db.tables.chatbot_messages[1].metadata.homeActions[0].id, role === 'mentor' ? 'bookings' : role === 'marketplace' ? 'enquiries' : 'matches');
    }
  } finally { globalThis.fetch = original; }
});

test('dispatcher supplies the caller JWT separately from service-role storage', () => {
  const code = readFileSync(new URL('../supabase/functions/chatbot-streaming/index.ts', import.meta.url), 'utf8');
  assert.match(code, /SUPABASE_ANON_KEY/);
  assert.match(code, /Authorization: req.headers.get\('Authorization'\)/);
  assert.match(code, /handlePulseHome\(homeDb, resolvedUserId,[^\n]+callerDb\)/);
});
