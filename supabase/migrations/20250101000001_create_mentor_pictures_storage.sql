-- Create storage bucket for mentor pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mentor-pictures',
  'mentor-pictures',
  true, -- Public bucket for mentor pictures
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
-- Admin can upload mentor pictures
CREATE POLICY "Admin can upload mentor pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mentor-pictures' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
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
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);

-- Admin can delete mentor pictures
CREATE POLICY "Admin can delete mentor pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mentor-pictures' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);

