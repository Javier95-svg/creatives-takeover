-- Demo Studio enhancement: richer guided steps, VSL labels/hooks, launch publish gate.

ALTER TABLE public.demo_studio_demo_steps
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS speaker_notes TEXT;

ALTER TABLE public.demo_studio_vsls
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS hook TEXT;

UPDATE public.demo_studio_demo_steps
  SET title = 'Step ' || (position + 1)::text
  WHERE title IS NULL;

CREATE OR REPLACE FUNCTION public.demo_studio_enforce_launch_publish_ready()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.launch_published = true AND COALESCE(OLD.launch_published, false) = false THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.demo_studio_demos d
      WHERE d.project_id = NEW.id
        AND d.status = 'published'
    ) THEN
      RAISE EXCEPTION 'A launch page needs at least one published demo';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.demo_studio_vsls v
      WHERE v.project_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'A launch page needs at least one VSL';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demo_studio_launch_publish_ready ON public.demo_studio_projects;
CREATE TRIGGER demo_studio_launch_publish_ready
  BEFORE UPDATE OF launch_published ON public.demo_studio_projects
  FOR EACH ROW EXECUTE FUNCTION public.demo_studio_enforce_launch_publish_ready();

COMMENT ON COLUMN public.demo_studio_events.type IS
  'demo_view | demo_step | launch_page_view | vsl_impression | vsl_play | vsl_complete | signup | waitlist_signup';
