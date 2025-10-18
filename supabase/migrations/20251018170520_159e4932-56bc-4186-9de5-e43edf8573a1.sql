-- Add reflection fields to daily_check_ins table
ALTER TABLE daily_check_ins 
ADD COLUMN IF NOT EXISTS goal_achieved BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS what_went_well TEXT,
ADD COLUMN IF NOT EXISTS reflection_note TEXT;

-- Create daily_wins table for quick win captures
CREATE TABLE IF NOT EXISTS daily_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  win_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on daily_wins
ALTER TABLE daily_wins ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_wins
CREATE POLICY "Users can view their own wins"
  ON daily_wins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wins"
  ON daily_wins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wins"
  ON daily_wins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wins"
  ON daily_wins FOR DELETE
  USING (auth.uid() = user_id);