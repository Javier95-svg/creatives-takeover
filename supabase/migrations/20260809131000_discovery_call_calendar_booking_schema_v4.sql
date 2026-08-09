-- Discovery Call V4: platform availability, collision-safe slot reservations,
-- durable Google Calendar/Meet operations, and optional mentor busy-calendar
-- synchronization. All credentials and private scheduling data remain
-- service-role only.

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- Some production mentor schemas predate the optional timezone field even
-- though the V2 request RPC already reads it. Keep this compatibility field
-- private; mentor_discovery_call_settings.scheduling_timezone is the V4
-- scheduling source of truth.
ALTER TABLE public.mentors
  ADD COLUMN IF NOT EXISTS timezone TEXT;

COMMENT ON COLUMN public.mentors.timezone IS
  'Legacy compatibility timezone. V4 scheduling uses mentor_discovery_call_settings.scheduling_timezone.';

ALTER TABLE public.mentor_discovery_call_settings
  ADD COLUMN IF NOT EXISTS booking_mode TEXT NOT NULL DEFAULT 'request',
  ADD COLUMN IF NOT EXISTS scheduling_timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS minimum_notice_hours INTEGER NOT NULL DEFAULT 72,
  ADD COLUMN IF NOT EXISTS booking_window_days INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_request_fallback BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.mentor_discovery_call_settings
  DROP CONSTRAINT IF EXISTS mentor_discovery_settings_booking_mode_check;
ALTER TABLE public.mentor_discovery_call_settings
  ADD CONSTRAINT mentor_discovery_settings_booking_mode_check
    CHECK (booking_mode IN ('request', 'instant', 'hybrid')),
  DROP CONSTRAINT IF EXISTS mentor_discovery_settings_notice_check,
  ADD CONSTRAINT mentor_discovery_settings_notice_check
    CHECK (minimum_notice_hours BETWEEN 1 AND 720),
  DROP CONSTRAINT IF EXISTS mentor_discovery_settings_window_check,
  ADD CONSTRAINT mentor_discovery_settings_window_check
    CHECK (booking_window_days BETWEEN 1 AND 60),
  DROP CONSTRAINT IF EXISTS mentor_discovery_settings_buffer_check,
  ADD CONSTRAINT mentor_discovery_settings_buffer_check
    CHECK (buffer_minutes BETWEEN 0 AND 120);

UPDATE public.mentor_discovery_call_settings s
SET scheduling_timezone = COALESCE(NULLIF(m.timezone, ''), 'UTC')
FROM public.mentors m
WHERE m.id = s.mentor_id
  AND EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = COALESCE(NULLIF(m.timezone, ''), 'UTC'));

ALTER TABLE public.discovery_calls
  ADD COLUMN IF NOT EXISTS meeting_provider TEXT,
  ADD COLUMN IF NOT EXISTS calendar_provider TEXT,
  ADD COLUMN IF NOT EXISTS external_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS external_calendar_html_url TEXT,
  ADD COLUMN IF NOT EXISTS conference_request_id TEXT,
  ADD COLUMN IF NOT EXISTS meeting_creation_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS meeting_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calendar_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calendar_generation_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calendar_error TEXT;

ALTER TABLE public.discovery_calls
  DROP CONSTRAINT IF EXISTS discovery_calls_meeting_provider_check;
ALTER TABLE public.discovery_calls
  ADD CONSTRAINT discovery_calls_meeting_provider_check CHECK (
    meeting_provider IS NULL OR meeting_provider IN ('google_meet', 'manual', 'external')
  ),
  DROP CONSTRAINT IF EXISTS discovery_calls_calendar_provider_check,
  ADD CONSTRAINT discovery_calls_calendar_provider_check CHECK (
    calendar_provider IS NULL OR calendar_provider = 'google_calendar'
  ),
  DROP CONSTRAINT IF EXISTS discovery_calls_meeting_creation_status_check,
  ADD CONSTRAINT discovery_calls_meeting_creation_status_check CHECK (
    meeting_creation_status IN ('not_required', 'pending', 'created', 'failed', 'cancelled')
  );

DROP INDEX IF EXISTS public.discovery_calls_one_active_mentor_pair_idx;
CREATE UNIQUE INDEX discovery_calls_one_active_mentor_pair_idx
  ON public.discovery_calls (founder_id, mentor_id)
  WHERE workflow_version = 2
    AND mentor_id IS NOT NULL
    AND status IN (
      'pending_mentor_response', 'pending_founder_response',
      'pending_meeting_creation', 'scheduled', 'awaiting_outcome'
    );

