-- Add Answer Quality Tracking to BizMap AI
-- This migration adds support for tracking answer quality scores in the wizard flow

-- Add answer_quality_scores column to chatbot_conversations table
ALTER TABLE chatbot_conversations
ADD COLUMN IF NOT EXISTS answer_quality_scores JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN chatbot_conversations.answer_quality_scores IS 'Stores quality scores for each wizard step answer. Format: {"step_0": {"score": 75, "level": "good", "feedback": [...]}, ...}';

-- Create index for faster queries on quality scores
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_quality_scores
ON chatbot_conversations USING gin (answer_quality_scores);

-- Verify the changes
DO $$
BEGIN
  -- Check if column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'chatbot_conversations'
    AND column_name = 'answer_quality_scores'
  ) THEN
    RAISE NOTICE '✅ answer_quality_scores column added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add answer_quality_scores column';
  END IF;
END $$;
