-- Add location field to community_posts table
ALTER TABLE public.community_posts 
ADD COLUMN location text;