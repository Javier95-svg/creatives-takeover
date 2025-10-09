-- Phase 3: Community Momentum Features

-- Community pulse metrics (daily aggregated stats)
CREATE TABLE public.community_pulse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pulse_date DATE NOT NULL UNIQUE,
  total_posts INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_upvotes INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  avg_engagement_score NUMERIC DEFAULT 0,
  trending_topics TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_pulse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view community pulse"
ON public.community_pulse FOR SELECT
USING (true);

CREATE POLICY "Service role can manage pulse"
ON public.community_pulse FOR ALL
USING (auth.role() = 'service_role');

-- Featured content
CREATE TABLE public.featured_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  featured_reason TEXT,
  featured_by UUID REFERENCES auth.users(id),
  featured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active featured content"
ON public.featured_content FOR SELECT
USING (is_active = true AND expires_at > now());

CREATE POLICY "Admins can manage featured content"
ON public.featured_content FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Phase 4: Badge & Achievement Definitions

-- Badge definitions
CREATE TABLE public.badge_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER,
  requirement_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badge definitions"
ON public.badge_definitions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage badge definitions"
ON public.badge_definitions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default badges
INSERT INTO public.badge_definitions (id, name, description, icon, rarity, requirement_type, requirement_value) VALUES
('first_post', 'First Steps', 'Posted your first story', '📝', 'common', 'action_count', 1),
('commentator', 'Conversationalist', 'Left 10 helpful comments', '💬', 'common', 'action_count', 10),
('supporter', 'Community Supporter', 'Upvoted 50 posts', '👍', 'common', 'action_count', 50),
('7_day_streak', 'Week Warrior', 'Maintained a 7-day streak', '🔥', 'rare', 'streak', 7),
('30_day_streak', 'Monthly Champion', 'Maintained a 30-day streak', '⚡', 'epic', 'streak', 30),
('100_day_streak', 'Century Legend', 'Maintained a 100-day streak', '🏆', 'legendary', 'streak', 100),
('explorer', 'Explorer', 'Reached Explorer level', '🗺️', 'common', 'points', 100),
('contributor', 'Contributor', 'Reached Contributor level', '🌟', 'rare', 'points', 500),
('mentor', 'Mentor', 'Reached Mentor level', '🎓', 'epic', 'points', 5000),
('legend', 'Legend', 'Reached Legend level', '👑', 'legendary', 'points', 15000),
('feedback_pro', 'Feedback Pro', 'Provided detailed feedback on 25 posts', '💡', 'rare', 'action_count', 25),
('early_bird', 'Early Bird', 'First to complete a daily challenge', '🌅', 'rare', 'special', NULL),
('challenge_master', 'Challenge Master', 'Completed 30 daily challenges', '🎯', 'epic', 'action_count', 30);

-- Achievement tracking
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_title TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_type)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
ON public.user_achievements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage achievements"
ON public.user_achievements FOR ALL
USING (auth.role() = 'service_role');

-- Community milestones
CREATE TABLE public.community_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_type TEXT NOT NULL,
  milestone_title TEXT NOT NULL,
  milestone_description TEXT,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  achieved BOOLEAN DEFAULT false,
  achieved_at TIMESTAMPTZ,
  celebration_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view milestones"
ON public.community_milestones FOR SELECT
USING (true);

CREATE POLICY "Service role can manage milestones"
ON public.community_milestones FOR ALL
USING (auth.role() = 'service_role');

-- Insert initial community milestones
INSERT INTO public.community_milestones (milestone_type, milestone_title, milestone_description, target_value, celebration_message) VALUES
('total_posts', 'First 100 Stories', 'Community reaches 100 shared stories', 100, '🎉 We hit 100 stories! Keep sharing!'),
('total_posts', 'Storytelling Champions', 'Community reaches 1,000 stories', 1000, '🚀 1,000 stories shared! Amazing community!'),
('active_users', 'Growing Community', '100 active community members', 100, '👥 100 active members strong!'),
('total_challenges', 'Challenge Enthusiasts', '500 challenges completed', 500, '🎯 500 challenges conquered!');

-- Phase 4: Auto-award functions

-- Function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reputation RECORD;
  v_post_count INTEGER;
  v_comment_count INTEGER;
  v_upvote_count INTEGER;
  v_streak INTEGER;
  v_challenges_completed INTEGER;
  v_new_badges JSONB := '[]'::jsonb;
  v_badge RECORD;
