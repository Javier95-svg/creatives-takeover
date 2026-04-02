import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';

export type ActivationIntent = 'save_mentor' | 'send_message' | 'book_call';
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
  action: ActivationIntent;
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
  activationIntent?: ActivationIntent;
  mentorId?: string;
  mentorName?: string;
  ctaUrl?: string;
  contextHeadline?: string;
  contextBody?: string;
  savedMentorCount?: number;
  unreadMessageCount?: number;
}

const ACTIVATION_ROUTE_BY_INTENT: Record<ActivationIntent, string> = {
  save_mentor: '/community?mentorSource=onboarding&activationIntent=save_mentor',
  send_message: '/community?mentorSource=onboarding&activationIntent=send_message',
  book_call: '/community?mentorSource=onboarding&activationIntent=book_call',
};

export function getActivationRoute(intent: ActivationIntent) {
  return ACTIVATION_ROUTE_BY_INTENT[intent];
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

export async function startActivationJourney(params: StartActivationParams) {
  const startedAt = new Date().toISOString();

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
    activationStartedAt: startedAt,
    activationCompletedAt: null,
    activationSource: 'onboarding',
    firstValueAction: null,
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
      contextHeadline: headlineByAction[params.action],
      contextBody: bodyByAction[params.action],
    });
  }

  return nextState;
}

export function buildActivationSummary(intent: ActivationIntent) {
  switch (intent) {
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
