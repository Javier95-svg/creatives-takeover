import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import { requiresGuidedOnboarding } from '@/lib/guidedOnboarding';
import { triggerEmailSequenceEvent } from '@/lib/emailSequences';
import { mapFounderStageToBizMapStage, STAGES, type FounderStageId } from '@/lib/stageDiagnostic';
import { parseActivationJourney, type ActivationJourneyV2 } from '@/lib/activationJourneyV2';

export type ActivationIntent =
  | 'build_demo'
  | 'find_mentor'
  | 'run_icp'
  | 'start_validation'
  | 'build_mvp'
  | 'plan_gtm'
  | 'log_traction'
  | 'analyze_pitch_deck'
  | 'unlock_pitch_deck'
  | 'unlock_tech_stack'
  | 'unlock_insighta'
  | 'save_mentor'
  | 'send_message'
  | 'book_call';
export type ActivationArtifactIntent = 'save_mentor' | 'send_message' | 'book_call';
export type ActivationGateVariant = 'control' | 'forced_gate';
export type RetentionArtifactType =
  | 'demo_studio_draft'
  | 'pitch_deck_analysis'
  | 'tech_stack_report'
  | 'insighta_readiness'
  | 'mentor_saved'
  | 'mentor_message'
  | 'discovery_call'
  | 'icp_analysis'
  | 'validation_draft'
  | 'pmf_report'
  | 'mvp_scope'
  | 'gtm_plan'
  | 'traction_weekly_log';
export type RetentionSequence =
  | 'activation_day0'
  | 'activation_day2'
  | 'activation_day7'
  | 'weekly_digest'
  | 'weekly_scorecard'
  | 'activation_nudge'
  | 'progress_nudge'
  | 'reengagement'
  | 'reengagement_30d'
  | 'reengagement_60d'
  | 'milestone_celebration'
  | 'profile_incomplete_nudge'
  | 'celebration'
  | 'exit_intent_reminder';

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
  startupSectors?: string[];
  supportAreasNeeded?: string[];
  country?: string;
  assignedStage?: FounderStageId;
  quizAnswersV3?: Record<string, unknown>;
  activationJourney?: ActivationJourneyV2;
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
  build_demo: '/demo-studio/try?activation=1',
  find_mentor: '/mentorship?mentorSource=onboarding&activationIntent=find_mentor',
  run_icp: '/icp-builder?activation=1',
  start_validation: '/decision-sprint?activation=1',
  build_mvp: '/mvp-scope?activation=1',
  plan_gtm: '/go-to-market?activation=1',
  log_traction: '/traction-engine?activation=1',
  analyze_pitch_deck: '/pitch-deck-analyzer?activation=1',
  unlock_pitch_deck: '/pitch-deck-analyzer?hydrate=1',
  unlock_tech_stack: '/tech-stack?hydrate=1',
  unlock_insighta: '/insighta-test?hydrate=1',
  save_mentor: '/mentorship?mentorSource=onboarding&activationIntent=save_mentor',
  send_message: '/mentorship?mentorSource=onboarding&activationIntent=send_message',
  book_call: '/mentorship?mentorSource=onboarding&activationIntent=book_call',
};

const SIGNUP_SOURCE_ACTIVATION_INTENT: Record<string, ActivationIntent> = {
  'demo-try': 'build_demo',
  'pitch-deck-unlock': 'unlock_pitch_deck',
  'pitch-deck-analyzer': 'unlock_pitch_deck',
  'tech-stack': 'unlock_tech_stack',
  'insighta-test': 'unlock_insighta',
};

export function getActivationRoute(intent: ActivationIntent) {
  return ACTIVATION_ROUTE_BY_INTENT[intent];
}

