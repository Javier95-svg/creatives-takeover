-- Add currency column to mentors table
-- This column stores the currency code for the mentor's pricing (e.g., 'USD', 'GBP', 'EUR')
-- Defaults to 'USD' for backward compatibility

ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

COMMENT ON COLUMN public.mentors.currency IS 'Currency code for mentor pricing (e.g., USD, GBP, EUR, CAD, AUD, SGD, CHF, INR). Defaults to USD.';

-- Set existing mentors to USD if null
UPDATE public.mentors
SET currency = 'USD'
WHERE currency IS NULL;
