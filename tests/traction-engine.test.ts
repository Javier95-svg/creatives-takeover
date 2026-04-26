import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTractionScore, type TractionScoreInput } from '../src/lib/tractionEngine.ts';

const baseInput = (overrides: Partial<TractionScoreInput> = {}): TractionScoreInput => ({
  currentWeekStart: '2026-04-20',
  previousLogDates: ['2026-04-13', '2026-04-06', '2026-03-30'],
  previousScores: [80, 82],
  experiments: [
    {
      channel: 'LinkedIn founder content',
      hypothesis: 'Posting a specific customer pain thread will generate qualified signup interest this week.',
      actionTaken: 'Published one detailed founder thread and replied to every relevant comment with a useful next step.',
      targetMetric: 'Signups',
      targetValue: 20,
      resultValue: 24,
      timeInvestedHours: 4,
      decision: 'double_down',
    },
  ],
  retention: {
    newUsers: 40,
    sevenDayActiveUsers: 22,
    thirtyDayActiveUsers: 14,
    primaryAcquisitionChannel: 'LinkedIn founder content',
    productCategory: 'saas',
    revenue: 1200,
  },
  ...overrides,
});

test('scores no-new-user weeks with zero retention health', () => {
  const result = calculateTractionScore(baseInput({
    retention: {
      newUsers: 0,
      sevenDayActiveUsers: 0,
      thirtyDayActiveUsers: 0,
      primaryAcquisitionChannel: 'Reddit',
      productCategory: 'saas',
    },
  }));

  assert.equal(result.retentionHealthScore, 0);
  assert.match(result.channelQualitySignal, /No acquisition quality signal/);
});

test('surfaces weak retention when distribution is strong', () => {
  const result = calculateTractionScore(baseInput({
    retention: {
      newUsers: 100,
      sevenDayActiveUsers: 10,
      thirtyDayActiveUsers: 2,
      primaryAcquisitionChannel: 'Product Hunt',
      productCategory: 'saas',
    },
  }));

  assert.ok(result.channelEfficiencyScore >= 65);
  assert.ok(result.retentionHealthScore < 45);
  assert.match(result.prioritizedRecommendation, /churn|targeting|audience/i);
});

test('surfaces weak consistency when retention is strong', () => {
  const result = calculateTractionScore(baseInput({
    previousLogDates: [],
    previousScores: [],
  }));

  assert.ok(result.retentionHealthScore >= 70);
  assert.ok(result.consistencyScore < 50);
  assert.match(result.prioritizedRecommendation, /distribution rhythm/i);
});

test('flags phase seven readiness after three consecutive strong scores', () => {
  const result = calculateTractionScore(baseInput({
    previousScores: [78, 81],
  }));

  assert.equal(result.phaseSevenReady, true);
  assert.ok(result.combinedScore >= 75);
});
