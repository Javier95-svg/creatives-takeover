-- Complete Supabase security hardening after the profiles RLS fix.
--
-- Goals:
-- - Keep private/internal tables unreadable from anon/authenticated API roles.
-- - Preserve intentional public read surfaces only where fields are safe.
-- - Remove known RLS bypass paths through views, broad policies, storage, and RPCs.
-- - Keep backend/admin operations available through Supabase service_role.

-- ---------------------------------------------------------------------------
-- 1. Close the active_subscriptions view leak.
-- ---------------------------------------------------------------------------

ALTER VIEW IF EXISTS public.active_subscriptions SET (security_invoker = true);

REVOKE ALL ON TABLE public.active_subscriptions FROM PUBLIC;
REVOKE ALL ON TABLE public.active_subscriptions FROM anon;
REVOKE ALL ON TABLE public.active_subscriptions FROM authenticated;
GRANT SELECT ON TABLE public.active_subscriptions TO service_role;

COMMENT ON VIEW public.active_subscriptions IS
  'Admin/backend-only view. Do not grant to anon or authenticated because it includes auth.users and billing/subscription fields.';

-- ---------------------------------------------------------------------------
-- 2. Enable RLS and remove public access from private/internal tables.
-- ---------------------------------------------------------------------------

ALTER TABLE public.conversation_context_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.function_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_user_link_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_trigger_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_community_activity ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.conversation_context_cache FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.document_chunks FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.function_idempotency FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.mentor_user_link_backup FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.signup_trigger_failures FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.user_community_activity FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.conversation_context_cache TO service_role;
GRANT ALL ON TABLE public.document_chunks TO service_role;
GRANT ALL ON TABLE public.function_idempotency TO service_role;
GRANT ALL ON TABLE public.mentor_user_link_backup TO service_role;
GRANT ALL ON TABLE public.signup_trigger_failures TO service_role;
GRANT ALL ON TABLE public.user_community_activity TO service_role;

-- These image/catalog tables are intentionally public, but only active rows
-- should be readable through the public API.
ALTER TABLE public.founder_journey_gifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.value_proposition_images ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.founder_journey_gifs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hero_images FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.value_proposition_images FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "public_read_active_founder_journey_gifs" ON public.founder_journey_gifs;
CREATE POLICY "public_read_active_founder_journey_gifs"
  ON public.founder_journey_gifs
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "public_read_active_hero_images" ON public.hero_images;
CREATE POLICY "public_read_active_hero_images"
  ON public.hero_images
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "public_read_active_value_proposition_images" ON public.value_proposition_images;
CREATE POLICY "public_read_active_value_proposition_images"
  ON public.value_proposition_images
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

GRANT SELECT ON TABLE public.founder_journey_gifs TO anon, authenticated;
GRANT SELECT ON TABLE public.hero_images TO anon, authenticated;
GRANT SELECT ON TABLE public.value_proposition_images TO anon, authenticated;
GRANT ALL ON TABLE public.founder_journey_gifs TO service_role;
GRANT ALL ON TABLE public.hero_images TO service_role;
GRANT ALL ON TABLE public.value_proposition_images TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Harden private storage buckets and object policies.
-- ---------------------------------------------------------------------------

UPDATE storage.buckets
SET public = false
WHERE id IN (
  'chatbot-attachments',
  'collaboration-files',
  'cv-uploads',
  'dashboard-files',
  'message-attachments',
  'pitch-deck-uploads'
);

DROP POLICY IF EXISTS "Users can view their own CVs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own CVs" ON storage.objects;

CREATE POLICY "Users can view their own CVs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cv-uploads'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own CVs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cv-uploads'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view collaboration files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files in accessible sessions" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to accessible sessions" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own uploaded files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploaded files" ON storage.objects;
DROP POLICY IF EXISTS "collaboration_files_storage_select_participant" ON storage.objects;
DROP POLICY IF EXISTS "collaboration_files_storage_insert_participant" ON storage.objects;
DROP POLICY IF EXISTS "collaboration_files_storage_update_uploader" ON storage.objects;
DROP POLICY IF EXISTS "collaboration_files_storage_delete_uploader" ON storage.objects;

CREATE POLICY "collaboration_files_storage_select_participant"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'collaboration-files'
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.collaboration_files cf
        JOIN public.collaboration_sessions cs ON cs.id = cf.session_id
        WHERE cf.storage_path = storage.objects.name
          AND (
            cf.uploaded_by = auth.uid()
            OR cs.created_by = auth.uid()
            OR EXISTS (
              SELECT 1
              FROM public.user_presence up
              WHERE up.session_id = cs.id
                AND up.user_id = auth.uid()
            )
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.collaboration_sessions cs
        WHERE cs.id::text = (storage.foldername(storage.objects.name))[1]
          AND (
            cs.created_by = auth.uid()
            OR EXISTS (
              SELECT 1
              FROM public.user_presence up
              WHERE up.session_id = cs.id
                AND up.user_id = auth.uid()
            )
          )
      )
    )
  );

