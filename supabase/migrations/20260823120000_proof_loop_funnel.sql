-- The proof loop: measure whether a stranger ever responds to a founder's artifact.
--
-- Creatives Takeover hosts the artifacts founders put in front of buyers, so it
-- observes the market's response first-hand rather than being told about it. That
-- is the platform's one genuinely defensible property, and nothing currently
-- measures whether any founder ever reaches it.
--
-- Three steps, headline on the third:
--
--   stranger_viewed      a non-owner loaded the artifact
--   stranger_acted       a non-owner did something optional
--   stranger_identified  a non-owner gave their identity
--
-- Steps one and two exist to make a bad step three diagnosable. If founders
-- publish and nobody looks, that is a distribution problem. If strangers look and
-- never act, that is an artifact problem. One number could not tell them apart.

-- ─── 1. Owner exclusion ──────────────────────────────────────────────────────
--
-- A founder checking their own published demo is not market evidence, and until
-- now nothing distinguished the two: demo_studio_events accepts public inserts
-- with WITH CHECK (true) and carries no owner concept at all.
--
-- A real column rather than a JSON flag inside meta: every query below filters on
-- it, and a partial index on a boolean is far cheaper than extracting from jsonb
-- on each row. The edge functions set it from the caller's token, never from the
-- request body, because the founder whose numbers this protects is the one party
-- with a motive to omit a self-reported flag.

ALTER TABLE public.demo_studio_events
  ADD COLUMN IF NOT EXISTS owner_view boolean NOT NULL DEFAULT false;
ALTER TABLE public.demo_studio_signups
  ADD COLUMN IF NOT EXISTS owner_view boolean NOT NULL DEFAULT false;
ALTER TABLE public.demo_studio_responses
  ADD COLUMN IF NOT EXISTS owner_view boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.demo_studio_events.owner_view IS
  'True when the project owner generated this event. Preview traffic is kept for debugging but never counts as market evidence.';

-- Existing rows keep owner_view = false. They predate the distinction, so some
-- are founder previews counted as strangers. That is a known, bounded
-- overstatement of history rather than something to guess at and rewrite.

CREATE INDEX IF NOT EXISTS demo_studio_events_stranger_idx
  ON public.demo_studio_events(project_id, type, created_at DESC)
  WHERE owner_view = false AND verified = true;

-- ─── 2. One vocabulary for external evidence ─────────────────────────────────
--
-- customer_evidence_events is already the convergence point: it carries a
-- verification_mode enum including 'customer_action', and demo signups and
-- waitlist signups already flow into it. Its event_type constraint describes a
-- founder-run sales pipeline, though, and has no value meaning "an anonymous
-- stranger looked at this". Overloading 'prospect_added' would corrupt the First
-- Customer Sprint, which reads that value as a named, founder-added prospect.

ALTER TABLE public.customer_evidence_events
  DROP CONSTRAINT IF EXISTS customer_evidence_events_event_type_check;

ALTER TABLE public.customer_evidence_events
  ADD CONSTRAINT customer_evidence_events_event_type_check CHECK (event_type IN (
    'prospect_added', 'prospect_qualified', 'outreach_prepared', 'outreach_sent',
    'reply_received', 'interview_scheduled', 'interview_completed',
    'commitment_received', 'offer_sent', 'payment_received', 'customer_lost',
    'retention_observed', 'channel_reviewed',
    -- Anonymous, inbound, platform-observed. Distinct from the pipeline values
    -- above, which all describe a person the founder identified and worked.
    'stranger_viewed', 'stranger_acted', 'stranger_identified'
  ));

-- ─── 3. Feed the two uncovered sources ───────────────────────────────────────
--
-- Same shape as sync_demo_signup_to_founder_cycle_v1: resolve the owner, tolerate
-- a missing founder_cycle_state via COALESCE, and dedupe on a stable idempotency
-- key so a replayed insert cannot inflate the funnel.

CREATE OR REPLACE FUNCTION public.sync_demo_event_to_customer_evidence_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_loop text;
  v_event_type text;
