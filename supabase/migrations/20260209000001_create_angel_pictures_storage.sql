-- Create storage bucket for angel investor profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'angel-pictures',
  'angel-pictures',
  true, -- Public bucket for angel pictures
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
-- Admin can upload angel pictures
CREATE POLICY "Admin can upload angel pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'angel-pictures' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);

-- Anyone can view angel pictures (public bucket)
CREATE POLICY "Angel pictures are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'angel-pictures');

-- Admin can update angel pictures
CREATE POLICY "Admin can update angel pictures"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'angel-pictures' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);

-- Admin can delete angel pictures
CREATE POLICY "Admin can delete angel pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'angel-pictures' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
);
