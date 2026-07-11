-- Onboarding-to-activation V2: atomic journey persistence and admin funnel reporting.

CREATE INDEX IF NOT EXISTS user_activity_log_activation_journey_idx
  ON public.user_activity_log (source_entity_type, source_entity_id, activity_type, created_at)
  WHERE source_entity_type = 'activation_journey';

CREATE OR REPLACE FUNCTION public.start_activation_journey_v2(
  p_profile_updates jsonb,
  p_preference_patch jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles p
  SET
    business_stage = COALESCE(p_profile_updates->>'business_stage', p.business_stage),
    quiz_current_stage = COALESCE(p_profile_updates->>'quiz_current_stage', p.quiz_current_stage),
    quiz_biggest_challenge = COALESCE(p_profile_updates->>'quiz_biggest_challenge', p.quiz_biggest_challenge),
    onboarding_completed = true,
    startup_industry = CASE
      WHEN jsonb_typeof(p_profile_updates->'startup_industry') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_profile_updates->'startup_industry'))
      ELSE p.startup_industry
    END,
    country = COALESCE(NULLIF(p_profile_updates->>'country', ''), p.country),
    assigned_stage = COALESCE((p_profile_updates->>'assigned_stage')::integer, p.assigned_stage),
    quiz_completed = COALESCE((p_profile_updates->>'quiz_completed')::boolean, p.quiz_completed),
    quiz_completed_at = CASE WHEN COALESCE((p_profile_updates->>'quiz_completed')::boolean, false) THEN now() ELSE p.quiz_completed_at END,
    quiz_answers_v2 = COALESCE(p_profile_updates->'quiz_answers_v2', p.quiz_answers_v2),
    user_preferences = COALESCE(p.user_preferences, '{}'::jsonb) || COALESCE(p_preference_patch, '{}'::jsonb),
    updated_at = now()
  WHERE p.id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.start_activation_journey_v2(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_activation_journey_v2(jsonb, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_activation_funnel_v2(
  p_from timestamptz,
  p_to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to THEN
    RAISE EXCEPTION 'Invalid reporting range' USING ERRCODE = '22023';
  END IF;

  WITH events AS (
    SELECT
      ual.user_id,
      ual.source_entity_id AS journey_id,
      ual.activity_type,
      ual.created_at,
      ual.activity_data->>'activation_intent' AS intent,
      ual.activity_data->>'assigned_stage' AS stage,
      ual.activity_data->>'journey_source' AS source,
      ual.activity_data->>'plan' AS plan,
      ual.activity_data->>'device' AS device
    FROM public.user_activity_log ual
    WHERE ual.source_entity_type = 'activation_journey'
      AND ual.source_entity_id IS NOT NULL
      AND ual.created_at >= p_from
      AND ual.created_at <= p_to + interval '24 hours'
  ), journeys AS (
    SELECT
      user_id, journey_id,
      min(created_at) FILTER (WHERE activity_type='onboarding_completed') AS completed_at,
      min(created_at) FILTER (WHERE activity_type='activation_destination_viewed') AS destination_at,
      min(created_at) FILTER (WHERE activity_type='activation_first_input_submitted') AS input_at,
      min(created_at) FILTER (WHERE activity_type='activation_first_output_generated') AS output_at,
      min(created_at) FILTER (WHERE activity_type='activation_first_artifact_saved') AS artifact_at,
      max(intent) FILTER (WHERE intent IS NOT NULL) AS intent,
      max(stage) FILTER (WHERE stage IS NOT NULL) AS stage,
      max(source) FILTER (WHERE source IS NOT NULL) AS source,
      max(plan) FILTER (WHERE plan IS NOT NULL) AS plan,
      max(device) FILTER (WHERE device IS NOT NULL) AS device
    FROM events
    GROUP BY user_id, journey_id
  ), cohort AS (
    SELECT * FROM journeys WHERE completed_at >= p_from AND completed_at <= p_to
  ), by_intent AS (
    SELECT COALESCE(intent, 'unknown') AS intent, count(*)::integer AS journeys,
      count(*) FILTER (WHERE input_at <= completed_at + interval '10 minutes')::integer AS input_10m,
      count(*) FILTER (WHERE artifact_at <= completed_at + interval '30 minutes')::integer AS artifact_30m
    FROM cohort GROUP BY COALESCE(intent, 'unknown')
  )
  SELECT jsonb_build_object(
    'cohortJourneys', (SELECT count(*) FROM cohort),
    'uniqueUsers', (SELECT count(DISTINCT user_id) FROM cohort),
    'destinationViewed', (SELECT count(*) FROM cohort WHERE destination_at IS NOT NULL),
    'destinationFailures', (SELECT count(*) FROM cohort WHERE destination_at IS NULL OR destination_at > completed_at + interval '2 minutes'),
    'idleWithin10Minutes', (SELECT count(*) FROM cohort WHERE input_at IS NULL OR input_at > completed_at + interval '10 minutes'),
    'firstInputWithin10Minutes', (SELECT count(*) FROM cohort WHERE input_at <= completed_at + interval '10 minutes'),
    'firstOutputGenerated', (SELECT count(*) FROM cohort WHERE output_at IS NOT NULL),
    'artifactWithin30Minutes', (SELECT count(*) FROM cohort WHERE artifact_at <= completed_at + interval '30 minutes'),
    'artifactWithin24Hours', (SELECT count(*) FROM cohort WHERE artifact_at <= completed_at + interval '24 hours'),
    'byIntent', COALESCE((SELECT jsonb_agg(to_jsonb(by_intent) ORDER BY journeys DESC) FROM by_intent), '[]'::jsonb),
    'byStage', COALESCE((SELECT jsonb_agg(row_data ORDER BY (row_data->>'journeys')::integer DESC) FROM (
      SELECT jsonb_build_object('stage', COALESCE(stage, 'unknown'), 'journeys', count(*)) AS row_data FROM cohort GROUP BY COALESCE(stage, 'unknown')
    ) grouped), '[]'::jsonb),
    'bySource', COALESCE((SELECT jsonb_agg(row_data ORDER BY (row_data->>'journeys')::integer DESC) FROM (
      SELECT jsonb_build_object('source', COALESCE(source, 'unknown'), 'journeys', count(*)) AS row_data FROM cohort GROUP BY COALESCE(source, 'unknown')
    ) grouped), '[]'::jsonb),
    'byPlan', COALESCE((SELECT jsonb_agg(row_data ORDER BY (row_data->>'journeys')::integer DESC) FROM (
      SELECT jsonb_build_object('plan', COALESCE(plan, 'unknown'), 'journeys', count(*)) AS row_data FROM cohort GROUP BY COALESCE(plan, 'unknown')
    ) grouped), '[]'::jsonb),
    'byDevice', COALESCE((SELECT jsonb_agg(row_data ORDER BY (row_data->>'journeys')::integer DESC) FROM (
      SELECT jsonb_build_object('device', COALESCE(device, 'unknown'), 'journeys', count(*)) AS row_data FROM cohort GROUP BY COALESCE(device, 'unknown')
    ) grouped), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_activation_funnel_v2(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_activation_funnel_v2(timestamptz, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.get_activation_funnel_v2(timestamptz, timestamptz) IS
  'Admin-only, unique-journey onboarding activation funnel with 2m, 10m, 30m, and 24h windows.';
