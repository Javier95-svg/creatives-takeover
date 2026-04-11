-- Weekly commitment review fields
-- Adds explicit done/missed outcomes and missed-week reflection capture.

ALTER TABLE public.weekly_missions
  ADD COLUMN IF NOT EXISTS commitment_outcome TEXT,
  ADD COLUMN IF NOT EXISTS reflection_text TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'weekly_missions_commitment_outcome_check'
  ) THEN
    ALTER TABLE public.weekly_missions
      ADD CONSTRAINT weekly_missions_commitment_outcome_check
      CHECK (
        commitment_outcome IS NULL
        OR commitment_outcome IN ('completed', 'missed')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.weekly_missions.commitment_outcome IS 'Explicit weekly review result: completed or missed';
COMMENT ON COLUMN public.weekly_missions.reflection_text IS 'Short reflection captured when a founder misses the weekly commitment';
COMMENT ON COLUMN public.weekly_missions.reviewed_at IS 'Timestamp when the founder closed out the weekly commitment';