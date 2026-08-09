-- Cancellation, rescheduling, administrative outcomes, and deadline processing.

CREATE OR REPLACE FUNCTION public.cancel_discovery_call_v2(
  p_call_id UUID,
  p_actor_user_id UUID,
  p_actor_role TEXT,
  p_reason TEXT,
  p_force_refund BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_call public.discovery_calls%ROWTYPE;
  v_refund BOOLEAN := false;
  v_status public.discovery_call_status;
  v_refund_result JSONB := '{}'::jsonb;
  v_event BIGINT;
  v_payload JSONB;
  v_reservation public.discovery_call_credit_reservations%ROWTYPE;
  v_current_period_start TIMESTAMPTZ;
  v_restored_quota INTEGER := 0;
  v_refund_transaction_id UUID;
BEGIN
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND'); END IF;
  IF v_call.workflow_version <> 2 THEN RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_STATE'); END IF;
  IF p_actor_role = 'founder' AND v_call.founder_id <> p_actor_user_id THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN');
  END IF;
  IF p_actor_role = 'admin' AND NOT public.is_discovery_call_admin(p_actor_user_id) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN');
  END IF;
  IF p_actor_role NOT IN ('founder', 'mentor', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN');
  END IF;

  IF v_call.status IN ('pending_mentor_response', 'pending_founder_response') THEN
    PERFORM public.release_discovery_call_reservation_v2(v_call.credit_reservation_id, 'Pending request cancelled', false);
    v_status := CASE WHEN p_actor_role = 'founder' THEN 'withdrawn' ELSE 'declined' END;
  ELSIF v_call.status IN ('scheduled', 'awaiting_outcome') THEN
    v_refund := p_force_refund OR p_actor_role = 'mentor'
      OR (p_actor_role = 'founder' AND now() <= v_call.scheduled_for - interval '24 hours');
    v_status := CASE WHEN v_refund THEN 'cancelled_early' ELSE 'cancelled_late' END;
    IF v_refund AND v_call.credits_charged AND NOT v_call.credits_refunded THEN
      SELECT * INTO v_reservation
      FROM public.discovery_call_credit_reservations
      WHERE id = v_call.credit_reservation_id FOR UPDATE;
      SELECT current_period_start INTO v_current_period_start
      FROM public.user_credits WHERE user_id = v_call.founder_id;
      v_refund_result := public.refund_platform_credits_atomic(
        v_call.founder_id, v_call.credit_charge_amount, 'DISCOVERY_CALL',
        'Discovery Call cancellation refund',
        jsonb_build_object(
          'deductionTransactionId', (
            SELECT credit_transaction_id::text FROM public.discovery_call_credit_reservations
            WHERE id = v_call.credit_reservation_id
          ),
          'discoveryCallId', v_call.id,
          'refundReason', p_actor_role || '_cancellation'
        )
      );
      IF COALESCE((v_refund_result ->> 'success')::boolean, false) THEN
        -- refund_platform_credits_atomic keys quota restoration off the
        -- deduction timestamp. A Discovery Call hold can cross a renewal, so
        -- correct that result back to the reservation's original period and
        -- never turn expired quota into new monthly credits.
        v_restored_quota := COALESCE((v_refund_result ->> 'restoredToMonthlyQuota')::integer, 0);
        IF v_reservation.billing_period_start IS DISTINCT FROM v_current_period_start
           AND v_restored_quota > 0 THEN
          UPDATE public.user_credits
          SET monthly_quota = GREATEST(0, monthly_quota - v_restored_quota), updated_at = now()
          WHERE user_id = v_call.founder_id;
          v_refund_transaction_id := NULLIF(v_refund_result ->> 'refundTransactionId', '')::uuid;
          UPDATE public.credit_transactions
          SET amount = GREATEST(0, amount - v_restored_quota),
              metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'restoredToMonthlyQuota', 0,
                'expiredMonthlyCreditsNotRestored', v_restored_quota,
                'reservationBillingPeriodStart', v_reservation.billing_period_start
              )
          WHERE id = v_refund_transaction_id;
          v_refund_result := v_refund_result || jsonb_build_object(
            'restoredToMonthlyQuota', 0,
            'expiredMonthlyCreditsNotRestored', v_restored_quota
          );
        END IF;
        UPDATE public.discovery_call_credit_reservations
        SET status = 'refunded', refunded_at = now(),
            refund_transaction_id = NULLIF(v_refund_result ->> 'refundTransactionId', '')::uuid,
            metadata = metadata || jsonb_build_object('refundResult', v_refund_result)
        WHERE id = v_call.credit_reservation_id;
        UPDATE public.discovery_call_cycle_counters
        SET overage_calls_booked = GREATEST(0, overage_calls_booked - 1), updated_at = now()
        WHERE user_id = v_call.founder_id AND billing_period_start = v_call.billing_period_start;
        PERFORM public.sync_discovery_call_usage_legacy(v_call.founder_id, v_call.billing_period_start, -1);
      ELSE
        RETURN jsonb_build_object('success', false, 'errorCode', 'REFUND_FAILED', 'details', v_refund_result);
      END IF;
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE');
  END IF;

  UPDATE public.discovery_call_scheduling_rounds SET status = 'declined', responded_at = now()
  WHERE discovery_call_id = p_call_id AND status = 'pending';
  UPDATE public.discovery_call_action_tokens SET revoked_at = now()
  WHERE discovery_call_id = p_call_id AND revoked_at IS NULL;
  UPDATE public.discovery_calls
  SET status = v_status, cancelled_at = now(),
      cancelled_reason = NULLIF(btrim(COALESCE(p_reason, '')), ''),
      response_due_at = NULL, credits_refunded = v_refund,
      credits_refunded_at = CASE WHEN v_refund THEN now() ELSE credits_refunded_at END,
      counted_in_cycle = CASE WHEN v_refund THEN false ELSE counted_in_cycle END,
      count_released_at = CASE WHEN v_refund THEN now() ELSE count_released_at END,
      calendar_sequence = calendar_sequence + CASE WHEN scheduled_for IS NULL THEN 0 ELSE 1 END,
      last_state_changed_at = now()
  WHERE id = p_call_id;

  v_payload := jsonb_build_object(
    'callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot,
    'scheduledFor', v_call.scheduled_for, 'durationMinutes', v_call.duration_minutes,
    'actorRole', p_actor_role, 'reason', NULLIF(btrim(COALESCE(p_reason, '')), ''),
    'refunded', v_refund, 'status', v_status,
    'calendarSequence', v_call.calendar_sequence + 1
  );
  v_event := public.record_discovery_call_event_v2(p_call_id, 'booking_cancelled', p_actor_user_id, v_payload);
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'booking_cancelled', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'booking_cancelled', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'booking_cancelled', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
  RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', v_status, 'refunded', v_refund, 'refundResult', v_refund_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_discovery_call_reschedule_v2(
  p_call_id UUID,
  p_actor_user_id UUID,
  p_proposer_role TEXT,
  p_timezone TEXT,
  p_slots JSONB,
  p_management_token_hash TEXT DEFAULT NULL,
  p_management_token_ciphertext TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_call public.discovery_calls%ROWTYPE;
  v_round UUID;
  v_due TIMESTAMPTZ := now() + interval '48 hours';
  v_slot TEXT;
  v_ordinal INTEGER := 0;
  v_event BIGINT;
  v_payload JSONB;
BEGIN
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  IF NOT FOUND OR v_call.workflow_version <> 2 OR v_call.status <> 'scheduled' THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_STATE');
  END IF;
  IF p_proposer_role = 'founder' AND v_call.founder_id <> p_actor_user_id THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN');
  END IF;
  IF p_proposer_role = 'founder' AND now() > v_call.scheduled_for - interval '24 hours' THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'TOO_LATE_TO_RESCHEDULE');
  END IF;
  IF p_proposer_role = 'admin' AND NOT public.is_discovery_call_admin(p_actor_user_id) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN');
  END IF;
  IF p_proposer_role NOT IN ('founder', 'mentor', 'admin')
     OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone)
     OR jsonb_typeof(p_slots) <> 'array'
     OR (SELECT count(*) FROM jsonb_array_elements_text(p_slots)) <> 3
     OR (SELECT count(DISTINCT value) FROM jsonb_array_elements_text(p_slots)) <> 3
     OR EXISTS (
       SELECT 1 FROM jsonb_array_elements_text(p_slots) s(value)
       WHERE value::timestamptz < now() + interval '72 hours'
          OR value::timestamptz > now() + interval '60 days'
     ) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_SLOTS');
  END IF;
  IF EXISTS (SELECT 1 FROM public.discovery_call_scheduling_rounds WHERE discovery_call_id = p_call_id AND status = 'pending') THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'ACTIVE_RESCHEDULE_EXISTS');
  END IF;
  IF p_proposer_role IN ('founder', 'admin')
     AND (length(COALESCE(p_management_token_hash, '')) <> 64 OR NULLIF(p_management_token_ciphertext, '') IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'TOKEN_INVALID');
  END IF;

  INSERT INTO public.discovery_call_scheduling_rounds (
    discovery_call_id, round_type, proposer_role, responder_role, response_due_at
  ) VALUES (
    p_call_id, 'reschedule', p_proposer_role,
    CASE WHEN p_proposer_role = 'mentor' THEN 'founder' ELSE 'mentor' END,
    v_due
  ) RETURNING id INTO v_round;
  FOR v_slot IN SELECT value FROM jsonb_array_elements_text(p_slots) LOOP
    v_ordinal := v_ordinal + 1;
    INSERT INTO public.discovery_call_scheduling_slots (round_id, ordinal, starts_at, proposed_timezone)
    VALUES (v_round, v_ordinal, v_slot::timestamptz, p_timezone);
  END LOOP;
  IF p_proposer_role IN ('founder', 'admin') THEN
    UPDATE public.discovery_call_action_tokens SET revoked_at = now()
    WHERE discovery_call_id = p_call_id AND purpose = 'mentor_booking_manage' AND revoked_at IS NULL;
    INSERT INTO public.discovery_call_action_tokens (
      discovery_call_id, round_id, purpose, recipient_role, token_hash, expires_at
    ) VALUES (
      p_call_id, v_round, 'mentor_booking_manage', 'mentor', p_management_token_hash,
      GREATEST(v_call.scheduled_for + interval '7 days', v_due + interval '15 minutes')
    );
  END IF;
  v_payload := jsonb_build_object('callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot, 'originalScheduledFor', v_call.scheduled_for, 'slots', p_slots, 'timezone', p_timezone, 'responseDueAt', v_due, 'proposerRole', p_proposer_role);
  v_event := public.record_discovery_call_event_v2(p_call_id, 'reschedule_requested', p_actor_user_id, v_payload);
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'reschedule_requested', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
  PERFORM public.enqueue_discovery_call_notification_v2(
    v_event, p_call_id, 'reschedule_requested', 'mentor',
    v_call.mentor_contact_email_snapshot, v_payload,
    CASE WHEN p_proposer_role IN ('founder', 'admin') THEN p_management_token_ciphertext ELSE NULL END
  );
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'reschedule_requested', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
  RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'roundId', v_round, 'responseDueAt', v_due);
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_discovery_call_reschedule_v2(
  p_call_id UUID,
  p_actor_user_id UUID,
  p_actor_role TEXT,
  p_action TEXT,
  p_slot_id UUID DEFAULT NULL,
  p_counter_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_meeting_url TEXT DEFAULT NULL,
  p_meeting_instructions TEXT DEFAULT NULL,
  p_management_token_hash TEXT DEFAULT NULL,
  p_management_token_ciphertext TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_call public.discovery_calls%ROWTYPE;
  v_round public.discovery_call_scheduling_rounds%ROWTYPE;
  v_slot public.discovery_call_scheduling_slots%ROWTYPE;
  v_new_round UUID;
  v_due TIMESTAMPTZ;
  v_event BIGINT;
  v_payload JSONB;
  v_final_url TEXT;
  v_final_instructions TEXT;
BEGIN
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  SELECT * INTO v_round FROM public.discovery_call_scheduling_rounds
  WHERE discovery_call_id = p_call_id AND round_type = 'reschedule' AND status = 'pending' FOR UPDATE;
  IF NOT FOUND OR v_call.status <> 'scheduled' OR v_round.responder_role <> p_actor_role THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE');
  END IF;
  IF p_actor_role = 'founder' AND v_call.founder_id <> p_actor_user_id THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN');
  END IF;
  IF v_round.response_due_at <= now() THEN RETURN jsonb_build_object('success', false, 'errorCode', 'RESPONSE_EXPIRED'); END IF;

  IF p_action = 'accept' THEN
    SELECT * INTO v_slot FROM public.discovery_call_scheduling_slots WHERE id = p_slot_id AND round_id = v_round.id;
    IF NOT FOUND OR v_slot.starts_at < now() + interval '24 hours' THEN RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_SLOTS'); END IF;
    v_final_url := COALESCE(NULLIF(btrim(COALESCE(p_meeting_url, '')), ''), v_round.meeting_url, v_call.meeting_url);
    v_final_instructions := COALESCE(NULLIF(btrim(COALESCE(p_meeting_instructions, '')), ''), v_round.meeting_instructions, v_call.meeting_instructions);
    IF v_final_url IS NULL AND length(COALESCE(v_final_instructions, '')) NOT BETWEEN 10 AND 1000 THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'MEETING_DETAILS_REQUIRED');
    END IF;
    IF length(COALESCE(v_final_instructions, '')) > 1000 THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'MEETING_DETAILS_REQUIRED');
    END IF;
    IF length(COALESCE(p_management_token_hash, '')) <> 64 OR NULLIF(p_management_token_ciphertext, '') IS NULL THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'TOKEN_INVALID');
    END IF;
    UPDATE public.discovery_call_scheduling_rounds SET status = 'accepted', accepted_slot_id = v_slot.id, responded_at = now() WHERE id = v_round.id;
    UPDATE public.discovery_calls SET scheduled_for = v_slot.starts_at, meeting_url = v_final_url,
      meeting_instructions = v_final_instructions, calendar_sequence = calendar_sequence + 1,
      last_state_changed_at = now() WHERE id = p_call_id;
    UPDATE public.discovery_call_action_tokens SET revoked_at = now()
    WHERE discovery_call_id = p_call_id AND purpose = 'mentor_booking_manage' AND revoked_at IS NULL;
    INSERT INTO public.discovery_call_action_tokens (discovery_call_id, purpose, recipient_role, token_hash, expires_at)
    VALUES (p_call_id, 'mentor_booking_manage', 'mentor', p_management_token_hash, v_slot.starts_at + interval '7 days');
    v_payload := jsonb_build_object('callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot, 'previousScheduledFor', v_call.scheduled_for, 'scheduledFor', v_slot.starts_at, 'durationMinutes', 30, 'meetingUrl', v_final_url, 'meetingInstructions', v_final_instructions, 'calendarSequence', v_call.calendar_sequence + 1);
    v_event := public.record_discovery_call_event_v2(p_call_id, 'reschedule_confirmed', p_actor_user_id, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'reschedule_confirmed', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'reschedule_confirmed', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, p_management_token_ciphertext);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'reschedule_confirmed', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', 'scheduled', 'scheduledFor', v_slot.starts_at);
  ELSIF p_action = 'counter' AND v_round.counter_depth = 0 THEN
    IF p_counter_starts_at < now() + interval '72 hours' OR p_counter_starts_at > now() + interval '60 days' THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_SLOTS');
    END IF;
    v_due := now() + interval '48 hours';
    UPDATE public.discovery_call_scheduling_rounds SET status = 'superseded', responded_at = now() WHERE id = v_round.id;
    INSERT INTO public.discovery_call_scheduling_rounds (discovery_call_id, round_type, proposer_role, responder_role, counter_depth, response_due_at, meeting_url, meeting_instructions)
    VALUES (
      p_call_id,
      'reschedule',
      p_actor_role,
      CASE WHEN v_round.proposer_role = 'admin' THEN 'founder' ELSE v_round.proposer_role END,
      1,
      v_due,
      NULLIF(btrim(COALESCE(p_meeting_url, '')), ''),
      NULLIF(btrim(COALESCE(p_meeting_instructions, '')), '')
    ) RETURNING id INTO v_new_round;
    INSERT INTO public.discovery_call_scheduling_slots (round_id, ordinal, starts_at, proposed_timezone)
    VALUES (v_new_round, 1, p_counter_starts_at, COALESCE(v_call.founder_timezone, 'UTC'));
    v_payload := jsonb_build_object('callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot, 'originalScheduledFor', v_call.scheduled_for, 'counterStartsAt', p_counter_starts_at, 'responseDueAt', v_due, 'proposerRole', p_actor_role);
    v_event := public.record_discovery_call_event_v2(p_call_id, 'reschedule_countered', p_actor_user_id, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'reschedule_requested', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'reschedule_requested', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'reschedule_requested', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'roundId', v_new_round, 'responseDueAt', v_due);
  ELSIF p_action = 'decline' THEN
    UPDATE public.discovery_call_scheduling_rounds SET status = 'declined', responded_at = now() WHERE id = v_round.id;
    v_payload := jsonb_build_object('callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot, 'scheduledFor', v_call.scheduled_for, 'originalBookingUnchanged', true);
    v_event := public.record_discovery_call_event_v2(p_call_id, 'reschedule_declined', p_actor_user_id, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'reschedule_expired', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'reschedule_expired', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'reschedule_expired', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'status', 'scheduled', 'originalBookingUnchanged', true);
  END IF;
  RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_REQUEST');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_discovery_call_outcome_v2(
  p_call_id UUID,
  p_admin_user_id UUID,
  p_action TEXT,
  p_reason TEXT,
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL,
  p_meeting_url TEXT DEFAULT NULL,
  p_meeting_instructions TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_call public.discovery_calls%ROWTYPE; v_status public.discovery_call_status; v_event BIGINT; v_payload JSONB; v_cancel JSONB; v_template TEXT := 'outcome_recorded';
BEGIN
  IF NOT public.is_discovery_call_admin(p_admin_user_id) OR length(btrim(COALESCE(p_reason, ''))) < 3 THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN');
  END IF;
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  IF NOT FOUND OR v_call.workflow_version <> 2 THEN RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND'); END IF;
  IF p_action IN ('cancel_refund', 'cancel_no_refund') THEN
    v_cancel := public.cancel_discovery_call_v2(p_call_id, p_admin_user_id, 'admin', p_reason, p_action = 'cancel_refund');
    RETURN v_cancel;
  ELSIF p_action IN ('completed', 'founder_no_show', 'mentor_no_show') THEN
    IF v_call.status NOT IN ('scheduled', 'awaiting_outcome') THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE');
    END IF;
    v_status := p_action::public.discovery_call_status;
    IF p_action = 'mentor_no_show' THEN
      v_cancel := public.cancel_discovery_call_v2(p_call_id, p_admin_user_id, 'admin', p_reason, true);
      IF COALESCE((v_cancel ->> 'success')::boolean, false) THEN
        UPDATE public.discovery_calls SET status = 'mentor_no_show' WHERE id = p_call_id;
      END IF;
      RETURN v_cancel || jsonb_build_object('status', 'mentor_no_show');
    END IF;
    UPDATE public.discovery_calls SET status = v_status, last_state_changed_at = now(),
      cancelled_reason = CASE WHEN p_action LIKE '%no_show' THEN p_reason ELSE cancelled_reason END
    WHERE id = p_call_id;
    UPDATE public.discovery_call_action_tokens SET revoked_at = now()
    WHERE discovery_call_id = p_call_id AND revoked_at IS NULL;
  ELSIF p_action = 'correct_booking' THEN
    IF v_call.status NOT IN ('scheduled', 'awaiting_outcome') THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE');
    END IF;
    IF p_scheduled_for IS NULL THEN RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_REQUEST'); END IF;
    IF NULLIF(btrim(COALESCE(p_meeting_url, '')), '') IS NOT NULL AND p_meeting_url !~* '^https://' THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'MEETING_DETAILS_REQUIRED');
    END IF;
    IF length(COALESCE(p_meeting_instructions, '')) > 1000 THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'MEETING_DETAILS_REQUIRED');
    END IF;
    IF NULLIF(btrim(COALESCE(p_meeting_url, '')), '') IS NULL
       AND v_call.meeting_url IS NULL
       AND length(COALESCE(NULLIF(btrim(COALESCE(p_meeting_instructions, '')), ''), v_call.meeting_instructions, '')) NOT BETWEEN 10 AND 1000 THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'MEETING_DETAILS_REQUIRED');
    END IF;
    UPDATE public.discovery_calls SET scheduled_for = p_scheduled_for,
      meeting_url = COALESCE(NULLIF(btrim(COALESCE(p_meeting_url, '')), ''), meeting_url),
      meeting_instructions = COALESCE(NULLIF(btrim(COALESCE(p_meeting_instructions, '')), ''), meeting_instructions),
      calendar_sequence = calendar_sequence + 1, last_state_changed_at = now()
    WHERE id = p_call_id;
    v_template := 'reschedule_confirmed';
  ELSE
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_REQUEST');
  END IF;
  v_payload := jsonb_build_object(
    'callId', p_call_id,
    'action', p_action,
    'reason', p_reason,
    'mentorName', v_call.mentor_name_snapshot,
    'scheduledFor', COALESCE(p_scheduled_for, v_call.scheduled_for),
    'durationMinutes', v_call.duration_minutes,
    'meetingUrl', COALESCE(NULLIF(btrim(COALESCE(p_meeting_url, '')), ''), v_call.meeting_url),
    'meetingInstructions', COALESCE(NULLIF(btrim(COALESCE(p_meeting_instructions, '')), ''), v_call.meeting_instructions),
    'calendarSequence', v_call.calendar_sequence + CASE WHEN p_action = 'correct_booking' THEN 1 ELSE 0 END
  );
  v_event := public.record_discovery_call_event_v2(p_call_id, 'admin_override', p_admin_user_id, v_payload);
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, v_template, 'founder', v_call.founder_email_snapshot, v_payload, NULL);
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, v_template, 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, v_template, 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
  RETURN jsonb_build_object('success', true, 'callId', p_call_id, 'action', p_action);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_discovery_call_deadlines_v2()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_round RECORD; v_call public.discovery_calls%ROWTYPE; v_event BIGINT; v_payload JSONB; v_secure_cipher TEXT; v_reminders INTEGER := 0; v_expired INTEGER := 0; v_outcomes INTEGER := 0;
