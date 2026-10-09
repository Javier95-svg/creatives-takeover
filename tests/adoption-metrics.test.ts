import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { cohortTotals, share, topSection, type AdoptionCohort, type AdoptionSectionStat } from '../src/lib/adoptionMetrics.ts';
import { ADOPTION_SECTIONS, sectionForPath, WORKSPACE_SECTION_TOOLS } from '../src/lib/workspaceSections.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const sectionMigration = read('../supabase/migrations/20261012120000_adoption_by_section.sql');
// The latest definition of admin_adoption_metrics().
const timeMigration = read('../supabase/migrations/20261013120000_consent_and_section_time.sql');

test('adoption helpers format shares, find the leading section and only total finished cohorts', () => {
  assert.equal(share(2, 6), '2 of 6 (33%)');
  assert.equal(share(0, 0), 'n/a');
  assert.equal(share(null, 4), 'n/a');

  const section = (name: string, engaged30d: number, visited30d: number): AdoptionSectionStat =>
    ({ section: name, visited30d, engaged30d, actions30d: engaged30d, engagedEver: engaged30d, tools: [] });
  assert.equal(topSection([section('BizMap', 2, 6), section('Network', 4, 3), section('Content', 0, 9)])?.section, 'Network');
  assert.equal(topSection([section('BizMap', 0, 0)]), null);

  const cohorts: AdoptionCohort[] = [
    { week: '2026-08-03', accounts: 3, activated7d: 1, activeWeek1: 1, activeWeek4: 0 },
    { week: '2026-09-28', accounts: 2, activated7d: null, activeWeek1: null, activeWeek4: null },
  ];
  const totals = cohortTotals(cohorts);
  // Cohorts still inside the window are left out rather than counted as zero.
  assert.deepEqual(totals.activated, { accounts: 3, value: 1 });
  assert.deepEqual(totals.week1, { accounts: 3, value: 1 });
  assert.deepEqual(totals.week4, { accounts: 3, value: 0 });
});

