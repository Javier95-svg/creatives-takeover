import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  calculateTractionScore,
  getCohortRate,
  getDefaultCohortWeek,
  getRetentionWindowStatus,
  scoreRetention,
  type TractionRetentionInput,
  type TractionScoreInput,
} from '../src/lib/tractionEngine.ts';
import { getTractionNextStep } from '../src/lib/tractionNextStep.ts';

const retention = (overrides: Partial<TractionRetentionInput> = {}): TractionRetentionInput => ({
  newUsers: 40,
  sevenDayActiveUsers: 12,
  thirtyDayActiveUsers: 6,
  primaryAcquisitionChannel: 'LinkedIn posts',
  productCategory: 'saas',
  ...overrides,
});

test('cohort retention is the share of the starting group that came back, never above 100%', () => {
  assert.equal(getCohortRate(retention(), 'sevenDay'), 0.3);
  assert.equal(getCohortRate(retention({ sevenDayActiveUsers: 90 }), 'sevenDay'), 1);
  assert.equal(getCohortRate(retention({ newUsers: 0 }), 'sevenDay'), null);
});

test('an open window is left out instead of counting as zero', () => {
  const pending = retention({ thirtyDayActiveUsers: 0, thirtyDayStatus: 'pending' });
  assert.equal(getCohortRate(pending, 'thirtyDay'), null);
  // With the 30-day window open, the 7-day result alone carries the score.
  assert.equal(scoreRetention(pending), scoreRetention(retention({ thirtyDayActiveUsers: 0, thirtyDayStatus: 'pending', sevenDayStatus: 'complete' })));
  assert.ok(scoreRetention(pending) > 0);
  assert.equal(scoreRetention(retention({ sevenDayStatus: 'pending', thirtyDayStatus: 'pending' })), 0);
});

test('window status follows the cohort week plus the window length', () => {
  const cohort = '2026-09-07';
  assert.equal(getRetentionWindowStatus(cohort, 7, new Date('2026-09-20T00:00:00Z')), 'pending');
  assert.equal(getRetentionWindowStatus(cohort, 7, new Date('2026-09-21T00:00:00Z')), 'complete');
  assert.equal(getRetentionWindowStatus(cohort, 30, new Date('2026-10-13T00:00:00Z')), 'pending');
  assert.equal(getRetentionWindowStatus(cohort, 30, new Date('2026-10-14T00:00:00Z')), 'complete');
  assert.equal(getRetentionWindowStatus('not a date', 7), 'pending');
  assert.equal(getDefaultCohortWeek('2026-10-05'), '2026-08-31');
});

test('the decision recommendation uses people reached, not the result', () => {
  const input = (sampleSize: number): TractionScoreInput => ({
    currentWeekStart: '2026-10-05',
    previousLogDates: [],
    previousScores: [],
    retention: retention(),
    experiments: [{
      channel: 'LinkedIn posts',
      hypothesis: 'h',
      actionTaken: 'a',
      targetMetric: 'Signups',
      targetValue: 5,
      resultValue: 50,
      timeInvestedHours: 1,
      decision: 'iterate',
      sampleSize,
    }],
  });
  // A big result from nobody reached is not evidence: the old code passed the result as the sample.
  assert.equal(calculateTractionScore(input(0)).recommendedDecisions[0], 'iterate');
});

test('the next step names the stop rule first, then first-time, then a logged week', () => {
  assert.equal(getTractionNextStep({ isFirstTime: true, savedThisWeek: false, triggeredChannel: 'Cold email' })?.action, 'review');
  assert.equal(getTractionNextStep({ isFirstTime: true, savedThisWeek: false, triggeredChannel: null })?.action, 'start');
  assert.equal(getTractionNextStep({ isFirstTime: false, savedThisWeek: true, triggeredChannel: null })?.action, 'history');
  assert.equal(getTractionNextStep({ isFirstTime: false, savedThisWeek: false, triggeredChannel: null }), null);
});

test('a week is saved in one transaction, with the old path only as a fallback', () => {
  const page = readFileSync(new URL('../src/pages/TractionEnginePage.tsx', import.meta.url), 'utf8');
  const sql = readFileSync(new URL('../supabase/migrations/20261004120000_traction_save_week.sql', import.meta.url), 'utf8');
  assert.match(page, /supabase\.rpc\('save_traction_week'/);
  assert.match(page, /if \(!isMissingFunction\(error\)\) throw error/);
  assert.match(page, /if \(deleteError\) throw deleteError;/);
  assert.match(sql, /SECURITY INVOKER/);
  assert.match(sql, /ON CONFLICT \(user_id, week_start_date\) DO UPDATE/);
  assert.match(sql, /sprint\.user_id = v_user_id/);
});
