-- Phase B Investor Updates V1. Reports are owner-readable, but all mutations
-- run through the authenticated Edge Function so finalized snapshots cannot be
-- changed with a direct REST request. Share tokens are never stored in clear.

CREATE TABLE public.investor_update_rollout (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT true,
  general_release boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.investor_update_rollout(singleton) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE public.investor_update_pilots (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort text NOT NULL DEFAULT 'pilot',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.investor_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  audience text NOT NULL CHECK (audience IN ('stakeholder','fundraising')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized','archived')),
  title text NOT NULL,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(sections) = 'object'),
  evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence_snapshot) = 'object'),
  finalized_snapshot jsonb CHECK (finalized_snapshot IS NULL OR jsonb_typeof(finalized_snapshot) = 'object'),
  finalized_at timestamptz,
  shared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_start, audience, revision),
  UNIQUE(id, user_id),
  CHECK (period_end >= period_start),
  CHECK (period_end <= period_start + 31),
  CHECK (octet_length(sections::text) <= 100000),
  CHECK (octet_length(evidence_snapshot::text) <= 250000),
  CHECK (octet_length(COALESCE(finalized_snapshot, '{}'::jsonb)::text) <= 200000),
  CHECK ((status = 'finalized' AND finalized_at IS NOT NULL AND finalized_snapshot IS NOT NULL) OR status <> 'finalized')
);
CREATE INDEX investor_updates_owner_period_idx ON public.investor_updates(user_id, period_start DESC, audience, revision DESC);

CREATE TABLE public.investor_update_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz,
  revoked_at timestamptz,
  view_count bigint NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (report_id, user_id) REFERENCES public.investor_updates(id, user_id) ON DELETE CASCADE
);
CREATE INDEX investor_update_shares_report_idx ON public.investor_update_shares(report_id, created_at DESC);

ALTER TABLE public.investor_update_rollout ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_update_pilots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_update_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY investor_updates_owner_read ON public.investor_updates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- No policies intentionally exist on rollout, pilots, or shares. They are
-- private control-plane tables used by service_role functions only.
REVOKE ALL ON public.investor_update_rollout, public.investor_update_pilots, public.investor_update_shares FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.investor_updates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.investor_updates TO authenticated;

