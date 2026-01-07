-- Add position column to founder_journey_gifs table
ALTER TABLE public.founder_journey_gifs
ADD COLUMN IF NOT EXISTS position INTEGER;

-- Update existing records to have position 0 (first row)
UPDATE public.founder_journey_gifs
SET position = 0
WHERE position IS NULL;

-- Deactivate all but the most recent active GIF for each position
-- This handles duplicates before creating the unique index
WITH ranked_gifs AS (
  SELECT 
    id,
    position,
    is_active,
    ROW_NUMBER() OVER (PARTITION BY position ORDER BY uploaded_at DESC) as rn
  FROM public.founder_journey_gifs
  WHERE is_active = true
)
UPDATE public.founder_journey_gifs
SET is_active = false
WHERE id IN (
  SELECT id FROM ranked_gifs WHERE rn > 1
);

-- Now set NOT NULL constraint after handling duplicates
ALTER TABLE public.founder_journey_gifs
ALTER COLUMN position SET NOT NULL,
ALTER COLUMN position SET DEFAULT 0;

-- Create unique constraint to ensure only one active GIF per position
CREATE UNIQUE INDEX IF NOT EXISTS idx_founder_journey_gifs_position_active 
ON public.founder_journey_gifs(position) 
WHERE is_active = true;

-- Update index to include position
DROP INDEX IF EXISTS idx_founder_journey_gifs_active;
CREATE INDEX IF NOT EXISTS idx_founder_journey_gifs_active 
ON public.founder_journey_gifs(position, is_active, uploaded_at DESC);

