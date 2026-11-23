-- The workspace projects table, as it exists in production (recorded 2026-11-22).
--
-- `projects` was created outside the repo migrations, so a database rebuilt
-- from this folder had no table, and no row-level security, for the unit every
-- tool's results now hang off (20260917160000 onwards add project_id foreign
-- keys to it). This file is dated just before that first reference and is
-- idempotent: on production it changes nothing.

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  idea_summary text,
  status text NOT NULL DEFAULT 'draft' CHECK (status = ANY (ARRAY['draft', 'active', 'archived'])),
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Added by later migrations (20260917160000, 20260929120000); kept here so the
-- table is complete on its own.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS context jsonb;

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects (user_id);
CREATE INDEX IF NOT EXISTS projects_user_active_idx ON public.projects (user_id) WHERE archived_at IS NULL;

-- Owner-only: a founder's projects are visible to and editable by that founder alone.
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'Users can view their own projects') THEN
    CREATE POLICY "Users can view their own projects" ON public.projects
      FOR SELECT USING ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'Users can create their own projects') THEN
    CREATE POLICY "Users can create their own projects" ON public.projects
      FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'Users can update their own projects') THEN
    CREATE POLICY "Users can update their own projects" ON public.projects
      FOR UPDATE USING ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'Users can delete their own projects') THEN
    CREATE POLICY "Users can delete their own projects" ON public.projects
      FOR DELETE USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;
