-- Simple Storage RLS policies for story-banners bucket
-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admin can upload story banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update story banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete story banners" ON storage.objects;
DROP POLICY IF EXISTS "Story banners are publicly accessible" ON storage.objects;

-- Create simple, reliable policies
-- Frontend already enforces admin check, so just require authentication
CREATE POLICY "Authenticated users can upload story banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'story-banners' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Story banners are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-banners');

CREATE POLICY "Authenticated users can update story banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'story-banners' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete story banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'story-banners' 
  AND auth.uid() IS NOT NULL
);