-- Demo Studio foundation (coexists with the legacy waitlist system).
-- New namespaced tables: demo_studio_* so nothing collides with the live
-- `projects` / `waitlist_signups` tables. All tables are owner-scoped via RLS;
-- published demos / launch pages are publicly readable; signups + events are
-- publicly insertable. See CT-Demo-Studio-Build-Spec.md section 7.

-- ---------------------------------------------------------------------------
-- Helper: touch updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.demo_studio_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. PROJECTS (top-level container a founder owns)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demo_studio_projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  tagline           TEXT,
  logo_url          TEXT,
  category          TEXT,
  slug              TEXT UNIQUE,
  launch_published  BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_studio_projects_owner_all"
  ON public.demo_studio_projects FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Public read of the project shell only for published launch pages (needed by /p/:slug)
CREATE POLICY "demo_studio_projects_public_read_published"
  ON public.demo_studio_projects FOR SELECT
  USING (launch_published = true);

CREATE INDEX IF NOT EXISTS demo_studio_projects_owner_idx ON public.demo_studio_projects (owner_id);
CREATE INDEX IF NOT EXISTS demo_studio_projects_slug_idx ON public.demo_studio_projects (slug);

CREATE TRIGGER demo_studio_projects_touch
  BEFORE UPDATE ON public.demo_studio_projects
  FOR EACH ROW EXECUTE FUNCTION public.demo_studio_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. DEMOS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demo_studio_demos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.demo_studio_projects(id) ON DELETE CASCADE,
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  public_id       TEXT UNIQUE,
  status          TEXT NOT NULL DEFAULT 'draft',   -- 'draft' | 'published'
  capture_method  TEXT NOT NULL DEFAULT 'upload',  -- 'upload' | 'screen' | 'extension'
  theme           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_studio_demos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_studio_demos_owner_all"
  ON public.demo_studio_demos FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "demo_studio_demos_public_read_published"
  ON public.demo_studio_demos FOR SELECT
  USING (status = 'published');

CREATE INDEX IF NOT EXISTS demo_studio_demos_project_idx ON public.demo_studio_demos (project_id);
CREATE INDEX IF NOT EXISTS demo_studio_demos_owner_idx ON public.demo_studio_demos (owner_id);
CREATE INDEX IF NOT EXISTS demo_studio_demos_public_id_idx ON public.demo_studio_demos (public_id);

CREATE TRIGGER demo_studio_demos_touch
  BEFORE UPDATE ON public.demo_studio_demos
  FOR EACH ROW EXECUTE FUNCTION public.demo_studio_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. DEMO STEPS (ordered)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demo_studio_demo_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_id       UUID NOT NULL REFERENCES public.demo_studio_demos(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL DEFAULT 0,
  asset_url     TEXT,
  asset_width   INTEGER,
  asset_height  INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_studio_demo_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_studio_steps_owner_all"
  ON public.demo_studio_demo_steps FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.demo_studio_demos d
    WHERE d.id = demo_id AND d.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.demo_studio_demos d
    WHERE d.id = demo_id AND d.owner_id = auth.uid()
  ));

CREATE POLICY "demo_studio_steps_public_read_published"
  ON public.demo_studio_demo_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.demo_studio_demos d
    WHERE d.id = demo_id AND d.status = 'published'
  ));

CREATE INDEX IF NOT EXISTS demo_studio_steps_demo_idx ON public.demo_studio_demo_steps (demo_id, position);

-- ---------------------------------------------------------------------------
-- 4. HOTSPOTS / ANNOTATIONS (children of a step, normalized 0..1 coords)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demo_studio_demo_hotspots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id        UUID NOT NULL REFERENCES public.demo_studio_demo_steps(id) ON DELETE CASCADE,
  x              NUMERIC NOT NULL,
  y              NUMERIC NOT NULL,
  w              NUMERIC NOT NULL,
  h              NUMERIC NOT NULL,
  type           TEXT NOT NULL DEFAULT 'hotspot',  -- 'hotspot' | 'tooltip' | 'callout'
  label          TEXT,
  action         TEXT NOT NULL DEFAULT 'next',     -- 'next' | 'goto' | 'url'
  action_target  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_studio_demo_hotspots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_studio_hotspots_owner_all"
  ON public.demo_studio_demo_hotspots FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.demo_studio_demo_steps s
    JOIN public.demo_studio_demos d ON d.id = s.demo_id
    WHERE s.id = step_id AND d.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.demo_studio_demo_steps s
    JOIN public.demo_studio_demos d ON d.id = s.demo_id
    WHERE s.id = step_id AND d.owner_id = auth.uid()
  ));

CREATE POLICY "demo_studio_hotspots_public_read_published"
  ON public.demo_studio_demo_hotspots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.demo_studio_demo_steps s
    JOIN public.demo_studio_demos d ON d.id = s.demo_id
    WHERE s.id = step_id AND d.status = 'published'
  ));

CREATE INDEX IF NOT EXISTS demo_studio_hotspots_step_idx ON public.demo_studio_demo_hotspots (step_id);

