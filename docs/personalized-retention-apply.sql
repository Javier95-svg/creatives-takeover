-- Paste this entire file into the CT project's Supabase SQL editor and Run.
-- Repeatable: preserves campaign history and experiment assignments.
-- Delivery is explicitly disabled at the end. This does not deploy Edge functions.
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.retention_email_log') IS NULL
    OR to_regclass('public.profiles') IS NULL
    OR to_regclass('public.mentors') IS NULL
    OR to_regprocedure('public.notif_pref_enabled(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'CT base schema is missing. Apply the existing project migrations before this retention upgrade.';
  END IF;
END;
$$;
ALTER TABLE public.retention_email_log
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribed boolean DEFAULT false;
-- Human-written, stateful inactive-user retention email delivery.
--
-- This migration keeps the existing schedule ceilings, adds an atomic claim so
-- overlapping workers cannot double-send, records the exact copy version used,
-- and pauses the campaign after three unanswered touches.

ALTER TABLE public.retention_email_log
  ADD COLUMN IF NOT EXISTS campaign_key text,
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS template_version integer,
  ADD COLUMN IF NOT EXISTS touch_index integer,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS send_error text,
  ADD COLUMN IF NOT EXISTS bounced_at timestamptz,
  ADD COLUMN IF NOT EXISTS complained_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'retention_email_log_delivery_status_check'
  ) THEN
    ALTER TABLE public.retention_email_log
      ADD CONSTRAINT retention_email_log_delivery_status_check
      CHECK (delivery_status IN ('pending', 'sent', 'failed'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS retention_email_log_campaign_user_sent_idx
  ON public.retention_email_log (campaign_key, user_id, sent_at DESC)
  WHERE campaign_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS retention_email_log_template_sent_idx
  ON public.retention_email_log (template_key, sent_at DESC)
  WHERE template_key IS NOT NULL AND delivery_status = 'sent';

CREATE TABLE IF NOT EXISTS public.retention_campaign_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_key text NOT NULL,
  touch_index integer NOT NULL DEFAULT 0 CHECK (touch_index BETWEEN 0 AND 4),
  last_sent_at timestamptz,
  paused_until timestamptz,
  exhausted_at timestamptz,
  last_returned_at timestamptz,
  pending_log_id uuid REFERENCES public.retention_email_log(id) ON DELETE SET NULL,
  claim_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, campaign_key)
);

ALTER TABLE public.retention_campaign_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.retention_campaign_state FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.retention_campaign_state TO service_role;

COMMENT ON TABLE public.retention_campaign_state IS
  'Service-role-only state for deterministic inactive-user email progression and pause enforcement.';

