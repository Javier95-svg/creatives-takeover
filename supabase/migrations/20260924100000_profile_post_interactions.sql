BEGIN;

-- Read original records under their existing RLS. Future journey posts are never
-- interaction targets, including for their author.
CREATE OR REPLACE VIEW public.profile_interaction_posts WITH (security_invoker = true) AS
SELECT 'journey'::text AS source, id, user_id, content, NULL::text AS title,
  image_path, NULL::text AS image, publish_at AS date
FROM public.profile_posts WHERE publish_at <= now()
UNION ALL
SELECT 'photo', id, user_id, COALESCE(caption, ''), NULL, NULL, image_url, created_at
FROM public.user_photos
UNION ALL
SELECT 'community', id, user_id, content, title, NULL, NULL, created_at
FROM public.community_posts;
GRANT SELECT ON public.profile_interaction_posts TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.profile_post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid REFERENCES public.profile_posts(id) ON DELETE CASCADE,
  photo_id uuid REFERENCES public.user_photos(id) ON DELETE CASCADE,
  source text GENERATED ALWAYS AS (CASE WHEN journey_id IS NOT NULL THEN 'journey' ELSE 'photo' END) STORED,
  post_id uuid GENERATED ALWAYS AS (COALESCE(journey_id, photo_id)) STORED,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('like', 'repost')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(journey_id, photo_id) = 1),
  UNIQUE (source, post_id, user_id, kind)
);
CREATE INDEX IF NOT EXISTS profile_post_reactions_user_idx ON public.profile_post_reactions(user_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS profile_post_reactions_journey_idx ON public.profile_post_reactions(journey_id) WHERE journey_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS profile_post_reactions_photo_idx ON public.profile_post_reactions(photo_id) WHERE photo_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.profile_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid REFERENCES public.profile_posts(id) ON DELETE CASCADE,
  photo_id uuid REFERENCES public.user_photos(id) ON DELETE CASCADE,
  source text GENERATED ALWAYS AS (CASE WHEN journey_id IS NOT NULL THEN 'journey' ELSE 'photo' END) STORED,
  post_id uuid GENERATED ALWAYS AS (COALESCE(journey_id, photo_id)) STORED,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(journey_id, photo_id) = 1)
);
CREATE INDEX IF NOT EXISTS profile_post_comments_post_idx ON public.profile_post_comments(source, post_id, created_at, id);
CREATE INDEX IF NOT EXISTS profile_post_comments_journey_idx ON public.profile_post_comments(journey_id) WHERE journey_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS profile_post_comments_photo_idx ON public.profile_post_comments(photo_id) WHERE photo_id IS NOT NULL;
ALTER TABLE public.profile_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_post_comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profile_post_reactions, public.profile_post_comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.profile_post_reactions, public.profile_post_comments TO authenticated;

DROP POLICY IF EXISTS reactions_read ON public.profile_post_reactions;
DROP POLICY IF EXISTS reactions_insert ON public.profile_post_reactions;
DROP POLICY IF EXISTS reactions_delete ON public.profile_post_reactions;
DROP POLICY IF EXISTS comments_read ON public.profile_post_comments;
DROP POLICY IF EXISTS comments_insert ON public.profile_post_comments;
DROP POLICY IF EXISTS comments_delete ON public.profile_post_comments;
CREATE POLICY reactions_read ON public.profile_post_reactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profile_interaction_posts p WHERE p.source = profile_post_reactions.source AND p.id = profile_post_reactions.post_id));
CREATE POLICY reactions_insert ON public.profile_post_reactions FOR INSERT TO authenticated WITH CHECK (
  user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.profile_interaction_posts p WHERE p.source = profile_post_reactions.source AND p.id = profile_post_reactions.post_id));
CREATE POLICY reactions_delete ON public.profile_post_reactions FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY comments_read ON public.profile_post_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profile_interaction_posts p WHERE p.source = profile_post_comments.source AND p.id = profile_post_comments.post_id));
CREATE POLICY comments_insert ON public.profile_post_comments FOR INSERT TO authenticated WITH CHECK (
  user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.profile_interaction_posts p WHERE p.source = profile_post_comments.source AND p.id = profile_post_comments.post_id));
