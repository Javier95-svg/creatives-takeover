import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDemoAutoStartGuardKey,
  buildHeroProductPath,
  resolveHeroArtifactState,
} from '../src/lib/heroFunnelRules.ts';

test('hero generation resolves every success and failure order without a stuck busy state', () => {
  assert.equal(resolveHeroArtifactState({ hasCompact: false, hasDeep: false }), 'compact_generating');
  assert.equal(resolveHeroArtifactState({
    hasCompact: true,
    hasDeep: false,
    generationStatus: 'compact_ready',
  }), 'compact_ready');
  assert.equal(resolveHeroArtifactState({
    hasCompact: true,
    hasDeep: false,
    generationStatus: 'deep_generating',
  }), 'deep_generating');
  assert.equal(resolveHeroArtifactState({ hasCompact: true, hasDeep: true }), 'deep_ready');
  assert.equal(resolveHeroArtifactState({ hasCompact: false, hasDeep: true }), 'deep_ready');
  assert.equal(resolveHeroArtifactState({
    hasCompact: true,
    hasDeep: false,
    generationStatus: 'deep_failed',
  }), 'partial_failure');
  assert.equal(resolveHeroArtifactState({
    hasCompact: false,
    hasDeep: false,
    generationStatus: 'failed',
  }), 'failed');
  assert.equal(resolveHeroArtifactState({ hasCompact: true, hasDeep: false, timedOut: true }), 'partial_failure');
  assert.equal(resolveHeroArtifactState({ hasCompact: false, hasDeep: false, timedOut: true }), 'failed');
});

test('Product mode creates a validated one-click Demo Studio handoff', () => {
  const path = buildHeroProductPath('  a CRM for mobile car detailers  ');
  const url = new URL(path, 'https://creatives-takeover.com');

  assert.equal(url.pathname, '/demo-studio/try');
  assert.equal(url.searchParams.get('seed'), 'a CRM for mobile car detailers');
  assert.equal(url.searchParams.get('autostart'), '1');
  assert.equal(url.searchParams.get('source'), 'hero-product');
});

test('Demo auto-start guard is stable for refresh and distinct across seeds', () => {
  const first = buildDemoAutoStartGuardKey('a CRM for mobile car detailers');
  assert.equal(first, buildDemoAutoStartGuardKey('  a CRM for mobile car detailers  '));
  assert.notEqual(first, buildDemoAutoStartGuardKey('an invoicing app for photographers'));
  assert.match(first, /^ct_demo_try_autostart_[a-z0-9]+$/);
});
