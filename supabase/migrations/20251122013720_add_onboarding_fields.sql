-- Add onboarding fields to profiles table
-- These fields track user onboarding progress and completion status

-- Add onboarding_goal: Stores the user's selected goal ("Get Funded", "Launch in 30 Days", "Validate My Idea", "Build My Team")
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_goal TEXT;

-- Add onboarding_status: Tracks onboarding status ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')
-- Default to 'NOT_STARTED' for existing users
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'NOT_STARTED'
  CHECK (onboarding_status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'));

-- Add onboarding_completed_step: Last completed step (1-4), NULL if not started
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_step INTEGER
  CHECK (onboarding_completed_step IS NULL OR (onboarding_completed_step >= 1 AND onboarding_completed_step <= 4));

-- Add onboarding_completed_at: Timestamp when onboarding was completed, NULL if not completed
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Update existing users to have 'NOT_STARTED' status if they don't have a status set
UPDATE public.profiles
SET onboarding_status = 'NOT_STARTED'
WHERE onboarding_status IS NULL;

-- Create index for faster queries on onboarding_status (for filtering users who need onboarding)
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_status ON public.profiles(onboarding_status)
WHERE onboarding_status != 'COMPLETED';

-- Create index for onboarding_goal (for analytics/queries on goal distribution)
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_goal ON public.profiles(onboarding_goal)
WHERE onboarding_goal IS NOT NULL;

