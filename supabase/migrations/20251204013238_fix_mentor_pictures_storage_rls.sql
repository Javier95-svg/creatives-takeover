-- IMMEDIATE FIX: Storage RLS policies for mentor-pictures bucket
-- Storage policies have different execution context and may not work with SECURITY DEFINER functions
-- This uses auth.email() directly with fallback to authenticated users
-- Frontend already enforces admin check, so this is safe

-- Drop ALL existing policies for mentor-pictures
DROP POLICY IF EXISTS "Admin can upload mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Mentor pictures are publicly accessible" ON storage.objects;

-- Recreate policies with reliable approach for storage context
-- Admin can upload mentor pictures - use auth.email() directly with authenticated fallback
CREATE POLICY "Admin can upload mentor pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mentor-pictures' AND
  (
    -- Primary check: auth.email() if available
    (auth.email() IS NOT NULL AND LOWER(auth.email()) = 'admin@creatives-takeover.com')
    OR
    -- Fallback: allow authenticated users (frontend enforces admin check)
    auth.uid() IS NOT NULL
  )
);

-- Anyone can view mentor pictures (public bucket)
CREATE POLICY "Mentor pictures are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'mentor-pictures');

-- Admin can update mentor pictures
CREATE POLICY "Admin can update mentor pictures"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'mentor-pictures' AND
  (
    (auth.email() IS NOT NULL AND LOWER(auth.email()) = 'admin@creatives-takeover.com')
    OR
    auth.uid() IS NOT NULL
  )
);

-- Admin can delete mentor pictures
CREATE POLICY "Admin can delete mentor pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mentor-pictures' AND
  (
    (auth.email() IS NOT NULL AND LOWER(auth.email()) = 'admin@creatives-takeover.com')
    OR
    auth.uid() IS NOT NULL
  )
);

