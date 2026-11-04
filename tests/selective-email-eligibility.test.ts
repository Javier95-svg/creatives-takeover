import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibleStage, hasStageGuidanceConsent, STAGE_KEYS, STAGE_TOPICS, STAGE_SUBJECTS } from '../supabase/functions/_shared/selective-email-eligibility.ts';

test('only founders and builders with a confirmed stage qualify', () => {
  for (const type of ['founder', 'builder']) {
    for (let stage = 1; stage <= 7; stage++) {
      assert.equal(eligibleStage(type, stage), stage);
      assert.ok(STAGE_KEYS[stage - 1]);
      assert.ok(STAGE_TOPICS[stage - 1]);
      assert.ok(STAGE_SUBJECTS[stage - 1]);
    }
  }
  for (const type of ['mentor', 'marketplace', 'investor']) {
    for (let stage = 1; stage <= 7; stage++) {
      assert.equal(eligibleStage(type, stage), null);
    }
  }
  for (const stage of [null, 0, 8, 2.5]) {
    assert.equal(eligibleStage('founder', stage), null);
    assert.equal(eligibleStage('builder', stage), null);
  }
});

test('a default-on legacy flag is not stage guidance consent', () => {
  assert.equal(hasStageGuidanceConsent(false, null), false);
  assert.equal(hasStageGuidanceConsent(true, null), false);
  assert.equal(hasStageGuidanceConsent(false, new Date().toISOString()), false);
  assert.equal(hasStageGuidanceConsent(true, 'not-a-date'), false);
  assert.equal(hasStageGuidanceConsent(true, new Date().toISOString()), true);
});
