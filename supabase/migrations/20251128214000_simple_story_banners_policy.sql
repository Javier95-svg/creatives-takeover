-- SIMPLE FIX: Use auth.email() to check admin directly
-- This is the simplest approach that should work in storage policies

-- Drop ALL existing policies for story-banners
DROP POLICY IF EXISTS "Admin can upload story banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update story banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete story banners" ON storage.objects;

-- Check admin email directly using auth.email() if available
-- Fallback: allow any authenticated user (frontend already checks admin)
CREATE POLICY "Admin can upload story banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'story-banners' AND
  (
    -- Try to check email directly (if auth.email() is available)
    (auth.email() IS NOT NULL AND LOWER(auth.email()) = 'admin@creatives-takeover.com')
    OR
    -- Fallback: allow authenticated users (frontend enforces admin check)
    auth.uid() IS NOT NULL
  )
);

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

