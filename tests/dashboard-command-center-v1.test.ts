import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { isDashboardSnapshotV1 } from '../src/types/dashboardSnapshot.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('dashboard snapshot guard accepts v1 and rejects malformed contracts', () => {
  const minimum = {
    version: 1,
    generatedAt: new Date().toISOString(),
    focus: {},
    journey: {},
    people: {},
    business: {},
    workspace: {},
  };

  assert.equal(isDashboardSnapshotV1(minimum), true);
  assert.equal(isDashboardSnapshotV1({ ...minimum, version: 2 }), false);
  assert.equal(isDashboardSnapshotV1({ ...minimum, focus: null }), false);
});

test('snapshot RPC is authenticated, timezone-aware, versioned, and invoker-safe', () => {
  const migration = read('../supabase/migrations/20260710120000_dashboard_snapshot_v1.sql');
  const functionStart = migration.indexOf('CREATE OR REPLACE FUNCTION public.get_dashboard_snapshot_v1');
  const functionBody = migration.slice(functionStart);

  assert.match(functionBody, /RETURNS jsonb/);
  assert.match(functionBody, /auth\.uid\(\)/);
  assert.match(functionBody, /pg_timezone_names/);
  assert.match(functionBody, /'version', 1/);
  assert.match(functionBody, /GRANT EXECUTE ON FUNCTION public\.get_dashboard_snapshot_v1\(text\) TO authenticated/);
  assert.doesNotMatch(functionBody, /SECURITY DEFINER/);
});

test('snapshot covers the execution, human, business, workspace, and journey sources', () => {
  const migration = read('../supabase/migrations/20260710120000_dashboard_snapshot_v1.sql');
  for (const source of [
    'daily_tasks',
    'daily_missions',
    'routine_task_completions',
    'messages',
    'mentor_saves',
    'demo_calls',
    'cofounder_posts',
    'services',
    'icp_analysis_results',
    'pmf_analysis_results',
    'mvp_projects',
    'traction_engine_weekly_logs',
    'pitch_deck_analyses',
    'revenue_metrics',
    'kpi_goals',
    'dashboard_files',
    'user_activity_log',
  ]) {
    assert.match(migration, new RegExp(`public\\.${source}`));
  }
});

test('activity endpoint derives identity from JWT and sanitizes metadata', () => {
  const source = read('../supabase/functions/track-activity/index.ts');

  assert.match(source, /supabase\.auth\.getUser\(token\)/);
  assert.match(source, /const user_id = authData\.user\.id/);
  assert.match(source, /isAllowedEventType/);
  assert.match(source, /sanitizeActivityData/);
  assert.doesNotMatch(source, /const \{ user_id, activity_type/);
});

test('AI ranker cannot invent candidates and has deterministic timeout fallback', () => {
  const source = read('../supabase/functions/rank-dashboard-actions/index.ts');

  assert.match(source, /const allowed = new Set\(candidates\.map/);
  assert.match(source, /unique\.length !== candidates\.length/);
  assert.match(source, /setTimeout\(\(\) => controller\.abort\(\), 2_000\)/);
  assert.match(source, /DASHBOARD_RANKING_MODEL/);
  assert.match(source, /fallback: true/);
  assert.doesNotMatch(source, /deduct_credits|checkAndDeductCredits/);
});

test('client uses one snapshot query and a single activity invalidation stream', () => {
  const source = read('../src/contexts/DashboardDataContext.tsx');

  assert.match(source, /supabase\.rpc\('get_dashboard_snapshot_v1'/);
  assert.match(source, /staleTime: 30_000/);
  assert.match(source, /table: 'user_activity_log'/);
  assert.match(source, /invalidateQueries/);
});

test('dashboard and AI ranking roll out through separate PostHog flags and kill switches', () => {
  const shell = read('../src/components/dashboard/DashboardShell.tsx');
  const provider = read('../src/contexts/DashboardDataContext.tsx');
  const rollout = read('../src/lib/dashboardRollout.ts');

  assert.match(shell, /dashboard-command-center-v2/);
  assert.match(shell, /dashboard-command-center-shadow/);
  assert.match(shell, /dashboard_snapshot_shadow_compared/);
  assert.match(provider, /dashboard-ai-ranking/);
  assert.match(rollout, /VITE_DASHBOARD_V2_ROLLOUT_PERCENT/);
  assert.match(rollout, /VITE_DASHBOARD_AI_RANKING_ENABLED/);
});

test('execution-first visual order is focus, people, today, journey and business pulse', () => {
  const source = read('../src/components/dashboard/ExecutionDashboardHome.tsx');
  const focus = source.lastIndexOf('<FocusNow');
  const people = source.lastIndexOf('<WaitingOnPeople');
  const today = source.lastIndexOf('<TodayPanel');
  const journey = source.lastIndexOf('<JourneyPanel');
  const business = source.lastIndexOf('<BusinessPulse');

  assert.ok(focus > 0);
  assert.ok(focus < people);
  assert.ok(people < today);
  assert.ok(today < journey);
  assert.ok(journey < business);
});

test('tool registry covers the seven core journey tools and human layer', () => {
  const source = read('../src/config/dashboardToolRegistry.ts');
  for (const key of ['icp_builder', 'demo_studio', 'pmf_lab', 'mvp_builder', 'gtm_strategist', 'traction_engine', 'pitch_deck_analyzer', 'messages', 'saved_mentors']) {
    assert.match(source, new RegExp(`key: '${key}'`));
  }
});

test('dashboard tab polish keeps routine sections full-width and removes redundant hero cards', () => {
  const routine = read('../src/pages/YourRoutinePage.tsx');
  const shell = read('../src/components/dashboard/DashboardShell.tsx');
  const mentors = read('../src/pages/SavedMentorsPage.tsx');

  assert.doesNotMatch(routine, /xl:grid-cols-\[minmax\(0,1\.35fr\)/);
  assert.doesNotMatch(shell, /DashboardCommandSignalStrip/);
  assert.doesNotMatch(mentors, /Queue size|Best use|Community path/i);
});

test('returning to a mounted dashboard tab preserves its home component and completed profile gate', () => {
  const dashboard = read('../src/pages/Dashboard.tsx');
  const shell = read('../src/components/dashboard/DashboardShell.tsx');
  const tabs = read('../src/components/dashboard/DashboardTabsHost.tsx');

  assert.doesNotMatch(dashboard, /isActiveDashboardHome/);
  assert.match(tabs, /mountedTabIds/);
  assert.match(shell, /completedDashboardProfileCache/);
  assert.match(shell, /activationGate\.loading && day1Profile\?\.onboarding_completed !== true/);
});
