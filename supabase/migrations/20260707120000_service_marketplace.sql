-- Network service marketplace -------------------------------------------------
-- Adds founder-ready services, public profile/deck browsing, and 10-credit
-- discovery-call booking through the existing discovery_calls ledger.

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('sales', 'marketing', 'ops', 'tech_support')),
  description TEXT NOT NULL,
  banner_url TEXT,
  pitch_deck_url TEXT,
  pitch_deck_type TEXT CHECK (pitch_deck_type IS NULL OR pitch_deck_type IN ('pdf', 'pptx')),
  booking_url TEXT,
  booking_provider TEXT NOT NULL DEFAULT 'other' CHECK (booking_provider IN ('calendly', 'koalendar', 'other', 'manual')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_service_marketplace_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.is_admin_user(), false)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_service_marketplace_admin() TO authenticated, anon;

CREATE INDEX IF NOT EXISTS services_active_category_idx
  ON public.services (is_active, category, name);

CREATE INDEX IF NOT EXISTS services_featured_idx
  ON public.services (is_featured DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_services_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services;
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.set_services_updated_at();

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
CREATE POLICY "Anyone can view active services"
  ON public.services
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Admins can manage services"
  ON public.services
  FOR ALL
  USING (public.is_service_marketplace_admin())
  WITH CHECK (public.is_service_marketplace_admin());

-- Storage ---------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'service-banners',
    'service-banners',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'service-pitch-decks',
    'service-pitch-decks',
    true,
    20971520,
    ARRAY[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
  )
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Anyone can view service banners" ON storage.objects;
CREATE POLICY "Anyone can view service banners"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'service-banners');

DROP POLICY IF EXISTS "Admins can upload service banners" ON storage.objects;
CREATE POLICY "Admins can upload service banners"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'service-banners' AND public.is_service_marketplace_admin());

DROP POLICY IF EXISTS "Admins can update service banners" ON storage.objects;
CREATE POLICY "Admins can update service banners"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'service-banners' AND public.is_service_marketplace_admin())
  WITH CHECK (bucket_id = 'service-banners' AND public.is_service_marketplace_admin());

DROP POLICY IF EXISTS "Admins can delete service banners" ON storage.objects;
CREATE POLICY "Admins can delete service banners"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'service-banners' AND public.is_service_marketplace_admin());

DROP POLICY IF EXISTS "Anyone can view service pitch decks" ON storage.objects;
CREATE POLICY "Anyone can view service pitch decks"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'service-pitch-decks');

DROP POLICY IF EXISTS "Admins can upload service pitch decks" ON storage.objects;
CREATE POLICY "Admins can upload service pitch decks"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'service-pitch-decks' AND public.is_service_marketplace_admin());

DROP POLICY IF EXISTS "Admins can update service pitch decks" ON storage.objects;
CREATE POLICY "Admins can update service pitch decks"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'service-pitch-decks' AND public.is_service_marketplace_admin())
  WITH CHECK (bucket_id = 'service-pitch-decks' AND public.is_service_marketplace_admin());

DROP POLICY IF EXISTS "Admins can delete service pitch decks" ON storage.objects;
CREATE POLICY "Admins can delete service pitch decks"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'service-pitch-decks' AND public.is_service_marketplace_admin());

-- Discovery call service context ---------------------------------------------

ALTER TABLE public.discovery_calls
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS service_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS service_category_snapshot TEXT;

