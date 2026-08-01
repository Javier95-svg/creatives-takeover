-- Add an urgency tier to the recommendation learning segments.
--
-- Runway is the strongest prioritization signal a founder carries: the same
-- stage with the same blocker warrants very different advice at 2 months of
-- runway than at 2 years. Onboarding now captures it (answers.runwayMonths)
-- and derives derived_context.urgencyBand from it.
--
-- The new key is APPENDED, never inserted. Both readers treat array position
-- as specificity:
--   * bestPriorByFamily in supabase/functions/_shared/recommendation-policy-v2.ts
--   * the array_position(...) DESC ordering in
--     20260730180000_collective_recommendation_learning_v1.sql
-- so every previously aggregated segment_key keeps its exact meaning and its
-- accumulated priors. The urgency tier simply starts empty and takes over for a
-- cohort once it has matured enough exposures to beat the tier below it.
--
-- This function must stay byte-compatible with contextSegmentKeys() in
-- _shared/recommendation-policy-v2.ts -- it writes the priors that function
-- reads back. Changing one without the other silently splits the learning set.

-- Surface the band the segment key above needs. Read from the onboarding
-- session's derived_context, falling back to the raw runway answer so sessions
-- completed before urgencyBand existed still segment correctly.
CREATE OR REPLACE FUNCTION public.get_recommendation_context_v1(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.onboarding_sessions;
  v_stage public.founder_stage_state;
  v_plan text := 'rookie';
  v_capacity numeric;
  v_urgency text;
BEGIN
  SELECT * INTO v_session
  FROM public.onboarding_sessions
  WHERE user_id = p_user AND status = 'completed'
  ORDER BY completed_at DESC NULLS LAST
  LIMIT 1;

  SELECT * INTO v_stage
  FROM public.founder_stage_state
  WHERE user_id = p_user;

  SELECT COALESCE(NULLIF(subscription_tier, ''), 'rookie')
  INTO v_plan
  FROM public.profiles
  WHERE id = p_user;

  v_capacity := CASE
    WHEN COALESCE(v_session.answers->>'weeklyCapacityHours', '') ~ '^[0-9]+([.][0-9]+)?$'
      THEN (v_session.answers->>'weeklyCapacityHours')::numeric
    ELSE NULL
  END;

  v_urgency := NULLIF(v_session.derived_context->>'urgencyBand', '');
  IF v_urgency IS NULL THEN
    v_urgency := CASE v_session.answers->>'runwayMonths'
      WHEN 'under_3' THEN 'critical'
      WHEN '3_6' THEN 'high'
      WHEN '6_12' THEN 'moderate'
      WHEN 'over_12' THEN 'stable'
      WHEN 'not_applicable' THEN 'stable'
      ELSE NULL
    END;
  END IF;

  RETURN jsonb_strip_nulls(jsonb_build_object(
    'stage', COALESCE(
      v_stage.current_stage,
      CASE
        WHEN COALESCE(v_session.derived_context->>'assignedStage', '') ~ '^[1-6]$'
          THEN (v_session.derived_context->>'assignedStage')::integer
        ELSE NULL
      END
    ),
    'loop', NULLIF(v_session.derived_context->>'founderLoop', ''),
    'goal', NULLIF(v_session.answers->>'primaryGoal', ''),
    'blocker', NULLIF(v_session.answers->>'blocker', ''),
    'capacityBand', CASE
      WHEN v_capacity IS NULL THEN NULL
      WHEN v_capacity <= 2 THEN 'micro'
      WHEN v_capacity <= 5 THEN 'light'
      WHEN v_capacity <= 10 THEN 'standard'
      ELSE 'intensive'
    END,
    'plan', lower(v_plan),
    'urgencyBand', v_urgency,
    'confidenceBand', v_stage.confidence_band
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.get_recommendation_context_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recommendation_context_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.recommendation_segment_keys_v1(p_context jsonb)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    'global',
    'stage:' || COALESCE(NULLIF(p_context->>'stage', ''), 'unknown'),
    'stage:' || COALESCE(NULLIF(p_context->>'stage', ''), 'unknown')
      || '|goal:' || COALESCE(NULLIF(p_context->>'goal', ''), 'unknown'),
    'stage:' || COALESCE(NULLIF(p_context->>'stage', ''), 'unknown')
      || '|goal:' || COALESCE(NULLIF(p_context->>'goal', ''), 'unknown')
      || '|blocker:' || COALESCE(NULLIF(p_context->>'blocker', ''), 'unknown'),
    'stage:' || COALESCE(NULLIF(p_context->>'stage', ''), 'unknown')
      || '|goal:' || COALESCE(NULLIF(p_context->>'goal', ''), 'unknown')
      || '|blocker:' || COALESCE(NULLIF(p_context->>'blocker', ''), 'unknown')
      || '|capacity:' || COALESCE(NULLIF(p_context->>'capacityBand', ''), 'unknown')
      || '|plan:' || COALESCE(NULLIF(p_context->>'plan', ''), 'rookie'),
    'stage:' || COALESCE(NULLIF(p_context->>'stage', ''), 'unknown')
      || '|goal:' || COALESCE(NULLIF(p_context->>'goal', ''), 'unknown')
      || '|blocker:' || COALESCE(NULLIF(p_context->>'blocker', ''), 'unknown')
      || '|capacity:' || COALESCE(NULLIF(p_context->>'capacityBand', ''), 'unknown')
      || '|plan:' || COALESCE(NULLIF(p_context->>'plan', ''), 'rookie')
      || '|urgency:' || COALESCE(NULLIF(p_context->>'urgencyBand', ''), 'unknown')
  ]::text[];
$$;

REVOKE ALL ON FUNCTION public.recommendation_segment_keys_v1(jsonb) FROM PUBLIC, anon;