-- ---------------------------------------------------------------------------
-- 5. VSLs (max 3 per project; Loom URLs + metadata only, never raw video)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demo_studio_vsls (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.demo_studio_projects(id) ON DELETE CASCADE,
  owner_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variation_label   TEXT,
  loom_video_id     TEXT,
  loom_shared_url   TEXT,
  loom_embed_url    TEXT,
  video_url         TEXT,          -- optional self-hosted MP4 fallback (paid tiers)
  thumbnail_url     TEXT,
  duration_seconds  INTEGER,
  is_primary        BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_studio_vsls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_studio_vsls_owner_all"
  ON public.demo_studio_vsls FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Public can read the VSL embedded on a published launch page
CREATE POLICY "demo_studio_vsls_public_read_published"
  ON public.demo_studio_vsls FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.demo_studio_projects p
    WHERE p.id = project_id AND p.launch_published = true
  ));

CREATE INDEX IF NOT EXISTS demo_studio_vsls_project_idx ON public.demo_studio_vsls (project_id);

-- Enforce: at most 3 VSL variations per project
CREATE OR REPLACE FUNCTION public.demo_studio_enforce_max_vsls()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM public.demo_studio_vsls WHERE project_id = NEW.project_id) >= 3 THEN
    RAISE EXCEPTION 'A project can have at most 3 VSL variations';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER demo_studio_vsls_max_3
  BEFORE INSERT ON public.demo_studio_vsls
  FOR EACH ROW EXECUTE FUNCTION public.demo_studio_enforce_max_vsls();

-- Enforce: exactly one primary VSL per project
CREATE OR REPLACE FUNCTION public.demo_studio_enforce_single_primary_vsl()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.demo_studio_vsls
      SET is_primary = false
      WHERE project_id = NEW.project_id
        AND id <> NEW.id
        AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER demo_studio_vsls_single_primary
  BEFORE INSERT OR UPDATE OF is_primary ON public.demo_studio_vsls
  FOR EACH ROW EXECUTE FUNCTION public.demo_studio_enforce_single_primary_vsl();

-- ---------------------------------------------------------------------------
-- 6. LAUNCH PAGE CONFIG (1:1 with project)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demo_studio_launch_pages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL UNIQUE REFERENCES public.demo_studio_projects(id) ON DELETE CASCADE,
  owner_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  headline         TEXT,
  subheadline      TEXT,
  cta_label        TEXT NOT NULL DEFAULT 'Join the waitlist',
  primary_vsl_id   UUID REFERENCES public.demo_studio_vsls(id) ON DELETE SET NULL,
  primary_demo_id  UUID REFERENCES public.demo_studio_demos(id) ON DELETE SET NULL,
  theme            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_studio_launch_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_studio_launch_pages_owner_all"
  ON public.demo_studio_launch_pages FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "demo_studio_launch_pages_public_read_published"
  ON public.demo_studio_launch_pages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.demo_studio_projects p
    WHERE p.id = project_id AND p.launch_published = true
  ));

CREATE TRIGGER demo_studio_launch_pages_touch
  BEFORE UPDATE ON public.demo_studio_launch_pages
  FOR EACH ROW EXECUTE FUNCTION public.demo_studio_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 7. WAITLIST SIGNUPS (public insert against a published launch page)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demo_studio_signups (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES public.demo_studio_projects(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  referrer            TEXT,
  vsl_variation_seen  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_studio_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_studio_signups_public_insert"
  ON public.demo_studio_signups FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.demo_studio_projects p
    WHERE p.id = project_id AND p.launch_published = true
  ));

CREATE POLICY "demo_studio_signups_owner_read"
  ON public.demo_studio_signups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.demo_studio_projects p
    WHERE p.id = project_id AND p.owner_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS demo_studio_signups_project_idx ON public.demo_studio_signups (project_id);

-- ---------------------------------------------------------------------------
-- 8. ANALYTICS EVENTS (public insert, owner read)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demo_studio_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES public.demo_studio_projects(id) ON DELETE CASCADE,
  demo_id     UUID REFERENCES public.demo_studio_demos(id) ON DELETE CASCADE,
  vsl_id      UUID REFERENCES public.demo_studio_vsls(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- 'demo_view' | 'demo_step' | 'vsl_play' | 'vsl_complete' | 'waitlist_signup'
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_studio_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_studio_events_public_insert"
  ON public.demo_studio_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "demo_studio_events_owner_read"
  ON public.demo_studio_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.demo_studio_projects p
    WHERE p.id = project_id AND p.owner_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS demo_studio_events_demo_idx ON public.demo_studio_events (demo_id, type);
CREATE INDEX IF NOT EXISTS demo_studio_events_project_idx ON public.demo_studio_events (project_id, type);

-- ---------------------------------------------------------------------------
-- 9. STORAGE BUCKETS: demo-assets (step images/frames) + vsl-thumbnails
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('demo-assets', 'demo-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vsl-thumbnails', 'vsl-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "demo_studio_assets_public_read" ON storage.objects;
CREATE POLICY "demo_studio_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('demo-assets', 'vsl-thumbnails'));

DROP POLICY IF EXISTS "demo_studio_assets_owner_write" ON storage.objects;
CREATE POLICY "demo_studio_assets_owner_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('demo-assets', 'vsl-thumbnails')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "demo_studio_assets_owner_update" ON storage.objects;
CREATE POLICY "demo_studio_assets_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('demo-assets', 'vsl-thumbnails')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "demo_studio_assets_owner_delete" ON storage.objects;
CREATE POLICY "demo_studio_assets_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('demo-assets', 'vsl-thumbnails')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
