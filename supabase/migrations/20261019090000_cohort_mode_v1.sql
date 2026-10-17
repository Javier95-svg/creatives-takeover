-- Cohort mode v1 (2026-10-19).
--
-- Programs (accelerators, incubators, university programs) run cohorts on the
-- platform. Cohort mode sits beside the five account types: a founder who joins
-- a cohort through an invite link sees a cohort dashboard (week, plan, weekly
-- check-in), and program staff who join through a separate staff link see a
-- program dashboard tracking every founder's progress and check-ins.
--
-- Reuses the 4-week cohort tables from 20251101015801 (launch_cohorts,
-- cohort_members, cohort_checkins), which no screen used yet, and fixes their
-- policies:
--   * cohort_members' SELECT policy queried cohort_members itself (Postgres
--     raises "infinite recursion detected in policy").
--   * Any signed-in user could insert themselves into any cohort. Joining now
--     goes through join_cohort_v1 with an invite code only.
--   * Check-ins were visible to every cohort member. They are now visible to
--     the founder, to admins, and to program staff through cohort_dashboard_v1.
--   * Active cohorts were readable by anyone. They would now carry invite codes,
--     so only admins read the table; everyone else uses the functions below.
--
-- Staff see progress, not content: stage results, counts of interviews and
-- evidence by verification level, decisions, task completion, last activity
-- and weekly check-ins. Never files, ideas or messages. Founders consent to
-- sharing when they join (progress_shared_at).

-- ─── 1. Columns ──────────────────────────────────────────────────────────────

ALTER TABLE public.launch_cohorts
  ADD COLUMN IF NOT EXISTS program_name text CHECK (program_name IS NULL OR length(program_name) BETWEEN 1 AND 160),
  ADD COLUMN IF NOT EXISTS join_code text,
  ADD COLUMN IF NOT EXISTS staff_code text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.launch_cohorts
  DROP CONSTRAINT IF EXISTS launch_cohorts_join_code_format,
  ADD CONSTRAINT launch_cohorts_join_code_format CHECK (join_code IS NULL OR join_code ~ '^[A-Z0-9]{6,32}$'),
  DROP CONSTRAINT IF EXISTS launch_cohorts_staff_code_format,
  ADD CONSTRAINT launch_cohorts_staff_code_format CHECK (staff_code IS NULL OR staff_code ~ '^[A-Z0-9]{6,32}$'),
  DROP CONSTRAINT IF EXISTS launch_cohorts_codes_differ,
  ADD CONSTRAINT launch_cohorts_codes_differ CHECK (join_code IS NULL OR staff_code IS NULL OR join_code <> staff_code);

CREATE UNIQUE INDEX IF NOT EXISTS launch_cohorts_join_code_key ON public.launch_cohorts(join_code) WHERE join_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS launch_cohorts_staff_code_key ON public.launch_cohorts(staff_code) WHERE staff_code IS NOT NULL;

-- When the founder agreed to share progress with the program.
ALTER TABLE public.cohort_members
  ADD COLUMN IF NOT EXISTS progress_shared_at timestamptz;

-- Programs run longer than four weeks; one check-in per founder per week.
-- Drop the old 1-4 limit whatever the database named it, then add 1-52.
DO $$
DECLARE v_name text;
BEGIN
  FOR v_name IN
    SELECT con.conname FROM pg_constraint con
    WHERE con.conrelid = 'public.cohort_checkins'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%week_number%'
  LOOP
    EXECUTE format('ALTER TABLE public.cohort_checkins DROP CONSTRAINT %I', v_name);
  END LOOP;
END $$;
ALTER TABLE public.cohort_checkins
  ADD CONSTRAINT cohort_checkins_week_number_check CHECK (week_number BETWEEN 1 AND 52);
CREATE UNIQUE INDEX IF NOT EXISTS cohort_checkins_one_per_week
  ON public.cohort_checkins(cohort_id, user_id, week_number);

