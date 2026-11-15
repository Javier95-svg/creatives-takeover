-- GTM Strategist research agent, the rest of docs/gtm-research-agent-plan.md:
-- Phase A gaps, Phase B (contacts, signals, follow-up runs, feedback,
-- program counts, notifications) and Phase C (weekly refresh, A/B drafts,
-- program research allowances).
--
-- Additive except: three CHECK constraints are widened (step keys, run
-- kinds, draft statuses) and cohort_dashboard_v1 gains research counts. The
-- dashboard body is the live production text (checked 2026-11-16) plus new
-- fields only.

BEGIN;

-- ---------------------------------------------------------------------------
-- Runs: follow-up kinds, seeds, re-run and weekly refresh, program allowance
-- ---------------------------------------------------------------------------

ALTER TABLE public.gtm_research_runs
  ADD COLUMN IF NOT EXISTS parent_run_id UUID REFERENCES public.gtm_research_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'initial',
  ADD COLUMN IF NOT EXISTS seed_domains TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rerun_used BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_refresh BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES public.launch_cohorts(id) ON DELETE SET NULL;
ALTER TABLE public.gtm_research_runs DROP CONSTRAINT IF EXISTS gtm_research_runs_kind_check;
ALTER TABLE public.gtm_research_runs ADD CONSTRAINT gtm_research_runs_kind_check
  CHECK (kind IN ('initial', 'more', 'similar', 'rerun', 'refresh'));
CREATE INDEX IF NOT EXISTS idx_gtm_research_runs_refresh ON public.gtm_research_runs (last_refreshed_at) WHERE auto_refresh;

ALTER TABLE public.gtm_research_steps DROP CONSTRAINT IF EXISTS gtm_research_steps_key_check;
ALTER TABLE public.gtm_research_steps ADD CONSTRAINT gtm_research_steps_key_check CHECK (key IN (
  'read_site', 'understand_business', 'find_competitors', 'propose_segments',
  'discover_companies', 'qualify_companies', 'find_signals', 'draft_outreach', 'finalize'));

-- ---------------------------------------------------------------------------
-- Prospects: founder contact link and buying signals
-- ---------------------------------------------------------------------------

ALTER TABLE public.gtm_prospect_companies
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.founder_customer_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signals JSONB NOT NULL DEFAULT '[]'::jsonb;
GRANT UPDATE (contact_id) ON public.gtm_prospect_companies TO authenticated;

-- ---------------------------------------------------------------------------
-- Drafts: a second variant (A/B) and replies
-- ---------------------------------------------------------------------------

ALTER TABLE public.gtm_outreach_drafts
  ADD COLUMN IF NOT EXISTS variant_b_subject TEXT,
  ADD COLUMN IF NOT EXISTS variant_b_body TEXT,
  ADD COLUMN IF NOT EXISTS chosen_variant TEXT NOT NULL DEFAULT 'a',
  ADD COLUMN IF NOT EXISTS person_contact_id UUID,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
ALTER TABLE public.gtm_outreach_drafts DROP CONSTRAINT IF EXISTS gtm_outreach_drafts_chosen_variant_check;
ALTER TABLE public.gtm_outreach_drafts ADD CONSTRAINT gtm_outreach_drafts_chosen_variant_check CHECK (chosen_variant IN ('a', 'b'));
ALTER TABLE public.gtm_outreach_drafts DROP CONSTRAINT IF EXISTS gtm_outreach_drafts_status_check;
ALTER TABLE public.gtm_outreach_drafts ADD CONSTRAINT gtm_outreach_drafts_status_check
  CHECK (status IN ('draft', 'approved', 'sent_manually', 'replied'));
GRANT UPDATE (variant_b_subject, variant_b_body, chosen_variant, sent_at, replied_at) ON public.gtm_outreach_drafts TO authenticated;

