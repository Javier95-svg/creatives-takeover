-- Allow public viewing of profiles (needed for profile pages like /profile/username)
-- This is safe as we're only exposing username, full_name, avatar_url, bio, etc. - no sensitive PII

-- Drop existing restrictive policies that prevent public viewing
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view followed profiles" ON public.profiles;
DROP POLICY IF EXISTS "Community can view active member profiles" ON public.profiles;

-- Allow everyone (including unauthenticated users) to view profiles
-- This is necessary for public profile pages like /profile/username
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);

-- Users can still update their own profiles
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

