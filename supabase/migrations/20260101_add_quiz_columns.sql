-- Migration: Add setup quiz columns to profiles table
-- Description: Stores user responses from the onboarding setup quiz
-- Date: 2026-01-01

-- Add quiz answer columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS quiz_is_first_startup TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS quiz_current_stage TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS quiz_biggest_challenge TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS quiz_launch_timeline TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS quiz_looking_for_cofounder TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS quiz_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS quiz_completed_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_profiles_quiz_completed ON profiles(quiz_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_quiz_current_stage ON profiles(quiz_current_stage);

-- Add comments to document the columns
COMMENT ON COLUMN profiles.quiz_is_first_startup IS 'User response: Is this your first startup? (yes/no)';
COMMENT ON COLUMN profiles.quiz_current_stage IS 'User response: Current stage (idea/building-mvp/mvp-ready/early-users)';
COMMENT ON COLUMN profiles.quiz_biggest_challenge IS 'User response: Biggest challenge right now';
COMMENT ON COLUMN profiles.quiz_launch_timeline IS 'User response: When they want to launch (30-days/60-days/90-plus-days/not-sure)';
COMMENT ON COLUMN profiles.quiz_looking_for_cofounder IS 'User response: Looking for co-founder? (yes/no)';
COMMENT ON COLUMN profiles.quiz_completed IS 'Indicates whether the user has completed the setup quiz';
COMMENT ON COLUMN profiles.quiz_completed_at IS 'Timestamp of when the user completed the setup quiz';
