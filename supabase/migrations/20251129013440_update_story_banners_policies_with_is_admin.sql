-- Update storage RLS policies for story-banners bucket
-- Replace existing policies with ones using is_admin_user() function
-- This fixes RLS issues by using a SECURITY DEFINER function

-- Drop ALL existing policies for story-banners
DROP POLICY IF EXISTS "Admin can upload story banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update story banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete story banners" ON storage.objects;
DROP POLICY IF EXISTS "Story banners are publicly accessible" ON storage.objects;

-- Recreate policies using is_admin_user() function
-- Admin can upload banners
CREATE POLICY "Admin can upload story banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'story-banners' AND
  public.is_admin_user() = true
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
  public.is_admin_user() = true
);

-- Admin can delete banners
CREATE POLICY "Admin can delete story banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'story-banners' AND
  public.is_admin_user() = true
);

