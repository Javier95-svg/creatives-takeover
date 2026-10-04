import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { buildQuickLogPayload, readinessForQuickLog } from '../src/lib/gtmQuickLog.ts';
import { weeklyResultsFromExperiments } from '../src/lib/gtmProgress.ts';
import { icpCoversGtmMarket } from '../src/lib/icpToGtmIntake.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const base = {
  weekStart: '2026-10-05',
  sprintId: 'sprint-1',
  channel: 'LinkedIn direct messages',
  hypothesis: '20 messages get 4 replies',
  metric: 'Replies',
  target: 4,
  minimumSampleSize: 20,
  previousLogs: [{ week_start_date: '2026-09-28', combined_score: 40 }],
};

test('the quick log stores the same week shape as Traction Engine', () => {
  const payload = buildQuickLogPayload({ ...base, reached: 25, result: 6, hours: 3 });
  assert.equal(payload.readiness.result, 'passed');
  assert.equal(payload.decision, payload.readiness.recommendedDecision);
  assert.equal(payload.logPayload.week_start_date, '2026-10-05');
  assert.equal(payload.logPayload.verification_mode, 'founder_reported');
  assert.equal(payload.logPayload.calculation_version, 2);
  const [row] = payload.experimentRows;
  assert.equal(row.sprint_id, 'sprint-1');
  assert.equal(row.result_value, 6);
  assert.equal(row.sample_size, 25);
  assert.equal(row.target_value, 4);
  assert.equal(row.override_rationale, null);
  // Retention is not asked here, so it is left out instead of scored as zero.
  assert.deepEqual((payload.logPayload.score_breakdown as { retention: unknown }).retention, { method: 'cohort', sevenDayStatus: 'pending', thirtyDayStatus: 'pending' });
});

test('too few people reached is too early to call, whatever the result', () => {
  assert.equal(readinessForQuickLog({ target: 4, result: 9, minimumSampleSize: 20, reached: 5 }).result, 'inconclusive');
  assert.equal(readinessForQuickLog({ target: 4, result: 1, minimumSampleSize: 20, reached: 30 }).result, 'failed');
  // A founder who overrides the suggestion keeps their reason.
  const overridden = buildQuickLogPayload({ ...base, reached: 30, result: 1, hours: 2, decision: 'double_down', rationale: 'Replies came late' });
  assert.equal(overridden.experimentRows[0].decision, 'double_down');
  assert.equal(overridden.experimentRows[0].override_rationale, 'Replies came late');
});

test('the six-week strip groups results by plan week from activation', () => {
  const weeks = weeklyResultsFromExperiments([
    { result_value: 2, target_value: 4, created_at: '2026-09-02T10:00:00Z' },
    { result_value: 5, target_value: 4, created_at: '2026-09-10T10:00:00Z' },
    { result_value: 6, target_value: 4, created_at: '2026-09-12T10:00:00Z' },
    { result_value: 9, target_value: 4, created_at: '2026-08-20T10:00:00Z' },
  ], '2026-09-01T00:00:00Z');
  assert.equal(weeks.length, 6);
  assert.deepEqual(weeks[0], { week: 1, result: 2, target: 4, hit: false });
  // The latest log in a week wins.
  assert.deepEqual(weeks[1], { week: 2, result: 6, target: 4, hit: true });
  assert.equal(weeks[2].result, null);
});

test('the quick log never overwrites a week already logged', () => {
  const quickLog = read('src/components/gtm/GTMQuickLog.tsx');
  const existingCheck = quickLog.indexOf(".eq('week_start_date', weekStart)");
  const save = quickLog.indexOf("rpc('save_traction_week'");
  assert.ok(existingCheck > 0 && save > existingCheck, 'checks the week before saving');
  assert.match(quickLog, /if \(existing\) \{\s*setAlreadyLogged\(true\);\s*return;/);
  assert.match(quickLog, /Edit it there/);
});

test('with an ICP, the GTM intake is one details step and a confirm', () => {
  assert.equal(icpCoversGtmMarket({ targetSegment: 'Owners of small fleets', problem: 'Fuel receipts take a day', solution: 'Sorts receipts by truck', buyingTrigger: 'A tax deadline' }), true);
  assert.equal(icpCoversGtmMarket({ targetSegment: 'Owners of small fleets', problem: 'Fuel receipts take a day' }), false);
  const intake = read('src/components/gtm/GTMWorkspaceIntake.tsx');
  assert.match(intake, /icpCoversGtmMarket\(effectivePrefill\)/);
  assert.match(intake, /\['details', 'confirm'\]/);
  assert.match(intake, /Check customer and problem/);
  const workspace = read('src/components/gtm/GTMWorkspace.tsx');
  assert.match(workspace, /quickLogRef\.current\?\.scrollIntoView/);
});
