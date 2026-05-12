-- ============================================================
-- REVERT May 9 security hardening
-- Restores storage access and table grants to pre-May-9 state
-- so that angel investor picture uploads (and other features)
-- work again.
-- ============================================================

BEGIN;

-- ── 1. Restore storage buckets to public ────────────────────────────────────
UPDATE storage.buckets
SET public = true
WHERE id IN (
  'chatbot-attachments',
  'collaboration-files',
  'cv-uploads',
  'dashboard-files',
  'message-attachments',
  'pitch-deck-uploads'
);

-- ── 2. Drop all restrictive storage policies added on May 9 ─────────────────
DROP POLICY IF EXISTS "Users can view their own CVs"                         ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own CVs"                       ON storage.objects;
DROP POLICY IF EXISTS "collaboration_files_storage_select_participant"        ON storage.objects;
DROP POLICY IF EXISTS "collaboration_files_storage_insert_participant"        ON storage.objects;
DROP POLICY IF EXISTS "collaboration_files_storage_update_uploader"          ON storage.objects;
DROP POLICY IF EXISTS "collaboration_files_storage_delete_uploader"          ON storage.objects;

-- ── 3. Restore broad storage policies that May 9 removed ────────────────────
DROP POLICY IF EXISTS "Authenticated users can upload files"                 ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view collaboration files"     ON storage.objects;
DROP POLICY IF EXISTS "Users can view files in accessible sessions"          ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to accessible sessions"        ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own uploaded files"            ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploaded files"            ON storage.objects;

CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view collaboration files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own uploaded files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (owner = auth.uid());

CREATE POLICY "Users can delete their own uploaded files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (owner = auth.uid());

-- ── 4. Ensure angel-pictures bucket and policies are correct ─────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'angel-pictures',
  'angel-pictures',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Admin can upload angel pictures"               ON storage.objects;
DROP POLICY IF EXISTS "Admin can update angel pictures"               ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete angel pictures"               ON storage.objects;
DROP POLICY IF EXISTS "Angel pictures are publicly accessible"        ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload angel pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update angel pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete angel pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view angel pictures"                ON storage.objects;
DROP POLICY IF EXISTS "Public read angel investor pics"               ON storage.objects;
DROP POLICY IF EXISTS "Public upload angel investor pics"             ON storage.objects;
DROP POLICY IF EXISTS "Public update angel investor pics"             ON storage.objects;
DROP POLICY IF EXISTS "Public delete angel investor pics"             ON storage.objects;

CREATE POLICY "Anyone can view angel pictures"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'angel-pictures');

-- ── 5. Re-grant access to tables over-restricted by May 9 ───────────────────
GRANT SELECT ON TABLE public.active_subscriptions      TO authenticated;
GRANT SELECT ON TABLE public.conversation_context_cache TO authenticated;
GRANT SELECT ON TABLE public.document_chunks            TO authenticated;
GRANT SELECT ON TABLE public.function_idempotency       TO authenticated;
GRANT SELECT ON TABLE public.user_community_activity    TO authenticated;
GRANT SELECT ON TABLE public.contact_submissions        TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.conversion_funnels TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.community_notifications TO authenticated;

-- ── 6. Fix angel_investors table grants (missing from all prior migrations) ──
ALTER TABLE public.angel_investors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active angel investors"           ON public.angel_investors;
DROP POLICY IF EXISTS "Authenticated users can view all angel investors" ON public.angel_investors;
DROP POLICY IF EXISTS "Authenticated users can create angel investors"   ON public.angel_investors;
DROP POLICY IF EXISTS "Authenticated users can update angel investors"   ON public.angel_investors;
DROP POLICY IF EXISTS "Authenticated users can delete angel investors"   ON public.angel_investors;
DROP POLICY IF EXISTS "Public read angel investors"                      ON public.angel_investors;
DROP POLICY IF EXISTS "Public insert angel investors"                    ON public.angel_investors;
DROP POLICY IF EXISTS "Public update angel investors"                    ON public.angel_investors;
DROP POLICY IF EXISTS "Public delete angel investors"                    ON public.angel_investors;

CREATE POLICY "Anyone can view active angel investors"
  ON public.angel_investors FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can view all angel investors"
  ON public.angel_investors FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create angel investors"
  ON public.angel_investors FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update angel investors"
  ON public.angel_investors FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete angel investors"
  ON public.angel_investors FOR DELETE USING (auth.uid() IS NOT NULL);

ALTER TABLE public.angel_investors
  ADD COLUMN IF NOT EXISTS email         TEXT,
  ADD COLUMN IF NOT EXISTS sectors       TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS twitter_x_url TEXT;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.angel_investors TO authenticated;
GRANT SELECT                         ON TABLE public.angel_investors TO anon;
GRANT ALL                            ON TABLE public.angel_investors TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
