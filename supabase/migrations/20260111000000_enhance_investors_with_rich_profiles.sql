-- Enhance investors table with richer profile information
-- This migration adds fields for logos, social media, and visual branding

-- Add logo and branding fields
ALTER TABLE public.investors
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS header_image_url TEXT;

-- Add social media fields
ALTER TABLE public.investors
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS crunchbase_url TEXT,
ADD COLUMN IF NOT EXISTS angellist_url TEXT;

-- Add additional social/professional URLs
ALTER TABLE public.investors
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS medium_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.investors.logo_url IS 'URL to the VC firm logo (displayed on cards and profile)';
COMMENT ON COLUMN public.investors.header_image_url IS 'URL to header/wallpaper image for profile page';
COMMENT ON COLUMN public.investors.twitter_url IS 'Twitter/X profile URL';
COMMENT ON COLUMN public.investors.facebook_url IS 'Facebook page URL';
COMMENT ON COLUMN public.investors.crunchbase_url IS 'Crunchbase profile URL';
COMMENT ON COLUMN public.investors.angellist_url IS 'AngelList profile URL';
COMMENT ON COLUMN public.investors.youtube_url IS 'YouTube channel URL';
COMMENT ON COLUMN public.investors.instagram_url IS 'Instagram profile URL';
COMMENT ON COLUMN public.investors.medium_url IS 'Medium publication URL';

-- Update existing records with placeholder values (to be filled with real data later)
-- This ensures no NULL issues during the transition
UPDATE public.investors
SET
  logo_url = CASE
    WHEN logo_url IS NULL THEN NULL -- Keep as NULL for now, will be populated
    ELSE logo_url
  END,
  twitter_url = CASE
    WHEN twitter_url IS NULL THEN NULL
    ELSE twitter_url
  END;

-- Create index for logo_url lookups (frequently accessed for display)
CREATE INDEX IF NOT EXISTS idx_investors_logo_url ON public.investors(logo_url) WHERE logo_url IS NOT NULL;
