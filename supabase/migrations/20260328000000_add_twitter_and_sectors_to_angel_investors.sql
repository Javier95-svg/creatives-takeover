-- Add X profile and sector tagging support for angel investor profiles.
ALTER TABLE public.angel_investors
ADD COLUMN IF NOT EXISTS twitter_x_url TEXT,
ADD COLUMN IF NOT EXISTS sectors TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.angel_investors.twitter_x_url IS 'Optional X (Twitter) profile URL for the angel investor.';
COMMENT ON COLUMN public.angel_investors.sectors IS 'Optional list of sectors this angel investor focuses on.';
