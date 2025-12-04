-- Add website URL column to mentors table

ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.mentors.website_url IS 'Personal or company website URL for the mentor';

