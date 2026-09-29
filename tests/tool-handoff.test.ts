import assert from 'node:assert/strict';
import test from 'node:test';

import { clearToolHandoff, readToolHandoff, rememberToolHandoff, updateToolHandoff } from '../src/lib/toolHandoff.ts';
import { shouldOfferOnboardingTopUp } from '../src/lib/guidedOnboarding.ts';

// Minimal localStorage for node.
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, String(value)),
  removeItem: (key: string) => void store.delete(key),
};

test('a hand-off survives until onboarding clears it', () => {
  store.clear();
  rememberToolHandoff({ mode: 'idea', tool: 'icp_builder', seed: '  an app that helps barbers stop losing no-shows  ' });
  const handoff = readToolHandoff();
  assert.equal(handoff?.mode, 'idea');
  assert.equal(handoff?.seed, 'an app that helps barbers stop losing no-shows');
  updateToolHandoff({ projectName: 'Chairtime' });
  assert.equal(readToolHandoff()?.projectName, 'Chairtime');
  clearToolHandoff();
  assert.equal(readToolHandoff(), null);
});

test('long seeds are capped and empty seeds are ignored', () => {
  store.clear();
  rememberToolHandoff({ mode: 'product', tool: 'demo_studio', seed: 'x'.repeat(1000) });
  assert.equal(readToolHandoff()?.seed.length, 280);
  store.clear();
  rememberToolHandoff({ mode: 'product', tool: 'demo_studio', seed: '   ' });
  assert.equal(readToolHandoff(), null);
});

test('expired, malformed or tampered hand-offs are ignored', () => {
  store.set('ct_tool_handoff', JSON.stringify({ mode: 'idea', tool: 'icp_builder', seed: 'old idea', savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000 }));
  assert.equal(readToolHandoff(), null);
  store.set('ct_tool_handoff', '{not json');
  assert.equal(readToolHandoff(), null);
  store.set('ct_tool_handoff', JSON.stringify({ mode: 'admin', tool: 'icp_builder', seed: 'x', savedAt: Date.now() }));
  assert.equal(readToolHandoff(), null);
});

test('the setup prompt is offered only to tool-first accounts that skipped onboarding', () => {
  const base = { user_preferences: { requires_guided_onboarding: true, firstArtifactType: 'icp_analysis' }, onboarding_completed: false, user_type: 'founder' };
  assert.equal(shouldOfferOnboardingTopUp(base), true);
  assert.equal(shouldOfferOnboardingTopUp({ ...base, user_preferences: { requires_guided_onboarding: true }, dashboard_bootstrap_source: 'icp_unlock' }), true);
  assert.equal(shouldOfferOnboardingTopUp({ ...base, onboarding_completed: true }), false);
  assert.equal(shouldOfferOnboardingTopUp({ ...base, user_type: 'mentor' }), false);
  assert.equal(shouldOfferOnboardingTopUp({ ...base, user_preferences: { requires_guided_onboarding: true } }), false);
  assert.equal(shouldOfferOnboardingTopUp({ ...base, user_preferences: { firstArtifactType: 'icp_analysis' } }), false);
  assert.equal(shouldOfferOnboardingTopUp(null), false);
});
