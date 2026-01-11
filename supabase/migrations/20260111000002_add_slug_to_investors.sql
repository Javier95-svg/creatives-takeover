-- Add slug field to investors table for custom URLs
-- Example: "Greylock Partners" -> "greylock-partners"

ALTER TABLE public.investors
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

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

-- Make slug NOT NULL after backfilling
ALTER TABLE public.investors
ALTER COLUMN slug SET NOT NULL;
