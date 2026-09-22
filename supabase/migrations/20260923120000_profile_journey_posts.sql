BEGIN;

-- A post becomes public at publish_at, even when its author is offline.
-- Time-based RLS avoids a cron/worker dependency and keeps future posts private.
CREATE TABLE IF NOT EXISTS public.profile_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  image_path text,
  publish_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_posts_content_length CHECK (char_length(content) <= 5000),
  CONSTRAINT profile_posts_not_empty CHECK (length(btrim(content)) > 0 OR image_path IS NOT NULL),
  CONSTRAINT profile_posts_image_owner CHECK (
    image_path IS NULL OR (
      split_part(image_path, '/', 1) = user_id::text
      AND split_part(image_path, '/', 2) <> ''
    )
  )
);

CREATE INDEX IF NOT EXISTS profile_posts_user_publish_idx
  ON public.profile_posts(user_id, publish_at DESC);

ALTER TABLE public.profile_posts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profile_posts TO anon, authenticated;
GRANT INSERT, DELETE ON public.profile_posts TO authenticated;

DROP POLICY IF EXISTS profile_posts_read ON public.profile_posts;
CREATE POLICY profile_posts_read ON public.profile_posts FOR SELECT
  USING (publish_at <= now() OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profile_posts_create ON public.profile_posts;
CREATE POLICY profile_posts_create ON public.profile_posts FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profile_posts_delete ON public.profile_posts;
CREATE POLICY profile_posts_delete ON public.profile_posts FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Scheduled photos are private too. Public posts can request a signed image URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-posts', 'profile-posts', false, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS profile_post_images_read ON storage.objects;
CREATE POLICY profile_post_images_read ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-posts' AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.profile_posts p
      WHERE p.image_path = name AND p.publish_at <= now()
    )
  ));

DROP POLICY IF EXISTS profile_post_images_upload ON storage.objects;
CREATE POLICY profile_post_images_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-posts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS profile_post_images_delete ON storage.objects;
CREATE POLICY profile_post_images_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profile-posts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- Older storage policies may be permissive across multiple buckets. Restrictive
-- guards ensure they cannot expose scheduled photos or authorize another owner.
DROP POLICY IF EXISTS profile_post_images_read_guard ON storage.objects;
CREATE POLICY profile_post_images_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT
  USING (bucket_id <> 'profile-posts' OR (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.profile_posts p
      WHERE p.image_path = name AND p.publish_at <= now()
    )
  ));

DROP POLICY IF EXISTS profile_post_images_insert_guard ON storage.objects;
CREATE POLICY profile_post_images_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT
  WITH CHECK (bucket_id <> 'profile-posts'
    OR (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS profile_post_images_delete_guard ON storage.objects;
CREATE POLICY profile_post_images_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE
  USING (bucket_id <> 'profile-posts'
    OR (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS profile_post_images_update_guard ON storage.objects;
CREATE POLICY profile_post_images_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE
  USING (bucket_id <> 'profile-posts') WITH CHECK (bucket_id <> 'profile-posts');

NOTIFY pgrst, 'reload schema';
COMMIT;
