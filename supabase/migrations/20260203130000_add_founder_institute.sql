-- Add Founder Institute to Accelerator Hunt
INSERT INTO public.funding_opportunities (
  title, description, url, type, funding_amount,
  location, keywords, is_featured, is_active,
  slug, website_url, application_url
)
SELECT
  'Founder Institute',
  'The world''s largest pre-seed startup accelerator, helping aspiring founders across 200+ cities build meaningful and enduring technology companies.',
  'https://fi.co/',
  'accelerator',
  'Varies',
  ARRAY['Global'],
  ARRAY['pre-seed', 'global', 'early-stage', 'founder support', 'entrepreneur training'],
  false,
  true,
  'founder-institute',
  'https://fi.co',
  'https://fi.co/apply'
WHERE NOT EXISTS (
  SELECT 1 FROM public.funding_opportunities
  WHERE title = 'Founder Institute' AND type = 'accelerator'
);
