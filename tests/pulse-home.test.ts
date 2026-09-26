import { PulseDatabase as Database } from './helpers/pulseDatabase.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { homePriorities, validateHomeActions } from '../src/lib/pulseHome.ts';
import { homeMentorActions, homeToolActions } from '../src/lib/pulseHomeRecommendations.ts';
import type { DashboardSnapshot, DashboardAction } from '../src/types/dashboardSnapshot.ts';
import type { Mentor } from '../src/types/mentor.ts';
import { handlePulseHome } from '../supabase/functions/_shared/pulse-home.ts';

const action = (id: string, title = id): DashboardAction => ({ key: id, entityId: id, title, toolKey: 'icp_builder' } as DashboardAction);
const snapshot = { focus: { primaryAction: action('first'), secondaryActions: [action('done'), action('duplicate', 'first'), action('second'), action('third'), action('fourth')], dueToday: [{ id: 'done', title: 'Done', completed: true }, { id: 'task', title: 'Task', completed: false }] } } as DashboardSnapshot;
test('priorities share ordering, exclude completed/duplicates, cap at three and resolve tool routes', () => {
  const result = homePriorities(snapshot);
  assert.deepEqual(result.map(item => item.id), ['first', 'second', 'third']);
  assert.equal(result[0].route, '/icp-builder');
  assert.deepEqual(homePriorities(null), []);
  const updated = structuredClone(snapshot);
  updated.focus.dueToday.push({ id: 'first', title: 'first', completed: true } as never);
  updated.focus.secondaryActions = [];
  assert.deepEqual(homePriorities(updated).map(item => item.id), ['task']);
});
test('unsafe destinations and model-invented tool IDs are never actionable', () => {
  const tools = homeToolActions(['icp_builder', 'icp_builder', 'https://evil.example', 'invented']);
  assert.equal(tools.length, 1);
  assert.equal(validateHomeActions([{ ...tools[0], route: 'javascript:alert(1)' }])[0].route, '/icp-builder');
  assert.deepEqual(validateHomeActions([{ kind: 'mentor', id: '123', title: 'Fake', reason: '', route: '//evil.example' }]), []);
  const bad = structuredClone(snapshot);
  bad.focus.primaryAction!.actionUrl = 'https://evil.example';
  assert.equal(homePriorities(bad)[0].route, '/dashboard/tasks');
});
const mentor = (id: string, expertise: string[], is_active = true) => ({ id, name: `Mentor ${id}`, bio: '', expertise, is_active, rating: 5, is_featured: true } as Mentor);
test('fundraising cards require active, explicit expertise evidence, not popularity', () => {
  const cards = homeMentorActions([mentor('a', ['Strategy']), mentor('b', ['Finance']), mentor('c', ['Fundraising']), mentor('d', ['Fundraising'], false)], { track: 'fundraising' });
  assert.deepEqual(cards.map(item => item.id), ['c']);
  assert.equal(cards[0].route, '/mentorship/mentor-c');
  assert.match(cards[0].reason, /investor readiness/);
  assert.equal(homeMentorActions(['a', 'b', 'c', 'd'].map(id => mentor(id, ['Fundraising'])), { track: 'fundraising' }).length, 3);
  assert.deepEqual(homeMentorActions([mentor('a', ['Strategy'])], { track: 'fundraising' }), []);
});

const input = { sessionId: '11111111-1111-4111-8111-111111111111', turnId: '22222222-2222-4222-8222-222222222222', message: 'How do I define my customer persona?', businessContext: {} };
const invoke = (db: Database, owner: string | null = 'owner', turn = input) => handlePulseHome(db as never, owner, turn);
test('server enforces authentication, ownership and home purpose before reading history or calling AI', async () => {
  const db = new Database();
  assert.equal((await invoke(db, null)).status, 401);
  assert.equal((await invoke(db, 'other-account')).status, 404);
  db.tables.chatbot_conversations[0].purpose = null;
  assert.equal((await invoke(db)).status, 404);
  assert.equal(db.tables.chatbot_messages.length, 0);
});
test('stream saves text/cards, supports idempotent retry, clarification and honest no-match results', async () => {
  const originalFetch = globalThis.fetch;
  (globalThis as any).Deno = { env: { get: () => 'test-only-key' } };
  let calls = 0, plan: Record<string, unknown> = { toolKeys: ['icp_builder'] }, fail = false;
  globalThis.fetch = async (_url, options) => {
    calls++;
    const body = JSON.parse(String(options?.body));
    if (!body.stream) return Response.json({ choices: [{ message: { content: JSON.stringify(plan) } }] });
    const text = 'data: ' + JSON.stringify({ choices: [{ delta: { content: 'Let’s clarify your ideal customer.' } }] }) + '\n\n';
    return new Response(text + (fail ? '' : 'data: [DONE]\n\n'));
  };
  try {
    const db = new Database();
    const result = await (await invoke(db)).text();
    assert.match(result, /"type":"complete"/);
    assert.match(result, /\/icp-builder/);
    assert.equal(db.tables.chatbot_messages.length, 2);
    await (await invoke(db)).text();
    assert.equal(calls, 2, 'completed retries replay the stored answer without a new AI call');
    assert.equal(db.tables.chatbot_messages.length, 2);
    assert.equal((await invoke(db, 'owner', { ...input, message: 'Changed text' })).status, 409);

    plan = { toolKeys: ['icp_builder'], clarify: 'What are you trying to achieve?' };
    const ambiguous = new Database();
    await (await invoke(ambiguous)).text();
    assert.deepEqual(ambiguous.tables.chatbot_messages[1].metadata.homeActions, []);

    plan = { mentorTrack: 'fundraising' };
    const noMatch = new Database();
    noMatch.tables.mentors = [mentor('a', ['Strategy'])];
    await (await invoke(noMatch)).text();
    assert.deepEqual(noMatch.tables.chatbot_messages[1].metadata.homeActions.map((a: any) => a.kind), ['browse']);
    const matches = new Database(); matches.tables.mentors = [mentor('b', ['Fundraising'])];
    await (await invoke(matches)).text();
    assert.equal(matches.tables.chatbot_messages[1].metadata.homeActions[0].id, 'b');

    const interrupted = new Database(); fail = true;
    assert.match(await (await invoke(interrupted)).text(), /"type":"error"/);
    assert.equal(interrupted.tables.chatbot_messages.length, 1, 'partial assistant output is not persisted as completed');
    fail = false;
    assert.match(await (await invoke(interrupted)).text(), /"type":"complete"/);
    assert.equal(interrupted.tables.chatbot_messages.length, 2, 'retry reuses the user turn');
  } finally { globalThis.fetch = originalFetch; delete (globalThis as any).Deno; }
});
test('migration and dispatcher explicitly isolate Home without changing billing policy', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260916090000_pulse_home_conversations.sql', import.meta.url), 'utf8');
  assert.match(migration, /AS RESTRICTIVE/);
  assert.match(migration, /user_id = auth.uid\(\)/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS chatbot_home_turn_once/);
  const service = readFileSync(new URL('../supabase/functions/_shared/pulse-home.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(service, /checkAndDeductCredits|stripe|\.rpc\(/);
  const client = readFileSync(new URL('../src/services/pulseHomeStream.ts', import.meta.url), 'utf8');
  assert.match(client, /import.meta.env.VITE_SUPABASE_URL/);
});
