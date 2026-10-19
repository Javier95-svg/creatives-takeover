-- Public connection discovery and connection post notifications.
-- The profile card shows only safe public fields for accepted connections.

CREATE OR REPLACE FUNCTION public.public_profile_connections_v1(p_username text)
RETURNS TABLE (
  account_id uuid,
  username text,
  full_name text,
  avatar_url text,
  connected_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH profile_owner AS (
    SELECT id
    FROM public.profiles
    WHERE lower(username) = lower(trim(p_username))
    LIMIT 1
  ),
  connected_accounts AS (
    SELECT
      CASE WHEN fr.sender_id = owner.id THEN fr.receiver_id ELSE fr.sender_id END AS account_id,
      max(fr.updated_at) AS connected_at
    FROM public.friend_requests fr
    JOIN profile_owner owner ON fr.sender_id = owner.id OR fr.receiver_id = owner.id
    WHERE fr.status = 'accepted'
    GROUP BY 1
  )
  SELECT
    profile.id,
    profile.username,
    profile.full_name,
    profile.avatar_url,
    connected.connected_at
  FROM connected_accounts connected
  JOIN public.profiles profile ON profile.id = connected.account_id
  ORDER BY connected.connected_at DESC,
           lower(coalesce(profile.full_name, profile.username, ''));
$function$;

REVOKE ALL ON FUNCTION public.public_profile_connections_v1(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_profile_connections_v1(text) TO anon, authenticated;

COMMENT ON FUNCTION public.public_profile_connections_v1(text) IS
  'Public profile-card fields for accounts with an accepted connection to the named profile.';

-- Notify every accepted connection when an immediately published journey post is created.
-- Scheduled posts stay private until their publish time and are not announced early.
CREATE OR REPLACE FUNCTION public.notify_connections_of_profile_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.publish_at > now() THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.community_notifications (
    user_id,
    actor_id,
    notification_type,
    read,
    metadata
  )
  SELECT DISTINCT
    CASE WHEN fr.sender_id = NEW.user_id THEN fr.receiver_id ELSE fr.sender_id END,
    NEW.user_id,
    'profile_post_published',
    false,
    jsonb_build_object(
      'profile_post_id', NEW.id,
      'route', CASE
        WHEN author.username IS NOT NULL THEN '/profile/' || author.username || '?post=journey:' || NEW.id
        ELSE '/profile'
      END,
      'message', coalesce(author.full_name, author.username, 'A connection') || ' posted an update'
    )
  FROM public.friend_requests fr
  JOIN public.profiles author ON author.id = NEW.user_id
  WHERE fr.status = 'accepted'
    AND (fr.sender_id = NEW.user_id OR fr.receiver_id = NEW.user_id)
    AND CASE WHEN fr.sender_id = NEW.user_id THEN fr.receiver_id ELSE fr.sender_id END <> NEW.user_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profile_post_connection_notifications ON public.profile_posts;
CREATE TRIGGER profile_post_connection_notifications
  AFTER INSERT ON public.profile_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_connections_of_profile_post();

NOTIFY pgrst, 'reload schema';
