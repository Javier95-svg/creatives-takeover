import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';

export type ActivationIntent =
  | 'find_mentor'
  | 'run_icp'
  | 'start_validation'
  | 'save_mentor'
  | 'send_message'
  | 'book_call';
export type ActivationArtifactIntent = 'save_mentor' | 'send_message' | 'book_call';
export type ActivationGateVariant = 'control' | 'forced_gate';
export type RetentionArtifactType =
  | 'mentor_saved'
  | 'mentor_message'
  | 'discovery_call'
  | 'icp_analysis'
  | 'validation_draft'
  | 'pmf_report';
export type RetentionSequence =
  | 'activation_day0'
  | 'activation_day2'
  | 'activation_day7'
  | 'weekly_digest'
  | 'activation_nudge'
  | 'progress_nudge'
  | 'reengagement'
  | 'celebration';

type RetentionEventProperties = Record<string, unknown>;

interface ProfileRetentionState {
  full_name: string | null;
  creative_niche: string | null;
  onboarding_completed: boolean | null;
  user_preferences: Record<string, unknown> | null;
}

interface StartActivationParams {
  userId: string;
  businessStage: string;
  primaryPain: string;
  activationIntent: ActivationIntent;
}

interface CompleteActivationParams {
  user: User;
  action: ActivationArtifactIntent;
  actionUrl: string;
  source: string;
  mentorId?: string;
  mentorName?: string;
  conversationId?: string;
}

interface RetentionEmailParams {
  userId: string;
  email: string;
  fullName?: string | null;
  niche?: string | null;
  sequence: RetentionSequence;
  activationIntent?: ActivationArtifactIntent;
  mentorId?: string;
  mentorName?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  contextHeadline?: string;
  contextBody?: string;
  savedMentorCount?: number;
  unreadMessageCount?: number;
}

interface MarkArtifactCreatedParams {
  userId: string;
  artifactType: RetentionArtifactType;
  resumeUrl: string;
  artifactId?: string | null;
  label?: string | null;
  source?: string;
}

export interface ValidationDraftArtifact {
  id: string;
  chosenIdeaId: string | null;
  activeIdeaId: string;
  ideas: unknown[];
  updatedAt: string;
}

const ACTIVATION_ROUTE_BY_INTENT: Record<ActivationIntent, string> = {
  find_mentor: '/community?mentorSource=onboarding&activationIntent=find_mentor',
  run_icp: '/icp-builder?activation=1',
  start_validation: '/decision-sprint?activation=1',
  save_mentor: '/community?mentorSource=onboarding&activationIntent=save_mentor',
  send_message: '/community?mentorSource=onboarding&activationIntent=send_message',
  book_call: '/community?mentorSource=onboarding&activationIntent=book_call',
};

export function getActivationRoute(intent: ActivationIntent) {
  return ACTIVATION_ROUTE_BY_INTENT[intent];
}

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getActivationGateVariantFromSeed(seed: string): ActivationGateVariant {
  return hashSeed(seed) % 2 === 0 ? 'forced_gate' : 'control';
}

async function getProfileRetentionState(userId: string): Promise<ProfileRetentionState | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, creative_niche, onboarding_completed, user_preferences')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Failed to load profile retention state', error);
    return null;
  }

  return {
    full_name: data.full_name ?? null,
    creative_niche: data.creative_niche ?? null,
    onboarding_completed: data.onboarding_completed ?? null,
    user_preferences: (data.user_preferences as Record<string, unknown> | null) ?? null,
  };
}

async function updateUserPreferences(userId: string, patch: Record<string, unknown>, onboardingCompleted?: boolean) {
  const profileState = await getProfileRetentionState(userId);
  const mergedPreferences = {
    ...(profileState?.user_preferences ?? {}),
    ...patch,
  };

  const updates: Record<string, unknown> = {
    user_preferences: mergedPreferences,
  };

  if (typeof onboardingCompleted === 'boolean') {
    updates.onboarding_completed = onboardingCompleted;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    throw error;
  }

  return {
    ...(profileState ?? {
      full_name: null,
      creative_niche: null,
      onboarding_completed: onboardingCompleted ?? null,
      user_preferences: null,
    }),
    onboarding_completed: onboardingCompleted ?? profileState?.onboarding_completed ?? null,
    user_preferences: mergedPreferences,
  };
}

