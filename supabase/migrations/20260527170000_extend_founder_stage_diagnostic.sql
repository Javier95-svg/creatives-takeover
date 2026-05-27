-- Extend founder stage diagnostics and BizMap progress for Traction/Fundraising.

ALTER TYPE public.bizmap_stage ADD VALUE IF NOT EXISTS 'TRACTION';
ALTER TYPE public.bizmap_stage ADD VALUE IF NOT EXISTS 'FUNDRAISING';

ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS traction_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fundraising_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.quiz_answers_v2 IS 'Raw versioned answers and scoring payload for the founder stage diagnostic.';
COMMENT ON COLUMN public.profiles.assigned_stage IS 'Founder stage (1-7) assigned by the onboarding diagnostic.';