CREATE TABLE public.mentor_discovery_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_local_time TIME NOT NULL,
  end_local_time TIME NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE,
  effective_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_local_time < end_local_time),
  CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until >= effective_from),
  UNIQUE (mentor_id, weekday, start_local_time, end_local_time, effective_from)
);

CREATE TABLE public.mentor_discovery_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('unavailable', 'additional')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK (reason IS NULL OR length(reason) <= 500)
);

CREATE TABLE public.discovery_call_slot_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  discovery_call_id UUID NOT NULL UNIQUE REFERENCES public.discovery_calls(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  buffer_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_minutes BETWEEN 0 AND 120),
  blocked_range TSTZRANGE NOT NULL,
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'confirmed', 'released', 'cancelled')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  EXCLUDE USING gist (
    mentor_id WITH =,
    blocked_range WITH &&
  ) WHERE (status IN ('held', 'confirmed'))
);

CREATE OR REPLACE FUNCTION public.set_discovery_call_slot_blocked_range_v4()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.blocked_range := tstzrange(
    NEW.starts_at - make_interval(mins => NEW.buffer_minutes),
    NEW.ends_at + make_interval(mins => NEW.buffer_minutes),
    '[)'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER discovery_call_slot_reservations_blocked_range
  BEFORE INSERT OR UPDATE OF starts_at, ends_at, buffer_minutes
  ON public.discovery_call_slot_reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_discovery_call_slot_blocked_range_v4();

CREATE TABLE public.discovery_call_calendar_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_call_id UUID NOT NULL REFERENCES public.discovery_calls(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'cancel')),
  sequence INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'skipped')),
  idempotency_key TEXT NOT NULL UNIQUE,
  external_event_id TEXT,
  secure_token_ciphertext TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 8 CHECK (max_attempts BETWEEN 1 AND 20),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (discovery_call_id, operation, sequence)
);

CREATE INDEX discovery_call_calendar_outbox_claim_idx
  ON public.discovery_call_calendar_outbox (next_attempt_at, created_at)
  WHERE status IN ('pending', 'processing');

CREATE TABLE public.mentor_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL UNIQUE REFERENCES public.mentors(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google_calendar' CHECK (provider = 'google_calendar'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reauthorization_required', 'revoked', 'error')),
  google_account_email TEXT,
  google_calendar_id TEXT NOT NULL DEFAULT 'primary',
  encrypted_access_token TEXT,
  encrypted_refresh_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  granted_scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  last_synced_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mentor_calendar_busy_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.mentor_calendar_connections(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  source_fingerprint TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (connection_id, source_fingerprint)
);

CREATE INDEX mentor_calendar_busy_periods_lookup_idx
  ON public.mentor_calendar_busy_periods (mentor_id, starts_at, ends_at);

CREATE TABLE public.mentor_availability_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.discovery_call_calendar_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  state_hash TEXT NOT NULL UNIQUE CHECK (length(state_hash) = 64),
  encrypted_return_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_discovery_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_discovery_availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_call_slot_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_call_calendar_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_calendar_busy_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_availability_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_call_calendar_oauth_states ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.mentor_discovery_availability_rules FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mentor_discovery_availability_exceptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.discovery_call_slot_reservations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.discovery_call_calendar_outbox FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mentor_calendar_connections FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mentor_calendar_busy_periods FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mentor_availability_access_tokens FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.discovery_call_calendar_oauth_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.mentor_discovery_availability_rules TO service_role;
GRANT ALL ON public.mentor_discovery_availability_exceptions TO service_role;
GRANT ALL ON public.discovery_call_slot_reservations TO service_role;
GRANT ALL ON public.discovery_call_calendar_outbox TO service_role;
GRANT ALL ON public.mentor_calendar_connections TO service_role;
GRANT ALL ON public.mentor_calendar_busy_periods TO service_role;
GRANT ALL ON public.mentor_availability_access_tokens TO service_role;
GRANT ALL ON public.discovery_call_calendar_oauth_states TO service_role;

CREATE TRIGGER mentor_discovery_availability_rules_updated_at
  BEFORE UPDATE ON public.mentor_discovery_availability_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_discovery_call_v2_updated_at();
CREATE TRIGGER mentor_discovery_availability_exceptions_updated_at
  BEFORE UPDATE ON public.mentor_discovery_availability_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.set_discovery_call_v2_updated_at();
