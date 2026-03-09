-- Ensure mentor banner notifications use mentor profile picture metadata.

CREATE OR REPLACE FUNCTION public.notify_all_users_on_new_mentor_banner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  v_actor_id := COALESCE(NEW.user_id, auth.uid());
  IF v_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.community_notifications (
    user_id,
    actor_id,
    notification_type,
    read,
    metadata
  )
  SELECT
    u.id,
    v_actor_id,
    'mentor_banner_created',
    false,
    jsonb_build_object(
      'mentor_id', NEW.id,
      'mentor_name', NEW.name,
      'picture', NEW.picture,
      'image_url', NEW.picture,
      'route', '/community'
    )
  FROM auth.users u;

  RETURN NEW;
END;
$$;
