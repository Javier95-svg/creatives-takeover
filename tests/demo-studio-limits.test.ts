import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canPublishDemo,
  canRemoveWatermark,
  getPublishedDemoCap,
  shouldShowWatermark,
} from '../src/lib/demoStudio/plan.ts';

test('rookie can never remove the watermark, even if the demo opted out', () => {
  assert.equal(shouldShowWatermark(false, 'rookie'), true);
  assert.equal(shouldShowWatermark(true, 'rookie'), true);
  assert.equal(canRemoveWatermark('rookie'), false);
});

test('a missing/unknown owner plan is treated as rookie (watermark on)', () => {
  assert.equal(shouldShowWatermark(false, undefined), true);
  assert.equal(shouldShowWatermark(undefined, undefined), true);
  assert.equal(shouldShowWatermark(false, null), true);
});

test('paid tiers honor the demo watermark preference', () => {
  assert.equal(shouldShowWatermark(false, 'pro'), false);
  assert.equal(shouldShowWatermark(undefined, 'pro'), true);
  assert.equal(shouldShowWatermark(false, 'starter'), false);
  assert.equal(canRemoveWatermark('pro'), true);
});

test('published-demo cap is 3 for rookie and uncapped for paid tiers', () => {
  assert.equal(getPublishedDemoCap('rookie'), 3);
  assert.equal(getPublishedDemoCap('starter'), Infinity);
  assert.equal(getPublishedDemoCap('rising'), Infinity);
  assert.equal(getPublishedDemoCap('pro'), Infinity);
  // Unknown plan falls back to rookie's cap.
  assert.equal(getPublishedDemoCap(undefined), 3);
});

test('canPublishDemo enforces the rookie ceiling but not paid tiers', () => {
  assert.equal(canPublishDemo('rookie', 0), true);
  assert.equal(canPublishDemo('rookie', 2), true);
  assert.equal(canPublishDemo('rookie', 3), false);
  assert.equal(canPublishDemo('rookie', 4), false);
  assert.equal(canPublishDemo('pro', 999), true);
  assert.equal(canPublishDemo('starter', 50), true);
});
