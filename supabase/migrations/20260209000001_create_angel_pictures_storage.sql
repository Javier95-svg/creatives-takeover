-- Create storage bucket for angel investor profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'angel-pictures',
  'angel-pictures',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop ALL existing angel-pictures policies (comprehensive cleanup)
DROP POLICY IF EXISTS "Admin can upload angel pictures" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update angel pictures" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete angel pictures" ON storage.objects;
DROP POLICY IF EXISTS "Angel pictures are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload angel pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update angel pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete angel pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view angel pictures" ON storage.objects;

-- SIMPLE POLICIES: Allow any authenticated user (frontend enforces admin check)
-- This matches the working mentor-pictures pattern
CREATE POLICY "Authenticated users can upload angel pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'angel-pictures' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update angel pictures"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'angel-pictures' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete angel pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'angel-pictures' AND
  auth.uid() IS NOT NULL
);

-- Public read access
CREATE POLICY "Anyone can view angel pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'angel-pictures');