BEGIN
  -- Owner previews and unverified client-side beacons are not evidence.
  IF NEW.owner_view IS TRUE OR NEW.verified IS NOT TRUE THEN RETURN NEW; END IF;

  v_event_type := CASE
    WHEN NEW.type = 'demo_view' THEN 'stranger_viewed'
    WHEN NEW.type = 'launch_page_view' THEN 'stranger_viewed'
    -- Everything here required the viewer to choose to continue, which is the
    -- distinction the middle step of the funnel is measuring.
    WHEN NEW.type IN ('demo_step', 'demo_start', 'demo_complete', 'cta_click', 'vsl_complete') THEN 'stranger_acted'
    ELSE NULL
  END;
  -- 'signup' is deliberately absent: demo-studio-lead writes both a signup row
  -- and an event, and counting both would double-count one stranger.
  IF v_event_type IS NULL THEN RETURN NEW; END IF;

  SELECT owner_id INTO v_user_id FROM public.demo_studio_projects WHERE id = NEW.project_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(selected_loop, recommended_loop, 'PROVE')
    INTO v_loop FROM public.founder_cycle_state WHERE user_id = v_user_id;

  INSERT INTO public.customer_evidence_events (
    user_id, active_loop, event_type, source_entity_type, source_entity_id,
    verification_mode, metadata, idempotency_key, occurred_at
  ) VALUES (
    v_user_id, COALESCE(v_loop, 'PROVE'), v_event_type,
    'demo_studio_event', NEW.id::text, 'customer_action',
    jsonb_build_object('project_id', NEW.project_id, 'demo_id', NEW.demo_id, 'type', NEW.type),
    'demo-event:' || NEW.id::text, NEW.created_at
  )
  ON CONFLICT (user_id, idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_demo_event_to_customer_evidence_v1 ON public.demo_studio_events;
CREATE TRIGGER sync_demo_event_to_customer_evidence_v1
AFTER INSERT ON public.demo_studio_events
FOR EACH ROW EXECUTE FUNCTION public.sync_demo_event_to_customer_evidence_v1();

CREATE OR REPLACE FUNCTION public.sync_pmf_survey_response_to_customer_evidence_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_loop text;
BEGIN
  SELECT user_id INTO v_user_id FROM public.pmf_surveys WHERE id = NEW.survey_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(selected_loop, recommended_loop, 'PROVE')
    INTO v_loop FROM public.founder_cycle_state WHERE user_id = v_user_id;

  -- A completed PMF survey is a stranger spending real effort on the founder's
  -- question, which is a stronger signal than a demo view even without an email.
  INSERT INTO public.customer_evidence_events (
    user_id, active_loop, event_type, source_entity_type, source_entity_id,
    verification_mode, metadata, idempotency_key, occurred_at
  ) VALUES (
    v_user_id, COALESCE(v_loop, 'PROVE'), 'stranger_identified',
    'pmf_survey_response', NEW.id::text, 'customer_action',
    -- Never the respondent's email, role, or free text: this table is read by
    -- admin rollups and must not become a second copy of survey content.
    jsonb_build_object('survey_id', NEW.survey_id),
    'pmf-survey-response:' || NEW.id::text, NEW.created_at
  )
  ON CONFLICT (user_id, idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_pmf_survey_response_to_customer_evidence_v1 ON public.pmf_survey_responses;
CREATE TRIGGER sync_pmf_survey_response_to_customer_evidence_v1
AFTER INSERT ON public.pmf_survey_responses
FOR EACH ROW EXECUTE FUNCTION public.sync_pmf_survey_response_to_customer_evidence_v1();

-- The existing demo-signup sync predates owner_view and would count a founder's
-- own test submission as demand. Same body, one guard added.
CREATE OR REPLACE FUNCTION public.sync_demo_signup_to_founder_cycle_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_loop text;
BEGIN
  IF NEW.owner_view IS TRUE THEN RETURN NEW; END IF;

  SELECT owner_id INTO v_user_id
  FROM public.demo_studio_projects
  WHERE id = NEW.project_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(selected_loop, recommended_loop, 'PROVE')
  INTO v_loop FROM public.founder_cycle_state WHERE user_id = v_user_id;
  INSERT INTO public.customer_evidence_events (
    user_id, active_loop, event_type, source_entity_type, source_entity_id,
    verification_mode, metadata, idempotency_key, occurred_at
  ) VALUES (
    v_user_id, COALESCE(v_loop, 'PROVE'), 'stranger_identified',
    'demo_studio_signup', NEW.id::text, 'customer_action',
    jsonb_build_object('project_id', NEW.project_id),
    'demo-signup:' || NEW.id::text, NEW.created_at
  )
  ON CONFLICT (user_id, idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ─── 4. The funnel ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_proof_loop_funnel_v1()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  WITH founders AS (
    SELECT id AS user_id, date_trunc('month', created_at) AS cohort_month
    FROM auth.users
  ),
  reached AS (
    SELECT
      user_id,
      bool_or(event_type = 'stranger_viewed') AS viewed,
      bool_or(event_type = 'stranger_acted') AS acted,
      bool_or(event_type = 'stranger_identified') AS identified,
      min(occurred_at) FILTER (WHERE event_type = 'stranger_identified') AS first_identified_at
    FROM public.customer_evidence_events
    WHERE event_type IN ('stranger_viewed', 'stranger_acted', 'stranger_identified')
    GROUP BY user_id
  )
  SELECT jsonb_build_object(
    'generatedAt', now(),
    'totalFounders', (SELECT count(*) FROM founders),
    -- The headline. Everything else on this object exists to explain it.
    'reachedIdentified', (SELECT count(*) FROM reached WHERE identified),
    'reachedActed', (SELECT count(*) FROM reached WHERE acted),
    'reachedViewed', (SELECT count(*) FROM reached WHERE viewed),
    'byCohort', COALESCE((
      SELECT jsonb_agg(row ORDER BY row->>'cohortMonth' DESC)
      FROM (
        SELECT jsonb_build_object(
          'cohortMonth', to_char(f.cohort_month, 'YYYY-MM'),
          'founders', count(*),
          'viewed', count(*) FILTER (WHERE r.viewed),
          'acted', count(*) FILTER (WHERE r.acted),
          'identified', count(*) FILTER (WHERE r.identified),
          'medianDaysToIdentified', percentile_cont(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (r.first_identified_at - f.cohort_month)) / 86400
          ) FILTER (WHERE r.identified)
        ) AS row
        FROM founders f LEFT JOIN reached r ON r.user_id = f.user_id
        GROUP BY f.cohort_month
      ) cohorts
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_proof_loop_funnel_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_proof_loop_funnel_v1() TO authenticated;

COMMENT ON FUNCTION public.get_proof_loop_funnel_v1() IS
  'Admin-only. Share of founders whose hosted artifact was seen, acted on, and responded to by a non-owner. The identified count is the north star.';
