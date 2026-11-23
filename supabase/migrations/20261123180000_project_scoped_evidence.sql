-- Project memory plan, phase 4 (2026-11-23): assumptions, journey outcomes,
-- handoffs, evidence cases and weekly traction logs belong to a project, so a
-- founder with two startups never sees one startup's evidence in the other.
--
-- Each row's project comes from what it is about: an assumption from its ICP,
-- an evidence case from its ICP, an outcome from its artifact, a handoff from
-- its outcome. Rows with no source (an evidence case without an ICP, a
-- weekly log) take the project the app sends, or else the project the
-- founder worked in last, as the tool tables already do. A project named by
-- the app must belong to the same account.
--
-- Assumptions and weekly logs become unique per project instead of per
-- account: the same assumption can be tested separately in two startups, and
-- each startup logs its own week.
--
-- Safe to run more than once.

-- ── Columns ─────────────────────────────────────────────────────────────────
ALTER TABLE public.journey_assumptions ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.journey_outcomes ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.journey_handoffs ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.prebuild_validation_contexts ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.traction_engine_weekly_logs ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS journey_assumptions_project_idx ON public.journey_assumptions (project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS journey_outcomes_project_idx ON public.journey_outcomes (project_id, tool, updated_at DESC);
CREATE INDEX IF NOT EXISTS journey_handoffs_project_idx ON public.journey_handoffs (project_id, destination_tool, status, created_at DESC);
CREATE INDEX IF NOT EXISTS prebuild_context_project_idx ON public.prebuild_validation_contexts (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS traction_logs_project_week_idx ON public.traction_engine_weekly_logs (project_id, week_start_date DESC);

-- ── Which project a journey outcome's artifact belongs to ──────────────────
CREATE OR REPLACE FUNCTION public.journey_artifact_project(
  p_user uuid, p_tool text, p_artifact_type text, p_artifact_id text, p_context uuid
)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_project uuid;
BEGIN
  IF p_artifact_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    v_id := p_artifact_id::uuid;
    CASE
      WHEN p_tool = 'icp_builder' THEN
        SELECT project_id INTO v_project FROM public.icp_analysis_results WHERE id = v_id AND user_id = p_user;
      WHEN p_tool = 'demo_studio' AND p_artifact_type = 'concept_page' THEN
        SELECT project_id INTO v_project FROM public.demo_studio_projects WHERE id = v_id AND owner_id = p_user;
      WHEN p_tool = 'demo_studio' THEN
        SELECT p.project_id INTO v_project
        FROM public.demo_studio_demos d JOIN public.demo_studio_projects p ON p.id = d.project_id
        WHERE d.id = v_id AND d.owner_id = p_user;
      WHEN p_tool = 'pmf_lab' THEN
        SELECT project_id INTO v_project FROM public.pmf_analysis_results WHERE id = v_id AND user_id = p_user;
      WHEN p_tool = 'mvp_builder' THEN
        SELECT project_id INTO v_project FROM public.mvp_projects WHERE id = v_id AND user_id = p_user;
      WHEN p_artifact_type IN ('first_customer_proof', 'first_customer_sprint') THEN
        SELECT COALESCE(g.project_id, i.project_id) INTO v_project
        FROM public.first_customer_sprints s
        LEFT JOIN public.gtm_plans g ON g.id = s.gtm_plan_id AND g.user_id = p_user
        LEFT JOIN public.icp_analysis_results i ON i.id = s.icp_analysis_id AND i.user_id = p_user
        WHERE s.id = v_id AND s.founder_id = p_user;
      WHEN p_tool = 'gtm_strategist' THEN
        SELECT project_id INTO v_project FROM public.gtm_plans WHERE id = v_id AND user_id = p_user;
      ELSE
        NULL;
    END CASE;
  END IF;
  IF v_project IS NULL AND p_context IS NOT NULL THEN
    SELECT project_id INTO v_project FROM public.prebuild_validation_contexts WHERE id = p_context AND user_id = p_user;
  END IF;
  RETURN v_project;
END;
$function$;

-- ── Assign the project on insert; check it on change ───────────────────────
CREATE OR REPLACE FUNCTION public.assign_evidence_project()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_project uuid;
  v_source text;
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    IF TG_OP = 'UPDATE' AND NEW.project_id IS NOT DISTINCT FROM OLD.project_id THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = NEW.project_id AND user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'This project does not belong to this account' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'journey_assumptions' THEN
    v_source := NEW.source_artifact_id;
    IF v_source ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      SELECT project_id INTO v_project FROM public.icp_analysis_results WHERE id = v_source::uuid AND user_id = NEW.user_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'prebuild_validation_contexts' THEN
    IF NEW.icp_analysis_id IS NOT NULL THEN
      SELECT project_id INTO v_project FROM public.icp_analysis_results WHERE id = NEW.icp_analysis_id AND user_id = NEW.user_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'journey_outcomes' THEN
    v_project := public.journey_artifact_project(NEW.user_id, NEW.tool, NEW.artifact_type, NEW.artifact_id, NEW.validation_context_id);
  ELSIF TG_TABLE_NAME = 'journey_handoffs' THEN
    SELECT project_id INTO v_project FROM public.journey_outcomes WHERE id = NEW.source_outcome_id AND user_id = NEW.user_id;
  END IF;

  NEW.project_id := COALESCE(v_project, public.ensure_active_project(NEW.user_id));
  RETURN NEW;
END;
$function$;

DO $triggers$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['journey_assumptions', 'journey_outcomes', 'journey_handoffs', 'prebuild_validation_contexts', 'traction_engine_weekly_logs'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS a_assign_evidence_project ON public.%I', t);
    -- "a_" so it runs before the other BEFORE triggers on the table.
    EXECUTE format('CREATE TRIGGER a_assign_evidence_project BEFORE INSERT OR UPDATE OF project_id ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.assign_evidence_project()', t);
  END LOOP;
END $triggers$;

-- ── Backfill ────────────────────────────────────────────────────────────────
-- Adding a project is not activity: the updated_at and re-verification
-- triggers stay off for these updates, so dashboards that read "last
-- active" from updated_at do not show everyone as active today.
ALTER TABLE public.journey_outcomes DISABLE TRIGGER set_journey_outcomes_updated_at;
ALTER TABLE public.journey_handoffs DISABLE TRIGGER set_journey_handoffs_updated_at;
ALTER TABLE public.prebuild_validation_contexts DISABLE TRIGGER prebuild_validation_contexts_touch;
ALTER TABLE public.traction_engine_weekly_logs DISABLE TRIGGER update_traction_engine_weekly_logs_updated_at;
ALTER TABLE public.traction_engine_weekly_logs DISABLE TRIGGER enforce_traction_platform_verification;

-- From the source.
UPDATE public.prebuild_validation_contexts c SET project_id = i.project_id
FROM public.icp_analysis_results i
WHERE c.project_id IS NULL AND i.id = c.icp_analysis_id AND i.user_id = c.user_id AND i.project_id IS NOT NULL;

UPDATE public.journey_assumptions a SET project_id = i.project_id
FROM public.icp_analysis_results i
WHERE a.project_id IS NULL
  AND a.source_artifact_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND i.id = a.source_artifact_id::uuid AND i.user_id = a.user_id AND i.project_id IS NOT NULL;

UPDATE public.journey_outcomes o
SET project_id = public.journey_artifact_project(o.user_id, o.tool, o.artifact_type, o.artifact_id, o.validation_context_id)
WHERE o.project_id IS NULL
  AND public.journey_artifact_project(o.user_id, o.tool, o.artifact_type, o.artifact_id, o.validation_context_id) IS NOT NULL;

UPDATE public.journey_handoffs h SET project_id = o.project_id
FROM public.journey_outcomes o
WHERE h.project_id IS NULL AND o.id = h.source_outcome_id AND o.user_id = h.user_id AND o.project_id IS NOT NULL;

UPDATE public.traction_engine_weekly_logs l SET project_id = s.project_id
FROM (
  SELECT DISTINCT ON (e.weekly_log_id) e.weekly_log_id, sp.project_id
  FROM public.traction_engine_experiments e
  JOIN public.traction_engine_sprints sp ON sp.id = e.sprint_id AND sp.user_id = e.user_id
  WHERE sp.project_id IS NOT NULL
  ORDER BY e.weekly_log_id, sp.created_at DESC
) s
WHERE l.project_id IS NULL AND s.weekly_log_id = l.id;

-- Anything left: the project the founder worked in last (none is created).
DO $rest$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['prebuild_validation_contexts', 'journey_assumptions', 'journey_outcomes', 'journey_handoffs', 'traction_engine_weekly_logs'] LOOP
    EXECUTE format($sql$
      UPDATE public.%I r SET project_id = (
        SELECT p.id FROM public.projects p
        WHERE p.user_id = r.user_id AND p.archived_at IS NULL
        ORDER BY COALESCE(p.last_run_at, p.updated_at, p.created_at) DESC NULLS LAST, p.created_at DESC
        LIMIT 1)
      WHERE r.project_id IS NULL
    $sql$, t);
  END LOOP;
END $rest$;

ALTER TABLE public.journey_outcomes ENABLE TRIGGER set_journey_outcomes_updated_at;
ALTER TABLE public.journey_handoffs ENABLE TRIGGER set_journey_handoffs_updated_at;
ALTER TABLE public.prebuild_validation_contexts ENABLE TRIGGER prebuild_validation_contexts_touch;
ALTER TABLE public.traction_engine_weekly_logs ENABLE TRIGGER update_traction_engine_weekly_logs_updated_at;
ALTER TABLE public.traction_engine_weekly_logs ENABLE TRIGGER enforce_traction_platform_verification;

-- ── Unique per project, not per account ─────────────────────────────────────
ALTER TABLE public.journey_assumptions DROP CONSTRAINT IF EXISTS journey_assumptions_user_id_fingerprint_key;
DROP INDEX IF EXISTS public.journey_assumptions_user_id_fingerprint_key;
ALTER TABLE public.journey_assumptions DROP CONSTRAINT IF EXISTS journey_assumptions_project_fingerprint_key;
ALTER TABLE public.journey_assumptions
  ADD CONSTRAINT journey_assumptions_project_fingerprint_key UNIQUE NULLS NOT DISTINCT (user_id, project_id, fingerprint);

ALTER TABLE public.traction_engine_weekly_logs DROP CONSTRAINT IF EXISTS traction_engine_weekly_logs_user_id_week_start_date_key;
DROP INDEX IF EXISTS public.traction_engine_weekly_logs_user_id_week_start_date_key;
ALTER TABLE public.traction_engine_weekly_logs DROP CONSTRAINT IF EXISTS traction_engine_weekly_logs_project_week_key;
ALTER TABLE public.traction_engine_weekly_logs
  ADD CONSTRAINT traction_engine_weekly_logs_project_week_key UNIQUE NULLS NOT DISTINCT (user_id, project_id, week_start_date);

-- ── Saving a week: the app names the project ────────────────────────────────
-- Same as 20261122100000 plus p_log.project_id and the per-project week.
CREATE OR REPLACE FUNCTION public.save_traction_week(p_log jsonb, p_experiments jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_log_id uuid;
  v_project uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF jsonb_typeof(p_experiments) IS DISTINCT FROM 'array' OR jsonb_array_length(p_experiments) = 0 THEN
    RAISE EXCEPTION 'A week needs at least one experiment';
  END IF;
  IF COALESCE(p_log->>'project_id', '') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    v_project := (p_log->>'project_id')::uuid;
  END IF;

  -- project_id is checked (owner) or filled (last project) by
  -- a_assign_evidence_project before the conflict check.
  INSERT INTO public.traction_engine_weekly_logs (
    user_id, project_id, week_start_date, new_users, seven_day_active_users, thirty_day_active_users,
    primary_acquisition_channel, product_category, revenue, combined_score, consistency_score,
    channel_efficiency_score, experiment_quality_score, retention_health_score,
    consistency_streak_weeks, channel_quality_signal, prioritized_recommendation,
    phase_seven_ready, score_breakdown, verification_mode, calculation_version
  ) VALUES (
    v_user_id,
    v_project,
    (p_log->>'week_start_date')::date,
    COALESCE((p_log->>'new_users')::integer, 0),
    COALESCE((p_log->>'seven_day_active_users')::integer, 0),
    COALESCE((p_log->>'thirty_day_active_users')::integer, 0),
    COALESCE(p_log->>'primary_acquisition_channel', ''),
    COALESCE(p_log->>'product_category', 'other'),
    NULLIF(p_log->>'revenue', '')::numeric,
    COALESCE((p_log->>'combined_score')::integer, 0),
    COALESCE((p_log->>'consistency_score')::integer, 0),
    COALESCE((p_log->>'channel_efficiency_score')::integer, 0),
    COALESCE((p_log->>'experiment_quality_score')::integer, 0),
    COALESCE((p_log->>'retention_health_score')::integer, 0),
    COALESCE((p_log->>'consistency_streak_weeks')::integer, 0),
    COALESCE(p_log->>'channel_quality_signal', ''),
    COALESCE(p_log->>'prioritized_recommendation', ''),
    COALESCE((p_log->>'phase_seven_ready')::boolean, false),
    COALESCE(p_log->'score_breakdown', '{}'::jsonb),
    COALESCE(p_log->>'verification_mode', 'founder_reported'),
    COALESCE((p_log->>'calculation_version')::integer, 1)
  )
  ON CONFLICT (user_id, project_id, week_start_date) DO UPDATE SET
    new_users = EXCLUDED.new_users,
    seven_day_active_users = EXCLUDED.seven_day_active_users,
    thirty_day_active_users = EXCLUDED.thirty_day_active_users,
    primary_acquisition_channel = EXCLUDED.primary_acquisition_channel,
    product_category = EXCLUDED.product_category,
    revenue = EXCLUDED.revenue,
    combined_score = EXCLUDED.combined_score,
    consistency_score = EXCLUDED.consistency_score,
    channel_efficiency_score = EXCLUDED.channel_efficiency_score,
    experiment_quality_score = EXCLUDED.experiment_quality_score,
    retention_health_score = EXCLUDED.retention_health_score,
    consistency_streak_weeks = EXCLUDED.consistency_streak_weeks,
    channel_quality_signal = EXCLUDED.channel_quality_signal,
    prioritized_recommendation = EXCLUDED.prioritized_recommendation,
    phase_seven_ready = EXCLUDED.phase_seven_ready,
    score_breakdown = EXCLUDED.score_breakdown,
    verification_mode = EXCLUDED.verification_mode,
    calculation_version = EXCLUDED.calculation_version,
    updated_at = now()
  RETURNING id INTO v_log_id;

  DELETE FROM public.traction_engine_experiments
  WHERE weekly_log_id = v_log_id AND user_id = v_user_id;

  INSERT INTO public.traction_engine_experiments (
    user_id, weekly_log_id, sprint_id, channel, hypothesis, action_taken, target_metric,
    target_value, result_value, time_invested_hours, decision, recommended_decision,
    override_rationale, assumption_fingerprint, assumption_status, pass, efficiency_score,
    quality_score, sample_size, value_form
  )
  SELECT
    v_user_id, v_log_id, sprint.id,
    e->>'channel', e->>'hypothesis', e->>'action_taken', e->>'target_metric',
    COALESCE((e->>'target_value')::numeric, 0),
    COALESCE((e->>'result_value')::numeric, 0),
    COALESCE((e->>'time_invested_hours')::numeric, 0),
    e->>'decision', e->>'recommended_decision', e->>'override_rationale',
    e->>'assumption_fingerprint', e->>'assumption_status',
    COALESCE((e->>'pass')::boolean, false),
    COALESCE((e->>'efficiency_score')::integer, 0),
    COALESCE((e->>'quality_score')::integer, 0),
    NULLIF(e->>'sample_size', '')::numeric,
    CASE WHEN e->>'value_form' IN ('fix', 'protect', 'save', 'identity', 'pleasure', 'belonging', 'growth')
      THEN e->>'value_form' END
  FROM jsonb_array_elements(p_experiments) AS e
  LEFT JOIN public.traction_engine_sprints sprint
    ON sprint.id = NULLIF(e->>'sprint_id', '')::uuid AND sprint.user_id = v_user_id;

  RETURN v_log_id;
END;
$function$;

-- ── The ledger: a channel result without a sprint still has a project ──────
-- Same as 20261123100000, with the week's project as the fallback.
CREATE OR REPLACE FUNCTION public.ledger_from_traction_experiment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_project uuid;
  v_log_project uuid;
  v_verified boolean := false;
  v_channel text := lower(left(regexp_replace(btrim(COALESCE(NEW.channel, '')), '[^A-Za-z0-9 _.&+-]', '', 'g'), 60));
BEGIN
  IF NEW.result_value IS NULL OR v_channel = '' THEN
    RETURN NEW;
  END IF;
  SELECT s.project_id INTO v_project FROM public.traction_engine_sprints s WHERE s.id = NEW.sprint_id;
  SELECT (l.verification_mode = 'platform_verified'), l.project_id
    INTO v_verified, v_log_project
    FROM public.traction_engine_weekly_logs l WHERE l.id = NEW.weekly_log_id;
  PERFORM public.record_project_memory(NEW.user_id, COALESCE(v_project, v_log_project), 'channel_result:' || v_channel, 'fact',
    NEW.channel || ': ' || COALESCE(NULLIF(btrim(NEW.target_metric), ''), 'result') || ' ' || trim_scale(NEW.result_value)::text
      || COALESCE(' against a target of ' || trim_scale(NEW.target_value)::text, '')
      || COALESCE(' (' || NULLIF(btrim(NEW.decision), '') || ')', ''),
    'traction_engine', NEW.id::text, CASE WHEN v_verified THEN 'verified' ELSE 'founder_reported' END);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[ledger_from_traction_experiment] skipped: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- ── Grants ──────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.journey_artifact_project(uuid, text, text, text, uuid), public.assign_evidence_project()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_traction_week(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_traction_week(jsonb, jsonb) TO authenticated;
