import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTryFallbackStoryboard,
  buildTryPreviewSteps,
  deriveTryProductName,
  getUsableTryStoryboard,
  normalizeTryStepCount,
} from '../src/lib/demoStudio/tryPreview.ts';

test('try preview normalizes the visitor screenshot count to 2 or 3 steps', () => {
  assert.equal(normalizeTryStepCount(undefined), 2);
  assert.equal(normalizeTryStepCount(2), 2);
  assert.equal(normalizeTryStepCount(3), 3);
  assert.equal(normalizeTryStepCount(99), 3);
});

test('try preview fallback creates an exact 2 or 3 step storyboard', () => {
  const twoStep = buildTryFallbackStoryboard({ contextUrl: 'https://example-product.com', stepCount: 2 });
  const threeStep = buildTryFallbackStoryboard({ productName: 'Acme CRM', stepCount: 3 });

  assert.equal(twoStep.length, 2);
  assert.equal(threeStep.length, 3);
  assert.match(twoStep[0].title, /Example product/i);
  assert.equal(threeStep.every((step) => step.title && step.caption && step.hotspot_label), true);
});

test('try preview repairs short or invalid storyboard output before rendering', () => {
  const usable = getUsableTryStoryboard(
    [
      { title: 'Open dashboard', caption: 'Show the main dashboard.', speaker_notes: '', hotspot_label: '', suggested_action: 'next' },
      { title: '', caption: 'Invalid because title is missing.', speaker_notes: '', hotspot_label: '', suggested_action: 'next' },
    ],
    { productName: 'DemoPilot', stepCount: 3 },
  );

  assert.equal(usable.length, 3);
  assert.equal(usable[0].title, 'Open dashboard');
  assert.equal(usable[0].hotspot_label, 'Continue');
  assert.equal(usable[1].title.length > 0, true);
  assert.equal(usable[2].caption.length > 0, true);
});

test('try preview pairs storyboard steps only with uploaded screenshots', () => {
  const storyboard = getUsableTryStoryboard([], { productName: 'Acme', stepCount: 3 });
  const steps = buildTryPreviewSteps({
    shots: [{ url: 'blob:one' }, { url: 'blob:two' }],
    storyboard,
    createdAt: '2026-06-29T00:00:00.000Z',
  });

  assert.equal(steps.length, 2);
  assert.equal(steps[0].asset_url, 'blob:one');
  assert.equal(steps[1].asset_url, 'blob:two');
  assert.equal(steps.every((step) => step.asset_type === 'image'), true);
  assert.equal(steps.every((step) => step.hotspots.length === 1), true);
});

test('try preview derives a readable product name from URL context', () => {
  assert.equal(deriveTryProductName('https://www.my-demo-tool.com/path'), 'My demo tool');
  assert.equal(deriveTryProductName('', 'Uploaded screen'), 'Uploaded screen');
});