CREATE POLICY "collaboration_files_storage_insert_participant"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'collaboration-files'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.collaboration_sessions cs
      WHERE cs.id::text = (storage.foldername(storage.objects.name))[1]
        AND (
          cs.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.user_presence up
            WHERE up.session_id = cs.id
              AND up.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "collaboration_files_storage_update_uploader"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'collaboration-files'
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.collaboration_files cf
        WHERE cf.storage_path = storage.objects.name
          AND cf.uploaded_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    bucket_id = 'collaboration-files'
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.collaboration_files cf
        WHERE cf.storage_path = storage.objects.name
          AND cf.uploaded_by = auth.uid()
      )
    )
  );

CREATE POLICY "collaboration_files_storage_delete_uploader"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'collaboration-files'
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.collaboration_files cf
        WHERE cf.storage_path = storage.objects.name
          AND cf.uploaded_by = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Fix high-risk table policies.
-- ---------------------------------------------------------------------------

-- contact_submissions: authenticated is not the same thing as admin.
REVOKE ALL ON TABLE public.contact_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.contact_submissions TO authenticated;
GRANT ALL ON TABLE public.contact_submissions TO service_role;

DROP POLICY IF EXISTS "Admins can view all contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins can view all contact submissions"
  ON public.contact_submissions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Service role can insert contact submissions" ON public.contact_submissions;
CREATE POLICY "Service role can insert contact submissions"
  ON public.contact_submissions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- subscribers: subscription state is billing data. Users can read their own row,
-- but writes must come from backend/service-role flows.
REVOKE ALL ON TABLE public.subscribers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.subscribers TO authenticated;
GRANT ALL ON TABLE public.subscribers TO service_role;

DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_update_subscription" ON public.subscribers;

CREATE POLICY "service_role_insert_subscription"
  ON public.subscribers
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service_role_update_subscription"
  ON public.subscribers
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- conversion_funnels: keep anonymous insert tracking, but remove unscoped updates.
DROP POLICY IF EXISTS "Allow anonymous funnel update" ON public.conversion_funnels;
DROP POLICY IF EXISTS "Allow authenticated funnel update" ON public.conversion_funnels;
DROP POLICY IF EXISTS "Allow authenticated funnel tracking" ON public.conversion_funnels;
DROP POLICY IF EXISTS "Users can view own funnel data" ON public.conversion_funnels;

CREATE POLICY "Allow authenticated funnel tracking"
  ON public.conversion_funnels
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated funnel update"
  ON public.conversion_funnels
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own funnel data"
  ON public.conversion_funnels
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- community_notifications: allow users to create only their own platform
-- notifications; backend/system-wide notifications use service_role.
DROP POLICY IF EXISTS "System can create notifications" ON public.community_notifications;
DROP POLICY IF EXISTS "Users can create their own platform notifications" ON public.community_notifications;
DROP POLICY IF EXISTS "Service role can create notifications" ON public.community_notifications;

CREATE POLICY "Users can create their own platform notifications"
  ON public.community_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (actor_id IS NULL OR actor_id = auth.uid())
    AND notification_type = 'platform_update'
  );

CREATE POLICY "Service role can create notifications"
  ON public.community_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Internal cache/log tables: public ALL true policies are not service-role-only.
REVOKE ALL ON TABLE public.ai_cache FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.ai_cache TO service_role;

DROP POLICY IF EXISTS "Service role can manage ai_cache" ON public.ai_cache;
CREATE POLICY "Service role can manage ai_cache"
  ON public.ai_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.ai_request_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.ai_request_logs TO authenticated;
GRANT ALL ON TABLE public.ai_request_logs TO service_role;

DROP POLICY IF EXISTS "Service role can manage request logs" ON public.ai_request_logs;
CREATE POLICY "Service role can manage request logs"
  ON public.ai_request_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.analytics_data_cache FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.analytics_data_cache TO authenticated;
GRANT ALL ON TABLE public.analytics_data_cache TO service_role;

DROP POLICY IF EXISTS "Service role can manage analytics cache" ON public.analytics_data_cache;
CREATE POLICY "Service role can manage analytics cache"
  ON public.analytics_data_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.business_insights_cache FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.business_insights_cache TO service_role;

DROP POLICY IF EXISTS "Anyone can read business insights" ON public.business_insights_cache;
DROP POLICY IF EXISTS "Service role can manage insights" ON public.business_insights_cache;
CREATE POLICY "Service role can manage business insights"
  ON public.business_insights_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. Harden sensitive RPC execution.
-- ---------------------------------------------------------------------------

