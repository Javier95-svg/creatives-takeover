import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { pickActiveProjectId } from '../src/lib/activeProjectChoice.ts';

// Project memory audit, phase 0 (2026-11-22): tools read the project's current
// result instead of the founder's latest row, nothing unvalidated is called
// validated, and evidence that was lost on the way between tools arrives.

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the active project is the stored choice while active, else the newest', () => {
  assert.equal(pickActiveProjectId('b', ['a', 'b']), 'b');
  assert.equal(pickActiveProjectId('gone', ['a', 'b']), 'a', 'an archived or deleted choice falls back');
  assert.equal(pickActiveProjectId(null, ['a']), 'a');
  assert.equal(pickActiveProjectId(null, []), null, 'no project: callers keep their old latest-row read');
});

test('cross-tool reads use the active project, not the founder\'s latest row', () => {
  const handoff = read('src/lib/icpHandoffSource.ts');
  assert.match(handoff, /scopeToCurrentProjectRow\(/, 'Demo Studio, Try and First Customer fallback ICP');

  const mvp = read('src/hooks/useMVPBuilder.ts');
  assert.match(mvp, /const projectId = await loadActiveProjectId\(user\.id\)/);
  for (const table of ['icp_analysis_results', 'pmf_analysis_results', 'gtm_plans']) {
    const call = mvp.slice(mvp.indexOf(`'${table}',`, mvp.indexOf('const projectId = await loadActiveProjectId')));
    assert.match(call.slice(0, 400), /projectId,\s*\n\s*\)/, `${table} prefill is project-scoped`);
  }
  assert.match(mvp, /const primaryIcpId = projectId \? '' :/, 'the account-wide primary ICP is only for accounts without projects');

  assert.match(read('src/hooks/useGTMStrategist.ts'), /scopeToCurrentProjectRow\(/);

  const evidence = read('src/components/icp/IcpEvidenceCheck.tsx');
  assert.match(evidence, /\.eq\('icp_analysis_id', icpAnalysisId\)/, 'PMF evidence is for the draft on screen');
  assert.match(evidence, /\.in\('project_id', demoIds\)/, 'signups come from this project\'s demo pages');

  const traction = read('src/pages/TractionEnginePage.tsx');
  assert.match(traction, /sprintsQuery = sprintsQuery\.eq\('project_id', projectId\)/);
  assert.match(traction, /project_id: projectIdRef\.current/);
});

test('nothing unvalidated reaches the model labelled as validated', () => {
  const mvpPrompt = read('supabase/functions/mvp-builder-generate/index.ts');
  assert.doesNotMatch(mvpPrompt, /lines\.push\(`Target market \(validated\)/);
  assert.doesNotMatch(mvpPrompt, /lines\.push\(`Validated positioning/);
  assert.match(mvpPrompt, /pmfDecided \? `Target market \(validated by PMF Lab\)/);

  const pulse = read('supabase/functions/_shared/pulse-context.ts');
  assert.match(pulse, /validatedProblemStatement: 'problemStatement'/);

  assert.doesNotMatch(read('src/lib/mvp-builder/journeyEvidence.ts'), /resolves the validated pain/);
});

test('the MVP evidence brief includes the project\'s GTM plan', () => {
  const brief = read('src/lib/mvp-builder/journeyEvidence.ts');
  assert.doesNotMatch(brief, /Promise\.resolve\(\{ data: null, error: null \}\),\s*\n\s*outcomesQuery/);
  assert.match(brief, /from\('gtm_plans' as never\)[\s\S]{0,300}\.is\('superseded_at', null\)/);
});

test('PMF Lab\'s narrow and pivot links are read by the ICP pages', () => {
  const draft = read('src/pages/IcpDraftPage.tsx');
  assert.match(draft, /readIcpRevisionDecision\(searchParams\.get\("decision"\)\)/);
  assert.match(draft, /\/icp-builder\?edit=/);
  assert.match(read('src/pages/IcpBuilderPage.tsx'), /<PmfDecisionBanner/);
  // The link PMF Lab builds must still use the parameter the pages read.
  assert.match(read('src/lib/pmfDecisionAction.ts'), /\?decision=\$\{input\.decision\}/);
});

test('traction sprints are current per project and channel', () => {
  const sql = read('supabase/migrations/20261122200000_traction_sprint_per_channel.sql');
  assert.match(sql, /AND lower\(channel\) = lower\(NEW\.channel\)/);
  assert.match(sql, /DROP INDEX IF EXISTS public\.traction_one_current_per_project_idx/);
  assert.match(sql, /ON public\.traction_engine_sprints \(project_id, lower\(channel\)\)/);
  assert.match(sql, /'tractionSprintId', \(SELECT r\.id FROM public\.traction_engine_sprints r WHERE r\.project_id = p\.id AND r\.superseded_at IS NULL\s*\n\s*ORDER BY/);
});

test('the projects table and its owner-only policies are in the repo', () => {
  const sql = read('supabase/migrations/20260917150000_projects_table.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.projects/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  for (const action of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
    assert.match(sql, new RegExp(`FOR ${action} (USING|WITH CHECK) \\(\\(SELECT auth\\.uid\\(\\)\\) = user_id\\)`));
  }
});
