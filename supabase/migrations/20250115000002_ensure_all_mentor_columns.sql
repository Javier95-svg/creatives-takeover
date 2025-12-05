-- Ensure all required columns exist in the mentors table
-- This migration is idempotent and safe to run multiple times
-- It ensures all columns added in various migrations are present

-- Add website_url if it doesn't exist
ALTER TABLE public.mentors 
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add calendly_url if it doesn't exist
ALTER TABLE public.mentors 
ADD COLUMN IF NOT EXISTS calendly_url TEXT;

-- Add nationality if it doesn't exist
ALTER TABLE public.mentors 
ADD COLUMN IF NOT EXISTS nationality TEXT;

-- Add universities if it doesn't exist
ALTER TABLE public.mentors 
ADD COLUMN IF NOT EXISTS universities TEXT[] DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN public.mentors.website_url IS 'Personal or company website URL for the mentor';
COMMENT ON COLUMN public.mentors.calendly_url IS 'Calendly booking link for discovery calls';
COMMENT ON COLUMN public.mentors.nationality IS 'Country name or code (e.g., "USA", "US", "United States") for displaying flag emoji';
COMMENT ON COLUMN public.mentors.universities IS 'Array of universities or educational institutions the mentor attended';