BEGIN
  FOR v_round IN SELECT * FROM public.discovery_call_scheduling_rounds WHERE status = 'pending' ORDER BY response_due_at FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO v_call FROM public.discovery_calls WHERE id = v_round.discovery_call_id FOR UPDATE;
    IF v_round.response_due_at <= now() THEN
      UPDATE public.discovery_call_scheduling_rounds SET status = 'expired', responded_at = now() WHERE id = v_round.id;
      IF v_round.round_type = 'initial' THEN
        PERFORM public.release_discovery_call_reservation_v2(v_call.credit_reservation_id, 'Discovery Call response deadline expired', true);
        UPDATE public.discovery_calls SET status = 'expired', response_due_at = NULL, last_state_changed_at = now() WHERE id = v_call.id;
        UPDATE public.discovery_call_action_tokens SET revoked_at = now() WHERE discovery_call_id = v_call.id AND revoked_at IS NULL;
        v_payload := jsonb_build_object('callId', v_call.id, 'mentorName', v_call.mentor_name_snapshot, 'creditsReleased', 10);
        v_event := public.record_discovery_call_event_v2(v_call.id, 'request_expired', NULL, v_payload);
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'request_expired', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'request_expired', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'request_expired', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
      ELSE
        v_payload := jsonb_build_object('callId', v_call.id, 'mentorName', v_call.mentor_name_snapshot, 'scheduledFor', v_call.scheduled_for, 'originalBookingUnchanged', true);
        v_event := public.record_discovery_call_event_v2(v_call.id, 'reschedule_expired', NULL, v_payload);
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'reschedule_expired', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'reschedule_expired', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
        PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'reschedule_expired', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
      END IF;
      v_expired := v_expired + 1;
    ELSIF v_round.reminder_24h_sent_at IS NULL AND v_round.created_at <= now() - interval '24 hours' THEN
      v_payload := jsonb_build_object('callId', v_call.id, 'mentorName', v_call.mentor_name_snapshot, 'responseDueAt', v_round.response_due_at);
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
      UPDATE public.discovery_call_scheduling_rounds SET reminder_24h_sent_at = now() WHERE id = v_round.id;
      v_reminders := v_reminders + 1;
    ELSIF v_round.responder_role = 'mentor' AND v_round.round_type = 'initial'
       AND v_round.reminder_48h_sent_at IS NULL AND v_round.created_at <= now() - interval '48 hours' THEN
      v_payload := jsonb_build_object('callId', v_call.id, 'mentorName', v_call.mentor_name_snapshot, 'responseDueAt', v_round.response_due_at);
      v_event := public.record_discovery_call_event_v2(v_call.id, 'response_reminder_48h', NULL, v_payload);
      SELECT secure_token_ciphertext INTO v_secure_cipher
      FROM public.discovery_call_notification_outbox
      WHERE discovery_call_id = v_call.id AND recipient_role = 'mentor'
        AND secure_token_ciphertext IS NOT NULL
      ORDER BY created_at DESC LIMIT 1;
      PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'mentor_reminder_48h', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, v_secure_cipher);
      UPDATE public.discovery_call_scheduling_rounds SET reminder_48h_sent_at = now() WHERE id = v_round.id;
      v_reminders := v_reminders + 1;
    END IF;
  END LOOP;

  UPDATE public.discovery_calls SET status = 'awaiting_outcome', last_state_changed_at = now()
  WHERE workflow_version = 2 AND status = 'scheduled'
    AND scheduled_for + make_interval(mins => duration_minutes) <= now();
  GET DIAGNOSTICS v_outcomes = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'remindersQueued', v_reminders, 'roundsExpired', v_expired, 'awaitingOutcome', v_outcomes);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_discovery_call_v2(UUID, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_discovery_call_reschedule_v2(UUID, UUID, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_to_discovery_call_reschedule_v2(UUID, UUID, TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_discovery_call_outcome_v2(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_discovery_call_deadlines_v2() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_discovery_call_v2(UUID, UUID, TEXT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_discovery_call_reschedule_v2(UUID, UUID, TEXT, TEXT, JSONB, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_discovery_call_reschedule_v2(UUID, UUID, TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_discovery_call_outcome_v2(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_discovery_call_deadlines_v2() TO service_role;

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
WHERE dc.workflow_version = 2
  AND dc.confirmed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.discovery_call_notification_outbox o
    WHERE o.discovery_call_id = dc.id
      AND o.template_key = 'booking_confirmed'
      AND o.recipient_role = required.role
  )
UNION ALL
SELECT 'multiple_pending_rounds', discovery_call_id, count(*)::text, min(created_at)
FROM public.discovery_call_scheduling_rounds
WHERE status = 'pending'
GROUP BY discovery_call_id
HAVING count(*) > 1
UNION ALL
SELECT 'failed_notification', discovery_call_id, id::text, updated_at
FROM public.discovery_call_notification_outbox WHERE status = 'failed'
UNION ALL
SELECT 'v2_provider_data', id, COALESCE(provider_booking_url, provider_event_id, provider_invitee_id), updated_at
FROM public.discovery_calls WHERE workflow_version = 2 AND (provider_booking_url IS NOT NULL OR provider_event_id IS NOT NULL OR provider_invitee_id IS NOT NULL);

REVOKE ALL ON public.admin_discovery_call_workflow_health FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_discovery_call_workflow_health TO service_role;
