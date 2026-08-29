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
    'Build the first testable version',
  ]) {
    assert.ok(source.includes(capability), capability);
  }
  assert.match(source, /onOpen\('Build the smallest testable version of my product'\)/);
});

test('Build page keeps supporting copy concise', () => {
  assert.doesNotMatch(source, /Available when saved journey evidence is ready/);
  assert.doesNotMatch(source, /MVP Builder gives the first version a stopping rule/);
  assert.match(source, /text-center font-mono text-label[^>]+>Your evidence, already here/);
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
