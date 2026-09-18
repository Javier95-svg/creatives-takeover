-- One outcome per project.
--
-- Each project carries exactly one current output from each of the six staged
-- tools: ICP draft, demo, PMF result, MVP build, GTM plan, traction sprint.
-- Fundraising is deliberately excluded; it depends on manual search rather than
-- a generated deliverable, and reads the other six as context instead.
--
-- Starting point: the projects table existed but was empty and referenced
-- nowhere, and none of the tool tables had a project_id. They were keyed to
-- user_id alone, so a founder accumulated parallel attempts with nothing tying
-- them together. 22 users hold 34 ICP drafts; seven of them hold more than one.
--
-- Model, as decided:
--   - Regenerating replaces the current outcome. The previous one is kept with
--     superseded_at set, so progress stays visible and Pulse still reads exactly
--     one current result per tool.
--   - Discipline comes from the project limit, not from freezing a first draft.
--   - Pulse reads one project at a time. project_id is what makes that possible.

-- 1. Projects become a real, owned, limited entity -----------------------------

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS projects_user_active_idx
  ON public.projects (user_id)
  WHERE archived_at IS NULL;

-- Rookie and Starter stay on a single project. Rising and Pro get room to run
-- ventures side by side. Archived projects do not count, which is the exit for
-- someone who genuinely abandoned one.
CREATE OR REPLACE FUNCTION public.project_limit_for_plan(p_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $function$
  SELECT CASE lower(btrim(coalesce(p_plan, '')))
    WHEN 'rising' THEN 3
    WHEN 'pro' THEN 5
    ELSE 1
  END;
$function$;

COMMENT ON FUNCTION public.project_limit_for_plan(text) IS
  'Active projects allowed per plan: rookie 1, starter 1, rising 3, pro 5.';

CREATE OR REPLACE FUNCTION public.enforce_project_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer;
  v_active integer;
BEGIN
  -- Only a new active project consumes a slot. Un-archiving is also a create
  -- for this purpose, which is why the UPDATE case is covered too.
  IF NEW.archived_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.archived_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT public.project_limit_for_plan(p.subscription_tier)
  INTO v_limit
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  v_limit := COALESCE(v_limit, 1);

  SELECT count(*) INTO v_active
  FROM public.projects
  WHERE user_id = NEW.user_id
    AND archived_at IS NULL
    AND id <> NEW.id;

  IF v_active >= v_limit THEN
    RAISE EXCEPTION 'PROJECT_LIMIT_REACHED: this plan allows % active project(s). Archive one or upgrade.', v_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS projects_enforce_limit ON public.projects;
CREATE TRIGGER projects_enforce_limit
BEFORE INSERT OR UPDATE OF archived_at ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.enforce_project_limit();

-- 2. Tool outputs belong to a project -----------------------------------------

ALTER TABLE public.icp_analysis_results    ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.icp_analysis_results    ADD COLUMN IF NOT EXISTS superseded_at timestamptz;
ALTER TABLE public.pmf_analysis_results    ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.pmf_analysis_results    ADD COLUMN IF NOT EXISTS superseded_at timestamptz;
ALTER TABLE public.gtm_plans               ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.gtm_plans               ADD COLUMN IF NOT EXISTS superseded_at timestamptz;
ALTER TABLE public.mvp_projects            ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.mvp_projects            ADD COLUMN IF NOT EXISTS superseded_at timestamptz;
ALTER TABLE public.traction_engine_sprints ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.traction_engine_sprints ADD COLUMN IF NOT EXISTS superseded_at timestamptz;
ALTER TABLE public.demo_studio_projects    ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.demo_studio_projects    ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

-- 3. Backfill: one project per founder, newest output of each tool is current --

WITH owners AS (
  SELECT user_id FROM public.icp_analysis_results WHERE user_id IS NOT NULL
  UNION SELECT user_id FROM public.pmf_analysis_results WHERE user_id IS NOT NULL
  UNION SELECT user_id FROM public.gtm_plans WHERE user_id IS NOT NULL
  UNION SELECT user_id FROM public.mvp_projects WHERE user_id IS NOT NULL
  UNION SELECT user_id FROM public.traction_engine_sprints WHERE user_id IS NOT NULL
  UNION SELECT owner_id FROM public.demo_studio_projects WHERE owner_id IS NOT NULL
)
INSERT INTO public.projects (user_id, title, idea_summary, status)
SELECT o.user_id,
       COALESCE(NULLIF(btrim(p.startup_name), ''), 'My project'),
       NULLIF(btrim(p.startup_description), ''),
       'active'
FROM owners o
JOIN public.profiles p ON p.id = o.user_id
WHERE NOT EXISTS (SELECT 1 FROM public.projects existing WHERE existing.user_id = o.user_id);

COMMENT ON COLUMN public.projects.archived_at IS
  'Archived projects keep their outcomes but release the plan slot.';
