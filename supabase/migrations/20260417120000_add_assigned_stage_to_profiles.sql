-- Migration: Add assigned_stage and quiz_answers_v2 to profiles
-- Description: Supports the Stage Diagnostic Onboarding Quiz (7 stages)
-- Date: 2026-04-17

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS assigned_stage INTEGER;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS quiz_answers_v2 JSONB;

ALTER TABLE profiles
ADD CONSTRAINT profiles_assigned_stage_range
CHECK (assigned_stage IS NULL OR (assigned_stage >= 1 AND assigned_stage <= 7));

CREATE INDEX IF NOT EXISTS idx_profiles_assigned_stage ON profiles(assigned_stage);

COMMENT ON COLUMN profiles.assigned_stage IS 'Stage (1-7) assigned by the diagnostic onboarding quiz';
COMMENT ON COLUMN profiles.quiz_answers_v2 IS 'Raw answers for the Stage Diagnostic Quiz (JSONB: q1..q5)';
