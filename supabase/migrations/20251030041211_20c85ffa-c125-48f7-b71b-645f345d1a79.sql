-- Fix search_path for security definer functions
-- First drop the trigger
DROP TRIGGER IF EXISTS update_user_last_activity ON community_posts;

-- Drop the function
DROP FUNCTION IF EXISTS update_last_activity();

-- Recreate function with proper search_path
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  UPDATE profiles 
  SET last_activity_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_user_last_activity
AFTER INSERT ON community_posts
FOR EACH ROW
EXECUTE FUNCTION update_last_activity();

-- Fix calculate_profile_completion function
DROP FUNCTION IF EXISTS calculate_profile_completion(UUID);

CREATE OR REPLACE FUNCTION calculate_profile_completion(p_user_id UUID)
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;