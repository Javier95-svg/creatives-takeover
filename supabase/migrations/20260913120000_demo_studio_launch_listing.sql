-- Founder opt-in to public discovery for /p/:slug. Default OFF for every existing
-- and future row: a page becoming indexable is the founder's decision, not a
-- migration's. Unlisted pages stay fully link-reachable; this flag only drives
-- robots meta plus gallery and sitemap inclusion.

ALTER TABLE public.demo_studio_projects
  ADD COLUMN IF NOT EXISTS launch_listed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.demo_studio_projects.launch_listed IS
  'Founder opt-in. false = link-reachable but noindex, absent from /launches and the sitemap.';

-- NOTE: do NOT add launch_listed to the demo_studio_projects_public_read_published
-- RLS policy (see 20260607120000_demo_studio_foundation.sql). That policy must stay
-- USING (launch_published = true). Tightening it would look like hardening but would
-- silently break /p/:slug for every unlisted page, which by design must remain
-- reachable by direct link. The gallery and sitemap filter on launch_listed as a
-- query predicate instead.

CREATE INDEX IF NOT EXISTS demo_studio_projects_listed_idx
  ON public.demo_studio_projects (updated_at DESC)
  WHERE launch_published = true AND launch_listed = true;
