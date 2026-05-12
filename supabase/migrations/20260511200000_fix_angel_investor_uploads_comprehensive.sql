-- ============================================================
-- COMPREHENSIVE FIX: Angel investor picture uploads
-- Addresses:
--   1. angel-pictures bucket missing image/jpg MIME + wrong ON CONFLICT DO NOTHING
--   2. angel_investors table missing email / sectors / twitter_x_url columns
--   3. Storage RLS policies may have been wiped by previous manual SQL runs
--   4. PostgREST schema cache stale after column additions
-- ============================================================

BEGIN;

-- ── 1. Ensure bucket exists and settings are always correct ─────────────────
--    ON CONFLICT DO UPDATE (not DO NOTHING) so existing bucket gets fixed too
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

-- ── 2. Recreate storage policies for angel-pictures ─────────────────────────
--    Drop known names (from original migration + any earlier conversation attempts)
DROP POLICY IF EXISTS "Admin can upload angel pictures"               ON storage.objects;
DROP POLICY IF EXISTS "Admin can update angel pictures"               ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete angel pictures"               ON storage.objects;
DROP POLICY IF EXISTS "Angel pictures are publicly accessible"        ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload angel pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update angel pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete angel pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view angel pictures"                ON storage.objects;
-- Drop wrong-bucket-name policies from earlier conversation attempts
DROP POLICY IF EXISTS "Public read angel investor pics"    ON storage.objects;
DROP POLICY IF EXISTS "Public upload angel investor pics"  ON storage.objects;
DROP POLICY IF EXISTS "Public update angel investor pics"  ON storage.objects;
DROP POLICY IF EXISTS "Public delete angel investor pics"  ON storage.objects;

CREATE POLICY "Authenticated users can upload angel pictures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'angel-pictures');

CREATE POLICY "Authenticated users can update angel pictures"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING   (bucket_id = 'angel-pictures')
  WITH CHECK (bucket_id = 'angel-pictures');

CREATE POLICY "Authenticated users can delete angel pictures"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'angel-pictures');

CREATE POLICY "Anyone can view angel pictures"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'angel-pictures');

-- ── 3. Add missing angel_investors columns (safe — IF NOT EXISTS) ────────────
ALTER TABLE public.angel_investors
  ADD COLUMN IF NOT EXISTS email        TEXT,
  ADD COLUMN IF NOT EXISTS sectors      TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS twitter_x_url TEXT;

-- ── 4. Ensure RLS is enabled with correct policies ───────────────────────────
ALTER TABLE public.angel_investors ENABLE ROW LEVEL SECURITY;

-- Drop previous attempts (both correct names and wrong names from conversation)
DROP POLICY IF EXISTS "Anyone can view active angel investors"         ON public.angel_investors;
DROP POLICY IF EXISTS "Authenticated users can view all angel investors" ON public.angel_investors;
DROP POLICY IF EXISTS "Authenticated users can create angel investors" ON public.angel_investors;
DROP POLICY IF EXISTS "Authenticated users can update angel investors" ON public.angel_investors;
DROP POLICY IF EXISTS "Authenticated users can delete angel investors" ON public.angel_investors;
DROP POLICY IF EXISTS "Public read angel investors"                    ON public.angel_investors;
DROP POLICY IF EXISTS "Public insert angel investors"                  ON public.angel_investors;
DROP POLICY IF EXISTS "Public update angel investors"                  ON public.angel_investors;
DROP POLICY IF EXISTS "Public delete angel investors"                  ON public.angel_investors;

CREATE POLICY "Anyone can view active angel investors"
  ON public.angel_investors FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all angel investors"
  ON public.angel_investors FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create angel investors"
  ON public.angel_investors FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update angel investors"
  ON public.angel_investors FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete angel investors"
  ON public.angel_investors FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ── 5. Explicit table grants (needed after any REVOKE ALL hardening) ─────────
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.angel_investors TO authenticated;
GRANT SELECT                         ON TABLE public.angel_investors TO anon;
GRANT ALL                            ON TABLE public.angel_investors TO service_role;

-- ── 6. Refresh PostgREST schema cache ───────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;
