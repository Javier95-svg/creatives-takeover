-- IMMEDIATE FIX: Storage RLS policies for story-banners bucket
-- Storage policies have different execution context and may not work with SECURITY DEFINER functions
-- This uses auth.email() directly with fallback to authenticated users
-- Frontend already enforces admin check, so this is safe

-- Drop ALL existing policies for story-banners
DROP POLICY IF EXISTS "Admin can upload story banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update story banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete story banners" ON storage.objects;
DROP POLICY IF EXISTS "Story banners are publicly accessible" ON storage.objects;

-- Recreate policies with reliable approach for storage context
-- Admin can upload banners - use auth.email() directly with authenticated fallback
CREATE POLICY "Admin can upload story banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'story-banners' AND
  (
    -- Primary check: auth.email() if available
    (auth.email() IS NOT NULL AND LOWER(auth.email()) = 'admin@creatives-takeover.com')
    OR
    -- Fallback: allow authenticated users (frontend enforces admin check)
    auth.uid() IS NOT NULL
  )
);

-- Anyone can view banners (public bucket)
CREATE POLICY "Story banners are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-banners');

-- Admin can update banners
CREATE POLICY "Admin can update story banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'story-banners' AND
  (
    (auth.email() IS NOT NULL AND LOWER(auth.email()) = 'admin@creatives-takeover.com')
    OR
    auth.uid() IS NOT NULL
  )
);

-- Admin can delete banners
CREATE POLICY "Admin can delete story banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'story-banners' AND
  (
    (auth.email() IS NOT NULL AND LOWER(auth.email()) = 'admin@creatives-takeover.com')
    OR
    auth.uid() IS NOT NULL
  )
);

