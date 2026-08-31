import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/BuildPage.tsx', import.meta.url), 'utf8');

test('Build page removes fabricated social proof', () => {
  for (const unsupportedClaim of [
    'Who&rsquo;s Next?',
    '1,000+ founders',
    '4.8/5',
    'Featured in the founder feeds you actually read',
    'Jordan Rivera',
    'Maya Karlsson',
    'Sam Lin',
    'Priya Nair',
    'Tomas Vega',
    'Aisha Bello',
  ]) {
    assert.doesNotMatch(source, new RegExp(unsupportedClaim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('Build page presents evidence-backed positioning with honest product proof', () => {
  for (const capability of [
    'ICP + PMF context',
    'Evidence-scoped MVP',
    'Real code you control',
    'Your evidence, already here',
    'Don&rsquo;t start from a',
    'ICP Builder',
    'Demo Studio',
    'PMF Lab',
    'MVP Builder brief',
    'Build from my evidence',
  ]) {
    assert.ok(source.includes(capability), capability);
  }
  assert.match(source, /onOpen\('Build an evidence-backed MVP from my saved ICP and PMF context'\)/);
});

test('Build page presents focused scope, ownership, and shipping', () => {
  for (const capability of [
    'Focus is a feature',
    'Build only what',
    'proves demand.',
    'One customer. One job. One measurable result.',
    'The evidence-backed scope contract',
    '≤3 essential features',
    'No more than 3 essential features',
    'Review changes, restore versions, use GitHub, or export the code.',
  ]) {
    assert.ok(source.includes(capability), capability);
  }
  assert.doesNotMatch(source, /Build the first testable version/);
  assert.doesNotMatch(source, /Build the smallest testable version of my product/);
});

test('Build page keeps supporting copy concise', () => {
  assert.doesNotMatch(source, /Available when saved journey evidence is ready/);
  assert.doesNotMatch(source, /MVP Builder gives the first version a stopping rule/);
  assert.match(source, /text-center font-mono text-label[^>]+>Your evidence, already here/);
  assert.match(source, /mt-7 flex justify-center/);
});

test('each build category has a distinct product preview', () => {
  for (const preview of ['site', 'app', 'dashboard', 'commerce', 'saas', 'internal']) {
    assert.match(source, new RegExp(`preview: '${preview}'`));
  }
  assert.match(source, /<BuildCardPreview preview=\{card\.preview\}/);
  assert.match(source, /tag: 'E-commerce'/);
});

test('Build page keeps the agreed narrative order and existing shell', () => {
  const orderedComponents = [
    '<BuildHero',
    '<BuildHowItWorks',
    '<BuildWhatYouCanBuild',
    '<BuildEvidenceContext',
    '<BuildFocusSection',
    '<BuildStageSelector',
    '<Footer',
  ];
  let previousIndex = -1;
  for (const component of orderedComponents) {
    const index = source.indexOf(component);
    assert.ok(index > previousIndex, `${component} should follow the previous page section`);
    previousIndex = index;
  }
  assert.match(source, /usePageAnalytics\('\/build'/);
  assert.match(source, /Evidence-Backed MVP Builder for Founders/);
});

test('new positioning cards are interactive and accessible', () => {
  assert.match(source, /aria-controls="evidence-brief-preview"/);
  assert.match(source, /aria-controls="focus-step-detail"/);
  assert.match(source, /aria-pressed=\{isActive\}/);
  assert.match(source, /setActiveEvidence\(name\)/);
  assert.match(source, /setActiveStep\(title\)/);
  assert.match(source, /motion-reduce:animate-none/);
  assert.match(source, /motion-reduce:transition-none/);
});

test('Trust the Process is the final content section before the footer', () => {
  const focusIndex = source.indexOf('<BuildFocusSection');
  const trustIndex = source.indexOf('<BuildStageSelector');
  const footerIndex = source.indexOf('<Footer');
  assert.ok(focusIndex < trustIndex);
  assert.ok(trustIndex < footerIndex);
});

test('the stage rail scrolls on phones and stays 7-across from lg up', () => {
  // 7 cards x min-w-[100px] plus gaps needs ~760px, so the wrap layout cannot
  // start before lg (1024px) — at 768px the panel's inner width is only ~656px.
  assert.match(source, /snap-x/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /scrollbar-hide/);
  assert.match(source, /lg:flex-wrap/);
  assert.match(source, /lg:basis-\[calc\(14\.28%-10px\)\]/);
  assert.doesNotMatch(source, /"flex flex-wrap gap-2\.5"/);

  // overflow-x:auto forces overflow-y to auto, which clips the "You are here"
  // pill (-top-2.5) and the selected card's -translate-y-1.5 without top padding.
  assert.match(source, /pb-3 pt-5/);

  // The default stage (04, the one wearing the pill) starts off-screen otherwise.
  assert.match(source, /scrollLeft = Math\.max\(0, card\.offsetLeft - 16\)/);
});

test('build card previews keep their columns on phones', () => {
  // responsive-overrides.css flattens a bare grid-cols-3 to one column under
  // 768px. These previews are miniature UI mockups, so stacking their columns
  // is wrong — and for the commerce tiles, whose images are aspect-square, it
  // inflated each one to ~200px tall and broke the card out of its 16/10 box.
  const bare = source.match(/grid grid-cols-[3-7](?![^"]*(?:sm|md|lg|xl):grid-cols)[^"]*/g) ?? [];
  assert.deepEqual(bare, [], `these preview grids would be flattened on mobile: ${bare.join(', ')}`);
});
