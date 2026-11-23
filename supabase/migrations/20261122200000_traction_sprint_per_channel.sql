-- Traction sprints: one current sprint per project AND channel (2026-11-22).
--
-- 20260917160000 gave every tool one current result per project. For Traction
-- that was wrong: a founder runs several channels at once, so starting a second
-- channel marked the first sprint superseded while it was still running, and
-- the project summary lost it. The "one active sprint per channel" rule was
-- also per account, so two startups could not both test the same channel.
--
-- Now: a new sprint supersedes only the same channel's sprint in its project,
-- uniqueness is per project and channel, and project_outcomes reports the
-- newest current sprint. Production had 0 sprints when this was written.

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

  IF TG_TABLE_NAME = 'traction_engine_sprints' THEN
    -- Channels run side by side; only the same channel's sprint is replaced.
    UPDATE public.traction_engine_sprints
    SET superseded_at = now()
    WHERE project_id = NEW.project_id
      AND superseded_at IS NULL
      AND id <> NEW.id
      AND lower(channel) = lower(NEW.channel);
  ELSE
    EXECUTE format(
      'UPDATE public.%I SET superseded_at = now() WHERE project_id = $1 AND superseded_at IS NULL AND id <> $2',
      TG_TABLE_NAME
    ) USING NEW.project_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP INDEX IF EXISTS public.traction_one_current_per_project_idx;
CREATE UNIQUE INDEX IF NOT EXISTS traction_one_current_per_project_channel_idx
  ON public.traction_engine_sprints (project_id, lower(channel))
  WHERE project_id IS NOT NULL AND superseded_at IS NULL;

DROP INDEX IF EXISTS public.traction_engine_sprints_active_channel_idx;
CREATE UNIQUE INDEX IF NOT EXISTS traction_engine_sprints_active_channel_idx
  ON public.traction_engine_sprints (user_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(channel))
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.project_outcomes(p_project_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
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
    'tractionSprintId', (SELECT r.id FROM public.traction_engine_sprints r WHERE r.project_id = p.id AND r.superseded_at IS NULL
                         ORDER BY r.cycle_start_date DESC, r.created_at DESC LIMIT 1),
    'demoProjectId', (SELECT r.id FROM public.demo_studio_projects r WHERE r.project_id = p.id AND r.superseded_at IS NULL)
  )
  FROM public.projects p
  WHERE p.id = p_project_id
    AND (p.user_id = auth.uid() OR auth.uid() IS NULL);
$function$;