CREATE OR REPLACE FUNCTION public.can_use_investor_updates_v1(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE(public.is_admin_user_id(p_user_id), false)
    OR EXISTS (
      SELECT 1 FROM public.investor_update_rollout r
      JOIN public.profiles p ON p.id = p_user_id
      WHERE r.singleton AND r.enabled AND p.user_type = 'founder'
        AND (r.general_release OR EXISTS (
          SELECT 1 FROM public.investor_update_pilots pilot
          WHERE pilot.user_id = p_user_id AND pilot.enabled
        ))
    );
$$;
REVOKE ALL ON FUNCTION public.can_use_investor_updates_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_investor_updates_v1(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.investor_update_period_bounds_v1(p_user_id uuid, p_period_start date, p_timezone_hint text DEFAULT 'UTC')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_zone text; v_next date;
BEGIN
  v_zone := public.resolve_task_plan_timezone_v1(p_user_id, p_timezone_hint);
  v_next := (p_period_start + interval '1 month')::date;
  RETURN jsonb_build_object(
    'timezone', v_zone,
    'startAt', p_period_start::timestamp AT TIME ZONE v_zone,
    'endAt', v_next::timestamp AT TIME ZONE v_zone
  );
END;
$$;
REVOKE ALL ON FUNCTION public.investor_update_period_bounds_v1(uuid,date,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.investor_update_period_bounds_v1(uuid,date,text) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_investor_update_immutability_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.status IN ('finalized','archived') THEN
    IF OLD.status = 'finalized' AND NEW.status = 'archived'
       AND (to_jsonb(NEW) - 'status' - 'updated_at') = (to_jsonb(OLD) - 'status' - 'updated_at') THEN
      NEW.updated_at := now();
      RETURN NEW;
    END IF;
    IF OLD.status = 'finalized' AND NEW.status = 'finalized'
       AND (to_jsonb(NEW) - 'shared_at' - 'updated_at') = (to_jsonb(OLD) - 'shared_at' - 'updated_at') THEN
      NEW.updated_at := now();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'finalized_report_is_immutable';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER investor_updates_immutable
  BEFORE UPDATE ON public.investor_updates FOR EACH ROW
  EXECUTE FUNCTION public.guard_investor_update_immutability_v1();

-- Atomic public-link lookup. Only service_role can call it; the public Edge
-- Function rate-limits first and returns only the frozen approved snapshot.
CREATE OR REPLACE FUNCTION public.consume_investor_update_share_v1(p_token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_share public.investor_update_shares; v_report public.investor_updates;
BEGIN
  SELECT * INTO v_share FROM public.investor_update_shares
   WHERE token_hash = lower(p_token_hash) AND revoked_at IS NULL
     AND (expires_at IS NULL OR expires_at > now()) FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_report FROM public.investor_updates
   WHERE id = v_share.report_id AND status = 'finalized';
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.investor_update_shares SET view_count = view_count + 1, last_viewed_at = now() WHERE id = v_share.id;
  RETURN v_report.finalized_snapshot;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_investor_update_share_v1(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_investor_update_share_v1(text) TO service_role;

-- A finalized report is a useful Phase B artifact in repeat/capital, but it
-- never advances the outcome or blocks traction completion.
CREATE OR REPLACE FUNCTION public.attach_investor_update_to_phase_b_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status = 'finalized' AND OLD.status = 'draft' THEN
    UPDATE public.journey_stage_runs
       SET evidence_summary = COALESCE(evidence_summary, '{}'::jsonb) || jsonb_build_object(
         'investorUpdate', jsonb_build_object('reportId', NEW.id, 'period', NEW.period_start, 'audience', NEW.audience, 'finalizedAt', NEW.finalized_at)
       ), updated_at = now()
     WHERE id = (SELECT id FROM public.journey_stage_runs WHERE user_id = NEW.user_id AND stage IN ('repeat','capital') ORDER BY entered_at DESC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER investor_update_phase_b_artifact
  AFTER UPDATE OF status ON public.investor_updates FOR EACH ROW
  EXECUTE FUNCTION public.attach_investor_update_to_phase_b_v1();

-- In-app only. Near month-end (and for the first week after it), selected
-- Stage 6/7 founders with evidence get one deduplicated recommendation.
CREATE OR REPLACE FUNCTION public.queue_investor_update_recommendations_v1()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_inserted integer := 0;
BEGIN
  WITH eligible AS (
    SELECT p.id user_id, local_now.local_date,
      CASE WHEN extract(day FROM local_now.local_date) <= 7 THEN (date_trunc('month',local_now.local_date)-interval '1 month')::date ELSE date_trunc('month',local_now.local_date)::date END period_start
    FROM public.profiles p
    CROSS JOIN LATERAL (
      SELECT (now() AT TIME ZONE public.resolve_task_plan_timezone_v1(p.id,'UTC'))::date local_date
    ) local_now
    WHERE p.user_type='founder' AND public.can_use_investor_updates_v1(p.id)
      AND (p.assigned_stage IN (6,7)
        OR EXISTS (SELECT 1 FROM public.traction_engine_weekly_logs l WHERE l.user_id=p.id)
        OR EXISTS (SELECT 1 FROM public.fundraising_readiness_assessments f WHERE f.user_id=p.id))
      AND (extract(day FROM local_now.local_date) >= 25 OR extract(day FROM local_now.local_date) <= 7)
  ), inserted AS (
    INSERT INTO public.daily_tasks(user_id,task_date,task_text,task_description,priority,task_source,source_tool,source_route,intent_type,recommendation_key,recommendation_reason,recommendation_status,ai_generated,is_foundational,is_completed)
    SELECT e.user_id,e.local_date,'Create your monthly investor update','Review the traction and readiness evidence already saved, then approve only what you want to share.','medium','platform','investor_updates','/investor-updates','stage_action','investor-update:'||to_char(e.period_start,'YYYY-MM'),'You have Phase B evidence ready to turn into a founder-approved update.','accepted',false,false,false
    FROM eligible e
    WHERE NOT EXISTS (SELECT 1 FROM public.investor_updates u WHERE u.user_id=e.user_id AND u.period_start=e.period_start)
      AND NOT EXISTS (SELECT 1 FROM public.daily_tasks t WHERE t.user_id=e.user_id AND t.recommendation_key='investor-update:'||to_char(e.period_start,'YYYY-MM'))
    RETURNING 1
  ) SELECT count(*) INTO v_inserted FROM inserted;
  RETURN v_inserted;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_investor_update_recommendations_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_investor_update_recommendations_v1() TO service_role;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='investor-update-recommendations-v1';
    PERFORM cron.schedule('investor-update-recommendations-v1','15 * * * *','SELECT public.queue_investor_update_recommendations_v1();');
  END IF;
END $$;

COMMENT ON TABLE public.investor_updates IS 'INVESTOR_UPDATES_V1 monthly founder-approved reports. Evidence and finalized snapshots are immutable historical records.';
COMMENT ON COLUMN public.investor_update_shares.token_hash IS 'SHA-256 hex digest. The raw high-entropy access token is returned once and is never persisted.';
NOTIFY pgrst, 'reload schema';