ALTER TABLE public.discovery_calls
  ALTER COLUMN mentor_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'discovery_calls_exactly_one_booking_target'
      AND conrelid = 'public.discovery_calls'::regclass
  ) THEN
    ALTER TABLE public.discovery_calls
      ADD CONSTRAINT discovery_calls_exactly_one_booking_target
      CHECK (
        (mentor_id IS NOT NULL AND service_id IS NULL)
        OR
        (mentor_id IS NULL AND service_id IS NOT NULL)
      ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS discovery_calls_service_scheduled_idx
  ON public.discovery_calls (service_id, scheduled_for DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.create_service_discovery_call_intent(
  p_founder_id UUID,
  p_service_id UUID,
  p_source TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_service RECORD;
  v_call RECORD;
  v_quota_status JSONB;
  v_provider TEXT;
BEGIN
  IF p_founder_id IS NULL OR p_service_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'INVALID_REQUEST',
      'error', 'Founder and service are required.'
    );
  END IF;

  IF NULLIF(TRIM(COALESCE(p_idempotency_key, '')), '') IS NOT NULL THEN
    SELECT *
    INTO v_existing
    FROM public.discovery_calls
    WHERE founder_id = p_founder_id
      AND idempotency_key = NULLIF(TRIM(p_idempotency_key), '')
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'callId', v_existing.id,
        'status', v_existing.status,
        'providerBookingUrl', v_existing.provider_booking_url,
        'serviceId', v_existing.service_id
      );
    END IF;
  END IF;

  SELECT
    id,
    name,
    category,
    booking_url,
    booking_provider,
    is_active
  INTO v_service
  FROM public.services
  WHERE id = p_service_id;

  IF NOT FOUND OR COALESCE(v_service.is_active, false) = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'SERVICE_UNAVAILABLE',
      'error', 'This service is not currently available for discovery calls.'
    );
  END IF;

  IF NULLIF(TRIM(COALESCE(v_service.booking_url, '')), '') IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'SERVICE_UNAVAILABLE',
      'error', 'This service does not have a booking link configured yet.'
    );
  END IF;

  v_provider := public.infer_discovery_call_provider(v_service.booking_url, v_service.booking_provider);
  v_quota_status := public.get_discovery_call_quota_status(p_founder_id);

  IF COALESCE((v_quota_status ->> 'canBookNow')::BOOLEAN, false) = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'INSUFFICIENT_CREDITS',
      'error', format('You need %s credits to book a discovery call.', COALESCE(v_quota_status ->> 'overageCreditCost', '10')),
      'requiredCredits', COALESCE((v_quota_status ->> 'overageCreditCost')::INTEGER, 10),
      'quotaStatus', v_quota_status
    );
  END IF;

  INSERT INTO public.discovery_calls (
    founder_id,
    mentor_id,
    mentor_name_snapshot,
    service_id,
    service_name_snapshot,
    service_category_snapshot,
    provider_name,
    provider_booking_url,
    status,
    booking_source,
    idempotency_key,
    metadata
  ) VALUES (
    p_founder_id,
    NULL,
    v_service.name,
    p_service_id,
    v_service.name,
    v_service.category,
    v_provider,
    v_service.booking_url,
    'intent_created',
    NULLIF(TRIM(COALESCE(p_source, '')), ''),
    NULLIF(TRIM(COALESCE(p_idempotency_key, '')), ''),
    jsonb_strip_nulls(
      COALESCE(p_metadata, '{}'::jsonb)
      || jsonb_build_object(
        'bookingProvider', v_provider,
        'bookingContext', 'service',
        'serviceId', p_service_id,
        'serviceName', v_service.name,
        'serviceCategory', v_service.category
      )
    )
  )
  RETURNING * INTO v_call;

  PERFORM public.log_discovery_call_event(
    v_call.id,
    'intent_created',
    p_founder_id,
    jsonb_build_object(
      'source', NULLIF(TRIM(COALESCE(p_source, '')), ''),
      'bookingContext', 'service',
      'serviceId', p_service_id,
      'bookingProvider', v_provider,
      'requiredCredits', COALESCE((v_quota_status ->> 'overageCreditCost')::INTEGER, 10)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'callId', v_call.id,
    'status', v_call.status,
    'providerBookingUrl', v_call.provider_booking_url,
    'bookingProvider', v_provider,
    'serviceId', p_service_id,
    'quotaStatus', v_quota_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_service_discovery_call_intent(UUID, UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_service_discovery_call_intent(UUID, UUID, TEXT, TEXT, JSONB) TO service_role;

-- Keep existing notification/admin callers working by exposing service bookings
-- through the mentor-shaped columns they already select.
DROP VIEW IF EXISTS public.discovery_call_admin_overview;
CREATE VIEW public.discovery_call_admin_overview AS
SELECT
  dc.id,
  dc.status,
  dc.booking_source,
  dc.scheduled_for,
  dc.duration_minutes,
  dc.consumption_mode,
  dc.credit_charge_amount,
  dc.credits_charged,
  dc.used_from_quota,
  dc.used_from_balance,
  dc.cancelled_at,
  dc.cancelled_reason,
  dc.created_at,
  dc.updated_at,
  dc.provider_name,
  dc.provider_booking_url,
  dc.provider_event_id,
  dc.provider_invitee_id,
  dc.meeting_url,
  founder.id AS founder_id,
  founder.full_name AS founder_name,
  founder.avatar_url AS founder_avatar_url,
  founder_sub.email AS founder_email,
  mentor.id AS mentor_id,
  COALESCE(mentor.name, service.name, dc.service_name_snapshot, dc.mentor_name_snapshot) AS mentor_name,
  mentor.user_id AS mentor_user_id,
  COALESCE(mentor.calendly_url, service.booking_url) AS mentor_booking_url,
  COALESCE(mentor.booking_provider, service.booking_provider) AS mentor_booking_provider,
  mentor.contact_email AS mentor_contact_email,
  service.id AS service_id,
  service.name AS service_name,
  service.category AS service_category,
  service.booking_url AS service_booking_url,
  service.booking_provider AS service_booking_provider
FROM public.discovery_calls dc
LEFT JOIN public.profiles founder ON founder.id = dc.founder_id
LEFT JOIN public.subscribers founder_sub ON founder_sub.user_id = founder.id
LEFT JOIN public.mentors mentor ON mentor.id = dc.mentor_id
LEFT JOIN public.services service ON service.id = dc.service_id;

REVOKE ALL ON TABLE public.discovery_call_admin_overview FROM PUBLIC;
REVOKE ALL ON TABLE public.discovery_call_admin_overview FROM anon;
REVOKE ALL ON TABLE public.discovery_call_admin_overview FROM authenticated;
GRANT SELECT ON TABLE public.discovery_call_admin_overview TO service_role;
