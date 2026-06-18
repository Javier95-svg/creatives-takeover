-- MVP Builder "Publish" auto-subdomain support.
-- Adds a dedicated, locked public slug used to build {slug}.creativestakeover.app.
-- This is intentionally separate from `deployment_slug` (which is the Vercel
-- deployment identity and embeds the project id), so the public-facing handle
-- can stay clean (e.g. "ironlog") and is locked once assigned.

ALTER TABLE public.mvp_projects
  ADD COLUMN IF NOT EXISTS subdomain_slug TEXT;

-- Global uniqueness for the public handle. Partial index keeps NULLs unconstrained
-- so unpublished projects don't collide. The mvp-builder-publish edge function
-- resolves collisions by appending -2, -3, ... before assigning.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mvp_projects_subdomain_slug
  ON public.mvp_projects(subdomain_slug)
  WHERE subdomain_slug IS NOT NULL;
