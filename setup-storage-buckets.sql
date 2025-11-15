-- Supabase Storage Bucket Setup for Comments
-- Run this SQL in your Supabase SQL Editor

-- Create comment-images bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-images', 'comment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create comment-videos bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-videos', 'comment-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create comment-audio bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-audio', 'comment-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for comment-images bucket
-- Allow authenticated users to upload their own comment images
CREATE POLICY "Allow authenticated users to upload comment images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comment-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to comment images
CREATE POLICY "Allow public read access to comment images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'comment-images'
);

-- Allow users to delete their own comment images
CREATE POLICY "Allow users to delete their own comment images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'comment-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Set up RLS policies for comment-videos bucket
-- Allow authenticated users to upload their own comment videos
CREATE POLICY "Allow authenticated users to upload comment videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comment-videos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to comment videos
CREATE POLICY "Allow public read access to comment videos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'comment-videos'
);

-- Allow users to delete their own comment videos
CREATE POLICY "Allow users to delete their own comment videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'comment-videos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Set up RLS policies for comment-audio bucket
-- Allow authenticated users to upload their own comment audio
CREATE POLICY "Allow authenticated users to upload comment audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comment-audio' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to comment audio
CREATE POLICY "Allow public read access to comment audio"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'comment-audio'
);

-- Allow users to delete their own comment audio
CREATE POLICY "Allow users to delete their own comment audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'comment-audio' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify buckets were created
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id IN ('comment-images', 'comment-videos', 'comment-audio');
