ALTER TABLE public.dashboard_files
ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'system_generated',
ADD COLUMN IF NOT EXISTS storage_path TEXT NULL,
ADD COLUMN IF NOT EXISTS mime_type TEXT NULL,
ADD COLUMN IF NOT EXISTS file_extension TEXT NULL,
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT NULL,
ADD COLUMN IF NOT EXISTS extracted_text TEXT NULL,
ADD COLUMN IF NOT EXISTS upload_status TEXT NOT NULL DEFAULT 'ready',
ADD COLUMN IF NOT EXISTS is_protected BOOLEAN NOT NULL DEFAULT false;

UPDATE public.dashboard_files
SET
  origin = 'system_generated',
  upload_status = 'ready',
  is_protected = true
WHERE file_kind = 'icp_draft';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dashboard_files_file_kind_check'
  ) THEN
    ALTER TABLE public.dashboard_files
      DROP CONSTRAINT dashboard_files_file_kind_check;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dashboard_files_file_kind_check'
  ) THEN
    ALTER TABLE public.dashboard_files
      ADD CONSTRAINT dashboard_files_file_kind_check
      CHECK (file_kind IN ('icp_draft', 'uploaded_file'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dashboard_files_origin_check'
  ) THEN
    ALTER TABLE public.dashboard_files
      ADD CONSTRAINT dashboard_files_origin_check
      CHECK (origin IN ('system_generated', 'user_upload'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dashboard_files_upload_status_check'
  ) THEN
    ALTER TABLE public.dashboard_files
      ADD CONSTRAINT dashboard_files_upload_status_check
      CHECK (upload_status IN ('ready', 'processing', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dashboard_files_user_origin_updated_at
  ON public.dashboard_files (user_id, origin, updated_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dashboard-files',
  'dashboard-files',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload their dashboard files" ON storage.objects;
CREATE POLICY "Users can upload their dashboard files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'dashboard-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view their dashboard files" ON storage.objects;
CREATE POLICY "Users can view their dashboard files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'dashboard-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their dashboard files" ON storage.objects;
CREATE POLICY "Users can delete their dashboard files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'dashboard-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own dashboard files" ON public.dashboard_files;
CREATE POLICY "Users can delete their own dashboard files"
  ON public.dashboard_files
  FOR DELETE
  USING (auth.uid() = user_id AND coalesce(is_protected, false) = false);
