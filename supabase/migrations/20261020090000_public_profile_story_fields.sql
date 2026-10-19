-- Public founder profiles show visitors what the founder wrote for them.
--
-- 1. The bio, startup description, current focus, startup links and role were
--    rendered for the owner only, because the public view never carried them.
--    They are appended here; a view can only gain columns at the end.
-- 2. assigned_stage was readable by anyone even when the founder kept their
--    stage private, while the page showed "Private" to every visitor because
--    the opt-in lives in user_preferences, which this view does not expose.
--    The column now carries the stage only when public_stage_visible is true,
--    the same rule launchpad_profiles() applies, so the page can show an
--    opted-in stage and nobody can read a private one.
--
-- Same dynamic rebuild as 20260922200000: keep production's exact column order
-- so CREATE OR REPLACE VIEW does not read later columns as renames.
DO $$
DECLARE
  v_public_columns text;
BEGIN
  SELECT string_agg(
    CASE
      WHEN column_name = 'seo_indexable'
        THEN 'public.profile_is_search_indexable(p) AS seo_indexable'
      WHEN column_name = 'assigned_stage'
        THEN 'CASE WHEN COALESCE(p.user_preferences->>''public_stage_visible'', ''false'') = ''true'' THEN p.assigned_stage END AS assigned_stage'
      ELSE format('p.%I', column_name)
    END,
    ', ' ORDER BY ordinal_position
  )
  INTO v_public_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'public_profiles'
    AND column_name NOT IN ('founder_role', 'startup_description', 'current_focus', 'startup_links');

  IF v_public_columns IS NULL THEN
    RAISE EXCEPTION 'public.public_profiles must exist before exposing profile story fields';
  END IF;

  IF position('AS assigned_stage' IN v_public_columns) = 0 THEN
    RAISE EXCEPTION 'public.public_profiles.assigned_stage is missing; apply 20260918120000 first';
  END IF;

  EXECUTE format(
    'CREATE OR REPLACE VIEW public.public_profiles AS SELECT %s, p.founder_role, p.startup_description, p.current_focus, p.startup_links FROM public.profiles p',
    v_public_columns
  );
END;
$$;

REVOKE ALL ON TABLE public.public_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon, authenticated;

COMMENT ON VIEW public.public_profiles IS
  'Safe public projection of profiles: identity, links, startup story and account category details intended for public profile display. assigned_stage is null unless the founder made their stage public. Sensitive billing, credit, quiz, subscription, dashboard, and preference fields are excluded.';
