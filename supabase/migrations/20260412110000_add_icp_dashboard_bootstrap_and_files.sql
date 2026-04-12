ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS dashboard_initialized_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS dashboard_bootstrap_source TEXT NULL,
ADD COLUMN IF NOT EXISTS primary_icp_analysis_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_dashboard_bootstrap_source_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_dashboard_bootstrap_source_check
      CHECK (dashboard_bootstrap_source IS NULL OR dashboard_bootstrap_source IN ('generic', 'icp_unlock'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_primary_icp_analysis_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_primary_icp_analysis_id_fkey
      FOREIGN KEY (primary_icp_analysis_id)
      REFERENCES public.icp_analysis_results(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_dashboard_initialized_at
  ON public.profiles (dashboard_initialized_at);

CREATE INDEX IF NOT EXISTS idx_profiles_primary_icp_analysis_id
  ON public.profiles (primary_icp_analysis_id);

CREATE TABLE IF NOT EXISTS public.dashboard_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_kind TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NULL,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  preview_payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_files ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS dashboard_files_user_source_unique
  ON public.dashboard_files (user_id, source_table, source_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_files_user_id_updated_at
  ON public.dashboard_files (user_id, updated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dashboard_files_file_kind_check'
  ) THEN
    ALTER TABLE public.dashboard_files
      ADD CONSTRAINT dashboard_files_file_kind_check
      CHECK (file_kind IN ('icp_draft'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view their own dashboard files" ON public.dashboard_files;
CREATE POLICY "Users can view their own dashboard files"
  ON public.dashboard_files
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own dashboard files" ON public.dashboard_files;
CREATE POLICY "Users can create their own dashboard files"
  ON public.dashboard_files
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own dashboard files" ON public.dashboard_files;
CREATE POLICY "Users can update their own dashboard files"
  ON public.dashboard_files
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own dashboard files" ON public.dashboard_files;
CREATE POLICY "Users can delete their own dashboard files"
  ON public.dashboard_files
  FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_dashboard_files_updated_at ON public.dashboard_files;
CREATE TRIGGER update_dashboard_files_updated_at
  BEFORE UPDATE ON public.dashboard_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
