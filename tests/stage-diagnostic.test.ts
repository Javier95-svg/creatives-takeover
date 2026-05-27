import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assignFounderStageV3,
  mapFounderStageToBizMapStage,
  mapFounderStageToBusinessStage,
  type FounderStageQuizAnswersV3,
} from '../src/lib/stageDiagnostic.ts';
import { STAGE_TASKS } from '../src/lib/bizmapStages.ts';

function answers(overrides: Partial<FounderStageQuizAnswersV3>): FounderStageQuizAnswersV3 {
  return {
    productStatus: 'idea_only',
    customerTesting: 'no_one',
    mainFocus: 'shape_idea',
    tractionSignal: 'none',
    blocker: 'customer_clarity',
    fundraisingStatus: 'not_now',
    ...overrides,
  };
}

test('idea only with no customer conversations assigns Ideation', () => {
  const result = assignFounderStageV3(answers({}));
  assert.equal(result.assignedStage, 1);
  assert.equal(mapFounderStageToBusinessStage(result.assignedStage), 'idea');
  assert.equal(mapFounderStageToBizMapStage(result.assignedStage), 'IDENTITY');
});

test('prototype and early testing assigns Prototyping', () => {
  const result = assignFounderStageV3(answers({
    productStatus: 'prototype_demo',
    customerTesting: 'friends_family',
    mainFocus: 'prototype',
    blocker: 'demand_validation',
  }));
  assert.equal(result.assignedStage, 2);
});

test('target-customer testing and demand uncertainty assigns Validating', () => {
  const result = assignFounderStageV3(answers({
    productStatus: 'prototype_demo',
    customerTesting: 'target_customers',
    mainFocus: 'validate_demand',
    tractionSignal: 'waitlist_interest',
    blocker: 'demand_validation',
  }));
  assert.equal(result.assignedStage, 3);
});

test('MVP beta with product build focus assigns Building', () => {
  const result = assignFounderStageV3(answers({
    productStatus: 'mvp_beta',
    customerTesting: 'target_customers',
    mainFocus: 'build_product',
    tractionSignal: 'active_users',
    blocker: 'product_build',
  }));
  assert.equal(result.assignedStage, 4);
});

test('live product with go-to-market focus assigns Launching', () => {
  const result = assignFounderStageV3(answers({
    productStatus: 'live_product',
    customerTesting: 'target_customers',
    mainFocus: 'launch_market',
    tractionSignal: 'active_users',
    blocker: 'go_to_market',
  }));
  assert.equal(result.assignedStage, 5);
});

test('repeatable growth and revenue assigns Traction', () => {
  const result = assignFounderStageV3(answers({
    productStatus: 'scaling_product',
    customerTesting: 'repeat_customers',
    mainFocus: 'grow_channels',
    tractionSignal: 'repeatable_growth',
    blocker: 'traction_growth',
  }));
  assert.equal(result.assignedStage, 6);
  assert.ok(STAGE_TASKS.TRACTION.some((task) => task.id === 'traction-growth-experiment'));
});

test('active investor conversations with traction assigns Fundraising', () => {
  const result = assignFounderStageV3(answers({
    productStatus: 'scaling_product',
    customerTesting: 'paying_customers',
    mainFocus: 'raise_capital',
    tractionSignal: 'revenue',
    blocker: 'fundraising',
    fundraisingStatus: 'talking_investors',
  }));
  assert.equal(result.assignedStage, 7);
  assert.ok(STAGE_TASKS.FUNDRAISING.some((task) => task.id === 'fundraising-investor-list'));
});

test('fundraising interest without product or market evidence does not automatically assign Fundraising', () => {
  const result = assignFounderStageV3(answers({
    mainFocus: 'raise_capital',
    blocker: 'fundraising',
    fundraisingStatus: 'preparing',
  }));
  assert.notEqual(result.assignedStage, 7);
  assert.ok(result.conflictFlags.includes('fundraising_intent_without_market_evidence'));
  assert.ok(result.confidence < 70);
});

test('every diagnostic answer contributes to scoring payload shape', () => {
  const result = assignFounderStageV3(answers({
    productStatus: 'live_product',
    customerTesting: 'paying_customers',
    mainFocus: 'launch_market',
    tractionSignal: 'revenue',
    blocker: 'go_to_market',
    fundraisingStatus: 'preparing',
  }));

  assert.equal(Object.keys(result.stageScores).length, 7);
  assert.ok(Object.values(result.stageScores).some((score) => score > 0));
  assert.ok(result.primarySignals.length >= 4);
});
