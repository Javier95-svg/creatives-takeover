-- Founder-readable call rows and events must not contain private admin notes.
CREATE TABLE public.discovery_call_outcomes (
  discovery_call_id UUID PRIMARY KEY REFERENCES public.discovery_calls(id) ON DELETE CASCADE,
  agreement TEXT CHECK (agreement IS NULL OR agreement IN ('yes', 'no', 'undecided', 'unknown')),
  summary TEXT NOT NULL CHECK (length(btrim(summary)) BETWEEN 10 AND 2000),
  next_step TEXT,
  evidence_source TEXT NOT NULL CHECK (evidence_source IN ('founder', 'mentor', 'both', 'admin')),
  recorded_by UUID NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discovery_call_outcomes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discovery_call_outcomes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.discovery_call_outcomes TO service_role;

CREATE OR REPLACE FUNCTION public.admin_update_discovery_call_outcome_v5(
  p_call_id UUID,
  p_admin_user_id UUID,
  p_action TEXT,
  p_reason TEXT,
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL,
  p_meeting_url TEXT DEFAULT NULL,
  p_meeting_instructions TEXT DEFAULT NULL,
  p_agreement TEXT DEFAULT NULL,
  p_next_step TEXT DEFAULT NULL,
  p_evidence_source TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_call public.discovery_calls%ROWTYPE; v_result JSONB;
BEGIN
  IF NOT public.is_discovery_call_admin(p_admin_user_id) THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'FORBIDDEN');
  END IF;

  IF p_action IN ('completed', 'founder_no_show', 'mentor_no_show', 'record_agreement') THEN
    SELECT * INTO v_call FROM public.discovery_calls WHERE id = p_call_id FOR UPDATE;
    IF NOT FOUND OR v_call.workflow_version <> 2 THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'NOT_FOUND');
    END IF;
    IF ((p_action = 'record_agreement' AND v_call.status <> 'completed')
        OR (p_action <> 'record_agreement' AND v_call.status NOT IN ('scheduled', 'awaiting_outcome')))
       OR v_call.scheduled_for IS NULL
       OR v_call.scheduled_for + make_interval(mins => v_call.duration_minutes) > now() THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'OUTCOME_NOT_DUE');
    END IF;
    IF length(btrim(COALESCE(p_reason, ''))) NOT BETWEEN 10 AND 2000
       OR p_evidence_source IS NULL
       OR p_evidence_source NOT IN ('founder', 'mentor', 'both', 'admin') THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'OUTCOME_DETAILS_REQUIRED');
    END IF;
    IF p_action IN ('completed', 'record_agreement')
       AND (p_agreement IS NULL OR p_agreement NOT IN ('yes', 'no', 'undecided', 'unknown')) THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'AGREEMENT_REQUIRED');
    END IF;
    IF length(COALESCE(p_next_step, '')) > 2000 THEN
      RETURN jsonb_build_object('success', false, 'errorCode', 'OUTCOME_DETAILS_REQUIRED');
    END IF;
  END IF;

  IF p_action = 'record_agreement' THEN
    v_result := jsonb_build_object('success', true, 'callId', p_call_id, 'action', p_action);
  ELSE
    v_result := public.admin_update_discovery_call_outcome_v4(
      p_call_id, p_admin_user_id, p_action,
      CASE WHEN p_action IN ('completed', 'founder_no_show', 'mentor_no_show')
        THEN 'Post-call outcome recorded' ELSE p_reason END,
      p_scheduled_for, p_meeting_url, p_meeting_instructions
    );
  END IF;
  IF COALESCE((v_result ->> 'success')::boolean, false)
     AND p_action IN ('completed', 'founder_no_show', 'mentor_no_show', 'record_agreement') THEN
    INSERT INTO public.discovery_call_outcomes (
      discovery_call_id, agreement, summary, next_step, evidence_source, recorded_by
    ) VALUES (
      p_call_id, CASE WHEN p_action IN ('completed', 'record_agreement') THEN p_agreement ELSE NULL END,
      btrim(p_reason), NULLIF(btrim(COALESCE(p_next_step, '')), ''), p_evidence_source, p_admin_user_id
    ) ON CONFLICT (discovery_call_id) DO UPDATE
      SET agreement = EXCLUDED.agreement,
          summary = EXCLUDED.summary,
          next_step = EXCLUDED.next_step,
          evidence_source = EXCLUDED.evidence_source,
          recorded_by = EXCLUDED.recorded_by,
          recorded_at = now();
    PERFORM public.record_discovery_call_event_v2(
      p_call_id, 'outcome_details_recorded', p_admin_user_id,
      jsonb_build_object('action', p_action)
    );
  END IF;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_discovery_call_outcome_v5(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_discovery_call_outcome_v5(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;
