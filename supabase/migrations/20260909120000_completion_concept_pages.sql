-- Additive: existing demos, waitlists, URLs and submissions remain intact.
ALTER TABLE public.prebuild_validation_contexts ADD COLUMN IF NOT EXISTS recruitment_draft text;
CREATE OR REPLACE FUNCTION public.demo_studio_enforce_launch_publish_ready()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.launch_published = true AND COALESCE(OLD.launch_published, false) = false THEN
    IF EXISTS (
      SELECT 1 FROM public.demo_studio_launch_pages l
      WHERE l.project_id = NEW.id AND l.owner_id = NEW.owner_id
        AND l.theme->>'conceptTest' = 'true'
        AND length(trim(l.headline)) > 0
        AND length(trim(l.subheadline)) > 0
        AND length(trim(l.cta_label)) > 0
    ) THEN
      IF NULLIF(trim(NEW.slug), '') IS NULL THEN
        RAISE EXCEPTION 'Set a public slug before publishing';
      END IF;
      RETURN NEW;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.demo_studio_demos d WHERE d.project_id = NEW.id AND d.status = 'published') THEN
      RAISE EXCEPTION 'A launch page needs a complete concept page or a published demo';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.demo_studio_vsls v WHERE v.project_id = NEW.id
      AND (v.loom_embed_url IS NOT NULL OR v.loom_shared_url IS NOT NULL OR v.video_url IS NOT NULL)) THEN
      RAISE EXCEPTION 'A product demo launch page needs a recorded or attached VSL';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demo_studio_launch_publish_ready ON public.demo_studio_projects;
CREATE TRIGGER demo_studio_launch_publish_ready
  BEFORE UPDATE OF launch_published ON public.demo_studio_projects
  FOR EACH ROW EXECUTE FUNCTION public.demo_studio_enforce_launch_publish_ready();

-- One transaction creates all editable inputs. Retries from the same ICP resume
-- the existing project without overwriting any founder edits. No credit charge.
CREATE OR REPLACE FUNCTION public.start_completion_concept_v1(
  p_icp_id uuid, p_context_id uuid, p_name text, p_tagline text,
  p_audience text, p_problem text, p_promise text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
  project public.demo_studio_projects;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Sign in to save your concept'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.icp_analysis_results WHERE id = p_icp_id AND user_id = actor)
    OR NOT EXISTS (SELECT 1 FROM public.prebuild_validation_contexts WHERE id = p_context_id AND user_id = actor AND icp_analysis_id = p_icp_id)
  THEN RAISE EXCEPTION 'The selected ICP and context do not belong to this account'; END IF;
  IF NULLIF(trim(p_name), '') IS NULL THEN RAISE EXCEPTION 'Name your concept'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text || ':' || p_context_id::text, 0));
  SELECT p.* INTO project FROM public.demo_studio_projects p
    JOIN public.demo_studio_launch_pages l ON l.project_id = p.id
    WHERE p.owner_id = actor AND p.validation_context_id = p_context_id
      AND p.source_icp_analysis_id = p_icp_id AND l.theme->>'conceptTest' = 'true'
    ORDER BY p.created_at LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(project); END IF;
  INSERT INTO public.demo_studio_projects(owner_id, name, tagline, validation_context_id, source_icp_analysis_id)
    VALUES(actor, left(trim(p_name), 160), left(p_tagline, 1000), p_context_id, p_icp_id) RETURNING * INTO project;
  INSERT INTO public.demo_studio_briefs(project_id, owner_id, audience, problem, product_promise, product_stage, demo_goal, primary_cta_label)
    VALUES(project.id, actor, p_audience, p_problem, p_promise, 'idea', 'collect_signups', 'Join the interest list');
  INSERT INTO public.demo_studio_launch_pages(project_id, owner_id, headline, subheadline, cta_label, theme)
    VALUES(project.id, actor, project.name, COALESCE(NULLIF(p_promise, ''), p_tagline), 'Join the interest list',
      '{"conceptTest":true,"background":"dark","successMessage":"Thank you for your interest. This concept is still being tested."}'::jsonb);
  RETURN to_jsonb(project);
END;
$$;
REVOKE ALL ON FUNCTION public.start_completion_concept_v1(uuid,uuid,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_completion_concept_v1(uuid,uuid,text,text,text,text,text) TO authenticated;
