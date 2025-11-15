-- =====================================================
-- Add Image URL Support to Comments
-- This migration adds image_url column to post_comments table
-- to support image attachments in comments
-- =====================================================

-- Add image_url column to post_comments table
ALTER TABLE public.post_comments 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for faster queries on comments with images
CREATE INDEX IF NOT EXISTS idx_post_comments_image_url 
ON public.post_comments(image_url) 
WHERE image_url IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.post_comments.image_url IS 'URL of image attached to the comment';

-- =====================================================
-- Migration Complete!
-- =====================================================
-- Comments can now have image attachments
-- Images should be stored in Supabase storage bucket 'comment-images'
-- =====================================================

