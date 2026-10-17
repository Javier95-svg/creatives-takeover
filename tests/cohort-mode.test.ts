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
  experimentDecisions: 0,
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
  // Week 3: quiet for a week, no week-2 check-in, no customer profile.
  const quiet = attentionReasons(member({ lastActivityAt: '2026-10-05T12:00:00Z' }), 3, NOW).map((reason) => reason.key);
  assert.deepEqual(quiet, ['quiet', 'missed_checkin', 'no_plan']);

  // Active, checked in last week, asked for help.
  const helped = attentionReasons(member({
    outcomes: identityDone,
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
  assert.match(csv[0], /^Founder,Email,Stage/);
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
