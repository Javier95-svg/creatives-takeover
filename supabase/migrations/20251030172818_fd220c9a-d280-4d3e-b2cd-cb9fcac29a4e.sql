-- Add banner_url and bio_html columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS bio_html TEXT;

-- Add is_pinned column to community_posts table for pinned posts feature
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Add index for faster queries on pinned posts
CREATE INDEX IF NOT EXISTS idx_community_posts_pinned 
ON public.community_posts(user_id, is_pinned) 
WHERE is_pinned = TRUE;