-- Add universities column to mentors table
ALTER TABLE public.mentors 
ADD COLUMN IF NOT EXISTS universities TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.mentors.universities IS 'Array of universities or educational institutions the mentor attended';

