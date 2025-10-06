-- Create conversation memory table
CREATE TABLE conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  
  -- Memory classification
  memory_type TEXT NOT NULL CHECK (memory_type IN ('decision', 'win', 'challenge', 'insight', 'goal', 'pivot')),
  importance_score FLOAT DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  
  -- Context
  business_stage TEXT CHECK (business_stage IN ('ideation', 'validation', 'launch', 'growth')),
  related_memories UUID[],
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_referenced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  reference_count INTEGER DEFAULT 0,
  
  -- Emotional context
  user_mood TEXT CHECK (user_mood IN ('excited', 'frustrated', 'overwhelmed', 'confident', 'neutral')),
  ai_response_tone TEXT CHECK (ai_response_tone IN ('cheerleader', 'strategic', 'empathetic', 'balanced'))
);

-- Add AI personality to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_personality TEXT DEFAULT 'balanced' CHECK (ai_personality IN ('cheerleader', 'strategist', 'therapist', 'balanced'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS memory_preference TEXT DEFAULT 'automatic' CHECK (memory_preference IN ('automatic', 'manual', 'off'));

-- Enable RLS
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_memory
CREATE POLICY "Users can view their own memories"
  ON conversation_memory
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memories"
  ON conversation_memory
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
  ON conversation_memory
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
  ON conversation_memory
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_conversation_memory_user_id ON conversation_memory(user_id);
CREATE INDEX idx_conversation_memory_session_id ON conversation_memory(session_id);
CREATE INDEX idx_conversation_memory_type ON conversation_memory(memory_type);
CREATE INDEX idx_conversation_memory_importance ON conversation_memory(importance_score DESC);
CREATE INDEX idx_conversation_memory_created_at ON conversation_memory(created_at DESC);

-- Function to update last_referenced_at when memory is queried
CREATE OR REPLACE FUNCTION update_memory_reference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reference_count = OLD.reference_count + 1;
  NEW.last_referenced_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;