test('the report uses exactly the sidebar sections and tools, in sidebar order', () => {
  const sidebar = read('../src/components/workspace/WorkspaceSidebar.tsx');
  assert.match(sidebar, /const NAV_TOOLS: Record<string, string\[\]> = WORKSPACE_SECTION_TOOLS;/);

  const values = timeMigration.slice(timeMigration.indexOf('section_tools (section, section_order, tool, tool_order) AS ('), timeMigration.indexOf('legacy_tools (tool_key'));
  const rows = [...values.matchAll(/\('([A-Za-z]+)', (\d+), '([^']+)', (\d+)\)/g)]
    .map(([, section, sectionOrder, tool, toolOrder]) => ({ section, sectionOrder: Number(sectionOrder), tool, toolOrder: Number(toolOrder) }));
  const fromSql: Record<string, string[]> = {};
  for (const row of [...rows].sort((a, b) => a.sectionOrder - b.sectionOrder || a.toolOrder - b.toolOrder)) {
    (fromSql[row.section] ??= []).push(row.tool);
  }
  assert.deepEqual(Object.keys(fromSql), [...ADOPTION_SECTIONS]);
  assert.deepEqual(fromSql, WORKSPACE_SECTION_TOOLS);
  assert.ok(!/Email Templates|email_templates/.test(timeMigration), 'Email Templates is out of scope');
});

test('time spent is formatted for the report', async () => {
  const { formatDuration, timeSpent } = await import('../src/lib/adoptionMetrics.ts');
  assert.equal(formatDuration(0), '–');
  assert.equal(formatDuration(undefined), '–');
  assert.equal(formatDuration(30), '<1 m');
  assert.equal(formatDuration(45 * 60), '45 m');
  assert.equal(formatDuration(2 * 3600), '2 h');
  assert.equal(formatDuration(2 * 3600 + 5 * 60), '2 h 5 m');
  assert.deepEqual(timeSpent({ seconds30d: 3600, timedAccounts30d: 4 }), { total: '1 h', perAccount: '15 m' });
  assert.deepEqual(timeSpent({ seconds30d: 600, timedAccounts30d: 1 }), { total: '10 m', perAccount: null });
});

test('time spent is consent-gated on the server, capped, and private; cookie choices are private', () => {
  assert.match(timeMigration, /ALTER TABLE public\.analytics_consents ENABLE ROW LEVEL SECURITY;/);
  assert.match(timeMigration, /REVOKE ALL ON public\.analytics_consents FROM PUBLIC, anon, authenticated;/);
  assert.match(timeMigration, /REVOKE ALL ON FUNCTION public\.record_analytics_consent\(text, integer, timestamptz\) FROM PUBLIC, anon;/);
  // The latest decision wins across devices.
  assert.match(timeMigration, /WHERE EXCLUDED\.decided_at >= public\.analytics_consents\.decided_at;/);

  const recordTime = timeMigration.slice(timeMigration.indexOf('FUNCTION public.record_section_time'), timeMigration.indexOf('FUNCTION public.admin_adoption_metrics'));
  assert.match(recordTime, /IF v_user IS NULL OR v_seconds = 0 THEN RETURN; END IF;/);
  assert.match(recordTime, /LEAST\(GREATEST\(COALESCE\(p_seconds, 0\), 0\), 300\)/);
  assert.match(recordTime, /IF NOT EXISTS \(SELECT 1 FROM public\.analytics_consents c WHERE c\.user_id = v_user AND c\.status = 'granted'\) THEN RETURN; END IF;/);
  assert.match(recordTime, /LEAST\(public\.section_activity_days\.engaged_seconds \+ v_seconds, 86400\)/);
  assert.match(timeMigration, /REVOKE ALL ON FUNCTION public\.record_section_time\(text, text, integer\) FROM PUBLIC, anon;/);

  // The report keeps its admin check and team exclusion.
  assert.match(timeMigration, /IF NOT public\.is_admin_user\(\) THEN\s*RAISE EXCEPTION/);
  assert.match(timeMigration, /REVOKE ALL ON FUNCTION public\.admin_adoption_metrics\(integer\) FROM PUBLIC, anon;/);
  assert.match(timeMigration, /email NOT ILIKE '%@creatives-takeover\.com'/);
  assert.match(timeMigration, /FROM public\.mentor_saves WHERE source = 'manual'/);
});

test('every workspace page maps to its section; non-tool pages count for the section only', async () => {
  const expect = (path: string, section: string | null, tool?: string | null) => {
    const match = sectionForPath(path);
    assert.equal(match?.section ?? null, section, path);
    if (tool !== undefined) assert.equal(match?.tool ?? null, tool, path);
  };
  expect('/dashboard/tasks', 'Dashboard', 'Tasks');
  expect('/', 'Dashboard', null);
  expect('/icp/draft/abc', 'BizMap', 'ICP Builder');
  expect('/go-to-market', 'BizMap', 'GTM Strategist');
  expect('/mentorship/jane', 'Network', 'Find a Mentor');
  expect('/messages', 'Network', null);
  expect('/profile/pedro', 'Network', null);
  expect('/vc-search', 'Insighta', 'VC Search');
  expect('/rooms/posts/1', 'Community', 'Rooms');
  expect('/newspaper/a-story', 'Content', 'Newspaper');
  expect('/accelerator-hunt', 'Bonus', 'Accelerator Hunt');
  expect('/tech-stack', 'Bonus', 'Tech Stack Builder');
  expect('/email-templates', null);
  expect('/pricing', null);
  expect('/dashboard/settings', null);
  // Every sidebar tool's own page resolves back to that section and tool.
  const { WORKSPACE_ROUTES } = await import('../src/lib/workspaceNavigation.ts');
  for (const section of ADOPTION_SECTIONS) {
    for (const tool of WORKSPACE_SECTION_TOOLS[section]) {
      assert.deepEqual(sectionForPath(WORKSPACE_ROUTES[tool]), { section, tool }, `${section} / ${tool}`);
    }
  }
  const tracker = read('../src/components/RoadmapRetentionTracking.tsx');
  assert.match(tracker, /void recordSectionVisit\(location\.pathname\)/);
});

test('section visits are private and the report is admin only, excluding the team', () => {
  assert.match(sectionMigration, /ALTER TABLE public\.section_activity_days ENABLE ROW LEVEL SECURITY;/);
  assert.match(sectionMigration, /REVOKE ALL ON public\.section_activity_days FROM PUBLIC, anon, authenticated;/);
  assert.match(sectionMigration, /record_section_visit[\s\S]*?IF v_user IS NULL THEN RETURN; END IF;/);
  assert.match(sectionMigration, /REVOKE ALL ON FUNCTION public\.record_section_visit\(text, text\) FROM PUBLIC, anon;/);
  assert.match(sectionMigration, /IF NOT public\.is_admin_user\(\) THEN\s*RAISE EXCEPTION/);
  assert.match(sectionMigration, /REVOKE ALL ON FUNCTION public\.admin_adoption_metrics\(integer\) FROM PUBLIC, anon;/);
  assert.match(sectionMigration, /email NOT ILIKE '%@creatives-takeover\.com'/);
  // Mentors saved by onboarding recommendations are not a founder's action.
  assert.match(sectionMigration, /FROM public\.mentor_saves WHERE source = 'manual'/);
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
  assert.match(page, /<CardTitle>Sections<\/CardTitle>/);
});
