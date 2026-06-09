import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_DEMO_STUDIO_CTA,
  getBriefCompleteness,
  normalizeAiKit,
  normalizeProjectSlug,
} from '../src/lib/demoStudio/brief.ts';
import { getDemoReadiness, getLaunchReadiness, getVslReadiness } from '../src/lib/demoStudio/readiness.ts';

test('brief completeness requires the production v2 source-of-truth fields', () => {
  assert.deepEqual(getBriefCompleteness(null).missing, [
    'Audience',
    'Problem',
    'Product promise',
    'Aha moment',
    'CTA',
  ]);

  assert.equal(getBriefCompleteness({
    audience: 'B2B founders',
    problem: 'They cannot show the product clearly.',
    product_promise: 'Create a proof page in an afternoon.',
    aha_moment: 'They can click through the product.',
    primary_cta_label: DEFAULT_DEMO_STUDIO_CTA,
  }).complete, true);
});

test('AI kit normalization caps storyboard, scripts, and launch copy into safe shapes', () => {
  const kit = normalizeAiKit({
    storyboard: Array.from({ length: 9 }, (_, index) => ({
      title: `Step ${index + 1}`,
      caption: 'Show one concrete product moment.',
      speaker_notes: 'Say why this matters.',
      hotspot_label: 'Next',
      suggested_action: 'next',
    })),
    vsl_scripts: [
      { variation: 'A', title: 'Pain hook', hook: 'Open on pain.', outline: ['Pain', 'Demo', 'CTA'], script: 'Script A', target_duration_seconds: 75 },
      { variation: 'B', title: 'Aha hook', hook: 'Open on aha.', outline: ['Aha', 'Demo', 'CTA'], script: 'Script B', target_duration_seconds: 75 },
      { variation: 'C', title: 'Proof hook', hook: 'Open on proof.', outline: ['Proof', 'Demo', 'CTA'], script: 'Script C', target_duration_seconds: 75 },
      { variation: 'D', title: 'Extra', hook: 'Extra.', outline: ['One', 'Two', 'Three'], script: 'Extra', target_duration_seconds: 75 },
    ],
    launch_copy: {
      headlines: [
        { headline: 'Show The Product Clearly', subheadline: 'A proof page for founders.', rationale: 'Clear.' },
      ],
      subheadline: 'A proof page for founders.',
      cta_label: 'Get early access',
      proof_bullets: ['Interactive demo', 'Founder pitch', 'Signup capture'],
    },
  });

  assert.equal(kit.storyboard?.length, 7);
  assert.equal(kit.vsl_scripts?.length, 3);
  assert.equal(kit.launch_copy?.cta_label, DEFAULT_DEMO_STUDIO_CTA);
});

test('demo readiness scores screenshot, caption, hotspot, notes, and CTA gaps', () => {
  const readiness = getDemoReadiness([
    {
      id: 'step-1',
      demo_id: 'demo-1',
      position: 0,
      asset_url: 'https://example.com/1.png',
      asset_width: 100,
      asset_height: 100,
      title: 'Create project',
      caption: 'Start the setup.',
      speaker_notes: 'Explain the setup.',
      created_at: '',
      hotspots: [{ id: 'hotspot-1', step_id: 'step-1', x: 0, y: 0, w: 0.1, h: 0.1, type: 'hotspot', label: 'Next', action: 'next', action_target: null, created_at: '' }],
    },
  ], {});

  assert.equal(readiness.ready, false);
  assert.match(readiness.missing.join(' '), /at least 3/);
  assert.match(readiness.missing.join(' '), /CTA/);
});

test('VSL readiness requires script, hook, recording, and primary state', () => {
  assert.equal(getVslReadiness(null).ready, false);
  const readiness = getVslReadiness({
    id: 'vsl-1',
    project_id: 'project-1',
    owner_id: 'owner-1',
    variation_label: 'A',
    title: 'Founder pitch',
    hook: 'Open on the pain.',
    loom_video_id: 'loom',
    loom_shared_url: 'https://www.loom.com/share/abc',
    loom_embed_url: 'https://www.loom.com/embed/abc',
    video_url: null,
    thumbnail_url: null,
    duration_seconds: null,
    script: 'Here is the script.',
    script_outline: ['Pain', 'Demo', 'CTA'],
    target_duration_seconds: 75,
    is_primary: true,
    created_at: '',
  });
  assert.equal(readiness.ready, true);
});

test('launch readiness and slug normalization match production v2 public page rules', () => {
  assert.equal(normalizeProjectSlug('  My Great Product!!!  '), 'my-great-product');
  assert.deepEqual(getLaunchReadiness({
    project: null,
    launchPage: null,
    hasPublishedDemo: false,
    hasVsl: false,
  }).missing, [
    'Publish at least one interactive demo.',
    'Save at least one VSL variation.',
    'Add a launch page headline.',
    'Add a launch page subheadline.',
    'Set the launch page CTA.',
    'Set a public slug.',
  ]);
});
