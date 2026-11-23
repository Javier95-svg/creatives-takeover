import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { PulseDatabase } from './helpers/pulseDatabase.ts';
import { resolvePulseContext } from '../supabase/functions/_shared/pulse-context.ts';
import {
  PROJECT_CONTEXT_BUDGET,
  formatProjectContext,
  loadProjectContext,
  resolveProjectId,
} from '../supabase/functions/_shared/project-context.ts';

// Project memory plan, phase 1: one builder gives every tool what the founder
// already saved for the project, scoped to that project, honest about how far
// each part is proven, and within a size budget.

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const icpA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const icpB = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function fixture() {
  const db = new PulseDatabase();
  // The fake database does not sort; it reverses insertion order for a
  // descending read. Rows are listed oldest first so that matches the
  // last_run_at ordering the code asks for: Orchard is the most recently used.
  db.tables.projects = [
    { id: b, user_id: 'owner', title: 'Different venture', idea_summary: 'Something else', archived_at: null, last_run_at: '2026-11-01', created_at: '2026-10-02' },
    { id: a, user_id: 'owner', title: 'Orchard', idea_summary: 'Farm logistics', archived_at: null, last_run_at: '2026-11-20', created_at: '2026-10-01' },
  ];
  db.tables.icp_analysis_results = [
    { id: icpA, user_id: 'owner', project_id: a, superseded_at: null, target_audience: 'Fruit farmers', analysis_data: { pain: 'Spoilage in transit' } },
    { id: 'old', user_id: 'owner', project_id: a, superseded_at: '2026-09-01', analysis_data: { pain: 'OUTDATED' } },
    { id: icpB, user_id: 'owner', project_id: b, superseded_at: null, target_audience: 'WRONG PROJECT', analysis_data: { pain: 'WRONG PROJECT' } },
    { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', user_id: 'someone-else', project_id: a, superseded_at: null, analysis_data: { pain: 'PRIVATE' } },
  ];
  db.tables.pmf_analysis_results = [{ id: 'pmf-a', user_id: 'owner', project_id: a, superseded_at: null, pmf_score: 58, verdict: 'narrow', analysis_data: { decision: 'narrow', summaryInsight: 'Only small orchards felt it weekly' } }];
  db.tables.gtm_plans = [{ id: 'gtm-a', project_id: a, user_id: 'owner', superseded_at: null, plan_content: { primary_channel: 'Farm cooperatives' } }];
  db.tables.pulse_memories = [{ id: 'm1', user_id: 'owner', project_id: a, kind: 'decision', text: 'Start with orchards under 50 acres', status: 'active', created_at: '2026-11-01' }];
  db.tables.journey_assumptions = [{ user_id: 'owner', statement: 'Farmers will pay per shipment', status: 'untested', latest_source_tool: 'icp_builder' }];
  return db;
}

test('a request about a result resolves to that result\'s project, else the most recently used one', async () => {
  const db = fixture();
  assert.equal(await resolveProjectId(db as never, 'owner', { icpAnalysisId: icpB }), b, 'the evidence case\'s ICP decides');
  assert.equal(await resolveProjectId(db as never, 'owner', { projectId: b }), b, 'an owned project the request names');
  assert.equal(await resolveProjectId(db as never, 'owner', {}), a, 'most recently used');
  assert.equal(
    await resolveProjectId(db as never, 'owner', { icpAnalysisId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }), a,
    'another user\'s result is never followed to their project',
  );
  db.tables.projects.find((project) => project.id === a)!.archived_at = '2026-11-21';
  assert.equal(await resolveProjectId(db as never, 'owner', { projectId: a }), b, 'archived projects are skipped');
});

test('the block holds this project\'s results, notes and assumptions, each with its basis', async () => {
  const context = await resolvePulseContext(fixture() as never, 'owner', a);
  const block = formatProjectContext(context, 'demo_copy');
  assert.ok(block);
  assert.match(block.text, /Project: Orchard \| Farm logistics/);
  assert.match(block.text, /Spoilage in transit/);
  assert.match(block.text, /Only small orchards felt it weekly/);
  assert.match(block.text, /Farm cooperatives/);
  assert.ok(block.text.includes('- decision [pulse]: Start with orchards under 50 acres'));
  assert.match(block.text, /\[untested\] Farmers will pay per shipment/);
  assert.match(block.text, /basis: Saved customer hypothesis/);
  assert.match(block.text, /Never present a hypothesis, plan or founder statement as validated/);
  assert.doesNotMatch(block.text, /OUTDATED|WRONG PROJECT|PRIVATE/);
  assert.deepEqual(block.sources, ['icp', 'pmf', 'gtm', 'memory', 'assumptions']);
});

test('each tool gets the other stages, never its own earlier result', async () => {
  const context = await resolvePulseContext(fixture() as never, 'owner', a);
  const pmf = formatProjectContext(context, 'pmf_scoring');
  assert.ok(pmf);
  assert.doesNotMatch(pmf.text, /Only small orchards/, 'a PMF score must not lean on the last PMF score');
  const gtm = formatProjectContext(context, 'gtm_plan');
  assert.ok(gtm);
  assert.doesNotMatch(gtm.text, /Farm cooperatives/, 'a new GTM plan starts from the other tools');
  assert.match(gtm.text, /Only small orchards/, 'but builds on what PMF Lab found');
});

test('the block stays within its budget however large the saved results are', async () => {
  const db = fixture();
  const long = 'x'.repeat(5000);
  db.tables.icp_analysis_results[0].analysis_data = { pain: long, draftDocument: { customer: { roleLine: long, summary: long }, pricing: long, risks: [long, long] } };
  db.tables.pmf_analysis_results[0].analysis_data = { summaryInsight: long, strengths: [long, long, long] };
  db.tables.pulse_memories = Array.from({ length: 25 }, (_, index) => ({ id: `m${index}`, user_id: 'owner', project_id: a, kind: 'fact', text: 'y'.repeat(280), status: 'active' }));
  const context = await resolvePulseContext(db as never, 'owner', a);
  for (const purpose of Object.keys(PROJECT_CONTEXT_BUDGET) as Array<keyof typeof PROJECT_CONTEXT_BUDGET>) {
    const block = formatProjectContext(context, purpose);
    assert.ok(block);
    assert.ok(block.text.length <= PROJECT_CONTEXT_BUDGET[purpose], `${purpose}: ${block.text.length} > ${PROJECT_CONTEXT_BUDGET[purpose]}`);
  }
});

test('no project or an unreadable source never blocks a generation', async () => {
  const empty = fixture();
  empty.tables.projects = [];
  assert.equal(await loadProjectContext(empty as never, 'owner', 'gtm_plan'), null);

  const failing = fixture();
  failing.failures.add('profiles');
  assert.equal(await loadProjectContext(failing as never, 'owner', 'gtm_plan'), null, 'a failed read returns null, it does not throw');

  const ok = await loadProjectContext(fixture() as never, 'owner', 'mvp_build');
  assert.equal(ok?.projectId, a);
  assert.match(ok?.text ?? '', /Farm cooperatives/);
});

test('every tool prompt reads the project context', () => {
  const uses: Array<[string, string]> = [
    ['supabase/functions/pmf-evidence-scorer/index.ts', "'pmf_scoring'"],
    ['supabase/functions/demo-studio-generator/index.ts', '"demo_copy"'],
    ['supabase/functions/gtm-analyzer/index.ts', "'gtm_plan'"],
    ['supabase/functions/mvp-builder-generate/index.ts', '"mvp_build"'],
    ['supabase/functions/first-customer-sprint-assistant/index.ts', "'first_customer'"],
  ];
  for (const [path, purpose] of uses) {
    const source = read(path);
    assert.match(source, /from ['"]\.\.\/_shared\/project-context\.ts['"]/, path);
    assert.ok(source.includes(`loadProjectContext(`) && source.includes(purpose), `${path} loads ${purpose}`);
  }
  // Each prompt keeps the founder's own input in charge of conflicts.
  assert.match(read('supabase/functions/gtm-analyzer/index.ts'), /FOUNDER INTAKE wins any conflict/);
  assert.match(read('supabase/functions/demo-studio-generator/index.ts'), /BRIEF above is what the founder wants on this page and wins any conflict/);
  assert.match(read('supabase/functions/pmf-evidence-scorer/index.ts'), /It is never evidence of demand/);
});
