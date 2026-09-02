-- Discovery Call attendance V5: derived-only Google Meet verification with a
-- two-party confirmation fallback. No participant names, Google IDs, or raw
-- Meet payloads are persisted.

CREATE TABLE IF NOT EXISTS public.discovery_call_attendance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_call_id UUID NOT NULL UNIQUE REFERENCES public.discovery_calls(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google_meet' CHECK (provider IN ('google_meet', 'manual')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'checking', 'verified_completed', 'confirmation_required', 'disputed', 'manual_review', 'unavailable')),
  conference_record_name TEXT,
  conference_started_at TIMESTAMPTZ,
  conference_ended_at TIMESTAMPTZ,
  distinct_participant_count INTEGER NOT NULL DEFAULT 0 CHECK (distinct_participant_count >= 0),
  max_concurrent_participants INTEGER NOT NULL DEFAULT 0 CHECK (max_concurrent_participants >= 0),
  qualifying_overlap_seconds INTEGER NOT NULL DEFAULT 0 CHECK (qualifying_overlap_seconds >= 0),
  check_attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (check_attempt_count >= 0),
  last_checked_at TIMESTAMPTZ,
  last_error_code TEXT,
  founder_response TEXT CHECK (founder_response IN ('happened', 'other_no_show', 'self_no_show', 'technical_issue')),
  founder_responded_at TIMESTAMPTZ,
  mentor_response TEXT CHECK (mentor_response IN ('happened', 'other_no_show', 'self_no_show', 'technical_issue')),
  mentor_responded_at TIMESTAMPTZ,
  confirmation_requested_at TIMESTAMPTZ,
  confirmation_reminder_sent_at TIMESTAMPTZ,
  pre_call_24h_sent_at TIMESTAMPTZ,
  pre_call_1h_sent_at TIMESTAMPTZ,
  manual_review_at TIMESTAMPTZ,
  resolution_source TEXT CHECK (resolution_source IN ('google_meet', 'dual_confirmation', 'admin')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discovery_call_attendance_evidence_review_idx
  ON public.discovery_call_attendance_evidence (verification_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.discovery_call_attendance_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_call_id UUID NOT NULL UNIQUE REFERENCES public.discovery_calls(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discovery_call_attendance_outbox_claim_idx
  ON public.discovery_call_attendance_outbox (next_attempt_at, created_at)
  WHERE status IN ('pending', 'processing');

ALTER TABLE public.discovery_call_attendance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_call_attendance_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discovery_call_attendance_evidence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.discovery_call_attendance_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.discovery_call_attendance_evidence TO service_role;
GRANT ALL ON public.discovery_call_attendance_outbox TO service_role;

DROP TRIGGER IF EXISTS discovery_call_attendance_evidence_updated_at ON public.discovery_call_attendance_evidence;
CREATE TRIGGER discovery_call_attendance_evidence_updated_at
  BEFORE UPDATE ON public.discovery_call_attendance_evidence
  FOR EACH ROW EXECUTE FUNCTION public.set_discovery_call_v2_updated_at();
DROP TRIGGER IF EXISTS discovery_call_attendance_outbox_updated_at ON public.discovery_call_attendance_outbox;
CREATE TRIGGER discovery_call_attendance_outbox_updated_at
  BEFORE UPDATE ON public.discovery_call_attendance_outbox
  FOR EACH ROW EXECUTE FUNCTION public.set_discovery_call_v2_updated_at();

-- Founder attendance responses use the same short-lived, hash-only token model
-- as mentor scheduling responses.
ALTER TABLE public.discovery_call_action_tokens DROP CONSTRAINT IF EXISTS discovery_call_action_tokens_purpose_check;
ALTER TABLE public.discovery_call_action_tokens ADD CONSTRAINT discovery_call_action_tokens_purpose_check
  CHECK (purpose IN ('mentor_request_response', 'mentor_booking_manage', 'founder_attendance_response', 'mentor_attendance_response'));
ALTER TABLE public.discovery_call_action_tokens DROP CONSTRAINT IF EXISTS discovery_call_action_tokens_recipient_role_check;
ALTER TABLE public.discovery_call_action_tokens ADD CONSTRAINT discovery_call_action_tokens_recipient_role_check
  CHECK (recipient_role IN ('founder', 'mentor'));

CREATE OR REPLACE FUNCTION public.seed_discovery_call_attendance_v5()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.workflow_version = 2 AND NEW.status = 'scheduled' AND OLD.status IS DISTINCT FROM 'scheduled' THEN
    INSERT INTO public.discovery_call_attendance_evidence (discovery_call_id)
    VALUES (NEW.id) ON CONFLICT (discovery_call_id) DO NOTHING;
  END IF;
  IF NEW.workflow_version = 2 AND NEW.status = 'awaiting_outcome' AND OLD.status IS DISTINCT FROM 'awaiting_outcome' THEN
    INSERT INTO public.discovery_call_attendance_evidence (discovery_call_id, verification_status)
    VALUES (NEW.id, 'pending')
    ON CONFLICT (discovery_call_id) DO UPDATE SET verification_status = CASE
      WHEN public.discovery_call_attendance_evidence.verification_status = 'pending' THEN 'pending'
      ELSE public.discovery_call_attendance_evidence.verification_status END;
    INSERT INTO public.discovery_call_attendance_outbox (discovery_call_id, next_attempt_at)
    VALUES (NEW.id, now() + interval '15 minutes')
    ON CONFLICT (discovery_call_id) DO UPDATE SET
      status = CASE WHEN public.discovery_call_attendance_outbox.status = 'succeeded' THEN 'succeeded' ELSE 'pending' END,
      next_attempt_at = LEAST(public.discovery_call_attendance_outbox.next_attempt_at, EXCLUDED.next_attempt_at),
      processing_started_at = NULL;
  END IF;
  -- Manual admin resolutions remain auditable without overwriting a stronger
  -- Google Meet or dual-confirmation resolution source.
  IF NEW.workflow_version = 2 AND NEW.status IN ('completed', 'founder_no_show', 'mentor_no_show')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.discovery_call_attendance_evidence SET
      verification_status = CASE
        WHEN resolution_source IS NOT NULL THEN verification_status
        WHEN NEW.status = 'completed' THEN 'verified_completed'
        ELSE 'manual_review' END,
      resolution_source = COALESCE(resolution_source, 'admin'),
      resolved_at = COALESCE(resolved_at, now())
    WHERE discovery_call_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discovery_call_attendance_state_seed_v5 ON public.discovery_calls;
CREATE TRIGGER discovery_call_attendance_state_seed_v5
  AFTER INSERT OR UPDATE OF status ON public.discovery_calls
  FOR EACH ROW EXECUTE FUNCTION public.seed_discovery_call_attendance_v5();

-- Existing scheduled calls should receive the same protections as calls created
-- after this migration is deployed.
INSERT INTO public.discovery_call_attendance_evidence (discovery_call_id)
SELECT id FROM public.discovery_calls
WHERE workflow_version = 2 AND status IN ('scheduled', 'awaiting_outcome')
ON CONFLICT (discovery_call_id) DO NOTHING;

INSERT INTO public.discovery_call_attendance_outbox (discovery_call_id, next_attempt_at)
SELECT id, now() + interval '15 minutes' FROM public.discovery_calls
WHERE workflow_version = 2 AND status = 'awaiting_outcome'
ON CONFLICT (discovery_call_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_discovery_call_attendance_jobs_v5(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.discovery_call_attendance_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.discovery_call_attendance_outbox
    WHERE (status = 'pending' AND next_attempt_at <= now())
      OR (status = 'processing' AND processing_started_at <= now() - interval '10 minutes')
    ORDER BY next_attempt_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100)
  )
  UPDATE public.discovery_call_attendance_outbox o
  SET status = 'processing', processing_started_at = now(), attempt_count = o.attempt_count + 1
  FROM candidates c WHERE c.id = o.id
  RETURNING o.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_discovery_call_attendance_job_v5(
  p_job_id UUID,
  p_conference_record_name TEXT,
  p_started_at TIMESTAMPTZ,
  p_ended_at TIMESTAMPTZ,
  p_participant_count INTEGER,
  p_max_concurrent INTEGER,
  p_overlap_seconds INTEGER,
  p_verified_completed BOOLEAN,
  p_shadow_mode BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_job public.discovery_call_attendance_outbox%ROWTYPE; v_call public.discovery_calls%ROWTYPE;
DECLARE v_admin UUID; v_result JSONB; v_event BIGINT; v_payload JSONB;
BEGIN
  SELECT * INTO v_job FROM public.discovery_call_attendance_outbox WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND'); END IF;
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = v_job.discovery_call_id FOR UPDATE;
  IF NOT FOUND OR v_call.status <> 'awaiting_outcome' THEN
    UPDATE public.discovery_call_attendance_outbox SET status = 'succeeded', completed_at = now(), processing_started_at = NULL WHERE id = p_job_id;
    RETURN jsonb_build_object('success', true, 'skipped', true);
  END IF;
  UPDATE public.discovery_call_attendance_evidence SET
    conference_record_name = p_conference_record_name,
    conference_started_at = p_started_at,
    conference_ended_at = p_ended_at,
    distinct_participant_count = GREATEST(0, COALESCE(p_participant_count, 0)),
    max_concurrent_participants = GREATEST(0, COALESCE(p_max_concurrent, 0)),
    qualifying_overlap_seconds = GREATEST(0, COALESCE(p_overlap_seconds, 0)),
    check_attempt_count = check_attempt_count + 1, last_checked_at = now(), last_error_code = NULL,
    verification_status = CASE WHEN p_verified_completed AND NOT p_shadow_mode THEN 'verified_completed' WHEN p_shadow_mode THEN 'checking' ELSE 'confirmation_required' END,
    confirmation_requested_at = CASE WHEN p_verified_completed OR p_shadow_mode THEN confirmation_requested_at ELSE COALESCE(confirmation_requested_at, now()) END,
    resolution_source = CASE WHEN p_verified_completed AND NOT p_shadow_mode THEN 'google_meet' ELSE resolution_source END,
    resolved_at = CASE WHEN p_verified_completed AND NOT p_shadow_mode THEN now() ELSE resolved_at END
  WHERE discovery_call_id = v_call.id;
  UPDATE public.discovery_call_attendance_outbox SET status = 'succeeded', completed_at = now(), processing_started_at = NULL, last_error = NULL WHERE id = p_job_id;
  IF p_shadow_mode THEN
    RETURN jsonb_build_object('success', true, 'shadowVerdict', p_verified_completed);
  END IF;
  IF p_verified_completed THEN
    SELECT id INTO v_admin FROM auth.users WHERE lower(email) = 'admin@creatives-takeover.com' LIMIT 1;
    IF v_admin IS NULL THEN RETURN jsonb_build_object('success', false, 'errorCode', 'ADMIN_NOT_FOUND'); END IF;
    v_result := public.admin_update_discovery_call_outcome_v4(v_call.id, v_admin, 'completed', 'Verified by Google Meet attendance telemetry.', NULL, NULL, NULL);
    v_payload := jsonb_build_object('callId', v_call.id, 'mentorName', v_call.mentor_name_snapshot,
      'scheduledFor', v_call.scheduled_for, 'durationMinutes', v_call.duration_minutes,
      'attendanceVerified', true);
    v_event := public.record_discovery_call_event_v2(v_call.id, 'attendance_verified', NULL, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'attendance_verified', 'founder', v_call.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'attendance_verified', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_call.id, 'attendance_verified', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    RETURN COALESCE(v_result, '{}'::jsonb) || jsonb_build_object('success', true, 'verifiedCompleted', true);
  END IF;
  RETURN jsonb_build_object('success', true, 'confirmationRequired', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_discovery_call_attendance_job_v5(p_job_id UUID, p_error TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_job public.discovery_call_attendance_outbox%ROWTYPE; v_terminal BOOLEAN;
BEGIN
  SELECT * INTO v_job FROM public.discovery_call_attendance_outbox WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND'); END IF;
  v_terminal := v_job.attempt_count >= v_job.max_attempts;
  UPDATE public.discovery_call_attendance_outbox SET
    status = CASE WHEN v_terminal THEN 'failed' ELSE 'pending' END,
    processing_started_at = NULL,
    next_attempt_at = CASE v_job.attempt_count WHEN 1 THEN now() + interval '45 minutes' WHEN 2 THEN now() + interval '5 hours' ELSE now() + interval '24 hours' END,
    last_error = left(COALESCE(p_error, 'Attendance verification failed'), 2000)
  WHERE id = p_job_id;
  UPDATE public.discovery_call_attendance_evidence SET
    check_attempt_count = check_attempt_count + 1, last_checked_at = now(), last_error_code = left(COALESCE(p_error, 'ATTENDANCE_CHECK_FAILED'), 120),
    verification_status = CASE WHEN v_terminal THEN 'unavailable' ELSE 'checking' END
  WHERE discovery_call_id = v_job.discovery_call_id;
  RETURN jsonb_build_object('success', true, 'terminal', v_terminal);
END;
$$;

CREATE OR REPLACE FUNCTION public.open_discovery_call_attendance_confirmation_v5(
  p_call_id UUID,
  p_founder_hash TEXT,
  p_mentor_hash TEXT,
  p_founder_ciphertext TEXT,
  p_mentor_ciphertext TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_call public.discovery_calls%ROWTYPE; v_event BIGINT; v_payload JSONB;
BEGIN
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  IF NOT FOUND OR v_call.status <> 'awaiting_outcome' THEN RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE'); END IF;
  UPDATE public.discovery_call_attendance_evidence SET verification_status = 'confirmation_required', confirmation_requested_at = COALESCE(confirmation_requested_at, now()) WHERE discovery_call_id = p_call_id;
  UPDATE public.discovery_call_action_tokens SET revoked_at = now()
  WHERE discovery_call_id = p_call_id AND purpose IN ('founder_attendance_response', 'mentor_attendance_response') AND revoked_at IS NULL;
  INSERT INTO public.discovery_call_action_tokens (discovery_call_id, purpose, recipient_role, token_hash, expires_at)
  VALUES
    (p_call_id, 'founder_attendance_response', 'founder', p_founder_hash, now() + interval '7 days'),
    (p_call_id, 'mentor_attendance_response', 'mentor', p_mentor_hash, now() + interval '7 days');
  v_payload := jsonb_build_object('callId', p_call_id, 'mentorName', v_call.mentor_name_snapshot, 'scheduledFor', v_call.scheduled_for, 'durationMinutes', v_call.duration_minutes, 'attendanceConfirmation', true);
  v_event := public.record_discovery_call_event_v2(p_call_id, 'attendance_confirmation_requested', NULL, v_payload);
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'attendance_confirmation_required', 'founder', v_call.founder_email_snapshot, v_payload, p_founder_ciphertext);
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'attendance_confirmation_required', 'mentor', v_call.mentor_contact_email_snapshot, v_payload, p_mentor_ciphertext);
  PERFORM public.enqueue_discovery_call_notification_v2(v_event, p_call_id, 'attendance_confirmation_required', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_discovery_call_attendance_response_v5(p_call_id UUID, p_role TEXT, p_response TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_evidence public.discovery_call_attendance_evidence%ROWTYPE; v_call public.discovery_calls%ROWTYPE; v_admin UUID; v_action TEXT; v_result JSONB;
BEGIN
  IF p_role NOT IN ('founder', 'mentor') OR p_response NOT IN ('happened', 'other_no_show', 'self_no_show', 'technical_issue') THEN RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_REQUEST'); END IF;
  SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
  SELECT * INTO v_evidence FROM public.discovery_call_attendance_evidence WHERE discovery_call_id = p_call_id FOR UPDATE;
  IF NOT FOUND OR v_call.status <> 'awaiting_outcome' THEN RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE'); END IF;
  UPDATE public.discovery_call_attendance_evidence SET
    founder_response = CASE WHEN p_role = 'founder' THEN p_response ELSE founder_response END,
    founder_responded_at = CASE WHEN p_role = 'founder' THEN now() ELSE founder_responded_at END,
    mentor_response = CASE WHEN p_role = 'mentor' THEN p_response ELSE mentor_response END,
    mentor_responded_at = CASE WHEN p_role = 'mentor' THEN now() ELSE mentor_responded_at END
  WHERE discovery_call_id = p_call_id
  RETURNING * INTO v_evidence;
  IF v_evidence.founder_response = 'happened' AND v_evidence.mentor_response = 'happened' THEN v_action := 'completed';
  ELSIF v_evidence.founder_response = 'other_no_show' AND v_evidence.mentor_response = 'self_no_show' THEN v_action := 'mentor_no_show';
  ELSIF v_evidence.mentor_response = 'other_no_show' AND v_evidence.founder_response = 'self_no_show' THEN v_action := 'founder_no_show';
  ELSIF v_evidence.founder_response IS NOT NULL AND v_evidence.mentor_response IS NOT NULL THEN
    UPDATE public.discovery_call_attendance_evidence SET verification_status = 'disputed', manual_review_at = now() WHERE discovery_call_id = p_call_id;
    RETURN jsonb_build_object('success', true, 'manualReview', true);
  ELSE
    RETURN jsonb_build_object('success', true, 'awaitingOtherResponse', true);
  END IF;
  SELECT id INTO v_admin FROM auth.users WHERE lower(email) = 'admin@creatives-takeover.com' LIMIT 1;
  IF v_admin IS NULL THEN RETURN jsonb_build_object('success', false, 'errorCode', 'ADMIN_NOT_FOUND'); END IF;
  v_result := public.admin_update_discovery_call_outcome_v4(p_call_id, v_admin, v_action, 'Outcome confirmed by both Discovery Call participants.', NULL, NULL, NULL);
  UPDATE public.discovery_call_attendance_evidence SET verification_status = CASE WHEN v_action = 'completed' THEN 'verified_completed' ELSE 'manual_review' END, resolution_source = 'dual_confirmation', resolved_at = now() WHERE discovery_call_id = p_call_id;
  UPDATE public.discovery_call_action_tokens SET revoked_at = now() WHERE discovery_call_id = p_call_id AND purpose IN ('founder_attendance_response', 'mentor_attendance_response') AND revoked_at IS NULL;
  RETURN COALESCE(v_result, '{}'::jsonb) || jsonb_build_object('success', true, 'resolved', v_action);
END;
$$;

CREATE OR REPLACE FUNCTION public.escalate_discovery_call_attendance_reviews_v5()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row RECORD; v_event BIGINT; v_payload JSONB; v_escalated INTEGER := 0;
BEGIN
  FOR v_row IN SELECT e.*, dc.mentor_name_snapshot, dc.founder_email_snapshot, dc.mentor_contact_email_snapshot, dc.scheduled_for, dc.duration_minutes
    FROM public.discovery_call_attendance_evidence e JOIN public.discovery_calls dc ON dc.id = e.discovery_call_id
    WHERE dc.status = 'awaiting_outcome' AND e.verification_status = 'confirmation_required'
      AND e.confirmation_requested_at <= now() - interval '48 hours' AND e.manual_review_at IS NULL
    FOR UPDATE OF e SKIP LOCKED
  LOOP
    UPDATE public.discovery_call_attendance_evidence SET verification_status = 'manual_review', manual_review_at = now() WHERE id = v_row.id;
    v_payload := jsonb_build_object('callId', v_row.discovery_call_id, 'mentorName', v_row.mentor_name_snapshot, 'scheduledFor', v_row.scheduled_for, 'durationMinutes', v_row.duration_minutes, 'attendanceReview', true);
    v_event := public.record_discovery_call_event_v2(v_row.discovery_call_id, 'attendance_manual_review_required', NULL, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_row.discovery_call_id, 'attendance_manual_review_required', 'admin', 'admin@creatives-takeover.com', v_payload, NULL);
    v_escalated := v_escalated + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'escalated', v_escalated);
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_discovery_call_attendance_reminders_v5()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row RECORD; v_event BIGINT; v_payload JSONB; v_queued INTEGER := 0;
BEGIN
  -- The condition is deliberately <= rather than a narrow clock window: the
  -- evidence timestamp makes retries idempotent when cron is delayed.
  FOR v_row IN
    SELECT dc.*, e.id AS evidence_id, 'call_reminder_24h'::TEXT AS template_key
    FROM public.discovery_calls dc
    JOIN public.discovery_call_attendance_evidence e ON e.discovery_call_id = dc.id
    WHERE dc.workflow_version = 2 AND dc.status = 'scheduled'
      AND dc.scheduled_for > now() AND dc.scheduled_for <= now() + interval '24 hours'
      AND e.pre_call_24h_sent_at IS NULL
    UNION ALL
    SELECT dc.*, e.id AS evidence_id, 'call_reminder_1h'::TEXT AS template_key
    FROM public.discovery_calls dc
    JOIN public.discovery_call_attendance_evidence e ON e.discovery_call_id = dc.id
    WHERE dc.workflow_version = 2 AND dc.status = 'scheduled'
      AND dc.scheduled_for > now() AND dc.scheduled_for <= now() + interval '1 hour'
      AND e.pre_call_1h_sent_at IS NULL
  LOOP
    IF v_row.template_key = 'call_reminder_24h' THEN
      UPDATE public.discovery_call_attendance_evidence SET pre_call_24h_sent_at = now()
      WHERE id = v_row.evidence_id AND pre_call_24h_sent_at IS NULL;
    ELSE
      UPDATE public.discovery_call_attendance_evidence SET pre_call_1h_sent_at = now()
      WHERE id = v_row.evidence_id AND pre_call_1h_sent_at IS NULL;
    END IF;
    IF NOT FOUND THEN CONTINUE; END IF;
    v_payload := jsonb_build_object('callId', v_row.id, 'mentorName', v_row.mentor_name_snapshot,
      'scheduledFor', v_row.scheduled_for, 'durationMinutes', v_row.duration_minutes,
      'meetingUrl', v_row.meeting_url, 'meetingInstructions', v_row.meeting_instructions,
      'calendarManagedExternally', true);
    v_event := public.record_discovery_call_event_v2(v_row.id, v_row.template_key, NULL, v_payload);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_row.id, v_row.template_key, 'founder', v_row.founder_email_snapshot, v_payload, NULL);
    PERFORM public.enqueue_discovery_call_notification_v2(v_event, v_row.id, v_row.template_key, 'mentor', v_row.mentor_contact_email_snapshot, v_payload, NULL);
    v_queued := v_queued + 2;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'queued', v_queued);
END;
$$;

CREATE OR REPLACE FUNCTION public.retry_discovery_call_attendance_job_v5(p_job_id UUID, p_admin_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin BOOLEAN; v_call_id UUID;
BEGIN
  SELECT public.is_discovery_call_admin_v2(p_admin_user_id) INTO v_admin;
  IF NOT COALESCE(v_admin, false) THEN RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN'); END IF;
  SELECT discovery_call_id INTO v_call_id FROM public.discovery_call_attendance_outbox WHERE id = p_job_id FOR UPDATE;
  IF v_call_id IS NULL THEN RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND'); END IF;
  UPDATE public.discovery_call_attendance_outbox
  SET status = 'pending', attempt_count = 0, next_attempt_at = now(), processing_started_at = NULL, completed_at = NULL, last_error = NULL
  WHERE id = p_job_id;
  UPDATE public.discovery_call_attendance_evidence
  SET verification_status = 'pending', last_error_code = NULL, manual_review_at = NULL
  WHERE discovery_call_id = v_call_id AND verification_status IN ('unavailable', 'manual_review', 'confirmation_required');
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_discovery_call_attendance_jobs_v5(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_discovery_call_attendance_job_v5(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_discovery_call_attendance_job_v5(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.open_discovery_call_attendance_confirmation_v5(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_discovery_call_attendance_response_v5(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.escalate_discovery_call_attendance_reviews_v5() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_discovery_call_attendance_reminders_v5() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.retry_discovery_call_attendance_job_v5(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_discovery_call_attendance_jobs_v5(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_discovery_call_attendance_job_v5(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_discovery_call_attendance_job_v5(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.open_discovery_call_attendance_confirmation_v5(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_discovery_call_attendance_response_v5(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.escalate_discovery_call_attendance_reviews_v5() TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_discovery_call_attendance_reminders_v5() TO service_role;
GRANT EXECUTE ON FUNCTION public.retry_discovery_call_attendance_job_v5(UUID, UUID) TO service_role;
