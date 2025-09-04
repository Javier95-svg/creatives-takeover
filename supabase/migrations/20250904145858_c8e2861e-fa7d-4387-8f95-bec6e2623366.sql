-- Extend trends table to support business opportunities
ALTER TABLE trends 
ADD COLUMN IF NOT EXISTS business_opportunity jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS opportunity_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS entry_difficulty integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS market_size_estimate text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS competition_level text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS time_sensitivity text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS revenue_models text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_audience text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS action_steps text[] DEFAULT '{}';

-- Extend expiry time from 24 hours to 7 days
ALTER TABLE trends 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- Create index for better business opportunity queries
CREATE INDEX IF NOT EXISTS idx_trends_opportunity_score ON trends(opportunity_score DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_trends_category_active ON trends(category, is_active) WHERE is_active = true;

-- Create function to automatically refresh expired trends
CREATE OR REPLACE FUNCTION refresh_expired_trends()
RETURNS void AS $$
BEGIN
  -- Mark expired trends as inactive
  UPDATE trends 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
END;
$$ LANGUAGE plpgsql;