export async function trackRetentionEvent(eventName: string, properties: RetentionEventProperties = {}) {
  captureEvent(eventName, properties);

  const userId = typeof properties.user_id === 'string' ? properties.user_id : undefined;
  if (!userId) {
    return;
  }

  try {
    await supabase.functions.invoke('track-activity', {
      body: {
        user_id: userId,
        activity_type: eventName,
        activity_data: properties,
        page_path: typeof window !== 'undefined' ? window.location.pathname : null,
      },
    });
  } catch (error) {
    console.warn('trackRetentionEvent failed', { eventName, error });
  }
}

export async function sendRetentionEmail(params: RetentionEmailParams) {
  try {
    await supabase.functions.invoke('send-retention-email', {
      body: params,
    });
  } catch (error) {
    console.warn('sendRetentionEmail failed', { sequence: params.sequence, error });
  }
}

export async function ensureActivationGateVariant(userId: string): Promise<ActivationGateVariant> {
  const profileState = await getProfileRetentionState(userId);
  const existingVariant = profileState?.user_preferences?.activationGateVariant;

  if (existingVariant === 'control' || existingVariant === 'forced_gate') {
    return existingVariant;
  }

  const assignedVariant = getActivationGateVariantFromSeed(userId);

  await updateUserPreferences(userId, {
    activationGateVariant: assignedVariant,
  });

  return assignedVariant;
}

export async function getActivationGateState(userId: string) {
  const profileState = await getProfileRetentionState(userId);
  const preferences = profileState?.user_preferences ?? {};
  const activationIntent = typeof preferences.activationIntent === 'string'
    ? preferences.activationIntent as ActivationIntent
    : null;
  const activationGateVariant = preferences.activationGateVariant === 'forced_gate'
    ? 'forced_gate'
    : preferences.activationGateVariant === 'control'
      ? 'control'
      : getActivationGateVariantFromSeed(userId);
  const firstArtifactType = typeof preferences.firstArtifactType === 'string'
    ? preferences.firstArtifactType as RetentionArtifactType
    : null;

  return {
    activationGateVariant,
    activationIntent,
    onboardingCompleted: profileState?.onboarding_completed === true,
    firstArtifactType,
    firstArtifactCreatedAt: typeof preferences.firstArtifactCreatedAt === 'string'
      ? preferences.firstArtifactCreatedAt
      : null,
    lastArtifactLabel: typeof preferences.lastArtifactLabel === 'string'
      ? preferences.lastArtifactLabel
      : null,
    lastArtifactResumeUrl: typeof preferences.lastArtifactResumeUrl === 'string'
      ? preferences.lastArtifactResumeUrl
      : null,
  };
}

export async function startActivationJourney(params: StartActivationParams) {
  const startedAt = new Date().toISOString();
  const activationGateVariant = await ensureActivationGateVariant(params.userId);

  const { error } = await supabase
    .from('profiles')
    .update({
      business_stage: params.businessStage,
      quiz_completed: true,
      quiz_completed_at: startedAt,
      quiz_current_stage: params.businessStage,
      quiz_biggest_challenge: params.primaryPain,
      onboarding_completed: false,
    })
    .eq('id', params.userId);

  if (error) {
    throw error;
  }

  await updateUserPreferences(params.userId, {
    activationIntent: params.activationIntent,
    activationGateVariant,
    activationStartedAt: startedAt,
    activationCompletedAt: null,
    activationSource: 'onboarding',
    firstValueAction: null,
    firstArtifactType: null,
    firstArtifactCreatedAt: null,
    firstArtifactId: null,
    firstArtifactLabel: null,
    firstArtifactResumeUrl: null,
    primaryPain: params.primaryPain,
  }, false);

  await trackRetentionEvent('activation_started', {
    user_id: params.userId,
    business_stage: params.businessStage,
    primary_pain: params.primaryPain,
    activation_intent: params.activationIntent,
    source: 'onboarding',
  });
}

