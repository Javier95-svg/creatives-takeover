import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isLegacyOnboardingExempt,
  requiresGuidedOnboarding,
  shouldEnforceActivationGate,
  shouldRedirectToGuidedOnboarding,
  shouldRedirectToSetupQuiz,
  withGuidedOnboardingPreference,
} from '../src/lib/guidedOnboarding.ts';

test('legacy profiles remain exempt when guided onboarding flag is missing', () => {
  const legacyProfile = {
    onboarding_completed: null,
    quiz_completed: null,
    user_preferences: null,
  };

  assert.equal(requiresGuidedOnboarding(legacyProfile.user_preferences), false);
  assert.equal(isLegacyOnboardingExempt(legacyProfile), true);
  assert.equal(shouldRedirectToGuidedOnboarding(legacyProfile), false);
  assert.equal(shouldRedirectToSetupQuiz(legacyProfile), false);
});

test('new-account flag opts a profile into guided onboarding and setup quiz flow', () => {
  const guidedPreferences = withGuidedOnboardingPreference(null, true);

  assert.equal(requiresGuidedOnboarding(guidedPreferences), true);
  assert.equal(
    shouldRedirectToGuidedOnboarding({
      onboarding_completed: null,
      quiz_completed: null,
      user_preferences: guidedPreferences,
    }),
    true,
  );
  assert.equal(
    shouldRedirectToSetupQuiz({
      onboarding_completed: true,
      quiz_completed: false,
      user_preferences: guidedPreferences,
    }),
    true,
  );
});

test('guided onboarding redirects are skipped for icp unlock bootstrap', () => {
  const guidedPreferences = withGuidedOnboardingPreference(null, true);

  assert.equal(
    shouldRedirectToGuidedOnboarding({
      onboarding_completed: false,
      dashboard_bootstrap_source: 'icp_unlock',
      user_preferences: guidedPreferences,
    }),
    false,
  );
});

test('activation gate is suppressed for legacy users even with stale forced-gate state', () => {
  assert.equal(
    shouldEnforceActivationGate({
      requiresGuidedOnboarding: false,
      activationGateVariant: 'forced_gate',
      firstArtifactType: null,
    }),
    false,
  );
});

test('activation gate still applies to guided-onboarding users without a first artifact', () => {
  assert.equal(
    shouldEnforceActivationGate({
      requiresGuidedOnboarding: true,
      activationGateVariant: 'forced_gate',
      firstArtifactType: null,
    }),
    true,
  );
  assert.equal(
    shouldEnforceActivationGate({
      requiresGuidedOnboarding: true,
      activationGateVariant: 'forced_gate',
      firstArtifactType: 'mentor_saved',
    }),
    false,
  );
});
