-- ================================================
-- BIZMAP FOUNDER OS TRANSFORMATION - DATABASE SCHEMA
-- ================================================

-- ============================================
-- 1. MARKET VALIDATION SCORES
-- ============================================

CREATE TABLE IF NOT EXISTS public.market_validation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  business_idea TEXT NOT NULL,
  industry TEXT,
  target_market TEXT,
  
  -- Validation Metrics (0-100 scale)
  market_size_score NUMERIC(5,2) CHECK (market_size_score >= 0 AND market_size_score <= 100),
  competition_score NUMERIC(5,2) CHECK (competition_score >= 0 AND competition_score <= 100),
  demand_score NUMERIC(5,2) CHECK (demand_score >= 0 AND demand_score <= 100),
  overall_validation_score NUMERIC(5,2) CHECK (overall_validation_score >= 0 AND overall_validation_score <= 100),
  
  -- Market Data
  estimated_market_size_usd BIGINT,
  competitor_count INTEGER,
  top_competitors JSONB DEFAULT '[]'::jsonb,
  demand_trends JSONB DEFAULT '{}'::jsonb,
  search_volume_data JSONB DEFAULT '{}'::jsonb,
  
  -- Gap Analysis
  competitor_gaps JSONB DEFAULT '[]'::jsonb,
  differentiation_opportunities TEXT[] DEFAULT '{}',
  
  -- Metadata
  validation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_sources JSONB DEFAULT '[]'::jsonb,
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.market_validation_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own validation scores"
  ON public.market_validation_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own validation scores"
  ON public.market_validation_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own validation scores"
  ON public.market_validation_scores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own validation scores"
  ON public.market_validation_scores FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_market_validation_user_id ON public.market_validation_scores(user_id);
CREATE INDEX idx_market_validation_session_id ON public.market_validation_scores(session_id);
CREATE INDEX idx_market_validation_overall_score ON public.market_validation_scores(overall_validation_score DESC);

-- ============================================
-- 2. LAUNCH ROADMAPS
-- ============================================

CREATE TABLE IF NOT EXISTS public.launch_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  business_idea TEXT NOT NULL,
  
  -- Roadmap Config
  start_date DATE NOT NULL,
  target_launch_date DATE NOT NULL,
  current_week INTEGER DEFAULT 1 CHECK (current_week >= 1 AND current_week <= 4),
  current_day INTEGER DEFAULT 1 CHECK (current_day >= 1 AND current_day <= 30),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  
  -- Milestones
  week1_validated BOOLEAN DEFAULT FALSE,
  week2_mvp_built BOOLEAN DEFAULT FALSE,
  week3_launched BOOLEAN DEFAULT FALSE,
  week4_first_customer BOOLEAN DEFAULT FALSE,
  first_customer_date TIMESTAMP WITH TIME ZONE,
  
  -- Progress Tracking
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  progress_percentage NUMERIC(5,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.launch_roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roadmaps"
  ON public.launch_roadmaps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own roadmaps"
  ON public.launch_roadmaps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roadmaps"
  ON public.launch_roadmaps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own roadmaps"
  ON public.launch_roadmaps FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_launch_roadmaps_user_id ON public.launch_roadmaps(user_id);
CREATE INDEX idx_launch_roadmaps_status ON public.launch_roadmaps(status);
CREATE INDEX idx_launch_roadmaps_current_week ON public.launch_roadmaps(current_week);

-- ============================================
-- 3. ROADMAP TASKS
-- ============================================

CREATE TABLE IF NOT EXISTS public.roadmap_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES public.launch_roadmaps(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Task Details
  title TEXT NOT NULL,
  description TEXT,
  week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 4),
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 30),
  
  -- Status
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Tracking
  due_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_hours NUMERIC(5,2),
  actual_hours NUMERIC(5,2),
  
  -- Blockers
  is_blocked BOOLEAN DEFAULT FALSE,
  blocker_reason TEXT,
  
  -- AI Insights
  ai_generated BOOLEAN DEFAULT TRUE,
  ai_reasoning TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roadmap tasks"
  ON public.roadmap_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own roadmap tasks"
  ON public.roadmap_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roadmap tasks"
  ON public.roadmap_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own roadmap tasks"
  ON public.roadmap_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_roadmap_tasks_roadmap_id ON public.roadmap_tasks(roadmap_id);