export async function completeActivationJourney(params: CompleteActivationParams) {
  const completedAt = new Date().toISOString();
  const profileState = await getProfileRetentionState(params.user.id);
  const email = params.user.email?.trim();

  const nextState = await updateUserPreferences(
    params.user.id,
    {
      activationCompletedAt: completedAt,
      activationIntent: params.action,
      firstValueAction: params.action,
      firstValueActionAt: completedAt,
      firstValueActionSource: params.source,
      firstValueActionUrl: params.actionUrl,
      firstArtifactType:
        params.action === 'save_mentor'
          ? 'mentor_saved'
          : params.action === 'send_message'
            ? 'mentor_message'
            : 'discovery_call',
      firstArtifactCreatedAt: completedAt,
      firstArtifactId: params.mentorId ?? params.conversationId ?? null,
      firstArtifactLabel:
        params.action === 'save_mentor'
          ? (params.mentorName ? `Saved mentor: ${params.mentorName}` : 'Saved mentor')
          : params.action === 'send_message'
            ? 'Founder conversation'
            : 'Booked discovery call',
      firstArtifactResumeUrl: params.actionUrl,
      lastArtifactType:
        params.action === 'save_mentor'
          ? 'mentor_saved'
          : params.action === 'send_message'
            ? 'mentor_message'
            : 'discovery_call',
      lastArtifactCreatedAt: completedAt,
      lastArtifactId: params.mentorId ?? params.conversationId ?? null,
      lastArtifactLabel:
        params.action === 'save_mentor'
          ? (params.mentorName ? `Saved mentor: ${params.mentorName}` : 'Saved mentor')
          : params.action === 'send_message'
            ? 'Founder conversation'
            : 'Booked discovery call',
      lastArtifactResumeUrl: params.actionUrl,
      firstValueMentorId: params.mentorId ?? null,
      firstValueMentorName: params.mentorName ?? null,
      firstConversationId: params.conversationId ?? null,
    },
    true,
  );

  await trackRetentionEvent('activation_completed', {
    user_id: params.user.id,
    action: params.action,
    source: params.source,
    mentor_id: params.mentorId ?? null,
    mentor_name: params.mentorName ?? null,
    conversation_id: params.conversationId ?? null,
    action_url: params.actionUrl,
  });

  if (email) {
    const headlineByAction: Record<ActivationIntent, string> = {
      save_mentor: `You saved ${params.mentorName ?? 'a mentor'} - we will keep this path warm for you`,
      send_message: `Your conversation is open - come back for the reply`,
      book_call: `Your discovery call path is active - use it to unlock your next move`,
    };

    const bodyByAction: Record<ActivationIntent, string> = {
      save_mentor: 'We will bring you back when your saved mentors are the fastest way to make progress.',
      send_message: 'Messages are the stickiest part of the platform. Keep the thread moving and you will always have a reason to return.',
      book_call: 'Use your next call to pressure-test one decision, not ten. The strongest follow-up usually happens right after the booking.',
    };

    await sendRetentionEmail({
      userId: params.user.id,
      email,
      fullName: profileState?.full_name ?? params.user.user_metadata?.full_name ?? null,
      niche: profileState?.creative_niche ?? null,
      sequence: 'activation_day0',
      activationIntent: params.action,
      mentorId: params.mentorId,
      mentorName: params.mentorName,
      ctaUrl: params.actionUrl,
      ctaLabel:
        params.action === 'send_message'
          ? 'Open Messages'
          : params.action === 'book_call'
            ? 'Review Mentor Options'
            : 'Open Saved Mentors',
      contextHeadline: headlineByAction[params.action],
      contextBody: bodyByAction[params.action],
    });
  }

  return nextState;
}

export async function markFirstArtifactCreated(params: MarkArtifactCreatedParams) {
  const createdAt = new Date().toISOString();

  const nextState = await updateUserPreferences(params.userId, {
    activationCompletedAt: createdAt,
    firstValueAction: params.artifactType,
    firstValueActionAt: createdAt,
    firstValueActionSource: params.source ?? 'product',
    firstValueActionUrl: params.resumeUrl,
    firstArtifactType: params.artifactType,
    firstArtifactCreatedAt: createdAt,
    firstArtifactId: params.artifactId ?? null,
    firstArtifactLabel: params.label ?? null,
    firstArtifactResumeUrl: params.resumeUrl,
    lastArtifactType: params.artifactType,
    lastArtifactCreatedAt: createdAt,
    lastArtifactId: params.artifactId ?? null,
    lastArtifactLabel: params.label ?? null,
    lastArtifactResumeUrl: params.resumeUrl,
  }, true);

  // FIX(retention): retention-system — first artifact creation now lands in durable activity logs so the admin experiment dashboard can measure signup-to-artifact conversion by variant.
  await trackRetentionEvent('first_artifact_created', {
    user_id: params.userId,
    artifactType: params.artifactType,
    artifactId: params.artifactId ?? null,
    resumeUrl: params.resumeUrl,
    label: params.label ?? null,
    source: params.source ?? 'product',
    activationGateVariant: nextState.user_preferences?.activationGateVariant ?? null,
  });

  return nextState;
}