CREATE TRIGGER discovery_call_slot_reservations_updated_at
  BEFORE UPDATE ON public.discovery_call_slot_reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_discovery_call_v2_updated_at();
CREATE TRIGGER discovery_call_calendar_outbox_updated_at
  BEFORE UPDATE ON public.discovery_call_calendar_outbox
  FOR EACH ROW EXECUTE FUNCTION public.set_discovery_call_v2_updated_at();
CREATE TRIGGER mentor_calendar_connections_updated_at
  BEFORE UPDATE ON public.mentor_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_discovery_call_v2_updated_at();

-- Preserve already-confirmed V2 calls in the collision table. A conflict here
-- exposes historical double-booking and intentionally blocks rollout.
INSERT INTO public.discovery_call_slot_reservations (
  mentor_id, discovery_call_id, starts_at, ends_at, buffer_minutes, status
)
SELECT c.mentor_id, c.id, c.scheduled_for,
       c.scheduled_for + make_interval(mins => c.duration_minutes),
       COALESCE(s.buffer_minutes, 0), 'confirmed'
FROM public.discovery_calls c
LEFT JOIN public.mentor_discovery_call_settings s ON s.mentor_id = c.mentor_id
WHERE c.workflow_version = 2
  AND c.status IN ('scheduled', 'awaiting_outcome')
  AND c.scheduled_for IS NOT NULL
ON CONFLICT (discovery_call_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_mentor_discovery_slots_v4(
  p_mentor_id UUID,
  p_from TIMESTAMPTZ DEFAULT now(),
  p_to TIMESTAMPTZ DEFAULT now() + interval '30 days'
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH settings AS (
  SELECT s.*
  FROM public.mentor_discovery_call_settings s
  JOIN public.mentors m ON m.id = s.mentor_id
  WHERE s.mentor_id = p_mentor_id
    AND s.discovery_calls_enabled
    AND s.booking_mode IN ('instant', 'hybrid')
    AND m.is_active
    AND EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = s.scheduling_timezone)
), bounds AS (
  SELECT s.*,
    GREATEST(p_from, now() + make_interval(hours => s.minimum_notice_hours)) AS starts_after,
    LEAST(p_to, now() + make_interval(days => s.booking_window_days), now() + interval '60 days') AS ends_before
  FROM settings s
), local_days AS (
  SELECT b.*, d::date AS local_date
  FROM bounds b
  CROSS JOIN LATERAL generate_series(
    (b.starts_after AT TIME ZONE b.scheduling_timezone)::date,
    (b.ends_before AT TIME ZONE b.scheduling_timezone)::date,
    interval '1 day'
  ) d
), candidates AS (
  SELECT d.mentor_id, d.scheduling_timezone, d.buffer_minutes,
    (slot_local AT TIME ZONE d.scheduling_timezone) AS starts_at,
    ((slot_local + interval '30 minutes') AT TIME ZONE d.scheduling_timezone) AS ends_at
  FROM local_days d
  JOIN public.mentor_discovery_availability_rules r
    ON r.mentor_id = d.mentor_id
   AND r.enabled
   AND r.weekday = extract(dow FROM d.local_date)::smallint
   AND (r.effective_from IS NULL OR r.effective_from <= d.local_date)
   AND (r.effective_until IS NULL OR r.effective_until >= d.local_date)
  CROSS JOIN LATERAL generate_series(
    (d.local_date + r.start_local_time)::timestamp,
    (d.local_date + r.end_local_time)::timestamp - interval '30 minutes',
    interval '30 minutes'
  ) slot_local
  WHERE (slot_local AT TIME ZONE d.scheduling_timezone) >= d.starts_after
    AND (slot_local AT TIME ZONE d.scheduling_timezone) <= d.ends_before
), available AS (
  SELECT c.* FROM candidates c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.mentor_discovery_availability_exceptions e
    WHERE e.mentor_id = c.mentor_id AND e.exception_type = 'unavailable'
      AND tstzrange(e.starts_at, e.ends_at, '[)') &&
          tstzrange(c.starts_at - make_interval(mins => c.buffer_minutes), c.ends_at + make_interval(mins => c.buffer_minutes), '[)')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.mentor_calendar_busy_periods b
    WHERE b.mentor_id = c.mentor_id
      AND tstzrange(b.starts_at, b.ends_at, '[)') &&
          tstzrange(c.starts_at - make_interval(mins => c.buffer_minutes), c.ends_at + make_interval(mins => c.buffer_minutes), '[)')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.discovery_call_slot_reservations sr
    WHERE sr.mentor_id = c.mentor_id AND sr.status IN ('held', 'confirmed')
      AND sr.blocked_range &&
          tstzrange(c.starts_at - make_interval(mins => c.buffer_minutes), c.ends_at + make_interval(mins => c.buffer_minutes), '[)')
  )
), additional AS (
  SELECT e.mentor_id, s.scheduling_timezone, s.buffer_minutes,
    slot_start AS starts_at, slot_start + interval '30 minutes' AS ends_at
  FROM public.mentor_discovery_availability_exceptions e
  JOIN bounds s ON s.mentor_id = e.mentor_id
  CROSS JOIN LATERAL generate_series(e.starts_at, e.ends_at - interval '30 minutes', interval '30 minutes') slot_start
  WHERE e.exception_type = 'additional'
    AND slot_start >= s.starts_after AND slot_start <= s.ends_before
    AND NOT EXISTS (
      SELECT 1 FROM public.discovery_call_slot_reservations sr
      WHERE sr.mentor_id = e.mentor_id AND sr.status IN ('held', 'confirmed')
        AND sr.blocked_range &&
            tstzrange(
              slot_start - make_interval(mins => s.buffer_minutes),
              slot_start + interval '30 minutes' + make_interval(mins => s.buffer_minutes), '[)'
            )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.mentor_calendar_busy_periods bp
      WHERE bp.mentor_id = e.mentor_id
        AND tstzrange(bp.starts_at, bp.ends_at, '[)') && tstzrange(slot_start, slot_start + interval '30 minutes', '[)')
    )
), combined AS (
  SELECT starts_at, scheduling_timezone FROM available
  UNION
  SELECT starts_at, scheduling_timezone FROM additional
)
SELECT jsonb_build_object(
  'success', true,
  'bookingMode', COALESCE((SELECT booking_mode FROM settings), 'request'),
  'allowRequestFallback', COALESCE((SELECT allow_request_fallback FROM settings), true),
  'timezone', COALESCE((SELECT scheduling_timezone FROM settings), 'UTC'),
  'slots', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('startsAt', starts_at, 'durationMinutes', 30) ORDER BY starts_at)
    FROM combined
  ), '[]'::jsonb)
);
$$;

