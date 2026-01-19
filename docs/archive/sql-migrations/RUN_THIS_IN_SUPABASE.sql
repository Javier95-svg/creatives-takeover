-- ========================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- ========================================
-- Instructions:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" button
-- ========================================

-- MIGRATION 1: Add rich profile fields (logos, social media)
-- ========================================
ALTER TABLE public.investors
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS header_image_url TEXT;

ALTER TABLE public.investors
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS crunchbase_url TEXT,
ADD COLUMN IF NOT EXISTS angellist_url TEXT;

ALTER TABLE public.investors
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS medium_url TEXT;

COMMENT ON COLUMN public.investors.logo_url IS 'URL to the VC firm logo (displayed on cards and profile)';
COMMENT ON COLUMN public.investors.header_image_url IS 'URL to header/wallpaper image for profile page';
COMMENT ON COLUMN public.investors.twitter_url IS 'Twitter/X profile URL';
COMMENT ON COLUMN public.investors.facebook_url IS 'Facebook profile URL';
COMMENT ON COLUMN public.investors.crunchbase_url IS 'Crunchbase profile URL';
COMMENT ON COLUMN public.investors.angellist_url IS 'AngelList profile URL';
COMMENT ON COLUMN public.investors.youtube_url IS 'YouTube channel URL';
COMMENT ON COLUMN public.investors.instagram_url IS 'Instagram profile URL';
COMMENT ON COLUMN public.investors.medium_url IS 'Medium publication URL';

CREATE INDEX IF NOT EXISTS idx_investors_logo_url ON public.investors(logo_url) WHERE logo_url IS NOT NULL;

-- MIGRATION 2: Add slug field for custom URLs
-- ========================================
ALTER TABLE public.investors
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_investors_slug ON public.investors(slug);

-- Add comment explaining the slug field
COMMENT ON COLUMN public.investors.slug IS 'URL-friendly identifier for the VC firm (e.g., greylock-partners)';

