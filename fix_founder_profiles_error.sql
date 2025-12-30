-- Fix "Error Creating Profile" issue
-- Run this in Supabase SQL Editor if you're getting founder profile creation errors

-- Check if founder_profiles table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'founder_profiles') THEN
    -- Create the founder_profiles table
    CREATE TABLE public.founder_profiles (
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

      -- Constraints
      CONSTRAINT unique_user_profile UNIQUE (user_id)
    );

    -- Create indexes
    CREATE INDEX idx_founder_profiles_user_id ON public.founder_profiles(user_id);
    CREATE INDEX idx_founder_profiles_completeness ON public.founder_profiles(profile_completeness);

    -- Enable RLS
    ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    CREATE POLICY "Users can view own profile"
      ON public.founder_profiles
      FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can create own profile"
      ON public.founder_profiles
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own profile"
      ON public.founder_profiles
      FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own profile"
      ON public.founder_profiles
      FOR DELETE
      USING (auth.uid() = user_id);

    RAISE NOTICE 'founder_profiles table created successfully';
  ELSE
    RAISE NOTICE 'founder_profiles table already exists';
  END IF;
END $$;

-- Create or replace function to calculate profile completeness
CREATE OR REPLACE FUNCTION public.calculate_founder_profile_completeness(profile_row public.founder_profiles)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  completeness INTEGER := 0;
  field_count INTEGER := 0;
  filled_count INTEGER := 0;
BEGIN
  -- Required fields (weight: 20 points each)
  field_count := 3;

  IF profile_row.risk_tolerance IS NOT NULL THEN
    filled_count := filled_count + 1;
  END IF;

  IF profile_row.decision_making_style IS NOT NULL THEN
    filled_count := filled_count + 1;
  END IF;

  IF profile_row.entrepreneurial_experience IS NOT NULL THEN
    filled_count := filled_count + 1;
  END IF;

  completeness := (filled_count * 20);

  -- Optional array fields (weight: 10 points each)
  IF profile_row.skill_gaps IS NOT NULL AND array_length(profile_row.skill_gaps, 1) > 0 THEN
    completeness := completeness + 10;
  END IF;

  IF profile_row.learning_preferences IS NOT NULL AND array_length(profile_row.learning_preferences, 1) > 0 THEN
    completeness := completeness + 10;
  END IF;

  IF profile_row.primary_goals IS NOT NULL AND array_length(profile_row.primary_goals, 1) > 0 THEN
    completeness := completeness + 10;
  END IF;

  IF profile_row.domain_expertise IS NOT NULL AND array_length(profile_row.domain_expertise, 1) > 0 THEN
    completeness := completeness + 10;
  END IF;

  RETURN LEAST(completeness, 100);
END;
$$;

-- Create trigger to auto-update profile_completeness
CREATE OR REPLACE FUNCTION public.update_founder_profile_completeness()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.profile_completeness := public.calculate_founder_profile_completeness(NEW);
  NEW.last_updated := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_founder_profile_completeness ON public.founder_profiles;

CREATE TRIGGER trigger_update_founder_profile_completeness
  BEFORE INSERT OR UPDATE ON public.founder_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_founder_profile_completeness();

-- Verify the fix
SELECT
  CASE
    WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'founder_profiles')
    THEN '✅ founder_profiles table exists'
    ELSE '❌ founder_profiles table NOT found'
  END as table_status;

SELECT
  CASE
    WHEN EXISTS (SELECT FROM pg_proc WHERE proname = 'calculate_founder_profile_completeness')
    THEN '✅ calculate_founder_profile_completeness function exists'
    ELSE '❌ Function NOT found'
  END as function_status;
