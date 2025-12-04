-- Add social link columns to mentors table
-- LinkedIn and X (Twitter) profile URLs

ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_x_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.mentors.linkedin_url IS 'LinkedIn profile URL for the mentor';
COMMENT ON COLUMN public.mentors.twitter_x_url IS 'X (Twitter) profile URL for the mentor';