-- Generate slugs for existing investors
-- Convert firm_name to lowercase, replace spaces with hyphens, remove special characters
UPDATE public.investors
SET slug = lower(
  regexp_replace(
    regexp_replace(firm_name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- Make slug UNIQUE and NOT NULL after backfilling
ALTER TABLE public.investors
ADD CONSTRAINT investors_slug_unique UNIQUE (slug);

ALTER TABLE public.investors
ALTER COLUMN slug SET NOT NULL;

-- MIGRATION 3: Backfill logos and social media for major VCs
-- ========================================

-- Y Combinator
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/ycombinator.com',
  twitter_url = 'https://twitter.com/ycombinator',
  linkedin_url = 'https://www.linkedin.com/company/y-combinator/',
  facebook_url = 'https://www.facebook.com/YCombinator',
  youtube_url = 'https://www.youtube.com/ycombinator',
  crunchbase_url = 'https://www.crunchbase.com/organization/y-combinator'
WHERE firm_name = 'Y Combinator';

-- Techstars
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/techstars.com',
  twitter_url = 'https://twitter.com/techstars',
  linkedin_url = 'https://www.linkedin.com/company/techstars/',
  facebook_url = 'https://www.facebook.com/techstars',
  crunchbase_url = 'https://www.crunchbase.com/organization/techstars'
WHERE firm_name = 'Techstars';

-- 500 Startups (now 500 Global)
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/500.co',
  twitter_url = 'https://twitter.com/500Global',
  linkedin_url = 'https://www.linkedin.com/company/500-global/',
  facebook_url = 'https://www.facebook.com/500Global',
  crunchbase_url = 'https://www.crunchbase.com/organization/500-global'
WHERE firm_name = '500 Startups';

-- First Round Capital
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/firstround.com',
  twitter_url = 'https://twitter.com/firstround',
  linkedin_url = 'https://www.linkedin.com/company/first-round-capital/',
  crunchbase_url = 'https://www.crunchbase.com/organization/first-round-capital',
  medium_url = 'https://review.firstround.com/'
WHERE firm_name = 'First Round Capital';

-- Andreessen Horowitz (a16z)
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/a16z.com',
  twitter_url = 'https://twitter.com/a16z',
  linkedin_url = 'https://www.linkedin.com/company/andreessen-horowitz/',
  facebook_url = 'https://www.facebook.com/a16z',
  youtube_url = 'https://www.youtube.com/c/a16z',
  crunchbase_url = 'https://www.crunchbase.com/organization/andreessen-horowitz'
WHERE firm_name = 'Andreessen Horowitz';

-- Sequoia Capital
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/sequoiacap.com',
  twitter_url = 'https://twitter.com/sequoia',
  linkedin_url = 'https://www.linkedin.com/company/sequoia-capital/',
  youtube_url = 'https://www.youtube.com/c/SequoiaCapital',
  crunchbase_url = 'https://www.crunchbase.com/organization/sequoia-capital'
WHERE firm_name = 'Sequoia Capital';

-- Accel
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/accel.com',
  twitter_url = 'https://twitter.com/Accel',
  linkedin_url = 'https://www.linkedin.com/company/accel-partners/',
  crunchbase_url = 'https://www.crunchbase.com/organization/accel-partners'
WHERE firm_name = 'Accel';

-- Greylock Partners
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/greylock.com',
  twitter_url = 'https://twitter.com/GreylockVC',
  linkedin_url = 'https://www.linkedin.com/company/greylock-partners/',
  crunchbase_url = 'https://www.crunchbase.com/organization/greylock'
WHERE firm_name = 'Greylock Partners';

-- Bessemer Venture Partners
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/bvp.com',
  twitter_url = 'https://twitter.com/BessemerVP',
  linkedin_url = 'https://www.linkedin.com/company/bessemer-venture-partners/',
  crunchbase_url = 'https://www.crunchbase.com/organization/bessemer-venture-partners'
WHERE firm_name = 'Bessemer Venture Partners';

-- Benchmark
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/benchmark.com',
  twitter_url = 'https://twitter.com/benchmark',
  linkedin_url = 'https://www.linkedin.com/company/benchmark/',
  crunchbase_url = 'https://www.crunchbase.com/organization/benchmark'
WHERE firm_name = 'Benchmark';

-- Lightspeed Venture Partners
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/lsvp.com',
  twitter_url = 'https://twitter.com/lightspeedvp',
  linkedin_url = 'https://www.linkedin.com/company/lightspeed-venture-partners/',
  crunchbase_url = 'https://www.crunchbase.com/organization/lightspeed-venture-partners'
WHERE firm_name = 'Lightspeed Venture Partners';

-- Index Ventures
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/indexventures.com',
  twitter_url = 'https://twitter.com/indexventures',
  linkedin_url = 'https://www.linkedin.com/company/index-ventures/',
  crunchbase_url = 'https://www.crunchbase.com/organization/index-ventures'
WHERE firm_name = 'Index Ventures';

-- Kleiner Perkins
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/kleinerperkins.com',
  twitter_url = 'https://twitter.com/kpcb',
  linkedin_url = 'https://www.linkedin.com/company/kleiner-perkins/',
  crunchbase_url = 'https://www.crunchbase.com/organization/kleiner-perkins'
WHERE firm_name = 'Kleiner Perkins';

-- GV (Google Ventures)
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/gv.com',
  twitter_url = 'https://twitter.com/GVteam',
  linkedin_url = 'https://www.linkedin.com/company/google-ventures/',
  crunchbase_url = 'https://www.crunchbase.com/organization/google-ventures'
WHERE firm_name = 'GV';

-- NEA (New Enterprise Associates)
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/nea.com',
  twitter_url = 'https://twitter.com/NEA',
  linkedin_url = 'https://www.linkedin.com/company/new-enterprise-associates/',
  crunchbase_url = 'https://www.crunchbase.com/organization/new-enterprise-associates'
WHERE firm_name = 'NEA';

-- Founders Fund
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/foundersfund.com',
  twitter_url = 'https://twitter.com/foundersfund',
  linkedin_url = 'https://www.linkedin.com/company/founders-fund/',
  crunchbase_url = 'https://www.crunchbase.com/organization/founders-fund'
WHERE firm_name = 'Founders Fund';

-- Insight Partners
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/insightpartners.com',
  twitter_url = 'https://twitter.com/insightpartners',
  linkedin_url = 'https://www.linkedin.com/company/insight-venture-partners/',
  crunchbase_url = 'https://www.crunchbase.com/organization/insight-venture-partners'
WHERE firm_name = 'Insight Partners';

-- Tiger Global Management
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/tigerglobal.com',
  linkedin_url = 'https://www.linkedin.com/company/tiger-global-management/',
  crunchbase_url = 'https://www.crunchbase.com/organization/tiger-global-management'
WHERE firm_name = 'Tiger Global Management';

-- Coatue Management
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/coatue.com',
  twitter_url = 'https://twitter.com/Coatue',
  linkedin_url = 'https://www.linkedin.com/company/coatue-management/',
  crunchbase_url = 'https://www.crunchbase.com/organization/coatue-management'
WHERE firm_name = 'Coatue Management';

-- General Catalyst
UPDATE public.investors
SET
  logo_url = 'https://logo.clearbit.com/generalcatalyst.com',
  twitter_url = 'https://twitter.com/generalcatalyst',
  linkedin_url = 'https://www.linkedin.com/company/general-catalyst-partners/',
  crunchbase_url = 'https://www.crunchbase.com/organization/general-catalyst-partners'
WHERE firm_name = 'General Catalyst';

-- Verify the changes
SELECT firm_name, slug, logo_url FROM public.investors ORDER BY firm_name LIMIT 10;
