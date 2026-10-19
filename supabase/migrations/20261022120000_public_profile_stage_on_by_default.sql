-- Show startup stage on public profiles by default, while preserving an
-- explicit false preference so founders can keep their stage private.
DO $$
DECLARE
  v_public_columns text;
BEGIN
  SELECT string_agg(
    CASE
      WHEN column_name = 'seo_indexable'
        THEN 'public.profile_is_search_indexable(p) AS seo_indexable'
      WHEN column_name = 'assigned_stage'
        THEN 'CASE WHEN COALESCE(p.user_preferences->>''public_stage_visible'', ''true'') = ''true'' THEN p.assigned_stage END AS assigned_stage'
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
    RAISE EXCEPTION 'public.public_profiles must exist before updating stage visibility defaults';
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
  'Safe public profile projection. Startup stage is visible by default unless a founder explicitly turns off public_stage_visible; sensitive preferences and account data are excluded.';
