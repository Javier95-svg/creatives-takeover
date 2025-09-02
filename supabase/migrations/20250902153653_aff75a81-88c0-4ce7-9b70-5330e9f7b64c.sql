DO $$
DECLARE
  keep_id uuid;
BEGIN
  -- Find the most recent post by David Kim to keep
  SELECT cp.id INTO keep_id
  FROM public.community_posts cp
  JOIN public.profiles p ON p.id = cp.user_id
  WHERE p.full_name = 'David Kim'
  ORDER BY cp.created_at DESC
  LIMIT 1;

  IF keep_id IS NULL THEN
    RAISE NOTICE 'No post by David Kim found; aborting cleanup.';
    RETURN;
  END IF;

  -- Delete dependent rows for ALL other posts (any author)
  DELETE FROM public.post_comments 
  WHERE post_id IN (SELECT id FROM public.community_posts WHERE id <> keep_id);

  DELETE FROM public.user_votes 
  WHERE post_id IN (SELECT id FROM public.community_posts WHERE id <> keep_id);

  DELETE FROM public.user_bookmarks 
  WHERE post_id IN (SELECT id FROM public.community_posts WHERE id <> keep_id);

  DELETE FROM public.notifications 
  WHERE post_id IN (SELECT id FROM public.community_posts WHERE id <> keep_id);

  -- Delete all posts except the kept one
  DELETE FROM public.community_posts 
  WHERE id <> keep_id;
END $$;