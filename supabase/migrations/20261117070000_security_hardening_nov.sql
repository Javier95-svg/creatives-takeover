-- Security hardening after the 2026-11-17 review.
--
-- 1. Service providers' emails (services.delivered_by_email) were readable by
--    anyone through the API, although members pay credits to reveal one.
--    The column is no longer readable by visitors or members: listings show
--    has_contact_email, and public.service_contact_email() returns the
--    address only to an admin or to a member who paid for that service.
--    NOTE: services now uses column grants. A new column must be added to
--    the GRANT SELECT list below or the app cannot read it.
-- 2. Anonymous feedback answers (user_feedback.user_id IS NULL) were readable
--    by anyone. Members now read only their own; admins read all.
-- 3. Every service pitch deck could be listed and downloaded through the
--    storage API, including decks of inactive services. Listing is now
--    admin only; decks shown on live listings still open by their public URL.
-- 4. App tokens (stripe_connections, user_integrations) were readable by
--    their owner from the browser. Nothing in the app reads or writes these
--    tables from the browser (only create-stripe-connect-link, with the
--    service role), so the browser roles lose access entirely.
-- 5. Usage and quota functions that take a user id answered for any user id.
--    Visitors can no longer call them, and members get answers only for
--    themselves (server jobs, with no signed-in user, are unaffected).
-- 6. Functions without a fixed search_path get one (Supabase advisor lint
--    function_search_path_mutable). Extension-owned functions are skipped.

-- 1. Provider emails ---------------------------------------------------------
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS has_contact_email boolean
  GENERATED ALWAYS AS (COALESCE(btrim(delivered_by_email), '') <> '') STORED;

REVOKE SELECT ON public.services FROM anon, authenticated;
GRANT SELECT (
  id, name, slug, category, description, banner_url, pitch_deck_url, pitch_deck_type,
  booking_url, booking_provider, is_active, is_featured, created_at, updated_at,
  delivered_by_name, delivered_by_picture_url, delivered_by_user_id,
  banner_focal_x, banner_focal_y, delivered_by_picture_focal_x, delivered_by_picture_focal_y,
  has_contact_email
) ON public.services TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.service_contact_email(p_service_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.delivered_by_email
  FROM public.services s
  WHERE s.id = p_service_id
    AND auth.uid() IS NOT NULL
    AND (
      public.is_service_marketplace_admin()
      OR (
        s.is_active
        AND EXISTS (
          SELECT 1 FROM public.credit_transactions t
          WHERE t.user_id = auth.uid()
            AND t.tx_type = 'deduct'
            AND t.amount < 0
            AND t.feature = 'Service Marketplace Email'
            AND t.metadata->>'serviceId' = s.id::text
        )
      )
    );
$$;
REVOKE ALL ON FUNCTION public.service_contact_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.service_contact_email(uuid) TO authenticated;

-- 2. Anonymous feedback ------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.user_feedback;
CREATE POLICY "Users can view their own feedback" ON public.user_feedback
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- 3. Service pitch deck listing ---------------------------------------------
DROP POLICY IF EXISTS "Anyone can view service pitch decks" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view service pitch decks" ON storage.objects;
CREATE POLICY "Admins can view service pitch decks" ON storage.objects
  FOR SELECT USING (bucket_id = 'service-pitch-decks' AND public.is_service_marketplace_admin());

-- 4. App tokens --------------------------------------------------------------
REVOKE ALL ON public.stripe_connections FROM anon, authenticated;
REVOKE ALL ON public.user_integrations FROM anon, authenticated;

-- 5. Per-user usage functions ------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_feature_usage(p_user_id uuid, p_feature_name text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tier_name TEXT;
  v_usage_limits JSONB;
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_period_start TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only read your own usage' USING ERRCODE = '42501';
  END IF;

  SELECT subscription_tier INTO v_tier_name
  FROM public.user_credits
  WHERE user_id = p_user_id;

  IF v_tier_name IS NULL THEN
    v_tier_name := 'rookie';
  END IF;

  SELECT usage_limits INTO v_usage_limits
  FROM public.subscription_tiers
  WHERE tier_name = v_tier_name;

  v_limit := COALESCE((v_usage_limits->>p_feature_name)::INTEGER, 0);

  IF v_limit = -1 THEN
    RETURN jsonb_build_object('current_usage', 0, 'limit', -1, 'remaining', -1, 'unlimited', true);
  END IF;

  SELECT period_start INTO v_period_start
  FROM public.get_user_billing_period(p_user_id);

  SELECT COALESCE(usage_count, 0) INTO v_current_usage
  FROM public.feature_usage
  WHERE user_id = p_user_id
    AND feature_name = p_feature_name
    AND period_start = v_period_start;

  IF v_current_usage IS NULL THEN
    v_current_usage := 0;
  END IF;

  RETURN jsonb_build_object(
    'current_usage', v_current_usage,
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - v_current_usage),
    'unlimited', false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_accelerator_view_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.accelerator_views views
  CROSS JOIN public.get_user_billing_period(p_user_id) period
  WHERE views.user_id = p_user_id
    AND (auth.uid() IS NULL OR p_user_id = auth.uid())
    AND views.viewed_at >= period.period_start
    AND views.viewed_at < period.period_end;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_vc_view_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.vc_views views
  CROSS JOIN public.get_user_billing_period(p_user_id) period
  WHERE views.user_id = p_user_id
    AND (auth.uid() IS NULL OR p_user_id = auth.uid())
    AND views.viewed_at >= period.period_start
    AND views.viewed_at < period.period_end;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_directory_view_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer
  FROM public.directory_views
  WHERE user_id = p_user_id
    AND (auth.uid() IS NULL OR p_user_id = auth.uid())
    AND viewed_at >= date_trunc('month', now());
$function$;

CREATE OR REPLACE FUNCTION public.has_completed_todays_challenge(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM user_challenge_completions ucc
    JOIN daily_challenges dc ON dc.id = ucc.challenge_id
    WHERE ucc.user_id = p_user_id
      AND dc.challenge_date = CURRENT_DATE
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_view_accelerator(p_user_id uuid, p_tier text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_usage INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;
  v_tier := public.get_user_normalized_subscription_tier(p_user_id);
  v_limit := public.get_feature_quota_limit('accelerator_profile', v_tier);
  v_usage := public.get_feature_usage_count(p_user_id, 'accelerator_profile');
  RETURN v_limit = -1 OR v_usage < COALESCE(v_limit, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_view_vc(p_user_id uuid, p_tier text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_usage INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;
  v_tier := public.get_user_normalized_subscription_tier(p_user_id);
  v_limit := public.get_feature_quota_limit('vc_search_profile', v_tier);
  v_usage := public.get_feature_usage_count(p_user_id, 'vc_search_profile');
  RETURN v_limit = -1 OR v_usage < COALESCE(v_limit, 0);
END;
$function$;

-- Visitors (not signed in) never need these.
REVOKE EXECUTE ON FUNCTION public.get_feature_usage(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_monthly_accelerator_view_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_monthly_vc_view_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_monthly_directory_view_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_completed_todays_challenge(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_accelerator(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_vc(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_current_billing_period_start(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feature_usage(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_monthly_accelerator_view_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_monthly_vc_view_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_monthly_directory_view_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_completed_todays_challenge(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_accelerator(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_vc(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_billing_period_start(uuid) TO authenticated, service_role;

-- 6. Fixed search_path ------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}'::text[])) c WHERE c LIKE 'search_path=%'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', r.fn);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'search_path not set on % (not owner)', r.fn;
    END;
  END LOOP;
END;
$$;
