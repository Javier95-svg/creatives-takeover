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
  assert.match(source, /aiRanking\?\.orderedCandidateKeys \?\? candidates\.map/);
  assert.match(source, /"deterministic-v1"/);
  assert.doesNotMatch(source, /deduct_credits|checkAndDeductCredits/);
});

test('client uses one snapshot query and a single activity invalidation stream', () => {
  const source = read('../src/contexts/DashboardDataContext.tsx');

  assert.match(source, /supabase\.rpc\('get_dashboard_snapshot_v1'/);
  assert.match(source, /staleTime: 30_000/);
  assert.match(source, /table: 'user_activity_log'/);
  assert.match(source, /invalidateQueries/);
});

test('canonical command center uses the snapshot without a legacy shadow data path', () => {
  const dashboard = read('../src/pages/Dashboard.tsx');
  const shell = read('../src/components/dashboard/DashboardShell.tsx');
  const provider = read('../src/contexts/DashboardDataContext.tsx');
  const rollout = read('../src/lib/dashboardRollout.ts');
  const envExample = read('../.env.example');

  assert.doesNotMatch(dashboard, /ExecutionDashboardHome|dashboard-command-center-v2|isExecutionDashboardEnabled/);
  assert.doesNotMatch(shell, /dashboard-command-center-v2|founder-execution-cycle-v1|SnapshotDashboardFrame/);
  assert.doesNotMatch(shell, /dashboard-command-center-shadow|dashboard_snapshot_shadow_compared/);
  assert.doesNotMatch(provider, /useFounderCycle|founder_cycle/);
  assert.match(provider, /dashboard-ai-ranking/);
  assert.doesNotMatch(rollout, /isExecutionDashboardEnabled|VITE_DASHBOARD_V2_ROLLOUT_PERCENT/);
  assert.doesNotMatch(envExample, /VITE_DASHBOARD_V2_ROLLOUT_PERCENT/);
  assert.match(rollout, /VITE_DASHBOARD_AI_RANKING_ENABLED/);
});

test('first-result and resume banners lead into the complete command center', () => {
  const dashboard = read('../src/pages/Dashboard.tsx');
  const firstResult = dashboard.lastIndexOf('<FirstResultActivationCard');
  const resume = dashboard.lastIndexOf('<ContinueArtifactCard');
  const today = dashboard.lastIndexOf('<DashboardTodayCockpit');
  const updates = dashboard.lastIndexOf('<PlatformUpdates');
  const journey = dashboard.lastIndexOf('<FounderJourneyPanel');
  const disclosure = dashboard.lastIndexOf('<DashboardDisclosure');
  const exitIntent = dashboard.lastIndexOf('<ExitIntentModal');

  assert.ok(firstResult > 0);
  assert.ok(firstResult < resume);
  assert.ok(resume < today);
  assert.ok(today < updates);
  assert.ok(updates < journey);
  assert.ok(today < journey);
  assert.ok(journey < disclosure);
  assert.ok(disclosure < exitIntent);
  assert.match(dashboard, /showFirstResultBanner/);
  assert.match(dashboard, /first_result_mode: showFirstResultBanner/);
});

test('first-result prompt is compact, responsive, non-dismissible, and keeps activation analytics', () => {
  const banner = read('../src/components/dashboard/FirstResultActivationCard.tsx');
  const tour = read('../src/components/dashboard/DashboardTour.tsx');

  assert.match(banner, /mb-6 rounded-2xl/);
  assert.match(banner, /sm:flex-row/);
  assert.match(banner, /Finish your first result/);
  assert.match(banner, /trackRetentionEvent\('activation_first_action_opened'/);
  assert.doesNotMatch(banner, /handleDismiss|aria-label="Dismiss"|CheckCircle2/);
  assert.match(tour, /Progress Tracker, your daily operating view/);
  assert.doesNotMatch(tour, /Home, your daily command center/);
});

test('every completed account receives the canonical utility routes and dashboard sections', () => {
  const dashboard = read('../src/pages/Dashboard.tsx');
  const sidebar = read('../src/components/dashboard/DashboardSidebar.tsx');
  const founderSignals = read('../src/components/dashboard/StartupHomeCommandCenter.tsx');

  assert.match(
    sidebar,
    /UNIVERSAL_MORE_TOOL_KEYS[\s\S]*'saved_mentors'[\s\S]*'decision_sprint'[\s\S]*'core_metrics'[\s\S]*'ai_goals'/,
  );
  assert.match(sidebar, /!isUniversalMoreTool && !modeConfig\.visibleTools\.includes/);
  assert.match(sidebar, /!isUniversalMoreTool && !sidebarPreferences\[item\.prefKey\]/);
  assert.match(dashboard, /<DashboardTodayCockpit \/>[\s\S]*<PlatformUpdates \/>[\s\S]*<FounderJourneyPanel \/>/);
  assert.match(dashboard, /title="More founder signals"[\s\S]*<StartupHomeCommandCenter \/>/);
  assert.match(founderSignals, /lg:grid-cols-2/);
  assert.match(founderSignals, /title="Your startup info"/);
  assert.match(founderSignals, /Connect, Share & Grow/);
  assert.doesNotMatch(
    founderSignals,
    /Ideal Customer|Positioning And Competition|Validation And PMF|Tech Stack And Budget|Startup Development Cycle Outputs/,
  );
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
  assert.match(shell, /if \(profileLoading\)/);
  assert.match(shell, /shouldRedirectToGuidedOnboarding/);
  assert.match(shell, /shouldShowOnboardingPathGate/);
  assert.doesNotMatch(shell, /useActivationGate|shouldEnforceGate|Complete your first action to unlock your full dashboard/);
});

test('dashboard data stays visible across tab and auth-session refreshes', () => {
  const dashboard = read('../src/pages/Dashboard.tsx');
  const retainedHooks = [
    read('../src/hooks/useRoutine.ts'),
    read('../src/hooks/useTaskCalendarEngine.ts'),
    read('../src/hooks/useBizMapProgress.ts'),
    read('../src/hooks/useDailyMission.ts'),
    read('../src/hooks/useOnboardingContext.ts'),
    read('../src/hooks/useStageIntelligence.ts'),
  ];

  assert.match(dashboard, /const userId = user\?\.id \?\? null/);
  assert.match(dashboard, /\[currentPlan, userCreatedAt, userId\]/);
  assert.doesNotMatch(dashboard, /\[currentPlan, user\]/);
  retainedHooks.forEach((hook) => {
    assert.match(hook, /loadedUserIdRef/);
  });
});

test('assigned-stage review opens a practical onboarding answer dialog instead of navigating away', () => {
  const journey = read('../src/components/dashboard/FounderJourneyPanel.tsx');
  const journeyHook = read('../src/hooks/useFounderJourneySnapshot.ts');
  const reviewStart = journey.indexOf('<Dialog>');
  const reviewEnd = journey.indexOf('</Dialog>', reviewStart);
  const reviewDialog = journey.slice(reviewStart, reviewEnd);

  assert.ok(reviewStart > 0);
  assert.ok(reviewEnd > reviewStart);
  assert.match(reviewDialog, /<DialogTrigger asChild>/);
  assert.match(reviewDialog, /Review assigned stage/);
  assert.match(reviewDialog, /Your onboarding answer/);
  assert.match(reviewDialog, /Why we assigned this stage/);
  assert.match(journey, /getStageExplanation/);
  assert.doesNotMatch(reviewDialog, /to="\/bizmap-ai"/);
  assert.match(journeyHook, /onboarding,[\s\S]*stageIntelligence/);
});
