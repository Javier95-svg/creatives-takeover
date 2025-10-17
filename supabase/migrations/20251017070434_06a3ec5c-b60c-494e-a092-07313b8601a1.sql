-- Trigger to create notification when someone comments on a post
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id uuid;
BEGIN
  -- Get the post author
  SELECT user_id INTO v_post_author_id
  FROM community_posts
  WHERE id = NEW.post_id;
  
  -- Create notification
  PERFORM create_community_notification(
    v_post_author_id,
    NEW.user_id,
    'comment',
    NEW.post_id,
    NEW.id,
    jsonb_build_object('comment_content', LEFT(NEW.content, 100))
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_comment_created
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_comment();

-- Trigger to create notification when someone likes a post
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id uuid;
BEGIN
  -- Only notify on upvotes
  IF NEW.vote_type = 'up' AND NEW.post_id IS NOT NULL THEN
    -- Get the post author
    SELECT user_id INTO v_post_author_id
    FROM community_posts
    WHERE id = NEW.post_id;
    
    -- Create notification
    PERFORM create_community_notification(
      v_post_author_id,
      NEW.user_id,
      'like',
      NEW.post_id,
      NULL,
      '{}'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_liked
  AFTER INSERT ON user_votes
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_like();

-- Trigger to create notification when someone reposts
CREATE OR REPLACE FUNCTION notify_post_repost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id uuid;
BEGIN
  -- Get the original post author
  SELECT user_id INTO v_post_author_id
  FROM community_posts
  WHERE id = NEW.post_id;
  
  -- Create notification
  PERFORM create_community_notification(
    v_post_author_id,
    NEW.user_id,
    'repost',
    NEW.post_id,
    NULL,
    '{}'::jsonb
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_reposted
  AFTER INSERT ON post_reposts
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_repost();

-- Trigger to create notification when someone shares a post
-- Note: This assumes sharing increments share_count in community_posts
-- If you have a separate shares table, adjust accordingly
CREATE OR REPLACE FUNCTION notify_post_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create notification if share_count increased
  IF NEW.share_count > OLD.share_count THEN
    -- We don't have actor_id here, so this trigger won't work as is
    -- You'd need to track shares in a separate table to get actor_id
    -- For now, commenting this out
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: Share notifications would require a separate post_shares table to track who shared
-- For now, we have comment, like, and repost notifications working