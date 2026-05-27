-- Provider-neutral discovery call confirmations.
-- Booking tools feed normalized events into Creative Takeover, while
-- discovery_calls remains the source of truth and the only charging path.

ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS booking_provider TEXT NOT NULL DEFAULT 'calendly'
CHECK (booking_provider IN ('calendly', 'koalendar', 'other', 'manual'));

CREATE OR REPLACE FUNCTION public.infer_discovery_call_provider(
  p_booking_url TEXT,
  p_booking_provider TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_provider TEXT := LOWER(NULLIF(TRIM(COALESCE(p_booking_provider, '')), ''));
  v_url TEXT := LOWER(NULLIF(TRIM(COALESCE(p_booking_url, '')), ''));
BEGIN
  IF v_provider IN ('calendly', 'koalendar', 'other', 'manual') THEN
    RETURN v_provider;
  END IF;

  IF v_url IS NULL THEN
    RETURN 'manual';
  END IF;

  IF v_url LIKE '%calendly.com%' THEN
    RETURN 'calendly';
  END IF;

  IF v_url LIKE '%koalendar.com%' THEN
    RETURN 'koalendar';
  END IF;

  RETURN 'other';
END;
$$;

UPDATE public.mentors
SET booking_provider = public.infer_discovery_call_provider(calendly_url, booking_provider)
WHERE booking_provider IS NULL
   OR booking_provider = 'calendly';

COMMENT ON COLUMN public.mentors.calendly_url IS 'External booking link for discovery calls. Kept as calendly_url for backwards compatibility.';
COMMENT ON COLUMN public.mentors.booking_provider IS 'Scheduling provider for discovery call booking links.';

CREATE TABLE IF NOT EXISTS public.discovery_call_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL CHECK (provider_name IN ('calendly', 'koalendar', 'email', 'manual', 'other')),
  provider_event_type TEXT NOT NULL CHECK (provider_event_type IN ('booking_created', 'booking_cancelled', 'booking_rescheduled', 'ignored')),
  provider_event_id TEXT,
  provider_invitee_id TEXT,
  discovery_call_id UUID REFERENCES public.discovery_calls(id) ON DELETE SET NULL,
  matched_by TEXT NOT NULL DEFAULT 'unmatched' CHECK (
    matched_by IN ('tracking_id', 'provider_invitee_id', 'provider_event_id', 'email_recent_intent', 'manual', 'unmatched')
  ),
  match_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (
    match_status IN ('matched', 'pending_review', 'ignored', 'failed')
  ),
  confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  scheduled_for TIMESTAMPTZ,
  meeting_url TEXT,
  invitee_email TEXT,
  invitee_name TEXT,
  normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS discovery_call_provider_events_provider_event_key
  ON public.discovery_call_provider_events (provider_name, provider_event_type, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS discovery_call_provider_events_call_created_idx
  ON public.discovery_call_provider_events (discovery_call_id, created_at DESC);

CREATE INDEX IF NOT EXISTS discovery_call_provider_events_review_idx
  ON public.discovery_call_provider_events (match_status, created_at DESC)
  WHERE match_status = 'pending_review';

ALTER TABLE public.discovery_call_provider_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view discovery call provider events" ON public.discovery_call_provider_events;
CREATE POLICY "Admins can view discovery call provider events"
  ON public.discovery_call_provider_events
  FOR SELECT
  USING (public.is_discovery_call_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.create_discovery_call_intent(
  p_founder_id UUID,
  p_mentor_id UUID,
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
  v_mentor RECORD;
  v_call RECORD;
  v_quota_status JSONB;
  v_provider TEXT;
BEGIN
  IF p_founder_id IS NULL OR p_mentor_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'INVALID_REQUEST',
      'error', 'Founder and mentor are required.'
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
        'providerBookingUrl', v_existing.provider_booking_url
      );
    END IF;
  END IF;

  SELECT
    id,
    name,
    calendly_url,
    is_active,
    public.infer_discovery_call_provider(calendly_url, booking_provider) AS booking_provider
  INTO v_mentor
  FROM public.mentors
  WHERE id = p_mentor_id;

  IF NOT FOUND OR COALESCE(v_mentor.is_active, false) = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'MENTOR_UNAVAILABLE',
      'error', 'This mentor is not currently available for discovery calls.'
    );
  END IF;

  IF NULLIF(TRIM(COALESCE(v_mentor.calendly_url, '')), '') IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'errorCode', 'MENTOR_UNAVAILABLE',
      'error', 'This mentor does not have a booking link configured yet.'
    );
  END IF;

  v_provider := public.infer_discovery_call_provider(v_mentor.calendly_url, v_mentor.booking_provider);
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
    provider_name,
    provider_booking_url,
    status,
    booking_source,
    idempotency_key,
    metadata
  ) VALUES (
    p_founder_id,
    p_mentor_id,
    v_mentor.name,
    v_provider,
    v_mentor.calendly_url,
    'intent_created',
    NULLIF(TRIM(COALESCE(p_source, '')), ''),
    NULLIF(TRIM(COALESCE(p_idempotency_key, '')), ''),
    jsonb_strip_nulls(
      COALESCE(p_metadata, '{}'::jsonb)
      || jsonb_build_object('bookingProvider', v_provider)
    )
  )
  RETURNING * INTO v_call;

  PERFORM public.log_discovery_call_event(
    v_call.id,
    'intent_created',
    p_founder_id,
    jsonb_build_object(
      'source', NULLIF(TRIM(COALESCE(p_source, '')), ''),
      'mentorId', p_mentor_id,
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
    'quotaStatus', v_quota_status
  );
END;
$$;

DROP VIEW IF EXISTS public.discovery_call_admin_overview;
CREATE OR REPLACE VIEW public.discovery_call_admin_overview AS
SELECT
  dc.id,
  dc.status,
  dc.booking_source,
  dc.scheduled_for,
  dc.duration_minutes,
  dc.billing_period_start,
  dc.subscription_tier_snapshot,
  dc.consumption_mode,
  dc.credit_charge_amount,
  dc.credits_charged,
  dc.credits_refunded,
  dc.created_at,
  dc.updated_at,
  dc.cancelled_at,
  dc.cancelled_reason,
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
  mentor.name AS mentor_name,
  mentor.user_id AS mentor_user_id,
  mentor.calendly_url AS mentor_booking_url,
  mentor.booking_provider AS mentor_booking_provider
FROM public.discovery_calls dc
LEFT JOIN public.profiles founder ON founder.id = dc.founder_id
LEFT JOIN public.subscribers founder_sub ON founder_sub.user_id = founder.id
LEFT JOIN public.mentors mentor ON mentor.id = dc.mentor_id;

REVOKE ALL ON TABLE public.discovery_call_admin_overview FROM PUBLIC;
REVOKE ALL ON TABLE public.discovery_call_admin_overview FROM anon;
REVOKE ALL ON TABLE public.discovery_call_admin_overview FROM authenticated;
GRANT SELECT ON TABLE public.discovery_call_admin_overview TO service_role;
