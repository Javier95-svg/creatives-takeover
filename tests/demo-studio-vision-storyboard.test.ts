import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildTryPreviewSteps,
  getUsableTryStoryboard,
  resolveScreenshotOrder,
  DEMO_STUDIO_TRY_HOTSPOT,
} from '../src/lib/demoStudio/tryPreview.ts';

const generator = readFileSync(
  new URL('../supabase/functions/demo-studio-generator/index.ts', import.meta.url),
  'utf8',
);
const tryPage = readFileSync(new URL('../src/pages/demo-studio/TryPage.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/lib/demoStudio/api.ts', import.meta.url), 'utf8');

const step = (over: Record<string, unknown> = {}) => ({
  title: 'T',
  caption: 'C',
  speaker_notes: 'N',
  hotspot_label: 'Go',
  suggested_action: 'next' as const,
  ...over,
});

const shots = [{ url: 'a' }, { url: 'b' }, { url: 'c' }];

/**
 * Captions used to be matched to screenshots by array position, so upload order
 * WAS narrative order and nothing verified that caption 3 described image 3.
 * That is how a caption reading "Advanced Analytics" ended up on a marketing
 * homepage.
 */
test('a step is paired with the screenshot it says it describes', () => {
  const storyboard = [
    step({ title: 'Problem', screenshot_index: 2 }),
    step({ title: 'Journey', screenshot_index: 0 }),
    step({ title: 'Outcome', screenshot_index: 1 }),
  ];
  const built = buildTryPreviewSteps({ shots, storyboard });

  assert.equal(built[0].asset_url, 'c');
  assert.equal(built[1].asset_url, 'a');
  assert.equal(built[2].asset_url, 'b');
});

/**
 * A partial mapping is worse than none: it silently moves some captions onto
 * the wrong screens while looking deliberate.
 */
test('an untrustworthy mapping falls back to upload order', () => {
  const duplicated = [
    step({ screenshot_index: 0 }),
    step({ screenshot_index: 0 }),
    step({ screenshot_index: 1 }),
  ];
  assert.equal(resolveScreenshotOrder(duplicated, 3), null);

  const partial = [step({ screenshot_index: 1 }), step(), step({ screenshot_index: 0 })];
  assert.equal(resolveScreenshotOrder(partial, 3), null);

  const outOfRange = [step({ screenshot_index: 9 }), step({ screenshot_index: 1 }), step({ screenshot_index: 2 })];
  assert.equal(resolveScreenshotOrder(outOfRange, 3), null);

  // ...and the builder degrades rather than shuffling.
  const built = buildTryPreviewSteps({ shots, storyboard: duplicated });
  assert.deepEqual(built.map((s) => s.asset_url), ['a', 'b', 'c']);
});

test('a complete permutation is accepted', () => {
  assert.deepEqual(
    resolveScreenshotOrder([step({ screenshot_index: 2 }), step({ screenshot_index: 0 }), step({ screenshot_index: 1 })], 3),
    [2, 0, 1],
  );
});

/**
 * One fixed rectangle on every step of every demo is not a hotspot, it is a
 * sticker. The model's coordinates are used when it found the element.
 */
test('hotspots use the model coordinates, falling back to the constant', () => {
  const withHotspot = buildTryPreviewSteps({
    shots,
    storyboard: [step({ hotspot: { x: 0.1, y: 0.2, w: 0.3, h: 0.1 } }), step(), step()],
  });
  assert.equal(withHotspot[0].hotspots[0].x, 0.1);
  assert.equal(withHotspot[1].hotspots[0].x, DEMO_STUDIO_TRY_HOTSPOT.x);
});

test('an off-frame or degenerate hotspot is rejected rather than clamped', () => {
  // A hotspot the model placed outside the image means it did not find the
  // element; a clamped guess pinned to an edge would look deliberate.
  const bad = buildTryPreviewSteps({
    shots,
    storyboard: [
      step({ hotspot: { x: 0.9, y: 0.2, w: 0.5, h: 0.1 } }),
      step({ hotspot: { x: 0.1, y: 0.1, w: 0, h: 0.1 } }),
      step({ hotspot: { x: -0.1, y: 0.1, w: 0.2, h: 0.1 } }),
    ],
  });
  for (const built of bad) {
    assert.equal(built.hotspots[0].x, DEMO_STUDIO_TRY_HOTSPOT.x);
  }
});

/**
 * buildTryFallbackStoryboard writes instructions TO a demo author. Swapped in
 * silently it reached founders as a description of their own product.
 */
test('substituted filler is marked so it cannot render as narration', () => {
  const generic = getUsableTryStoryboard([step({ title: 'Key feature', caption: 'See the product.' })], {
    productName: 'Formbricks',
    stepCount: 2,
  });
  assert.ok(generic.every((s) => s.isFallback), 'generic model copy must be replaced and marked');

  const real = getUsableTryStoryboard(
    [
      step({ title: 'Survey summary', caption: 'The response summary showing 475 displays and 274 starts.' }),
      step({ title: 'Editor', caption: 'The question editor with the rating block open.' }),
    ],
    { productName: 'Formbricks', stepCount: 2 },
  );
  assert.ok(real.every((s) => !s.isFallback), 'real copy must not be flagged');
});

test('the try page renders a gap instead of the filler text', () => {
  assert.match(tryPage, /fallbackPositions/);
  assert.match(tryPage, /couldn't read this screen/);
});

/* -------------------------------------------------------------------------- */
/* The generator side                                                          */
/* -------------------------------------------------------------------------- */

test('screenshots are sent to the model, bounded and validated', () => {
  assert.match(generator, /image_url/, 'the draft path must attach the screens');
  assert.match(generator, /detail: "high"/, 'UI labels are unreadable at low detail');
  assert.match(generator, /MAX_VISION_SCREENSHOTS/);
  assert.match(generator, /MAX_SCREENSHOT_BYTES/);
  // Only the anonymous draft path, and only for storyboards.
  assert.match(generator, /body\.draft !== true\) return \[\]/);
});

test('the prompt asks for the mapping, the pointer and what it saw', () => {
  assert.match(generator, /screenshot_index/);
  assert.match(generator, /screen_summary/);
  assert.match(generator, /Omit "hotspot" entirely/, 'guessing a position is worse than none');
  assert.match(generator, /marketing or landing page/, 'a landing page is not the payoff step');
});

/**
 * Without a real audience the generator receives getDefaultBrief() boilerplate
 * and writes a narrative that could describe any SaaS.
 */
test('the demo is aimed at a buyer, from the ICP or asked inline', () => {
  assert.match(api, /\.\.\.getDefaultBrief\(\{ name \}\), \.\.\.supplied/);
  assert.match(tryPage, /setIcpBrief\(mapped\.patch\)/, 'the ICP brief must not be reduced to one sentence');
  assert.match(tryPage, /missing_audience/);
  assert.match(tryPage, /missing_problem/);
});

test('a reorder is disclosed rather than silent', () => {
  assert.match(tryPage, /setReordered/);
  assert.match(tryPage, /We arranged your screens into a story order/);
});
