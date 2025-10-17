-- Update get_post_author_info function to include username
DROP FUNCTION IF EXISTS get_post_author_info(uuid);

CREATE OR REPLACE FUNCTION get_post_author_info(author_user_id uuid)
RETURNS TABLE(author_name text, author_avatar text, author_username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(p.full_name, 'Anonymous') as author_name,
    p.avatar_url as author_avatar,
    p.username as author_username
  FROM public.profiles p 
  WHERE p.id = author_user_id;
$$;