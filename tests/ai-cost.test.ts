import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateAiCostUsd, getModelPrice } from '../supabase/functions/_shared/ai-cost.ts';

test('estimateAiCostUsd prices known models from token usage', () => {
  // Sonnet: $3/Mtok in, $15/Mtok out
  assert.equal(estimateAiCostUsd('claude-sonnet-4-6', 1_000_000, 1_000_000), 18);
  // Haiku: $1/Mtok in, $5/Mtok out
  assert.equal(estimateAiCostUsd('claude-haiku-4-5-20251001', 1_000_000, 1_000_000), 6);
  // Opus on small usage
  assert.ok(Math.abs(estimateAiCostUsd('claude-opus-4-8', 1000, 1000) - 0.09) < 1e-9);
});

test('estimateAiCostUsd defaults unknown models to Sonnet-class (never understates)', () => {
  assert.deepEqual(getModelPrice('some-future-model'), getModelPrice('claude-sonnet-4-6'));
  assert.equal(estimateAiCostUsd('some-future-model', 1_000_000, 0), 3);
});

test('estimateAiCostUsd is zero / safe for empty or invalid usage', () => {
  assert.equal(estimateAiCostUsd('claude-sonnet-4-6', 0, 0), 0);
  assert.equal(estimateAiCostUsd('claude-sonnet-4-6', -5, NaN), 0);
});
