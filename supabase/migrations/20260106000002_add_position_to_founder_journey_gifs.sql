-- Add position column to founder_journey_gifs table
ALTER TABLE public.founder_journey_gifs
ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Update existing records to have position 0 (first row)
UPDATE public.founder_journey_gifs
SET position = 0
WHERE position IS NULL;

-- Create unique constraint to ensure only one active GIF per position
CREATE UNIQUE INDEX IF NOT EXISTS idx_founder_journey_gifs_position_active 
ON public.founder_journey_gifs(position) 
WHERE is_active = true;

-- Update index to include position
DROP INDEX IF EXISTS idx_founder_journey_gifs_active;
CREATE INDEX IF NOT EXISTS idx_founder_journey_gifs_active 
ON public.founder_journey_gifs(position, is_active, uploaded_at DESC);

