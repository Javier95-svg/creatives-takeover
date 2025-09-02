-- Allow public viewing of comments and posts in community
-- This enables showing comments but still requiring auth for interactions

-- Update community_posts to allow public viewing
DROP POLICY IF EXISTS "Authenticated users can view community posts" ON public.community_posts;
CREATE POLICY "Public can view community posts" 
ON public.community_posts 
FOR SELECT 
USING (true);

-- Update post_comments to allow public viewing  
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.post_comments;
CREATE POLICY "Public can view comments" 
ON public.post_comments 
FOR SELECT 
USING (true);

-- Keep user_votes requiring authentication for viewing (for privacy)
-- Keep all INSERT/UPDATE/DELETE operations requiring authentication