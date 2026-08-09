-- Atomic transitions for Discovery Call Request Workflow V2.

CREATE OR REPLACE FUNCTION public.release_discovery_call_reservation_v2(
  p_reservation_id UUID,
  p_reason TEXT,
  p_expired BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res public.discovery_call_credit_reservations%ROWTYPE;
  v_quota INTEGER;
  v_balance INTEGER;
  v_current_period TIMESTAMPTZ;
  v_plan_allocation INTEGER := 0;
  v_restore_quota INTEGER := 0;
BEGIN
  SELECT * INTO v_res FROM public.discovery_call_credit_reservations
  WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'RESERVATION_NOT_FOUND');
  END IF;
  IF v_res.status IN ('released', 'expired') THEN
    RETURN jsonb_build_object('success', true, 'alreadyReleased', true);
  END IF;
  IF v_res.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'RESERVATION_NOT_PENDING');
  END IF;

  SELECT uc.monthly_quota, uc.balance, uc.current_period_start,
         COALESCE(st.monthly_credits, 0)
  INTO v_quota, v_balance, v_current_period, v_plan_allocation
  FROM public.user_credits uc
  LEFT JOIN public.subscription_tiers st
    ON st.tier_name = public.normalize_subscription_tier(uc.subscription_tier)
  WHERE uc.user_id = v_res.user_id FOR UPDATE OF uc;

  IF v_current_period IS NOT DISTINCT FROM v_res.billing_period_start THEN
    v_restore_quota := LEAST(
      v_res.used_from_quota,
      GREATEST(0, v_plan_allocation - COALESCE(v_quota, 0))
    );
  END IF;

  UPDATE public.user_credits
  SET monthly_quota = monthly_quota + v_restore_quota,
      balance = balance + v_res.used_from_balance,
      updated_at = now()
  WHERE user_id = v_res.user_id;

  UPDATE public.discovery_call_credit_reservations
  SET status = CASE WHEN p_expired THEN 'expired' ELSE 'released' END,
      released_at = now(), release_reason = left(COALESCE(p_reason, 'Released'), 500),
      metadata = metadata || jsonb_build_object(
        'restoredToMonthlyQuota', v_restore_quota,
        'restoredToPersistentBalance', v_res.used_from_balance,
        'expiredMonthlyCreditsNotRestored', v_res.used_from_quota - v_restore_quota
      )
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'restoredToMonthlyQuota', v_restore_quota,
    'restoredToPersistentBalance', v_res.used_from_balance
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_discovery_call_reservation_v2(
  p_reservation_id UUID,
  p_scheduled_for TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res public.discovery_call_credit_reservations%ROWTYPE;
  v_period RECORD;
  v_tx UUID;
BEGIN
  SELECT * INTO v_res FROM public.discovery_call_credit_reservations
  WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'RESERVATION_NOT_FOUND');
  END IF;
  IF v_res.status = 'finalized' THEN
    RETURN jsonb_build_object(
      'success', true, 'alreadyFinalized', true,
      'creditTransactionId', v_res.credit_transaction_id
    );
  END IF;
  IF v_res.status <> 'pending' OR v_res.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'RESERVATION_NOT_PENDING');
  END IF;

  INSERT INTO public.credit_transactions (
    user_id, amount, tx_type, reason, feature, metadata
  ) VALUES (
    v_res.user_id, -v_res.held_amount, 'deduct',
    'Discovery Call booking confirmed', 'DISCOVERY_CALL',
    jsonb_build_object(
      'idempotencyKey', 'discovery-call-v2-finalize:' || v_res.discovery_call_id,
      'discoveryCallId', v_res.discovery_call_id,
      'reservationId', v_res.id,
      'usedFromQuota', v_res.used_from_quota,
      'usedFromBalance', v_res.used_from_balance,
      'creditCost', v_res.held_amount
    )
  ) RETURNING id INTO v_tx;

  SELECT * INTO v_period
  FROM public.get_user_billing_period(v_res.user_id, p_scheduled_for);

  INSERT INTO public.discovery_call_cycle_counters (
    user_id, billing_period_start, billing_period_end,
    subscription_tier_snapshot, overage_calls_booked
  ) VALUES (
    v_res.user_id, v_period.period_start_date, v_period.period_end,
    public.normalize_subscription_tier(v_period.subscription_tier), 1
  )
  ON CONFLICT (user_id, billing_period_start) DO UPDATE
  SET overage_calls_booked = public.discovery_call_cycle_counters.overage_calls_booked + 1,
      billing_period_end = EXCLUDED.billing_period_end,
      subscription_tier_snapshot = EXCLUDED.subscription_tier_snapshot,
      updated_at = now();

  PERFORM public.sync_discovery_call_usage_legacy(v_res.user_id, v_period.period_start_date, 1);

  UPDATE public.discovery_call_credit_reservations
  SET status = 'finalized', finalized_at = now(), credit_transaction_id = v_tx
  WHERE id = p_reservation_id;

  UPDATE public.discovery_calls
  SET billing_period_start = v_period.period_start_date,
      billing_period_end = v_period.period_end,
      subscription_tier_snapshot = public.normalize_subscription_tier(v_period.subscription_tier),
      included_call_limit = NULL,
      counted_in_cycle = true,
      counted_at = now(),
      consumption_mode = 'overage',
      credit_charge_amount = v_res.held_amount,
      credits_charged = true,
      used_from_quota = v_res.used_from_quota,
      used_from_balance = v_res.used_from_balance
  WHERE id = v_res.discovery_call_id;

  RETURN jsonb_build_object(
    'success', true, 'creditTransactionId', v_tx,
    'creditsUsed', v_res.held_amount
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_discovery_call_request_v2(
  p_founder_id UUID,
  p_mentor_id UUID,
  p_idempotency_key TEXT,
  p_topic TEXT,
  p_desired_outcome TEXT,
  p_notes TEXT,
  p_timezone TEXT,
  p_slots JSONB,
  p_token_hash TEXT,
  p_token_ciphertext TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_existing public.discovery_calls%ROWTYPE;
  v_mentor RECORD;
  v_founder RECORD;
  v_wallet RECORD;
  v_call_id UUID;
  v_round_id UUID;
  v_reservation_id UUID;
  v_event_id BIGINT;
  v_due TIMESTAMPTZ := now() + interval '72 hours';
  v_used_quota INTEGER;
  v_used_balance INTEGER;
  v_slot_count INTEGER;
  v_distinct_count INTEGER;
  v_slot TEXT;
  v_ordinal INTEGER := 0;
  v_payload JSONB;
BEGIN
  IF p_founder_id IS NULL OR p_mentor_id IS NULL
     OR length(btrim(COALESCE(p_idempotency_key, ''))) < 8
     OR length(btrim(COALESCE(p_topic, ''))) NOT BETWEEN 3 AND 120
     OR length(btrim(COALESCE(p_desired_outcome, ''))) NOT BETWEEN 10 AND 500
     OR length(COALESCE(p_notes, '')) > 1000 THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_REQUEST');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_TIMEZONE');
  END IF;

  IF jsonb_typeof(p_slots) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_SLOTS');
  END IF;
  SELECT count(*), count(DISTINCT value)
  INTO v_slot_count, v_distinct_count FROM jsonb_array_elements_text(p_slots);
  IF v_slot_count <> 3 OR v_distinct_count <> 3 OR EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(p_slots) s(value)
    WHERE value::timestamptz < now() + interval '72 hours'
       OR value::timestamptz > now() + interval '60 days'
  ) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_SLOTS');
  END IF;

  SELECT * INTO v_existing FROM public.discovery_calls
  WHERE founder_id = p_founder_id AND idempotency_key = p_idempotency_key LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true, 'callId', v_existing.id,
      'status', v_existing.status, 'idempotentReplay', true
    );
  END IF;

  SELECT m.id, m.name, m.is_active, m.timezone,
         s.notification_email, s.discovery_calls_enabled
  INTO v_mentor
  FROM public.mentors m
  JOIN public.mentor_discovery_call_settings s ON s.mentor_id = m.id
  WHERE m.id = p_mentor_id;
  IF NOT FOUND OR NOT COALESCE(v_mentor.is_active, false)
     OR NOT COALESCE(v_mentor.discovery_calls_enabled, false) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'MENTOR_UNAVAILABLE');
  END IF;

  SELECT p.full_name, u.email INTO v_founder
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
  WHERE p.id = p_founder_id;
  IF NOT FOUND OR NULLIF(lower(btrim(COALESCE(v_founder.email, ''))), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'FOUNDER_EMAIL_MISSING');
  END IF;

  SELECT balance, monthly_quota, current_period_start
  INTO v_wallet FROM public.user_credits
  WHERE user_id = p_founder_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 'errorCode', 'INSUFFICIENT_CREDITS', 'requiredCredits', 10
    );
  END IF;

  -- Recheck idempotency and pair uniqueness after serializing requests against
  -- the founder wallet. This makes concurrent retries deterministic.
  SELECT * INTO v_existing FROM public.discovery_calls
  WHERE founder_id = p_founder_id AND idempotency_key = p_idempotency_key LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true, 'callId', v_existing.id,
      'status', v_existing.status, 'idempotentReplay', true
    );
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.discovery_calls
    WHERE founder_id = p_founder_id AND mentor_id = p_mentor_id
      AND workflow_version = 2
      AND status IN ('pending_mentor_response', 'pending_founder_response', 'scheduled', 'awaiting_outcome')
  ) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'ACTIVE_CALL_EXISTS');
  END IF;

  IF COALESCE(v_wallet.balance, 0) + COALESCE(v_wallet.monthly_quota, 0) < 10 THEN
    RETURN jsonb_build_object(
      'success', false, 'errorCode', 'INSUFFICIENT_CREDITS', 'requiredCredits', 10
    );
  END IF;
  v_used_quota := LEAST(COALESCE(v_wallet.monthly_quota, 0), 10);
  v_used_balance := 10 - v_used_quota;
  UPDATE public.user_credits
  SET monthly_quota = monthly_quota - v_used_quota,
      balance = balance - v_used_balance, updated_at = now()
  WHERE user_id = p_founder_id;

  INSERT INTO public.discovery_calls (
    founder_id, mentor_id, mentor_name_snapshot, provider_name,
    provider_booking_url, status, booking_source, idempotency_key,
    workflow_version, request_topic, desired_outcome, founder_notes,
    founder_timezone, mentor_contact_email_snapshot, founder_email_snapshot,
    response_due_at, duration_minutes, last_state_changed_at
  ) VALUES (
    p_founder_id, p_mentor_id, v_mentor.name, NULL, NULL,
    'pending_mentor_response', 'platform_request', p_idempotency_key,
    2, btrim(p_topic), btrim(p_desired_outcome), NULLIF(btrim(COALESCE(p_notes, '')), ''),
    p_timezone, lower(btrim(v_mentor.notification_email)), lower(btrim(v_founder.email)),
    v_due, 30, now()
  ) RETURNING id INTO v_call_id;

  INSERT INTO public.discovery_call_credit_reservations (
    discovery_call_id, user_id, idempotency_key, used_from_quota,
    used_from_balance, billing_period_start, expires_at
  ) VALUES (
    v_call_id, p_founder_id, p_idempotency_key, v_used_quota,
    v_used_balance, v_wallet.current_period_start, v_due + interval '15 minutes'
  ) RETURNING id INTO v_reservation_id;
  UPDATE public.discovery_calls SET credit_reservation_id = v_reservation_id WHERE id = v_call_id;

  INSERT INTO public.discovery_call_scheduling_rounds (
    discovery_call_id, round_type, proposer_role, responder_role,
    response_due_at
  ) VALUES (v_call_id, 'initial', 'founder', 'mentor', v_due)
  RETURNING id INTO v_round_id;

  FOR v_slot IN SELECT value FROM jsonb_array_elements_text(p_slots)
  LOOP
    v_ordinal := v_ordinal + 1;
    INSERT INTO public.discovery_call_scheduling_slots (
      round_id, ordinal, starts_at, proposed_timezone
    ) VALUES (v_round_id, v_ordinal, v_slot::timestamptz, p_timezone);
  END LOOP;

  INSERT INTO public.discovery_call_action_tokens (
    discovery_call_id, round_id, purpose, recipient_role, token_hash, expires_at
  ) VALUES (
    v_call_id, v_round_id, 'mentor_request_response', 'mentor',
    p_token_hash, v_due
  );

  v_payload := jsonb_build_object(
    'callId', v_call_id, 'founderId', p_founder_id, 'mentorId', p_mentor_id,
    'founderName', COALESCE(v_founder.full_name, 'A founder'),
    'founderEmail', lower(btrim(v_founder.email)), 'mentorName', v_mentor.name,
    'mentorEmail', lower(btrim(v_mentor.notification_email)),
    'mentorTimezone', COALESCE(v_mentor.timezone, 'UTC'), 'founderTimezone', p_timezone,
    'topic', btrim(p_topic), 'desiredOutcome', btrim(p_desired_outcome),
    'notes', NULLIF(btrim(COALESCE(p_notes, '')), ''), 'slots', p_slots,
    'responseDueAt', v_due, 'heldCredits', 10
  );
  v_event_id := public.record_discovery_call_event_v2(
    v_call_id, 'request_created', p_founder_id, v_payload
  );
  PERFORM public.enqueue_discovery_call_notification_v2(
    v_event_id, v_call_id, 'request_created', 'mentor',
    v_mentor.notification_email, v_payload, p_token_ciphertext
  );
  PERFORM public.enqueue_discovery_call_notification_v2(
    v_event_id, v_call_id, 'request_created', 'admin',
    'admin@creatives-takeover.com', v_payload, NULL
  );

  RETURN jsonb_build_object(
    'success', true, 'callId', v_call_id, 'status', 'pending_mentor_response',
    'responseDueAt', v_due, 'heldCredits', 10,
    'balanceAfter', COALESCE(v_wallet.balance, 0) + COALESCE(v_wallet.monthly_quota, 0) - 10
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing FROM public.discovery_calls
    WHERE founder_id = p_founder_id AND idempotency_key = p_idempotency_key LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true, 'callId', v_existing.id,
        'status', v_existing.status, 'idempotentReplay', true
      );
    END IF;
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_discovery_call_request_v2(
  p_call_id UUID,
  p_token_hash TEXT,
  p_action TEXT,
  p_slot_id UUID DEFAULT NULL,
  p_counter_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_meeting_url TEXT DEFAULT NULL,
  p_meeting_instructions TEXT DEFAULT NULL,
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
  v_call public.discovery_calls%ROWTYPE;
  v_round public.discovery_call_scheduling_rounds%ROWTYPE;
  v_token public.discovery_call_action_tokens%ROWTYPE;
  v_slot public.discovery_call_scheduling_slots%ROWTYPE;
  v_new_round UUID;
  v_due TIMESTAMPTZ;
  v_event BIGINT;
  v_payload JSONB;
  v_finalize JSONB;
BEGIN
  SELECT * INTO v_token FROM public.discovery_call_action_tokens
  WHERE token_hash = p_token_hash AND discovery_call_id = p_call_id
    AND purpose = 'mentor_request_response' FOR UPDATE;
  IF NOT FOUND OR v_token.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'TOKEN_INVALID');
  END IF;
  IF v_token.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE');
  END IF;
  IF v_token.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'TOKEN_EXPIRED');
  END IF;

  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  SELECT * INTO v_round FROM public.discovery_call_scheduling_rounds
  WHERE id = v_token.round_id FOR UPDATE;
  IF v_call.workflow_version <> 2 OR v_call.status <> 'pending_mentor_response'
     OR v_round.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE');
  END IF;

  IF p_action = 'accept' THEN
    SELECT * INTO v_slot FROM public.discovery_call_scheduling_slots
    WHERE id = p_slot_id AND round_id = v_round.id;
    IF NOT FOUND OR v_slot.starts_at < now() + interval '24 hours' THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_SLOTS');
    END IF;
    IF NULLIF(btrim(COALESCE(p_meeting_url, '')), '') IS NULL
       AND length(btrim(COALESCE(p_meeting_instructions, ''))) NOT BETWEEN 10 AND 1000 THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'MEETING_DETAILS_REQUIRED');
    END IF;
    IF length(COALESCE(p_meeting_instructions, '')) > 1000 THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'MEETING_DETAILS_REQUIRED');
    END IF;
    IF NULLIF(btrim(COALESCE(p_meeting_url, '')), '') IS NOT NULL
       AND p_meeting_url !~* '^https://' THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'MEETING_DETAILS_REQUIRED');
    END IF;
    IF length(COALESCE(p_management_token_hash, '')) <> 64
       OR NULLIF(p_management_token_ciphertext, '') IS NULL THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'TOKEN_INVALID');
    END IF;

    v_finalize := public.finalize_discovery_call_reservation_v2(
      v_call.credit_reservation_id, v_slot.starts_at
    );
    IF NOT COALESCE((v_finalize ->> 'success')::boolean, false) THEN RETURN v_finalize; END IF;

    UPDATE public.discovery_call_scheduling_rounds
    SET status = 'accepted', accepted_slot_id = v_slot.id,
        meeting_url = NULLIF(btrim(COALESCE(p_meeting_url, '')), ''),
        meeting_instructions = NULLIF(btrim(COALESCE(p_meeting_instructions, '')), ''),
        responded_at = now()
    WHERE id = v_round.id;
    UPDATE public.discovery_calls
    SET status = 'scheduled', scheduled_for = v_slot.starts_at,
        meeting_url = NULLIF(btrim(COALESCE(p_meeting_url, '')), ''),
        meeting_instructions = NULLIF(btrim(COALESCE(p_meeting_instructions, '')), ''),
        confirmed_at = now(), confirmation_source = 'mentor_portal',
        response_due_at = NULL, last_state_changed_at = now()
    WHERE id = p_call_id;
    UPDATE public.discovery_call_action_tokens SET used_at = now(), revoked_at = now()
    WHERE discovery_call_id = p_call_id AND revoked_at IS NULL;
    INSERT INTO public.discovery_call_action_tokens (
      discovery_call_id, purpose, recipient_role, token_hash, expires_at
    ) VALUES (
      p_call_id, 'mentor_booking_manage', 'mentor', p_management_token_hash,
      v_slot.starts_at + interval '7 days'
    );

    v_payload := jsonb_build_object(
      'callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot,
      'founderEmail', v_call.founder_email_snapshot,
      'scheduledFor', v_slot.starts_at, 'durationMinutes', 30,
      'founderTimezone', v_call.founder_timezone,
      'meetingUrl', NULLIF(btrim(COALESCE(p_meeting_url, '')), ''),
      'meetingInstructions', NULLIF(btrim(COALESCE(p_meeting_instructions, '')), ''),
      'creditsCharged', 10, 'calendarSequence', v_call.calendar_sequence
    );
    v_event := public.record_discovery_call_event_v2(p_call_id, 'scheduled', NULL, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'booking_confirmed', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'booking_confirmed', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, p_management_token_ciphertext);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'booking_confirmed', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', 'scheduled', 'scheduledFor', v_slot.starts_at);

  ELSIF p_action = 'counter' THEN
    IF p_counter_starts_at < now() + interval '72 hours'
       OR p_counter_starts_at > now() + interval '60 days' THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_SLOTS');
    END IF;
    IF NULLIF(btrim(COALESCE(p_meeting_url, '')), '') IS NULL
       AND length(btrim(COALESCE(p_meeting_instructions, ''))) NOT BETWEEN 10 AND 1000 THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'MEETING_DETAILS_REQUIRED');
    END IF;
    IF length(COALESCE(p_meeting_instructions, '')) > 1000 THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'MEETING_DETAILS_REQUIRED');
    END IF;
    IF NULLIF(btrim(COALESCE(p_meeting_url, '')), '') IS NOT NULL
       AND p_meeting_url !~* '^https://' THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'MEETING_DETAILS_REQUIRED');
    END IF;
    v_due := now() + interval '48 hours';
    UPDATE public.discovery_call_scheduling_rounds
    SET status = 'superseded', responded_at = now() WHERE id = v_round.id;
    INSERT INTO public.discovery_call_scheduling_rounds (
      discovery_call_id, round_type, proposer_role, responder_role,
      counter_depth, response_due_at, meeting_url, meeting_instructions
    ) VALUES (
      p_call_id, 'initial', 'mentor', 'founder', 1, v_due,
      NULLIF(btrim(COALESCE(p_meeting_url, '')), ''),
      NULLIF(btrim(COALESCE(p_meeting_instructions, '')), '')
    ) RETURNING id INTO v_new_round;
    INSERT INTO public.discovery_call_scheduling_slots (
      round_id, ordinal, starts_at, proposed_timezone
    ) VALUES (v_new_round, 1, p_counter_starts_at, COALESCE(v_call.founder_timezone, 'UTC'));
    UPDATE public.discovery_calls
    SET status = 'pending_founder_response', response_due_at = v_due,
        last_state_changed_at = now() WHERE id = p_call_id;
    UPDATE public.discovery_call_credit_reservations
    SET expires_at = LEAST(v_due + interval '15 minutes', created_at + interval '7 days')
    WHERE id = v_call.credit_reservation_id AND status = 'pending';
    UPDATE public.discovery_call_action_tokens SET used_at = now() WHERE id = v_token.id;

    v_payload := jsonb_build_object(
      'callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot,
      'counterStartsAt', p_counter_starts_at, 'founderTimezone', v_call.founder_timezone,
      'meetingUrl', NULLIF(btrim(COALESCE(p_meeting_url, '')), ''),
      'meetingInstructions', NULLIF(btrim(COALESCE(p_meeting_instructions, '')), ''),
      'responseDueAt', v_due
    );
    v_event := public.record_discovery_call_event_v2(p_call_id, 'mentor_countered', NULL, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'mentor_countered', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'mentor_countered', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'mentor_countered', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', 'pending_founder_response', 'responseDueAt', v_due);

  ELSIF p_action = 'decline' THEN
    PERFORM public.release_discovery_call_reservation_v2(v_call.credit_reservation_id, 'Mentor declined request', false);
    UPDATE public.discovery_call_scheduling_rounds SET status = 'declined', responded_at = now() WHERE id = v_round.id;
    UPDATE public.discovery_calls SET status = 'declined', response_due_at = NULL,
      cancelled_reason = NULLIF(btrim(COALESCE(p_reason, '')), ''), last_state_changed_at = now()
    WHERE id = p_call_id;
    UPDATE public.discovery_call_action_tokens SET used_at = now(), revoked_at = now()
    WHERE discovery_call_id = p_call_id AND revoked_at IS NULL;
    v_payload := jsonb_build_object('callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot, 'reason', NULLIF(btrim(COALESCE(p_reason, '')), ''), 'creditsReleased', 10);
    v_event := public.record_discovery_call_event_v2(p_call_id, 'request_declined', NULL, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_declined', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_declined', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_declined', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', 'declined', 'creditsReleased', 10);
  END IF;
  RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_REQUEST');
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_discovery_call_counter_v2(
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
  v_call public.discovery_calls%ROWTYPE;
  v_round public.discovery_call_scheduling_rounds%ROWTYPE;
  v_slot public.discovery_call_scheduling_slots%ROWTYPE;
  v_event BIGINT;
  v_payload JSONB;
  v_finalize JSONB;
BEGIN
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND'); END IF;
  IF v_call.founder_id <> p_founder_id THEN RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN'); END IF;
  SELECT * INTO v_round FROM public.discovery_call_scheduling_rounds
  WHERE discovery_call_id = p_call_id AND status = 'pending' AND round_type = 'initial' FOR UPDATE;
  IF NOT FOUND OR v_call.status <> 'pending_founder_response' THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE');
  END IF;
  IF v_round.response_due_at <= now() THEN RETURN jsonb_build_object('success', false, 'errorCode', 'RESPONSE_EXPIRED'); END IF;

  IF p_action = 'accept' THEN
    IF length(COALESCE(p_management_token_hash, '')) <> 64 OR NULLIF(p_management_token_ciphertext, '') IS NULL THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'TOKEN_INVALID');
    END IF;
    SELECT * INTO v_slot FROM public.discovery_call_scheduling_slots WHERE round_id = v_round.id LIMIT 1;
    IF NOT FOUND OR v_slot.starts_at < now() + interval '24 hours' THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_SLOTS');
    END IF;
    v_finalize := public.finalize_discovery_call_reservation_v2(v_call.credit_reservation_id, v_slot.starts_at);
    IF NOT COALESCE((v_finalize ->> 'success')::boolean, false) THEN RETURN v_finalize; END IF;
    UPDATE public.discovery_call_scheduling_rounds SET status = 'accepted', accepted_slot_id = v_slot.id, responded_at = now() WHERE id = v_round.id;
    UPDATE public.discovery_calls SET status = 'scheduled', scheduled_for = v_slot.starts_at,
      meeting_url = v_round.meeting_url, meeting_instructions = v_round.meeting_instructions,
      confirmed_at = now(), confirmation_source = 'founder_counter_acceptance',
      response_due_at = NULL, last_state_changed_at = now() WHERE id = p_call_id;
    INSERT INTO public.discovery_call_action_tokens (discovery_call_id, purpose, recipient_role, token_hash, expires_at)
    VALUES (p_call_id, 'mentor_booking_manage', 'mentor', p_management_token_hash, v_slot.starts_at + interval '7 days');
    v_payload := jsonb_build_object('callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot, 'scheduledFor', v_slot.starts_at, 'durationMinutes', 30, 'founderTimezone', v_call.founder_timezone, 'meetingUrl', v_round.meeting_url, 'meetingInstructions', v_round.meeting_instructions, 'creditsCharged', 10, 'calendarSequence', v_call.calendar_sequence);
    v_event := public.record_discovery_call_event_v2(p_call_id, 'scheduled', p_founder_id, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'booking_confirmed', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'booking_confirmed', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, p_management_token_ciphertext);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'booking_confirmed', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', 'scheduled', 'scheduledFor', v_slot.starts_at);
  ELSIF p_action = 'decline' THEN
    PERFORM public.release_discovery_call_reservation_v2(v_call.credit_reservation_id, 'Founder declined mentor counter', false);
    UPDATE public.discovery_call_scheduling_rounds SET status = 'declined', responded_at = now() WHERE id = v_round.id;
    UPDATE public.discovery_calls SET status = 'declined', response_due_at = NULL, last_state_changed_at = now() WHERE id = p_call_id;
    UPDATE public.discovery_call_action_tokens SET revoked_at = now()
    WHERE discovery_call_id = p_call_id AND revoked_at IS NULL;
    v_payload := jsonb_build_object('callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot, 'creditsReleased', 10);
    v_event := public.record_discovery_call_event_v2(p_call_id, 'request_declined', p_founder_id, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_declined', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_declined', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_declined', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', 'declined', 'creditsReleased', 10);
  END IF;
  RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_REQUEST');
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_discovery_call_request_v2(
  p_call_id UUID, p_founder_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_call public.discovery_calls%ROWTYPE; v_event BIGINT; v_payload JSONB;
BEGIN
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND'); END IF;
  IF v_call.founder_id <> p_founder_id THEN RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN'); END IF;
  IF v_call.status NOT IN ('pending_mentor_response', 'pending_founder_response') THEN RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE'); END IF;
  PERFORM public.release_discovery_call_reservation_v2(v_call.credit_reservation_id, 'Founder withdrew request', false);
  UPDATE public.discovery_call_scheduling_rounds SET status = 'declined', responded_at = now() WHERE discovery_call_id = p_call_id AND status = 'pending';
  UPDATE public.discovery_call_action_tokens SET revoked_at = now() WHERE discovery_call_id = p_call_id AND revoked_at IS NULL;
  UPDATE public.discovery_calls SET status = 'withdrawn', response_due_at = NULL, last_state_changed_at = now() WHERE id = p_call_id;
  v_payload := jsonb_build_object('callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot, 'creditsReleased', 10);
  v_event := public.record_discovery_call_event_v2(p_call_id, 'request_withdrawn', p_founder_id, v_payload);
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_withdrawn', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_withdrawn', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'request_withdrawn', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
  RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', 'withdrawn', 'creditsReleased', 10);
END;
$$;

REVOKE ALL ON FUNCTION public.release_discovery_call_reservation_v2(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_discovery_call_reservation_v2(UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_discovery_call_request_v2(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_to_discovery_call_request_v2(UUID, TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_to_discovery_call_counter_v2(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.withdraw_discovery_call_request_v2(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_discovery_call_reservation_v2(UUID, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_discovery_call_reservation_v2(UUID, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_discovery_call_request_v2(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_discovery_call_request_v2(UUID, TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_discovery_call_counter_v2(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_discovery_call_request_v2(UUID, UUID) TO service_role;
