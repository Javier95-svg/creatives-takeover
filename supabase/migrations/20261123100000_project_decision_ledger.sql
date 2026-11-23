-- Project decision ledger (project memory plan, phase 2, 2026-11-23).
--
-- pulse_memories held only what founders saved from Pulse chat (0 rows in
-- production). It becomes the project's decision history:
--
-- 1. Each entry can have a topic (target_customer, problem, positioning, ...),
--    a source (pulse, onboarding, or the tool that produced it), the result it
--    came from, and an evidence level (assumption, founder_reported, verified).
-- 2. Saving a result in a tool records it automatically, by trigger, whatever
--    path did the save: ICP saved, PMF scored, demo page published, MVP
--    published, GTM plan saved (positioning and channels), traction result
--    logged, and the onboarding idea, goal and blocker.
-- 3. A reconciling trigger keeps the history honest:
--    - the same statement on a topic is not stored twice;
--    - a newer entry from the same side replaces the older one, which is kept
--      as "superseded" and points to its replacement (superseded_by);
--    - when a tool's result disagrees with the founder's own call on the same
--      topic (or the other way round), the newcomer is stored as
--      "needs_review" and nothing is overwritten until the founder chooses
--      (resolve_pulse_memory_conflict).
--    "The founder's side" is Pulse, onboarding and manual entries; "the tools'
--    side" is everything a tool recorded.
-- 4. Current results are backfilled once, so existing projects start with
--    their history.
--
-- Only "active" entries reach Pulse and the tool prompts; "needs_review"
-- waits for the founder and "superseded" is history.

-- ── Columns and rules ───────────────────────────────────────────────────────
ALTER TABLE public.pulse_memories ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE public.pulse_memories ADD COLUMN IF NOT EXISTS source_tool text;
ALTER TABLE public.pulse_memories ADD COLUMN IF NOT EXISTS source_artifact_id text;
ALTER TABLE public.pulse_memories ADD COLUMN IF NOT EXISTS evidence text;
ALTER TABLE public.pulse_memories ADD COLUMN IF NOT EXISTS superseded_by uuid;

ALTER TABLE public.pulse_memories DROP CONSTRAINT IF EXISTS pulse_memories_status_check;
ALTER TABLE public.pulse_memories ADD CONSTRAINT pulse_memories_status_check
  CHECK (status = ANY (ARRAY['active', 'done', 'dropped', 'superseded', 'needs_review']));

ALTER TABLE public.pulse_memories DROP CONSTRAINT IF EXISTS pulse_memories_topic_check;
ALTER TABLE public.pulse_memories ADD CONSTRAINT pulse_memories_topic_check
  CHECK (topic IS NULL OR topic ~ '^(idea|goal|blocker|target_customer|problem|positioning|offer|product_scope|channel|pricing|pmf_finding|channel_result)(:[a-z0-9 _.&+-]{1,60})?$');

ALTER TABLE public.pulse_memories DROP CONSTRAINT IF EXISTS pulse_memories_source_tool_check;
ALTER TABLE public.pulse_memories ADD CONSTRAINT pulse_memories_source_tool_check
  CHECK (source_tool IS NULL OR source_tool = ANY (ARRAY['pulse', 'onboarding', 'founder', 'icp_builder', 'pmf_lab', 'demo_studio', 'mvp_builder', 'gtm_strategist', 'traction_engine']));

ALTER TABLE public.pulse_memories DROP CONSTRAINT IF EXISTS pulse_memories_evidence_check;
ALTER TABLE public.pulse_memories ADD CONSTRAINT pulse_memories_evidence_check
  CHECK (evidence IS NULL OR evidence = ANY (ARRAY['assumption', 'founder_reported', 'verified']));

ALTER TABLE public.pulse_memories DROP CONSTRAINT IF EXISTS pulse_memories_source_artifact_id_check;
ALTER TABLE public.pulse_memories ADD CONSTRAINT pulse_memories_source_artifact_id_check
  CHECK (source_artifact_id IS NULL OR char_length(source_artifact_id) <= 64);

