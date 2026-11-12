import assert from 'node:assert/strict';
import test from 'node:test';

import { FOUNDER_PATH_STEPS, founderPathRows, furthestLabel, type FounderPath } from '../src/lib/founderPath.ts';

// The production baseline on 2026-11-11, before the founder pilot.
const baseline: FounderPath = {
  generatedAt: '2026-11-11T23:00:00Z',
  cohortId: null,
  since: null,
  accounts: 216,
  steps: [
    { step: 'icp', founders: 20 },
    { step: 'published', founders: 2 },
    { step: 'response', founders: 0 },
    { step: 'pmf_score', founders: 0 },
    { step: 'gtm_plan', founders: 0 },
    { step: 'play_active', founders: 0 },
    { step: 'proof_10', founders: 0 },
    { step: 'traction_week', founders: 0 },
  ],
  founders: [],
};

test('every step gets a row in path order, with its share of accounts', () => {
  const rows = founderPathRows(baseline);
  assert.deepEqual(rows.map((row) => row.key), FOUNDER_PATH_STEPS.map((step) => step.key));
  assert.equal(rows[0].ofAccounts, '20 of 216 (9%)');
  assert.equal(rows[2].founders, 0);
});

test('the pilot targets are 3 PMF scores and 1 First Customer Proof', () => {
  const rows = founderPathRows(baseline);
  const pmf = rows.find((row) => row.key === 'pmf_score')!;
  const proof = rows.find((row) => row.key === 'proof_10')!;
  assert.deepEqual([pmf.target, pmf.targetMet], [3, false]);
  assert.deepEqual([proof.target, proof.targetMet], [1, false]);
  assert.equal(rows.find((row) => row.key === 'icp')!.target, null);

  const met = founderPathRows({ ...baseline, steps: baseline.steps.map((s) => (s.step === 'pmf_score' ? { ...s, founders: 3 } : s)) });
  assert.equal(met.find((row) => row.key === 'pmf_score')!.targetMet, true);
});

test('a missing step reads as zero, and the furthest step has a label', () => {
  assert.equal(founderPathRows({ ...baseline, steps: [] })[7].founders, 0);
  assert.equal(furthestLabel(0), 'Not started');
  assert.equal(furthestLabel(4), 'PMF score');
  assert.equal(furthestLabel(8), 'Traction week logged');
});
