-- Restore public profile resolution after account-type personalization.
--
-- The profile client started selecting user_type and role_profile in 2ed76ed,
-- but those columns were added to profiles after public_profiles was last
-- rebuilt. PostgREST rejects the entire select if one requested column is not
-- present, which made every real account render as "Profile Not Found".
--
-- Preserve the production view's exact column order (including safe columns
-- that may not exist in old snapshots), then append only the missing fields.
DO $$
DECLARE
  v_public_columns text;
BEGIN
  SELECT string_agg(
    CASE
      -- seo_indexable is a derived public-view field, not a physical column
      -- on profiles. Preserve it in its existing ordinal position so CREATE
      -- OR REPLACE VIEW does not interpret later columns as renames.
      WHEN column_name = 'seo_indexable'
        THEN 'public.profile_is_search_indexable(p) AS seo_indexable'
      ELSE format('p.%I', column_name)
    END,
    ', ' ORDER BY ordinal_position
  )
  INTO v_public_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'public_profiles'
    AND column_name NOT IN ('user_type', 'role_profile');

  IF v_public_columns IS NULL THEN
    RAISE EXCEPTION 'public.public_profiles must exist before exposing account type fields';
  END IF;

  EXECUTE format(
    'CREATE OR REPLACE VIEW public.public_profiles AS SELECT %s, p.user_type, p.role_profile FROM public.profiles p',
    v_public_columns
  );
END;
$$;

REVOKE ALL ON TABLE public.public_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon, authenticated;

COMMENT ON VIEW public.public_profiles IS
  'Safe public projection of profiles, including account category details intended for public profile display. Sensitive billing, credit, quiz, subscription, dashboard, and preference fields are excluded.';
