import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  assignFounderStageV3,
  createQuizAnswersV3Payload,
  type FounderStageQuizAnswersV3,
} from '../src/lib/stageDiagnostic.ts';
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

test('new-account flag opts a profile into the unified guided onboarding flow', () => {
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
    false,
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

test('unified onboarding step shape excludes duplicate terms confirmation', () => {
  const source = readFileSync(new URL('../src/components/OnboardingForm.tsx', import.meta.url), 'utf8');

  assert.match(source, /const ONBOARDING_STEPS/);
  assert.match(source, /activation_intent/);
  assert.doesNotMatch(source, /terms_confirmation/);
  assert.doesNotMatch(source, /acceptedTerms/);
});

test('stage answers still produce the v3 diagnostic payload', () => {
  const answers: FounderStageQuizAnswersV3 = {
    productStatus: 'mvp_beta',
    customerTesting: 'target_customers',
    mainFocus: 'validate_demand',
    tractionSignal: 'waitlist_interest',
    blocker: 'demand_validation',
    fundraisingStatus: 'not_now',
  };

  const diagnostic = assignFounderStageV3(answers);
  const payload = createQuizAnswersV3Payload(answers, diagnostic);

  assert.equal(payload.version, 3);
  assert.equal(payload.assignedStage, diagnostic.assignedStage);
  assert.equal(payload.answers, answers);
});

test('activation intent still resolves to first-action routes', () => {
  const source = readFileSync(new URL('../src/lib/retentionSystem.ts', import.meta.url), 'utf8');

  assert.match(source, /find_mentor: '\/mentorship\?mentorSource=onboarding&activationIntent=find_mentor'/);
  assert.match(source, /run_icp: '\/icp-builder\?activation=1'/);
  assert.match(source, /start_validation: '\/decision-sprint\?activation=1'/);
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
