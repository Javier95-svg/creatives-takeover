-- MVP Builder Phase 1 project storage expansion.
-- Keeps legacy columns intact while adding complete-file version storage,
-- deployment metadata, and future custom-domain room.

ALTER TABLE public.mvp_projects
  ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'html_single'
    CHECK (project_type IN ('html_single', 'react_multi')),
  ADD COLUMN IF NOT EXISTS template TEXT NOT NULL DEFAULT 'waitlist_landing',
  ADD COLUMN IF NOT EXISTS project_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS versions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deployment_url TEXT,
  ADD COLUMN IF NOT EXISTS deployment_slug TEXT,
  ADD COLUMN IF NOT EXISTS deployment_status TEXT NOT NULL DEFAULT 'not_deployed'
    CHECK (deployment_status IN ('not_deployed', 'deploying', 'deployed', 'failed')),
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_mvp_projects_user_updated
  ON public.mvp_projects(user_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mvp_projects_deployment_slug
  ON public.mvp_projects(deployment_slug)
  WHERE deployment_slug IS NOT NULL;