-- Backend/service-role only functions. These expose auth.users data or mutate
-- billing/subscription state and must not be callable through public clients.
REVOKE ALL ON FUNCTION public.get_user_email(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_user_subscription(text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_user_subscription_tier(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_user_subscription_tier(text, text, boolean) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_subscription(text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_subscription_tier(uuid, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_subscription_tier(text, text, boolean) TO service_role;

-- Self-only subscription helper RPCs. These remain callable by authenticated
-- users for their own ID and by service_role for backend operations.
CREATE OR REPLACE FUNCTION public.get_user_normalized_subscription_tier(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tier text;
BEGIN
  IF COALESCE(auth.role(), '') IN ('anon', 'authenticated')
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not allowed to read another user subscription tier'
      USING ERRCODE = '42501';
  END IF;

  SELECT public.normalize_subscription_tier(
    COALESCE(
      (
        SELECT s.subscription_tier
        FROM public.subscribers s
        WHERE s.user_id = p_user_id
        ORDER BY s.subscribed DESC, s.updated_at DESC NULLS LAST
        LIMIT 1
      ),
      (
        SELECT uc.subscription_tier
        FROM public.user_credits uc
        WHERE uc.user_id = p_user_id
        LIMIT 1
      ),
      (
        SELECT p.subscription_tier
        FROM public.profiles p
        WHERE p.id = p_user_id
        LIMIT 1
      ),
      'rookie'
    )
  )
  INTO v_tier;

  RETURN v_tier;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_billing_period(
  p_user_id uuid,
  p_now timestamp with time zone DEFAULT now()
)
RETURNS TABLE(
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  period_start_date date,
  billing_anchor_at timestamp with time zone,
  subscription_tier text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_billing_anchor_at timestamptz;
  v_subscription_tier text;
  v_profile_created_at timestamptz;
BEGIN
  IF COALESCE(auth.role(), '') IN ('anon', 'authenticated')
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not allowed to read another user billing period'
      USING ERRCODE = '42501';
  END IF;

  SELECT
    uc.billing_anchor_at,
    COALESCE(NULLIF(TRIM(uc.subscription_tier), ''), NULLIF(TRIM(s.subscription_tier), ''), 'rookie'),
    p.created_at
  INTO
    v_billing_anchor_at,
    v_subscription_tier,
    v_profile_created_at
  FROM public.profiles p
  LEFT JOIN public.user_credits uc ON uc.user_id = p.id
  LEFT JOIN public.subscribers s ON s.user_id = p.id
  WHERE p.id = p_user_id;

  IF v_billing_anchor_at IS NULL THEN
    SELECT COALESCE(uc.last_reset_at, uc.last_credit_grant, uc.created_at, v_profile_created_at, p_now)
    INTO v_billing_anchor_at
    FROM public.user_credits uc
    WHERE uc.user_id = p_user_id;
  END IF;

  IF v_billing_anchor_at IS NULL THEN
    v_billing_anchor_at := COALESCE(v_profile_created_at, p_now);
  END IF;

  SELECT win.period_start, win.period_end
  INTO period_start, period_end
  FROM public.compute_monthly_billing_window(v_billing_anchor_at, p_now) win;

  billing_anchor_at := v_billing_anchor_at;
  subscription_tier := LOWER(TRIM(COALESCE(v_subscription_tier, 'rookie')));
  period_start_date := period_start::date;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_billing_cycle_start(p_user_id uuid)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cycle_start date;
BEGIN
  IF COALESCE(auth.role(), '') IN ('anon', 'authenticated')
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not allowed to read another user billing cycle'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(last_reset_at::date, CURRENT_DATE)
  INTO v_cycle_start
  FROM public.user_credits
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_cycle_start, CURRENT_DATE);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_subscription_active(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record record;
BEGIN
  IF COALESCE(auth.role(), '') IN ('anon', 'authenticated')
     AND auth.uid() IS DISTINCT FROM user_id THEN
    RAISE EXCEPTION 'not allowed to read another user subscription status'
      USING ERRCODE = '42501';
  END IF;

  SELECT subscribed, subscription_end
  INTO user_record
  FROM public.profiles
  WHERE id = user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN user_record.subscribed
    AND (user_record.subscription_end IS NULL OR user_record.subscription_end > now());
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_normalized_subscription_tier(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_billing_period(uuid, timestamp with time zone) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_billing_cycle_start(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_subscription_active(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_user_normalized_subscription_tier(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_billing_period(uuid, timestamp with time zone) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_billing_cycle_start(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_subscription_active(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_user_normalized_subscription_tier(uuid) IS
  'Self-only for authenticated users; service_role may read any user for backend billing/credit enforcement.';
COMMENT ON FUNCTION public.get_user_billing_period(uuid, timestamp with time zone) IS
  'Self-only for authenticated users; service_role may read any user for backend billing/credit enforcement.';
COMMENT ON FUNCTION public.get_billing_cycle_start(uuid) IS
  'Self-only for authenticated users; service_role may read any user for backend billing/credit enforcement.';
COMMENT ON FUNCTION public.is_subscription_active(uuid) IS
  'Self-only for authenticated users; service_role may read any user for backend billing/credit enforcement.';
