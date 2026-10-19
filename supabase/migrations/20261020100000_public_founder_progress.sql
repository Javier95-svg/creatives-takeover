-- Opt-in public progress on founder profiles.
--
-- journey_outcomes, pmf_interviews and customer_evidence_events are readable by
-- their owner only. A founder who switches on "Show my progress publicly"
-- (user_preferences.public_progress_visible) lets visitors see a summary: which
-- stages are complete, when, and whether CT verified them, plus counts of
-- customer evidence. Never the work itself: no artifact ids or content, no
-- quality checks beyond the one flag that completes Launch, no amounts, no
-- interviewee names.
--
-- The page works out the stages with the same deriveFounderProgress() the
-- dashboard and the cohort view use, so this returns the outcome signals that
-- function reads instead of a second copy of its rules.
--
-- The owner always gets their own summary (visible = false until they opt in)
-- so the profile can show them what visitors would see.
CREATE OR REPLACE FUNCTION public.public_founder_progress_v1(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid;
  v_visible boolean;
BEGIN
  IF p_username IS NULL OR btrim(p_username) = '' THEN
    RETURN NULL;
  END IF;

  SELECT p.id, COALESCE(p.user_preferences->>'public_progress_visible', 'false') = 'true'
  INTO v_profile_id, v_visible
  FROM public.profiles p
  WHERE lower(p.username) = lower(btrim(p_username))
  ORDER BY p.username = btrim(p_username) DESC
  LIMIT 1;

  IF v_profile_id IS NULL OR (NOT v_visible AND v_profile_id IS DISTINCT FROM auth.uid()) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'visible', v_visible,
    'outcomes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'tool', o.tool,
        'artifact_type', o.artifact_type,
        'status', o.status,
        'completed_at', o.completed_at,
        'verified_at', o.verified_at,
        'reviewed_at', o.reviewed_at,
        'updated_at', o.updated_at,
        'verification_mode', o.verification_mode,
        'buyer_proof_earned', COALESCE(o.quality_checks->'buyerProofEarned' = 'true'::jsonb, false)
      ) ORDER BY o.updated_at DESC)
      FROM public.journey_outcomes o
      WHERE o.user_id = v_profile_id
        AND o.status IN ('ready', 'verified', 'reviewed')
        AND o.tool IN ('icp_builder', 'demo_studio', 'pmf_lab', 'mvp_builder', 'gtm_strategist', 'traction_engine')
    ), '[]'::jsonb),
    -- Same definitions as cohort_dashboard_v1, so a program and a visitor
    -- count the same evidence the same way.
    'evidence', jsonb_build_object(
      'interviews', (
        SELECT jsonb_build_object(
          'total', count(*),
          'verified', count(*) FILTER (WHERE i.evidence_origin = 'platform_verified')
        )
        FROM public.pmf_interviews i
        WHERE i.user_id = v_profile_id
      ),
      'commitments', (
        SELECT jsonb_build_object(
          'total', count(*),
          'verified', count(*) FILTER (WHERE e.verification_mode <> 'founder_reported')
        )
        FROM public.customer_evidence_events e
        WHERE e.user_id = v_profile_id AND e.event_type = 'commitment_received'
      ),
      'payments', (
        SELECT jsonb_build_object(
          'total', count(*),
          'verified', count(*) FILTER (WHERE e.verification_mode <> 'founder_reported')
        )
        FROM public.customer_evidence_events e
        WHERE e.user_id = v_profile_id AND e.event_type = 'payment_received'
      )
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.public_founder_progress_v1(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_founder_progress_v1(text) TO anon, authenticated;

COMMENT ON FUNCTION public.public_founder_progress_v1(text) IS
  'Opt-in public progress summary for /profile/:username: completed-stage signals and customer evidence counts, never artifact content. Null unless the founder set user_preferences.public_progress_visible or is the caller.';