-- ---------------------------------------------------------------------------
-- Named decision-makers (Phase B). Found by a contact-data provider only when
-- the founder asks, one company at a time, and charged only when found.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gtm_prospect_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.gtm_prospect_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT,
  email TEXT NOT NULL,
  email_status TEXT NOT NULL CHECK (email_status IN ('valid', 'catch_all')),
  provider TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  found_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (prospect_id, email)
);
ALTER TABLE public.gtm_prospect_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners read prospect contacts" ON public.gtm_prospect_contacts;
CREATE POLICY "Owners read prospect contacts" ON public.gtm_prospect_contacts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners remove prospect contacts" ON public.gtm_prospect_contacts;
CREATE POLICY "Owners remove prospect contacts" ON public.gtm_prospect_contacts FOR DELETE USING (auth.uid() = user_id);
REVOKE ALL ON public.gtm_prospect_contacts FROM anon;
REVOKE INSERT, UPDATE ON public.gtm_prospect_contacts FROM authenticated;
GRANT SELECT, DELETE ON public.gtm_prospect_contacts TO authenticated;
GRANT ALL ON public.gtm_prospect_contacts TO service_role;

-- ---------------------------------------------------------------------------
-- Budget alerts: one email per feature, month and kind.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.provider_spend_alerts (
  feature TEXT NOT NULL,
  month DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('warning', 'paused')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (feature, month, kind)
);
ALTER TABLE public.provider_spend_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_spend_alerts FROM anon, authenticated;
GRANT ALL ON public.provider_spend_alerts TO service_role;

-- Opt-out requests come from the public form; reviewed by the team.
ALTER TABLE public.gtm_suppressions
  ADD COLUMN IF NOT EXISTS requester_email TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'admin';

-- ---------------------------------------------------------------------------
-- Programs (Phase C): research runs included for cohort founders
-- ---------------------------------------------------------------------------

ALTER TABLE public.launch_cohorts
  ADD COLUMN IF NOT EXISTS research_runs_included INTEGER NOT NULL DEFAULT 0 CHECK (research_runs_included BETWEEN 0 AND 50);

