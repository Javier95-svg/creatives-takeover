import test from 'node:test';
import assert from 'node:assert/strict';
import { getInsightaReadinessRoute } from '../src/lib/insightaReadinessRouting.ts';

test('readiness routes the highest-impact gap to an existing Insighta tool', () => {
  assert.equal(getInsightaReadinessRoute({ scores: { mvp: 7, feedback: 7, team: 6, runway: 6, traction: 2, competitive_positioning: 8 } }).key, 'traction_engine');
  assert.equal(getInsightaReadinessRoute({ scores: { mvp: 7, feedback: 7, team: 6, runway: 6, traction: 7, competitive_positioning: 2 } }).key, 'pitch_deck_analyzer');
  assert.equal(getInsightaReadinessRoute({ scores: {}, verdict: 'Ready', founderStage: 'scaling' }).key, 'vc_search');
  assert.equal(getInsightaReadinessRoute({ scores: {}, verdict: 'Ready', founderStage: 'validation' }).key, 'accelerator_hunt');
});
