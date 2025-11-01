-- Phase 1: AI Co-Founder Foundation
-- Add personality and memory preferences to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ai_personality TEXT DEFAULT 'balanced',
ADD COLUMN IF NOT EXISTS memory_preference TEXT DEFAULT 'important',
ADD COLUMN IF NOT EXISTS cofounder_onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS founder_journey_stage TEXT DEFAULT 'ideation',
ADD COLUMN IF NOT EXISTS last_checkin_date DATE;

-- Add journey tracking to chat_sessions
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS journey_stage TEXT DEFAULT 'ideation',
ADD COLUMN IF NOT EXISTS milestones_achieved JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS mood_sentiment TEXT,
ADD COLUMN IF NOT EXISTS importance_score NUMERIC(3,2) DEFAULT 0.5;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_ai_personality ON profiles(ai_personality);
CREATE INDEX IF NOT EXISTS idx_profiles_journey_stage ON profiles(founder_journey_stage);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_journey_stage ON chat_sessions(journey_stage);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_importance_score ON chat_sessions(importance_score DESC);

-- Create function to update journey stage
CREATE OR REPLACE FUNCTION update_founder_journey_stage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile's journey stage based on latest session
  UPDATE profiles
  SET 
    founder_journey_stage = NEW.journey_stage,
    updated_at = now()
  WHERE id = NEW.user_id AND NEW.journey_stage IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to keep profile journey stage in sync
DROP TRIGGER IF EXISTS sync_journey_stage ON chat_sessions;
CREATE TRIGGER sync_journey_stage
AFTER INSERT OR UPDATE OF journey_stage ON chat_sessions
FOR EACH ROW
EXECUTE FUNCTION update_founder_journey_stage();