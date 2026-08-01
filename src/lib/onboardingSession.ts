import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  EMPTY_ONBOARDING_ANSWERS_V1,
  normalizeWorkingDays,
  type OnboardingAnswersV1,
  type OnboardingContextV1,
  type OnboardingSessionV1,
} from '@/lib/onboardingContext';
import { createRoutineConfig } from '@/lib/routineTemplates';

type BeginSessionParams = {
  source: string;
  plan?: string | null;
  device: 'mobile' | 'desktop';
};

function normalizeSession(value: unknown): OnboardingSessionV1 {
  const candidate = (value ?? {}) as Record<string, unknown>;
  const answers = candidate.answers && typeof candidate.answers === 'object' && !Array.isArray(candidate.answers)
    ? candidate.answers as Partial<OnboardingAnswersV1>
    : {};
  return {
    id: String(candidate.id ?? ''),
    user_id: String(candidate.user_id ?? ''),
    schema_version: Number(candidate.schema_version ?? 1),
    flow_version: candidate.flow_version === 'adaptive_v1' ? 'adaptive_v1' : 'control_v6',
    rollout_variant: candidate.rollout_variant === 'adaptive_v1' ? 'adaptive_v1' : 'control_v6',
    source: typeof candidate.source === 'string' ? candidate.source : 'direct',
    plan_snapshot: typeof candidate.plan_snapshot === 'string' ? candidate.plan_snapshot : null,
    device_snapshot: candidate.device_snapshot === 'mobile' ? 'mobile' : candidate.device_snapshot === 'desktop' ? 'desktop' : null,
    status: candidate.status === 'completed' || candidate.status === 'abandoned' ? candidate.status : 'in_progress',
    current_step: Number(candidate.current_step ?? 0),
    answers: { ...EMPTY_ONBOARDING_ANSWERS_V1, ...answers },
    derived_context: candidate.derived_context && typeof candidate.derived_context === 'object'
      ? candidate.derived_context as OnboardingContextV1
      : null,
    started_at: String(candidate.started_at ?? new Date().toISOString()),
    completed_at: typeof candidate.completed_at === 'string' ? candidate.completed_at : null,
    updated_at: String(candidate.updated_at ?? new Date().toISOString()),
  };
}

export async function beginOnboardingSession(params: BeginSessionParams) {
  const { data, error } = await supabase.rpc('begin_onboarding_v1' as never, {
    p_source: params.source,
    p_plan: params.plan ?? null,
    p_device: params.device,
  } as never);
  if (error) throw error;
  return normalizeSession(data);
}

export async function saveOnboardingProgress(params: {
  sessionId: string;
  currentStep: number;
  answers: Partial<OnboardingAnswersV1>;
}) {
  const { data, error } = await supabase.rpc('save_onboarding_progress_v1' as never, {
    p_session_id: params.sessionId,
    p_current_step: params.currentStep,
    p_answer_patch: params.answers as Json,
  } as never);
  if (error) throw error;
  return normalizeSession(data);
}

/**
 * Best-effort drop-off marker. Fired from a page-exit handler, so it must never
 * throw into the caller and must not block teardown: the founder is already
 * leaving. The session stays resumable -- see abandon_onboarding_v1.
 */
export async function abandonOnboardingSession(params: {
  sessionId: string;
  currentStep: number;
  reason?: string;
}) {
  try {
    await supabase.rpc('abandon_onboarding_v1' as never, {
      p_session_id: params.sessionId,
      p_current_step: params.currentStep,
      p_reason: params.reason ?? 'page_exit',
    } as never);
  } catch {
    // Drop-off is an analytics signal, never a blocker on leaving the page.
    // PostHog carries the same event over a beacon, so the funnel stays intact.
  }
}

export async function completeOnboardingSession(params: {
  sessionId: string;
  answers: OnboardingAnswersV1;
  context: OnboardingContextV1;
  profileUpdates: Record<string, unknown>;
  preferencePatch: Record<string, unknown>;
}) {
  const routineConfig = createRoutineConfig(
    params.context.routineGoal,
    new Date(),
    params.answers.weeklyCapacityHours,
    normalizeWorkingDays(params.answers.workingDays),
  );
  const { data, error } = await supabase.rpc('complete_onboarding_v1' as never, {
    p_session_id: params.sessionId,
    p_answers: params.answers as unknown as Json,
    p_context: params.context as unknown as Json,
    p_profile_updates: params.profileUpdates as Json,
    p_preference_patch: params.preferencePatch as Json,
    p_routine_goal: params.context.routineGoal,
    p_routine_config: routineConfig as unknown as Json,
  } as never);
  if (error) throw error;
  return normalizeSession(data);
}

export async function updateOnboardingFocus(params: {
  answers: Pick<
    OnboardingAnswersV1,
    'startupBrief' | 'primaryGoal' | 'blocker' | 'weeklyCapacityHours' | 'country'
  > & Partial<Pick<OnboardingAnswersV1, 'workingDays' | 'runwayMonths'>>;
  context: OnboardingContextV1;
}) {
  const routineConfig = createRoutineConfig(
    params.context.routineGoal,
    new Date(),
    params.answers.weeklyCapacityHours,
    normalizeWorkingDays(params.answers.workingDays),
  );
  const { data, error } = await supabase.rpc('update_onboarding_focus_v1' as never, {
    p_answer_patch: params.answers as Json,
    p_context: params.context as unknown as Json,
    p_routine_goal: params.context.routineGoal,
    p_routine_config: routineConfig as unknown as Json,
  } as never);
  if (error) throw error;
  return normalizeSession(data);
}

export async function getLatestOnboardingSession() {
  const { data, error } = await supabase
    .from('onboarding_sessions' as never)
    .select('*')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeSession(data) : null;
}
