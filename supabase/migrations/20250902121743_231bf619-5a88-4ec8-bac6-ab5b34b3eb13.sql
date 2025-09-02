-- Fix security warnings by adding search_path to functions
CREATE OR REPLACE FUNCTION update_post_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE community_posts 
      SET 
        upvotes = (SELECT COUNT(*) FROM user_votes WHERE post_id = NEW.post_id AND vote_type = 'up'),
        downvotes = (SELECT COUNT(*) FROM user_votes WHERE post_id = NEW.post_id AND vote_type = 'down')
      WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE community_posts 
      SET 
        upvotes = (SELECT COUNT(*) FROM user_votes WHERE post_id = OLD.post_id AND vote_type = 'up'),
        downvotes = (SELECT COUNT(*) FROM user_votes WHERE post_id = OLD.post_id AND vote_type = 'down')
      WHERE id = OLD.post_id;
    END IF;
    IF NEW.post_id IS NOT NULL AND NEW.post_id != OLD.post_id THEN
      UPDATE community_posts 
      SET 
        upvotes = (SELECT COUNT(*) FROM user_votes WHERE post_id = NEW.post_id AND vote_type = 'up'),
        downvotes = (SELECT COUNT(*) FROM user_votes WHERE post_id = NEW.post_id AND vote_type = 'down')
      WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE community_posts 
      SET 
        upvotes = (SELECT COUNT(*) FROM user_votes WHERE post_id = OLD.post_id AND vote_type = 'up'),
        downvotes = (SELECT COUNT(*) FROM user_votes WHERE post_id = OLD.post_id AND vote_type = 'down')
      WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix comment count function
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts 
    SET comment_count = (SELECT COUNT(*) FROM post_comments WHERE post_id = NEW.post_id)
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts 
    SET comment_count = (SELECT COUNT(*) FROM post_comments WHERE post_id = OLD.post_id)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix handle new user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;