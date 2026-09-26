import assert from 'node:assert/strict';
import test from 'node:test';
import { PulseDatabase } from './helpers/pulseDatabase.ts';
import { resolvePulseContext } from '../supabase/functions/_shared/pulse-context.ts';
import { searchPulseCatalog } from '../supabase/functions/_shared/pulse-catalog.ts';
import { pulsePassages } from '../supabase/functions/_shared/pulse-passages.ts';
import { pulseFastPlan, readPulseChunk } from '../supabase/functions/_shared/pulse-routing.ts';
import { handlePulseHome } from '../supabase/functions/_shared/pulse-home.ts';
import { pulseScope } from '../src/lib/pulseScope.ts';

const project = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const sprint = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const input = { sessionId: '11111111-1111-4111-8111-111111111111', turnId: '22222222-2222-4222-8222-222222222222', message: 'Recommend an article about pricing' };

test('only self-contained topical requests skip planning; contextual and mixed requests retain it', () => {
  assert.equal(pulseFastPlan(input.message)?.catalogQuery, 'pricing');
  for (const message of ['Recommend an article', 'Find a podcast for my stage', 'Show an article like that one', 'Find an article and a mentor on pricing']) assert.equal(pulseFastPlan(message), null, message);
});

test('article passages select relevant text outside the introduction, preserve order and bound size', () => {
  const passages = pulsePassages('A general introduction with enough words to form a passage.\n\n' + 'Noise '.repeat(1000) + '\n\nPricing interviews reveal willingness to pay. Test a real offer before building.', 'pricing');
  assert.ok(passages.some(text => text.includes('Pricing interviews')));
  assert.ok(passages.join('').length <= 2700);
  assert.doesNotMatch(pulsePassages('<script>secret()</script> A published passage with [a link](https://example.com) and useful details.', '')[0], /secret|https:/);
});

test('article enrichment uses only published bodies and degrades honestly to metadata', async () => {
  const db = new PulseDatabase();
  Object.assign(db, { rpc: async () => ({ data: [{ kind: 'article', id: project, slug: 'pricing', title: 'Pricing', summary: 'Metadata summary' }] }) });
  db.tables.stories_articles = [{ id: project, status: 'published', body_content: 'Pricing interviews help test willingness to pay before building anything.' }];
  let [result] = await searchPulseCatalog(db as never, ['article'], 'pricing');
  assert.equal(result.evidence[0].basis, 'article_passages');
  assert.match(result.evidence[0].passages![0], /willingness/);
  db.tables.stories_articles[0].status = 'draft';
  [result] = await searchPulseCatalog(db as never, ['article'], 'pricing');
  assert.equal(result.evidence[0].basis, 'metadata');
  assert.equal(result.evidence[0].passages, undefined);
  db.failures.add('stories_articles');
  assert.equal((await searchPulseCatalog(db as never, ['article'], 'pricing'))[0].state, 'available');
});

test('experiment context excludes other sprints/users and preserves zero results separately from targets', async () => {
  const db = new PulseDatabase();
  db.tables.projects = [{ id: project, user_id: 'owner', title: 'Orchard' }];
  db.tables.traction_engine_sprints = [{ id: sprint, user_id: 'owner', project_id: project, channel: 'Email' }];
  db.tables.traction_engine_experiments = [
    { id: 'correct', user_id: 'owner', sprint_id: sprint, target_metric: 'Paid trials', target_value: 5, result_value: 0, pass: false },
    { id: 'WRONG_SPRINT', user_id: 'owner', sprint_id: project, result_value: 100 },
    { id: 'PRIVATE', user_id: 'other', sprint_id: sprint, result_value: 200 },
  ];
  const context = await resolvePulseContext(db as never, 'owner', project);
  const facts = context.outcomes.traction.data as any;
  assert.equal(facts.experiments.length, 1);
  assert.equal(facts.experiments[0].result_value, 0);
  assert.equal(facts.experiments[0].target_value, 5);
  assert.equal(facts.experiments[0].pass, false);
  assert.doesNotMatch(JSON.stringify(context), /WRONG_SPRINT|PRIVATE/);
  db.failures.add('traction_engine_experiments');
  assert.equal(((await resolvePulseContext(db as never, 'owner', project)).outcomes.traction.data as any).experimentState, 'unavailable');
});

