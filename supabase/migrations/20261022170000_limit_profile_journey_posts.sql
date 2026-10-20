BEGIN;

-- A Founder ID is a short, current journey. Keep the five newest updates and
-- automatically remove older records (their dependent interactions and pin
-- references cascade through the existing foreign keys).
CREATE OR REPLACE FUNCTION public.keep_latest_profile_journey_posts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.profile_posts AS post_to_remove
  WHERE post_to_remove.user_id = NEW.user_id
    AND post_to_remove.id IN (
      SELECT id
      FROM public.profile_posts
      WHERE user_id = NEW.user_id
      ORDER BY publish_at DESC, id DESC
      OFFSET 5
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS keep_latest_profile_journey_posts_on_insert ON public.profile_posts;
CREATE TRIGGER keep_latest_profile_journey_posts_on_insert
  AFTER INSERT ON public.profile_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.keep_latest_profile_journey_posts();

-- Apply the same limit to profiles that already have more than five updates.
WITH ranked_posts AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY user_id ORDER BY publish_at DESC, id DESC) AS position
  FROM public.profile_posts
)
DELETE FROM public.profile_posts AS post_to_remove
USING ranked_posts
WHERE post_to_remove.id = ranked_posts.id
  AND ranked_posts.position > 5;

COMMENT ON FUNCTION public.keep_latest_profile_journey_posts() IS
  'Keeps the five newest profile journey posts per user, removing older posts after each new post.';

NOTIFY pgrst, 'reload schema';
COMMIT;