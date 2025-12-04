-- Add Calendly URL and Nationality columns to mentors table
-- These fields allow mentors to provide their Calendly scheduling links and display their nationality

ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS calendly_url TEXT,
ADD COLUMN IF NOT EXISTS nationality TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.mentors.calendly_url IS 'Calendly booking link for discovery calls';
COMMENT ON COLUMN public.mentors.nationality IS 'Country name or code (e.g., "USA", "US", "United States") for displaying flag emoji';

-- Update Samuel's mentor profile with his Calendly link
-- This assumes Samuel's name contains "Samuel" (case-insensitive)
UPDATE public.mentors
SET calendly_url = 'https://calendly.com/samstarkman/1-on-1-with-sam?month=2025-12',
    nationality = 'USA'
WHERE LOWER(name) LIKE '%samuel%'
  AND calendly_url IS NULL;

