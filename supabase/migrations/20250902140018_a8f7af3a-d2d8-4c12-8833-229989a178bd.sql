-- SECURITY FIX: Remove public access to profiles table
-- This prevents unauthorized access to user personal information

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;

-- Create a secure function to get minimal author info for posts
-- This function only exposes name and avatar for posts, not full profile access
CREATE OR REPLACE FUNCTION public.get_post_author_info(author_user_id uuid)
RETURNS TABLE(author_name text, author_avatar text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    COALESCE(p.full_name, 'Anonymous') as author_name,
    p.avatar_url as author_avatar
  FROM public.profiles p 
  WHERE p.id = author_user_id;
$$;

-- Grant execute permission to authenticated users and anon
GRANT EXECUTE ON FUNCTION public.get_post_author_info TO authenticated, anon;

-- Keep existing policies that allow users to manage their own profiles
-- These are already secure and properly scoped