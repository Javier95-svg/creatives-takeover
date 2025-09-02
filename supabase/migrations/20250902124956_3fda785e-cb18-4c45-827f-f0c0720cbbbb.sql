-- Security Fix: Restrict public data exposure by requiring authentication for sensitive operations

-- Update community_posts RLS policies
DROP POLICY IF EXISTS "Community posts are viewable by everyone" ON public.community_posts;
CREATE POLICY "Authenticated users can view community posts" 
ON public.community_posts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update post_comments RLS policies  
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.post_comments;
CREATE POLICY "Authenticated users can view comments" 
ON public.post_comments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update user_votes RLS policies
DROP POLICY IF EXISTS "Users can view all votes" ON public.user_votes;
CREATE POLICY "Authenticated users can view votes" 
ON public.user_votes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update profiles RLS policies - remove public access, keep user-specific access
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
-- Keep the existing "Users can view their own profile" policy as it's secure

-- Add a new policy for authenticated users to view other profiles (needed for community features)
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);