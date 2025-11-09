-- ================================================
-- SEED FUNDING OPPORTUNITIES (SIMPLIFIED)
-- ================================================

-- Only insert if table is empty (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.funding_opportunities LIMIT 1) THEN
    INSERT INTO public.funding_opportunities (
  title,
  description,
  url,
  type,
  funding_amount,
  location,
  keywords,
  is_featured,
  is_active
) VALUES
  (
    'Y Combinator',
    'The world''s most prestigious startup accelerator. Provides $500k investment, mentorship, and access to a vast network.',
    'https://www.ycombinator.com/apply',
    'accelerator',
    '$500,000',
    ARRAY['Global', 'USA'],
    ARRAY['seed funding', 'mentorship', 'silicon valley', 'tech startups'],
    true,
    true
  ),
  (
    'Techstars',
    'Global startup accelerator with industry-specific programs. Offers $120k investment and lifetime access to mentors.',
    'https://www.techstars.com/accelerators',
    'accelerator',
    '$120,000',
    ARRAY['Global', 'USA', 'Europe'],
    ARRAY['accelerator', 'mentorship', 'global', 'seed funding'],
    true,
    true
  ),
  (
    '500 Global',
    'Venture capital firm and accelerator investing in early-stage startups globally.',
    'https://500.co/',
    'accelerator',
    '$150,000',
    ARRAY['Global'],
    ARRAY['venture capital', 'early-stage', 'global', 'diverse founders'],
    false,
    true
  ),
  (
    'AWS Activate',
    'Amazon''s startup program offering up to $100k in AWS credits, training, and support.',
    'https://aws.amazon.com/activate/',
    'grant',
    'Up to $100,000',
    ARRAY['Global'],
    ARRAY['cloud credits', 'infrastructure', 'tech startups', 'aws'],
    false,
    true
  ),
  (
    'MIT $100K Competition',
    'One of the most prestigious university-based startup competitions.',
    'https://www.mit100k.org/',
    'contest',
    '$100,000',
    ARRAY['USA', 'Global'],
    ARRAY['competition', 'university', 'prize money', 'innovation'],
    false,
    true
  ),
  (
    'Google for Startups',
    'Google''s global initiative supporting startups with cloud credits, mentorship, and resources.',
    'https://startup.google.com/',
    'accelerator',
    'Various',
    ARRAY['Global'],
    ARRAY['google cloud', 'mentorship', 'tech startups', 'resources'],
    false,
    true
  ),
  (
    'Kickstarter',
    'Crowdfunding platform for creative projects and product launches.',
    'https://www.kickstarter.com/',
    'contest',
    'Varies by project',
    ARRAY['Global'],
    ARRAY['crowdfunding', 'creative', 'product launch', 'community funding'],
    false,
    true
  ),
  (
    'Microsoft for Startups',
    'Microsoft''s program offering Azure credits, technical support, and go-to-market resources.',
    'https://www.microsoft.com/en-us/startups',
    'grant',
    'Up to $150,000',
    ARRAY['Global'],
    ARRAY['azure credits', 'microsoft', 'cloud', 'enterprise startups'],
    false,
    true
  ),
  (
    'Seedcamp',
    'Europe''s seed fund providing investment and support for early-stage tech startups.',
    'https://seedcamp.com/',
    'accelerator',
    '€100,000 - €500,000',
    ARRAY['Europe', 'UK'],
    ARRAY['seed funding', 'europe', 'tech', 'mentorship'],
    false,
    true
  ),
  (
    'Founder Institute',
    'Global pre-seed accelerator helping aspiring founders build meaningful and enduring technology companies.',
    'https://fi.co/',
    'accelerator',
    'Varies',
    ARRAY['Global'],
    ARRAY['pre-seed', 'global', 'early-stage', 'founder support'],
    false,
    true
  ),
  (
    'SBIR Program',
    'US government program providing grants to small businesses for R&D with commercialization potential.',
    'https://www.sbir.gov/',
    'grant',
    'Up to $1,750,000',
    ARRAY['USA'],
    ARRAY['government grant', 'r&d', 'usa', 'innovation'],
    true,
    true
  ),
  (
    'Indie Hackers Grants',
    'Small grants for independent builders and solopreneurs working on side projects.',
    'https://www.indiehackers.com/grants',
    'microfund',
    '$5,000 - $25,000',
    ARRAY['Global'],
    ARRAY['microfund', 'indie hackers', 'side projects', 'small grants'],
    false,
    true
    );
  END IF;
END $$;

