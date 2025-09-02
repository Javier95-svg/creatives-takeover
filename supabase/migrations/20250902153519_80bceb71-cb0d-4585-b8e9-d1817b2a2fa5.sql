-- Delete all posts that are NOT by David Kim
DELETE FROM public.community_posts 
WHERE user_id NOT IN (
  SELECT p.id 
  FROM public.profiles p 
  WHERE p.full_name = 'David Kim'
);

-- Keep only the most recent post by David Kim, delete the others
DELETE FROM public.community_posts 
WHERE user_id IN (
  SELECT p.id 
  FROM public.profiles p 
  WHERE p.full_name = 'David Kim'
)
AND id NOT IN (
  SELECT cp.id
  FROM public.community_posts cp
  LEFT JOIN public.profiles p ON cp.user_id = p.id
  WHERE p.full_name = 'David Kim'
  ORDER BY cp.created_at DESC
  LIMIT 1
);