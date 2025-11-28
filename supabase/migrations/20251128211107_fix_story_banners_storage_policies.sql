-- Fix storage RLS policies for story-banners bucket
-- Replace direct auth.users queries with is_admin_user() function

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can upload story banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update story banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete story banners" ON storage.objects;

-- Recreate policies using is_admin_user() function
-- Admin can upload banners
CREATE POLICY "Admin can upload story banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'story-banners' AND
  public.is_admin_user()
);

-- Admin can update banners
CREATE POLICY "Admin can update story banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'story-banners' AND
  public.is_admin_user()
);

-- Admin can delete banners
CREATE POLICY "Admin can delete story banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'story-banners' AND
  public.is_admin_user()
);

