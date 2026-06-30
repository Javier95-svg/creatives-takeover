import { getSafeLocalStorage } from '@/lib/safeStorage';
import { trackActivationFunnelEvent } from '@/lib/analytics';
import { getUserPreferencesRecord } from '@/lib/guidedOnboarding';
import { getActivationRoute, type ActivationIntent } from '@/lib/retentionSystem';

const ACTIVATION_INTENTS = new Set<ActivationIntent>([
  'build_demo',
  'find_mentor',
  'run_icp',
  'start_validation',
  'unlock_pitch_deck',
  'unlock_tech_stack',
  'unlock_insighta',
  'save_mentor',
  'send_message',
  'book_call',
]);

export interface ActivationPreferenceState {
  activationIntent: ActivationIntent | null;
  firstArtifactType: string | null;
  firstArtifactCreatedAt: string | null;
  firstArtifactResumeUrl: string | null;
  needsFirstArtifact: boolean;
  continueUrl: string;
}

export function getDaysSinceSignup(userCreatedAt?: string | null): number | null {
  if (!userCreatedAt) return null;
  const createdAt = new Date(userCreatedAt).getTime();
  if (Number.isNaN(createdAt)) return null;
  return Math.max(0, Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000)));
}

export function getActivationPreferenceState(userPreferences: unknown): ActivationPreferenceState {
  const prefs = getUserPreferencesRecord(userPreferences);
  const rawIntent = prefs.activationIntent;
  const activationIntent = typeof rawIntent === 'string' && ACTIVATION_INTENTS.has(rawIntent as ActivationIntent)
    ? rawIntent as ActivationIntent
    : null;
  const firstArtifactType = typeof prefs.firstArtifactType === 'string' ? prefs.firstArtifactType : null;
  const firstArtifactResumeUrl = typeof prefs.firstArtifactResumeUrl === 'string' ? prefs.firstArtifactResumeUrl : null;
  const firstArtifactCreatedAt = typeof prefs.firstArtifactCreatedAt === 'string' ? prefs.firstArtifactCreatedAt : null;

  return {
    activationIntent,
    firstArtifactType,
    firstArtifactCreatedAt,
    firstArtifactResumeUrl,
    needsFirstArtifact: !firstArtifactType,
    continueUrl: firstArtifactResumeUrl || (activationIntent ? getActivationRoute(activationIntent) : '/dashboard'),
  };
}

export function shouldShowFirstResultMode(params: {
  onboardingCompleted?: boolean | null;
  userPreferences: unknown;
}) {
  if (params.onboardingCompleted !== true) return false;
  const state = getActivationPreferenceState(params.userPreferences);
  return Boolean(state.activationIntent && state.needsFirstArtifact);
}

export function trackActivationReturnMilestones(params: {
  userId: string;
  userCreatedAt?: string | null;
  activationIntent?: string | null;
  source?: string;
  plan?: string | null;
}) {
  const daysSinceSignup = getDaysSinceSignup(params.userCreatedAt);
  if (daysSinceSignup === null) return;

  const storage = getSafeLocalStorage();
  const milestones: Array<{ day: 2 | 7; event: 'activation_returned_day_2' | 'activation_returned_day_7' }> = [
    { day: 2, event: 'activation_returned_day_2' },
    { day: 7, event: 'activation_returned_day_7' },
  ];

  milestones.forEach(({ day, event }) => {
    if (daysSinceSignup < day) return;
    const guardKey = `activation_return_${event}_${params.userId}`;
    if (storage.getItem(guardKey) === 'true') return;
    storage.setItem(guardKey, 'true');
    trackActivationFunnelEvent(event, {
      user_id: params.userId,
      activation_intent: params.activationIntent ?? null,
      source: params.source ?? 'dashboard',
      plan: params.plan ?? null,
      days_since_signup: daysSinceSignup,
    });
  });
}
