import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { freshnessMessage, parseProjectFreshness } from '../src/lib/outcomeFreshness.ts';
import { measuredSummary } from '../src/lib/gtmMeasuredSummary.ts';
import { formatIcpRevisionBlock, parseIcpRevision } from '../supabase/functions/_shared/icp-revision.ts';

// Project memory plan, phase 3 (2026-11-23): results say when they were built
// on something that has since changed, and findings flow back: PMF into the
// ICP revision, Traction into the GTM plan, the GTM plan into Traction.
// The SQL (source stamps, freshness, "keep as is") was also exercised end to
// end in an in-memory Postgres (16 scenarios) before handing it over.

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('freshness from the server becomes one plain sentence per tool', () => {
  const parsed = parseProjectFreshness({
    mvp: { id: 'm', changed: ['icp', 'pmf'] },
    gtm: { id: 'g', changed: [] },
    pmf: { id: 'p', changed: ['made_up'] },
    nonsense: { id: 'x', changed: ['icp'] },
  });
  assert.deepEqual(Object.keys(parsed).sort(), ['gtm', 'mvp', 'pmf']);
  assert.equal(freshnessMessage('mvp', parsed.mvp!.changed), 'This MVP was made before your latest ICP and your latest PMF result.');
  assert.equal(freshnessMessage('gtm', parsed.gtm!.changed), null, 'nothing changed, nothing shown');
  assert.equal(freshnessMessage('pmf', parsed.pmf!.changed), null, 'unknown sources are ignored');
  assert.equal(freshnessMessage('gtm', ['icp', 'pmf', 'mvp']), 'This go-to-market plan was made before your latest ICP, your latest PMF result and your latest MVP.');
  assert.equal(freshnessMessage('traction', ['gtm']), 'These traction channels were made before your latest go-to-market plan.');
  assert.deepEqual(parseProjectFreshness(null), {});
});

test('every tool shows the notice, with "Keep as is"', () => {
  for (const [path, tool] of [
    ['src/pages/PMFLabPage.tsx', 'pmf'], ['src/pages/GTMStrategistPage.tsx', 'gtm'],
    ['src/pages/TractionEnginePage.tsx', 'traction'], ['src/pages/demo-studio/ProjectsDashboardPage.tsx', 'demo'],
  ] as const) {
    assert.match(read(path), new RegExp(`outcomeTool="${tool}"`), path);
  }
  assert.match(read('src/components/mvp-builder/MVPBuilder.tsx'), /<OutcomeFreshnessBanner tool="mvp"/);
  assert.match(read('src/components/tool-shell/ToolPageShell.tsx'), /outcomeTool \? <OutcomeFreshnessBanner/);
  const banner = read('src/components/workspace/OutcomeFreshnessBanner.tsx');
  assert.match(banner, /rpc\('project_outcome_freshness', \{ p_project_id: activeProjectId \}\)/);
  assert.match(banner, /rpc\('keep_outcome_sources', \{ p_tool: tool, p_id: entry\.id \}\)/);
});

test('results are stamped with what they were built on, after the project is assigned', () => {
  const sql = read('supabase/migrations/20261123140000_outcome_source_versions.sql');
  assert.match(sql, /CREATE TRIGGER zz_stamp_outcome_sources BEFORE INSERT ON public\.demo_studio_projects[\s\S]*?stamp_outcome_sources\('icp'\)/);
  assert.match(sql, /ON public\.pmf_analysis_results[\s\S]*?stamp_outcome_sources\('icp', 'demo'\)/);
  assert.match(sql, /UPDATE OF generated_code, project_files ON public\.mvp_projects[\s\S]*?stamp_outcome_sources\('icp', 'pmf'\)/);
  assert.match(sql, /UPDATE OF current_version ON public\.gtm_plans[\s\S]*?stamp_outcome_sources\('icp', 'pmf', 'mvp'\)/);
  assert.match(sql, /ON public\.traction_engine_sprints[\s\S]*?stamp_outcome_sources\('gtm'\)/);
  assert.match(sql, /p_row ->> 'icp_analysis_id', p_row ->> 'source_icp_analysis_id'/, 'a named source wins over "the current one"');
  assert.match(sql, /WHERE id = p_project_id AND user_id = auth\.uid\(\)/, 'freshness only for the project owner');
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.project_outcome_freshness\(uuid\), public\.keep_outcome_sources\(text, uuid\) TO authenticated/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.current_outcome_ids\(uuid\), public\.outcome_sources_for\(uuid, text\[\], jsonb\), public\.stamp_outcome_sources\(\)\s*FROM PUBLIC, anon, authenticated/);
});

test('revising an ICP from PMF Lab hands the findings to the model', () => {
  const context = '11111111-1111-4111-8111-111111111111';
  assert.deepEqual(parseIcpRevision({ decision: 'narrow', validationContextId: context }), { decision: 'narrow', validationContextId: context });
  assert.equal(parseIcpRevision({ decision: 'build', validationContextId: context }), null, 'only narrow and pivot revise the ICP');
  assert.equal(parseIcpRevision({ decision: 'pivot', validationContextId: 'not-an-id' }), null);
  const block = formatIcpRevisionBlock('narrow', {
    summaryInsight: 'Only small orchards felt it weekly',
    buyingSignals: ['Asked about price twice'],
    commonObjections: ['Large farms already use a fuel card portal'],
    nextExperiment: 'Interview five orchards under 50 acres',
  }, 58.4);
  assert.match(block, /verdict on their customer conversations was "narrow" \(evidence score 58\/100\)/);
  assert.match(block, /Only small orchards felt it weekly/);
  assert.match(block, /- Large farms already use a fuel card portal/);
  assert.match(block, /treat them as founder_input, never as external_source/);

  assert.match(read('src/components/icp/ICPBuilder.tsx'), /\.\.\.\(revision \? \{ revision \} : \{\}\)/);
  const analyzer = read('supabase/functions/icp-analyzer/index.ts');
  assert.match(analyzer, /loadIcpRevisionContext\(serviceClient, user\.id, parseIcpRevision/);
  assert.match(analyzer, /revisionContext: await revisionPromise/);
  assert.match(read('supabase/functions/_shared/icp-draft.ts'), /revisionContext\?: string \| null/);
});

test('the GTM plan shows what Traction measured for each channel, this project only', () => {
  assert.equal(measuredSummary({ weeksLogged: 3, passes: 1, lastDecision: 'kill' }), '3 weeks logged in Traction Engine · target met in 1 · last call: stop it');
  assert.equal(measuredSummary({ weeksLogged: 1, passes: 0, lastDecision: null }), '1 week logged in Traction Engine · target met in 0');
  assert.match(read('src/lib/gtmMeasuredPerformance.ts'), /query = query\.in\('sprint_id', sprintIds\)/);
  assert.match(read('src/components/gtm/GTMWorkspace.tsx'), /fetchMeasuredChannelPerformance\(user!\.id, projectId\)/);
  assert.match(read('src/components/gtm/GTMPlayCard.tsx'), /<Field label="Measured so far">/);
});

test('Traction offers the GTM plan\'s main channel from the server, not the browser', () => {
  const traction = read('src/pages/TractionEnginePage.tsx');
  assert.match(traction, /from\('gtm_plans'\)\.select\('id'\)[\s\S]{0,120}\.eq\('project_id', projectId\)\.is\('superseded_at', null\)/);
  assert.match(traction, /Start tracking it/);
  assert.doesNotMatch(read('src/pages/FirstCustomerSprintPage.tsx'), /consumeGTMTractionHandoff/);
});
