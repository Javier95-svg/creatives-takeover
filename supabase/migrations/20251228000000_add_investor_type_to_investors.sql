-- Add investor_type column to classify investors (VC, angel, fund, corporate VC)
-- This allows us to filter and distinguish between different investor types

-- Add investor_type column with check constraint
ALTER TABLE public.investors
ADD COLUMN IF NOT EXISTS investor_type TEXT
CHECK (investor_type IN ('vc', 'angel', 'fund', 'corporate_vc'))
DEFAULT 'vc';

-- Create index for efficient filtering by investor type
CREATE INDEX IF NOT EXISTS idx_investors_type
ON public.investors(investor_type)
WHERE is_active = true;

-- Classify all existing investors as VCs (seeded data are all VC firms)
UPDATE public.investors
SET investor_type = 'vc'
WHERE investor_type IS NULL;

-- Make the column required (NOT NULL)
ALTER TABLE public.investors
ALTER COLUMN investor_type SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.investors.investor_type IS 'Type of investor: vc (Venture Capital), angel (Angel Investor), fund (Investment Fund), or corporate_vc (Corporate VC)';
