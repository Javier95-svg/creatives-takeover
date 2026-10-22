-- Cohort showcase (2026-10-22): a public page per cohort that lists the
-- Founder IDs of its startups, usable as a demo-day page.
--
-- Two keys must both turn: program staff switch the showcase on for the
-- cohort, and each founder chooses to appear (Javier, 2026-10-22). Membership
-- of a program is never made public without the founder's say.
--
-- The public read goes through public_profiles, so the showcase inherits every
-- rule that view applies (a stage only shows when the founder made it public).

-- ─── 1. Columns ─────────────────────────────────────────────────────────────

ALTER TABLE public.launch_cohorts
  ADD COLUMN IF NOT EXISTS showcase_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS showcase_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS launch_cohorts_showcase_slug_key
  ON public.launch_cohorts (showcase_slug) WHERE showcase_slug IS NOT NULL;

ALTER TABLE public.cohort_members
  ADD COLUMN IF NOT EXISTS showcase_opt_in boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.launch_cohorts.showcase_public IS
  'Staff switched the public showcase page on. Only members with showcase_opt_in appear.';
COMMENT ON COLUMN public.launch_cohorts.showcase_slug IS
  'Public address of the showcase (/cohort/:slug). Never the join or staff code.';
COMMENT ON COLUMN public.cohort_members.showcase_opt_in IS
  'The founder chose to appear on the cohort showcase. Set only through set_cohort_showcase_opt_in_v1.';

-- ─── 2. Staff: switch the showcase on or off ────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_cohort_showcase_v1(p_cohort_id uuid, p_public boolean)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_cohort public.launch_cohorts%ROWTYPE;
  v_base text;
  v_slug text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_cohort_staff(p_cohort_id)) THEN
    RAISE EXCEPTION 'Program staff access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cohort FROM public.launch_cohorts WHERE id = p_cohort_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cohort not found' USING ERRCODE = 'P0002'; END IF;

  v_slug := v_cohort.showcase_slug;
  IF coalesce(p_public, false) AND v_slug IS NULL THEN
    -- Readable and unguessable: the program and cohort name, then six random
    -- characters, so a showcase address never reveals or reuses an invite code.
    v_base := trim(both '-' from regexp_replace(
      lower(coalesce(nullif(trim(v_cohort.program_name), ''), 'cohort') || '-' || coalesce(v_cohort.cohort_name, '')),
      '[^a-z0-9]+', '-', 'g'));
    v_base := left(coalesce(nullif(v_base, ''), 'cohort'), 48);
    LOOP
      v_slug := v_base || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.launch_cohorts WHERE showcase_slug = v_slug);
    END LOOP;
  END IF;

  UPDATE public.launch_cohorts
  SET showcase_public = coalesce(p_public, false),
      showcase_slug = v_slug,
      updated_at = now()
  WHERE id = p_cohort_id;

  RETURN jsonb_build_object('public', coalesce(p_public, false), 'slug', v_slug);
END;
$$;

