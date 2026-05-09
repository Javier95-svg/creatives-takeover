-- Track lightweight Day 1 dashboard checklist progress.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_steps_completed jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.onboarding_steps_completed IS
  'Day 1 Welcome checklist progress. Expected keys: icp_builder, founder_stage, daily_mission.';