export function getActivationIntentFromSignupSource(source?: string | null): ActivationIntent | null {
  if (!source) return null;
  return SIGNUP_SOURCE_ACTIVATION_INTENT[source] ?? null;
}

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getActivationCompletedTrigger(action: ActivationArtifactIntent) {
  if (action === 'save_mentor') return 'mentor_saved';
  if (action === 'send_message') return 'first_message_sent';
  return 'first_artifact_created';
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
    requiresGuidedOnboarding: requiresGuidedOnboarding(profileState?.user_preferences),
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
  const bizMapStage = params.assignedStage ? mapFounderStageToBizMapStage(params.assignedStage) : null;

  const profileUpdates: Record<string, unknown> = {
    business_stage: params.businessStage,
    quiz_current_stage: params.businessStage,
    quiz_biggest_challenge: params.primaryPain,
    onboarding_completed: true,
    startup_industry: params.startupSectors ?? undefined,
    country: params.country?.trim() || undefined,
  };

  if (params.assignedStage) {
    profileUpdates.assigned_stage = params.assignedStage;
    profileUpdates.quiz_completed = true;
    profileUpdates.quiz_completed_at = startedAt;
  }

  if (params.quizAnswersV3) {
    profileUpdates.quiz_answers_v2 = params.quizAnswersV3;
  }

  const preferencePatch = {
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
    founderStage: params.assignedStage ?? null,
    founderStageLabel: params.assignedStage ? STAGES[params.assignedStage].name : null,
    bizMapStage,
    primaryPain: params.primaryPain,
    startupSectors: params.startupSectors ?? [],
    supportAreasNeeded: params.supportAreasNeeded ?? [],
    country: params.country?.trim() || null,
    ...(params.activationJourney ? { activationJourney: params.activationJourney } : {}),
  };

  if (params.activationJourney) {
    const { error } = await supabase.rpc('start_activation_journey_v2', {
      p_profile_updates: profileUpdates,
      p_preference_patch: preferencePatch,
    });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', params.userId);
    if (error) throw error;
    await updateUserPreferences(params.userId, preferencePatch, true);
  }

  if (!params.activationJourney) await trackRetentionEvent('activation_started', {
    user_id: params.userId,
    business_stage: params.businessStage,
    primary_pain: params.primaryPain,
    activation_intent: params.activationIntent,
    source: 'onboarding',
  });

  await triggerEmailSequenceEvent('onboarding_complete', params.userId);
}

export type ActivationJourneyEvent =
  | 'onboarding_completed'
  | 'activation_destination_viewed'
  | 'activation_first_input_submitted'
  | 'activation_first_output_generated'
  | 'activation_first_artifact_saved'
  | 'activation_completed'
  | 'activation_goal_changed'
  | 'activation_exited';

const activationJourneyEventsSent = new Set<string>();

export async function trackActivationJourneyEvent(params: {
  userId: string;
  journey: ActivationJourneyV2;
  event: ActivationJourneyEvent;
  properties?: RetentionEventProperties;
}) {
  const eventKey = `${params.journey.journeyId}:${params.event}`;
  const occurredAt = new Date().toISOString();
  const fieldByEvent: Partial<Record<ActivationJourneyEvent, keyof ActivationJourneyV2>> = {
    activation_destination_viewed: 'destinationViewedAt',
    activation_first_input_submitted: 'firstInputAt',
    activation_first_output_generated: 'firstOutputAt',
    activation_first_artifact_saved: 'firstArtifactAt',
    activation_completed: 'completedAt',
  };
  const timestampField = fieldByEvent[params.event];
  const nextJourney: ActivationJourneyV2 = {
    ...params.journey,
    ...(timestampField && !params.journey[timestampField] ? { [timestampField]: occurredAt } : {}),
    ...(params.event === 'activation_completed' ? { status: 'completed' as const } : {}),
  };

  if (!activationJourneyEventsSent.has(eventKey)) {
    activationJourneyEventsSent.add(eventKey);
    captureEvent(params.event, {
      journey_id: params.journey.journeyId,
      activation_intent: params.journey.selectedIntent,
      journey_source: params.journey.source,
      ...params.properties,
    });
  }

  await Promise.all([
    updateUserPreferences(params.userId, { activationJourney: nextJourney }),
    supabase.functions.invoke('track-activity', {
      body: {
        activity_type: params.event,
        activity_data: {
          journey_id: params.journey.journeyId,
          activation_intent: params.journey.selectedIntent,
          journey_source: params.journey.source,
          ...params.properties,
        },
        source_tool: 'onboarding',
        source_entity_type: 'activation_journey',
        source_entity_id: params.journey.journeyId,
        event_key: eventKey,
        page_path: typeof window !== 'undefined' ? window.location.pathname : null,
      },
    }),
  ]);

  return nextJourney;
}