-- ─── 2. Program staff ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cohort_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.launch_cohorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'manager' CHECK (role IN ('manager')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cohort_staff_user ON public.cohort_staff(user_id);

ALTER TABLE public.cohort_staff ENABLE ROW LEVEL SECURITY;

-- ─── 3. Membership helpers (SECURITY DEFINER, so policies don't recurse) ────

CREATE OR REPLACE FUNCTION public.is_cohort_member(p_cohort_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cohort_members
    WHERE cohort_id = p_cohort_id AND user_id = auth.uid() AND status IN ('active', 'paused', 'completed')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_cohort_staff(p_cohort_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cohort_staff WHERE cohort_id = p_cohort_id AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_cohort_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_cohort_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_cohort_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_cohort_staff(uuid) TO authenticated;

-- ─── 4. Policies ─────────────────────────────────────────────────────────────

-- launch_cohorts: admins only. Founders and staff read their cohort through
-- cohort_context_v1 / cohort_dashboard_v1, which never hand a member the codes.
DROP POLICY IF EXISTS "Anyone can view active cohorts" ON public.launch_cohorts;
DROP POLICY IF EXISTS "Admins can manage cohorts" ON public.launch_cohorts;
CREATE POLICY "Admins can manage cohorts"
  ON public.launch_cohorts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- cohort_members: a founder reads their own memberships; joining is by RPC.
DROP POLICY IF EXISTS "Users can view members in their cohorts" ON public.cohort_members;
DROP POLICY IF EXISTS "Users can join cohorts" ON public.cohort_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.cohort_members;
DROP POLICY IF EXISTS "Users view own cohort memberships" ON public.cohort_members;
CREATE POLICY "Users view own cohort memberships"
  ON public.cohort_members FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins manage cohort members" ON public.cohort_members;
CREATE POLICY "Admins manage cohort members"
  ON public.cohort_members FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- cohort_staff: staff read their own rows; joining is by RPC.
DROP POLICY IF EXISTS "Staff view own cohort roles" ON public.cohort_staff;
CREATE POLICY "Staff view own cohort roles"
  ON public.cohort_staff FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins manage cohort staff" ON public.cohort_staff;
CREATE POLICY "Admins manage cohort staff"
  ON public.cohort_staff FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- cohort_checkins: a founder writes and reads their own, only in a cohort they
-- belong to. Staff read them through cohort_dashboard_v1.
DROP POLICY IF EXISTS "Users can view check-ins in their cohorts" ON public.cohort_checkins;
DROP POLICY IF EXISTS "Users can create their own check-ins" ON public.cohort_checkins;
DROP POLICY IF EXISTS "Users can update their own check-ins" ON public.cohort_checkins;
DROP POLICY IF EXISTS "Users view own cohort check-ins" ON public.cohort_checkins;
CREATE POLICY "Users view own cohort check-ins"
  ON public.cohort_checkins FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Members create own cohort check-ins" ON public.cohort_checkins;
CREATE POLICY "Members create own cohort check-ins"
  ON public.cohort_checkins FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_cohort_member(cohort_id));
DROP POLICY IF EXISTS "Members update own cohort check-ins" ON public.cohort_checkins;
CREATE POLICY "Members update own cohort check-ins"
  ON public.cohort_checkins FOR UPDATE
  USING (user_id = auth.uid() AND public.is_cohort_member(cohort_id))
  WITH CHECK (user_id = auth.uid() AND public.is_cohort_member(cohort_id));
DROP POLICY IF EXISTS "Admins view cohort check-ins" ON public.cohort_checkins;
CREATE POLICY "Admins view cohort check-ins"
  ON public.cohort_checkins FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─── 5. Invite lookup (anyone with the link) ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.cohort_invite_v1(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_code text := upper(trim(coalesce(p_code, '')));
  v_cohort public.launch_cohorts%ROWTYPE;
  v_kind text;
BEGIN
  IF v_code !~ '^[A-Z0-9]{6,32}$' THEN RETURN NULL; END IF;
  SELECT * INTO v_cohort FROM public.launch_cohorts
  WHERE (join_code = v_code OR staff_code = v_code) AND status IN ('upcoming', 'active')
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_kind := CASE WHEN v_cohort.staff_code = v_code THEN 'staff' ELSE 'member' END;
  RETURN jsonb_build_object(
    'kind', v_kind,
    'cohortId', v_cohort.id,
    'cohortName', v_cohort.cohort_name,
    'programName', v_cohort.program_name,
    'startDate', v_cohort.start_date,
    'endDate', v_cohort.end_date,
    'status', v_cohort.status,
    'alreadyJoined', CASE
      WHEN auth.uid() IS NULL THEN false
      WHEN v_kind = 'staff' THEN public.is_cohort_staff(v_cohort.id)
      ELSE public.is_cohort_member(v_cohort.id)
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cohort_invite_v1(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cohort_invite_v1(text) TO anon, authenticated;

-- ─── 6. Join with an invite code ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.join_cohort_v1(p_code text, p_share_progress boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_cohort public.launch_cohorts%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in to join a cohort' USING ERRCODE = '42501'; END IF;
  IF v_code !~ '^[A-Z0-9]{6,32}$' THEN RAISE EXCEPTION 'Invalid invite code' USING ERRCODE = '22023'; END IF;

  SELECT * INTO v_cohort FROM public.launch_cohorts
  WHERE (join_code = v_code OR staff_code = v_code) AND status IN ('upcoming', 'active')
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'This invite link is not active' USING ERRCODE = 'P0002'; END IF;

  IF v_cohort.staff_code = v_code THEN
    INSERT INTO public.cohort_staff (cohort_id, user_id) VALUES (v_cohort.id, v_user)
    ON CONFLICT (cohort_id, user_id) DO NOTHING;
    RETURN jsonb_build_object('kind', 'staff', 'cohortId', v_cohort.id);
  END IF;

  -- Founders share their progress with the program as a condition of joining.
  IF NOT coalesce(p_share_progress, false) THEN
    RAISE EXCEPTION 'Agree to share your progress to join this cohort' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.cohort_members (cohort_id, user_id, status, progress_shared_at)
  VALUES (v_cohort.id, v_user, 'active', now())
  ON CONFLICT (cohort_id, user_id) DO UPDATE
    SET status = 'active',
        progress_shared_at = coalesce(public.cohort_members.progress_shared_at, now());

  UPDATE public.launch_cohorts
  SET member_count = (SELECT count(*) FROM public.cohort_members WHERE cohort_id = v_cohort.id AND status <> 'dropped'),
      updated_at = now()
  WHERE id = v_cohort.id;

  RETURN jsonb_build_object('kind', 'member', 'cohortId', v_cohort.id);
END;
$$;

REVOKE ALL ON FUNCTION public.join_cohort_v1(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_cohort_v1(text, boolean) TO authenticated;

-- ─── 7. Which cohort mode the signed-in user is in ──────────────────────────

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
    'joinedAt', m.joined_at
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

-- ─── 8. The program dashboard (staff of the cohort, or admins) ──────────────
--
-- Only founders who agreed to share progress are included, and only progress:
-- stage results (journey_outcomes, without their content), counts of
-- interviews and evidence split by verification level, decisions, completed
-- tasks, last activity and the weekly check-ins they wrote for the program.

CREATE OR REPLACE FUNCTION public.cohort_dashboard_v1(p_cohort_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_is_admin boolean := public.has_role(auth.uid(), 'admin'::app_role);
  v_cohort public.launch_cohorts%ROWTYPE;
  v_members jsonb;
BEGIN
  IF NOT (v_is_admin OR public.is_cohort_staff(p_cohort_id)) THEN
    RAISE EXCEPTION 'Program staff access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cohort FROM public.launch_cohorts WHERE id = p_cohort_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cohort not found' USING ERRCODE = 'P0002'; END IF;

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
        'total', (SELECT count(*) FROM public.pmf_interviews i WHERE i.user_id = m.user_id),
        'verified', (SELECT count(*) FROM public.pmf_interviews i WHERE i.user_id = m.user_id AND i.evidence_origin = 'platform_verified')
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
          'verified', count(*) FILTER (WHERE e.verification_mode <> 'founder_reported')
        )
        FROM public.customer_evidence_events e WHERE e.user_id = m.user_id
      ),
      'experimentDecisions', (SELECT count(*) FROM public.market_experiment_decisions d WHERE d.user_id = m.user_id),
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
