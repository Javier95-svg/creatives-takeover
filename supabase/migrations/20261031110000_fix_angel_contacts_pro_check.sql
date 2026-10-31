-- Fix get_angel_contacts_v1 (20261031100000) returning contacts to every
-- signed-in member.
--
-- cohort_pilot_plan_v1 returns NULL for anyone without a pilot plan, so
-- "false OR false OR NULL = 'pro'" was NULL, and "IF NOT NULL" does not run
-- its branch: the function went on to return every investor's contacts. The
-- app only calls it for Pro members, but any signed-in account could call it
-- through the API. Each check now resolves to true or false.

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

  v_admin := coalesce(public.has_role(v_user, 'admin'::public.app_role), false)
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@creatives-takeover.com';
  v_pro := v_admin
    OR EXISTS (
      SELECT 1 FROM public.subscribers s
      WHERE s.user_id = v_user AND lower(coalesce(s.subscription_tier, '')) = 'pro'
    )
    OR coalesce(public.cohort_pilot_plan_v1(v_user), '') = 'pro';

  IF NOT coalesce(v_pro, false) THEN
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
