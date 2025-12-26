-- =====================================================
-- Phase 1: Enhanced Business Context & Progress Tracking
-- Migration Date: 2025-12-26
-- Purpose: Upgrade BizMap AI to AI Co-Founder capabilities
-- =====================================================

-- =====================================================
-- 1. ENHANCED CHATBOT_CONVERSATIONS TABLE
-- =====================================================

-- Add new columns to existing chatbot_conversations table
ALTER TABLE public.chatbot_conversations
ADD COLUMN IF NOT EXISTS chat_mode TEXT DEFAULT 'freeform' CHECK (chat_mode IN ('wizard', 'freeform', 'tour-guide', 'bizmap-structured', 'gtm')),
ADD COLUMN IF NOT EXISTS founder_profile JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS market_dynamics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS progress_metrics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS decision_history JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS conversation_memory JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN public.chatbot_conversations.chat_mode IS 'Current chat mode: wizard, freeform, tour-guide, bizmap-structured, gtm';
COMMENT ON COLUMN public.chatbot_conversations.founder_profile IS 'Deep founder context: skills, resources, risk tolerance, decision style, learning preferences';
COMMENT ON COLUMN public.chatbot_conversations.market_dynamics IS 'Market analysis: growth rate, competition intensity, barriers, opportunity score';
COMMENT ON COLUMN public.chatbot_conversations.progress_metrics IS 'Progress tracking: milestones, blockers, velocity, quality score';
COMMENT ON COLUMN public.chatbot_conversations.decision_history IS 'Historical decisions made during planning with rationale and outcomes';
COMMENT ON COLUMN public.chatbot_conversations.conversation_memory IS 'Enhanced memory: mood, tone, preferences, important topics';

-- =====================================================
-- 2. CREATE FOUNDER_PROFILES TABLE (Persistent Profile)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.founder_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core Profile
  skill_gaps TEXT[] DEFAULT '{}',
  available_resources JSONB DEFAULT '{"time": 0, "budget": 0, "network": []}',
  risk_tolerance TEXT DEFAULT 'moderate' CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  decision_making_style TEXT DEFAULT 'data-driven' CHECK (decision_making_style IN ('data-driven', 'intuitive', 'consensus-seeking', 'mixed')),
  learning_preferences TEXT[] DEFAULT '{}',

  -- Communication Preferences
  preferred_detail_level TEXT DEFAULT 'balanced' CHECK (preferred_detail_level IN ('high-level', 'balanced', 'detailed')),
  preferred_pace TEXT DEFAULT 'moderate' CHECK (preferred_pace IN ('fast', 'moderate', 'slow')),
  preferred_tone TEXT DEFAULT 'professional-friendly' CHECK (preferred_tone IN ('formal', 'professional-friendly', 'casual', 'technical')),

  -- Experience & Background
  entrepreneurial_experience TEXT DEFAULT 'first-time' CHECK (entrepreneurial_experience IN ('first-time', 'experienced', 'serial-entrepreneur')),
  domain_expertise TEXT[] DEFAULT '{}',
  previous_ventures JSONB DEFAULT '[]',

  -- Goals & Constraints
  primary_goals TEXT[] DEFAULT '{}',
  key_constraints JSONB DEFAULT '{"time": null, "budget": null, "team": null}',
  success_definition TEXT,

  -- Profile Metadata
  profile_completeness INTEGER DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own founder profile" ON public.founder_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own founder profile" ON public.founder_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own founder profile" ON public.founder_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own founder profile" ON public.founder_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_founder_profiles_user_id ON public.founder_profiles(user_id);

