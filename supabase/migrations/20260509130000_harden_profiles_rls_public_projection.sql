-- Harden profiles access.
--
-- RLS filters rows, not columns. Public profile pages must read from the
-- safe public_profiles projection instead of selecting directly from profiles.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles NO FORCE ROW LEVEL SECURITY;

-- Remove all existing profile policies, including historical permissive policies
-- such as "Public profiles are viewable by everyone".
DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_name);
  END LOOP;
END $$;

-- Remove API role access before granting back only what is intended.
REVOKE ALL ON TABLE public.profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.profiles FROM authenticated;

-- Authenticated users can read only their own full profile row.
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Authenticated users can update only their own profile row.
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Preserve strict self-insert behavior used by signup/profile creation flows.
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Grant direct table access only to authenticated users; RLS limits rows.
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- Supabase service_role has BYPASSRLS. Keep backend/admin access available.
GRANT ALL ON TABLE public.profiles TO service_role;

-- Public safe projection for public profile pages.
-- Do not include stripe_customer_id, credit_balance, date_of_birth, credits,
-- monthly_credits, quiz_*, subscription_*, dashboard/preferences, or billing fields.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  username,
  full_name,
  avatar_url,
  bio,
  positioning_line,
  creative_niche,
  followers_count,
  following_count,
  location,
  startup_name,
  startup_tagline,
  startup_stage,
  startup_industry,
  website_url,
  twitter_url,
  linkedin_url,
  instagram_url,
  facebook_url,
  youtube_url,
  github_url,
  tiktok_url
FROM public.profiles;

REVOKE ALL ON TABLE public.public_profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.public_profiles FROM anon;
REVOKE ALL ON TABLE public.public_profiles FROM authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon;
GRANT SELECT ON TABLE public.public_profiles TO authenticated;

COMMENT ON VIEW public.public_profiles IS
  'Safe public projection of profiles. Sensitive billing, credit, quiz, and subscription fields are intentionally excluded.';

-- Keep the admin discovery-call view out of public API roles if it exists.
DO $$
BEGIN
  IF to_regclass('public.discovery_call_admin_overview') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.discovery_call_admin_overview FROM PUBLIC;
    REVOKE ALL ON TABLE public.discovery_call_admin_overview FROM anon;
    REVOKE ALL ON TABLE public.discovery_call_admin_overview FROM authenticated;
    GRANT SELECT ON TABLE public.discovery_call_admin_overview TO service_role;
  END IF;
END $$;
