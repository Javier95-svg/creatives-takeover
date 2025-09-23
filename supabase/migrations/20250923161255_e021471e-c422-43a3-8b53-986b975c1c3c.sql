-- Add repost functionality to community_posts
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS repost_count INTEGER DEFAULT 0;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_repost BOOLEAN DEFAULT FALSE;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS original_post_id UUID REFERENCES community_posts(id);

-- Create reposts table
CREATE TABLE IF NOT EXISTS post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS on reposts
ALTER TABLE post_reposts ENABLE ROW LEVEL SECURITY;

-- Create policies for reposts
CREATE POLICY "Users can view all reposts" 
ON post_reposts FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own reposts" 
ON post_reposts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reposts" 
ON post_reposts FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update repost counts
CREATE OR REPLACE FUNCTION update_post_repost_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts 
    SET repost_count = (SELECT COUNT(*) FROM post_reposts WHERE post_id = NEW.post_id)
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts 
    SET repost_count = (SELECT COUNT(*) FROM post_reposts WHERE post_id = OLD.post_id)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create trigger for repost counts
DROP TRIGGER IF EXISTS update_repost_counts_trigger ON post_reposts;
CREATE TRIGGER update_repost_counts_trigger
  AFTER INSERT OR DELETE ON post_reposts
  FOR EACH ROW EXECUTE FUNCTION update_post_repost_counts();