-- =====================================================
-- 3. CREATE PROGRESS_MILESTONES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.progress_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.chatbot_conversations(id) ON DELETE SET NULL,

  -- Milestone Details
  milestone_type TEXT NOT NULL CHECK (milestone_type IN (
    'business_concept', 'target_customer', 'validation_plan', 'mvp_design',
    'launch_strategy', 'pricing_model', 'success_goals', 'custom'
  )),
  milestone_name TEXT NOT NULL,
  milestone_description TEXT,

  -- Progress Tracking
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked', 'skipped')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),

  -- Timeline
  target_day INTEGER, -- Day in 30-day plan
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Related Data
  related_components JSONB DEFAULT '[]',
  validation_results JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.progress_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own milestones" ON public.progress_milestones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own milestones" ON public.progress_milestones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own milestones" ON public.progress_milestones
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own milestones" ON public.progress_milestones
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_progress_milestones_user_id ON public.progress_milestones(user_id);
CREATE INDEX idx_progress_milestones_conversation_id ON public.progress_milestones(conversation_id);
CREATE INDEX idx_progress_milestones_status ON public.progress_milestones(status);
CREATE INDEX idx_progress_milestones_type ON public.progress_milestones(milestone_type);

-- =====================================================
-- 4. CREATE BLOCKERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.progress_blockers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.progress_milestones(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.chatbot_conversations(id) ON DELETE SET NULL,

  -- Blocker Details
  blocker_type TEXT NOT NULL CHECK (blocker_type IN (
    'knowledge_gap', 'resource_constraint', 'decision_paralysis',
    'technical_challenge', 'market_uncertainty', 'skill_gap', 'other'
  )),
  blocker_title TEXT NOT NULL,
  blocker_description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Resolution Tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated')),
  suggested_actions JSONB DEFAULT '[]',
  resolution_notes TEXT,

  -- Timeline
  identified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.progress_blockers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own blockers" ON public.progress_blockers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own blockers" ON public.progress_blockers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blockers" ON public.progress_blockers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blockers" ON public.progress_blockers
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_progress_blockers_user_id ON public.progress_blockers(user_id);
CREATE INDEX idx_progress_blockers_milestone_id ON public.progress_blockers(milestone_id);
CREATE INDEX idx_progress_blockers_status ON public.progress_blockers(status);
CREATE INDEX idx_progress_blockers_severity ON public.progress_blockers(severity);

-- =====================================================
-- 5. CREATE MARKET_INTELLIGENCE_CACHE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.market_intelligence_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identification
  industry TEXT NOT NULL,
  market_segment TEXT,
  geography TEXT DEFAULT 'global',

  -- Intelligence Data
  growth_rate NUMERIC,
  market_size_estimate JSONB DEFAULT '{}', -- {value, unit, year, source}
  competition_intensity TEXT CHECK (competition_intensity IN ('low', 'medium', 'high', 'very-high')),
  entry_barriers TEXT[] DEFAULT '{}',
  key_trends JSONB DEFAULT '[]',
  regulatory_environment JSONB DEFAULT '{}',

  -- Opportunity Analysis
  opportunity_score INTEGER CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
  opportunity_factors JSONB DEFAULT '[]',
  threat_factors JSONB DEFAULT '[]',

  -- Benchmarking Data
  typical_metrics JSONB DEFAULT '{}', -- {revenue_growth, team_size, funding, etc.}
  success_patterns JSONB DEFAULT '[]',
  failure_patterns JSONB DEFAULT '[]',

  -- Data Quality
  data_sources JSONB DEFAULT '[]',
  confidence_score NUMERIC DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  last_validated TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Cache Control
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(industry, market_segment, geography)
);

