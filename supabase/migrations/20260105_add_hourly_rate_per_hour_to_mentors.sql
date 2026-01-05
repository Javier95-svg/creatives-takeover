-- Add hourly_rate_per_hour column to mentors table
-- This column stores the per-hour consulting rate (separate from the 8-week program fee)
-- Stored in cents (e.g., 15000 = $150.00 per hour)

ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS hourly_rate_per_hour INTEGER DEFAULT 0;

COMMENT ON COLUMN public.mentors.hourly_rate_per_hour IS 'Per-hour consulting rate in USD cents (e.g., 15000 = $150.00/hour). Default 0 means not offering hourly consulting.';

-- Update existing mentors to have a default hourly rate (optional, can be set later by admin)
UPDATE public.mentors
SET hourly_rate_per_hour = 0
WHERE hourly_rate_per_hour IS NULL;
