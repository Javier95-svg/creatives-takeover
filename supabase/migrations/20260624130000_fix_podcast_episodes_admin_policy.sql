-- Fix: the original admin policy used `EXISTS (SELECT 1 FROM auth.users ...)`, but
-- the `authenticated` role has no privileges on auth.users, so the policy check
-- raised "permission denied for table users" and every admin insert/update failed
-- ("Failed to publish episode"). Use the app's canonical SECURITY-safe helper
-- `public.is_admin_user()` (reads the email from the JWT, no auth.users access).

DROP POLICY IF EXISTS "Admin can manage all podcast episodes" ON public.podcast_episodes;

CREATE POLICY "Admin can manage all podcast episodes"
  ON public.podcast_episodes FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());
