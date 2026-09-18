-- Task 1: make new tool outputs attach to a project and supersede the previous
-- outcome for that stage.
--
-- Done with triggers rather than by editing the six call sites. The rule then
-- holds for every writer, including edge functions, admin scripts and any tool
-- added later, and it cannot drift out of sync with the constraint that already
-- enforces one current outcome per project.
--
-- The supersede runs BEFORE the row is inserted, so the partial unique index
-- only ever sees a single current row and a regenerate never has to fail first.

-- The project a new outcome belongs to: the founder's most recently touched
-- active project, creating one if they have none yet. Someone at their plan
-- limit already has a project, so this never manufactures a slot they cannot
-- have; the limit trigger would refuse it anyway.
CREATE OR REPLACE FUNCTION public.ensure_active_project(p_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_project uuid;
BEGIN
  IF p_user IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_project
  FROM public.projects
  WHERE user_id = p_user AND archived_at IS NULL
  ORDER BY COALESCE(last_run_at, updated_at, created_at) DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_project IS NOT NULL THEN
    RETURN v_project;
  END IF;

  INSERT INTO public.projects (user_id, title, idea_summary, status)
  SELECT p_user,
         COALESCE(NULLIF(btrim(p.startup_name), ''), 'My project'),
         NULLIF(btrim(p.startup_description), ''),
         'active'
  FROM public.profiles p
  WHERE p.id = p_user
  RETURNING id INTO v_project;

  RETURN v_project;
END;
$function$;

COMMENT ON FUNCTION public.ensure_active_project(uuid) IS
  'The founder''s current active project, created on first use. Never bypasses the plan limit, which is enforced separately on insert.';

-- TG_ARGV[0] is the column holding the owner, because demo_studio_projects uses
-- owner_id where the others use user_id.
CREATE OR REPLACE FUNCTION public.claim_project_outcome_slot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_project uuid;
BEGIN
  -- A row inserted as history stays history; only a current outcome claims the
  -- stage, which keeps imports and backfills from disturbing anything.
  IF NEW.superseded_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.project_id IS NULL THEN
    EXECUTE format('SELECT ($1).%I', TG_ARGV[0]) INTO v_owner USING NEW;
    v_project := public.ensure_active_project(v_owner);
    IF v_project IS NULL THEN
      RETURN NEW;
    END IF;
    NEW.project_id := v_project;
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET superseded_at = now() WHERE project_id = $1 AND superseded_at IS NULL AND id <> $2',
    TG_TABLE_NAME
  ) USING NEW.project_id, NEW.id;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.claim_project_outcome_slot() IS
  'Attaches a new tool output to the founder''s active project and retires the previous outcome for that stage.';

DROP TRIGGER IF EXISTS icp_claim_project_slot ON public.icp_analysis_results;
CREATE TRIGGER icp_claim_project_slot
BEFORE INSERT ON public.icp_analysis_results
FOR EACH ROW EXECUTE FUNCTION public.claim_project_outcome_slot('user_id');

DROP TRIGGER IF EXISTS pmf_claim_project_slot ON public.pmf_analysis_results;
CREATE TRIGGER pmf_claim_project_slot
BEFORE INSERT ON public.pmf_analysis_results
FOR EACH ROW EXECUTE FUNCTION public.claim_project_outcome_slot('user_id');

DROP TRIGGER IF EXISTS gtm_claim_project_slot ON public.gtm_plans;
CREATE TRIGGER gtm_claim_project_slot
BEFORE INSERT ON public.gtm_plans
FOR EACH ROW EXECUTE FUNCTION public.claim_project_outcome_slot('user_id');

DROP TRIGGER IF EXISTS mvp_claim_project_slot ON public.mvp_projects;
CREATE TRIGGER mvp_claim_project_slot
BEFORE INSERT ON public.mvp_projects
FOR EACH ROW EXECUTE FUNCTION public.claim_project_outcome_slot('user_id');

DROP TRIGGER IF EXISTS traction_claim_project_slot ON public.traction_engine_sprints;
CREATE TRIGGER traction_claim_project_slot
BEFORE INSERT ON public.traction_engine_sprints
FOR EACH ROW EXECUTE FUNCTION public.claim_project_outcome_slot('user_id');

DROP TRIGGER IF EXISTS demo_claim_project_slot ON public.demo_studio_projects;
CREATE TRIGGER demo_claim_project_slot
BEFORE INSERT ON public.demo_studio_projects
FOR EACH ROW EXECUTE FUNCTION public.claim_project_outcome_slot('owner_id');
