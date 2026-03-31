import type { ActivationEntryStage, ActivationJourneyState } from '@/lib/activationJourney';

export const ACTIVATION_NOTIFICATION_STATE_KEY = 'activationNotificationState';
const ACTIVATION_NOTIFICATION_IMAGE = '/lovable-uploads/new-favicon.png';

export interface ActivationNotificationState {
  welcomeSentForStage: ActivationEntryStage | null;
  welcomeSentAt: string | null;
  firstOutputCelebratedForStage: ActivationEntryStage | null;
  firstOutputCelebratedAt: string | null;
  reminderSentForStage: ActivationEntryStage | null;
  reminderSentAt: string | null;
  weeklyWinSentAt: string | null;
  lastOutputCelebratedAt: string | null;
}

export interface ActivationBellPayload {
  slug: string;
  title: string;
  message: string;
  route: string;
  imageUrl: string;
}

export function getDefaultActivationNotificationState(): ActivationNotificationState {
  return {
    welcomeSentForStage: null,
    welcomeSentAt: null,
    firstOutputCelebratedForStage: null,
    firstOutputCelebratedAt: null,
    reminderSentForStage: null,
    reminderSentAt: null,
    weeklyWinSentAt: null,
    lastOutputCelebratedAt: null,
  };
}

function normalizeStage(value: unknown): ActivationEntryStage | null {
  if (value === 'stage_i' || value === 'stage_ii' || value === 'stage_iii') {
    return value;
  }

  return null;
}

function getStartupNiche(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const firstString = value.find((item) => typeof item === 'string' && item.trim());
    return typeof firstString === 'string' ? firstString.trim() : null;
  }

  return null;
}

function buildNicheFragment(preferences: Record<string, unknown> | null): string {
  const niche = getStartupNiche(preferences?.startupIndustry);
  return niche ? ` for your ${niche} startup` : '';
}

export function readActivationNotificationStateFromPreferences(value: unknown): ActivationNotificationState | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const notificationState = record[ACTIVATION_NOTIFICATION_STATE_KEY];

  if (!notificationState || typeof notificationState !== 'object') return null;

  const candidate = notificationState as Record<string, unknown>;

  return {
    welcomeSentForStage: normalizeStage(candidate.welcomeSentForStage),
    welcomeSentAt: typeof candidate.welcomeSentAt === 'string' ? candidate.welcomeSentAt : null,
    firstOutputCelebratedForStage: normalizeStage(candidate.firstOutputCelebratedForStage),
    firstOutputCelebratedAt:
      typeof candidate.firstOutputCelebratedAt === 'string' ? candidate.firstOutputCelebratedAt : null,
    reminderSentForStage: normalizeStage(candidate.reminderSentForStage),
    reminderSentAt: typeof candidate.reminderSentAt === 'string' ? candidate.reminderSentAt : null,
    weeklyWinSentAt: typeof candidate.weeklyWinSentAt === 'string' ? candidate.weeklyWinSentAt : null,
    lastOutputCelebratedAt: typeof candidate.lastOutputCelebratedAt === 'string' ? candidate.lastOutputCelebratedAt : null,
  };
}

export function mergeActivationNotificationStateIntoPreferences(
  existingPreferences: unknown,
  activationNotificationState: ActivationNotificationState,
): Record<string, unknown> {
  const base =
    existingPreferences && typeof existingPreferences === 'object'
      ? { ...(existingPreferences as Record<string, unknown>) }
      : {};

  return {
    ...base,
    [ACTIVATION_NOTIFICATION_STATE_KEY]: activationNotificationState,
  };
}

export function buildActivationWelcomeNotification(
  activationJourney: ActivationJourneyState,
  preferences: Record<string, unknown> | null,
): ActivationBellPayload {
  const nicheFragment = buildNicheFragment(preferences);

  switch (activationJourney.entryStage) {
    case 'stage_i':
      return {
        slug: 'activation-start-stage-i',
        title: 'Start with your ICP',
        message: `Leave this session with a saved ICP decision${nicheFragment}.`,
        route: activationJourney.startRoute,
        imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
      };
    case 'stage_ii':
      return {
        slug: 'activation-start-stage-ii',
        title: 'Draft your first waitlist page',
        message: `Turn your idea into a saved waitlist draft${nicheFragment} so you can test real demand.`,
        route: activationJourney.startRoute,
        imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
      };
    case 'stage_iii':
      return {
        slug: 'activation-start-stage-iii',
        title: 'Validate demand before you build',
        message: `Bring your evidence together and save PMF signals${nicheFragment} before committing to the MVP.`,
        route: activationJourney.startRoute,
        imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
      };
    default:
      return {
        slug: 'activation-start',
        title: 'Start your first founder output',
        message: `Finish ${activationJourney.firstOutputLabel}${nicheFragment} before exploring the rest of the platform.`,
        route: activationJourney.startRoute,
        imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
      };
  }
}