test('account task context is opt-in, owner-filtered, excludes dismissed work and distinguishes failures', async () => {
  const db = new PulseDatabase();
  db.tables.daily_tasks = [
    { id: project, user_id: 'owner', task_text: 'Interview customers', is_completed: false },
    { id: 'private', user_id: 'other', task_text: 'PRIVATE_TASK', is_completed: false },
    { id: 'dismissed', user_id: 'owner', task_text: 'DISMISSED_TASK', is_completed: false, recommendation_status: 'dismissed' },
    { id: sprint, user_id: 'owner', task_text: 'Completed interview', is_completed: true, completed_at: '2026-09-26' },
  ];
  assert.equal((await resolvePulseContext(db as never, 'owner', null)).outcomes.tasks, undefined);
  const context = await resolvePulseContext(db as never, 'owner', null, true);
  assert.match(context.outcomes.tasks.basis!, /not project-linked/);
  assert.match(JSON.stringify(context), /Interview customers/);
  assert.match(JSON.stringify(context), /Completed interview/);
  assert.doesNotMatch(JSON.stringify(context), /PRIVATE_TASK|DISMISSED_TASK/);
  db.failures.add('daily_tasks');
  assert.deepEqual((await resolvePulseContext(db as never, 'owner', null, true)).unavailableSources, ['tasks']);
});

test('five roles use one generation call for explicit content requests and record latency without prompt data', async () => {
  const original = globalThis.fetch;
  (globalThis as any).Deno = { env: { get: () => 'synthetic' } };
  try {
    for (const role of ['founder', 'builder', 'mentor', 'marketplace', 'investor'] as const) {
      const db = new PulseDatabase();
      db.tables.profiles[0].user_type = role;
      db.tables.chatbot_conversations[0].business_context = { pulseScope: pulseScope(role, null) };
      Object.assign(db, { rpc: async () => ({ data: [] }) });
      let calls = 0;
      globalThis.fetch = async (_url, options) => {
        calls++;
        const body = JSON.parse(String(options?.body));
        assert.equal(body.stream, true);
        assert.match(JSON.stringify(body.messages), new RegExp(role === 'marketplace' ? 'service provider' : role));
        return new Response('data: {"choices":[{"delta":{"content":"No matching article was found."}}]}\n\ndata: [DONE]\n\n');
      };
      assert.match(await (await handlePulseHome(db as never, 'owner', input)).text(), /"type":"complete"/);
      assert.equal(calls, 1);
      const performance = db.tables.chatbot_messages[1].metadata.performance;
      assert.equal(performance.plannerMode, 'explicit_catalog');
      assert.ok(performance.firstTokenMs >= 0);
      assert.doesNotMatch(JSON.stringify(performance), /pricing/);
    }
  } finally { globalThis.fetch = original; }
});

test('malformed planner output falls back to grounded generation rather than losing the turn', async () => {
  const original = globalThis.fetch;
  (globalThis as any).Deno = { env: { get: () => 'synthetic' } };
  globalThis.fetch = async (_url, options) => JSON.parse(String(options?.body)).stream
    ? new Response('data: {"choices":[{"delta":{"content":"Select a project so I can use its saved evidence."}}]}\n\ndata: [DONE]\n\n')
    : Response.json({ choices: [{ message: { content: 'malformed' } }] });
  try {
    const db = new PulseDatabase();
    assert.match(await (await handlePulseHome(db as never, 'owner', { ...input, message: 'What should I focus on next?' })).text(), /"type":"complete"/);
    assert.equal(db.tables.chatbot_messages[1].metadata.performance.plannerMode, 'fallback');
    assert.equal(db.tables.chatbot_messages[1].metadata.homeActions[0].route, '/dashboard/tasks');
  } finally { globalThis.fetch = original; }
});

test('stalled provider reads are cancelled rather than leaving Pulse waiting indefinitely', async () => {
  let cancelled = false;
  const reader = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } }).getReader();
  await assert.rejects(readPulseChunk(reader, 10), /stalled/);
  assert.equal(cancelled, true);
});
