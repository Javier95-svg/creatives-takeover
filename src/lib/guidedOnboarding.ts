export const REQUIRES_GUIDED_ONBOARDING_KEY = 'requires_guided_onboarding';

export interface GuidedOnboardingProfile {
  onboarding_completed?: boolean | null;
  quiz_completed?: boolean | null;
  dashboard_bootstrap_source?: string | null;
  user_preferences?: unknown;
}

export function getUserPreferencesRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function requiresGuidedOnboarding(userPreferences: unknown): boolean {
  const preferences = getUserPreferencesRecord(userPreferences);
  return preferences[REQUIRES_GUIDED_ONBOARDING_KEY] === true;
}

export function withGuidedOnboardingPreference(
  userPreferences: unknown,
  enabled: boolean,
): Record<string, unknown> {
  const preferences = getUserPreferencesRecord(userPreferences);

  if (enabled) {
    return {
      ...preferences,
      [REQUIRES_GUIDED_ONBOARDING_KEY]: true,
    };
  }

  const { [REQUIRES_GUIDED_ONBOARDING_KEY]: _ignored, ...remainingPreferences } = preferences;
  return remainingPreferences;
}

export function isLegacyOnboardingExempt(profile: GuidedOnboardingProfile | null | undefined): boolean {
  return !requiresGuidedOnboarding(profile?.user_preferences);
}

export function shouldRedirectToGuidedOnboarding(
  profile: GuidedOnboardingProfile | null | undefined,
): boolean {
  if (!profile || !requiresGuidedOnboarding(profile.user_preferences)) {
    return false;
  }

  const preferences = getUserPreferencesRecord(profile.user_preferences);
  if (typeof preferences.firstArtifactType === 'string') {
    return false;
  }

  if (profile.dashboard_bootstrap_source === 'icp_unlock') {
    return false;
  }

  return profile.onboarding_completed !== true;
}

export function shouldRedirectToSetupQuiz(_profile: GuidedOnboardingProfile | null | undefined): boolean {
  return false;
}

export function shouldEnforceActivationGate(params: {
  requiresGuidedOnboarding: boolean;
  activationGateVariant: 'control' | 'forced_gate';
  firstArtifactType: string | null;
}): boolean {
  return (
    params.requiresGuidedOnboarding &&
    params.activationGateVariant === 'forced_gate' &&
    !params.firstArtifactType
  );
}
