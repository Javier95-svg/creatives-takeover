-- Discovery Call booking notifications + reliable founder self-confirmation.
--
-- Context: bookings happen on each mentor's external Calendly/Koalendar, so
-- provider confirmation webhooks never arrive (can't be configured across 51
-- accounts). This makes the booking intent (and an explicit founder confirm) the
-- reliable signals we control. This migration:
--   1. Adds mentors.contact_email so every mentor is reachable by email even
--      without a linked account (the in-app bell still needs a linked account).
--   2. Surfaces contact_email on the admin-overview view the notifier reads.
--   3. Adds a founder-facing self-confirm RPC that charges the 10 credits and
--      marks the call scheduled (delegates to the tested finalize routine, which
--      is idempotent on the same deduction key so it can never double-charge).

-- 1. Mentor contact email (notification fallback) -----------------------------
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS contact_email text;

-- 2. Recreate the admin overview with contact_email --------------------------
DROP VIEW IF EXISTS public.discovery_call_admin_overview;
CREATE VIEW public.discovery_call_admin_overview AS
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
  mentor.booking_provider AS mentor_booking_provider,
  mentor.contact_email AS mentor_contact_email
FROM public.discovery_calls dc
LEFT JOIN public.profiles founder ON founder.id = dc.founder_id
LEFT JOIN public.subscribers founder_sub ON founder_sub.user_id = founder.id
LEFT JOIN public.mentors mentor ON mentor.id = dc.mentor_id;

REVOKE ALL ON TABLE public.discovery_call_admin_overview FROM PUBLIC;
REVOKE ALL ON TABLE public.discovery_call_admin_overview FROM anon;
REVOKE ALL ON TABLE public.discovery_call_admin_overview FROM authenticated;
GRANT SELECT ON TABLE public.discovery_call_admin_overview TO service_role;

-- 3. Founder self-confirmation ------------------------------------------------
-- Lets the founder confirm "I completed my booking" from the platform. Verifies
-- ownership, then delegates to finalize_discovery_call_booking which charges the
-- credits and flips status to 'scheduled'. The exact time lives in the mentor's
-- external calendar; we record now() as a placeholder and flag it self-confirmed.
CREATE OR REPLACE FUNCTION public.confirm_discovery_call_by_founder(
  p_call_id UUID,
  p_founder_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call RECORD;
BEGIN
  IF p_call_id IS NULL OR p_founder_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_REQUEST',
      'error', 'Call ID and founder are required.');
  END IF;

  SELECT id, founder_id, status, scheduled_for, credit_charge_amount
  INTO v_call
  FROM public.discovery_calls
  WHERE id = p_call_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND',
      'error', 'Discovery call not found.');
  END IF;

  IF v_call.founder_id <> p_founder_id THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN',
      'error', 'This discovery call does not belong to you.');
  END IF;

  -- Already confirmed: return success without re-charging (idempotent).
  IF v_call.status <> 'intent_created' THEN
    RETURN jsonb_build_object(
      'success', true,
      'callId', v_call.id,
      'status', v_call.status,
      'alreadyConfirmed', true,
      'chargedCredits', COALESCE(v_call.credit_charge_amount, 0)
    );
  END IF;

  RETURN public.finalize_discovery_call_booking(
    p_call_id,
    now(),
    30,
    'self_confirmed',
    NULL,
    NULL,
    NULL,
    jsonb_strip_nulls(
      COALESCE(p_metadata, '{}'::jsonb) ||
      jsonb_build_object('selfConfirmed', true, 'exactTimeUnknown', true)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_discovery_call_by_founder(UUID, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_discovery_call_by_founder(UUID, UUID, JSONB) TO service_role;
