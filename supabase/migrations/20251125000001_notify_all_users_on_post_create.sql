-- Auto-notify all users when a new post is published
-- This trigger creates a notification for every user (except the post author) whenever a new post is inserted

-- Function to notify all users about a new post
CREATE OR REPLACE FUNCTION notify_all_users_on_new_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_author_name text;
  v_post_title text;
BEGIN
  -- Get author name for metadata
  SELECT COALESCE(full_name, 'Anonymous') INTO v_author_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Get post title (truncate if too long)
  v_post_title := LEFT(NEW.title, 100);
  
  -- Loop through all users except the post author
  FOR v_user_record IN
    SELECT id
    FROM profiles
    WHERE id != NEW.user_id
  LOOP
    -- Create notification for each user
    PERFORM create_community_notification(
      v_user_record.id,                    -- user_id: recipient
      NEW.user_id,                         -- actor_id: post author
      'new_post',                          -- notification_type
      NEW.id,                              -- post_id
      NULL,                                -- comment_id (not applicable)
      jsonb_build_object(                  -- metadata
        'post_title', v_post_title,
        'author_name', v_author_name,
        'post_created_at', NEW.created_at
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger on community_posts table
CREATE TRIGGER on_new_post_notify_all_users
  AFTER INSERT ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_all_users_on_new_post();

-- Add comment for documentation
COMMENT ON FUNCTION notify_all_users_on_new_post() IS 
  'Automatically creates notifications for all users (except the post author) when a new post is published';

COMMENT ON TRIGGER on_new_post_notify_all_users ON community_posts IS 
  'Triggers notification creation for all users when a new post is inserted';

