-- Cohort pilot readiness (2026-10-23).
--
-- Before the first 30-day Founder Validation Pilot:
--   1. The program dashboard counts only what a founder did while in the
--      cohort (from joined_at to the end date), and "verified" evidence no
--      longer includes imported rows; it means the platform observed it, or a
--      customer action or transaction backs it.
--   2. It also counts experiments run and assumptions written and tested.
--   3. A cohort can carry a pilot plan. Founders in it get that plan's access
--      from the start date to the end date, then fall back to their own plan
--      with no one switching anything off. The plan is read where access is
--      decided (get_user_normalized_subscription_tier, First Customer Proof)
--      and is never written to subscribers or profiles, which Stripe owns.
--   4. A founder can leave a cohort, which also stops sharing their progress.

-- ─── 1. Pilot plan per cohort ───────────────────────────────────────────────

ALTER TABLE public.launch_cohorts
  ADD COLUMN IF NOT EXISTS pilot_plan text CHECK (pilot_plan IS NULL OR pilot_plan IN ('starter', 'rising', 'pro'));

COMMENT ON COLUMN public.launch_cohorts.pilot_plan IS
  'Plan the program gives its founders between start_date and end_date. NULL: founders keep their own plan.';

-- The pilot plan a user holds today, or NULL. Others may not ask about a user.
CREATE OR REPLACE FUNCTION public.cohort_pilot_plan_v1(p_user_id uuid DEFAULT auth.uid())
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;
  IF COALESCE(auth.role(), '') IN ('anon', 'authenticated') AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT c.pilot_plan
    FROM public.cohort_members m
    JOIN public.launch_cohorts c ON c.id = m.cohort_id
    WHERE m.user_id = p_user_id
      AND m.status IN ('active', 'paused')
      AND c.status IN ('upcoming', 'active')
      AND c.pilot_plan IS NOT NULL
      AND current_date BETWEEN c.start_date AND c.end_date
    ORDER BY CASE c.pilot_plan WHEN 'pro' THEN 3 WHEN 'rising' THEN 2 ELSE 1 END DESC
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cohort_pilot_plan_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cohort_pilot_plan_v1(uuid) TO authenticated, service_role;

-- The same tier as before, raised to the pilot plan while one applies.
CREATE OR REPLACE FUNCTION public.get_user_normalized_subscription_tier(p_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_tier text;
  v_pilot text;
BEGIN
  IF COALESCE(auth.role(), '') IN ('anon', 'authenticated')
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not allowed to read another user subscription tier'
      USING ERRCODE = '42501';
  END IF;

  SELECT public.normalize_subscription_tier(
    COALESCE(
      (
        SELECT s.subscription_tier
        FROM public.subscribers s
        WHERE s.user_id = p_user_id
        ORDER BY s.subscribed DESC, s.updated_at DESC NULLS LAST
        LIMIT 1
      ),
      (
        SELECT uc.subscription_tier
        FROM public.user_credits uc
        WHERE uc.user_id = p_user_id
        LIMIT 1
      ),
      (
        SELECT p.subscription_tier
        FROM public.profiles p
        WHERE p.id = p_user_id
        LIMIT 1
      ),
      'rookie'
    )
  )
  INTO v_tier;

  v_pilot := public.cohort_pilot_plan_v1(p_user_id);
  IF v_pilot IS NOT NULL
     AND (CASE v_pilot WHEN 'pro' THEN 3 WHEN 'rising' THEN 2 WHEN 'starter' THEN 1 ELSE 0 END)
       > (CASE v_tier WHEN 'pro' THEN 3 WHEN 'rising' THEN 2 WHEN 'starter' THEN 1 ELSE 0 END) THEN
    RETURN v_pilot;
  END IF;

  RETURN v_tier;
END;
$$;

-- First Customer Proof is the pilot's 30-day demand test; it needs Rising.
CREATE OR REPLACE FUNCTION public.first_customer_proof_has_access_v1(p_founder_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p_founder_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles profile
        WHERE profile.id = p_founder_id
          AND public.normalize_subscription_tier(profile.subscription_tier) IN ('rising', 'pro')
      )
      OR public.cohort_pilot_plan_v1(p_founder_id) IN ('rising', 'pro')
    );
$$;

-- ─── 2. Leave a cohort (and stop sharing progress) ──────────────────────────

