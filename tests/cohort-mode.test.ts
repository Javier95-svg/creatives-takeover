import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  attentionReasons,
  cohortCsv,
  cohortKpis,
  cohortTotalWeeks,
  cohortWeek,
  generateInviteCode,
  linesToList,
  memberStage,
  memberStageAtJoin,
  type CohortDashboardData,
  type CohortMemberProgress,
} from '../src/lib/cohorts.ts';

// Cohort mode (2026-10-19): founders in a cohort open on a cohort view, program
// staff on a program dashboard. Staff see progress and check-ins, not content.

const migration = readFileSync('supabase/migrations/20261019090000_cohort_mode_v1.sql', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const dashboard = readFileSync('src/pages/Dashboard.tsx', 'utf8');

const member = (overrides: Partial<CohortMemberProgress> = {}): CohortMemberProgress => ({
  userId: 'u1',
  name: 'Ana',
  email: 'ana@example.com',
  status: 'active',
  joinedAt: '2026-10-01T10:00:00Z',
  lastActivityAt: '2026-10-14T10:00:00Z',
  outcomes: [],
  completedTaskIds: [],
  interviews: { total: 0, verified: 0 },
  evidence: { replies: 0, interviewsCompleted: 0, commitments: 0, payments: 0, strangersActed: 0, strangersIdentified: 0, total: 0, verified: 0 },
  experimentsRun: 0,
  experimentDecisions: 0,
  assumptions: { total: 0, tested: 0 },
  checkins: [],
  ...overrides,
});

const identityDone = [{ tool: 'icp_builder', status: 'ready', updated_at: '2026-10-03T00:00:00Z', completed_at: '2026-10-03T00:00:00Z' }];
const NOW = new Date('2026-10-15T12:00:00Z');

test('weeks count from the start date and cap at the last week', () => {
  assert.equal(cohortTotalWeeks('2026-10-01', '2026-10-30'), 5); // 30 days
  assert.equal(cohortTotalWeeks('2026-10-01', '2026-10-28'), 4);
  assert.equal(cohortWeek('2026-10-01', '2026-10-28', new Date('2026-09-30T12:00:00Z')), 0);
  assert.equal(cohortWeek('2026-10-01', '2026-10-28', new Date('2026-10-01T00:30:00Z')), 1);
  assert.equal(cohortWeek('2026-10-01', '2026-10-28', new Date('2026-10-08T12:00:00Z')), 2);
  assert.equal(cohortWeek('2026-10-01', '2026-10-28', new Date('2026-12-01T12:00:00Z')), 4);
});

test('the stage uses the same rules as the founder dashboard', () => {
  assert.deepEqual(memberStage([]), { index: 0, label: 'Identity', planReady: false, decisionReached: false });
  const stage = memberStage(identityDone);
  assert.equal(stage.label, 'Prototyping');
  assert.equal(stage.planReady, true);
  // Drafts never complete a stage.
  assert.equal(memberStage([{ tool: 'icp_builder', status: 'draft' }]).planReady, false);
});

test('attention flags are things a program manager can act on', () => {
  // Week 3: quiet for a week, no week-2 check-in, no customer profile, no
  // interview logged and no experiment started.
  const quiet = attentionReasons(member({ lastActivityAt: '2026-10-05T12:00:00Z' }), 3, NOW).map((reason) => reason.key);
  assert.deepEqual(quiet, ['quiet', 'missed_checkin', 'no_plan', 'no_interviews', 'no_experiment']);

  // Active, checked in last week, asked for help.
  const helped = attentionReasons(member({
    outcomes: identityDone,
    interviews: { total: 3, verified: 0 },
    experimentsRun: 1,
    checkins: [{ weekNumber: 2, checkinDate: '2026-10-09', wins: ['5 calls'], blockers: [''], nextWeekGoals: [], helpNeeded: 'Intro to a bank', createdAt: '2026-10-09T10:00:00Z' }],
  }), 3, NOW).map((reason) => reason.key);
  assert.deepEqual(helped, ['help']);

  // Nothing to flag before the cohort starts.
  assert.deepEqual(attentionReasons(member({ lastActivityAt: null }), 0, NOW), []);
});

test('the summary and the CSV come from the same numbers', () => {
  const data: CohortDashboardData = {
    cohort: { cohortId: 'c1', cohortName: 'Spring, "pilot"', programName: 'Fintech Lab', startDate: '2026-10-01', endDate: '2026-10-28', status: 'active', joinCode: 'ABCDEFGH', staffCode: null },
    members: [
      member({ outcomes: identityDone, interviews: { total: 6, verified: 2 }, checkins: [{ weekNumber: 3, checkinDate: '2026-10-15', wins: ['x'], blockers: [], nextWeekGoals: [], helpNeeded: null, createdAt: '2026-10-15T09:00:00Z' }] }),
      member({ userId: 'u2', name: 'Luis, Jr', interviews: { total: 2, verified: 0 } }),
    ],
    generatedAt: NOW.toISOString(),
  };
  const kpis = cohortKpis(data.members, 3, NOW);
  assert.equal(kpis.founders, 2);
  assert.equal(kpis.plansReady, 1);
  assert.equal(kpis.medianInterviews, 4);
  assert.equal(kpis.checkinsThisWeek, 1);

  const csv = cohortCsv(data, 3, NOW).split('\n');
  assert.equal(csv.length, 3);
  assert.match(csv[0], /^Founder,Email,Joined,Stage at join,Stage,/);
  assert.match(csv[0], /Experiments run/);
  assert.match(csv[2], /^"Luis, Jr",/); // commas are quoted
});

test('invite codes match the format the database accepts', () => {
  for (let i = 0; i < 50; i += 1) assert.match(generateInviteCode(), /^[A-Z0-9]{6,32}$/);
  assert.doesNotMatch(generateInviteCode(64), /[01IOL]/);
  assert.deepEqual(linesToList('  first \n\n second\n'), ['first', 'second']);
});

test('joining needs an invite code and the founder’s consent', () => {
  // The old policy let any signed-in user insert themselves into any cohort.
  assert.match(migration, /DROP POLICY IF EXISTS "Users can join cohorts" ON public\.cohort_members;/);
  assert.doesNotMatch(migration, /CREATE POLICY[^;]*ON public\.cohort_members FOR INSERT/);
  assert.match(migration, /IF NOT coalesce\(p_share_progress, false\) THEN/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.join_cohort_v1\(text, boolean\) FROM PUBLIC, anon;/);
});

test('policies no longer recurse or leak codes and check-ins', () => {
  // cohort_members' old SELECT policy queried cohort_members itself.
  assert.match(migration, /DROP POLICY IF EXISTS "Users can view members in their cohorts"/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.is_cohort_member[\s\S]*?SECURITY DEFINER/);
  // Cohorts carry invite codes, so only admins read the table.
  assert.match(migration, /DROP POLICY IF EXISTS "Anyone can view active cohorts"/);
  // Check-ins are no longer visible to every member of the cohort.
  assert.match(migration, /DROP POLICY IF EXISTS "Users can view check-ins in their cohorts"/);
  assert.match(migration, /CREATE POLICY "Users view own cohort check-ins"[\s\S]*?USING \(user_id = auth\.uid\(\)\)/);
});

test('the program dashboard shows consented progress to staff and admins only', () => {
  const fn = migration.slice(migration.indexOf('FUNCTION public.cohort_dashboard_v1'));
  assert.match(fn, /IF NOT \(v_is_admin OR public\.is_cohort_staff\(p_cohort_id\)\) THEN/);
  assert.match(fn, /AND m\.progress_shared_at IS NOT NULL/);
  // Only our team hands out staff invites.
  assert.match(fn, /'staffCode', CASE WHEN v_is_admin THEN v_cohort\.staff_code ELSE NULL END/);
  // Progress, not content: no artifact payloads or messages in the result.
  assert.doesNotMatch(fn, /evidence_manifest|artifact_id|private_operator_notes|messages/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.cohort_dashboard_v1\(uuid\) FROM PUBLIC, anon;/);
});

test('cohort mode is wired into routes and the dashboard', () => {
  for (const route of ['/join/:code', '/admin/cohorts', '/admin/cohorts/:cohortId']) {
    assert.match(app, new RegExp(`<Route path="${route.replace(/[/:]/g, (c) => `\\${c}`)}"`), route);
  }
  assert.match(app, /path="\/admin\/cohorts" element=\{<AdminRoute>/);
  assert.match(dashboard, /useCohortContext\(\)/);
  assert.match(dashboard, /<ProgramDashboard /);
  assert.match(dashboard, /<FounderCohortView /);
});

// Pilot readiness (2026-10-23): counts cover the program period, imported
// evidence is not verified, pilots carry a plan, founders can leave.
const readiness = readFileSync('supabase/migrations/20261023120000_cohort_pilot_readiness.sql', 'utf8');
const planPermissions = readFileSync('src/config/planPermissions.ts', 'utf8');
const subscription = readFileSync('src/hooks/useSubscription.ts', 'utf8');
const founderView = readFileSync('src/components/cohort/FounderCohortView.tsx', 'utf8');

test('the stage at join uses only results completed before joining', () => {
  const later = [{ tool: 'icp_builder', status: 'ready', completed_at: '2026-10-03T00:00:00Z' }];
  assert.equal(memberStageAtJoin(member({ joinedAt: '2026-10-01T10:00:00Z', outcomes: later })).label, 'Identity');
  assert.equal(memberStageAtJoin(member({ joinedAt: '2026-10-05T10:00:00Z', outcomes: later })).label, 'Prototyping');
  // Without a completion date a result can't be placed before joining.
  assert.equal(memberStageAtJoin(member({ outcomes: [{ tool: 'icp_builder', status: 'ready' }] })).label, 'Identity');
});

test('interview and experiment flags wait for weeks 2 and 3', () => {
  const active = { lastActivityAt: '2026-10-14T10:00:00Z', outcomes: identityDone };
  assert.deepEqual(attentionReasons(member(active), 1, NOW), []);
  const week2 = attentionReasons(member({ ...active, checkins: [{ weekNumber: 1, checkinDate: '2026-10-02', wins: [], blockers: [], nextWeekGoals: [], helpNeeded: null, createdAt: '2026-10-02T09:00:00Z' }] }), 2, NOW).map((reason) => reason.key);
  assert.deepEqual(week2, ['no_interviews']);
  // Interviews logged as evidence events count too.
  const evidenceInterviews = member({ ...active, evidence: { ...member().evidence, interviewsCompleted: 2 } });
  assert.ok(!attentionReasons(evidenceInterviews, 2, NOW).some((reason) => reason.key === 'no_interviews'));
  assert.equal(cohortKpis([member({ experimentsRun: 2 }), member({ experimentsRun: 1 })], 3, NOW).experimentsRun, 3);
});

test('the dashboard counts the program period and never treats imported rows as verified', () => {
  const fn = readiness.slice(readiness.indexOf('FUNCTION public.cohort_dashboard_v1'));
  assert.match(fn, /v_until := \(v_cohort\.end_date \+ 1\)::timestamptz;/);
  for (const window of [/i\.created_at >= m\.joined_at AND i\.created_at < v_until/, /e\.occurred_at >= m\.joined_at AND e\.occurred_at < v_until/, /x\.created_at >= m\.joined_at AND x\.created_at < v_until/, /d\.decided_at >= m\.joined_at AND d\.decided_at < v_until/]) {
    assert.match(fn, window);
  }
  assert.match(fn, /e\.verification_mode IN \('platform_verified', 'customer_action', 'transaction'\)/);
  assert.doesNotMatch(fn, /verification_mode <> 'founder_reported'/);
  // Still consented progress only, for staff and admins.
  assert.match(fn, /IF NOT \(v_is_admin OR public\.is_cohort_staff\(p_cohort_id\)\) THEN/);
  assert.match(fn, /AND m\.progress_shared_at IS NOT NULL/);
  assert.doesNotMatch(fn, /hypothesis|statement|main_feedback|messages/);
});

test('a pilot plan applies for the cohort dates only and never lowers a paid plan', () => {
  const pilot = readiness.slice(readiness.indexOf('FUNCTION public.cohort_pilot_plan_v1'), readiness.indexOf('REVOKE ALL ON FUNCTION public.cohort_pilot_plan_v1'));
  assert.match(pilot, /AND current_date BETWEEN c\.start_date AND c\.end_date/);
  assert.match(pilot, /AND m\.status IN \('active', 'paused'\)/);
  assert.match(pilot, /auth\.uid\(\) IS DISTINCT FROM p_user_id THEN\s+RETURN NULL;/);
  assert.match(readiness, /REVOKE ALL ON FUNCTION public\.cohort_pilot_plan_v1\(uuid\) FROM PUBLIC, anon;/);
  // Read where access is decided; never written to Stripe-owned columns.
  assert.match(readiness, /v_pilot := public\.cohort_pilot_plan_v1\(p_user_id\);/);
  assert.match(readiness, /OR public\.cohort_pilot_plan_v1\(p_founder_id\) IN \('rising', 'pro'\)/);
  assert.doesNotMatch(readiness, /UPDATE public\.(profiles|subscribers|user_credits)/);
  // The app applies the same rule.
  assert.match(planPermissions, /export function withPilotPlan/);
  assert.match(subscription, /supabase\.rpc\('cohort_pilot_plan_v1' as never\)/);
  assert.match(subscription, /withPilotPlan\(normalizePlan\(normalized\.subscription_tier\), pilot\)/);
});

test('a founder can leave a cohort, which stops sharing', () => {
  const leave = readiness.slice(readiness.indexOf('FUNCTION public.leave_cohort_v1'));
  assert.match(leave, /SET status = 'dropped', progress_shared_at = NULL/);
  assert.match(leave, /WHERE cohort_id = p_cohort_id AND user_id = v_user/);
  assert.match(readiness, /REVOKE ALL ON FUNCTION public\.leave_cohort_v1\(uuid\) FROM PUBLIC, anon;/);
  assert.match(founderView, /supabase\.rpc\('leave_cohort_v1' as never/);
});
