-- Alternative approach: Check admin status through subscribers table
-- This is a fallback if the function approach doesn't work
-- Drop and recreate policies with direct subscribers table check

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can upload story banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update story banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete story banners" ON storage.objects;

-- Recreate policies using both function approaches
-- Try the main function first, fallback to subscribers-based function
CREATE POLICY "Admin can upload story banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'story-banners' AND
  (
    public.is_admin_user() = true
    OR
    public.is_admin_user_via_subscribers() = true
  )
);

CREATE POLICY "Admin can update story banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'story-banners' AND
  (
    public.is_admin_user() = true
    OR
    public.is_admin_user_via_subscribers() = true
  )
);

CREATE POLICY "Admin can delete story banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'story-banners' AND
  (
    public.is_admin_user() = true
    OR
    public.is_admin_user_via_subscribers() = true
  )
);

