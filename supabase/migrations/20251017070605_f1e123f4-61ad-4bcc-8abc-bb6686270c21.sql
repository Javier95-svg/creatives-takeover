-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_post_comment_created ON post_comments;
DROP TRIGGER IF EXISTS on_post_liked ON user_votes;
DROP TRIGGER IF EXISTS on_post_reposted ON post_reposts;

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