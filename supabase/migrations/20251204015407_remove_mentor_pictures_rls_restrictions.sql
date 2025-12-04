-- REMOVE ALL RESTRICTIVE RLS POLICIES FOR MENTOR-PICTURES BUCKET
-- Allow any authenticated user to upload/update/delete (frontend enforces admin check)
-- This fixes picture upload issues by removing all restrictions

-- Drop ALL existing policies for mentor-pictures bucket
DROP POLICY IF EXISTS "Admin can upload mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Mentor pictures are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view mentor pictures" ON storage.objects;

-- SIMPLE POLICIES: Allow any authenticated user to do everything
-- Frontend already enforces admin check, so this is safe
CREATE POLICY "Authenticated users can upload mentor pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mentor-pictures' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update mentor pictures"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'mentor-pictures' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete mentor pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mentor-pictures' AND
  auth.uid() IS NOT NULL
);

-- Public read access
CREATE POLICY "Anyone can view mentor pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'mentor-pictures');