export async function trackCurrentActivationJourneyEvent(
  userId: string,
  event: ActivationJourneyEvent,
  properties: RetentionEventProperties = {},
) {
  const state = await getProfileRetentionState(userId);
  const journey = parseActivationJourney(state?.user_preferences?.activationJourney);
  if (!journey || journey.status !== 'active') return null;
  return trackActivationJourneyEvent({ userId, journey, event, properties });
}

export async function applySignupActivationSource(params: {
  userId: string;
  source?: string | null;
  returnUrl?: string | null;
}) {
  const activationIntent = getActivationIntentFromSignupSource(params.source);
  if (!activationIntent) return null;

  const profileState = await getProfileRetentionState(params.userId);
  const preferences = profileState?.user_preferences ?? {};
  const hasFirstArtifact = typeof preferences.firstArtifactType === 'string';
  if (hasFirstArtifact) return profileState;

  const startedAt = new Date().toISOString();
  const activationGateVariant =
    preferences.activationGateVariant === 'control' || preferences.activationGateVariant === 'forced_gate'
      ? preferences.activationGateVariant
      : await ensureActivationGateVariant(params.userId);

  const selectedPath = params.returnUrl ?? getActivationRoute(activationIntent);
  const nextState = await updateUserPreferences(params.userId, {
    activationIntent,
    activationGateVariant,
    activationStartedAt: typeof preferences.activationStartedAt === 'string'
      ? preferences.activationStartedAt
      : startedAt,
    activationSource: params.source ?? 'signup',
    activationReturnUrl: selectedPath,
  });

  await trackRetentionEvent('activation_started', {
    user_id: params.userId,
    activation_intent: activationIntent,
    source: params.source ?? 'signup',
    selected_path: selectedPath,
  });

  return nextState;
}

