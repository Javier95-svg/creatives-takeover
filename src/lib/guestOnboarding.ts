import type { OnboardingAnswersV1, OnboardingSessionV1 } from './onboardingContext.ts';

/**
 * The onboarding quiz for visitors without an account.
 *
 * Homepage visitors take the quiz before signing up. Nothing is sent to our
 * servers until they create an account: progress lives in this browser, and
 * the finished answers are handed to /onboarding after signup, which saves
 * them through the onboarding-context edge function.
 *
 * Import-light on purpose (type-only imports) so node tests can load it.
 */

const SESSION_KEY = 'ct_guest_onboarding_session';
const SNAPSHOT_KEY = 'ct_guest_onboarding_snapshot';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const EPOCH = new Date(0).toISOString();

export interface GuestOnboardingSnapshot {
  answers: Partial<OnboardingAnswersV1>;
  /** Only present when the guest chose a first action themselves. */
  selectedIntent?: string;
  /** Where to go once onboarding is saved, e.g. the tool they asked for. */
  returnPath?: string;
  savedAt: number;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function newGuestId() {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `guest-${random}`;
}

/**
 * A local stand-in for a server session, so the quiz can run unchanged. The id
 * is kept so a refresh resumes the same local draft; the epoch updated_at makes
 * that draft always win over this empty session.
 *
 * `startedAfter`: a newer homepage submission (its time) starts a fresh quiz,
 * so a returning visitor with a new idea never sees the previous idea's draft.
 */
export function getGuestSession(options: { startedAfter?: number } = {}): OnboardingSessionV1 {
  const store = storage();
  let id: string | null = null;
  try {
    const raw = store?.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) as { id?: unknown; createdAt?: unknown } : null;
    if (parsed && typeof parsed.id === 'string' && parsed.id.startsWith('guest-')
      && typeof parsed.createdAt === 'number' && Date.now() - parsed.createdAt <= MAX_AGE_MS) {
      id = parsed.id;
      if (options.startedAfter && parsed.createdAt < options.startedAfter) {
        clearGuestOnboarding();
        id = null;
      }
    }
  } catch {
    id = null;
  }
  if (!id) {
    id = newGuestId();
    try { store?.setItem(SESSION_KEY, JSON.stringify({ id, createdAt: Date.now() })); } catch { /* storage unavailable */ }
  }
  return {
    id,
    user_id: '',
    schema_version: 1,
    flow_version: 'adaptive_v1',
    rollout_variant: 'adaptive_v1',
    source: 'hero_guest',
    plan_snapshot: null,
    device_snapshot: null,
    status: 'in_progress',
    current_step: 0,
    answers: {},
    derived_context: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    updated_at: EPOCH,
  };
}

export function isGuestSessionId(id: string) {
  return id.startsWith('guest-');
}

export function saveGuestSnapshot(input: Omit<GuestOnboardingSnapshot, 'savedAt'>) {
  const { selectedIntent, ...rest } = input;
  const snapshot: GuestOnboardingSnapshot = {
    ...rest,
    // Stored without the choice unless the guest made it: guests see fewer
    // first actions (no credits), so the recommendation is redone after signup.
    answers: { ...input.answers, selectedIntent: '' },
    ...(selectedIntent ? { selectedIntent } : {}),
    savedAt: Date.now(),
  };
  try { storage()?.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot)); } catch { /* storage unavailable */ }
}

export function readGuestSnapshot(): GuestOnboardingSnapshot | null {
  try {
    const raw = storage()?.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestOnboardingSnapshot>;
    if (!parsed.answers || typeof parsed.answers !== 'object' || Array.isArray(parsed.answers)) return null;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return {
      answers: parsed.answers,
      ...(typeof parsed.selectedIntent === 'string' && parsed.selectedIntent ? { selectedIntent: parsed.selectedIntent } : {}),
      ...(typeof parsed.returnPath === 'string' ? { returnPath: parsed.returnPath } : {}),
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

/** Answers ready to seed a real session: the guest's own choice restored, if any. */
export function guestSnapshotAnswers(snapshot: GuestOnboardingSnapshot): Partial<OnboardingAnswersV1> {
  const answers = { ...snapshot.answers };
  if (snapshot.selectedIntent) answers.selectedIntent = snapshot.selectedIntent as OnboardingAnswersV1['selectedIntent'];
  else delete answers.selectedIntent;
  return answers;
}

export function clearGuestOnboarding() {
  const store = storage();
  try {
    const raw = store?.getItem(SESSION_KEY);
    const id = raw ? (JSON.parse(raw) as { id?: unknown }).id : null;
    if (typeof id === 'string') store?.removeItem(`adaptive_onboarding_${id}`);
  } catch { /* ignore */ }
  try {
    store?.removeItem(SESSION_KEY);
    store?.removeItem(SNAPSHOT_KEY);
  } catch { /* storage unavailable */ }
}
