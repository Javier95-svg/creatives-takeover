-- Onboarding data-quality pass v1.
--
-- Two changes, both aimed at the same problem: the canonical onboarding context
-- (onboarding_sessions.derived_context) is what personalizes every dashboard
-- surface, but today most founders never produce a high-fidelity copy of it.
--
--   1. Ramp the adaptive flow from 10% to 50%. control_v6 does not ask the
--      canonical questions -- it back-derives them through a lossy mapping
--      (see toCanonicalAnswers in src/components/OnboardingForm.tsx), which is
--      why it honestly tags itself dataCompleteness='legacy_partial'. Holding a
--      50/50 split keeps a real control arm so completion rate stays
--      measurable; go to 100 with a plain UPDATE once the cohorts confirm
--      adaptive does not hurt completion.
--
--   2. Record drop-off. Only the adaptive form emitted an abandonment signal,
--      so ~90% of onboarding traffic was invisible when it stalled.

UPDATE public.onboarding_rollout_config
SET
  adaptive_percent = 50,
  updated_at = now()
WHERE singleton = true
  AND adaptive_percent < 50;

-- Drop markers are only meaningful for sessions still eligible to resume.
CREATE INDEX IF NOT EXISTS onboarding_sessions_abandoned_idx
  ON public.onboarding_sessions (abandoned_at DESC, rollout_variant)
  WHERE status = 'in_progress' AND abandoned_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.abandon_onboarding_v1(
  p_session_id uuid,
  p_current_step integer,
  p_reason text DEFAULT 'page_exit'
)
RETURNS public.onboarding_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_session public.onboarding_sessions;
  v_reason text := left(COALESCE(NULLIF(trim(p_reason), ''), 'page_exit'), 40);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_current_step < 0 OR p_current_step > 20 THEN
    RAISE EXCEPTION 'Invalid onboarding step' USING ERRCODE = '22023';
  END IF;

  -- status deliberately stays 'in_progress'. The partial unique index
  -- onboarding_sessions_one_active_per_user_idx is what lets a founder resume
  -- the same session, and flipping to 'abandoned' here would silently discard
  -- their answers on the next visit. abandoned_at is the drop marker;
  -- complete_onboarding_v1 already clears it when they come back and finish.
  UPDATE public.onboarding_sessions
  SET
    abandoned_at = now(),
    current_step = GREATEST(current_step, p_current_step)
  WHERE id = p_session_id
    AND user_id = v_user
    AND status = 'in_progress'
  RETURNING * INTO v_session;

  IF NOT FOUND THEN
    -- Already completed, already abandoned by another tab, or not ours.
    RETURN NULL;
  END IF;

  INSERT INTO public.user_activity_log (
    user_id, activity_type, activity_data, page_path,
    source_tool, source_entity_type, source_entity_id, event_key
  ) VALUES (
    v_user,
    'onboarding_abandoned',
    jsonb_build_object(
      'onboarding_session_id', v_session.id,
      'flow_version', v_session.flow_version,
      'rollout_variant', v_session.rollout_variant,
      'source', v_session.source,
      'plan', v_session.plan_snapshot,
      'device', v_session.device_snapshot,
      'last_step', p_current_step,
      'total_steps', CASE WHEN v_session.flow_version = 'adaptive_v1' THEN 7 ELSE 8 END,
      'reason', v_reason
    ),
    '/onboarding',
    'onboarding',
    'onboarding_session',
    v_session.id::text,
    -- Keyed by step so a founder who stalls at several steps is recorded once
    -- per step, but re-dropping at the same step does not inflate the counts.
    'onboarding:' || v_session.id::text || ':abandoned:' || p_current_step::text
  )
  ON CONFLICT (user_id, event_key) DO NOTHING;

  RETURN v_session;
END;
$$;

REVOKE ALL ON FUNCTION public.abandon_onboarding_v1(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abandon_onboarding_v1(uuid, integer, text) TO authenticated;