CREATE POLICY comments_delete ON public.profile_post_comments FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- One batch request for all visible cards; existing community interactions stay
-- in their original tables so counts and conversations do not split.
CREATE OR REPLACE FUNCTION public.profile_post_metrics(p_posts jsonb) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'source', p.source, 'id', p.id,
    'likes', CASE WHEN p.source = 'community' THEN
      (SELECT count(*) FROM user_votes v WHERE v.post_id = p.id AND v.vote_type = 'up') ELSE
      (SELECT count(*) FROM profile_post_reactions r WHERE r.source = p.source AND r.post_id = p.id AND r.kind = 'like') END,
    'comments', CASE WHEN p.source = 'community' THEN
      (SELECT count(*) FROM post_comments c WHERE c.post_id = p.id) ELSE
      (SELECT count(*) FROM profile_post_comments c WHERE c.source = p.source AND c.post_id = p.id) END,
    'reposts', CASE WHEN p.source = 'community' THEN
      (SELECT count(*) FROM post_reposts r WHERE r.post_id = p.id) ELSE
      (SELECT count(*) FROM profile_post_reactions r WHERE r.source = p.source AND r.post_id = p.id AND r.kind = 'repost') END,
    'liked', CASE WHEN p.source = 'community' THEN
      EXISTS (SELECT 1 FROM user_votes v WHERE v.post_id = p.id AND v.user_id = auth.uid() AND v.vote_type = 'up') ELSE
      EXISTS (SELECT 1 FROM profile_post_reactions r WHERE r.source = p.source AND r.post_id = p.id AND r.user_id = auth.uid() AND r.kind = 'like') END,
    'reposted', CASE WHEN p.source = 'community' THEN
      EXISTS (SELECT 1 FROM post_reposts r WHERE r.post_id = p.id AND r.user_id = auth.uid()) ELSE
      EXISTS (SELECT 1 FROM profile_post_reactions r WHERE r.source = p.source AND r.post_id = p.id AND r.user_id = auth.uid() AND r.kind = 'repost') END
  )), '[]'::jsonb)
  FROM profile_interaction_posts p JOIN (
    SELECT DISTINCT x.source, x.id FROM jsonb_to_recordset(p_posts) AS x(source text, id uuid) LIMIT 200
  ) requested ON requested.source = p.source AND requested.id = p.id;
$$;

CREATE OR REPLACE FUNCTION public.set_profile_post_reaction(p_source text, p_id uuid, p_kind text, p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to interact' USING ERRCODE = '42501'; END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('like', 'repost') OR p_active IS NULL THEN RAISE EXCEPTION 'Invalid reaction'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profile_interaction_posts WHERE source = p_source AND id = p_id) THEN
    RAISE EXCEPTION 'Post unavailable' USING ERRCODE = '42501';
  END IF;
  IF p_source = 'community' THEN
    IF p_kind = 'like' THEN
      IF p_active THEN
        INSERT INTO user_votes(user_id, post_id, vote_type) VALUES (auth.uid(), p_id, 'up')
        ON CONFLICT (user_id, post_id) DO UPDATE SET vote_type = 'up';
      ELSE DELETE FROM user_votes WHERE post_id = p_id AND user_id = auth.uid(); END IF;
    ELSE
      IF p_active THEN INSERT INTO post_reposts(user_id, post_id) VALUES (auth.uid(), p_id) ON CONFLICT (user_id, post_id) DO NOTHING;
      ELSE DELETE FROM post_reposts WHERE post_id = p_id AND user_id = auth.uid(); END IF;
    END IF;
  ELSE
    IF p_active THEN
      INSERT INTO profile_post_reactions(journey_id, photo_id, user_id, kind)
      VALUES (CASE WHEN p_source = 'journey' THEN p_id END, CASE WHEN p_source = 'photo' THEN p_id END, auth.uid(), p_kind)
      ON CONFLICT (source, post_id, user_id, kind) DO NOTHING;
    ELSE DELETE FROM profile_post_reactions WHERE source = p_source AND post_id = p_id AND user_id = auth.uid() AND kind = p_kind;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_profile_post_comments(p_source text, p_id uuid, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(c) || jsonb_build_object('name', COALESCE(p.full_name, p.username, 'Member'), 'username', p.username, 'avatar', p.avatar_url) ORDER BY c.created_at, c.id), '[]'::jsonb)
  FROM (
    SELECT * FROM (
      SELECT id, user_id, content, created_at FROM profile_post_comments WHERE source = p_source AND post_id = p_id
      UNION ALL
      SELECT id, user_id, content, created_at FROM post_comments WHERE p_source = 'community' AND post_id = p_id
    ) entries
    WHERE EXISTS (SELECT 1 FROM profile_interaction_posts WHERE source = p_source AND id = p_id)
    ORDER BY created_at, id LIMIT 30 OFFSET greatest(p_offset, 0)
  ) c LEFT JOIN public_profiles p ON p.id = c.user_id;
