CREATE OR REPLACE FUNCTION public.admin_update_discovery_call_outcome_v4(
  p_call_id UUID,
  p_admin_user_id UUID,
  p_action TEXT,
  p_reason TEXT,
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL,
  p_meeting_url TEXT DEFAULT NULL,
  p_meeting_instructions TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result JSONB; v_call public.discovery_calls%ROWTYPE;
BEGIN
  IF p_action IN ('cancel_refund', 'cancel_no_refund') THEN
    RETURN public.cancel_discovery_call_v4(p_call_id, p_admin_user_id, 'admin', p_reason, p_action = 'cancel_refund');
  END IF;
  v_result := public.admin_update_discovery_call_outcome_v2(
    p_call_id, p_admin_user_id, p_action, p_reason,
    p_scheduled_for, p_meeting_url, p_meeting_instructions
  );
  IF COALESCE((v_result ->> 'success')::boolean, false) AND p_action = 'correct_booking' THEN
    SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id;
    UPDATE public.discovery_call_slot_reservations
    SET starts_at = v_call.scheduled_for,
        ends_at = v_call.scheduled_for + make_interval(mins => v_call.duration_minutes),
        status = 'confirmed'
    WHERE discovery_call_id = p_call_id;
    IF v_call.external_calendar_event_id IS NOT NULL THEN
      PERFORM public.enqueue_discovery_call_calendar_operation_v4(p_call_id, 'update', NULL);
      UPDATE public.discovery_call_notification_outbox
      SET payload = payload || jsonb_build_object(
        'calendarManagedExternally', true,
        'externalCalendarEventId', v_call.external_calendar_event_id
      )
      WHERE discovery_call_id = p_call_id
        AND template_key = 'reschedule_confirmed' AND status = 'pending';
    END IF;
  END IF;
  RETURN v_result;
EXCEPTION WHEN exclusion_violation THEN
  RETURN jsonb_build_object('success', false, 'errorCode', 'SLOT_UNAVAILABLE');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_discovery_call_outcome_v4(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_discovery_call_outcome_v4(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.retry_discovery_call_calendar_job_v4(
  p_job_id UUID,
  p_admin_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_call_id UUID;
BEGIN
  IF NOT public.is_discovery_call_admin(p_admin_user_id) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN');
  END IF;
  UPDATE public.discovery_call_calendar_outbox
  SET status = 'pending', next_attempt_at = now(), processing_started_at = NULL,
      completed_at = NULL, last_error = NULL, max_attempts = GREATEST(max_attempts, attempt_count + 3)
  WHERE id = p_job_id AND status IN ('failed', 'pending')
  RETURNING discovery_call_id INTO v_call_id;
  IF v_call_id IS NULL THEN RETURN jsonb_build_object('success', false, 'errorCode', 'STALE_STATE'); END IF;
  UPDATE public.discovery_calls SET meeting_creation_status = CASE
    WHEN status = 'pending_meeting_creation' THEN 'pending' ELSE meeting_creation_status END,
    calendar_error = NULL, calendar_generation_due_at = CASE
      WHEN status = 'pending_meeting_creation' THEN now() + interval '60 minutes' ELSE calendar_generation_due_at END
  WHERE id = v_call_id;
  UPDATE public.discovery_call_notification_alerts SET status = 'resolved', resolved_at = now()
  WHERE discovery_call_id = v_call_id AND alert_type = 'calendar_operation_failed' AND status = 'open';
  RETURN jsonb_build_object('success', true, 'callId', v_call_id);
END;
$$;

REVOKE ALL ON FUNCTION public.retry_discovery_call_calendar_job_v4(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retry_discovery_call_calendar_job_v4(UUID, UUID) TO service_role;

CREATE OR REPLACE VIEW public.admin_discovery_call_workflow_health AS
SELECT 'overdue_round' AS issue, r.discovery_call_id, r.id::text AS detail_id, r.response_due_at AS detected_at
FROM public.discovery_call_scheduling_rounds r WHERE r.status = 'pending' AND r.response_due_at < now()
UNION ALL
SELECT 'expired_hold', discovery_call_id, id::text, expires_at
FROM public.discovery_call_credit_reservations WHERE status = 'pending' AND expires_at < now()
UNION ALL
SELECT 'meeting_creation_overdue', id, COALESCE(external_calendar_event_id, meeting_creation_status), calendar_generation_due_at
FROM public.discovery_calls
WHERE workflow_version = 2 AND status = 'pending_meeting_creation' AND calendar_generation_due_at < now()
UNION ALL
SELECT 'calendar_operation_failed', discovery_call_id, id::text || ':' || operation, updated_at
FROM public.discovery_call_calendar_outbox WHERE status = 'failed'
UNION ALL
SELECT 'scheduled_without_google_meet', id, COALESCE(external_calendar_event_id, 'missing-event'), confirmed_at
FROM public.discovery_calls
WHERE workflow_version = 2 AND status IN ('scheduled', 'awaiting_outcome')
  AND meeting_provider = 'google_meet'
  AND (COALESCE(meeting_url, '') !~* '^https://meet\.google\.com/' OR external_calendar_event_id IS NULL)
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
       id::text || ':' || provider_delivery_status, COALESCE(provider_event_at, updated_at)
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
