-- Which earlier results each result was built on (project memory plan, phase 3, 2026-11-23).
--
-- Nothing noticed when an earlier result changed: an MVP built on an old ICP,
-- or a GTM plan made before the PMF verdict, looked as current as ever. Now:
--
-- 1. Each downstream result stores source_versions: the ids of the project's
--    current results it was built on, at the moment it was made.
--      demo page  <- ICP          PMF result <- ICP, demo page
--      MVP        <- ICP, PMF     GTM plan   <- ICP, PMF, MVP
--      traction sprint <- GTM plan
--    A trigger stamps it on save (after the project is assigned). Where the
--    row already names its source (a PMF evidence case's ICP, a demo's source
--    ICP, a sprint's GTM plan) that id wins over "the current one".
-- 2. project_outcome_freshness(project) tells the app which current results
--    were built on something that has since changed.
-- 3. keep_outcome_sources(tool, id) is the founder's "Keep as is": it
--    re-stamps the result with today's sources, so the notice goes away.
-- 4. Current results are stamped once now (from their named source when they
--    have one, else treated as up to date).

ALTER TABLE public.demo_studio_projects    ADD COLUMN IF NOT EXISTS source_versions jsonb;
ALTER TABLE public.pmf_analysis_results    ADD COLUMN IF NOT EXISTS source_versions jsonb;
ALTER TABLE public.mvp_projects            ADD COLUMN IF NOT EXISTS source_versions jsonb;
ALTER TABLE public.gtm_plans               ADD COLUMN IF NOT EXISTS source_versions jsonb;
ALTER TABLE public.traction_engine_sprints ADD COLUMN IF NOT EXISTS source_versions jsonb;

-- The project's current result per tool.
CREATE OR REPLACE FUNCTION public.current_outcome_ids(p_project uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'icp',  (SELECT r.id FROM public.icp_analysis_results r WHERE r.project_id = p_project AND r.superseded_at IS NULL LIMIT 1),
    'pmf',  (SELECT r.id FROM public.pmf_analysis_results r WHERE r.project_id = p_project AND r.superseded_at IS NULL LIMIT 1),
    'demo', (SELECT r.id FROM public.demo_studio_projects r WHERE r.project_id = p_project AND r.superseded_at IS NULL LIMIT 1),
    'mvp',  (SELECT r.id FROM public.mvp_projects r WHERE r.project_id = p_project AND r.superseded_at IS NULL LIMIT 1),
    'gtm',  (SELECT r.id FROM public.gtm_plans r WHERE r.project_id = p_project AND r.superseded_at IS NULL LIMIT 1)
  ))
$$;