export async function completeActivationJourney(params: CompleteActivationParams) {
  const completedAt = new Date().toISOString();
  const profileState = await getProfileRetentionState(params.user.id);
  const activationJourney = parseActivationJourney(profileState?.user_preferences?.activationJourney);
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

  const completionProperties = {
    trigger: getActivationCompletedTrigger(params.action),
    user_id: params.user.id,
    action: params.action,
    source: params.source,
    mentor_id: params.mentorId ?? null,
    mentor_name: params.mentorName ?? null,
    conversation_id: params.conversationId ?? null,
    action_url: params.actionUrl,
  };
  const artifactProperties = {
    user_id: params.user.id,
    activation_intent: params.action,
    artifact_type:
      params.action === 'save_mentor'
        ? 'mentor_saved'
        : params.action === 'send_message'
          ? 'mentor_message'
          : 'discovery_call',
    artifact_id: params.mentorId ?? params.conversationId ?? null,
    resume_url: params.actionUrl,
    source: params.source,
  };
  if (activationJourney) {
    const completedJourney = { ...activationJourney, firstArtifactAt: completedAt, completedAt, status: 'completed' as const };
    await trackActivationJourneyEvent({ userId: params.user.id, journey: activationJourney, event: 'activation_first_artifact_saved', properties: artifactProperties });
    await trackActivationJourneyEvent({ userId: params.user.id, journey: completedJourney, event: 'activation_completed', properties: completionProperties });
  } else {
    await trackRetentionEvent('activation_completed', completionProperties);
    await trackRetentionEvent('activation_first_artifact_saved', artifactProperties);
  }

  if (email) {
    const headlineByAction: Record<ActivationArtifactIntent, string> = {
      save_mentor: `You saved ${params.mentorName ?? 'a mentor'} - we will keep this path warm for you`,
      send_message: `Your conversation is open - come back for the reply`,
      book_call: `Your discovery call path is active - use it to unlock your next move`,
    };

    const bodyByAction: Record<ActivationArtifactIntent, string> = {
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
  const existingProfileState = await getProfileRetentionState(params.userId);
  const hadFirstArtifact = typeof existingProfileState?.user_preferences?.firstArtifactType === 'string';
  const activationJourney = parseActivationJourney(existingProfileState?.user_preferences?.activationJourney);
  const completedJourney = activationJourney ? {
    ...activationJourney,
    firstArtifactAt: activationJourney.firstArtifactAt ?? createdAt,
    completedAt: activationJourney.completedAt ?? createdAt,
    status: 'completed' as const,
  } : null;

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
    ...(completedJourney ? { activationJourney: completedJourney } : {}),
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

  if (activationJourney) {
    const eventProperties = { artifact_type: params.artifactType, artifact_id: params.artifactId ?? null, resume_url: params.resumeUrl, label: params.label ?? null, source: params.source ?? 'product' };
    await trackActivationJourneyEvent({ userId: params.userId, journey: activationJourney, event: 'activation_first_artifact_saved', properties: eventProperties });
    if (!hadFirstArtifact) await trackActivationJourneyEvent({ userId: params.userId, journey: completedJourney ?? activationJourney, event: 'activation_completed', properties: { ...eventProperties, trigger: 'first_artifact_created' } });
  } else {
    await trackRetentionEvent('activation_first_artifact_saved', {
      user_id: params.userId,
      artifact_type: params.artifactType,
      artifact_id: params.artifactId ?? null,
      resume_url: params.resumeUrl,
      label: params.label ?? null,
      source: params.source ?? 'product',
    });
    if (!hadFirstArtifact) await trackRetentionEvent('activation_completed', {
      trigger: 'first_artifact_created', user_id: params.userId, artifact_type: params.artifactType,
      artifact_id: params.artifactId ?? null, resume_url: params.resumeUrl, source: params.source ?? 'product',
    });
  }

  return nextState;
}

export async function saveValidationDraftArtifact(userId: string, draft: ValidationDraftArtifact) {
  const profileState = await getProfileRetentionState(userId);
  const existingPreferences = profileState?.user_preferences ?? {};
  const hasFirstArtifact = typeof existingPreferences.firstArtifactType === 'string';
  const activationJourney = parseActivationJourney(existingPreferences.activationJourney);
  const completedJourney = activationJourney
    ? { ...activationJourney, firstArtifactAt: draft.updatedAt, completedAt: draft.updatedAt, status: 'completed' as const }
    : null;

  const nextState = await updateUserPreferences(userId, {
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
    ...(completedJourney ? { activationJourney: completedJourney } : {}),
  }, !hasFirstArtifact);

  if (!activationJourney) {
    await trackRetentionEvent('activation_first_artifact_saved', {
      user_id: userId,
      artifact_type: 'validation_draft',
      artifact_id: draft.id,
      resume_url: '/decision-sprint',
      label: 'Validation sprint draft',
      source: 'decision_sprint',
    });
    if (!hasFirstArtifact) await trackRetentionEvent('activation_completed', {
      trigger: 'first_artifact_created', user_id: userId, artifact_type: 'validation_draft', artifact_id: draft.id,
      resume_url: '/decision-sprint', source: 'decision_sprint',
    });
  }

  if (activationJourney) {
    const properties = { artifact_type: 'validation_draft', artifact_id: draft.id, resume_url: '/decision-sprint', source: 'decision_sprint' };
    await trackActivationJourneyEvent({ userId, journey: activationJourney, event: 'activation_first_artifact_saved', properties });
    if (!hasFirstArtifact) await trackActivationJourneyEvent({ userId, journey: completedJourney ?? activationJourney, event: 'activation_completed', properties: { ...properties, trigger: 'first_artifact_created' } });
  }

  return nextState;
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
    case 'build_demo':
      return {
        title: 'Build your demo and pitch video',
        description: 'Turn a few screenshots into a live product demo first, then save it so your dashboard has a real launch asset to build around.',
        actionUrl: getActivationRoute(intent),
        priorityLabel: 'First win',
      };
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
    case 'unlock_pitch_deck':
      return {
        title: 'Unlock your pitch deck analysis',
        description: 'Return to the analysis you already generated, save it, and use the full recommendations as your first founder artifact.',
        actionUrl: getActivationRoute(intent),
        priorityLabel: 'First win',
      };
    case 'unlock_tech_stack':
      return {
        title: 'Save your tech stack budget',
        description: 'Return to your selected stack, save the monthly budget, and unlock the full build plan after signup.',
        actionUrl: getActivationRoute(intent),
        priorityLabel: 'First win',
      };
    case 'unlock_insighta':
      return {
        title: 'Finish your Insighta diagnostic',
        description: 'Return to your readiness answers and generate the full diagnostic from the context you already entered.',
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
        actionUrl: '/mentorship',
        priorityLabel: 'First win',
      };
  }
}
