import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { cohortTotals, rankTools, share, toolLabel, type AdoptionCohort, type AdoptionTool } from '../src/lib/adoptionMetrics.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('adoption helpers label tools, format shares and only total finished cohorts', () => {
  assert.equal(toolLabel('icp_builder'), 'ICP Builder');
  assert.equal(toolLabel('insighta_research'), 'Insighta saved research');
  assert.equal(share(2, 6), '2 of 6 (33%)');
  assert.equal(share(0, 0), 'n/a');
  assert.equal(share(null, 4), 'n/a');

  const tool = (key: string, withResult30d: number, opened30d: number): AdoptionTool =>
    ({ tool: key, opened30d, started30d: 0, withResult30d, results30d: withResult30d, withResultEver: withResult30d });
  assert.deepEqual(rankTools([tool('pmf_lab', 0, 5), tool('icp_builder', 2, 1), tool('demo_studio', 0, 9)]).map((t) => t.tool),
    ['icp_builder', 'demo_studio', 'pmf_lab']);

  const cohorts: AdoptionCohort[] = [
    { week: '2026-08-03', accounts: 3, activated7d: 1, activeWeek1: 1, activeWeek4: 0 },
    { week: '2026-09-28', accounts: 2, activated7d: null, activeWeek1: null, activeWeek4: null },
  ];
  const totals = cohortTotals(cohorts);
  assert.deepEqual(totals.activated, { accounts: 3, value: 1 });
  // Cohorts still inside the window are left out rather than counted as zero.
  assert.deepEqual(totals.week1, { accounts: 3, value: 1 });
  assert.deepEqual(totals.week4, { accounts: 3, value: 0 });
});

test('adoption metrics are admin only in the database, exclude the team, and have a route', () => {
  const migration = read('../supabase/migrations/20261011120000_admin_adoption_metrics.sql');
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /IF NOT public\.is_admin_user\(\) THEN\s*RAISE EXCEPTION/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.admin_adoption_metrics\(integer\) FROM PUBLIC, anon;/);
  assert.match(migration, /email NOT ILIKE '%@creatives-takeover\.com'/);
  assert.match(migration, /r\.role::text = 'admin'/);
  const app = read('../src/App.tsx');
  assert.match(app, /path="\/admin\/adoption" element=\{<AdminRoute><AdminAdoption \/><\/AdminRoute>\}/);
});

test('the adoption report opens inside the workspace frame; other admin pages keep their layout', async () => {
  const { isWorkspaceRoute } = await import('../src/lib/workspacePolicy.ts');
  assert.equal(isWorkspaceRoute('/admin/adoption'), true);
  for (const path of ['/admin/analytics', '/admin/account-requests', '/newspaper/admin', '/admin/adoption/extra']) {
    assert.equal(isWorkspaceRoute(path), false, path);
  }
  const page = read('../src/pages/AdminAdoption.tsx');
  assert.match(page, /<ToolPageShell/);
  assert.doesNotMatch(page, /<Navigation \/>/);
});
