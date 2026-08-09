-- Discovery Call V4 transition API. A selected time is not chargeable until
-- the calendar worker has created and persisted a usable Google Meet URL.

CREATE OR REPLACE FUNCTION public.create_discovery_call_instant_booking_v4(
  p_founder_id UUID,
  p_mentor_id UUID,
  p_idempotency_key TEXT,
  p_topic TEXT,
  p_desired_outcome TEXT,
  p_notes TEXT,
  p_timezone TEXT,
  p_starts_at TIMESTAMPTZ,
  p_management_token_hash TEXT,
  p_management_token_ciphertext TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_existing public.discovery_calls%ROWTYPE;
  v_mentor RECORD; v_founder RECORD; v_wallet RECORD;
  v_used_quota INTEGER; v_used_balance INTEGER;
  v_call_id UUID; v_reservation_id UUID; v_round_id UUID; v_slot_id UUID;
  v_generation_due TIMESTAMPTZ := now() + interval '60 minutes';
BEGIN
  IF p_founder_id IS NULL OR p_mentor_id IS NULL
     OR length(btrim(COALESCE(p_idempotency_key, ''))) < 8
     OR length(btrim(COALESCE(p_topic, ''))) NOT BETWEEN 3 AND 120
     OR length(btrim(COALESCE(p_desired_outcome, ''))) NOT BETWEEN 10 AND 500
     OR length(COALESCE(p_notes, '')) > 1000
     OR length(COALESCE(p_management_token_hash, '')) <> 64
     OR NULLIF(p_management_token_ciphertext, '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_REQUEST');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_TIMEZONE');
  END IF;

  SELECT * INTO v_existing FROM public.discovery_calls
  WHERE founder_id = p_founder_id AND idempotency_key = p_idempotency_key LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'callId', v_existing.id, 'status', v_existing.status, 'idempotentReplay', true);
  END IF;

  SELECT m.id, m.name, m.is_active, s.notification_email,
         s.discovery_calls_enabled, s.booking_mode, s.scheduling_timezone,
         s.minimum_notice_hours, s.booking_window_days, s.buffer_minutes
  INTO v_mentor
  FROM public.mentors m
  JOIN public.mentor_discovery_call_settings s ON s.mentor_id = m.id
  WHERE m.id = p_mentor_id;
  IF NOT FOUND OR NOT COALESCE(v_mentor.is_active, false)
     OR NOT v_mentor.discovery_calls_enabled
     OR v_mentor.booking_mode NOT IN ('instant', 'hybrid') THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'MENTOR_UNAVAILABLE');
  END IF;
  IF p_starts_at < now() + make_interval(hours => v_mentor.minimum_notice_hours)
     OR p_starts_at > now() + make_interval(days => v_mentor.booking_window_days)
     OR NOT EXISTS (
       SELECT 1
       FROM jsonb_array_elements(public.get_mentor_discovery_slots_v4(
         p_mentor_id, p_starts_at - interval '1 minute', p_starts_at + interval '1 minute'
       ) -> 'slots') slot
       WHERE (slot ->> 'startsAt')::timestamptz = p_starts_at
     ) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'SLOT_UNAVAILABLE');
  END IF;

  SELECT p.full_name, u.email INTO v_founder
  FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE p.id = p_founder_id;
  IF NOT FOUND OR NULLIF(lower(btrim(COALESCE(v_founder.email, ''))), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'FOUNDER_EMAIL_MISSING');
  END IF;
  SELECT balance, monthly_quota, current_period_start INTO v_wallet
  FROM public.user_credits WHERE user_id = p_founder_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_wallet.balance, 0) + COALESCE(v_wallet.monthly_quota, 0) < 10 THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INSUFFICIENT_CREDITS', 'requiredCredits', 10);
  END IF;

  SELECT * INTO v_existing FROM public.discovery_calls
  WHERE founder_id = p_founder_id AND idempotency_key = p_idempotency_key LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'callId', v_existing.id, 'status', v_existing.status, 'idempotentReplay', true);
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.discovery_calls
    WHERE founder_id = p_founder_id AND mentor_id = p_mentor_id AND workflow_version = 2
      AND status IN ('pending_mentor_response', 'pending_founder_response', 'pending_meeting_creation', 'scheduled', 'awaiting_outcome')
  ) THEN RETURN jsonb_build_object('success', false, 'errorCode', 'ACTIVE_CALL_EXISTS'); END IF;

  v_used_quota := LEAST(COALESCE(v_wallet.monthly_quota, 0), 10);
  v_used_balance := 10 - v_used_quota;
  UPDATE public.user_credits
  SET monthly_quota = monthly_quota - v_used_quota,
      balance = balance - v_used_balance, updated_at = now()
  WHERE user_id = p_founder_id;

  INSERT INTO public.discovery_calls (
    founder_id, mentor_id, mentor_name_snapshot, provider_name, provider_booking_url,
    status, booking_source, idempotency_key, workflow_version, request_topic,
    desired_outcome, founder_notes, founder_timezone,
    mentor_contact_email_snapshot, founder_email_snapshot, scheduled_for,
    duration_minutes, confirmation_source, meeting_provider, calendar_provider,
    meeting_creation_status, calendar_generation_due_at, last_state_changed_at
  ) VALUES (
    p_founder_id, p_mentor_id, v_mentor.name, NULL, NULL,
    'pending_meeting_creation', 'platform_instant', p_idempotency_key, 2, btrim(p_topic),
    btrim(p_desired_outcome), NULLIF(btrim(COALESCE(p_notes, '')), ''), p_timezone,
    lower(btrim(v_mentor.notification_email)), lower(btrim(v_founder.email)), p_starts_at,
    30, 'published_availability', 'google_meet', 'google_calendar',
    'pending', v_generation_due, now()
  ) RETURNING id INTO v_call_id;

  INSERT INTO public.discovery_call_credit_reservations (
    discovery_call_id, user_id, idempotency_key, used_from_quota,
    used_from_balance, billing_period_start, expires_at
  ) VALUES (
    v_call_id, p_founder_id, p_idempotency_key, v_used_quota,
    v_used_balance, v_wallet.current_period_start, v_generation_due + interval '15 minutes'
  ) RETURNING id INTO v_reservation_id;
  UPDATE public.discovery_calls SET credit_reservation_id = v_reservation_id WHERE id = v_call_id;

  INSERT INTO public.discovery_call_scheduling_rounds (
    discovery_call_id, round_type, proposer_role, responder_role,
    status, response_due_at, responded_at
  ) VALUES (
    v_call_id, 'initial', 'founder', 'mentor', 'accepted', v_generation_due, now()
  ) RETURNING id INTO v_round_id;
  INSERT INTO public.discovery_call_scheduling_slots (
    round_id, ordinal, starts_at, proposed_timezone
  ) VALUES (v_round_id, 1, p_starts_at, p_timezone) RETURNING id INTO v_slot_id;
  UPDATE public.discovery_call_scheduling_rounds SET accepted_slot_id = v_slot_id WHERE id = v_round_id;

  INSERT INTO public.discovery_call_slot_reservations (
    mentor_id, discovery_call_id, starts_at, ends_at, buffer_minutes, status, expires_at
  ) VALUES (
    p_mentor_id, v_call_id, p_starts_at, p_starts_at + interval '30 minutes',
    v_mentor.buffer_minutes, 'held', v_generation_due
  );
  INSERT INTO public.discovery_call_action_tokens (
    discovery_call_id, purpose, recipient_role, token_hash, expires_at
  ) VALUES (
    v_call_id, 'mentor_booking_manage', 'mentor', p_management_token_hash, p_starts_at + interval '7 days'
  );
  PERFORM public.enqueue_discovery_call_calendar_operation_v4(v_call_id, 'create', p_management_token_ciphertext);
  PERFORM public.record_discovery_call_event_v2(
    v_call_id, 'meeting_creation_queued', p_founder_id,
    jsonb_build_object('callId', v_call_id, 'mentorId', p_mentor_id, 'scheduledFor', p_starts_at, 'heldCredits', 10, 'bookingMode', 'instant')
  );
  RETURN jsonb_build_object(
    'success', true, 'callId', v_call_id, 'status', 'pending_meeting_creation',
    'scheduledFor', p_starts_at, 'heldCredits', 10,
    'message', 'Your slot is reserved while the secure Google Meet link is created.'
  );
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'SLOT_UNAVAILABLE');
  WHEN unique_violation THEN
    SELECT * INTO v_existing FROM public.discovery_calls
    WHERE founder_id = p_founder_id AND idempotency_key = p_idempotency_key LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'callId', v_existing.id, 'status', v_existing.status, 'idempotentReplay', true);
    END IF;
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_discovery_call_request_v4(
  p_call_id UUID,
  p_token_hash TEXT,
  p_action TEXT,
  p_slot_id UUID DEFAULT NULL,
  p_counter_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_management_token_hash TEXT DEFAULT NULL,
  p_management_token_ciphertext TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call public.discovery_calls%ROWTYPE; v_round public.discovery_call_scheduling_rounds%ROWTYPE;
  v_token public.discovery_call_action_tokens%ROWTYPE; v_slot public.discovery_call_scheduling_slots%ROWTYPE;
  v_new_round UUID; v_due TIMESTAMPTZ; v_event BIGINT; v_payload JSONB;
BEGIN
  SELECT * INTO v_token FROM public.discovery_call_action_tokens
  WHERE token_hash = p_token_hash AND discovery_call_id = p_call_id
    AND purpose = 'mentor_request_response' FOR UPDATE;
  IF NOT FOUND OR v_token.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'errorCode', 'TOKEN_INVALID'); END IF;
  IF v_token.used_at IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE'); END IF;
  IF v_token.expires_at <= now() THEN RETURN jsonb_build_object('success', false, 'errorCode', 'TOKEN_EXPIRED'); END IF;
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  SELECT * INTO v_round FROM public.discovery_call_scheduling_rounds WHERE id = v_token.round_id FOR UPDATE;
  IF v_call.workflow_version <> 2 OR v_call.status <> 'pending_mentor_response' OR v_round.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE');
  END IF;

  IF p_action = 'accept' THEN
    SELECT * INTO v_slot FROM public.discovery_call_scheduling_slots WHERE id = p_slot_id AND round_id = v_round.id;
    IF NOT FOUND OR v_slot.starts_at < now() + interval '24 hours' THEN RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_SLOTS'); END IF;
    IF length(COALESCE(p_management_token_hash, '')) <> 64 OR NULLIF(p_management_token_ciphertext, '') IS NULL THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'TOKEN_INVALID');
    END IF;
    UPDATE public.discovery_call_scheduling_rounds SET status = 'accepted', accepted_slot_id = v_slot.id, responded_at = now() WHERE id = v_round.id;
    UPDATE public.discovery_call_action_tokens SET used_at = now(), revoked_at = now() WHERE id = v_token.id;
    INSERT INTO public.discovery_call_action_tokens (discovery_call_id, purpose, recipient_role, token_hash, expires_at)
    VALUES (p_call_id, 'mentor_booking_manage', 'mentor', p_management_token_hash, v_slot.starts_at + interval '7 days');
    UPDATE public.discovery_call_credit_reservations SET expires_at = now() + interval '75 minutes'
    WHERE id = v_call.credit_reservation_id AND status = 'pending';
    UPDATE public.discovery_calls SET status = 'pending_meeting_creation', scheduled_for = v_slot.starts_at,
      confirmation_source = 'mentor_portal', response_due_at = NULL, meeting_provider = 'google_meet',
      calendar_provider = 'google_calendar', meeting_creation_status = 'pending',
      calendar_generation_due_at = now() + interval '60 minutes', calendar_error = NULL,
      last_state_changed_at = now() WHERE id = p_call_id;
    INSERT INTO public.discovery_call_slot_reservations (mentor_id, discovery_call_id, starts_at, ends_at, buffer_minutes, status, expires_at)
    VALUES (v_call.mentor_id, p_call_id, v_slot.starts_at, v_slot.starts_at + interval '30 minutes',
      COALESCE((SELECT buffer_minutes FROM public.mentor_discovery_call_settings WHERE mentor_id = v_call.mentor_id), 0),
      'held', now() + interval '60 minutes');
    PERFORM public.enqueue_discovery_call_calendar_operation_v4(p_call_id, 'create', p_management_token_ciphertext);
    PERFORM public.record_discovery_call_event_v2(p_call_id, 'meeting_creation_queued', NULL,
      jsonb_build_object('callId', p_call_id, 'scheduledFor', v_slot.starts_at, 'bookingMode', 'request'));
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', 'pending_meeting_creation', 'scheduledFor', v_slot.starts_at);
  ELSIF p_action = 'counter' THEN
    IF p_counter_starts_at < now() + interval '72 hours' OR p_counter_starts_at > now() + interval '60 days' THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_SLOTS');
    END IF;
    v_due := now() + interval '48 hours';
    UPDATE public.discovery_call_scheduling_rounds SET status = 'superseded', responded_at = now() WHERE id = v_round.id;
    INSERT INTO public.discovery_call_scheduling_rounds (
      discovery_call_id, round_type, proposer_role, responder_role, counter_depth, response_due_at
    ) VALUES (p_call_id, 'initial', 'mentor', 'founder', 1, v_due) RETURNING id INTO v_new_round;
    INSERT INTO public.discovery_call_scheduling_slots (round_id, ordinal, starts_at, proposed_timezone)
    VALUES (v_new_round, 1, p_counter_starts_at, COALESCE(v_call.founder_timezone, 'UTC'));
    UPDATE public.discovery_calls SET status = 'pending_founder_response', response_due_at = v_due, last_state_changed_at = now() WHERE id = p_call_id;
    UPDATE public.discovery_call_credit_reservations SET expires_at = LEAST(v_due + interval '15 minutes', created_at + interval '7 days')
    WHERE id = v_call.credit_reservation_id AND status = 'pending';
    UPDATE public.discovery_call_action_tokens SET used_at = now() WHERE id = v_token.id;
    v_payload := jsonb_build_object('callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot,
      'counterStartsAt', p_counter_starts_at, 'founderTimezone', v_call.founder_timezone,
      'responseDueAt', v_due, 'meetingWillBeGenerated', true);
    v_event := public.record_discovery_call_event_v2(p_call_id, 'mentor_countered', NULL, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'mentor_countered', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'mentor_countered', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'mentor_countered', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', 'pending_founder_response', 'responseDueAt', v_due);
  ELSIF p_action = 'decline' THEN
    PERFORM public.release_discovery_call_reservation_v2(v_call.credit_reservation_id, 'Mentor declined request', false);
    UPDATE public.discovery_call_scheduling_rounds SET status = 'declined', responded_at = now() WHERE id = v_round.id;
    UPDATE public.discovery_calls SET status = 'declined', response_due_at = NULL,
      cancelled_reason = NULLIF(btrim(COALESCE(p_reason, '')), ''), last_state_changed_at = now() WHERE id = p_call_id;
    UPDATE public.discovery_call_action_tokens SET used_at = now(), revoked_at = now() WHERE discovery_call_id = p_call_id AND revoked_at IS NULL;
    v_payload := jsonb_build_object('callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot,
      'reason', NULLIF(btrim(COALESCE(p_reason, '')), ''), 'creditsReleased', 10);
    v_event := public.record_discovery_call_event_v2(p_call_id, 'request_declined', NULL, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_declined', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_declined', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_declined', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', 'declined', 'creditsReleased', 10);
  END IF;
  RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_REQUEST');
EXCEPTION WHEN exclusion_violation THEN
  RETURN jsonb_build_object('success', false, 'errorCode', 'SLOT_UNAVAILABLE');
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_discovery_call_counter_v4(
  p_call_id UUID,
  p_founder_id UUID,
  p_action TEXT,
  p_management_token_hash TEXT DEFAULT NULL,
  p_management_token_ciphertext TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call public.discovery_calls%ROWTYPE; v_round public.discovery_call_scheduling_rounds%ROWTYPE;
  v_slot public.discovery_call_scheduling_slots%ROWTYPE; v_event BIGINT; v_payload JSONB;
BEGIN
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND'); END IF;
  IF v_call.founder_id <> p_founder_id THEN RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN'); END IF;
  SELECT * INTO v_round FROM public.discovery_call_scheduling_rounds
  WHERE discovery_call_id = p_call_id AND status = 'pending' AND round_type = 'initial' FOR UPDATE;
  IF NOT FOUND OR v_call.status <> 'pending_founder_response' THEN RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE'); END IF;
  IF v_round.response_due_at <= now() THEN RETURN jsonb_build_object('success', false, 'errorCode', 'RESPONSE_EXPIRED'); END IF;
  IF p_action = 'accept' THEN
    IF length(COALESCE(p_management_token_hash, '')) <> 64 OR NULLIF(p_management_token_ciphertext, '') IS NULL THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'TOKEN_INVALID');
    END IF;
    SELECT * INTO v_slot FROM public.discovery_call_scheduling_slots WHERE round_id = v_round.id LIMIT 1;
    IF NOT FOUND OR v_slot.starts_at < now() + interval '24 hours' THEN RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_SLOTS'); END IF;
    UPDATE public.discovery_call_scheduling_rounds SET status = 'accepted', accepted_slot_id = v_slot.id, responded_at = now() WHERE id = v_round.id;
    INSERT INTO public.discovery_call_action_tokens (discovery_call_id, purpose, recipient_role, token_hash, expires_at)
    VALUES (p_call_id, 'mentor_booking_manage', 'mentor', p_management_token_hash, v_slot.starts_at + interval '7 days');
    UPDATE public.discovery_call_credit_reservations SET expires_at = now() + interval '75 minutes'
    WHERE id = v_call.credit_reservation_id AND status = 'pending';
    UPDATE public.discovery_calls SET status = 'pending_meeting_creation', scheduled_for = v_slot.starts_at,
      confirmation_source = 'founder_counter_acceptance', response_due_at = NULL,
      meeting_provider = 'google_meet', calendar_provider = 'google_calendar', meeting_creation_status = 'pending',
      calendar_generation_due_at = now() + interval '60 minutes', calendar_error = NULL, last_state_changed_at = now()
    WHERE id = p_call_id;
    INSERT INTO public.discovery_call_slot_reservations (mentor_id, discovery_call_id, starts_at, ends_at, buffer_minutes, status, expires_at)
    VALUES (v_call.mentor_id, p_call_id, v_slot.starts_at, v_slot.starts_at + interval '30 minutes',
      COALESCE((SELECT buffer_minutes FROM public.mentor_discovery_call_settings WHERE mentor_id = v_call.mentor_id), 0),
      'held', now() + interval '60 minutes');
    PERFORM public.enqueue_discovery_call_calendar_operation_v4(p_call_id, 'create', p_management_token_ciphertext);
    PERFORM public.record_discovery_call_event_v2(p_call_id, 'meeting_creation_queued', p_founder_id,
      jsonb_build_object('callId', p_call_id, 'scheduledFor', v_slot.starts_at, 'bookingMode', 'counter'));
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', 'pending_meeting_creation', 'scheduledFor', v_slot.starts_at);
  ELSIF p_action = 'decline' THEN
    PERFORM public.release_discovery_call_reservation_v2(v_call.credit_reservation_id, 'Founder declined mentor counter', false);
    UPDATE public.discovery_call_scheduling_rounds SET status = 'declined', responded_at = now() WHERE id = v_round.id;
    UPDATE public.discovery_calls SET status = 'declined', response_due_at = NULL, last_state_changed_at = now() WHERE id = p_call_id;
    UPDATE public.discovery_call_action_tokens SET revoked_at = now() WHERE discovery_call_id = p_call_id AND revoked_at IS NULL;
    v_payload := jsonb_build_object('callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot, 'creditsReleased', 10);
    v_event := public.record_discovery_call_event_v2(p_call_id, 'request_declined', p_founder_id, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_declined', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_declined', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_declined', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', 'declined', 'creditsReleased', 10);
  END IF;
  RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_REQUEST');
EXCEPTION WHEN exclusion_violation THEN
  RETURN jsonb_build_object('success', false, 'errorCode', 'SLOT_UNAVAILABLE');
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_discovery_call_calendar_job_v4(
  p_job_id UUID,
  p_external_event_id TEXT DEFAULT NULL,
  p_meeting_url TEXT DEFAULT NULL,
  p_calendar_html_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.discovery_call_calendar_outbox%ROWTYPE; v_call public.discovery_calls%ROWTYPE;
  v_finalize JSONB; v_payload JSONB; v_event BIGINT; v_founder_name TEXT; v_mentor_timezone TEXT;
BEGIN
  SELECT * INTO v_job FROM public.discovery_call_calendar_outbox WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND'); END IF;
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = v_job.discovery_call_id FOR UPDATE;
  IF v_job.status = 'succeeded' THEN RETURN jsonb_build_object('success', true, 'idempotentReplay', true); END IF;

  IF v_job.operation = 'create' THEN
    IF v_call.status = 'scheduled' AND v_call.external_calendar_event_id = p_external_event_id THEN
      UPDATE public.discovery_call_calendar_outbox SET status = 'succeeded', completed_at = now(), processing_started_at = NULL WHERE id = p_job_id;
      RETURN jsonb_build_object('success', true, 'idempotentReplay', true);
    END IF;
    IF v_call.status <> 'pending_meeting_creation' THEN RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE'); END IF;
    IF NULLIF(p_external_event_id, '') IS NULL OR p_meeting_url !~* '^https://meet\.google\.com/' THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'MEETING_DETAILS_REQUIRED');
    END IF;
    v_finalize := public.finalize_discovery_call_reservation_v2(v_call.credit_reservation_id, v_call.scheduled_for);
    IF NOT COALESCE((v_finalize ->> 'success')::boolean, false) THEN RETURN v_finalize; END IF;
    UPDATE public.discovery_calls SET status = 'scheduled', meeting_url = p_meeting_url,
      meeting_instructions = 'Join using the secure Google Meet link.', confirmed_at = now(),
      meeting_provider = 'google_meet', calendar_provider = 'google_calendar',
      external_calendar_event_id = p_external_event_id,
      external_calendar_html_url = NULLIF(p_calendar_html_url, ''),
      conference_request_id = replace(id::text, '-', '') || '-' || calendar_sequence::text,
      meeting_creation_status = 'created', meeting_created_at = now(),
      calendar_last_synced_at = now(), calendar_generation_due_at = NULL,
      calendar_error = NULL, last_state_changed_at = now()
    WHERE id = v_call.id;
    UPDATE public.discovery_call_slot_reservations SET status = 'confirmed', expires_at = NULL
    WHERE discovery_call_id = v_call.id;
    UPDATE public.discovery_call_calendar_outbox SET status = 'succeeded',
      external_event_id = p_external_event_id, completed_at = now(), processing_started_at = NULL, last_error = NULL
    WHERE id = p_job_id;
    SELECT full_name INTO v_founder_name FROM public.profiles WHERE id = v_call.founder_id;
    SELECT COALESCE(scheduling_timezone, 'UTC') INTO v_mentor_timezone
    FROM public.mentor_discovery_call_settings WHERE mentor_id = v_call.mentor_id;
    v_payload := jsonb_build_object(
      'callId', v_call.id, 'mentorName', v_call.mentor_name_snapshot,
      'founderName', COALESCE(v_founder_name, 'Founder'),
      'founderEmail', v_call.founder_email_snapshot,
      'mentorEmail', v_call.mentor_contact_email_snapshot,
      'topic', v_call.request_topic, 'desiredOutcome', v_call.desired_outcome,
      'scheduledFor', v_call.scheduled_for,
      'durationMinutes', v_call.duration_minutes, 'founderTimezone', v_call.founder_timezone,
      'mentorTimezone', COALESCE(v_mentor_timezone, 'UTC'),
      'meetingUrl', p_meeting_url, 'meetingInstructions', 'Join using the secure Google Meet link.',
      'creditsCharged', 10, 'calendarSequence', v_call.calendar_sequence,
      'calendarManagedExternally', true, 'calendarProvider', 'google_calendar',
      'externalCalendarEventId', p_external_event_id
    );
    v_event := public.record_discovery_call_event_v2(v_call.id, 'scheduled', NULL, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'booking_confirmed', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'booking_confirmed', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, v_job.secure_token_ciphertext);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'booking_confirmed', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN jsonb_build_object('success', true, 'callId', v_call.id, 'status', 'scheduled', 'meetingUrl', p_meeting_url);
  END IF;

  UPDATE public.discovery_call_calendar_outbox SET status = 'succeeded',
    external_event_id = COALESCE(p_external_event_id, external_event_id),
    completed_at = now(), processing_started_at = NULL, last_error = NULL WHERE id = p_job_id;
  UPDATE public.discovery_calls SET calendar_last_synced_at = now(), calendar_error = NULL,
    meeting_creation_status = CASE WHEN v_job.operation = 'cancel' THEN 'cancelled' ELSE meeting_creation_status END
  WHERE id = v_call.id;
  RETURN jsonb_build_object('success', true, 'callId', v_call.id, 'operation', v_job.operation);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_discovery_call_calendar_deadlines_v4()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE v_call public.discovery_calls%ROWTYPE; v_event BIGINT; v_payload JSONB; v_count INTEGER := 0; v_external_event_id TEXT;
BEGIN
  FOR v_call IN
    SELECT * FROM public.discovery_calls
    WHERE workflow_version = 2 AND status = 'pending_meeting_creation'
      AND calendar_generation_due_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.release_discovery_call_reservation_v2(v_call.credit_reservation_id, 'Meeting link creation expired', true);
    UPDATE public.discovery_call_slot_reservations SET status = 'released', expires_at = now()
    WHERE discovery_call_id = v_call.id AND status = 'held';
    SELECT external_event_id INTO v_external_event_id FROM public.discovery_call_calendar_outbox
    WHERE discovery_call_id = v_call.id AND operation = 'create' ORDER BY created_at DESC LIMIT 1;
    UPDATE public.discovery_calls SET status = 'expired', meeting_creation_status = 'failed',
      calendar_error = COALESCE(calendar_error, 'Google Meet link could not be created before the deadline.'),
      external_calendar_event_id = COALESCE(external_calendar_event_id, v_external_event_id),
      calendar_generation_due_at = NULL, last_state_changed_at = now() WHERE id = v_call.id;
    UPDATE public.discovery_call_calendar_outbox SET status = 'failed', completed_at = now(),
      last_error = COALESCE(last_error, 'Meeting creation deadline expired')
    WHERE discovery_call_id = v_call.id AND operation = 'create' AND status IN ('pending', 'processing');
    IF v_external_event_id IS NOT NULL THEN
      PERFORM public.enqueue_discovery_call_calendar_operation_v4(v_call.id, 'cancel', NULL);
    END IF;
    UPDATE public.discovery_call_action_tokens SET revoked_at = now()
    WHERE discovery_call_id = v_call.id AND revoked_at IS NULL;
    v_payload := jsonb_build_object('callId', v_call.id, 'mentorName', v_call.mentor_name_snapshot,
      'creditsReleased', 10, 'reason', 'The secure meeting link could not be created in time.');
    v_event := public.record_discovery_call_event_v2(v_call.id, 'meeting_creation_expired', NULL, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'request_expired', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'request_expired', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'request_expired', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'expiredMeetingCreations', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_discovery_call_v4(
  p_call_id UUID,
  p_actor_user_id UUID,
  p_actor_role TEXT,
  p_reason TEXT,
  p_force_refund BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_call public.discovery_calls%ROWTYPE; v_result JSONB; v_status public.discovery_call_status; v_event BIGINT; v_payload JSONB; v_external_event_id TEXT;
BEGIN
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  IF NOT FOUND OR v_call.workflow_version <> 2 THEN RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND'); END IF;
  IF p_actor_role = 'founder' AND v_call.founder_id <> p_actor_user_id THEN RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN'); END IF;
  IF p_actor_role = 'admin' AND NOT public.is_discovery_call_admin(p_actor_user_id) THEN RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN'); END IF;
  IF p_actor_role NOT IN ('founder', 'mentor', 'admin') THEN RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN'); END IF;

  IF v_call.status = 'pending_meeting_creation' THEN
    PERFORM public.release_discovery_call_reservation_v2(v_call.credit_reservation_id, 'Meeting creation cancelled', false);
    v_status := CASE WHEN p_actor_role = 'founder' THEN 'withdrawn'::public.discovery_call_status ELSE 'declined'::public.discovery_call_status END;
    UPDATE public.discovery_call_slot_reservations SET status = 'released', expires_at = now()
    WHERE discovery_call_id = p_call_id AND status = 'held';
    UPDATE public.discovery_call_calendar_outbox SET status = 'skipped', completed_at = now(),
      last_error = 'Booking cancelled before meeting creation completed'
    WHERE discovery_call_id = p_call_id AND operation = 'create' AND status IN ('pending', 'processing');
    SELECT COALESCE(v_call.external_calendar_event_id, external_event_id) INTO v_external_event_id
    FROM public.discovery_call_calendar_outbox
    WHERE discovery_call_id = p_call_id AND operation = 'create'
    ORDER BY created_at DESC LIMIT 1;
    UPDATE public.discovery_call_action_tokens SET revoked_at = now() WHERE discovery_call_id = p_call_id AND revoked_at IS NULL;
    UPDATE public.discovery_calls SET status = v_status, meeting_creation_status = 'cancelled',
      cancelled_at = now(), cancelled_reason = NULLIF(btrim(COALESCE(p_reason, '')), ''),
      calendar_generation_due_at = NULL, last_state_changed_at = now() WHERE id = p_call_id;
    IF v_external_event_id IS NOT NULL THEN
      UPDATE public.discovery_calls SET external_calendar_event_id = v_external_event_id WHERE id = p_call_id;
      PERFORM public.enqueue_discovery_call_calendar_operation_v4(p_call_id, 'cancel', NULL);
    END IF;
    v_payload := jsonb_build_object('callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot,
      'actorRole', p_actor_role, 'reason', NULLIF(btrim(COALESCE(p_reason, '')), ''),
      'refunded', false, 'creditsReleased', 10, 'status', v_status, 'calendarManagedExternally', true);
    v_event := public.record_discovery_call_event_v2(p_call_id, 'booking_cancelled', p_actor_user_id, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'booking_cancelled', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'booking_cancelled', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'booking_cancelled', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', v_status, 'creditsReleased', 10);
  END IF;

  v_result := public.cancel_discovery_call_v2(p_call_id, p_actor_user_id, p_actor_role, p_reason, p_force_refund);
  IF COALESCE((v_result ->> 'success')::boolean, false) AND v_call.external_calendar_event_id IS NOT NULL THEN
    PERFORM public.enqueue_discovery_call_calendar_operation_v4(p_call_id, 'cancel', NULL);
    UPDATE public.discovery_call_notification_outbox
    SET payload = payload || jsonb_build_object('calendarManagedExternally', true, 'externalCalendarEventId', v_call.external_calendar_event_id)
    WHERE discovery_call_id = p_call_id AND template_key = 'booking_cancelled' AND status = 'pending';
    UPDATE public.discovery_call_slot_reservations SET status = 'cancelled' WHERE discovery_call_id = p_call_id;
  END IF;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_discovery_call_reschedule_v4(
  p_call_id UUID,
  p_actor_user_id UUID,
  p_actor_role TEXT,
  p_action TEXT,
  p_slot_id UUID DEFAULT NULL,
  p_counter_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_management_token_hash TEXT DEFAULT NULL,
  p_management_token_ciphertext TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_call public.discovery_calls%ROWTYPE; v_result JSONB;
BEGIN
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND'); END IF;
  v_result := public.respond_to_discovery_call_reschedule_v2(
    p_call_id, p_actor_user_id, p_actor_role, p_action, p_slot_id,
    p_counter_starts_at, v_call.meeting_url, v_call.meeting_instructions,
    p_management_token_hash, p_management_token_ciphertext
  );
  IF COALESCE((v_result ->> 'success')::boolean, false) AND p_action = 'accept' THEN
    SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id;
    UPDATE public.discovery_call_slot_reservations
    SET starts_at = v_call.scheduled_for,
        ends_at = v_call.scheduled_for + make_interval(mins => v_call.duration_minutes),
        buffer_minutes = COALESCE((SELECT buffer_minutes FROM public.mentor_discovery_call_settings WHERE mentor_id = v_call.mentor_id), 0),
        status = 'confirmed'
    WHERE discovery_call_id = p_call_id;
    IF v_call.external_calendar_event_id IS NOT NULL THEN
      PERFORM public.enqueue_discovery_call_calendar_operation_v4(p_call_id, 'update', NULL);
      UPDATE public.discovery_call_notification_outbox
      SET payload = payload || jsonb_build_object('calendarManagedExternally', true, 'externalCalendarEventId', v_call.external_calendar_event_id)
      WHERE discovery_call_id = p_call_id AND template_key = 'reschedule_confirmed' AND status = 'pending';
    END IF;
  END IF;
  RETURN v_result;
EXCEPTION WHEN exclusion_violation THEN
  RETURN jsonb_build_object('success', false, 'errorCode', 'SLOT_UNAVAILABLE');
END;
$$;

REVOKE ALL ON FUNCTION public.create_discovery_call_instant_booking_v4(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_to_discovery_call_request_v4(UUID, TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_to_discovery_call_counter_v4(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_discovery_call_calendar_job_v4(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_discovery_call_calendar_deadlines_v4() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_discovery_call_v4(UUID, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_to_discovery_call_reschedule_v4(UUID, UUID, TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_discovery_call_instant_booking_v4(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_discovery_call_request_v4(UUID, TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_discovery_call_counter_v4(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_discovery_call_calendar_job_v4(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_discovery_call_calendar_deadlines_v4() TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_discovery_call_v4(UUID, UUID, TEXT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_discovery_call_reschedule_v4(UUID, UUID, TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT) TO service_role;
