import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasMeasuredActivity,
  isPlatformMeasured,
  isWeekStart,
  parseWeeklySignals,
} from '../src/lib/tractionSignals.ts';

const row = {
  cohort_new_visitors: 22, cohort_back_7d: 3, cohort_back_30d: 5, total_visitors: 207,
  signups: 2, survey_responses: 1, pipeline_qualified: 0, pipeline_customers: 0,
};

test('a database row becomes measured signals, with bad values read as zero', () => {
  const signals = parseWeeklySignals(row, '2026-07-13');
  assert.equal(signals?.cohortNewVisitors, 22);
  assert.equal(signals?.cohortBack30d, 5);
  assert.equal(signals?.signups, 2);
  assert.equal(parseWeeklySignals({ cohort_new_visitors: -4, signups: 'x' }, '2026-07-13')?.cohortNewVisitors, 0);
  assert.equal(parseWeeklySignals(null, '2026-07-13'), null);
});

test('the measured block only shows when something was measured', () => {
  assert.equal(hasMeasuredActivity(null), false);
  assert.equal(hasMeasuredActivity(parseWeeklySignals({}, '2026-07-13')), false);
  assert.equal(hasMeasuredActivity(parseWeeklySignals({ survey_responses: 1 }, '2026-07-13')), true);
});

test('a week is platform-measured only while the applied numbers are unchanged', () => {
  const applied = { weekStart: '2026-07-13', newUsers: 22, sevenDayActiveUsers: 3, thirtyDayActiveUsers: 5 };
  const retention = { cohortWeekStart: '2026-07-13', newUsers: 22, sevenDayActiveUsers: 3, thirtyDayActiveUsers: 5 };
  assert.equal(isPlatformMeasured(retention, applied), true);
  assert.equal(isPlatformMeasured({ ...retention, sevenDayActiveUsers: 4 }, applied), false);
  assert.equal(isPlatformMeasured({ ...retention, cohortWeekStart: '2026-07-20' }, applied), false);
  assert.equal(isPlatformMeasured(retention, null), false);
  assert.equal(isPlatformMeasured({ ...retention, newUsers: 0 }, { ...applied, newUsers: 0 }), false);
});

test('only ISO dates are sent as the week', () => {
  assert.equal(isWeekStart('2026-07-13'), true);
  assert.equal(isWeekStart(''), false);
  assert.equal(isWeekStart('13/07/2026'), false);
});
