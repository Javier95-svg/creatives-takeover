-- Enable realtime for community posts and comments
ALTER TABLE community_posts REPLICA IDENTITY FULL;
ALTER TABLE post_comments REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;

-- Add posts and comments to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Create user votes table for tracking post and comment votes
CREATE TABLE public.user_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id),
  CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

-- Enable RLS on user_votes
ALTER TABLE public.user_votes ENABLE ROW LEVEL SECURITY;

-- Create policies for user_votes
CREATE POLICY "Users can view all votes" ON public.user_votes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own votes" ON public.user_votes FOR ALL USING (auth.uid() = user_id);

-- Create user bookmarks table
CREATE TABLE public.user_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS on user_bookmarks
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policies for user_bookmarks
CREATE POLICY "Users can view their own bookmarks" ON public.user_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own bookmarks" ON public.user_bookmarks FOR ALL USING (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('post_vote', 'comment_vote', 'comment_reply', 'post_comment')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  from_user_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Add realtime for new tables
ALTER TABLE user_votes REPLICA IDENTITY FULL;
ALTER TABLE user_bookmarks REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE user_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE user_bookmarks;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create function to update vote counts on posts
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for vote count updates
CREATE TRIGGER update_post_vote_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_votes
  FOR EACH ROW EXECUTE FUNCTION update_post_vote_counts();

-- Create function to update comment counts on posts
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for comment count updates
CREATE TRIGGER update_post_comment_count_trigger
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Add triggers for updated_at on new tables
CREATE TRIGGER update_user_votes_updated_at
  BEFORE UPDATE ON public.user_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup and create profile
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();