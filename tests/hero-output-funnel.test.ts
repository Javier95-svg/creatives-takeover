import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildHeroProductPath,
  buildHeroSignupPath,
  HERO_MODE_ACCOUNT_TYPE,
  HERO_MODES,
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

test('a signed-out submission goes signup -> matching onboarding -> the tool it asked for', () => {
  const toolPath = buildHeroProductPath('a CRM for mobile car detailers');
  const signup = new URL(buildHeroSignupPath('product', toolPath), 'https://creatives-takeover.com');
  assert.equal(signup.pathname, '/signup');
  assert.equal(signup.searchParams.get('source'), 'hero-product');

  const onboarding = new URL(signup.searchParams.get('return') ?? '', 'https://creatives-takeover.com');
  assert.equal(onboarding.pathname, '/onboarding');
  assert.equal(onboarding.searchParams.get('source'), 'signup_redirect');
  assert.equal(onboarding.searchParams.get('return'), toolPath);

  const tool = new URL(onboarding.searchParams.get('return') ?? '', 'https://creatives-takeover.com');
  assert.equal(tool.searchParams.get('seed'), 'a CRM for mobile car detailers');

  assert.equal(HERO_MODE_ACCOUNT_TYPE.idea, 'builder');
  assert.equal(HERO_MODE_ACCOUNT_TYPE.product, 'founder');
});

test('Product mode carries the seed to Demo Studio without starting a run', () => {
  const path = buildHeroProductPath('  a CRM for mobile car detailers  ');
  const url = new URL(path, 'https://creatives-takeover.com');

  assert.equal(url.pathname, '/demo-studio/try');
  assert.equal(url.searchParams.get('seed'), 'a CRM for mobile car detailers');
  assert.equal(url.searchParams.get('source'), 'hero-product');

  /*
   * A demo needs the founder's real screenshots and product URL. Generating on
   * arrival was only possible because a description alone was accepted, and
   * that path produced placeholder frames - AI captions over invented UI. The
   * seed now prefills a form instead, so autostart must not come back.
   */
  assert.equal(url.searchParams.get('autostart'), null);
});

test('the Product CTA does not promise a demo the landing page cannot deliver', () => {
  // The visitor lands on a form, so a CTA reading "Launch a live demo" would be
  // making a promise the next screen immediately breaks.
  assert.doesNotMatch(HERO_MODES.product.cta, /launch/i);
  assert.ok(HERO_MODES.product.cta.trim().length > 0);
});
