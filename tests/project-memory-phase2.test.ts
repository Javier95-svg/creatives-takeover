import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { PulseDatabase } from './helpers/pulseDatabase.ts';
import { loadPulseMemory, resolvePulseContext } from '../supabase/functions/_shared/pulse-context.ts';
import { formatProjectContext } from '../supabase/functions/_shared/project-context.ts';
import { memoryTopicLabel, parseMemorySuggestions } from '../src/lib/pulseMemory.ts';
import { projectPatchFromProfileEdit } from '../src/lib/projectProfileSync.ts';

// Project memory plan, phase 2 (2026-11-23): tool saves write the project's
// decision history, newer entries replace older ones with history kept, and a
// tool result that disagrees with the founder's own call waits for them.
// The SQL rules were also exercised end to end in an in-memory Postgres
// (20 scenarios) before handing the migration over.

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const project = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

test('Pulse suggestions carry a topic, except commitments and unknown topics', () => {
  const parsed = parseMemorySuggestions({ memories: [
    { kind: 'decision', text: 'Target dental clinics first', dueOn: null, topic: 'target_customer' },
    { kind: 'commitment', text: 'Call five clinics by Friday', dueOn: '2026-11-27', topic: 'channel' },
  ] });
  assert.equal(parsed[0].topic, 'target_customer');
  assert.equal(parsed[1].topic, null, 'a commitment is a to-do, not a position a tool could contradict');
  assert.equal(parseMemorySuggestions([{ kind: 'fact', text: 'We have 3 pilots', topic: 'made_up' }])[0].topic, null);
  assert.equal(memoryTopicLabel('channel_result:linkedin outreach'), 'Channel result: linkedin outreach');
  assert.equal(memoryTopicLabel('target_customer'), 'Target customer');
});

test('saving a Pulse suggestion records its topic and that it came from Pulse', () => {
  const chips = read('src/components/pulse/PulseMemoryChips.tsx');
  assert.match(chips, /topic: suggestion\.topic \?\? null, source_tool: 'pulse'/);
});

test('memory reaches Pulse and the tools with its source and evidence, and conflicts stay unsettled', async () => {
  const db = new PulseDatabase();
  db.tables.projects = [{ id: project, user_id: 'owner', title: 'Orchard', idea_summary: 'Cold chain', archived_at: null }];
  db.tables.pulse_memories = [
    { id: 'm1', user_id: 'owner', project_id: project, kind: 'hypothesis', text: 'Target customer: Orchards under 50 acres', status: 'active', topic: 'target_customer', source_tool: 'icp_builder', evidence: 'assumption' },
    { id: 'm2', user_id: 'owner', project_id: project, kind: 'fact', text: 'LinkedIn outreach: meetings 3 against a target of 10', status: 'active', topic: 'channel_result:linkedin outreach', source_tool: 'traction_engine', evidence: 'verified' },
    { id: 'm3', user_id: 'owner', project_id: project, kind: 'decision', text: 'Target dental clinics first', status: 'needs_review', topic: 'target_customer', source_tool: 'pulse' },
    { id: 'm4', user_id: 'owner', project_id: project, kind: 'hypothesis', text: 'OLD customer', status: 'superseded', topic: 'target_customer', source_tool: 'icp_builder' },
  ];
  const memory = await loadPulseMemory(db as never, 'owner', project);
  assert.ok(memory);
  assert.deepEqual(memory.items.map((item) => item.id).sort(), ['m1', 'm2'], 'only active entries are used');
  assert.equal(memory.items.find((item) => item.id === 'm1')?.source, 'icp_builder');
  assert.equal(memory.items.find((item) => item.id === 'm2')?.evidence, 'verified');
  assert.deepEqual(memory.pendingReview?.map((item) => item.id), ['m3']);
  assert.doesNotMatch(memory.provenance, /Confirmed by them/, 'tool entries are not described as the founder\'s confirmed words');

  const block = formatProjectContext(await resolvePulseContext(db as never, 'owner', project), 'gtm_plan');
  assert.ok(block);
  assert.ok(block.text.includes('- hypothesis [icp_builder, assumption]: Target customer: Orchards under 50 acres'));
  assert.ok(block.text.includes('- fact [traction_engine, verified]: LinkedIn outreach'));
  assert.match(block.text, /Not settled: a tool result disagrees with the founder's own call/);
  assert.doesNotMatch(block.text, /OLD customer/);
});

test('Pulse is told where entries come from and to ask about conflicts, never pick', () => {
  const rule = read('supabase/functions/_shared/pulse-memory.ts');
  assert.match(rule, /items from a tool \(icp_builder, pmf_lab, demo_studio, mvp_builder, gtm_strategist, traction_engine\)/);
  assert.match(rule, /memory\.pendingReview/);
  assert.match(rule, /never pick for them/);
  assert.match(rule, /topic: what a decision, hypothesis or fact is about/);
});

test('a profile edit updates projects that still hold the old text, never imported text', () => {
  const before = { name: 'Orchard', description: 'Cold chain for farms' };
  const after = { name: 'FreshRoute', description: 'Fresh fruit delivery' };
  assert.deepEqual(projectPatchFromProfileEdit({ title: 'Orchard', idea_summary: 'Cold chain for farms' }, before, after),
    { title: 'FreshRoute', idea_summary: 'Fresh fruit delivery' });
  assert.deepEqual(projectPatchFromProfileEdit({ title: 'Imported name', idea_summary: 'Imported summary' }, before, after), {});
  assert.deepEqual(projectPatchFromProfileEdit({ title: 'Orchard', idea_summary: '' }, before, { ...before, description: 'New' }), { idea_summary: 'New' });
  assert.deepEqual(projectPatchFromProfileEdit({ title: 'Orchard', idea_summary: 'x' }, before, before), {}, 'no edit, no change');
  assert.match(read('src/components/profile/EditProfileModal.tsx'), /projectPatchFromProfileEdit\(project, before, after\)/);
});

test('the migration records every tool save and keeps the rules server-side', () => {
  const sql = read('supabase/migrations/20261123100000_project_decision_ledger.sql');
  for (const trigger of ['icp_records_ledger', 'pmf_records_ledger', 'demo_records_ledger', 'mvp_records_ledger',
    'gtm_plan_records_ledger', 'gtm_plays_record_ledger', 'traction_experiment_records_ledger', 'project_records_ledger', 'pulse_memories_reconcile']) {
    assert.match(sql, new RegExp(`CREATE TRIGGER ${trigger}\\b`), trigger);
  }
  assert.match(sql, /'needs_review'/);
  assert.match(sql, /DEFERRABLE INITIALLY DEFERRED/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.record_project_memory\([^)]*\) FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.resolve_pulse_memory_conflict\(uuid\) TO authenticated/);
  assert.match(sql, /A ledger problem must never fail the founder's save/);
  assert.match(sql, /backfill skipped/);
});

test('the memory panel lets the founder choose, and shows source, evidence and history', () => {
  const panel = read('src/components/pulse/PulseMemoryPanel.tsx');
  assert.match(panel, /rpc\('resolve_pulse_memory_conflict', \{ p_keep_id: id \}\)/);
  assert.match(panel, /Needs your call/);
  assert.match(panel, /MEMORY_EVIDENCE_LABEL/);
  assert.match(panel, /History \(/);
});
