import assert from 'node:assert/strict';
import test from 'node:test';

import { scoreMentorForFounderStage } from '../src/lib/mentorStageScoring.ts';

test('Stage 7 boosts fundraising, finance, and strategy mentors', () => {
  const score = scoreMentorForFounderStage({ expertise: ['Fundraising', 'Finance'] }, 7);

  assert.equal(score.stageScore, 36);
  assert.deepEqual(score.matchedStageExpertise, ['Fundraising', 'Finance']);
});

test('Stage 6 boosts growth, sales, and operations mentors', () => {
  const score = scoreMentorForFounderStage({ expertise: ['Growth Marketing', 'Operations'] }, 6);

  assert.equal(score.stageScore, 36);
  assert.deepEqual(score.matchedStageExpertise, ['Growth Marketing', 'Operations']);
});

test('unrelated expertise does not receive a generic stage boost', () => {
  const score = scoreMentorForFounderStage({ expertise: ['Legal'] }, 6);

  assert.equal(score.stageScore, 0);
  assert.deepEqual(score.matchedStageExpertise, []);
});
