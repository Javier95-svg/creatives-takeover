import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateSignupRate,
  canAddVsl,
  getLaunchPublishMissing,
  getNextVslLabel,
  normalizeLoomUrl,
} from '../src/lib/demoStudio/vsl.ts';

test('VSL variation limit allows only three recordings', () => {
  assert.equal(canAddVsl(0), true);
  assert.equal(canAddVsl(2), true);
  assert.equal(canAddVsl(3), false);
});

test('next VSL label fills A/B/C before custom labels', () => {
  assert.equal(getNextVslLabel([]), 'A');
  assert.equal(getNextVslLabel(['A']), 'B');
  assert.equal(getNextVslLabel(['A', 'C']), 'B');
  assert.equal(getNextVslLabel(['A', 'B', 'C']), 'V4');
});

test('Loom URL normalization stores share and embed URLs', () => {
  const parsed = normalizeLoomUrl('https://www.loom.com/share/abc123?sid=test');

  assert.equal(parsed.videoId, 'abc123');
  assert.equal(parsed.sharedUrl, 'https://www.loom.com/share/abc123');
  assert.equal(parsed.embedUrl, 'https://www.loom.com/embed/abc123');
});

test('launch publish missing reasons match the Demo Studio guarantee', () => {
  assert.deepEqual(getLaunchPublishMissing({ hasPublishedDemo: false, hasVsl: false }), [
    'Publish at least one interactive demo.',
    'Save at least one VSL variation.',
  ]);
  assert.deepEqual(getLaunchPublishMissing({ hasPublishedDemo: true, hasVsl: true }), []);
});

test('signup rate is percentage with one decimal place', () => {
  assert.equal(calculateSignupRate(3, 20), 15);
  assert.equal(calculateSignupRate(1, 6), 16.7);
  assert.equal(calculateSignupRate(1, 0), 0);
});
