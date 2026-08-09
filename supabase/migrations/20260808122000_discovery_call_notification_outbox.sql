-- Durable, role-specific email delivery for Discovery Call V2.

CREATE TABLE IF NOT EXISTS public.discovery_call_notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id BIGINT NOT NULL REFERENCES public.discovery_call_events(id) ON DELETE CASCADE,
  discovery_call_id UUID NOT NULL REFERENCES public.discovery_calls(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('founder', 'mentor', 'admin')),
  recipient_email TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  secure_token_ciphertext TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 6 CHECK (max_attempts BETWEEN 1 AND 12),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sending_started_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  provider_message_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, template_key, recipient_role, recipient_email)
);

CREATE INDEX IF NOT EXISTS discovery_call_outbox_due_idx
  ON public.discovery_call_notification_outbox (next_attempt_at, created_at)
  WHERE status IN ('pending', 'sending');
CREATE INDEX IF NOT EXISTS discovery_call_outbox_call_idx
  ON public.discovery_call_notification_outbox (discovery_call_id, created_at DESC);

ALTER TABLE public.discovery_call_notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discovery_call_notification_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.discovery_call_notification_outbox TO service_role;

DROP TRIGGER IF EXISTS discovery_call_outbox_updated_at ON public.discovery_call_notification_outbox;
CREATE TRIGGER discovery_call_outbox_updated_at
  BEFORE UPDATE ON public.discovery_call_notification_outbox
  FOR EACH ROW EXECUTE FUNCTION public.set_discovery_call_v2_updated_at();

CREATE OR REPLACE FUNCTION public.record_discovery_call_event_v2(
  p_discovery_call_id UUID,
  p_event_type TEXT,
  p_actor_user_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_event_id BIGINT;
BEGIN
  INSERT INTO public.discovery_call_events (
    discovery_call_id, event_type, actor_user_id, payload
  ) VALUES (
    p_discovery_call_id, p_event_type, p_actor_user_id,
    COALESCE(p_payload, '{}'::jsonb)
  ) RETURNING id INTO v_event_id;
  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_discovery_call_notification_v2(
  p_event_id BIGINT,
  p_discovery_call_id UUID,
  p_template_key TEXT,
  p_recipient_role TEXT,
  p_recipient_email TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_secure_token_ciphertext TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF p_recipient_role NOT IN ('founder', 'mentor', 'admin')
     OR NULLIF(lower(btrim(COALESCE(p_recipient_email, ''))), '') IS NULL THEN
    RAISE EXCEPTION 'A valid notification role and email are required';
  END IF;

  INSERT INTO public.discovery_call_notification_outbox (
    event_id, discovery_call_id, template_key, recipient_role,
    recipient_email, payload, secure_token_ciphertext
  ) VALUES (
    p_event_id, p_discovery_call_id, p_template_key, p_recipient_role,
    lower(btrim(p_recipient_email)), COALESCE(p_payload, '{}'::jsonb),
    p_secure_token_ciphertext
  )
  ON CONFLICT (event_id, template_key, recipient_role, recipient_email)
  DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.discovery_call_notification_outbox
    WHERE event_id = p_event_id
      AND template_key = p_template_key
      AND recipient_role = p_recipient_role
      AND recipient_email = lower(btrim(p_recipient_email));
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_discovery_call_notifications(p_limit INTEGER DEFAULT 25)
RETURNS SETOF public.discovery_call_notification_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.discovery_call_notification_outbox
  SET status = 'pending', sending_started_at = NULL,
      next_attempt_at = now(), last_error = 'Recovered stale delivery claim'
  WHERE status = 'sending' AND sending_started_at < now() - interval '10 minutes';

  RETURN QUERY
  WITH due AS (
    SELECT id
    FROM public.discovery_call_notification_outbox
    WHERE status = 'pending'
      AND next_attempt_at <= now()
      AND attempt_count < max_attempts
    ORDER BY next_attempt_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100)
  )
  UPDATE public.discovery_call_notification_outbox o
  SET status = 'sending', sending_started_at = now(),
      attempt_count = attempt_count + 1
  FROM due
  WHERE o.id = due.id
  RETURNING o.*;
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
DECLARE v_attempt INTEGER; v_max INTEGER; v_delay INTERVAL;
BEGIN
  SELECT attempt_count, max_attempts INTO v_attempt, v_max
  FROM public.discovery_call_notification_outbox
  WHERE id = p_outbox_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF p_success THEN
    UPDATE public.discovery_call_notification_outbox
    SET status = 'sent', sent_at = now(), sending_started_at = NULL,
        provider_message_id = p_provider_message_id, last_error = NULL
    WHERE id = p_outbox_id;
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
      next_attempt_at = now() + v_delay,
      sending_started_at = NULL,
      last_error = left(COALESCE(p_error, 'Unknown delivery error'), 2000)
  WHERE id = p_outbox_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_discovery_call_event_v2(UUID, TEXT, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_discovery_call_notification_v2(BIGINT, UUID, TEXT, TEXT, TEXT, JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_discovery_call_notifications(INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_discovery_call_notification(UUID, BOOLEAN, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_discovery_call_event_v2(UUID, TEXT, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_discovery_call_notification_v2(BIGINT, UUID, TEXT, TEXT, TEXT, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_discovery_call_notifications(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_discovery_call_notification(UUID, BOOLEAN, TEXT, TEXT) TO service_role;
