-- Migration: Add onboarding tracking columns to profiles table
-- Description: Tracks user onboarding completion status and first login timestamp
-- Date: 2026-01-01

-- Add onboarding_completed column (defaults to false for new users)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add first_login_at column to track when user first logged in
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries on onboarding_completed
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed
ON profiles(onboarding_completed);

-- Add index for faster queries on first_login_at
CREATE INDEX IF NOT EXISTS idx_profiles_first_login_at
ON profiles(first_login_at);

-- Add comment to document the columns
COMMENT ON COLUMN profiles.onboarding_completed IS 'Indicates whether the user has completed the onboarding process';
COMMENT ON COLUMN profiles.first_login_at IS 'Timestamp of when the user first logged in to the platform';

-- Update existing users to have onboarding_completed = true if they have profile data
-- This prevents existing users from seeing the onboarding flow
UPDATE profiles
SET onboarding_completed = TRUE
WHERE (
  (full_name IS NOT NULL AND full_name != '') OR
  (avatar_url IS NOT NULL AND avatar_url != '') OR
  (bio IS NOT NULL AND bio != '')
) AND onboarding_completed = FALSE;