CREATE OR REPLACE FUNCTION public.leave_cohort_v1(p_cohort_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in to leave a cohort' USING ERRCODE = '42501'; END IF;

  UPDATE public.cohort_members
  SET status = 'dropped', progress_shared_at = NULL
  WHERE cohort_id = p_cohort_id AND user_id = v_user AND status <> 'dropped';
  IF NOT FOUND THEN RAISE EXCEPTION 'You are not in this cohort' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.launch_cohorts
  SET member_count = (SELECT count(*) FROM public.cohort_members WHERE cohort_id = p_cohort_id AND status <> 'dropped'),
      updated_at = now()
  WHERE id = p_cohort_id;

  RETURN jsonb_build_object('cohortId', p_cohort_id, 'status', 'dropped');
END;
$$;

REVOKE ALL ON FUNCTION public.leave_cohort_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_cohort_v1(uuid) TO authenticated;

-- ─── 3. Cohort context: the founder sees the plan their program gives them ──

CREATE OR REPLACE FUNCTION public.cohort_context_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_member jsonb;
  v_staff jsonb;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('member', NULL, 'staff', '[]'::jsonb); END IF;

  SELECT jsonb_build_object(
    'cohortId', c.id,
    'cohortName', c.cohort_name,
    'programName', c.program_name,
    'startDate', c.start_date,
    'endDate', c.end_date,
    'status', c.status,
    'checkinDay', c.weekly_checkin_day,
    'joinedAt', m.joined_at,
    'pilotPlan', c.pilot_plan
  ) INTO v_member
  FROM public.cohort_members m
  JOIN public.launch_cohorts c ON c.id = m.cohort_id
  WHERE m.user_id = v_user AND m.status IN ('active', 'paused') AND c.status IN ('upcoming', 'active')
  ORDER BY c.start_date DESC
  LIMIT 1;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'cohortId', c.id,
    'cohortName', c.cohort_name,
    'programName', c.program_name,
    'startDate', c.start_date,
    'endDate', c.end_date,
    'status', c.status
  ) ORDER BY c.start_date DESC), '[]'::jsonb) INTO v_staff
  FROM public.cohort_staff s
  JOIN public.launch_cohorts c ON c.id = s.cohort_id
  WHERE s.user_id = v_user AND c.status IN ('upcoming', 'active', 'completed');

  RETURN jsonb_build_object('member', v_member, 'staff', v_staff);
END;
$$;

REVOKE ALL ON FUNCTION public.cohort_context_v1() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cohort_context_v1() TO authenticated;

-- ─── 4. The program dashboard, counted over the program period ──────────────
--
-- Activity counts (interviews, evidence, experiments, decisions) run from the
-- founder's joined_at to the end of the cohort's last day. Stage, tasks and
-- assumptions describe where the founder stands, so they are not windowed.