-- Enable RLS
ALTER TABLE public.market_intelligence_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public read for all authenticated users)
CREATE POLICY "Anyone can read market intelligence" ON public.market_intelligence_cache
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage market intelligence" ON public.market_intelligence_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_market_intelligence_industry ON public.market_intelligence_cache(industry);
CREATE INDEX idx_market_intelligence_expires_at ON public.market_intelligence_cache(expires_at);
CREATE INDEX idx_market_intelligence_composite ON public.market_intelligence_cache(industry, market_segment);

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to calculate founder profile completeness
CREATE OR REPLACE FUNCTION public.calculate_founder_profile_completeness(profile_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  completeness INTEGER := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record FROM founder_profiles WHERE id = profile_id;

  -- Basic fields (10 points each, 50 total)
  IF profile_record.risk_tolerance IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF profile_record.decision_making_style IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF profile_record.entrepreneurial_experience IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF profile_record.preferred_detail_level IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF profile_record.preferred_pace IS NOT NULL THEN completeness := completeness + 10; END IF;

  -- Array fields (10 points each if not empty, 30 total)
  IF array_length(profile_record.skill_gaps, 1) > 0 THEN completeness := completeness + 10; END IF;
  IF array_length(profile_record.learning_preferences, 1) > 0 THEN completeness := completeness + 10; END IF;
  IF array_length(profile_record.primary_goals, 1) > 0 THEN completeness := completeness + 10; END IF;

  -- JSONB fields (10 points each if not empty, 20 total)
  IF profile_record.available_resources::text != '{}'::text THEN completeness := completeness + 10; END IF;
  IF profile_record.key_constraints::text != '{}'::text THEN completeness := completeness + 10; END IF;

  RETURN completeness;
END;
$$;

-- Function to calculate progress velocity
CREATE OR REPLACE FUNCTION public.calculate_progress_velocity(user_uuid UUID, days INTEGER DEFAULT 7)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  completed_count INTEGER;
  velocity NUMERIC;
BEGIN
  SELECT COUNT(*) INTO completed_count
  FROM progress_milestones
  WHERE user_id = user_uuid
    AND status = 'completed'
    AND completed_at >= (now() - (days || ' days')::interval);

  velocity := completed_count::NUMERIC / days::NUMERIC;

  RETURN ROUND(velocity, 2);
END;
$$;

-- Function to get active blockers count
CREATE OR REPLACE FUNCTION public.get_active_blockers_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  blocker_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO blocker_count
  FROM progress_blockers
  WHERE user_id = user_uuid
    AND status IN ('open', 'in_progress');

  RETURN blocker_count;
END;
$$;

-- Function to get current day in 30-day plan
CREATE OR REPLACE FUNCTION public.get_current_plan_day(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_milestone_date TIMESTAMP WITH TIME ZONE;
  current_day INTEGER;
BEGIN
  SELECT MIN(created_at) INTO first_milestone_date
  FROM progress_milestones
  WHERE user_id = user_uuid
    AND milestone_type IN ('business_concept', 'target_customer', 'validation_plan',
                           'mvp_design', 'launch_strategy', 'pricing_model', 'success_goals');

  IF first_milestone_date IS NULL THEN
    RETURN 0;
  END IF;

  current_day := EXTRACT(DAY FROM (now() - first_milestone_date))::INTEGER + 1;

  -- Cap at 30 days
  IF current_day > 30 THEN
    current_day := 30;
  END IF;

  RETURN current_day;
END;
$$;

-- Function to auto-update founder profile completeness
CREATE OR REPLACE FUNCTION public.update_founder_profile_completeness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.profile_completeness := calculate_founder_profile_completeness(NEW.id);
  NEW.last_updated := now();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update completeness
CREATE TRIGGER trigger_update_founder_profile_completeness
  BEFORE INSERT OR UPDATE ON public.founder_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_founder_profile_completeness();

-- =====================================================
-- 7. DATA MIGRATION & INITIALIZATION
-- =====================================================

-- Migrate existing chat_mode data from business_context if it exists
UPDATE public.chatbot_conversations
SET chat_mode = COALESCE(
  business_context->>'chatMode',
  business_context->>'chat_mode',
  'freeform'
)
WHERE chat_mode IS NULL;

-- Initialize founder profiles for existing users who have conversations
INSERT INTO public.founder_profiles (user_id, entrepreneurial_experience, created_at)
SELECT DISTINCT user_id,
  CASE
    WHEN business_context->>'experience' = 'first-time' THEN 'first-time'
    WHEN business_context->>'experience' = 'experienced' THEN 'experienced'
    WHEN business_context->>'experience' = 'serial-entrepreneur' THEN 'serial-entrepreneur'
    ELSE 'first-time'
  END,
  MIN(created_at)
FROM public.chatbot_conversations
WHERE user_id IS NOT NULL
  AND user_id NOT IN (SELECT user_id FROM public.founder_profiles)
GROUP BY user_id, business_context->>'experience'
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 8. CLEANUP FUNCTION FOR EXPIRED DATA
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_market_intelligence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM market_intelligence_cache WHERE expires_at < now();
END;
$$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Add migration completion log
DO $$
BEGIN
  RAISE NOTICE 'Phase 1 Enhanced Context & Progress Tracking migration completed successfully';
END $$;
