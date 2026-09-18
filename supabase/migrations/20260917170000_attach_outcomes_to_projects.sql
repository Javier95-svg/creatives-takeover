-- Attaches existing tool outputs to their founder's project and enforces the
-- rule: one current outcome per tool per project.
--
-- Where a founder already held several attempts, the newest becomes current and
-- the rest are marked superseded rather than deleted, so the progression stays
-- readable and Pulse still sees exactly one result per tool. Seven of the 22
-- founders with ICP drafts were in that position, one with five.
--
-- The partial unique indexes are what actually hold the rule: a second current
-- row for the same project and tool cannot be written, whatever the application
-- tries. Superseding first and inserting second is the supported way to redo a
-- stage.

-- ICP drafts ------------------------------------------------------------------
UPDATE public.icp_analysis_results r
SET project_id = p.id
FROM public.projects p
WHERE p.user_id = r.user_id AND r.project_id IS NULL;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY project_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.icp_analysis_results
  WHERE project_id IS NOT NULL AND superseded_at IS NULL
)
UPDATE public.icp_analysis_results r
SET superseded_at = now()
FROM ranked
WHERE r.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS icp_one_current_per_project_idx
  ON public.icp_analysis_results (project_id)
  WHERE project_id IS NOT NULL AND superseded_at IS NULL;

-- PMF results -----------------------------------------------------------------
UPDATE public.pmf_analysis_results r
SET project_id = p.id
FROM public.projects p
WHERE p.user_id = r.user_id AND r.project_id IS NULL;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY project_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.pmf_analysis_results
  WHERE project_id IS NOT NULL AND superseded_at IS NULL
)
UPDATE public.pmf_analysis_results r
SET superseded_at = now()
FROM ranked
WHERE r.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS pmf_one_current_per_project_idx
  ON public.pmf_analysis_results (project_id)
  WHERE project_id IS NOT NULL AND superseded_at IS NULL;

-- GTM plans -------------------------------------------------------------------
UPDATE public.gtm_plans r
SET project_id = p.id
FROM public.projects p
WHERE p.user_id = r.user_id AND r.project_id IS NULL;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY project_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.gtm_plans
  WHERE project_id IS NOT NULL AND superseded_at IS NULL
)
UPDATE public.gtm_plans r
SET superseded_at = now()
FROM ranked
WHERE r.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS gtm_one_current_per_project_idx
  ON public.gtm_plans (project_id)
  WHERE project_id IS NOT NULL AND superseded_at IS NULL;

-- MVP builds ------------------------------------------------------------------
UPDATE public.mvp_projects r
SET project_id = p.id
FROM public.projects p
WHERE p.user_id = r.user_id AND r.project_id IS NULL;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY project_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.mvp_projects
  WHERE project_id IS NOT NULL AND superseded_at IS NULL
)
UPDATE public.mvp_projects r
SET superseded_at = now()
FROM ranked
WHERE r.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS mvp_one_current_per_project_idx
  ON public.mvp_projects (project_id)
  WHERE project_id IS NOT NULL AND superseded_at IS NULL;

-- Traction sprints ------------------------------------------------------------
UPDATE public.traction_engine_sprints r
SET project_id = p.id
FROM public.projects p
WHERE p.user_id = r.user_id AND r.project_id IS NULL;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY project_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.traction_engine_sprints
  WHERE project_id IS NOT NULL AND superseded_at IS NULL
)
UPDATE public.traction_engine_sprints r
SET superseded_at = now()
FROM ranked
WHERE r.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS traction_one_current_per_project_idx
  ON public.traction_engine_sprints (project_id)
  WHERE project_id IS NOT NULL AND superseded_at IS NULL;

-- Demos. Owned by owner_id rather than user_id. -------------------------------
UPDATE public.demo_studio_projects r
SET project_id = p.id
FROM public.projects p
WHERE p.user_id = r.owner_id AND r.project_id IS NULL;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY project_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.demo_studio_projects
  WHERE project_id IS NOT NULL AND superseded_at IS NULL
)
UPDATE public.demo_studio_projects r
SET superseded_at = now()
FROM ranked
WHERE r.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS demo_one_current_per_project_idx
  ON public.demo_studio_projects (project_id)
  WHERE project_id IS NOT NULL AND superseded_at IS NULL;

-- One place to read a project's current state, which is what Pulse needs and
-- what keeps "strictly per project" honest rather than a convention.
CREATE OR REPLACE FUNCTION public.project_outcomes(p_project_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'projectId', p.id,
    'title', p.title,
    'archived', p.archived_at IS NOT NULL,
    'icpDraftId', (SELECT r.id FROM public.icp_analysis_results r WHERE r.project_id = p.id AND r.superseded_at IS NULL),
    'pmfResultId', (SELECT r.id FROM public.pmf_analysis_results r WHERE r.project_id = p.id AND r.superseded_at IS NULL),
    'gtmPlanId', (SELECT r.id FROM public.gtm_plans r WHERE r.project_id = p.id AND r.superseded_at IS NULL),
    'mvpProjectId', (SELECT r.id FROM public.mvp_projects r WHERE r.project_id = p.id AND r.superseded_at IS NULL),
    'tractionSprintId', (SELECT r.id FROM public.traction_engine_sprints r WHERE r.project_id = p.id AND r.superseded_at IS NULL),
    'demoProjectId', (SELECT r.id FROM public.demo_studio_projects r WHERE r.project_id = p.id AND r.superseded_at IS NULL)
  )
  FROM public.projects p
  WHERE p.id = p_project_id
    AND (p.user_id = auth.uid() OR auth.uid() IS NULL);
$function$;

REVOKE ALL ON FUNCTION public.project_outcomes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.project_outcomes(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.project_outcomes(uuid) IS
  'The one current outcome per staged tool for a project. Fundraising is excluded by design; it reads these six as context.';
