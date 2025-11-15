-- =====================================================
-- Create Storage Bucket for Comment Images
-- This migration creates the comment-images storage bucket
-- with proper RLS policies for uploading and viewing images
-- =====================================================

-- Create storage bucket for comment images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comment-images',
  'comment-images',
  true, -- Public bucket so images can be viewed by everyone
  10485760, -- 10MB file size limit
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
-- Policy: Anyone can view comment images (public bucket)
CREATE POLICY "Comment images are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'comment-images');

-- Policy: Authenticated users can upload their own comment images
CREATE POLICY "Users can upload comment images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comment-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own comment images
CREATE POLICY "Users can update their own comment images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'comment-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own comment images
CREATE POLICY "Users can delete their own comment images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'comment-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- Migration Complete!
-- =====================================================
-- The comment-images storage bucket is now created
-- Users can upload images when posting comments
-- Images are publicly viewable
-- =====================================================