CREATE OR REPLACE FUNCTION public.claim_inactive_retention_email(
  p_user_id uuid,
  p_email text,
  p_sequence text,
  p_campaign_key text DEFAULT 'inactive_return'
)
RETURNS TABLE (
  claim_status text,
  claimed_log_id uuid,
  claimed_touch_index integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state public.retention_campaign_state%ROWTYPE;
  v_log_id uuid;
  v_touch integer;
  v_recent_interval interval;
BEGIN
  IF p_user_id IS NULL OR NULLIF(trim(p_email), '') IS NULL THEN
    RETURN QUERY SELECT 'invalid_request'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF p_sequence NOT IN (
    'routine_reminder',
    'activation_day7',
    'weekly_digest',
    'reengagement',
    'reengagement_30d',
    'reengagement_60d'
  ) THEN
    RETURN QUERY SELECT 'not_inactive_sequence'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.mentors m WHERE m.user_id = p_user_id) THEN
    RETURN QUERY SELECT 'mentor_excluded'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.retention_email_log l
    WHERE l.user_id = p_user_id AND l.unsubscribed IS TRUE
  ) THEN
    RETURN QUERY SELECT 'unsubscribed'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF NOT public.notif_pref_enabled(
    p_user_id,
    CASE WHEN p_sequence = 'routine_reminder' THEN 'routine_reminders' ELSE 'retention_emails' END
  ) THEN
    RETURN QUERY SELECT 'preference_disabled'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  INSERT INTO public.retention_campaign_state (user_id, campaign_key)
  VALUES (p_user_id, p_campaign_key)
  ON CONFLICT (user_id, campaign_key) DO NOTHING;

  SELECT * INTO v_state
  FROM public.retention_campaign_state
  WHERE user_id = p_user_id AND campaign_key = p_campaign_key
  FOR UPDATE;

  IF v_state.pending_log_id IS NOT NULL AND v_state.claim_expires_at > now() THEN
    RETURN QUERY SELECT 'claim_in_progress'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF v_state.pending_log_id IS NOT NULL THEN
    UPDATE public.retention_email_log
    SET delivery_status = 'failed', send_error = COALESCE(send_error, 'claim_expired')
    WHERE id = v_state.pending_log_id AND delivery_status = 'pending';

    UPDATE public.retention_campaign_state
    SET pending_log_id = NULL, claim_expires_at = NULL, updated_at = now()
    WHERE user_id = p_user_id AND campaign_key = p_campaign_key;
  END IF;

  -- An organic platform return is also a successful reset, even when it did
  -- not arrive through the attributed email CTA.
  IF v_state.last_sent_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id
      AND GREATEST(
        COALESCE(p.last_activity_at, '-infinity'::timestamptz),
        COALESCE(p.last_seen_at, '-infinity'::timestamptz),
        COALESCE(p.last_active_at, '-infinity'::timestamptz)
      ) > v_state.last_sent_at
  ) THEN
    UPDATE public.retention_campaign_state
    SET touch_index = 0,
        paused_until = NULL,
        exhausted_at = NULL,
        last_returned_at = GREATEST(
          COALESCE(last_returned_at, '-infinity'::timestamptz),
          now()
        ),
        updated_at = now()
    WHERE user_id = p_user_id AND campaign_key = p_campaign_key;

    v_state.touch_index := 0;
    v_state.paused_until := NULL;
    v_state.exhausted_at := NULL;
    v_state.last_sent_at := NULL;
  END IF;

  IF v_state.exhausted_at IS NOT NULL THEN
    RETURN QUERY SELECT 'campaign_exhausted'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF v_state.paused_until IS NOT NULL AND v_state.paused_until > now() THEN
    RETURN QUERY SELECT 'campaign_paused'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  -- Never send two inactive messages closer together than the fastest existing
  -- routine-reminder window, even when different workers fire together.
  IF v_state.last_sent_at IS NOT NULL AND v_state.last_sent_at >= now() - interval '3 days' THEN
    RETURN QUERY SELECT 'campaign_sent_recently'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  v_recent_interval := CASE
    WHEN p_sequence = 'routine_reminder' THEN interval '3 days'
    ELSE interval '6 days'
  END;

  IF EXISTS (
    SELECT 1 FROM public.retention_email_log l
    WHERE l.user_id = p_user_id
      AND l.sequence = p_sequence
      AND l.delivery_status IN ('pending', 'sent')
      AND l.sent_at >= now() - v_recent_interval
  ) THEN
    RETURN QUERY SELECT 'sequence_sent_recently'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF (
    SELECT count(*) FROM public.retention_email_log l
    WHERE l.user_id = p_user_id
      AND l.delivery_status IN ('pending', 'sent')
      AND l.sent_at >= now() - interval '7 days'
  ) >= 3 THEN
    RETURN QUERY SELECT 'weekly_cap_reached'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  v_touch := CASE
    WHEN v_state.touch_index < 3 THEN v_state.touch_index + 1
    WHEN v_state.touch_index = 3 AND COALESCE(v_state.paused_until, '-infinity'::timestamptz) <= now() THEN 4
    ELSE NULL
  END;

  IF v_touch IS NULL THEN
    RETURN QUERY SELECT 'campaign_exhausted'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  v_log_id := gen_random_uuid();

  INSERT INTO public.retention_email_log (
    id, user_id, email, sequence, sent_at, campaign_key, touch_index, delivery_status
  ) VALUES (
    v_log_id, p_user_id, lower(trim(p_email)), p_sequence, now(), p_campaign_key, v_touch, 'pending'
  );

  UPDATE public.retention_campaign_state
  SET pending_log_id = v_log_id,
      claim_expires_at = now() + interval '15 minutes',
      updated_at = now()
  WHERE user_id = p_user_id AND campaign_key = p_campaign_key;

  RETURN QUERY SELECT 'claimed'::text, v_log_id, v_touch;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_inactive_retention_email(
  p_log_id uuid,
  p_template_key text,
  p_template_version integer,
  p_cta_url text,
  p_resend_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log public.retention_email_log%ROWTYPE;
BEGIN
  SELECT * INTO v_log
  FROM public.retention_email_log
  WHERE id = p_log_id AND delivery_status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE public.retention_email_log
  SET template_key = p_template_key,
      template_version = p_template_version,
      cta_url = p_cta_url,
      resend_id = p_resend_id,
      delivery_status = 'sent',
      send_error = NULL,
      sent_at = now()
  WHERE id = p_log_id;

  UPDATE public.retention_campaign_state
  SET touch_index = v_log.touch_index,
      last_sent_at = now(),
      paused_until = CASE WHEN v_log.touch_index = 3 THEN now() + interval '60 days' ELSE paused_until END,
      exhausted_at = CASE WHEN v_log.touch_index = 4 THEN now() ELSE exhausted_at END,
      pending_log_id = NULL,
      claim_expires_at = NULL,
      updated_at = now()
  WHERE user_id = v_log.user_id
    AND campaign_key = v_log.campaign_key
    AND pending_log_id = p_log_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_inactive_retention_email(
  p_log_id uuid,
  p_error text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log public.retention_email_log%ROWTYPE;
BEGIN
  SELECT * INTO v_log
  FROM public.retention_email_log
  WHERE id = p_log_id AND delivery_status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE public.retention_email_log
  SET delivery_status = 'failed', send_error = left(COALESCE(p_error, 'send_failed'), 500)
  WHERE id = p_log_id;

  UPDATE public.retention_campaign_state
  SET pending_log_id = NULL, claim_expires_at = NULL, updated_at = now()
  WHERE user_id = v_log.user_id
    AND campaign_key = v_log.campaign_key
    AND pending_log_id = p_log_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_retention_email_return(p_log_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_campaign_key text;
BEGIN
  IF v_user_id IS NULL OR p_log_id IS NULL THEN RETURN false; END IF;

  UPDATE public.retention_email_log
  SET returned_at = COALESCE(returned_at, now())
  WHERE id = p_log_id
    AND user_id = v_user_id
    AND delivery_status = 'sent'
  RETURNING campaign_key INTO v_campaign_key;

  IF NOT FOUND THEN RETURN false; END IF;

  IF v_campaign_key IS NOT NULL THEN
    UPDATE public.retention_campaign_state
    SET touch_index = 0,
        paused_until = NULL,
        exhausted_at = NULL,
        last_returned_at = now(),
        pending_log_id = NULL,
        claim_expires_at = NULL,
        updated_at = now()
    WHERE user_id = v_user_id AND campaign_key = v_campaign_key;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_inactive_retention_email(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_inactive_retention_email(uuid, text, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_inactive_retention_email(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_retention_email_return(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_inactive_retention_email(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_inactive_retention_email(uuid, text, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_inactive_retention_email(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_retention_email_return(uuid) TO authenticated, service_role;


-- Additive rollout. Keep delivery disabled until production coverage is reviewed.
CREATE TABLE IF NOT EXISTS public.retention_roadmap_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  tracking_started_at timestamptz NOT NULL DEFAULT now(),
  unavailable_tools text[] NOT NULL DEFAULT '{}'
);
INSERT INTO public.retention_roadmap_settings(singleton) VALUES (true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.retention_roadmap_experiments (
  segment text PRIMARY KEY CHECK (segment IN ('quiz_only','unfinished_tool','completed_stage','dormant')),
  phase text NOT NULL DEFAULT 'subject' CHECK (phase IN ('subject','body')),
  selected_subject integer NOT NULL DEFAULT 0 CHECK (selected_subject BETWEEN 0 AND 3),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
INSERT INTO public.retention_roadmap_experiments(segment) VALUES ('quiz_only'),('unfinished_tool'),('completed_stage'),('dormant') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.retention_tool_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool text NOT NULL,
  project_id text,
  status text NOT NULL CHECK (status IN ('opened','progress','completed')),
  step text,
  path text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retention_tool_activity_user_time ON public.retention_tool_activity(user_id, occurred_at DESC);
CREATE TABLE IF NOT EXISTS public.retention_user_activity (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  marketplace_visited_at timestamptz,
  expert_support_visited_at timestamptz
);
ALTER TABLE public.retention_email_log
  ADD COLUMN IF NOT EXISTS segment text,
  ADD COLUMN IF NOT EXISTS experiment_phase text,
  ADD COLUMN IF NOT EXISTS experiment_version integer,
  ADD COLUMN IF NOT EXISTS subject_variant integer,
  ADD COLUMN IF NOT EXISTS body_variant integer,
  ADD COLUMN IF NOT EXISTS context_version integer,
  ADD COLUMN IF NOT EXISTS reactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS cta_returned_at timestamptz;
ALTER TABLE public.retention_roadmap_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_roadmap_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_tool_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_user_activity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.retention_roadmap_settings, public.retention_roadmap_experiments, public.retention_tool_activity, public.retention_user_activity FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.retention_roadmap_settings, public.retention_roadmap_experiments, public.retention_tool_activity, public.retention_user_activity TO service_role;

CREATE OR REPLACE FUNCTION public.record_roadmap_activity(
  p_path text, p_tool text DEFAULT NULL, p_status text DEFAULT NULL,
  p_project_id text DEFAULT NULL, p_step text DEFAULT NULL, p_email_id uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_return boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_path IS NULL OR p_path !~ '^/[^/]' OR length(p_path) > 1000 OR position(chr(92) in p_path)>0 THEN RETURN; END IF;
  IF p_tool IS NOT NULL AND p_tool NOT IN ('icp_builder','demo_studio','pmf_lab','mvp_builder','gtm_strategist','traction_engine','insighta_test','pitch_deck_analyzer','vc_search','tech_stack','first_customer_sprint','directories','accelerator_hunt','email_templates') THEN RETURN; END IF;
  INSERT INTO public.retention_user_activity(user_id,last_activity_at,marketplace_visited_at,expert_support_visited_at)
    VALUES(v_user,now(),CASE WHEN p_path ~ '^/marketplace(/|[?]|$)' THEN now() END,CASE WHEN p_path ~ '^/mentorship(/|[?]|$)' THEN now() END)
  ON CONFLICT(user_id) DO UPDATE SET last_activity_at=now(),
    marketplace_visited_at=COALESCE(EXCLUDED.marketplace_visited_at,retention_user_activity.marketplace_visited_at),
    expert_support_visited_at=COALESCE(EXCLUDED.expert_support_visited_at,retention_user_activity.expert_support_visited_at);
  IF p_tool IS NOT NULL AND p_status IN ('opened','progress','completed') THEN
    INSERT INTO public.retention_tool_activity(user_id,tool,project_id,status,step,path)
      VALUES(v_user,p_tool,left(p_project_id,150),p_status,left(p_step,100),p_path);
  END IF;
  v_return := p_path ~ '^/(dashboard|icp-builder|icp/draft|demo-studio|pmf-lab|mvp-builder|go-to-market|traction-engine|insighta-test|pitch-deck-analyzer|vc-search|tech-stack)(/|[?]|$)';
  IF v_return THEN
    UPDATE public.retention_email_log SET reactivated_at=COALESCE(reactivated_at,now()),
      cta_returned_at=CASE WHEN id=p_email_id THEN COALESCE(cta_returned_at,now()) ELSE cta_returned_at END
    WHERE user_id=v_user AND campaign_key='inactive_return' AND delivery_status='sent'
      AND sent_at <= now() AND sent_at >= now()-interval '48 hours';
  END IF;
  -- Do not clear pending claims or the send timestamp on a return.
  UPDATE public.retention_campaign_state SET touch_index=0,paused_until=NULL,exhausted_at=NULL,
    last_returned_at=now(),updated_at=now()
    WHERE user_id=v_user AND campaign_key='inactive_return' AND pending_log_id IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.record_roadmap_activity(text,text,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_roadmap_activity(text,text,text,text,text,uuid) TO authenticated;

-- Preserve the first provider observation when retries arrive out of order.
CREATE OR REPLACE FUNCTION public.preserve_retention_first_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.opened_at := LEAST(OLD.opened_at,NEW.opened_at);
  NEW.clicked_at := LEAST(OLD.clicked_at,NEW.clicked_at);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS retention_first_event ON public.retention_email_log;
CREATE TRIGGER retention_first_event BEFORE UPDATE OF opened_at,clicked_at ON public.retention_email_log
  FOR EACH ROW EXECUTE FUNCTION public.preserve_retention_first_event();

CREATE OR REPLACE VIEW public.retention_roadmap_report WITH (security_invoker=true) AS
WITH counts AS (
  SELECT segment,experiment_phase,experiment_version,subject_variant,body_variant,
    count(*) AS sent,
    count(*) FILTER (WHERE sent_at <= now()-interval '48 hours') AS mature_sends,
    count(*) FILTER (WHERE opened_at BETWEEN sent_at AND sent_at+interval '48 hours' AND sent_at <= now()-interval '48 hours') AS opens_48h,
    count(*) FILTER (WHERE clicked_at BETWEEN sent_at AND sent_at+interval '48 hours' AND sent_at <= now()-interval '48 hours') AS clicks_48h,
    count(*) FILTER (WHERE reactivated_at BETWEEN sent_at AND sent_at+interval '48 hours' AND sent_at <= now()-interval '48 hours') AS reactivations_48h,
    count(*) FILTER (WHERE cta_returned_at BETWEEN sent_at AND sent_at+interval '48 hours' AND sent_at <= now()-interval '48 hours') AS cta_returns_48h,
    count(*) FILTER (WHERE reactivated_at BETWEEN sent_at AND sent_at+interval '48 hours' AND cta_returned_at IS NULL AND sent_at <= now()-interval '48 hours') AS organic_returns_48h
  FROM public.retention_email_log WHERE delivery_status='sent' AND segment IS NOT NULL
  GROUP BY segment,experiment_phase,experiment_version,subject_variant,body_variant
)
SELECT *,round(100.0*opens_48h/nullif(mature_sends,0),2) AS open_rate_pct,
  round(100.0*clicks_48h/nullif(mature_sends,0),2) AS click_rate_pct,
  round(100.0*reactivations_48h/nullif(mature_sends,0),2) AS reactivation_rate_pct
FROM counts;
REVOKE ALL ON public.retention_roadmap_report FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.retention_roadmap_report TO service_role;

CREATE OR REPLACE FUNCTION public.get_roadmap_retention_report() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id=auth.uid() AND lower(email)='admin@creatives-takeover.com'
  ) THEN RAISE EXCEPTION 'forbidden: admin only'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM public.retention_roadmap_report r);
END;
$$;
REVOKE ALL ON FUNCTION public.get_roadmap_retention_report() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_roadmap_retention_report() TO authenticated,service_role;

-- Preserve historical attribution without cancelling another worker's pending claim.
CREATE OR REPLACE FUNCTION public.record_retention_email_return(p_log_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_campaign text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  UPDATE public.retention_email_log SET returned_at=COALESCE(returned_at,now())
    WHERE id=p_log_id AND user_id=auth.uid() AND delivery_status='sent'
    RETURNING campaign_key INTO v_campaign;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.retention_campaign_state SET touch_index=0,paused_until=NULL,exhausted_at=NULL,
    last_returned_at=now(),updated_at=now()
    WHERE user_id=auth.uid() AND campaign_key=v_campaign AND pending_log_id IS NULL;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_inactive_retention_email(
  p_user_id uuid,
  p_email text,
  p_sequence text,
  p_campaign_key text DEFAULT 'inactive_return'
)
RETURNS TABLE (
  claim_status text,
  claimed_log_id uuid,
  claimed_touch_index integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state public.retention_campaign_state%ROWTYPE;
  v_log_id uuid;
  v_touch integer;
  v_recent_interval interval;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.retention_roadmap_settings WHERE enabled) THEN
    RETURN QUERY SELECT 'campaign_disabled'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF p_user_id IS NULL OR NULLIF(trim(p_email), '') IS NULL THEN
    RETURN QUERY SELECT 'invalid_request'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF p_sequence NOT IN (
    'routine_reminder',
    'activation_day7', 'activation_day2', 'activation_nudge', 'progress_nudge',
    'weekly_digest',
    'reengagement',
    'reengagement_30d',
    'reengagement_60d'
  ) THEN
    RETURN QUERY SELECT 'not_inactive_sequence'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.mentors m WHERE m.user_id = p_user_id) THEN
    RETURN QUERY SELECT 'mentor_excluded'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.retention_email_log l
    WHERE l.user_id = p_user_id AND l.unsubscribed IS TRUE
  ) THEN
    RETURN QUERY SELECT 'unsubscribed'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF NOT public.notif_pref_enabled(p_user_id, 'retention_emails') OR NOT public.notif_pref_enabled(
    p_user_id,
    CASE WHEN p_sequence = 'routine_reminder' THEN 'routine_reminders' ELSE 'retention_emails' END
  ) THEN
    RETURN QUERY SELECT 'preference_disabled'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.retention_email_log WHERE user_id=p_user_id AND (bounced_at IS NOT NULL OR complained_at IS NOT NULL)) THEN
    RETURN QUERY SELECT 'delivery_suppressed'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  INSERT INTO public.retention_campaign_state (user_id, campaign_key)
  VALUES (p_user_id, p_campaign_key)
  ON CONFLICT (user_id, campaign_key) DO NOTHING;

  SELECT * INTO v_state
  FROM public.retention_campaign_state
  WHERE user_id = p_user_id AND campaign_key = p_campaign_key
  FOR UPDATE;

  IF v_state.pending_log_id IS NOT NULL AND v_state.claim_expires_at > now() THEN
    RETURN QUERY SELECT 'claim_in_progress'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF v_state.pending_log_id IS NOT NULL THEN
    UPDATE public.retention_email_log
    SET delivery_status = 'failed', send_error = COALESCE(send_error, 'claim_expired')
    WHERE id = v_state.pending_log_id AND delivery_status = 'pending';

    UPDATE public.retention_campaign_state
    SET pending_log_id = NULL, claim_expires_at = NULL, updated_at = now()
    WHERE user_id = p_user_id AND campaign_key = p_campaign_key;
  END IF;

  -- An organic platform return is also a successful reset, even when it did
  -- not arrive through the attributed email CTA.
  IF v_state.last_sent_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id
      AND GREATEST(
        COALESCE(p.last_activity_at, '-infinity'::timestamptz),
        COALESCE(p.last_seen_at, '-infinity'::timestamptz),
        COALESCE(p.last_active_at, '-infinity'::timestamptz)
      ) > v_state.last_sent_at
  ) THEN
    UPDATE public.retention_campaign_state
    SET touch_index = 0,
        paused_until = NULL,
        exhausted_at = NULL,
        last_returned_at = GREATEST(
          COALESCE(last_returned_at, '-infinity'::timestamptz),
          now()
        ),
        updated_at = now()
    WHERE user_id = p_user_id AND campaign_key = p_campaign_key;

    v_state.touch_index := 0;
    v_state.paused_until := NULL;
    v_state.exhausted_at := NULL;
    -- Preserve the actual last send for the seven day cap.
  END IF;

  IF v_state.exhausted_at IS NOT NULL THEN
    RETURN QUERY SELECT 'campaign_exhausted'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF v_state.paused_until IS NOT NULL AND v_state.paused_until > now() THEN
    RETURN QUERY SELECT 'campaign_paused'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  -- Seven day cap shared by every retention trigger.
  IF v_state.last_sent_at IS NOT NULL AND v_state.last_sent_at >= now() - interval '7 days' THEN
    RETURN QUERY SELECT 'campaign_sent_recently'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  v_recent_interval := CASE
    WHEN p_sequence = 'routine_reminder' THEN interval '7 days'
    ELSE interval '7 days'
  END;

  IF EXISTS (
    SELECT 1 FROM public.retention_email_log l
    WHERE l.user_id = p_user_id
      AND (l.campaign_key = p_campaign_key OR l.sequence IN ('routine_reminder','activation_day2','activation_day7','activation_nudge','progress_nudge','weekly_digest','reengagement','reengagement_30d','reengagement_60d','activation_day1','value_day3','checkin_day7','reengagement_day14','winback_day30'))
      AND l.delivery_status IN ('pending', 'sent')
      AND l.sent_at >= now() - v_recent_interval
  ) THEN
    RETURN QUERY SELECT 'sequence_sent_recently'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  IF (
    SELECT count(*) FROM public.retention_email_log l
    WHERE l.user_id = p_user_id
      AND l.delivery_status IN ('pending', 'sent')
      AND l.sent_at >= now() - interval '7 days'
  ) >= 3 THEN
    RETURN QUERY SELECT 'weekly_cap_reached'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  v_touch := CASE
    WHEN v_state.touch_index < 3 THEN v_state.touch_index + 1
    WHEN v_state.touch_index = 3 AND COALESCE(v_state.paused_until, '-infinity'::timestamptz) <= now() THEN 4
    ELSE NULL
  END;

  IF v_touch IS NULL THEN
    RETURN QUERY SELECT 'campaign_exhausted'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  v_log_id := gen_random_uuid();

  INSERT INTO public.retention_email_log (
    id, user_id, email, sequence, sent_at, campaign_key, touch_index, delivery_status
  ) VALUES (
    v_log_id, p_user_id, lower(trim(p_email)), p_sequence, now(), p_campaign_key, v_touch, 'pending'
  );

  UPDATE public.retention_campaign_state
  SET pending_log_id = v_log_id,
      claim_expires_at = now() + interval '15 minutes',
      updated_at = now()
  WHERE user_id = p_user_id AND campaign_key = p_campaign_key;

  RETURN QUERY SELECT 'claimed'::text, v_log_id, v_touch;
END;
$$;

-- Keep delivery off until the matching frontend and Edge functions are deployed.
UPDATE public.retention_roadmap_settings SET enabled=false WHERE singleton=true;
COMMIT;
SELECT enabled AS email_delivery_enabled, tracking_started_at
FROM public.retention_roadmap_settings WHERE singleton=true;
