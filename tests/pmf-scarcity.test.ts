import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  applyScarcityGate,
  assessAlternativeScarcity,
  describeScarcityGate,
  HARD_TO_REPLACE_REQUIRED,
} from '../supabase/functions/_shared/pmf-scarcity.ts';

/**
 * PMF Lab will not say "Build" when buyers can easily get the same thing
 * elsewhere. Wanting it is half of value; the other half is not being able to
 * get it easily from an alternative, including doing it yourself or nothing.
 */

const interview = (alternativeEase: string | null, currentAlternative = '') => ({ alternativeEase, currentAlternative });

test('twenty-five keen buyers who all name an easy alternative do not get "Build"', () => {
  const interviews = Array.from({ length: 25 }, () => interview('easy', 'Google Sheets'));
  const check = assessAlternativeScarcity(interviews);
  assert.equal(check.passed, false);
  assert.equal(check.easyToReplace, 25);
  assert.deepEqual(check.easyAlternatives, ['Google Sheets']);
  assert.equal(applyScarcityGate('build', check), 'narrow');
  assert.match(describeScarcityGate(check), /Only 0 of 25 .*Google Sheets/);
});

test(`"Build" stands once ${HARD_TO_REPLACE_REQUIRED} buyers could not easily get it elsewhere`, () => {
  const check = assessAlternativeScarcity([
    interview('hard', 'A paid carer'), interview('none'), interview('hard', 'Agency'), interview('easy', 'Excel'),
  ]);
  assert.equal(check.hardToReplace, 3);
  assert.equal(check.passed, true);
  assert.equal(applyScarcityGate('build', check), 'build');
});

test('without recorded alternatives the gate holds "Build" and says why', () => {
  const check = assessAlternativeScarcity([interview(null), interview(null)]);
  assert.equal(check.recorded, 0);
  assert.equal(applyScarcityGate('build', check), 'narrow');
  assert.match(describeScarcityGate(check), /No interview records what people would use instead/);
});

test('the gate never changes Narrow, Pivot or Stop', () => {
  const failing = assessAlternativeScarcity([]);
  for (const decision of ['narrow', 'pivot', 'stop'] as const) {
    assert.equal(applyScarcityGate(decision, failing), decision);
  }
});

test('unknown ease values are not counted, and easy alternatives are ranked by how often they come up', () => {
  const check = assessAlternativeScarcity([
    interview('trivial', 'x'), interview('easy', 'Notion'), interview('easy', 'Excel'), interview('easy', 'excel'),
  ]);
  assert.equal(check.recorded, 3);
  assert.deepEqual(check.easyAlternatives, ['Excel', 'Notion']);
});

test('the scorer applies the gate and saving falls back when the columns are missing', () => {
  const scorer = readFileSync('supabase/functions/pmf-evidence-scorer/index.ts', 'utf8');
  assert.match(scorer, /analysis\.decision = applyScarcityGate\(scoreDecision, scarcityCheck\)/);
  assert.match(scorer, /currentAlternative: row\.current_alternative/);
  const hook = readFileSync('src/hooks/usePMFInterviews.ts', 'utf8');
  assert.match(hook, /isMissingAlternativeColumn\(error\)/);
  const migration = readFileSync('supabase/migrations/20261122100000_value_alternatives_and_value_tested.sql', 'utf8');
  assert.match(migration, /ADD COLUMN IF NOT EXISTS current_alternative text/);
  assert.match(migration, /alternative_ease IN \('easy', 'some_effort', 'hard', 'none'\)/);
});
