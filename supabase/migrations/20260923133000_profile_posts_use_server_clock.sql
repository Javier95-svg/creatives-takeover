BEGIN;

-- Classify scheduled posts with the database clock. The previous client used
-- the browser clock in publish_at filters, so even a small clock difference
-- could make an immediate post look scheduled until the next 30-second poll.
CREATE OR REPLACE FUNCTION public.list_profile_journey_posts(
  p_user_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  image_path text,
  publish_at timestamptz,
  created_at timestamptz,
  is_scheduled boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH ranked AS (
    SELECT
      p.id,
      p.user_id,
      p.content,
      p.image_path,
      p.publish_at,
      p.created_at,
      p.publish_at > statement_timestamp() AS is_scheduled,
      row_number() OVER (
        PARTITION BY (p.publish_at > statement_timestamp())
        ORDER BY p.publish_at DESC, p.id DESC
      ) AS section_rank
    FROM public.profile_posts p
    WHERE p.user_id = p_user_id
  )
  SELECT
    ranked.id,
    ranked.user_id,
    ranked.content,
    ranked.image_path,
    ranked.publish_at,
    ranked.created_at,
    ranked.is_scheduled
  FROM ranked
  WHERE ranked.section_rank <= greatest(1, least(coalesce(p_limit, 20), 100))
  ORDER BY ranked.is_scheduled, ranked.publish_at DESC, ranked.id DESC;
$$;

REVOKE ALL ON FUNCTION public.list_profile_journey_posts(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_profile_journey_posts(uuid, integer) TO anon, authenticated;

COMMENT ON FUNCTION public.list_profile_journey_posts(uuid, integer) IS
  'Lists visible profile journey posts and classifies scheduling with database time; table RLS keeps future posts owner-only.';

NOTIFY pgrst, 'reload schema';
COMMIT;