export function buildActivationCompletionNotification(
  activationJourney: ActivationJourneyState,
  preferences: Record<string, unknown> | null,
): ActivationBellPayload {
  const nicheFragment = buildNicheFragment(preferences);

  switch (activationJourney.entryStage) {
    case 'stage_i':
      return {
        slug: 'activation-complete-stage-i',
        title: 'ICP saved',
        message: `You now have a clearer customer profile${nicheFragment}. Next: turn it into a waitlist page.`,
        route: activationJourney.nextRoute,
        imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
      };
    case 'stage_ii':
      return {
        slug: 'activation-complete-stage-ii',
        title: 'Waitlist draft saved',
        message: `You now have a demand test${nicheFragment}. Next: validate the quality of those signals in PMF Lab.`,
        route: activationJourney.nextRoute,
        imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
      };
    case 'stage_iii':
      return {
        slug: 'activation-complete-stage-iii',
        title: 'Validation evidence saved',
        message: `You now have saved PMF evidence${nicheFragment}. Next: scope the MVP with less guesswork.`,
        route: activationJourney.nextRoute,
        imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
      };
    default:
      return {
        slug: 'activation-complete',
        title: 'First output saved',
        message: `You completed ${activationJourney.firstOutputLabel}. Keep moving while the momentum is fresh.`,
        route: activationJourney.nextRoute,
        imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
      };
  }
}

export function buildActivationReminderNotification(
  activationJourney: ActivationJourneyState,
  preferences: Record<string, unknown> | null,
): ActivationBellPayload {
  const nicheFragment = buildNicheFragment(preferences);

  switch (activationJourney.entryStage) {
    case 'stage_i':
      return {
        slug: 'activation-reminder-stage-i',
        title: 'Finish your ICP',
        message: `You are still one saved ICP decision away from real momentum${nicheFragment}. Pick up where you left off.`,
        route: activationJourney.startRoute,
        imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
      };
    case 'stage_ii':
      return {
        slug: 'activation-reminder-stage-ii',
        title: 'Finish your waitlist draft',
        message: `A saved waitlist draft${nicheFragment} is the fastest way to see if this idea has real pull.`,
        route: activationJourney.startRoute,
        imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
      };
    case 'stage_iii':
      return {
        slug: 'activation-reminder-stage-iii',
        title: 'Save your PMF evidence',
        message: `Bring your demand signals into one saved PMF view${nicheFragment} before you commit more time to building.`,
        route: activationJourney.startRoute,
        imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
      };
    default:
      return {
        slug: 'activation-reminder',
        title: 'Pick up your founder journey',
        message: `You still have not finished ${activationJourney.firstOutputLabel}. Re-open the current step and finish it.`,
        route: activationJourney.startRoute,
        imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
      };
  }
}

// ─── New: fires on every save (not just the first) ───────────────────────────

export function buildOutputSaveNotification(
  activationJourney: ActivationJourneyState,
  preferences: Record<string, unknown> | null,
): ActivationBellPayload {
  const nicheFragment = buildNicheFragment(preferences);

  return {
    slug: `output-saved-${Date.now()}`,
    title: 'Output saved',
    message: `Progress saved${nicheFragment}. Keep moving — the next step is ${activationJourney.nextRoute.replace('/', '').replace('-', ' ')}.`,
    route: activationJourney.nextRoute,
    imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
  };
}

// ─── New: Weekly Win — fires Monday for users who saved output in prior week ──

export function buildWeeklyWinNotification(
  activationJourney: ActivationJourneyState,
  preferences: Record<string, unknown> | null,
): ActivationBellPayload {
  const nicheFragment = buildNicheFragment(preferences);

  return {
    slug: `weekly-win-${new Date().toISOString().slice(0, 10)}`,
    title: 'Weekly win unlocked',
    message: `You saved an output last week${nicheFragment}. Your mission this week: go one stage further.`,
    route: activationJourney.nextRoute,
    imageUrl: ACTIVATION_NOTIFICATION_IMAGE,
  };
}

// ─── Timing helpers ───────────────────────────────────────────────────────────

/** Returns true if a welcome notification should fire (not yet sent for this stage). */
export function shouldSendWelcome(
  state: ActivationNotificationState,
  stage: ActivationEntryStage,
): boolean {
  return state.welcomeSentForStage !== stage;
}

/** Returns true if a reminder should fire (not yet sent for this stage + at least 10 min since welcome). */
export function shouldSendReminder(
  state: ActivationNotificationState,
  stage: ActivationEntryStage,
): boolean {
  if (state.reminderSentForStage === stage) return false;
  if (!state.welcomeSentAt) return false;
  const tenMinutes = 10 * 60 * 1000;
  return Date.now() - new Date(state.welcomeSentAt).getTime() > tenMinutes;
}

/** Returns true if a weekly-win notification should fire (not yet sent this week + Monday). */
export function shouldSendWeeklyWin(state: ActivationNotificationState): boolean {
  const today = new Date();
  // Only fire on Mondays (day 1)
  if (today.getDay() !== 1) return false;
  if (!state.weeklyWinSentAt) return true;
  const lastSent = new Date(state.weeklyWinSentAt);
  const daysSince = (Date.now() - lastSent.getTime()) / (24 * 60 * 60 * 1000);
  return daysSince >= 6;
}
