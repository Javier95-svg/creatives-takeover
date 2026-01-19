-- Fix funding_opportunities table schema to match TypeScript types
-- Run this in Supabase SQL Editor

-- Step 1: Add missing 'url' column
ALTER TABLE public.funding_opportunities
ADD COLUMN IF NOT EXISTS url TEXT;

-- Step 2: Update existing rows to populate url from website_url
UPDATE public.funding_opportunities
SET url = COALESCE(website_url, application_url, '')
WHERE url IS NULL;

-- Step 3: Change location from TEXT to TEXT[]
ALTER TABLE public.funding_opportunities
ALTER COLUMN location TYPE TEXT[] USING ARRAY[location];

-- Step 4: Update existing data to have proper arrays
UPDATE public.funding_opportunities
SET location = ARRAY['Global']
WHERE location = ARRAY['Global']::TEXT[];

UPDATE public.funding_opportunities
SET location = ARRAY['Mountain View', 'CA']
WHERE title = 'Y Combinator';

UPDATE public.funding_opportunities
SET location = ARRAY['London', 'Singapore', 'Paris']
WHERE title = 'Entrepreneur First';

-- Step 5: Verify the changes
SELECT id, title, type, location, url FROM public.funding_opportunities;
