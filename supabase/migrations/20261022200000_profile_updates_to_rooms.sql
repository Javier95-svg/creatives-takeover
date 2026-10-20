BEGIN;

-- One transaction: either both destinations save, or neither does.
CREATE OR REPLACE FUNCTION public.publish_profile_update(
  p_content text,
  p_image_paths text[] DEFAULT '{}',
  p_room_kind text DEFAULT NULL,
  p_publish_at timestamptz DEFAULT NULL
)
RETURNS SETOF public.profile_posts
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  saved public.profile_posts;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to publish an update';
  END IF;
  IF p_room_kind IS NOT NULL AND p_room_kind NOT IN ('feedback', 'milestone', 'idea') THEN
    RAISE EXCEPTION 'Choose a valid Rooms category';
  END IF;
  INSERT INTO public.profile_posts (user_id, content, image_paths, publish_at)
  VALUES (auth.uid(), trim(p_content), p_image_paths, coalesce(p_publish_at, now()))
  RETURNING * INTO saved;

  IF p_room_kind IS NOT NULL THEN
    INSERT INTO public.community_posts (
      user_id, title, content, post_type, topic, feedback_requested,
      is_public, source_type, source_data, content_type, tags, created_at
    ) VALUES (
      auth.uid(),
      left(coalesce(nullif(split_part(saved.content, E'\n', 1), ''), 'Project update'), 140),
      saved.content, p_room_kind, 'founder-life', p_room_kind = 'feedback',
      true, 'manual',
      jsonb_build_object('origin', 'profile-update', 'profile_post_id', saved.id,
                        'image_paths', to_jsonb(saved.image_paths)),
      'text', '{}', saved.publish_at
    );
  END IF;
  RETURN NEXT saved;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_profile_update(text, text[], text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_profile_update(text, text[], text, timestamptz) TO authenticated;

-- A scheduled Rooms copy is visible only to its author until release.
CREATE POLICY community_profile_update_release ON public.community_posts
AS RESTRICTIVE FOR SELECT USING (
  source_data->>'origin' IS DISTINCT FROM 'profile-update'
  OR created_at <= now() OR user_id = auth.uid()
);

-- Profile edits and removals also apply to their Rooms copies, including
-- removal under the existing five-update retention rule.
CREATE OR REPLACE FUNCTION public.sync_profile_update_to_rooms()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.community_posts
    WHERE user_id = OLD.user_id AND source_data->>'origin' = 'profile-update'
      AND source_data->>'profile_post_id' = OLD.id::text;
    RETURN OLD;
  END IF;
  UPDATE public.community_posts
  SET content = NEW.content,
      title = left(coalesce(nullif(split_part(NEW.content, E'\n', 1), ''), 'Project update'), 140),
      created_at = NEW.publish_at,
      source_data = source_data || jsonb_build_object('image_paths', to_jsonb(NEW.image_paths))
  WHERE user_id = NEW.user_id AND source_data->>'origin' = 'profile-update'
    AND source_data->>'profile_post_id' = NEW.id::text;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sync_profile_update_to_rooms
AFTER UPDATE OR DELETE ON public.profile_posts
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_update_to_rooms();

-- Both destinations use the same owner-validated storage objects.
CREATE OR REPLACE FUNCTION public.can_read_profile_update_image(object_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT split_part(object_name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profile_posts p
      WHERE object_name = ANY(p.image_paths) AND p.publish_at <= now()
    )
    OR EXISTS (
      SELECT 1 FROM public.community_posts c
      WHERE c.source_data->>'origin' = 'profile-update'
        AND c.is_public AND c.hidden_at IS NULL AND c.created_at <= now()
        AND split_part(object_name, '/', 1) = c.user_id::text
        AND (c.source_data->'image_paths') ? object_name
    );
$$;
DROP POLICY IF EXISTS profile_post_images_read ON storage.objects;
CREATE POLICY profile_post_images_read ON storage.objects FOR SELECT
USING (bucket_id = 'profile-posts' AND public.can_read_profile_update_image(name));
DROP POLICY IF EXISTS profile_post_images_read_guard ON storage.objects;
CREATE POLICY profile_post_images_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT
USING (bucket_id <> 'profile-posts' OR public.can_read_profile_update_image(name));

NOTIFY pgrst, 'reload schema';
COMMIT;