CREATE OR REPLACE FUNCTION public.cohort_dashboard_v1(p_cohort_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_is_admin boolean := public.has_role(auth.uid(), 'admin'::app_role);
  v_cohort public.launch_cohorts%ROWTYPE;
  v_until timestamptz;
  v_members jsonb;
BEGIN
  IF NOT (v_is_admin OR public.is_cohort_staff(p_cohort_id)) THEN
    RAISE EXCEPTION 'Program staff access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cohort FROM public.launch_cohorts WHERE id = p_cohort_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cohort not found' USING ERRCODE = 'P0002'; END IF;
  v_until := (v_cohort.end_date + 1)::timestamptz;

  SELECT coalesce(jsonb_agg(row_data ORDER BY row_data->>'name'), '[]'::jsonb) INTO v_members
  FROM (
    SELECT jsonb_build_object(
      'userId', m.user_id,
      'name', coalesce(nullif(trim(p.full_name), ''), split_part(u.email, '@', 1)),
      'email', u.email,
      'status', m.status,
      'joinedAt', m.joined_at,
      'lastActivityAt', GREATEST(
        u.last_sign_in_at,
        (SELECT max(o.updated_at) FROM public.journey_outcomes o WHERE o.user_id = m.user_id),
        (SELECT max(e.occurred_at) FROM public.customer_evidence_events e WHERE e.user_id = m.user_id),
        (SELECT max(i.updated_at) FROM public.pmf_interviews i WHERE i.user_id = m.user_id),
        (SELECT max(x.updated_at) FROM public.market_experiments x WHERE x.user_id = m.user_id),
        (SELECT max(t.completed_at) FROM public.bizmap_task_progress t WHERE t.user_id = m.user_id),
        (SELECT max(ci.created_at) FROM public.cohort_checkins ci WHERE ci.user_id = m.user_id AND ci.cohort_id = m.cohort_id)
      ),
      'outcomes', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'tool', o.tool,
          'artifact_type', o.artifact_type,
          'status', o.status,
          'quality_checks', jsonb_build_object('buyerProofEarned', o.quality_checks->'buyerProofEarned'),
          'completed_at', o.completed_at,
          'verified_at', o.verified_at,
          'reviewed_at', o.reviewed_at,
          'updated_at', o.updated_at
        ))
        FROM public.journey_outcomes o WHERE o.user_id = m.user_id
      ), '[]'::jsonb),
      'completedTaskIds', coalesce((
        SELECT jsonb_agg(t.task_id ORDER BY t.completed_at)
        FROM public.bizmap_task_progress t WHERE t.user_id = m.user_id AND t.is_completed
      ), '[]'::jsonb),
      'interviews', jsonb_build_object(
        'total', (SELECT count(*) FROM public.pmf_interviews i
                  WHERE i.user_id = m.user_id AND i.created_at >= m.joined_at AND i.created_at < v_until),
        'verified', (SELECT count(*) FROM public.pmf_interviews i
                     WHERE i.user_id = m.user_id AND i.created_at >= m.joined_at AND i.created_at < v_until
                       AND i.evidence_origin = 'platform_verified')
      ),
      'evidence', (
        SELECT jsonb_build_object(
          'replies', count(*) FILTER (WHERE e.event_type = 'reply_received'),
          'interviewsCompleted', count(*) FILTER (WHERE e.event_type = 'interview_completed'),
          'commitments', count(*) FILTER (WHERE e.event_type = 'commitment_received'),
          'payments', count(*) FILTER (WHERE e.event_type = 'payment_received'),
          'strangersActed', count(*) FILTER (WHERE e.event_type = 'stranger_acted'),
          'strangersIdentified', count(*) FILTER (WHERE e.event_type = 'stranger_identified'),
          'total', count(*),
          -- Observed by the platform or backed by a customer action or payment.
          -- Founder reports and imported rows are not verified.
          'verified', count(*) FILTER (WHERE e.verification_mode IN ('platform_verified', 'customer_action', 'transaction'))
        )
        FROM public.customer_evidence_events e
        WHERE e.user_id = m.user_id AND e.occurred_at >= m.joined_at AND e.occurred_at < v_until
      ),
      'experimentsRun', (SELECT count(*) FROM public.market_experiments x
                         WHERE x.user_id = m.user_id AND x.status <> 'draft'
                           AND x.created_at >= m.joined_at AND x.created_at < v_until),
      'experimentDecisions', (SELECT count(*) FROM public.market_experiment_decisions d
                              WHERE d.user_id = m.user_id AND d.decided_at >= m.joined_at AND d.decided_at < v_until),
      'assumptions', jsonb_build_object(
        'total', (SELECT count(*) FROM public.journey_assumptions a WHERE a.user_id = m.user_id),
        'tested', (SELECT count(*) FROM public.journey_assumptions a WHERE a.user_id = m.user_id AND a.status <> 'untested')
      ),
      'checkins', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'weekNumber', ci.week_number,
          'checkinDate', ci.checkin_date,
          'wins', ci.wins,
          'blockers', ci.blockers,
          'nextWeekGoals', ci.next_week_goals,
          'helpNeeded', ci.help_needed,
          'createdAt', ci.created_at
        ) ORDER BY ci.week_number)
        FROM public.cohort_checkins ci WHERE ci.cohort_id = m.cohort_id AND ci.user_id = m.user_id
      ), '[]'::jsonb)
    ) AS row_data
    FROM public.cohort_members m
    JOIN auth.users u ON u.id = m.user_id
    LEFT JOIN public.profiles p ON p.id = m.user_id
    WHERE m.cohort_id = p_cohort_id
      AND m.status <> 'dropped'
      AND m.progress_shared_at IS NOT NULL
  ) members;

  RETURN jsonb_build_object(
    'cohort', jsonb_build_object(
      'cohortId', v_cohort.id,
      'cohortName', v_cohort.cohort_name,
      'programName', v_cohort.program_name,
      'startDate', v_cohort.start_date,
      'endDate', v_cohort.end_date,
      'status', v_cohort.status,
      'checkinDay', v_cohort.weekly_checkin_day,
      'pilotPlan', v_cohort.pilot_plan,
      'joinCode', v_cohort.join_code,
      -- Only our team hands out staff invites.
      'staffCode', CASE WHEN v_is_admin THEN v_cohort.staff_code ELSE NULL END
    ),
    'members', v_members,
    'generatedAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cohort_dashboard_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cohort_dashboard_v1(uuid) TO authenticated;
