-- Demo Studio production v2: project brief, scripts, stronger launch defaults,
-- and richer funnel event vocabulary.

CREATE TABLE IF NOT EXISTS public.demo_studio_briefs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL UNIQUE REFERENCES public.demo_studio_projects(id) ON DELETE CASCADE,
  owner_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audience           TEXT,
  problem            TEXT,
  product_promise    TEXT,
  aha_moment         TEXT,
  primary_cta_label  TEXT DEFAULT 'Get early access',
  primary_cta_url    TEXT,
  tone               TEXT NOT NULL DEFAULT 'conversational',
  product_stage      TEXT NOT NULL DEFAULT 'prototype',
  demo_goal          TEXT NOT NULL DEFAULT 'collect_signups',
  ai_storyboard      JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_vsl_scripts     JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_launch_copy     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_studio_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_studio_briefs_owner_all" ON public.demo_studio_briefs;
CREATE POLICY "demo_studio_briefs_owner_all"
  ON public.demo_studio_briefs FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS demo_studio_briefs_project_idx ON public.demo_studio_briefs (project_id);
CREATE INDEX IF NOT EXISTS demo_studio_briefs_owner_idx ON public.demo_studio_briefs (owner_id);

DROP TRIGGER IF EXISTS demo_studio_briefs_touch ON public.demo_studio_briefs;
CREATE TRIGGER demo_studio_briefs_touch
  BEFORE UPDATE ON public.demo_studio_briefs
  FOR EACH ROW EXECUTE FUNCTION public.demo_studio_touch_updated_at();

ALTER TABLE public.demo_studio_vsls
  ADD COLUMN IF NOT EXISTS script TEXT,
  ADD COLUMN IF NOT EXISTS script_outline JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_duration_seconds INTEGER;

ALTER TABLE public.demo_studio_launch_pages
  ALTER COLUMN cta_label SET DEFAULT 'Get early access';

UPDATE public.demo_studio_launch_pages
  SET cta_label = 'Get early access'
  WHERE cta_label = 'Join the waitlist';

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
        AND (
          v.loom_embed_url IS NOT NULL
          OR v.loom_shared_url IS NOT NULL
          OR v.video_url IS NOT NULL
        )
    ) THEN
      RAISE EXCEPTION 'A launch page needs at least one recorded or attached VSL';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.demo_studio_events.type IS
  'demo_view | demo_start | demo_complete | demo_step | launch_page_view | vsl_impression | vsl_play | vsl_complete | cta_click | signup_attempt | signup | waitlist_signup';
