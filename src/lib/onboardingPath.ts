import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { captureEvent } from '@/lib/analytics';
import { getUserPreferencesRecord } from '@/lib/guidedOnboarding';
import { logWarn } from '@/lib/logger';
import { createRoutineConfig, serializeRoutineConfig } from '@/lib/routineTemplates';

/**
 * Task 4 — forced single onboarding path.
 *
 * New signups are routed into exactly one of two paths (ICP Builder or a mentor
 * intro) before the full "kitchen-sink" dashboard is revealed. State lives in
 * `profiles.user_preferences` (jsonb) so no schema migration is required and the
 * whole feature is reversible by flipping the flag.
 *
 * Rollout flag: ships ON, acting as a kill switch. Set
 * `VITE_FORCE_ONBOARDING_PATH=false` to disable and fall back to the legacy
 * Day1Welcome gate + full nav. Any other value (including unset) keeps it enabled.
 */
export const FORCED_ONBOARDING_ENABLED =
  import.meta.env.VITE_FORCE_ONBOARDING_PATH !== 'false';

export type OnboardingPath = 'icp' | 'mentor';

const ONBOARDING_PATH_KEY = 'onboarding_path';
const ONBOARDING_PATH_COMPLETED_KEY = 'onboarding_path_completed';

/** New users keep the reduced nav until they finish a path or cross this age. */
export const ONBOARDING_NAV_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface OnboardingPathProfile {
  onboarding_completed?: boolean | null;
  user_preferences?: unknown;
}

export interface OnboardingPathState {
  path: OnboardingPath | null;
  completed: boolean;
}

export function getOnboardingPathState(userPreferences: unknown): OnboardingPathState {
  const prefs = getUserPreferencesRecord(userPreferences);
  const rawPath = prefs[ONBOARDING_PATH_KEY];
  return {
    path: rawPath === 'icp' || rawPath === 'mentor' ? rawPath : null,
    completed: prefs[ONBOARDING_PATH_COMPLETED_KEY] === true,
  };
}

/** Returns user_preferences with the chosen path recorded. */
export function withOnboardingPath(
  userPreferences: unknown,
  path: OnboardingPath,
): Record<string, unknown> {
  return { ...getUserPreferencesRecord(userPreferences), [ONBOARDING_PATH_KEY]: path };
}

/** Returns user_preferences with the path marked complete (and optionally set). */
export function withOnboardingPathCompleted(
  userPreferences: unknown,
  path?: OnboardingPath,
): Record<string, unknown> {
  return {
    ...getUserPreferencesRecord(userPreferences),
    ...(path ? { [ONBOARDING_PATH_KEY]: path } : {}),
    [ONBOARDING_PATH_COMPLETED_KEY]: true,
  };
}

/** Show the full-screen path chooser instead of the dashboard. */
export function shouldShowOnboardingPathGate(
  profile: OnboardingPathProfile | null | undefined,
): boolean {
  if (!FORCED_ONBOARDING_ENABLED || !profile) return false;
  return profile.onboarding_completed !== true;
}

function accountAgeMs(userCreatedAt: string | null | undefined): number | null {
  if (!userCreatedAt) return null;
  const created = new Date(userCreatedAt).getTime();
  return Number.isNaN(created) ? null : Date.now() - created;
}

/**
 * While true, the dashboard sidebar collapses to the onboarding essentials so a
 * fresh user isn't dropped into ~20 tools. Unlocks once they complete a path or
 * the account ages past the window — whichever comes first.
 */
export function shouldReduceOnboardingNav(
  profile: OnboardingPathProfile | null | undefined,
  userCreatedAt: string | null | undefined,
): boolean {
  if (!FORCED_ONBOARDING_ENABLED || !profile) return false;
  if (getOnboardingPathState(profile.user_preferences).completed) return false;
  const age = accountAgeMs(userCreatedAt);
  return age !== null && age < ONBOARDING_NAV_WINDOW_MS;
}

/**
 * RET-003: start the habit loop *for* the user instead of asking them to assemble
 * it. When a new user passes the onboarding gate, seed the "validate idea" routine
 * (2 daily + 1 weekly task) so the Today cockpit and streak are alive on day 1
 * instead of showing an empty state and a permanent 0-day flame.
 * Never overwrites a routine the user already configured.
 */
export async function seedDefaultRoutineForOnboarding(userId: string): Promise<void> {
  if (!userId) return;

  const { data, error } = await supabase
    .from('profiles')
    .select('routine_config')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    logWarn('seedDefaultRoutineForOnboarding: failed to read routine_config', error);
    return;
  }
  if (data?.routine_config) return; // user already has a routine — leave it alone

  const goal = 'validate_idea';
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      routine_config: serializeRoutineConfig(createRoutineConfig(goal)) as Json,
      routine_primary_goal: goal,
    })
    .eq('id', userId);

  if (updateError) {
    logWarn('seedDefaultRoutineForOnboarding: failed to seed routine', updateError);
    return;
  }

  captureEvent('routine_auto_seeded', { goal, trigger: 'onboarding_path' });
}

/**
 * Persist path completion from a surface that doesn't hold the profile in memory
 * (e.g. the ICP Builder completion handler). Read-merge-write on user_preferences.
 * No-op when the flag is off.
 */
export async function markOnboardingPathCompleted(
  userId: string,
  path?: OnboardingPath,
): Promise<void> {
  if (!FORCED_ONBOARDING_ENABLED || !userId) return;

  const { data, error } = await supabase
    .from('profiles')
    .select('user_preferences')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    logWarn('markOnboardingPathCompleted: failed to read user_preferences', error);
    return;
  }

  const next = withOnboardingPathCompleted(data?.user_preferences, path);
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ user_preferences: next })
    .eq('id', userId);

  if (updateError) {
    logWarn('markOnboardingPathCompleted: failed to persist completion', updateError);
  }
}
