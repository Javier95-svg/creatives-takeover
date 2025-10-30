-- Add profile completion and activity tracking fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add content_type and rich content fields to community_posts
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'post',
ADD COLUMN IF NOT EXISTS rich_content JSONB,
ADD COLUMN IF NOT EXISTS media_urls TEXT[],
ADD COLUMN IF NOT EXISTS draft_data JSONB;

-- Create user_activity table for timeline
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_content_type ON community_posts(content_type);
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON profiles(last_activity_at DESC);

-- Enable RLS on user_activity
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_activity
CREATE POLICY "Users can view their own activity"
  ON user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity"
  ON user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update last_activity_at
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET last_activity_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last_activity_at when user posts
CREATE TRIGGER update_user_last_activity
AFTER INSERT ON community_posts
FOR EACH ROW
EXECUTE FUNCTION update_last_activity();

-- Function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion INTEGER := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = p_user_id;
  
  IF profile_record IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Basic info (20% each)
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
    completion := completion + 20;
  END IF;
  
  IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN
    completion := completion + 20;
  END IF;
  
  IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
    completion := completion + 20;
  END IF;
  
  -- Creative info (20%)
  IF profile_record.creative_niche IS NOT NULL OR profile_record.business_stage IS NOT NULL THEN
    completion := completion + 20;
  END IF;
  
  -- Social links (20%)
  IF profile_record.twitter_url IS NOT NULL OR 
     profile_record.linkedin_url IS NOT NULL OR 
     profile_record.website_url IS NOT NULL THEN
    completion := completion + 20;
  END IF;
  
  UPDATE profiles SET profile_completion_percentage = completion WHERE id = p_user_id;
  
  RETURN completion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;