export async function saveValidationDraftArtifact(userId: string, draft: ValidationDraftArtifact) {
  const profileState = await getProfileRetentionState(userId);
  const existingPreferences = profileState?.user_preferences ?? {};
  const hasFirstArtifact = typeof existingPreferences.firstArtifactType === 'string';

  return updateUserPreferences(userId, {
    validationDraft: draft,
    ...(hasFirstArtifact ? {} : {
      activationCompletedAt: draft.updatedAt,
      firstArtifactType: 'validation_draft',
      firstArtifactCreatedAt: draft.updatedAt,
      firstArtifactId: draft.id,
      firstArtifactLabel: 'Validation sprint draft',
      firstArtifactResumeUrl: '/decision-sprint',
    }),
    lastArtifactType: 'validation_draft',
    lastArtifactCreatedAt: draft.updatedAt,
    lastArtifactId: draft.id,
    lastArtifactLabel: 'Validation sprint draft',
    lastArtifactResumeUrl: '/decision-sprint',
  }, !hasFirstArtifact);
}

export async function loadValidationDraftArtifact(userId: string): Promise<ValidationDraftArtifact | null> {
  const profileState = await getProfileRetentionState(userId);
  const value = profileState?.user_preferences?.validationDraft;

  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.activeIdeaId !== 'string' ||
    !Array.isArray(candidate.ideas) ||
    typeof candidate.updatedAt !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    chosenIdeaId: typeof candidate.chosenIdeaId === 'string' ? candidate.chosenIdeaId : null,
    activeIdeaId: candidate.activeIdeaId,
    ideas: candidate.ideas,
    updatedAt: candidate.updatedAt,
  };
}

export function buildActivationSummary(intent: ActivationIntent) {
  switch (intent) {
    case 'find_mentor':
      return {
        title: 'Find one mentor worth returning to',
        description: 'Use mentor discovery to create a saved profile, a message thread, or a booked call before you browse anything else.',
        actionUrl: getActivationRoute(intent),
        priorityLabel: 'First win',
      };
    case 'run_icp':
      return {
        title: 'Run a one-field ICP quickstart',
        description: 'Get to a first ICP recommendation fast, then expand only after you see value.',
        actionUrl: getActivationRoute(intent),
        priorityLabel: 'First win',
      };
    case 'start_validation':
      return {
        title: 'Start your validation sprint',
        description: 'Turn the next session into a concrete validation asset instead of another browse-and-bounce visit.',
        actionUrl: getActivationRoute(intent),
        priorityLabel: 'First win',
      };
    case 'save_mentor':
      return {
        title: 'Save one mentor before you leave',
        description: 'A saved mentor gives us a real asset to bring you back to in email and on the dashboard.',
        actionUrl: getActivationRoute(intent),
        priorityLabel: 'First win',
      };
    case 'send_message':
      return {
        title: 'Start one founder conversation',
        description: 'A live thread in Messages is the clearest retained-user behavior in the product today.',
        actionUrl: getActivationRoute(intent),
        priorityLabel: 'First win',
      };
    case 'book_call':
      return {
        title: 'Book one discovery call',
        description: 'Discovery calls are the strongest commercial-intent action in the current data.',
        actionUrl: getActivationRoute(intent),
        priorityLabel: 'First win',
      };
    default:
      return {
        title: 'Take one value action',
        description: 'Save a mentor, send a message, or book a discovery call before you explore the rest of the platform.',
        actionUrl: '/community',
        priorityLabel: 'First win',
      };
  }
}