BEGIN
  SELECT * INTO v_reputation FROM user_reputation WHERE user_id = p_user_id;
  
  IF v_reputation IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  
  SELECT COUNT(*) INTO v_post_count FROM community_posts WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_comment_count FROM post_comments WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_upvote_count FROM user_votes WHERE user_id = p_user_id AND vote_type = 'up';
  
  SELECT COALESCE(MAX(streak_count), 0) INTO v_streak 
  FROM daily_check_ins WHERE user_id = p_user_id;
  
  SELECT COUNT(*) INTO v_challenges_completed 
  FROM user_challenge_completions WHERE user_id = p_user_id;
  
  FOR v_badge IN 
    SELECT bd.* FROM badge_definitions bd
    WHERE bd.id NOT IN (
      SELECT (badge->>'id')::text 
      FROM user_reputation ur, jsonb_array_elements(ur.badges) badge
      WHERE ur.user_id = p_user_id
    )
  LOOP
    IF (v_badge.requirement_type = 'points' AND v_reputation.total_points >= v_badge.requirement_value) OR
       (v_badge.requirement_type = 'streak' AND v_streak >= v_badge.requirement_value) OR
       (v_badge.requirement_type = 'action_count' AND v_badge.id = 'first_post' AND v_post_count >= v_badge.requirement_value) OR
       (v_badge.requirement_type = 'action_count' AND v_badge.id = 'commentator' AND v_comment_count >= v_badge.requirement_value) OR
       (v_badge.requirement_type = 'action_count' AND v_badge.id = 'supporter' AND v_upvote_count >= v_badge.requirement_value) OR
       (v_badge.requirement_type = 'action_count' AND v_badge.id = 'challenge_master' AND v_challenges_completed >= v_badge.requirement_value)
    THEN
      UPDATE user_reputation
      SET badges = COALESCE(badges, '[]'::jsonb) || jsonb_build_object(
        'id', v_badge.id,
        'name', v_badge.name,
        'description', v_badge.description,
        'icon', v_badge.icon,
        'rarity', v_badge.rarity,
        'earned_at', now()
      )
      WHERE user_id = p_user_id;
      
      v_new_badges := v_new_badges || jsonb_build_object(
        'id', v_badge.id,
        'name', v_badge.name,
        'icon', v_badge.icon,
        'rarity', v_badge.rarity
      );
    END IF;
  END LOOP;
  
  RETURN v_new_badges;
END;
$$;

-- Function to calculate trending score for posts
CREATE OR REPLACE FUNCTION public.calculate_trending_score(
  p_post_id UUID,
  p_time_decay_hours INTEGER DEFAULT 48
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_post RECORD;
  v_age_hours NUMERIC;
  v_time_decay NUMERIC;
  v_engagement_score NUMERIC;
  v_velocity_score NUMERIC;
BEGIN
  SELECT 
    upvotes,
    downvotes,
    comment_count,
    share_count,
    created_at
  INTO v_post
  FROM community_posts
  WHERE id = p_post_id;
  
  IF v_post IS NULL THEN
    RETURN 0;
  END IF;
  
  v_age_hours := EXTRACT(EPOCH FROM (now() - v_post.created_at)) / 3600;
  v_time_decay := EXP(-v_age_hours / p_time_decay_hours);
  
  v_engagement_score := 
    (v_post.upvotes * 1.0) +
    (v_post.comment_count * 2.0) +
    (v_post.share_count * 3.0) -
    (v_post.downvotes * 0.5);
  
  IF v_age_hours > 0 THEN
    v_velocity_score := v_engagement_score / v_age_hours;
  ELSE
    v_velocity_score := v_engagement_score;
  END IF;
  
  RETURN (v_engagement_score * v_time_decay) + (v_velocity_score * 10);
END;
$$;

-- Phase 5: Admin Analytics Views

CREATE MATERIALIZED VIEW public.admin_reputation_analytics AS
SELECT
  DATE_TRUNC('day', rt.created_at) as date,
  COUNT(DISTINCT rt.user_id) as active_users,
  SUM(rt.points) as total_points_awarded,
  COUNT(*) as total_transactions,
  rt.action_type,
  AVG(rt.points) as avg_points_per_action
FROM reputation_transactions rt
WHERE rt.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', rt.created_at), rt.action_type;

CREATE UNIQUE INDEX ON admin_reputation_analytics (date, action_type);

CREATE OR REPLACE FUNCTION public.refresh_admin_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_reputation_analytics;
END;
$$;

ALTER MATERIALIZED VIEW admin_reputation_analytics OWNER TO postgres;

-- Create performance indexes (using IF NOT EXISTS to avoid conflicts)
CREATE INDEX IF NOT EXISTS idx_user_reputation_level ON user_reputation(level);
CREATE INDEX IF NOT EXISTS idx_user_reputation_total_points ON user_reputation(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_streak ON daily_check_ins(streak_count DESC);