CREATE INDEX idx_roadmap_tasks_user_id ON public.roadmap_tasks(user_id);
CREATE INDEX idx_roadmap_tasks_status ON public.roadmap_tasks(status);
CREATE INDEX idx_roadmap_tasks_week_number ON public.roadmap_tasks(week_number);
CREATE INDEX idx_roadmap_tasks_due_date ON public.roadmap_tasks(due_date);

-- ============================================
-- 4. BIZMAP COMMUNITY FEEDBACK
-- ============================================

CREATE TABLE IF NOT EXISTS public.bizmap_community_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  community_post_id UUID REFERENCES public.community_posts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Feedback Request
  feedback_requested_on TEXT[] DEFAULT '{}',
  
  -- Aggregated Feedback
  total_upvotes INTEGER DEFAULT 0,
  total_downvotes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  community_score NUMERIC(5,2) DEFAULT 0 CHECK (community_score >= 0 AND community_score <= 100),
  
  -- AI Analysis
  sentiment_analysis JSONB DEFAULT '{}'::jsonb,
  key_suggestions TEXT[] DEFAULT '{}',
  common_concerns TEXT[] DEFAULT '{}',
  validation_adjustments JSONB DEFAULT '{}'::jsonb,
  
  -- Impact on Roadmap
  roadmap_updates_triggered BOOLEAN DEFAULT FALSE,
  validation_score_delta NUMERIC(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.bizmap_community_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bizmap feedback"
  ON public.bizmap_community_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bizmap feedback"
  ON public.bizmap_community_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bizmap feedback"
  ON public.bizmap_community_feedback FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_bizmap_feedback_session_id ON public.bizmap_community_feedback(session_id);
CREATE INDEX idx_bizmap_feedback_community_post_id ON public.bizmap_community_feedback(community_post_id);
CREATE INDEX idx_bizmap_feedback_user_id ON public.bizmap_community_feedback(user_id);

-- ============================================
-- 5. LAUNCH COHORTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.launch_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cohort Info
  cohort_name TEXT NOT NULL,
  cohort_type TEXT NOT NULL CHECK (cohort_type IN ('validate', 'build', 'launch', 'scale')),
  cohort_number INTEGER,
  
  -- Schedule
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  weekly_checkin_day TEXT DEFAULT 'monday' CHECK (weekly_checkin_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  demo_day_date DATE,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed')),
  member_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.launch_cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active cohorts"
  ON public.launch_cohorts FOR SELECT
  USING (status IN ('upcoming', 'active'));

CREATE POLICY "Admins can manage cohorts"
  ON public.launch_cohorts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX idx_launch_cohorts_status ON public.launch_cohorts(status);
CREATE INDEX idx_launch_cohorts_type ON public.launch_cohorts(cohort_type);
CREATE INDEX idx_launch_cohorts_start_date ON public.launch_cohorts(start_date);

-- ============================================
-- 6. COHORT MEMBERS
-- ============================================

CREATE TABLE IF NOT EXISTS public.cohort_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID REFERENCES public.launch_cohorts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  roadmap_id UUID REFERENCES public.launch_roadmaps(id) ON DELETE SET NULL,
  
  -- Member Status
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'dropped')),
  
  -- Engagement
  weekly_checkins_completed INTEGER DEFAULT 0,
  total_checkins_expected INTEGER DEFAULT 4,
  attendance_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Progress
  current_milestone TEXT CHECK (current_milestone IN ('validate', 'build', 'launch', 'scale')),
  milestones_completed INTEGER DEFAULT 0,
  
  UNIQUE(cohort_id, user_id)
);

