-- Function to notify followers when user posts content
CREATE OR REPLACE FUNCTION notify_followers_of_content()
RETURNS TRIGGER AS $$
DECLARE
  follower_record RECORD;
  notification_type TEXT;
BEGIN
  -- Determine notification type based on table
  IF TG_TABLE_NAME = 'user_photos' THEN
    notification_type := 'follower_new_picture';
  ELSIF TG_TABLE_NAME = 'user_reels' THEN
    notification_type := 'follower_new_reel';
  ELSIF TG_TABLE_NAME = 'startup_updates' THEN
    notification_type := 'follower_startup_update';
  ELSE
    RETURN NEW;
  END IF;

  -- Loop through all accepted followers
  FOR follower_record IN
    SELECT follower_id
    FROM public.user_follows
    WHERE following_id = NEW.user_id
      AND status = 'accepted'
  LOOP
    -- Create notification for each follower
    PERFORM create_community_notification(
      p_user_id := follower_record.follower_id,
      p_actor_id := NEW.user_id,
      p_notification_type := notification_type,
      p_metadata := jsonb_build_object('content_id', NEW.id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for user_photos (pictures)
CREATE TRIGGER notify_followers_picture
  AFTER INSERT ON public.user_photos
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_of_content();

-- Trigger for user_reels (video content)
CREATE TRIGGER notify_followers_reel
  AFTER INSERT ON public.user_reels
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_of_content();

-- Trigger for startup_updates
CREATE TRIGGER notify_followers_update
  AFTER INSERT ON public.startup_updates
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_of_content();
