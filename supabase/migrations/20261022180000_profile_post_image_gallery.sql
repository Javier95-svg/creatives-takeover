BEGIN;

ALTER TABLE public.profile_posts
  ADD COLUMN IF NOT EXISTS image_paths text[] NOT NULL DEFAULT '{}';

UPDATE public.profile_posts SET image_paths = ARRAY[image_path]
WHERE image_path IS NOT NULL AND cardinality(image_paths) = 0;

-- Keep the legacy cover field synchronized for existing feeds and notifications.
CREATE OR REPLACE FUNCTION public.validate_profile_post_image_gallery()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE image text;
BEGIN
  IF TG_OP = 'INSERT' AND cardinality(NEW.image_paths) = 0 AND NEW.image_path IS NOT NULL THEN
    NEW.image_paths := ARRAY[NEW.image_path];
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.image_paths IS NOT DISTINCT FROM OLD.image_paths
     AND NEW.image_path IS DISTINCT FROM OLD.image_path THEN
    NEW.image_paths := CASE WHEN NEW.image_path IS NULL THEN '{}'::text[] ELSE ARRAY[NEW.image_path] END;
  END IF;
  IF NEW.image_paths IS NULL OR cardinality(NEW.image_paths) > 4 THEN
    RAISE EXCEPTION 'A post can have up to four images';
  END IF;
  FOREACH image IN ARRAY NEW.image_paths LOOP
    IF image IS NULL OR split_part(image, '/', 1) <> NEW.user_id::text OR split_part(image, '/', 2) = '' THEN
      RAISE EXCEPTION 'Post images must belong to their author';
    END IF;
  END LOOP;
  NEW.image_path := NEW.image_paths[1];
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_profile_post_image_gallery ON public.profile_posts;
CREATE TRIGGER validate_profile_post_image_gallery
  BEFORE INSERT OR UPDATE ON public.profile_posts
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_post_image_gallery();

ALTER TABLE public.profile_posts DROP CONSTRAINT IF EXISTS profile_posts_image_count;
ALTER TABLE public.profile_posts ADD CONSTRAINT profile_posts_image_count
  CHECK (cardinality(image_paths) <= 4);

-- Visitors can view every image of a published post. Scheduled images stay private.
DROP POLICY IF EXISTS profile_post_images_read ON storage.objects;
CREATE POLICY profile_post_images_read ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-posts' AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.profile_posts p
      WHERE (p.image_path = name OR name = ANY(p.image_paths)) AND p.publish_at <= now())
  ));

DROP POLICY IF EXISTS profile_post_images_read_guard ON storage.objects;
CREATE POLICY profile_post_images_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT
  USING (bucket_id <> 'profile-posts' OR (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.profile_posts p
      WHERE (p.image_path = name OR name = ANY(p.image_paths)) AND p.publish_at <= now())
  ));

NOTIFY pgrst, 'reload schema';
COMMIT;
