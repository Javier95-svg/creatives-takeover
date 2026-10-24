import assert from 'node:assert/strict';
import test from 'node:test';

import { attentionReasons, cohortCsv, cohortKpis, cohortWeek, memberStage } from '../src/lib/cohorts.ts';
import {
  DEMO_USER_ID,
  DEMO_USER_NAME,
  INITIAL_PILOT_DEMO,
  demoCohort,
  demoDashboard,
  demoMember,
  pilotDemoReducer,
  type PilotDemoAction,
  type PilotDemoState,
} from '../src/lib/pilotDemo.ts';

// The /enterprise demo (2026-10-24): a visitor plays a sample founder and
// sees their own row on the program dashboard, judged by the product's rules.

const NOW = new Date('2026-10-24T12:00:00Z');
const AT = NOW.toISOString();
const run = (...actions: PilotDemoAction[]) => actions.reduce<PilotDemoState>(pilotDemoReducer, INITIAL_PILOT_DEMO);

test('the sample cohort is in its first week of four, on the Rising pilot plan', () => {
  // Activity is always in the past, whatever the time of day.
  for (const hour of [0, 6, 12, 23]) {
    const at = new Date(Date.UTC(2026, 9, 24, hour, 30));
    for (const member of demoDashboard(INITIAL_PILOT_DEMO, at).members) {
      assert.ok(Date.parse(member.lastActivityAt ?? '') <= at.getTime(), member.name + ' at ' + hour);
      assert.ok(Date.parse(member.joinedAt) <= Date.parse(member.lastActivityAt ?? ''), member.name);
      for (const checkin of member.checkins) assert.ok(Date.parse(checkin.createdAt) <= at.getTime(), member.name);
    }
  }
  const cohort = demoCohort(NOW);
  assert.equal(cohortWeek(cohort.startDate, cohort.endDate, NOW), 1);
  assert.equal(cohort.pilotPlan, 'rising');
  // Five fictional founders; one asked for help in week 1.
  const dashboard = demoDashboard(INITIAL_PILOT_DEMO, NOW);
  assert.equal(dashboard.members.length, 5);
  assert.ok(dashboard.members.every((member) => member.email === null || member.email.endsWith('@example.com')));
  assert.equal(cohortKpis(dashboard.members, 1, NOW).needAttention, 1);
});

test('joining needs consent, and only then does the visitor appear', () => {
  assert.equal(demoMember(run({ type: 'join', at: AT })), null);
  const joined = run({ type: 'agree', agreed: true }, { type: 'join', at: AT });
  const you = demoMember(joined);
  assert.equal(you?.userId, DEMO_USER_ID);
  assert.equal(you?.name, DEMO_USER_NAME);
  assert.equal(you?.joinedAt, AT);
  const dashboard = demoDashboard(joined, NOW);
  assert.equal(dashboard.members.length, 6);
  assert.equal(dashboard.members[0].userId, DEMO_USER_ID);
  // A fresh joiner with no check-in yet isn't flagged in week 1.
  assert.deepEqual(attentionReasons(dashboard.members[0], 1, NOW), []);
});

test('nothing changes before joining, and ticking tasks counts after', () => {
  assert.deepEqual(run({ type: 'toggleTask', taskId: 'identity-icp-profile', done: true, at: AT }).doneTaskIds, []);
  const state = run(
    { type: 'agree', agreed: true },
    { type: 'join', at: AT },
    { type: 'toggleTask', taskId: 'identity-icp-profile', done: true, at: AT },
    { type: 'toggleTask', taskId: 'identity-top-pains', done: true, at: AT },
    { type: 'toggleTask', taskId: 'identity-top-pains', done: false, at: AT },
  );
  assert.deepEqual(demoMember(state)?.completedTaskIds, ['identity-icp-profile']);
  // A ticked task isn't a saved customer profile, so the stage stays at Identity.
  assert.equal(memberStage(demoMember(state)!.outcomes).label, 'Identity');
});

test('a check-in reaches the dashboard and its blocker and help request are flagged', () => {
  const state = run(
    { type: 'agree', agreed: true },
    { type: 'join', at: AT },
    { type: 'sendCheckin', at: AT, checkin: { wins: ['Three interviews'], blockers: ['No pricing data'], nextWeekGoals: ['Run a price test'], helpNeeded: 'An intro to a buyer' } },
  );
  const you = demoMember(state)!;
  assert.equal(you.checkins.length, 1);
  assert.equal(you.checkins[0].weekNumber, 1);
  assert.deepEqual(you.checkins[0].wins, ['Three interviews']);
  assert.deepEqual(attentionReasons(you, 1, NOW).map((reason) => reason.key), ['blocked', 'help']);
  assert.equal(cohortKpis(demoDashboard(state, NOW).members, 1, NOW).needAttention, 2);
  // The CSV a program exports includes the visitor's row.
  const csv = cohortCsv(demoDashboard(state, NOW), 1, NOW).split('\n');
  assert.equal(csv.length, 7);
  assert.match(csv[1], /^Sample founder,,/);
  assert.match(csv[1], /Reported a blocker; Asked for help/);
});

test('start over clears everything', () => {
  const state = run({ type: 'agree', agreed: true }, { type: 'join', at: AT }, { type: 'reset' });
  assert.deepEqual(state, INITIAL_PILOT_DEMO);
  assert.equal(demoDashboard(state, NOW).members.length, 5);
});