-- Admin and secure mentor-portal writes use one RPC so a rule validation or
-- insert failure can never leave settings saved with a partially replaced
-- weekly schedule.
CREATE OR REPLACE FUNCTION public.save_mentor_discovery_settings_v4(
  p_mentor_id UUID,
  p_notification_email TEXT,
  p_discovery_calls_enabled BOOLEAN,
  p_booking_mode TEXT,
  p_scheduling_timezone TEXT,
  p_minimum_notice_hours INTEGER,
  p_booking_window_days INTEGER,
  p_buffer_minutes INTEGER,
  p_allow_request_fallback BOOLEAN,
  p_legacy_provider TEXT,
  p_legacy_booking_url TEXT,
  p_rules JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_rule JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.mentors WHERE id = p_mentor_id) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND');
  END IF;
  IF lower(btrim(COALESCE(p_notification_email, ''))) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR p_booking_mode NOT IN ('request', 'instant', 'hybrid')
     OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_scheduling_timezone)
     OR p_minimum_notice_hours NOT BETWEEN 1 AND 720
     OR p_booking_window_days NOT BETWEEN 1 AND 60
     OR p_buffer_minutes NOT BETWEEN 0 AND 120
     OR jsonb_typeof(COALESCE(p_rules, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(COALESCE(p_rules, '[]'::jsonb)) > 50 THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_AVAILABILITY');
  END IF;

  FOR v_rule IN SELECT value FROM jsonb_array_elements(COALESCE(p_rules, '[]'::jsonb))
  LOOP
    IF jsonb_typeof(v_rule) <> 'object'
       OR (v_rule ->> 'weekday') !~ '^[0-6]$'
       OR COALESCE(v_rule ->> 'startLocalTime', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
       OR COALESCE(v_rule ->> 'endLocalTime', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
       OR (v_rule ->> 'startLocalTime')::time >= (v_rule ->> 'endLocalTime')::time THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_AVAILABILITY');
    END IF;
  END LOOP;

  INSERT INTO public.mentor_discovery_call_settings (
    mentor_id, notification_email, discovery_calls_enabled, booking_mode,
    scheduling_timezone, minimum_notice_hours, booking_window_days,
    buffer_minutes, allow_request_fallback, legacy_provider, legacy_booking_url
  ) VALUES (
    p_mentor_id, lower(btrim(p_notification_email)), p_discovery_calls_enabled,
    p_booking_mode, p_scheduling_timezone, p_minimum_notice_hours,
    p_booking_window_days, p_buffer_minutes, p_allow_request_fallback,
    NULLIF(p_legacy_provider, ''), NULLIF(p_legacy_booking_url, '')
  )
  ON CONFLICT (mentor_id) DO UPDATE SET
    notification_email = EXCLUDED.notification_email,
    discovery_calls_enabled = EXCLUDED.discovery_calls_enabled,
    booking_mode = EXCLUDED.booking_mode,
    scheduling_timezone = EXCLUDED.scheduling_timezone,
    minimum_notice_hours = EXCLUDED.minimum_notice_hours,
    booking_window_days = EXCLUDED.booking_window_days,
    buffer_minutes = EXCLUDED.buffer_minutes,
    allow_request_fallback = EXCLUDED.allow_request_fallback,
    legacy_provider = EXCLUDED.legacy_provider,
    legacy_booking_url = EXCLUDED.legacy_booking_url;

  DELETE FROM public.mentor_discovery_availability_rules WHERE mentor_id = p_mentor_id;
  FOR v_rule IN SELECT value FROM jsonb_array_elements(COALESCE(p_rules, '[]'::jsonb))
  LOOP
    INSERT INTO public.mentor_discovery_availability_rules (
      mentor_id, weekday, start_local_time, end_local_time, enabled
    ) VALUES (
      p_mentor_id, (v_rule ->> 'weekday')::smallint,
      (v_rule ->> 'startLocalTime')::time, (v_rule ->> 'endLocalTime')::time,
      COALESCE((v_rule ->> 'enabled')::boolean, true)
    );
  END LOOP;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_discovery_call_calendar_jobs_v4(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.discovery_call_calendar_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT id FROM public.discovery_call_calendar_outbox
    WHERE (
      status = 'pending' AND next_attempt_at <= now()
    ) OR (
      status = 'processing' AND processing_started_at < now() - interval '10 minutes'
    )
    ORDER BY next_attempt_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100))
  )
  UPDATE public.discovery_call_calendar_outbox o
  SET status = 'processing', processing_started_at = now(), attempt_count = attempt_count + 1
  FROM claimed
  WHERE o.id = claimed.id
  RETURNING o.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_discovery_call_calendar_operation_v4(
  p_call_id UUID,
  p_operation TEXT,
  p_secure_token_ciphertext TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_call public.discovery_calls%ROWTYPE; v_id UUID; v_payload JSONB;
BEGIN
  IF p_operation NOT IN ('create', 'update', 'cancel') THEN
    RAISE EXCEPTION 'Invalid calendar operation';
  END IF;
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  IF NOT FOUND OR v_call.workflow_version <> 2 THEN RAISE EXCEPTION 'Discovery Call not found'; END IF;
  v_payload := jsonb_build_object(
    'callId', v_call.id,
    'summary', format('Discovery Call: %s', v_call.mentor_name_snapshot),
    'scheduledFor', v_call.scheduled_for,
    'durationMinutes', v_call.duration_minutes,
    'founderEmail', v_call.founder_email_snapshot,
    'mentorEmail', v_call.mentor_contact_email_snapshot,
    'adminEmail', 'admin@creatives-takeover.com',
    'topic', v_call.request_topic,
    'calendarSequence', v_call.calendar_sequence
  );
  INSERT INTO public.discovery_call_calendar_outbox (
    discovery_call_id, operation, sequence, idempotency_key,
    external_event_id, secure_token_ciphertext, payload
  ) VALUES (
    v_call.id, p_operation, v_call.calendar_sequence,
    format('discovery-call-calendar:%s:%s:%s', v_call.id, p_operation, v_call.calendar_sequence),
    v_call.external_calendar_event_id, p_secure_token_ciphertext, v_payload
  )
  ON CONFLICT (discovery_call_id, operation, sequence) DO UPDATE
    SET next_attempt_at = LEAST(public.discovery_call_calendar_outbox.next_attempt_at, now()),
        secure_token_ciphertext = COALESCE(EXCLUDED.secure_token_ciphertext, public.discovery_call_calendar_outbox.secure_token_ciphertext)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_discovery_call_calendar_job_v4(
  p_job_id UUID,
  p_error TEXT,
  p_external_event_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_job public.discovery_call_calendar_outbox%ROWTYPE; v_terminal BOOLEAN; v_admin_id UUID;
BEGIN
  SELECT * INTO v_job FROM public.discovery_call_calendar_outbox WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND'); END IF;
  -- A worker may return after deadline/cancellation processing has already
  -- terminalized the create job. Never resurrect that job. If Google created
  -- an event during the race, persist its ID and durably queue cleanup.
  IF v_job.status IN ('succeeded', 'failed', 'skipped') THEN
    IF v_job.operation = 'create' AND v_job.status <> 'succeeded'
       AND NULLIF(p_external_event_id, '') IS NOT NULL THEN
      UPDATE public.discovery_calls
      SET external_calendar_event_id = COALESCE(external_calendar_event_id, p_external_event_id)
      WHERE id = v_job.discovery_call_id;
      PERFORM public.enqueue_discovery_call_calendar_operation_v4(v_job.discovery_call_id, 'cancel', NULL);
    END IF;
    RETURN jsonb_build_object('success', true, 'terminal', true, 'idempotentReplay', true);
  END IF;
  v_terminal := v_job.attempt_count >= v_job.max_attempts;
  UPDATE public.discovery_call_calendar_outbox
  SET status = CASE WHEN v_terminal THEN 'failed' ELSE 'pending' END,
      external_event_id = COALESCE(p_external_event_id, external_event_id),
      last_error = left(COALESCE(p_error, 'Unknown calendar error'), 2000),
      next_attempt_at = now() + CASE v_job.attempt_count
        WHEN 1 THEN interval '1 minute'
        WHEN 2 THEN interval '5 minutes'
        WHEN 3 THEN interval '15 minutes'
        WHEN 4 THEN interval '30 minutes'
        ELSE interval '60 minutes' END,
      processing_started_at = NULL
  WHERE id = p_job_id;
  UPDATE public.discovery_calls SET calendar_error = left(COALESCE(p_error, 'Unknown calendar error'), 2000),
    meeting_creation_status = CASE WHEN v_terminal AND status = 'pending_meeting_creation' THEN 'failed' ELSE meeting_creation_status END
  WHERE id = v_job.discovery_call_id;
  IF v_terminal THEN
    INSERT INTO public.discovery_call_notification_alerts (
      discovery_call_id, outbox_id, alert_key, severity, alert_type, message, metadata
    ) VALUES (
      v_job.discovery_call_id, NULL, 'calendar:' || v_job.id::text, 'critical',
      'calendar_operation_failed',
      format('Google Calendar %s failed after %s attempts: %s', v_job.operation, v_job.attempt_count, left(COALESCE(p_error, ''), 500)),
      jsonb_build_object('calendarJobId', v_job.id, 'operation', v_job.operation)
    ) ON CONFLICT (alert_key) DO NOTHING;
    SELECT id INTO v_admin_id FROM auth.users
    WHERE lower(email) = 'admin@creatives-takeover.com' LIMIT 1;
    IF v_admin_id IS NOT NULL THEN
      INSERT INTO public.community_notifications (
        user_id, actor_id, notification_type, read, metadata
      ) VALUES (
        v_admin_id, v_admin_id, 'discovery_call_event', false,
        jsonb_build_object(
          'message', 'A Discovery Call calendar operation failed and requires attention.',
          'route', '/mentorship/admin/discovery-calls?call=' || v_job.discovery_call_id::text,
          'discoveryCallId', v_job.discovery_call_id,
          'severity', 'critical', 'eventType', 'calendar_operation_failed',
          'image_url', '/lovable-uploads/new-favicon.png'
        )
      );
    END IF;
  END IF;
  RETURN jsonb_build_object('success', true, 'terminal', v_terminal);
END;
$$;

REVOKE ALL ON FUNCTION public.get_mentor_discovery_slots_v4(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_discovery_call_slot_blocked_range_v4() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_mentor_discovery_settings_v4(UUID, TEXT, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_discovery_call_calendar_jobs_v4(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_discovery_call_calendar_operation_v4(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_discovery_call_calendar_job_v4(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mentor_discovery_slots_v4(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_discovery_call_slot_blocked_range_v4() TO service_role;
GRANT EXECUTE ON FUNCTION public.save_mentor_discovery_settings_v4(UUID, TEXT, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_discovery_call_calendar_jobs_v4(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_discovery_call_calendar_operation_v4(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_discovery_call_calendar_job_v4(UUID, TEXT, TEXT) TO service_role;
