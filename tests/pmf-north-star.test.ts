import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPMFOutcomeStatus,
  normalizePMFDecision,
  qualifiesForFourteenDayPMFDecision,
} from '../src/lib/pmfNorthStar.ts';

test('five weighted signals are ready and 25 are verified', () => {
  assert.equal(getPMFOutcomeStatus(4), 'draft');
  assert.equal(getPMFOutcomeStatus(5), 'ready');
  assert.equal(getPMFOutcomeStatus(24), 'ready');
  assert.equal(getPMFOutcomeStatus(25), 'verified');
});

test('the North Star accepts only canonical decisions with ready evidence inside 14 days', () => {
  const base = {
    contextStartedAt: '2026-08-01T00:00:00.000Z',
    decisionReachedAt: '2026-08-14T23:59:59.000Z',
    decision: 'Build',
    outcomeStatus: 'ready' as const,
    weightedSignalCount: 5,
  };
  assert.equal(qualifiesForFourteenDayPMFDecision(base), true);
  assert.equal(qualifiesForFourteenDayPMFDecision({ ...base, decisionReachedAt: '2026-08-15T00:00:01.000Z' }), false);
  assert.equal(qualifiesForFourteenDayPMFDecision({ ...base, decision: 'wait' }), false);
  assert.equal(qualifiesForFourteenDayPMFDecision({ ...base, outcomeStatus: 'draft' }), false);
  assert.equal(normalizePMFDecision(' PIVOT '), 'pivot');
});
