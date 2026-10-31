-- Investors: only admins may change the directory, and contact details are
-- served only to Pro members and admins. Plus two indexes for slow reads.
--
-- 1. Writes. The insert, update and delete policies on angel_investors only
--    checked that the caller was signed in, so any account could add, edit or
--    delete any investor through the API. The admin check existed only in the
--    browser (useAngels, AdminRoute). Writes now require the admin role, the
--    same user_roles check AdminRoute uses.
--
-- 2. Contacts. Find Your Angel locks email, LinkedIn and X behind Pro, but the
--    table let anyone, signed out included, read every column. Those three
--    columns are now readable only through get_angel_contacts_v1, which returns
--    them to Pro members (subscription or pilot plan) and admins. The app reads
--    the public list without them since the same release; until this runs it
--    falls back to reading them directly, so the order of rollout is safe.
--    A browser still running an older bundle that asks for select=* gets an
--    error until it reloads.
--
-- 3. Indexes. The notification bell lists a user's newest notifications;
--    without (user_id, created_at) Postgres walks the whole created_at index
--    and filters by user. The retention email job reads each user's newest open
--    task the same way (2,608 calls, mean 398 ms since 2026-10-15).
--
-- Every statement is idempotent.

-- 1. Admin-only writes --------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can create angel investors" ON public.angel_investors;
DROP POLICY IF EXISTS "Authenticated users can update angel investors" ON public.angel_investors;
DROP POLICY IF EXISTS "Authenticated users can delete angel investors" ON public.angel_investors;
DROP POLICY IF EXISTS "Admins can create angel investors" ON public.angel_investors;
DROP POLICY IF EXISTS "Admins can update angel investors" ON public.angel_investors;
DROP POLICY IF EXISTS "Admins can delete angel investors" ON public.angel_investors;

CREATE POLICY "Admins can create angel investors"
  ON public.angel_investors FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update angel investors"
  ON public.angel_investors FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete angel investors"
  ON public.angel_investors FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- Visitors never write; signed-in writes go through the admin policies above.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.angel_investors FROM anon;
REVOKE TRUNCATE ON public.angel_investors FROM authenticated;

-- 2. Contact details only for Pro and admins ---------------------------------

-- A table-wide SELECT grant overrides column grants, so it is replaced by a
-- grant on every column except email, linkedin_url and twitter_x_url.
REVOKE SELECT ON public.angel_investors FROM anon, authenticated;
GRANT SELECT (
  id, name, picture, firm_name, investment_stages, sectors, website_url,
  is_active, created_at, updated_at, profile_picture_url, profile_picture_path, user_id
) ON public.angel_investors TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_angel_contacts_v1(p_ids uuid[] DEFAULT NULL)
RETURNS TABLE (id uuid, email text, linkedin_url text, twitter_x_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_admin boolean;
  v_pro boolean;
BEGIN
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  v_admin := public.has_role(v_user, 'admin'::public.app_role)
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@creatives-takeover.com';
  v_pro := v_admin
    OR EXISTS (
      SELECT 1 FROM public.subscribers s
      WHERE s.user_id = v_user AND lower(coalesce(s.subscription_tier, '')) = 'pro'
    )
    OR public.cohort_pilot_plan_v1(v_user) = 'pro';

  IF NOT v_pro THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT a.id, a.email, a.linkedin_url, a.twitter_x_url
  FROM public.angel_investors a
  WHERE CASE
    WHEN p_ids IS NULL THEN a.is_active
    -- The admin editor opens inactive investors by id; Pro members see active ones.
    ELSE a.id = ANY (p_ids) AND (a.is_active OR v_admin)
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.get_angel_contacts_v1(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_angel_contacts_v1(uuid[]) TO authenticated;

-- 3. Indexes ------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS community_notifications_user_created_idx
  ON public.community_notifications (user_id, created_at DESC);
-- The new index starts with user_id, so this one only costs writes now.
DROP INDEX IF EXISTS public.idx_community_notifications_user_id;

CREATE INDEX IF NOT EXISTS daily_tasks_user_open_created_idx
  ON public.daily_tasks (user_id, created_at DESC)
  WHERE completed_at IS NULL AND dismissed_at IS NULL;

-- PostgREST caches the schema; reload it so the new function is callable.
NOTIFY pgrst, 'reload schema';
