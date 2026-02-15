-- Function to notify user of follow request
CREATE OR REPLACE FUNCTION notify_follow_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify on new pending follow requests
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    PERFORM create_community_notification(
      p_user_id := NEW.following_id,
      p_actor_id := NEW.follower_id,
      p_notification_type := 'follow_request',
      p_metadata := jsonb_build_object('follow_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for follow request notifications
CREATE TRIGGER on_follow_request_notification
  AFTER INSERT ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_follow_request();