-- The stamp for one result: each source key, from the row's named source when
-- it has one, else the project's current result.
CREATE OR REPLACE FUNCTION public.outcome_sources_for(p_project uuid, p_keys text[], p_row jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current jsonb := public.current_outcome_ids(p_project);
  v_named jsonb := jsonb_strip_nulls(jsonb_build_object(
    'icp', COALESCE(p_row ->> 'icp_analysis_id', p_row ->> 'source_icp_analysis_id'),
    'gtm', p_row ->> 'source_gtm_plan_id'));
  v_out jsonb := '{}'::jsonb;
  k text;
BEGIN
  FOREACH k IN ARRAY p_keys LOOP
    v_out := v_out || jsonb_build_object(k, COALESCE(v_named -> k, v_current -> k, 'null'::jsonb));
  END LOOP;
  RETURN v_out || jsonb_build_object('stampedAt', now());
END;
$function$;

CREATE OR REPLACE FUNCTION public.stamp_outcome_sources()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    NEW.source_versions := public.outcome_sources_for(NEW.project_id, TG_ARGV::text[], to_jsonb(NEW));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A stamp problem must never fail the founder's save.
  RAISE LOG '[stamp_outcome_sources] % skipped: %', TG_TABLE_NAME, SQLERRM;
  RETURN NEW;
END;
$function$;

-- "zz_" so these run after the *_claim_project_slot triggers that set project_id
-- (BEFORE triggers on a table fire in name order).
DROP TRIGGER IF EXISTS zz_stamp_outcome_sources ON public.demo_studio_projects;
CREATE TRIGGER zz_stamp_outcome_sources BEFORE INSERT ON public.demo_studio_projects
FOR EACH ROW EXECUTE FUNCTION public.stamp_outcome_sources('icp');

DROP TRIGGER IF EXISTS zz_stamp_outcome_sources ON public.pmf_analysis_results;
CREATE TRIGGER zz_stamp_outcome_sources BEFORE INSERT ON public.pmf_analysis_results
FOR EACH ROW EXECUTE FUNCTION public.stamp_outcome_sources('icp', 'demo');

-- An MVP is rebuilt in place: each new build re-stamps it.
DROP TRIGGER IF EXISTS zz_stamp_outcome_sources ON public.mvp_projects;
CREATE TRIGGER zz_stamp_outcome_sources BEFORE INSERT OR UPDATE OF generated_code, project_files ON public.mvp_projects
FOR EACH ROW EXECUTE FUNCTION public.stamp_outcome_sources('icp', 'pmf');

-- A GTM plan is regenerated in place (new version); weekly reviews do not re-stamp.
DROP TRIGGER IF EXISTS zz_stamp_outcome_sources ON public.gtm_plans;
CREATE TRIGGER zz_stamp_outcome_sources BEFORE INSERT OR UPDATE OF current_version ON public.gtm_plans
FOR EACH ROW EXECUTE FUNCTION public.stamp_outcome_sources('icp', 'pmf', 'mvp');

DROP TRIGGER IF EXISTS zz_stamp_outcome_sources ON public.traction_engine_sprints;
CREATE TRIGGER zz_stamp_outcome_sources BEFORE INSERT ON public.traction_engine_sprints
FOR EACH ROW EXECUTE FUNCTION public.stamp_outcome_sources('gtm');

-- What changed under each current result of a project, for its owner.
-- {"mvp": {"id": "...", "changed": ["icp"]}, ...}; tools with nothing changed have [].
CREATE OR REPLACE FUNCTION public.project_outcome_freshness(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current jsonb;
  v_result jsonb := '{}'::jsonb;
  v_changed jsonb;
  r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = auth.uid()) THEN
    RETURN NULL;
  END IF;
  v_current := public.current_outcome_ids(p_project_id);
  FOR r IN
    SELECT * FROM (
      SELECT 'demo' AS tool, id, source_versions, created_at FROM public.demo_studio_projects WHERE project_id = p_project_id AND superseded_at IS NULL
      UNION ALL SELECT 'pmf', id, source_versions, created_at FROM public.pmf_analysis_results WHERE project_id = p_project_id AND superseded_at IS NULL
      UNION ALL SELECT 'mvp', id, source_versions, created_at FROM public.mvp_projects WHERE project_id = p_project_id AND superseded_at IS NULL
      UNION ALL SELECT 'gtm', id, source_versions, created_at FROM public.gtm_plans WHERE project_id = p_project_id AND superseded_at IS NULL
      UNION ALL SELECT 'traction', id, source_versions, created_at FROM public.traction_engine_sprints WHERE project_id = p_project_id AND superseded_at IS NULL
    ) rows
    ORDER BY created_at
  LOOP
    SELECT COALESCE(jsonb_agg(k ORDER BY k), '[]'::jsonb) INTO v_changed
    FROM jsonb_object_keys(COALESCE(r.source_versions, '{}'::jsonb)) AS k
    WHERE k <> 'stampedAt'
      AND v_current ->> k IS NOT NULL
      AND (r.source_versions ->> k) IS DISTINCT FROM (v_current ->> k);
    -- Several current traction sprints (one per channel): the newest one wins.
    v_result := v_result || jsonb_build_object(r.tool, jsonb_build_object('id', r.id, 'changed', v_changed));
  END LOOP;
  RETURN v_result;
END;
$function$;

-- The founder's "Keep as is": re-stamp one of their results with today's sources.
CREATE OR REPLACE FUNCTION public.keep_outcome_sources(p_tool text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_table text;
  v_owner text;
  v_keys text[];
  v_row jsonb;
BEGIN
  SELECT t.tbl, t.owner_col, t.keys INTO v_table, v_owner, v_keys
  FROM (VALUES
    ('demo', 'demo_studio_projects', 'owner_id', ARRAY['icp']),
    ('pmf', 'pmf_analysis_results', 'user_id', ARRAY['icp', 'demo']),
    ('mvp', 'mvp_projects', 'user_id', ARRAY['icp', 'pmf']),
    ('gtm', 'gtm_plans', 'user_id', ARRAY['icp', 'pmf', 'mvp']),
    ('traction', 'traction_engine_sprints', 'user_id', ARRAY['gtm'])
  ) AS t(tool, tbl, owner_col, keys)
  WHERE t.tool = p_tool;
  IF v_table IS NULL THEN
    RAISE EXCEPTION 'Unknown tool' USING ERRCODE = '22023';
  END IF;
  EXECUTE format('SELECT to_jsonb(r) FROM public.%I r WHERE r.id = $1 AND r.%I = auth.uid()', v_table, v_owner)
    INTO v_row USING p_id;
  IF v_row IS NULL OR v_row ->> 'project_id' IS NULL THEN
    RAISE EXCEPTION 'Result not found' USING ERRCODE = 'P0002';
  END IF;
  -- Kept as is: today's current results become its sources, not the ones it named.
  EXECUTE format('UPDATE public.%I SET source_versions = $1 WHERE id = $2', v_table)
    USING public.outcome_sources_for((v_row ->> 'project_id')::uuid, v_keys, '{}'::jsonb) || jsonb_build_object('keptAt', now()), p_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.current_outcome_ids(uuid), public.outcome_sources_for(uuid, text[], jsonb), public.stamp_outcome_sources()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.project_outcome_freshness(uuid), public.keep_outcome_sources(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.project_outcome_freshness(uuid), public.keep_outcome_sources(text, uuid) TO authenticated;

-- ── One-time stamp of current results ───────────────────────────────────────
UPDATE public.demo_studio_projects r SET source_versions = public.outcome_sources_for(r.project_id, ARRAY['icp'], to_jsonb(r))
WHERE r.project_id IS NOT NULL AND r.superseded_at IS NULL AND r.source_versions IS NULL;
UPDATE public.pmf_analysis_results r SET source_versions = public.outcome_sources_for(r.project_id, ARRAY['icp', 'demo'], to_jsonb(r))
WHERE r.project_id IS NOT NULL AND r.superseded_at IS NULL AND r.source_versions IS NULL;
UPDATE public.mvp_projects r SET source_versions = public.outcome_sources_for(r.project_id, ARRAY['icp', 'pmf'], '{}'::jsonb)
WHERE r.project_id IS NOT NULL AND r.superseded_at IS NULL AND r.source_versions IS NULL;
UPDATE public.gtm_plans r SET source_versions = public.outcome_sources_for(r.project_id, ARRAY['icp', 'pmf', 'mvp'], '{}'::jsonb)
WHERE r.project_id IS NOT NULL AND r.superseded_at IS NULL AND r.source_versions IS NULL;
UPDATE public.traction_engine_sprints r SET source_versions = public.outcome_sources_for(r.project_id, ARRAY['gtm'], to_jsonb(r))
WHERE r.project_id IS NOT NULL AND r.superseded_at IS NULL AND r.source_versions IS NULL;
