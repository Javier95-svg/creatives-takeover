-- The Newspaper and the podcast page failed for visitors ("Failed to load
-- stories"): their admin policies applied to every role, so PostgreSQL ran
-- is_admin_user() for anonymous reads too, and anon has no EXECUTE on it since
-- 20261103120000_restore_admin_rls_helper_grant.sql. One unrunnable policy
-- fails the whole query, even for rows the public policy allows.
--
-- An anonymous visitor can never be an admin, so these policies only need to
-- apply to signed-in users. Scoping them TO authenticated changes nobody's
-- access: admins keep it, visitors keep reading published rows through the
-- public policies, and anon still cannot call is_admin_user().

BEGIN;

ALTER POLICY "Admin can view all articles" ON public.stories_articles TO authenticated;
ALTER POLICY "Admin can create articles" ON public.stories_articles TO authenticated;
ALTER POLICY "Admin can update articles" ON public.stories_articles TO authenticated;
ALTER POLICY "Admin can delete articles" ON public.stories_articles TO authenticated;

ALTER POLICY "Admin can manage all podcast episodes" ON public.podcast_episodes TO authenticated;

ALTER POLICY "Admins read application email log" ON public.account_application_email_notifications TO authenticated;
ALTER POLICY "Applicants read their own request" ON public.account_applications TO authenticated;
ALTER POLICY "Admins review requests" ON public.account_applications TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