$$;

CREATE OR REPLACE FUNCTION public.add_profile_post_comment(p_source text, p_id uuid, p_content text, p_comment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to comment' USING ERRCODE = '42501'; END IF;
  IF p_content IS NULL OR char_length(btrim(p_content)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Comment must contain 1 to 2000 characters'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profile_interaction_posts WHERE source = p_source AND id = p_id) THEN RAISE EXCEPTION 'Post unavailable' USING ERRCODE = '42501'; END IF;
  IF p_source = 'community' THEN
    INSERT INTO post_comments(id, post_id, user_id, content) VALUES (p_comment_id, p_id, auth.uid(), btrim(p_content)) ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO profile_post_comments(id, journey_id, photo_id, user_id, content)
    VALUES (p_comment_id, CASE WHEN p_source = 'journey' THEN p_id END, CASE WHEN p_source = 'photo' THEN p_id END, auth.uid(), btrim(p_content)) ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_profile_post_comment(p_source text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to delete a comment' USING ERRCODE = '42501'; END IF;
  IF p_source = 'community' THEN DELETE FROM post_comments WHERE id = p_id AND user_id = auth.uid();
  ELSE DELETE FROM profile_post_comments WHERE source = p_source AND id = p_id AND user_id = auth.uid(); END IF;
END;
$$;

-- Shared links can retrieve older posts without loading every previous page.
CREATE OR REPLACE FUNCTION public.get_profile_shared_post(p_source text, p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT to_jsonb(post) || jsonb_build_object('author_name', COALESCE(p.full_name, p.username, 'Member'), 'author_avatar', p.avatar_url, 'author_username', p.username)
  FROM profile_interaction_posts post LEFT JOIN public_profiles p ON p.id = post.user_id
  WHERE post.source = p_source AND post.id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.list_profile_reposts(p_user_id uuid, p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(post) || jsonb_build_object('reposted_at', r.created_at, 'author_name', COALESCE(p.full_name, p.username, 'Member'), 'author_avatar', p.avatar_url, 'author_username', p.username) ORDER BY r.created_at DESC), '[]'::jsonb)
  FROM (
    SELECT * FROM (
      SELECT source, post_id, created_at FROM profile_post_reactions WHERE user_id = p_user_id AND kind = 'repost'
      UNION ALL SELECT 'community', post_id, created_at FROM post_reposts WHERE user_id = p_user_id
    ) entries ORDER BY created_at DESC LIMIT least(greatest(p_limit, 1), 200)
  ) r JOIN profile_interaction_posts post ON post.source = r.source AND post.id = r.post_id
  LEFT JOIN public_profiles p ON p.id = post.user_id;
$$;

REVOKE ALL ON FUNCTION public.profile_post_metrics(jsonb), public.list_profile_post_comments(text, uuid, integer), public.get_profile_shared_post(text, uuid), public.list_profile_reposts(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_post_metrics(jsonb), public.list_profile_post_comments(text, uuid, integer), public.get_profile_shared_post(text, uuid), public.list_profile_reposts(uuid, integer) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.set_profile_post_reaction(text, uuid, text, boolean), public.add_profile_post_comment(text, uuid, text, uuid), public.delete_profile_post_comment(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_profile_post_reaction(text, uuid, text, boolean), public.add_profile_post_comment(text, uuid, text, uuid), public.delete_profile_post_comment(text, uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
