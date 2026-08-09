-- Discovery Call notification reliability V3.
-- Adds founder request receipts, provider delivery tracking, independent admin
-- alerts, delivery-aware health checks, outcome reminders, and safe resend
-- generations for provider-level idempotency.

ALTER TABLE public.discovery_call_notification_outbox
  ADD COLUMN IF NOT EXISTS send_generation INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_delivery_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS provider_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_delayed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suppressed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_last_error TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discovery_call_outbox_send_generation_check'
  ) THEN
    ALTER TABLE public.discovery_call_notification_outbox
      ADD CONSTRAINT discovery_call_outbox_send_generation_check
      CHECK (send_generation >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discovery_call_outbox_provider_delivery_status_check'
  ) THEN
    ALTER TABLE public.discovery_call_notification_outbox
      ADD CONSTRAINT discovery_call_outbox_provider_delivery_status_check
      CHECK (provider_delivery_status IN (
        'pending', 'accepted', 'delivered', 'delayed',
        'bounced', 'complained', 'failed', 'suppressed'
      ));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS discovery_call_outbox_provider_message_idx
  ON public.discovery_call_notification_outbox (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS discovery_call_outbox_delivery_health_idx
  ON public.discovery_call_notification_outbox (provider_delivery_status, provider_event_at)
  WHERE provider_delivery_status <> 'delivered';

UPDATE public.discovery_call_notification_outbox
SET provider_delivery_status = CASE
  WHEN status = 'sent' THEN 'accepted'
  WHEN status = 'failed' THEN 'failed'
  ELSE 'pending'
END
WHERE provider_delivery_status = 'pending';

CREATE TABLE IF NOT EXISTS public.discovery_call_notification_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id TEXT NOT NULL UNIQUE,
  provider_message_id TEXT NOT NULL,
  outbox_id UUID REFERENCES public.discovery_call_notification_outbox(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_created_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discovery_call_delivery_events_message_idx
  ON public.discovery_call_notification_delivery_events (provider_message_id, event_created_at DESC);

ALTER TABLE public.discovery_call_notification_delivery_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discovery_call_notification_delivery_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.discovery_call_notification_delivery_events TO service_role;

CREATE TABLE IF NOT EXISTS public.discovery_call_notification_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_call_id UUID NOT NULL REFERENCES public.discovery_calls(id) ON DELETE CASCADE,
  outbox_id UUID REFERENCES public.discovery_call_notification_outbox(id) ON DELETE CASCADE,
  alert_key TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium')),
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discovery_call_notification_alerts_open_idx
  ON public.discovery_call_notification_alerts (created_at DESC)
  WHERE status = 'open';

ALTER TABLE public.discovery_call_notification_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discovery_call_notification_alerts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.discovery_call_notification_alerts TO service_role;

DROP TRIGGER IF EXISTS discovery_call_notification_alerts_updated_at
  ON public.discovery_call_notification_alerts;
CREATE TRIGGER discovery_call_notification_alerts_updated_at
  BEFORE UPDATE ON public.discovery_call_notification_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_discovery_call_v2_updated_at();

CREATE OR REPLACE FUNCTION public.raise_discovery_call_notification_alert_v3(
  p_outbox_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_outbox public.discovery_call_notification_outbox%ROWTYPE;
  v_alert_id UUID;
  v_admin_id UUID;
  v_alert_key TEXT;
  v_inserted BOOLEAN := false;
BEGIN
  SELECT * INTO v_outbox
  FROM public.discovery_call_notification_outbox
  WHERE id = p_outbox_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF p_severity NOT IN ('critical', 'high', 'medium') THEN
    RAISE EXCEPTION 'Invalid Discovery Call notification alert severity';
  END IF;

  v_alert_key := concat_ws(':', p_outbox_id::text, v_outbox.send_generation::text, p_alert_type);
  INSERT INTO public.discovery_call_notification_alerts (
    discovery_call_id, outbox_id, alert_key, severity,
    alert_type, message, metadata
  ) VALUES (
    v_outbox.discovery_call_id, p_outbox_id, v_alert_key, p_severity,
    p_alert_type, left(COALESCE(NULLIF(btrim(p_message), ''), p_alert_type), 1000),
    COALESCE(p_metadata, '{}'::jsonb)
      || jsonb_build_object(
        'templateKey', v_outbox.template_key,
        'recipientRole', v_outbox.recipient_role,
        'recipientEmail', v_outbox.recipient_email,
        'sendGeneration', v_outbox.send_generation
      )
  )
  ON CONFLICT (alert_key) DO NOTHING
  RETURNING id INTO v_alert_id;

  v_inserted := v_alert_id IS NOT NULL;
  IF NOT v_inserted THEN
    SELECT id INTO v_alert_id
    FROM public.discovery_call_notification_alerts
    WHERE alert_key = v_alert_key;
  END IF;

  IF v_inserted THEN
    SELECT id INTO v_admin_id
    FROM auth.users
    WHERE lower(email) = 'admin@creatives-takeover.com'
    LIMIT 1;

    IF v_admin_id IS NOT NULL THEN
      INSERT INTO public.community_notifications (
        user_id, actor_id, notification_type, read, metadata
      ) VALUES (
        v_admin_id, v_admin_id, 'discovery_call_event', false,
        jsonb_build_object(
          'message', left(COALESCE(NULLIF(btrim(p_message), ''), 'Discovery Call notification requires attention'), 500),
          'route', '/mentorship/admin/discovery-calls?call=' || v_outbox.discovery_call_id::text,
          'discoveryCallId', v_outbox.discovery_call_id,
          'notificationAlertId', v_alert_id,
          'severity', p_severity,
          'eventType', p_alert_type,
          'image_url', '/lovable-uploads/new-favicon.png'
        )
      );
    END IF;
  END IF;

  RETURN v_alert_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_discovery_call_notification_alerts_v3(
  p_outbox_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.discovery_call_notification_alerts
  SET status = 'resolved', resolved_at = now()
  WHERE outbox_id = p_outbox_id AND status = 'open';
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_discovery_call_delivery_event_v3(
  p_outbox_id UUID,
  p_event_type TEXT,
  p_event_created_at TIMESTAMPTZ,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_error TEXT;
BEGIN
  v_status := CASE lower(p_event_type)
    WHEN 'email.sent' THEN 'accepted'
    WHEN 'email.delivered' THEN 'delivered'
    WHEN 'email.delivery_delayed' THEN 'delayed'
    WHEN 'email.bounced' THEN 'bounced'
    WHEN 'email.complained' THEN 'complained'
    WHEN 'email.failed' THEN 'failed'
    WHEN 'email.suppressed' THEN 'suppressed'
    ELSE NULL
  END;
  IF v_status IS NULL THEN RETURN; END IF;

  v_error := COALESCE(
    p_payload #>> '{data,bounce,message}',
    p_payload #>> '{data,reason}',
    p_payload #>> '{data,error}',
    p_payload ->> 'reason',
    p_payload ->> 'error'
  );

  UPDATE public.discovery_call_notification_outbox
  SET provider_delivery_status = v_status,
      provider_event_at = p_event_created_at,
      delivered_at = CASE WHEN v_status = 'delivered' THEN p_event_created_at ELSE delivered_at END,
      delivery_delayed_at = CASE WHEN v_status = 'delayed' THEN p_event_created_at ELSE delivery_delayed_at END,
      bounced_at = CASE WHEN v_status = 'bounced' THEN p_event_created_at ELSE bounced_at END,
      complained_at = CASE WHEN v_status = 'complained' THEN p_event_created_at ELSE complained_at END,
      suppressed_at = CASE WHEN v_status = 'suppressed' THEN p_event_created_at ELSE suppressed_at END,
      provider_last_error = CASE
        WHEN v_status IN ('bounced', 'complained', 'failed', 'suppressed')
          THEN left(COALESCE(v_error, 'Resend event: ' || p_event_type), 2000)
        WHEN v_status = 'delivered' THEN NULL
        ELSE provider_last_error
      END
  WHERE id = p_outbox_id
    AND (provider_event_at IS NULL OR p_event_created_at >= provider_event_at);

  IF NOT FOUND THEN RETURN; END IF;

  IF v_status = 'delivered' THEN
    PERFORM public.resolve_discovery_call_notification_alerts_v3(p_outbox_id);
  ELSIF v_status IN ('bounced', 'complained', 'failed', 'suppressed') THEN
    PERFORM public.raise_discovery_call_notification_alert_v3(
      p_outbox_id,
      'provider_' || v_status,
      'high',
      'Discovery Call email ' || v_status || ' for a required recipient.',
      jsonb_build_object('providerEventType', p_event_type, 'providerError', v_error)
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_discovery_call_resend_event_v3(
  p_provider_event_id TEXT,
  p_event_type TEXT,
  p_event_created_at TIMESTAMPTZ,
  p_provider_message_id TEXT,
  p_outbox_id UUID DEFAULT NULL,
  p_send_generation INTEGER DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outbox_id UUID;
  v_event_id UUID;
BEGIN
  IF NULLIF(btrim(COALESCE(p_provider_event_id, '')), '') IS NULL
     OR NULLIF(btrim(COALESCE(p_provider_message_id, '')), '') IS NULL
     OR p_event_type NOT IN (
       'email.sent', 'email.delivered', 'email.delivery_delayed',
       'email.bounced', 'email.complained', 'email.failed', 'email.suppressed'
     ) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_EVENT');
  END IF;

  IF p_outbox_id IS NOT NULL AND p_send_generation IS NOT NULL THEN
    SELECT id INTO v_outbox_id
    FROM public.discovery_call_notification_outbox
    WHERE id = p_outbox_id AND send_generation = p_send_generation
      AND (provider_message_id IS NULL OR provider_message_id = p_provider_message_id);
  END IF;
  IF v_outbox_id IS NULL THEN
    SELECT id INTO v_outbox_id
    FROM public.discovery_call_notification_outbox
    WHERE provider_message_id = p_provider_message_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  INSERT INTO public.discovery_call_notification_delivery_events (
    provider_event_id, provider_message_id, outbox_id,
    event_type, event_created_at, payload
  ) VALUES (
    p_provider_event_id, p_provider_message_id, v_outbox_id,
    p_event_type, COALESCE(p_event_created_at, now()), COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (provider_event_id) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true);
  END IF;

  IF v_outbox_id IS NOT NULL THEN
    PERFORM public.apply_discovery_call_delivery_event_v3(
      v_outbox_id, p_event_type, COALESCE(p_event_created_at, now()), p_payload
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'matched', v_outbox_id IS NOT NULL,
    'outboxId', v_outbox_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_discovery_call_notification(
  p_outbox_id UUID,
  p_success BOOLEAN,
  p_provider_message_id TEXT DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt INTEGER;
  v_max INTEGER;
  v_delay INTERVAL;
  v_event RECORD;
BEGIN
  SELECT attempt_count, max_attempts INTO v_attempt, v_max
  FROM public.discovery_call_notification_outbox
  WHERE id = p_outbox_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF p_success THEN
    UPDATE public.discovery_call_notification_outbox
    SET status = 'sent', sent_at = COALESCE(sent_at, now()), sending_started_at = NULL,
        provider_message_id = p_provider_message_id, last_error = NULL,
        provider_delivery_status = CASE
          WHEN provider_event_at IS NULL THEN 'accepted'
          ELSE provider_delivery_status
        END
    WHERE id = p_outbox_id;

    FOR v_event IN
      SELECT id, event_type, event_created_at, payload
      FROM public.discovery_call_notification_delivery_events
      WHERE provider_message_id = p_provider_message_id
      ORDER BY event_created_at, received_at
    LOOP
      UPDATE public.discovery_call_notification_delivery_events
      SET outbox_id = p_outbox_id
      WHERE id = v_event.id AND outbox_id IS NULL;
      PERFORM public.apply_discovery_call_delivery_event_v3(
        p_outbox_id, v_event.event_type, v_event.event_created_at, v_event.payload
      );
    END LOOP;
    RETURN;
  END IF;

  v_delay := CASE v_attempt
    WHEN 1 THEN interval '1 minute'
    WHEN 2 THEN interval '5 minutes'
    WHEN 3 THEN interval '15 minutes'
    WHEN 4 THEN interval '1 hour'
    WHEN 5 THEN interval '3 hours'
    ELSE interval '6 hours'
  END;

  UPDATE public.discovery_call_notification_outbox
  SET status = CASE WHEN v_attempt >= v_max THEN 'failed' ELSE 'pending' END,
      provider_delivery_status = CASE WHEN v_attempt >= v_max THEN 'failed' ELSE provider_delivery_status END,
      next_attempt_at = now() + v_delay,
      sending_started_at = NULL,
      last_error = left(COALESCE(p_error, 'Unknown delivery error'), 2000),
      provider_last_error = CASE
        WHEN v_attempt >= v_max THEN left(COALESCE(p_error, 'Unknown delivery error'), 2000)
        ELSE provider_last_error
      END
  WHERE id = p_outbox_id;

  IF v_attempt >= v_max THEN
    PERFORM public.raise_discovery_call_notification_alert_v3(
      p_outbox_id,
      'delivery_attempts_exhausted',
      'high',
      'Discovery Call email exhausted all delivery attempts.',
      jsonb_build_object('attemptCount', v_attempt, 'error', left(COALESCE(p_error, 'Unknown delivery error'), 2000))
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.retry_discovery_call_notification_v3(
  p_outbox_id UUID,
  p_admin_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_discovery_call_admin(p_admin_user_id) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN');
  END IF;

  UPDATE public.discovery_call_notification_outbox
  SET status = 'pending', attempt_count = 0, next_attempt_at = now(),
      sending_started_at = NULL, sent_at = NULL, provider_message_id = NULL,
      last_error = NULL, provider_last_error = NULL,
      provider_delivery_status = 'pending', provider_event_at = NULL,
      delivered_at = NULL, delivery_delayed_at = NULL, bounced_at = NULL,
      complained_at = NULL, suppressed_at = NULL,
      send_generation = send_generation + 1
  WHERE id = p_outbox_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true, 'notificationId', p_outbox_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_founder_discovery_request_receipt_v3()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_founder_email TEXT;
BEGIN
  IF NEW.template_key <> 'request_created' OR NEW.recipient_role <> 'admin' THEN
    RETURN NEW;
  END IF;

  SELECT founder_email_snapshot INTO v_founder_email
  FROM public.discovery_calls
  WHERE id = NEW.discovery_call_id AND workflow_version = 2;

  IF v_founder_email IS NOT NULL THEN
    PERFORM public.enqueue_discovery_call_notification_v2(
      NEW.event_id, NEW.discovery_call_id, 'request_created', 'founder',
      v_founder_email, NEW.payload, NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_founder_discovery_request_receipt_v3
  ON public.discovery_call_notification_outbox;
CREATE TRIGGER ensure_founder_discovery_request_receipt_v3
  AFTER INSERT ON public.discovery_call_notification_outbox
  FOR EACH ROW EXECUTE FUNCTION public.ensure_founder_discovery_request_receipt_v3();

-- Backfill founder receipts for V2 requests created before this migration.
DO $$
DECLARE v_record RECORD;
BEGIN
  FOR v_record IN
    SELECT e.id AS event_id, e.discovery_call_id, e.payload, dc.founder_email_snapshot
    FROM public.discovery_call_events e
    JOIN public.discovery_calls dc ON dc.id = e.discovery_call_id
    WHERE e.event_type = 'request_created'
      AND dc.workflow_version = 2
      AND dc.status = 'pending_mentor_response'
      AND dc.founder_email_snapshot IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.discovery_call_notification_outbox o
        WHERE o.event_id = e.id AND o.template_key = 'request_created'
          AND o.recipient_role = 'founder'
      )
  LOOP
    PERFORM public.enqueue_discovery_call_notification_v2(
      v_record.event_id, v_record.discovery_call_id, 'request_created', 'founder',
      v_record.founder_email_snapshot, v_record.payload, NULL
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_discovery_call_deadlines_v2()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_round RECORD;
  v_call public.discovery_calls%ROWTYPE;
  v_event BIGINT;
  v_payload JSONB;
  v_secure_cipher TEXT;
  v_alert_outbox RECORD;
  v_reminders INTEGER := 0;
  v_expired INTEGER := 0;
  v_outcomes INTEGER := 0;
BEGIN
  FOR v_round IN
    SELECT * FROM public.discovery_call_scheduling_rounds
    WHERE status = 'pending' ORDER BY response_due_at
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO v_call FROM public.discovery_calls
    WHERE id = v_round.discovery_call_id FOR UPDATE;
    IF v_round.response_due_at <= now() THEN
      UPDATE public.discovery_call_scheduling_rounds
      SET status = 'expired', responded_at = now() WHERE id = v_round.id;
      IF v_round.round_type = 'initial' THEN
        PERFORM public.release_discovery_call_reservation_v2(
          v_call.credit_reservation_id, 'Discovery Call response deadline expired', true
        );
        UPDATE public.discovery_calls
        SET status = 'expired', response_due_at = NULL, last_state_changed_at = now()
        WHERE id = v_call.id;
        UPDATE public.discovery_call_action_tokens SET revoked_at = now()
        WHERE discovery_call_id = v_call.id AND revoked_at IS NULL;
        v_payload := jsonb_build_object(
          'callId', v_call.id, 'mentorName', v_call.mentor_name_snapshot,
          'creditsReleased', 10
        );
        v_event := public.record_discovery_call_event_v2(v_call.id, 'request_expired', NULL, v_payload);
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'request_expired', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'request_expired', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'request_expired', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
      ELSE
        v_payload := jsonb_build_object(
          'callId', v_call.id, 'mentorName', v_call.mentor_name_snapshot,
          'scheduledFor', v_call.scheduled_for, 'originalBookingUnchanged', true
        );
        v_event := public.record_discovery_call_event_v2(v_call.id, 'reschedule_expired', NULL, v_payload);
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'reschedule_expired', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'reschedule_expired', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'reschedule_expired', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
      END IF;
      v_expired := v_expired + 1;
    ELSIF v_round.reminder_24h_sent_at IS NULL
       AND v_round.created_at <= now() - interval '24 hours' THEN
      v_payload := jsonb_build_object(
        'callId', v_call.id, 'mentorName', v_call.mentor_name_snapshot,
        'responseDueAt', v_round.response_due_at
      );
      v_event := public.record_discovery_call_event_v2(v_call.id, 'response_reminder_24h', NULL, v_payload);
      IF v_round.responder_role = 'founder' THEN
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'founder_reminder_24h', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
      ELSE
        SELECT secure_token_ciphertext INTO v_secure_cipher
        FROM public.discovery_call_notification_outbox
        WHERE discovery_call_id = v_call.id AND recipient_role = 'mentor'
          AND secure_token_ciphertext IS NOT NULL
        ORDER BY created_at DESC LIMIT 1;
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'mentor_reminder_24h', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, v_secure_cipher);
      END IF;
      UPDATE public.discovery_call_scheduling_rounds
      SET reminder_24h_sent_at = now() WHERE id = v_round.id;
      v_reminders := v_reminders + 1;
    ELSIF v_round.responder_role = 'mentor' AND v_round.round_type = 'initial'
       AND v_round.reminder_48h_sent_at IS NULL
       AND v_round.created_at <= now() - interval '48 hours' THEN
      v_payload := jsonb_build_object(
        'callId', v_call.id, 'mentorName', v_call.mentor_name_snapshot,
        'responseDueAt', v_round.response_due_at
      );
      v_event := public.record_discovery_call_event_v2(v_call.id, 'response_reminder_48h', NULL, v_payload);
      SELECT secure_token_ciphertext INTO v_secure_cipher
      FROM public.discovery_call_notification_outbox
      WHERE discovery_call_id = v_call.id AND recipient_role = 'mentor'
        AND secure_token_ciphertext IS NOT NULL
      ORDER BY created_at DESC LIMIT 1;
      PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'mentor_reminder_48h', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, v_secure_cipher);
      UPDATE public.discovery_call_scheduling_rounds
      SET reminder_48h_sent_at = now() WHERE id = v_round.id;
      v_reminders := v_reminders + 1;
    END IF;
  END LOOP;

  FOR v_call IN
    SELECT * FROM public.discovery_calls
    WHERE workflow_version = 2 AND status = 'scheduled'
      AND scheduled_for + make_interval(mins => duration_minutes) <= now()
    ORDER BY scheduled_for
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.discovery_calls
    SET status = 'awaiting_outcome', last_state_changed_at = now()
    WHERE id = v_call.id;
    v_payload := jsonb_build_object(
      'callId', v_call.id,
      'founderId', v_call.founder_id,
      'mentorId', v_call.mentor_id,
      'founderEmail', v_call.founder_email_snapshot,
      'mentorEmail', v_call.mentor_contact_email_snapshot,
      'mentorName', v_call.mentor_name_snapshot,
      'scheduledFor', v_call.scheduled_for,
      'durationMinutes', v_call.duration_minutes
    );
    v_event := public.record_discovery_call_event_v2(v_call.id, 'awaiting_outcome', NULL, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(
      v_event, v_call.id, 'outcome_required', 'admin',
      'admin@creatives-takeover.com', v_payload, NULL
    );
    v_outcomes := v_outcomes + 1;
  END LOOP;

  -- Independent in-app/admin-dashboard alerting. This does not use the email
  -- channel it is monitoring, so a Resend outage cannot hide itself.
  FOR v_alert_outbox IN
    SELECT id, status, provider_delivery_status
    FROM public.discovery_call_notification_outbox
    WHERE created_at <= now() - interval '15 minutes'
      AND (
        (status IN ('pending', 'sending') AND provider_delivery_status <> 'delivered')
        OR provider_delivery_status IN ('pending', 'accepted', 'delayed')
      )
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.raise_discovery_call_notification_alert_v3(
      v_alert_outbox.id,
      'delivery_not_confirmed',
      'high',
      CASE
        WHEN v_alert_outbox.status IN ('pending', 'sending')
          THEN 'Discovery Call email has remained queued for more than 15 minutes.'
        ELSE 'Discovery Call email has not reported recipient-server delivery within 15 minutes.'
      END,
      jsonb_build_object(
        'queueStatus', v_alert_outbox.status,
        'providerDeliveryStatus', v_alert_outbox.provider_delivery_status
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 'remindersQueued', v_reminders,
    'roundsExpired', v_expired, 'awaitingOutcome', v_outcomes
  );
END;
$$;

-- Backfill an admin outcome reminder for calls already awaiting review.
DO $$
DECLARE v_call public.discovery_calls%ROWTYPE; v_event BIGINT; v_payload JSONB;
BEGIN
  FOR v_call IN
    SELECT * FROM public.discovery_calls dc
    WHERE dc.workflow_version = 2 AND dc.status = 'awaiting_outcome'
      AND NOT EXISTS (
        SELECT 1 FROM public.discovery_call_notification_outbox o
        WHERE o.discovery_call_id = dc.id AND o.template_key = 'outcome_required'
          AND o.recipient_role = 'admin'
      )
  LOOP
    v_payload := jsonb_build_object(
      'callId', v_call.id, 'founderId', v_call.founder_id,
      'mentorId', v_call.mentor_id, 'founderEmail', v_call.founder_email_snapshot,
      'mentorEmail', v_call.mentor_contact_email_snapshot,
      'mentorName', v_call.mentor_name_snapshot, 'scheduledFor', v_call.scheduled_for,
      'durationMinutes', v_call.duration_minutes
    );
    v_event := public.record_discovery_call_event_v2(v_call.id, 'awaiting_outcome', NULL, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(
      v_event, v_call.id, 'outcome_required', 'admin',
      'admin@creatives-takeover.com', v_payload, NULL
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE VIEW public.admin_discovery_call_workflow_health AS
SELECT 'overdue_round' AS issue, r.discovery_call_id, r.id::text AS detail_id, r.response_due_at AS detected_at
FROM public.discovery_call_scheduling_rounds r WHERE r.status = 'pending' AND r.response_due_at < now()
UNION ALL
SELECT 'expired_hold', discovery_call_id, id::text, expires_at
FROM public.discovery_call_credit_reservations WHERE status = 'pending' AND expires_at < now()
UNION ALL
SELECT 'scheduled_without_finalized_hold', dc.id, dc.credit_reservation_id::text, dc.created_at
FROM public.discovery_calls dc LEFT JOIN public.discovery_call_credit_reservations cr ON cr.id = dc.credit_reservation_id
WHERE dc.workflow_version = 2 AND dc.status IN ('scheduled', 'awaiting_outcome')
  AND (COALESCE(cr.status, '') <> 'finalized' OR cr.credit_transaction_id IS NULL)
UNION ALL
SELECT 'missing_confirmation_notification', dc.id, required.role, dc.confirmed_at
FROM public.discovery_calls dc
CROSS JOIN (VALUES ('founder'), ('mentor'), ('admin')) AS required(role)
WHERE dc.workflow_version = 2 AND dc.confirmed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.discovery_call_notification_outbox o
    WHERE o.discovery_call_id = dc.id AND o.template_key = 'booking_confirmed'
      AND o.recipient_role = required.role
  )
UNION ALL
SELECT 'confirmation_not_delivered', dc.id,
       required.role || ':' || COALESCE(o.provider_delivery_status, 'missing'),
       COALESCE(o.provider_event_at, o.updated_at, dc.confirmed_at)
FROM public.discovery_calls dc
CROSS JOIN (VALUES ('founder'), ('mentor'), ('admin')) AS required(role)
LEFT JOIN public.discovery_call_notification_outbox o
  ON o.discovery_call_id = dc.id AND o.template_key = 'booking_confirmed'
  AND o.recipient_role = required.role
WHERE dc.workflow_version = 2 AND dc.confirmed_at < now() - interval '15 minutes'
  AND COALESCE(o.provider_delivery_status, 'missing') <> 'delivered'
UNION ALL
SELECT 'outcome_notification_missing', dc.id, 'admin', dc.last_state_changed_at
FROM public.discovery_calls dc
WHERE dc.workflow_version = 2 AND dc.status = 'awaiting_outcome'
  AND dc.last_state_changed_at < now() - interval '15 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM public.discovery_call_notification_outbox o
    WHERE o.discovery_call_id = dc.id AND o.template_key = 'outcome_required'
      AND o.recipient_role = 'admin'
  )
UNION ALL
SELECT 'multiple_pending_rounds', discovery_call_id, count(*)::text, min(created_at)
FROM public.discovery_call_scheduling_rounds WHERE status = 'pending'
GROUP BY discovery_call_id HAVING count(*) > 1
UNION ALL
SELECT 'failed_notification', discovery_call_id, id::text, updated_at
FROM public.discovery_call_notification_outbox WHERE status = 'failed'
UNION ALL
SELECT 'provider_delivery_failure', discovery_call_id,
       id::text || ':' || provider_delivery_status,
       COALESCE(provider_event_at, updated_at)
FROM public.discovery_call_notification_outbox
WHERE provider_delivery_status IN ('bounced', 'complained', 'failed', 'suppressed')
UNION ALL
SELECT 'open_notification_alert', discovery_call_id, id::text, created_at
FROM public.discovery_call_notification_alerts WHERE status = 'open'
UNION ALL
SELECT 'v2_provider_data', id, COALESCE(provider_booking_url, provider_event_id, provider_invitee_id), updated_at
FROM public.discovery_calls WHERE workflow_version = 2
  AND (provider_booking_url IS NOT NULL OR provider_event_id IS NOT NULL OR provider_invitee_id IS NOT NULL);

REVOKE ALL ON public.admin_discovery_call_workflow_health FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_discovery_call_workflow_health TO service_role;

REVOKE ALL ON FUNCTION public.raise_discovery_call_notification_alert_v3(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_discovery_call_notification_alerts_v3(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_discovery_call_delivery_event_v3(UUID, TEXT, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_discovery_call_resend_event_v3(TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.retry_discovery_call_notification_v3(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_discovery_call_deadlines_v2() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.raise_discovery_call_notification_alert_v3(UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_discovery_call_notification_alerts_v3(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_discovery_call_delivery_event_v3(UUID, TEXT, TIMESTAMPTZ, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_discovery_call_resend_event_v3(TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID, INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.retry_discovery_call_notification_v3(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_discovery_call_deadlines_v2() TO service_role;

COMMENT ON COLUMN public.discovery_call_notification_outbox.status IS
  'Internal queue status. sent means the provider accepted the API request, not that the recipient mail server delivered it.';
COMMENT ON COLUMN public.discovery_call_notification_outbox.provider_delivery_status IS
  'Recipient delivery outcome reported by signed Resend webhooks.';