-- Deferred: the reconciling trigger points older rows at the new row before
-- that row exists, within the same statement.
ALTER TABLE public.pulse_memories DROP CONSTRAINT IF EXISTS pulse_memories_superseded_by_fkey;
ALTER TABLE public.pulse_memories ADD CONSTRAINT pulse_memories_superseded_by_fkey
  FOREIGN KEY (superseded_by) REFERENCES public.pulse_memories(id) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX IF NOT EXISTS pulse_memories_current_topic_idx
  ON public.pulse_memories (user_id, project_id, topic)
  WHERE topic IS NOT NULL AND status IN ('active', 'needs_review');

-- ── Reconciling trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pulse_memory_is_founder_source(p_source text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$ SELECT p_source IS NULL OR p_source = ANY (ARRAY['pulse', 'onboarding', 'founder']) $$;

CREATE OR REPLACE FUNCTION public.reconcile_pulse_memory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_same uuid;
  v_conflict boolean;
  v_new_side boolean := public.pulse_memory_is_founder_source(NEW.source_tool);
BEGIN
  IF NEW.topic IS NULL OR NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  -- The same statement is already current on this topic: refresh, don't duplicate.
  SELECT id INTO v_same
  FROM public.pulse_memories
  WHERE user_id = NEW.user_id
    AND project_id IS NOT DISTINCT FROM NEW.project_id
    AND topic = NEW.topic
    AND status IN ('active', 'needs_review')
    AND lower(regexp_replace(btrim(text), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(NEW.text), '\s+', ' ', 'g'))
  LIMIT 1;
  IF v_same IS NOT NULL THEN
    UPDATE public.pulse_memories
    SET updated_at = now(),
        source_artifact_id = COALESCE(NEW.source_artifact_id, source_artifact_id),
        evidence = COALESCE(NEW.evidence, evidence)
    WHERE id = v_same;
    RETURN NULL;
  END IF;

  -- The other side holds a current, different entry on this topic: ask the founder.
  SELECT EXISTS (
    SELECT 1 FROM public.pulse_memories
    WHERE user_id = NEW.user_id
      AND project_id IS NOT DISTINCT FROM NEW.project_id
      AND topic = NEW.topic
      AND status = 'active'
      AND public.pulse_memory_is_founder_source(source_tool) <> v_new_side
  ) INTO v_conflict;

  -- Same side: the newer entry replaces the older one, which stays as history.
  UPDATE public.pulse_memories
  SET status = 'superseded', superseded_by = NEW.id, updated_at = now()
  WHERE user_id = NEW.user_id
    AND project_id IS NOT DISTINCT FROM NEW.project_id
    AND topic = NEW.topic
    AND status IN ('active', 'needs_review')
    AND public.pulse_memory_is_founder_source(source_tool) = v_new_side;

  IF v_conflict THEN
    NEW.status := 'needs_review';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pulse_memories_reconcile ON public.pulse_memories;
CREATE TRIGGER pulse_memories_reconcile
BEFORE INSERT ON public.pulse_memories
FOR EACH ROW EXECUTE FUNCTION public.reconcile_pulse_memory();

-- The founder picks which entry stands; the others become history.
CREATE OR REPLACE FUNCTION public.resolve_pulse_memory_conflict(p_keep_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.pulse_memories;
BEGIN
  SELECT * INTO v_row FROM public.pulse_memories WHERE id = p_keep_id AND user_id = auth.uid();
  IF NOT FOUND OR v_row.topic IS NULL THEN
    RAISE EXCEPTION 'Memory not found' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.pulse_memories
  SET status = 'superseded', superseded_by = p_keep_id, updated_at = now()
  WHERE user_id = v_row.user_id
    AND project_id IS NOT DISTINCT FROM v_row.project_id
    AND topic = v_row.topic
    AND status IN ('active', 'needs_review')
    AND id <> p_keep_id;
  UPDATE public.pulse_memories SET status = 'active', updated_at = now() WHERE id = p_keep_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_pulse_memory_conflict(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_pulse_memory_conflict(uuid) TO authenticated;

-- ── Recording from tools (server only) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_project_memory(
  p_user uuid, p_project uuid, p_topic text, p_kind text, p_text text,
  p_source text, p_artifact text, p_evidence text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_text text := left(btrim(regexp_replace(COALESCE(p_text, ''), '\s+', ' ', 'g')), 280);
BEGIN
  IF p_user IS NULL OR char_length(v_text) < 3 THEN
    RETURN;
  END IF;
  INSERT INTO public.pulse_memories (user_id, project_id, kind, text, topic, source_tool, source_artifact_id, evidence)
  VALUES (p_user, p_project, p_kind, v_text, p_topic, p_source, left(p_artifact, 64), p_evidence);
EXCEPTION WHEN OTHERS THEN
  -- A ledger problem must never fail the founder's save.
  RAISE LOG '[record_project_memory] % skipped: %', p_topic, SQLERRM;
END;
$function$;

-- Takes a user id, so it is never callable from the browser.
REVOKE ALL ON FUNCTION public.record_project_memory(uuid, uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- ICP saved: who the customer is and their main problem, as hypotheses.
CREATE OR REPLACE FUNCTION public.ledger_from_icp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_customer text := COALESCE(
    NULLIF(btrim(NEW.analysis_data #>> '{draftDocument,decisionBrief,primarySegment}'), ''),
    NULLIF(btrim(NEW.analysis_data #>> '{draftDocument,customer,roleLine}'), ''),
    NULLIF(btrim(NEW.target_audience), ''));
  v_problem text := COALESCE(
    NULLIF(btrim(NEW.analysis_data #>> '{draftDocument,decisionBrief,rankedPains,0,pain}'), ''),
    NULLIF(btrim(NEW.analysis_data #>> '{draftDocument,gatePreview,painLine}'), ''),
    NULLIF(btrim(NEW.analysis_data #>> '{draftDocument,pain,quote}'), ''));
BEGIN
  IF NEW.superseded_at IS NULL THEN
    PERFORM public.record_project_memory(NEW.user_id, NEW.project_id, 'target_customer', 'hypothesis',
      'Target customer: ' || v_customer, 'icp_builder', NEW.id::text, 'assumption');
    PERFORM public.record_project_memory(NEW.user_id, NEW.project_id, 'problem', 'hypothesis',
      'Main problem: ' || v_problem, 'icp_builder', NEW.id::text, 'assumption');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[ledger_from_icp] skipped: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- PMF scored: the verdict and why, as reported evidence.
CREATE OR REPLACE FUNCTION public.ledger_from_pmf()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_decision text := COALESCE(NULLIF(NEW.analysis_data ->> 'decision', ''), NULLIF(NEW.verdict, ''), 'result');
BEGIN
  IF NEW.superseded_at IS NULL THEN
    PERFORM public.record_project_memory(NEW.user_id, NEW.project_id, 'pmf_finding', 'fact',
      'PMF Lab verdict: ' || initcap(v_decision)
        || COALESCE(' (' || round(NEW.pmf_score::numeric)::text || '/100)', '')
        || COALESCE('. ' || NULLIF(btrim(NEW.analysis_data ->> 'summaryInsight'), ''), ''),
      'pmf_lab', NEW.id::text, 'founder_reported');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[ledger_from_pmf] skipped: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Demo page published (or its promise changed while published): the offer.
CREATE OR REPLACE FUNCTION public.ledger_from_demo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.launch_published IS TRUE AND NEW.superseded_at IS NULL
     AND (TG_OP = 'INSERT' OR OLD.launch_published IS DISTINCT FROM NEW.launch_published
          OR OLD.tagline IS DISTINCT FROM NEW.tagline OR OLD.name IS DISTINCT FROM NEW.name) THEN
    PERFORM public.record_project_memory(NEW.owner_id, NEW.project_id, 'offer', 'decision',
      'Published page: ' || NEW.name || COALESCE(' | ' || NULLIF(btrim(NEW.tagline), ''), ''),
      'demo_studio', NEW.id::text, NULL);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[ledger_from_demo] skipped: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- MVP published: what the product does.
CREATE OR REPLACE FUNCTION public.ledger_from_mvp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.deployment_status = 'deployed' AND NEW.superseded_at IS NULL
     AND (TG_OP = 'INSERT' OR OLD.deployment_status IS DISTINCT FROM NEW.deployment_status OR OLD.title IS DISTINCT FROM NEW.title) THEN
    PERFORM public.record_project_memory(NEW.user_id, NEW.project_id, 'product_scope', 'decision',
      'Published MVP: ' || COALESCE(NULLIF(btrim(NEW.title), ''), 'Untitled')
        || COALESCE(' | ' || NULLIF(btrim(NEW.metadata #>> '{setupInput,oneLineDescription}'), ''), ''),
      'mvp_builder', NEW.id::text, NULL);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[ledger_from_mvp] skipped: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- GTM plan saved or regenerated: its positioning.
CREATE OR REPLACE FUNCTION public.ledger_from_gtm_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_positioning text := COALESCE(
    NULLIF(btrim(NEW.plan_content #>> '{positioning,positioningStatement}'), ''),
    NULLIF(btrim(NEW.plan_content #>> '{positioning,uniqueValueProposition}'), ''),
    CASE WHEN jsonb_typeof(NEW.plan_content -> 'positioning') = 'string' THEN NULLIF(btrim(NEW.plan_content ->> 'positioning'), '') END,
    NULLIF(btrim(NEW.plan_content #>> '{messaging,headline}'), ''));
BEGIN
  IF NEW.superseded_at IS NULL AND (TG_OP = 'INSERT' OR OLD.plan_content IS DISTINCT FROM NEW.plan_content) THEN
    PERFORM public.record_project_memory(NEW.user_id, NEW.project_id, 'positioning', 'decision',
      'Positioning: ' || v_positioning, 'gtm_strategist', NEW.id::text, NULL);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[ledger_from_gtm_plan] skipped: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- GTM plays written (one statement per plan version): the chosen channels.
CREATE OR REPLACE FUNCTION public.ledger_from_gtm_plays()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT i.plan_id, string_agg(i.channel_name, ', ' ORDER BY i.rank NULLS LAST) AS channels
    FROM inserted_plays i
    WHERE NULLIF(btrim(i.channel_name), '') IS NOT NULL
    GROUP BY i.plan_id
  LOOP
    PERFORM public.record_project_memory(p.user_id, p.project_id, 'channel', 'decision',
      'Channels: ' || r.channels, 'gtm_strategist', p.id::text, NULL)
    FROM public.gtm_plans p
    WHERE p.id = r.plan_id AND p.superseded_at IS NULL;
  END LOOP;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[ledger_from_gtm_plays] skipped: %', SQLERRM;
  RETURN NULL;
END;
$function$;

-- Traction result logged: per channel, verified when the week's numbers were measured.
CREATE OR REPLACE FUNCTION public.ledger_from_traction_experiment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_project uuid;
  v_verified boolean := false;
  v_channel text := lower(left(regexp_replace(btrim(COALESCE(NEW.channel, '')), '[^A-Za-z0-9 _.&+-]', '', 'g'), 60));
BEGIN
  IF NEW.result_value IS NULL OR v_channel = '' THEN
    RETURN NEW;
  END IF;
  SELECT s.project_id INTO v_project FROM public.traction_engine_sprints s WHERE s.id = NEW.sprint_id;
  SELECT (l.verification_mode = 'platform_verified') INTO v_verified FROM public.traction_engine_weekly_logs l WHERE l.id = NEW.weekly_log_id;
  PERFORM public.record_project_memory(NEW.user_id, v_project, 'channel_result:' || v_channel, 'fact',
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

-- Onboarding, a focus edit or a project import: the idea, goal and blocker,
-- so edits keep their history instead of overwriting it.
CREATE OR REPLACE FUNCTION public.ledger_from_project()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_source text := CASE WHEN COALESCE(NEW.context ->> 'source', 'onboarding') = 'onboarding' THEN 'onboarding' ELSE 'founder' END;
  v_goal text := NULLIF(btrim(replace(NEW.context #>> '{answers,primaryGoal}', '_', ' ')), '');
  v_blocker text := NULLIF(btrim(replace(NEW.context #>> '{answers,blocker}', '_', ' ')), '');
BEGIN
  IF TG_OP = 'INSERT' OR OLD.idea_summary IS DISTINCT FROM NEW.idea_summary THEN
    PERFORM public.record_project_memory(NEW.user_id, NEW.id, 'idea', 'fact',
      'Idea: ' || NULLIF(btrim(NEW.idea_summary), ''), v_source, NEW.id::text, 'founder_reported');
  END IF;
  IF TG_OP = 'INSERT' OR OLD.context IS DISTINCT FROM NEW.context THEN
    PERFORM public.record_project_memory(NEW.user_id, NEW.id, 'goal', 'decision', 'Goal: ' || v_goal, v_source, NEW.id::text, NULL);
    PERFORM public.record_project_memory(NEW.user_id, NEW.id, 'blocker', 'fact', 'Biggest blocker: ' || v_blocker, v_source, NEW.id::text, 'founder_reported');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[ledger_from_project] skipped: %', SQLERRM;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS icp_records_ledger ON public.icp_analysis_results;
CREATE TRIGGER icp_records_ledger AFTER INSERT ON public.icp_analysis_results
FOR EACH ROW EXECUTE FUNCTION public.ledger_from_icp();

DROP TRIGGER IF EXISTS pmf_records_ledger ON public.pmf_analysis_results;
CREATE TRIGGER pmf_records_ledger AFTER INSERT ON public.pmf_analysis_results
FOR EACH ROW EXECUTE FUNCTION public.ledger_from_pmf();

DROP TRIGGER IF EXISTS demo_records_ledger ON public.demo_studio_projects;
CREATE TRIGGER demo_records_ledger AFTER INSERT OR UPDATE OF launch_published, tagline, name ON public.demo_studio_projects
FOR EACH ROW EXECUTE FUNCTION public.ledger_from_demo();

DROP TRIGGER IF EXISTS mvp_records_ledger ON public.mvp_projects;
CREATE TRIGGER mvp_records_ledger AFTER INSERT OR UPDATE OF deployment_status, title ON public.mvp_projects
FOR EACH ROW EXECUTE FUNCTION public.ledger_from_mvp();

DROP TRIGGER IF EXISTS gtm_plan_records_ledger ON public.gtm_plans;
CREATE TRIGGER gtm_plan_records_ledger AFTER INSERT OR UPDATE OF plan_content ON public.gtm_plans
FOR EACH ROW EXECUTE FUNCTION public.ledger_from_gtm_plan();

DROP TRIGGER IF EXISTS gtm_plays_record_ledger ON public.gtm_plays;
CREATE TRIGGER gtm_plays_record_ledger AFTER INSERT ON public.gtm_plays
REFERENCING NEW TABLE AS inserted_plays
FOR EACH STATEMENT EXECUTE FUNCTION public.ledger_from_gtm_plays();

DROP TRIGGER IF EXISTS traction_experiment_records_ledger ON public.traction_engine_experiments;
CREATE TRIGGER traction_experiment_records_ledger AFTER INSERT ON public.traction_engine_experiments
FOR EACH ROW EXECUTE FUNCTION public.ledger_from_traction_experiment();

DROP TRIGGER IF EXISTS project_records_ledger ON public.projects;
CREATE TRIGGER project_records_ledger AFTER INSERT OR UPDATE OF idea_summary, context ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.ledger_from_project();

REVOKE ALL ON FUNCTION public.ledger_from_icp(), public.ledger_from_pmf(), public.ledger_from_demo(), public.ledger_from_mvp(),
  public.ledger_from_gtm_plan(), public.ledger_from_gtm_plays(), public.ledger_from_traction_experiment(), public.ledger_from_project(),
  public.reconcile_pulse_memory() FROM PUBLIC, anon, authenticated;

-- ── One-time backfill of current results ────────────────────────────────────
-- Oldest first, so a project's later entries replace its earlier ones. Skipped
-- when the ledger already holds tool or onboarding entries (this file was run
-- before), so a re-run never brings back an entry the founder ruled out.
DO $backfill$
DECLARE
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM public.pulse_memories WHERE source_tool IS NOT NULL AND source_tool <> 'pulse') THEN
    RAISE NOTICE 'Decision ledger already filled; backfill skipped.';
    RETURN;
  END IF;

  FOR r IN SELECT * FROM public.projects WHERE archived_at IS NULL ORDER BY created_at LOOP
    PERFORM public.record_project_memory(r.user_id, r.id, 'idea', 'fact', 'Idea: ' || NULLIF(btrim(r.idea_summary), ''),
      CASE WHEN COALESCE(r.context ->> 'source', 'onboarding') = 'onboarding' THEN 'onboarding' ELSE 'founder' END, r.id::text, 'founder_reported');
    PERFORM public.record_project_memory(r.user_id, r.id, 'goal', 'decision', 'Goal: ' || NULLIF(btrim(replace(r.context #>> '{answers,primaryGoal}', '_', ' ')), ''),
      CASE WHEN COALESCE(r.context ->> 'source', 'onboarding') = 'onboarding' THEN 'onboarding' ELSE 'founder' END, r.id::text, NULL);
    PERFORM public.record_project_memory(r.user_id, r.id, 'blocker', 'fact', 'Biggest blocker: ' || NULLIF(btrim(replace(r.context #>> '{answers,blocker}', '_', ' ')), ''),
      CASE WHEN COALESCE(r.context ->> 'source', 'onboarding') = 'onboarding' THEN 'onboarding' ELSE 'founder' END, r.id::text, 'founder_reported');
  END LOOP;

  FOR r IN SELECT * FROM public.icp_analysis_results WHERE superseded_at IS NULL AND project_id IS NOT NULL ORDER BY created_at LOOP
    PERFORM public.record_project_memory(r.user_id, r.project_id, 'target_customer', 'hypothesis',
      'Target customer: ' || COALESCE(NULLIF(btrim(r.analysis_data #>> '{draftDocument,decisionBrief,primarySegment}'), ''),
        NULLIF(btrim(r.analysis_data #>> '{draftDocument,customer,roleLine}'), ''), NULLIF(btrim(r.target_audience), '')),
      'icp_builder', r.id::text, 'assumption');
    PERFORM public.record_project_memory(r.user_id, r.project_id, 'problem', 'hypothesis',
      'Main problem: ' || COALESCE(NULLIF(btrim(r.analysis_data #>> '{draftDocument,decisionBrief,rankedPains,0,pain}'), ''),
        NULLIF(btrim(r.analysis_data #>> '{draftDocument,gatePreview,painLine}'), ''), NULLIF(btrim(r.analysis_data #>> '{draftDocument,pain,quote}'), '')),
      'icp_builder', r.id::text, 'assumption');
  END LOOP;

  FOR r IN SELECT * FROM public.pmf_analysis_results WHERE superseded_at IS NULL AND project_id IS NOT NULL ORDER BY created_at LOOP
    PERFORM public.record_project_memory(r.user_id, r.project_id, 'pmf_finding', 'fact',
      'PMF Lab verdict: ' || initcap(COALESCE(NULLIF(r.analysis_data ->> 'decision', ''), NULLIF(r.verdict, ''), 'result'))
        || COALESCE(' (' || round(r.pmf_score::numeric)::text || '/100)', '')
        || COALESCE('. ' || NULLIF(btrim(r.analysis_data ->> 'summaryInsight'), ''), ''),
      'pmf_lab', r.id::text, 'founder_reported');
  END LOOP;

  FOR r IN SELECT * FROM public.demo_studio_projects WHERE superseded_at IS NULL AND launch_published IS TRUE AND project_id IS NOT NULL ORDER BY created_at LOOP
    PERFORM public.record_project_memory(r.owner_id, r.project_id, 'offer', 'decision',
      'Published page: ' || r.name || COALESCE(' | ' || NULLIF(btrim(r.tagline), ''), ''), 'demo_studio', r.id::text, NULL);
  END LOOP;

  FOR r IN SELECT * FROM public.mvp_projects WHERE superseded_at IS NULL AND deployment_status = 'deployed' AND project_id IS NOT NULL ORDER BY created_at LOOP
    PERFORM public.record_project_memory(r.user_id, r.project_id, 'product_scope', 'decision',
      'Published MVP: ' || COALESCE(NULLIF(btrim(r.title), ''), 'Untitled')
        || COALESCE(' | ' || NULLIF(btrim(r.metadata #>> '{setupInput,oneLineDescription}'), ''), ''),
      'mvp_builder', r.id::text, NULL);
  END LOOP;

  FOR r IN SELECT * FROM public.gtm_plans WHERE superseded_at IS NULL AND project_id IS NOT NULL ORDER BY created_at LOOP
    PERFORM public.record_project_memory(r.user_id, r.project_id, 'positioning', 'decision',
      'Positioning: ' || COALESCE(NULLIF(btrim(r.plan_content #>> '{positioning,positioningStatement}'), ''),
        NULLIF(btrim(r.plan_content #>> '{positioning,uniqueValueProposition}'), ''),
        CASE WHEN jsonb_typeof(r.plan_content -> 'positioning') = 'string' THEN NULLIF(btrim(r.plan_content ->> 'positioning'), '') END,
        NULLIF(btrim(r.plan_content #>> '{messaging,headline}'), '')),
      'gtm_strategist', r.id::text, NULL);
  END LOOP;
END
$backfill$;
