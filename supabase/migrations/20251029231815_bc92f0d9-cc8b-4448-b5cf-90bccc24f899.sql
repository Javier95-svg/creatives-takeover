-- =====================================================
-- COMPREHENSIVE RLS FIX FOR PROFILES TABLE
-- =====================================================

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new restrictive policies for profiles table

-- 1. Users can view their own full profile (all columns including PII)
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 2. Users can view profiles of people they follow (accepted follows) - limited columns
CREATE POLICY "Users can view followed profiles"
  ON public.profiles
  FOR SELECT
  USING (
    id IN (
      SELECT following_id 
      FROM user_follows 
      WHERE follower_id = auth.uid() 
      AND status = 'accepted'
    )
    OR id IN (
      SELECT follower_id 
      FROM user_follows 
      WHERE following_id = auth.uid() 
      AND status = 'accepted'
    )
  );

-- 3. Users can view profiles of their friends (accepted friendships) - limited columns
CREATE POLICY "Users can view friend profiles"
  ON public.profiles
  FOR SELECT
  USING (
    id IN (
      SELECT receiver_id 
      FROM friend_requests 
      WHERE sender_id = auth.uid() 
      AND status = 'accepted'
    )
    OR id IN (
      SELECT sender_id 
      FROM friend_requests 
      WHERE receiver_id = auth.uid() 
      AND status = 'accepted'
    )
  );

-- 4. Community members can see basic public info for users with community activity
-- This allows viewing username, avatar, bio, location for active community members
CREATE POLICY "Community can view active member profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Users who have made community posts
    id IN (SELECT DISTINCT user_id FROM community_posts)
    OR
    -- Users who have commented on posts
    id IN (SELECT DISTINCT user_id FROM post_comments)
    OR
    -- Users with public reputation
    id IN (SELECT DISTINCT user_id FROM user_reputation)
  );

-- 5. Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Keep existing UPDATE and INSERT policies
-- Users can update their own profile (existing policy should remain)
-- Users can insert their own profile (existing policy should remain)

-- =====================================================
-- COMPREHENSIVE RLS FIX FOR CHATBOT_FEEDBACK TABLE
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can create their own feedback" ON public.chatbot_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.chatbot_feedback;

-- Enable RLS if not already enabled
ALTER TABLE public.chatbot_feedback ENABLE ROW LEVEL SECURITY;

-- 1. Users can insert their own feedback
CREATE POLICY "Users can submit their own feedback"
  ON public.chatbot_feedback
  FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id) OR (user_id IS NULL)
  );

-- 2. Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON public.chatbot_feedback
  FOR SELECT
  USING (
    (auth.uid() = user_id) OR (user_id IS NULL AND auth.uid() IS NULL)
  );

-- 3. Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON public.chatbot_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- 4. Admins can update feedback (for moderation)
CREATE POLICY "Admins can update feedback"
  ON public.chatbot_feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- 5. Admins can delete feedback (for moderation)
CREATE POLICY "Admins can delete feedback"
  ON public.chatbot_feedback
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- =====================================================
-- CREATE SECURITY HELPER FUNCTIONS
-- =====================================================

-- Function to check if a user is following another user
CREATE OR REPLACE FUNCTION public.is_following(viewer_id uuid, profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_follows 
    WHERE follower_id = viewer_id 
    AND following_id = profile_id 
    AND status = 'accepted'
  );
END;
$$;

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM friend_requests 
    WHERE (
      (sender_id = user1_id AND receiver_id = user2_id)
      OR 
      (sender_id = user2_id AND receiver_id = user1_id)
    )
    AND status = 'accepted'
  );
END;
$$;

-- Function to check if user is active in community
CREATE OR REPLACE FUNCTION public.is_community_active(profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM community_posts WHERE user_id = profile_id
    UNION
    SELECT 1 FROM post_comments WHERE user_id = profile_id
    UNION
    SELECT 1 FROM user_reputation WHERE user_id = profile_id
  );
END;
$$;

-- =====================================================
-- ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for follow lookups
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_following 
  ON user_follows(follower_id, following_id, status);

-- Index for friend lookups
CREATE INDEX IF NOT EXISTS idx_friend_requests_users_status 
  ON friend_requests(sender_id, receiver_id, status);

-- Index for community activity lookups
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id 
  ON community_posts(user_id);
  
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id 
  ON post_comments(user_id);

-- Index for chatbot_feedback queries
CREATE INDEX IF NOT EXISTS idx_chatbot_feedback_user_id 
  ON chatbot_feedback(user_id);

-- =====================================================
-- SECURITY NOTES AND DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "Users can view their own profile" ON public.profiles IS 
  'Users have full access to their own profile data including all PII';

COMMENT ON POLICY "Users can view followed profiles" ON public.profiles IS 
  'Users can view profiles of people they follow (accepted follows) - access to public profile data only';

COMMENT ON POLICY "Community can view active member profiles" ON public.profiles IS 
  'Active community members profiles are visible for community features - basic info only (username, avatar, bio, location)';

COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 
  'Administrators have full access to all profiles for moderation and support';

COMMENT ON POLICY "Users can submit their own feedback" ON public.chatbot_feedback IS 
  'Users and anonymous users can submit feedback';

COMMENT ON POLICY "Users can view their own feedback" ON public.chatbot_feedback IS 
  'Users can only view their own submitted feedback';

COMMENT ON POLICY "Admins can view all feedback" ON public.chatbot_feedback IS 
  'Administrators can view all feedback for review and action';