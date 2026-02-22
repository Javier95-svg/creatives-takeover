-- Add optional contact email for angel investor profiles.
ALTER TABLE public.angel_investors
ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.angel_investors.email IS 'Optional contact email for the angel investor.';