-- The active cohort with research runs left for this founder, if any.
CREATE OR REPLACE FUNCTION public.cohort_research_allowance_v1(p_user_id UUID)
RETURNS TABLE (cohort_id UUID, remaining INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.research_runs_included - (
      SELECT count(*)::int FROM public.gtm_research_runs r
       WHERE r.user_id = p_user_id AND r.cohort_id = c.id)
    FROM public.cohort_members m
    JOIN public.launch_cohorts c ON c.id = m.cohort_id
   WHERE m.user_id = p_user_id
     AND m.status IN ('active', 'paused')
     AND c.status IN ('upcoming', 'active')
     AND c.research_runs_included > 0
     AND current_date BETWEEN c.start_date AND c.end_date
     AND c.research_runs_included > (
       SELECT count(*) FROM public.gtm_research_runs r WHERE r.user_id = p_user_id AND r.cohort_id = c.id)
   ORDER BY c.start_date
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.cohort_research_allowance_v1(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cohort_research_allowance_v1(UUID) TO service_role;

-- Admins set how many research runs a cohort includes per founder.
CREATE OR REPLACE FUNCTION public.set_cohort_research_allowance_v1(p_cohort_id UUID, p_runs INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.launch_cohorts SET research_runs_included = GREATEST(0, LEAST(COALESCE(p_runs, 0), 50)), updated_at = now()
   WHERE id = p_cohort_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cohort not found' USING ERRCODE = 'P0002'; END IF;
  RETURN GREATEST(0, LEAST(COALESCE(p_runs, 0), 50));
END;
$$;
REVOKE ALL ON FUNCTION public.set_cohort_research_allowance_v1(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_cohort_research_allowance_v1(UUID, INTEGER) TO authenticated;

-- Program dashboard: the live function plus prospecting counts. Staff see
-- counts only, never the companies or messages.
CREATE OR REPLACE FUNCTION public.cohort_dashboard_v1(p_cohort_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_is_admin boolean := public.has_role(auth.uid(), 'admin'::app_role);
  v_cohort public.launch_cohorts%ROWTYPE;
  v_until timestamptz;
  v_members jsonb;
BEGIN
  IF NOT (v_is_admin OR public.is_cohort_staff(p_cohort_id)) THEN
    RAISE EXCEPTION 'Program staff access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cohort FROM public.launch_cohorts WHERE id = p_cohort_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cohort not found' USING ERRCODE = 'P0002'; END IF;
  v_until := (v_cohort.end_date + 1)::timestamptz;

  SELECT coalesce(jsonb_agg(row_data ORDER BY row_data->>'name'), '[]'::jsonb) INTO v_members
  FROM (
    SELECT jsonb_build_object(
      'userId', m.user_id,
      'name', coalesce(nullif(trim(p.full_name), ''), split_part(u.email, '@', 1)),
      'email', u.email,
      'status', m.status,
      'joinedAt', m.joined_at,
      'lastActivityAt', GREATEST(
        u.last_sign_in_at,
        (SELECT max(o.updated_at) FROM public.journey_outcomes o WHERE o.user_id = m.user_id),
        (SELECT max(e.occurred_at) FROM public.customer_evidence_events e WHERE e.user_id = m.user_id),
        (SELECT max(i.updated_at) FROM public.pmf_interviews i WHERE i.user_id = m.user_id),
        (SELECT max(x.updated_at) FROM public.market_experiments x WHERE x.user_id = m.user_id),
        (SELECT max(t.completed_at) FROM public.bizmap_task_progress t WHERE t.user_id = m.user_id),
        (SELECT max(ci.created_at) FROM public.cohort_checkins ci WHERE ci.user_id = m.user_id AND ci.cohort_id = m.cohort_id),
        (SELECT max(r.updated_at) FROM public.gtm_research_runs r WHERE r.user_id = m.user_id)
      ),
      'outcomes', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'tool', o.tool,
          'artifact_type', o.artifact_type,
          'status', o.status,
          'quality_checks', jsonb_build_object('buyerProofEarned', o.quality_checks->'buyerProofEarned'),
          'completed_at', o.completed_at,
          'verified_at', o.verified_at,
          'reviewed_at', o.reviewed_at,
          'updated_at', o.updated_at
        ))
        FROM public.journey_outcomes o WHERE o.user_id = m.user_id
      ), '[]'::jsonb),
      'completedTaskIds', coalesce((
        SELECT jsonb_agg(t.task_id ORDER BY t.completed_at)
        FROM public.bizmap_task_progress t WHERE t.user_id = m.user_id AND t.is_completed
      ), '[]'::jsonb),
      'interviews', jsonb_build_object(
        'total', (SELECT count(*) FROM public.pmf_interviews i
                  WHERE i.user_id = m.user_id AND i.created_at >= m.joined_at AND i.created_at < v_until),
        'verified', (SELECT count(*) FROM public.pmf_interviews i
                     WHERE i.user_id = m.user_id AND i.created_at >= m.joined_at AND i.created_at < v_until
                       AND i.evidence_origin = 'platform_verified')
      ),
      'evidence', (
        SELECT jsonb_build_object(
          'replies', count(*) FILTER (WHERE e.event_type = 'reply_received'),
          'interviewsCompleted', count(*) FILTER (WHERE e.event_type = 'interview_completed'),
          'commitments', count(*) FILTER (WHERE e.event_type = 'commitment_received'),
          'payments', count(*) FILTER (WHERE e.event_type = 'payment_received'),
          'strangersActed', count(*) FILTER (WHERE e.event_type = 'stranger_acted'),
          'strangersIdentified', count(*) FILTER (WHERE e.event_type = 'stranger_identified'),
          'prospectsAdded', count(*) FILTER (WHERE e.event_type = 'prospect_added'),
          'outreachPrepared', count(*) FILTER (WHERE e.event_type = 'outreach_prepared'),
          'outreachSent', count(*) FILTER (WHERE e.event_type = 'outreach_sent'),
          'total', count(*),
          -- Observed by the platform or backed by a customer action or payment.
          -- Founder reports and imported rows are not verified.
          'verified', count(*) FILTER (WHERE e.verification_mode IN ('platform_verified', 'customer_action', 'transaction'))
        )
        FROM public.customer_evidence_events e
        WHERE e.user_id = m.user_id AND e.occurred_at >= m.joined_at AND e.occurred_at < v_until
      ),
      'research', jsonb_build_object(
        'runs', (SELECT count(*) FROM public.gtm_research_runs r
                 WHERE r.user_id = m.user_id AND r.status IN ('completed', 'partial')
                   AND r.created_at >= m.joined_at AND r.created_at < v_until),
        'companiesQualified', (SELECT count(*) FROM public.gtm_prospect_companies g
                               WHERE g.user_id = m.user_id AND g.fit_tier IN ('A', 'B')
                                 AND g.created_at >= m.joined_at AND g.created_at < v_until)
      ),
      'experimentsRun', (SELECT count(*) FROM public.market_experiments x
                         WHERE x.user_id = m.user_id AND x.status <> 'draft'
                           AND x.created_at >= m.joined_at AND x.created_at < v_until),
      'experimentDecisions', (SELECT count(*) FROM public.market_experiment_decisions d
                              WHERE d.user_id = m.user_id AND d.decided_at >= m.joined_at AND d.decided_at < v_until),
      'assumptions', jsonb_build_object(
        'total', (SELECT count(*) FROM public.journey_assumptions a WHERE a.user_id = m.user_id),
        'tested', (SELECT count(*) FROM public.journey_assumptions a WHERE a.user_id = m.user_id AND a.status <> 'untested')
      ),
      'checkins', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'weekNumber', ci.week_number,
          'checkinDate', ci.checkin_date,
          'wins', ci.wins,
          'blockers', ci.blockers,
          'nextWeekGoals', ci.next_week_goals,
          'helpNeeded', ci.help_needed,
          'createdAt', ci.created_at
        ) ORDER BY ci.week_number)
        FROM public.cohort_checkins ci WHERE ci.cohort_id = m.cohort_id AND ci.user_id = m.user_id
      ), '[]'::jsonb)
    ) AS row_data
    FROM public.cohort_members m
    JOIN auth.users u ON u.id = m.user_id
    LEFT JOIN public.profiles p ON p.id = m.user_id
    WHERE m.cohort_id = p_cohort_id
      AND m.status <> 'dropped'
      AND m.progress_shared_at IS NOT NULL
  ) members;

  RETURN jsonb_build_object(
    'cohort', jsonb_build_object(
      'cohortId', v_cohort.id,
      'cohortName', v_cohort.cohort_name,
      'programName', v_cohort.program_name,
      'startDate', v_cohort.start_date,
      'endDate', v_cohort.end_date,
      'status', v_cohort.status,
      'checkinDay', v_cohort.weekly_checkin_day,
      'pilotPlan', v_cohort.pilot_plan,
      'researchRunsIncluded', v_cohort.research_runs_included,
      'joinCode', v_cohort.join_code,
      -- Only our team hands out staff invites.
      'staffCode', CASE WHEN v_is_admin THEN v_cohort.staff_code ELSE NULL END
    ),
    'members', v_members,
    'generatedAt', now()
  );
END;
$$;
REVOKE ALL ON FUNCTION public.cohort_dashboard_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cohort_dashboard_v1(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Weekly refresh (Phase C): Mondays 08:00 UTC, new companies only.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.dispatch_gtm_research_refresh()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
BEGIN
  IF v_url IS NULL OR v_key IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gtm_research_runs WHERE auto_refresh) THEN RETURN; END IF;
  PERFORM net.http_post(
    url := v_url || '/functions/v1/gtm-research',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body := '{"action":"refresh_due"}'::jsonb,
    timeout_milliseconds := 30000
  );
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_gtm_research_refresh() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_gtm_research_refresh() TO service_role;

SELECT cron.schedule('gtm-research-weekly-refresh', '0 8 * * 1', 'SELECT public.dispatch_gtm_research_refresh()');

COMMIT;