REVOKE ALL ON FUNCTION public.set_cohort_showcase_v1(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_cohort_showcase_v1(uuid, boolean) TO authenticated;

-- ─── 3. Staff: the showcase's state and how many founders opted in ──────────

CREATE OR REPLACE FUNCTION public.cohort_showcase_settings_v1(p_cohort_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_cohort public.launch_cohorts%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_cohort_staff(p_cohort_id)) THEN
    RAISE EXCEPTION 'Program staff access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cohort FROM public.launch_cohorts WHERE id = p_cohort_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cohort not found' USING ERRCODE = 'P0002'; END IF;

  RETURN jsonb_build_object(
    'public', v_cohort.showcase_public,
    'slug', v_cohort.showcase_slug,
    'optedIn', (SELECT count(*) FROM public.cohort_members
                WHERE cohort_id = p_cohort_id AND showcase_opt_in AND status IN ('active', 'completed')),
    'members', (SELECT count(*) FROM public.cohort_members
                WHERE cohort_id = p_cohort_id AND status IN ('active', 'completed'))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cohort_showcase_settings_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cohort_showcase_settings_v1(uuid) TO authenticated;

-- ─── 4. Founder: read and set their own choice ──────────────────────────────

CREATE OR REPLACE FUNCTION public.cohort_showcase_membership_v1(p_cohort_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_opt_in boolean;
  v_cohort public.launch_cohorts%ROWTYPE;
BEGIN
  SELECT showcase_opt_in INTO v_opt_in FROM public.cohort_members
  WHERE cohort_id = p_cohort_id AND user_id = auth.uid() AND status IN ('active', 'paused', 'completed');
  IF NOT FOUND THEN RAISE EXCEPTION 'Not a member of this cohort' USING ERRCODE = '42501'; END IF;

  SELECT * INTO v_cohort FROM public.launch_cohorts WHERE id = p_cohort_id;
  RETURN jsonb_build_object(
    'optIn', v_opt_in,
    'showcasePublic', v_cohort.showcase_public,
    'slug', CASE WHEN v_cohort.showcase_public THEN v_cohort.showcase_slug END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cohort_showcase_membership_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cohort_showcase_membership_v1(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_cohort_showcase_opt_in_v1(p_cohort_id uuid, p_opt_in boolean)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.cohort_members
  SET showcase_opt_in = coalesce(p_opt_in, false)
  WHERE cohort_id = p_cohort_id AND user_id = auth.uid() AND status IN ('active', 'paused', 'completed');
  IF NOT FOUND THEN RAISE EXCEPTION 'Not a member of this cohort' USING ERRCODE = '42501'; END IF;
  RETURN coalesce(p_opt_in, false);
END;
$$;

REVOKE ALL ON FUNCTION public.set_cohort_showcase_opt_in_v1(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_cohort_showcase_opt_in_v1(uuid, boolean) TO authenticated;

-- ─── 5. Public: the showcase page ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.public_cohort_showcase_v1(p_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_cohort public.launch_cohorts%ROWTYPE;
  v_members jsonb;
BEGIN
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9-]{3,80}$' THEN RETURN NULL; END IF;

  SELECT * INTO v_cohort FROM public.launch_cohorts
  WHERE showcase_slug = p_slug AND showcase_public;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Only Founder IDs (founder and builder accounts) with a username, from the
  -- public projection, of members who opted in and are still in the cohort.
  SELECT coalesce(jsonb_agg(row_data ORDER BY row_data->>'name'), '[]'::jsonb) INTO v_members
  FROM (
    SELECT jsonb_build_object(
      'username', pp.username,
      'name', coalesce(nullif(trim(pp.full_name), ''), pp.username),
      'avatarUrl', pp.avatar_url,
      'startupName', pp.startup_name,
      'tagline', coalesce(nullif(trim(pp.startup_tagline), ''), nullif(trim(pp.positioning_line), '')),
      'founderNumber', pp.founder_number,
      'assignedStage', pp.assigned_stage
    ) AS row_data
    FROM public.cohort_members m
    JOIN public.public_profiles pp ON pp.id = m.user_id
    WHERE m.cohort_id = v_cohort.id
      AND m.showcase_opt_in
      AND m.status IN ('active', 'completed')
      AND pp.username IS NOT NULL
      AND (pp.user_type IS NULL OR pp.user_type IN ('founder', 'builder'))
  ) members;

  RETURN jsonb_build_object(
    'programName', v_cohort.program_name,
    'cohortName', v_cohort.cohort_name,
    'cohortNumber', v_cohort.cohort_number,
    'startDate', v_cohort.start_date,
    'endDate', v_cohort.end_date,
    'demoDayDate', v_cohort.demo_day_date,
    'members', v_members
  );
END;
$$;

REVOKE ALL ON FUNCTION public.public_cohort_showcase_v1(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_cohort_showcase_v1(text) TO anon, authenticated;