-- RLS Policies
ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members in their cohorts"
  ON public.cohort_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cohort_members cm
      WHERE cm.cohort_id = cohort_members.cohort_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join cohorts"
  ON public.cohort_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership"
  ON public.cohort_members FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_cohort_members_cohort_id ON public.cohort_members(cohort_id);
CREATE INDEX idx_cohort_members_user_id ON public.cohort_members(user_id);
CREATE INDEX idx_cohort_members_status ON public.cohort_members(status);

-- ============================================
-- 7. COHORT CHECK-INS
-- ============================================

CREATE TABLE IF NOT EXISTS public.cohort_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID REFERENCES public.launch_cohorts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Check-in Details
  week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 4),
  checkin_date DATE NOT NULL,
  
  -- Progress Report
  wins TEXT[] DEFAULT '{}',
  blockers TEXT[] DEFAULT '{}',
  next_week_goals TEXT[] DEFAULT '{}',
  help_needed TEXT,
  
  -- Engagement
  shared_publicly BOOLEAN DEFAULT FALSE,
  community_post_id UUID REFERENCES public.community_posts(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.cohort_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view check-ins in their cohorts"
  ON public.cohort_checkins FOR SELECT
  USING (
    shared_publicly = TRUE OR
    EXISTS (
      SELECT 1 FROM public.cohort_members cm
      WHERE cm.cohort_id = cohort_checkins.cohort_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own check-ins"
  ON public.cohort_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own check-ins"
  ON public.cohort_checkins FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_cohort_checkins_cohort_id ON public.cohort_checkins(cohort_id);
CREATE INDEX idx_cohort_checkins_user_id ON public.cohort_checkins(user_id);
CREATE INDEX idx_cohort_checkins_week_number ON public.cohort_checkins(week_number);
CREATE INDEX idx_cohort_checkins_date ON public.cohort_checkins(checkin_date);

-- ============================================
-- 8. FOUNDER ANALYTICS
-- ============================================

CREATE TABLE IF NOT EXISTS public.founder_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  roadmap_id UUID REFERENCES public.launch_roadmaps(id) ON DELETE SET NULL,
  
  -- Time Period
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Progress Metrics
  tasks_completed INTEGER DEFAULT 0,
  milestones_reached INTEGER DEFAULT 0,
  velocity_score NUMERIC(5,2),
  
  -- Engagement Metrics
  community_feedback_received INTEGER DEFAULT 0,
  validation_score_change NUMERIC(5,2),
  cohort_participation_rate NUMERIC(5,2),
  
  -- Revenue Metrics
  revenue_usd NUMERIC(12,2) DEFAULT 0,
  customer_count INTEGER DEFAULT 0,
  mrr_usd NUMERIC(12,2) DEFAULT 0,
  
  -- AI Insights
  success_indicators JSONB DEFAULT '[]'::jsonb,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  recommendations TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.founder_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analytics"
  ON public.founder_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert analytics"
  ON public.founder_analytics FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_founder_analytics_user_id ON public.founder_analytics(user_id);
CREATE INDEX idx_founder_analytics_period ON public.founder_analytics(period_type, period_start, period_end);
CREATE INDEX idx_founder_analytics_roadmap_id ON public.founder_analytics(roadmap_id);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATED AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_market_validation_scores_updated_at
    BEFORE UPDATE ON public.market_validation_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_launch_roadmaps_updated_at
    BEFORE UPDATE ON public.launch_roadmaps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roadmap_tasks_updated_at
    BEFORE UPDATE ON public.roadmap_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bizmap_community_feedback_updated_at
    BEFORE UPDATE ON public.bizmap_community_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_launch_cohorts_updated_at
    BEFORE UPDATE ON public.launch_cohorts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();