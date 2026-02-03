-- Add slug, website_url, and application_url columns to funding_opportunities
ALTER TABLE public.funding_opportunities
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS application_url TEXT;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_funding_slug ON public.funding_opportunities(slug);

-- Populate slugs and URLs for existing accelerators
UPDATE public.funding_opportunities
SET slug = 'y-combinator',
    website_url = 'https://www.ycombinator.com',
    application_url = 'https://www.ycombinator.com/apply'
WHERE title = 'Y Combinator' AND type = 'accelerator';

UPDATE public.funding_opportunities
SET slug = 'techstars',
    website_url = 'https://www.techstars.com',
    application_url = 'https://www.techstars.com/accelerators'
WHERE title = 'Techstars' AND type = 'accelerator';

UPDATE public.funding_opportunities
SET slug = '500-global',
    website_url = 'https://500.co',
    application_url = 'https://500.co/accelerator'
WHERE title = '500 Global' AND type = 'accelerator';

UPDATE public.funding_opportunities
SET slug = 'google-for-startups',
    website_url = 'https://startup.google.com',
    application_url = 'https://startup.google.com/accelerator'
WHERE title = 'Google for Startups' AND type = 'accelerator';

UPDATE public.funding_opportunities
SET slug = 'seedcamp',
    website_url = 'https://seedcamp.com',
    application_url = 'https://seedcamp.com/apply'
WHERE title = 'Seedcamp' AND type = 'accelerator';

UPDATE public.funding_opportunities
SET slug = 'founder-institute',
    website_url = 'https://fi.co',
    application_url = 'https://fi.co/apply'
WHERE title = 'Founder Institute' AND type = 'accelerator';
