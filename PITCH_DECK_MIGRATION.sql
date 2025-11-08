-- Pitch Deck Library Database Migration
-- Run this in your Supabase SQL Editor

-- Drop old tables if they exist
DROP TABLE IF EXISTS pitch_deck_files CASCADE;
DROP TABLE IF EXISTS investor_tracker CASCADE;

-- Create pitch_decks table
CREATE TABLE IF NOT EXISTS pitch_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Pitch Deck',
  template_id text NOT NULL,
  slides jsonb DEFAULT '[]'::jsonb,
  theme jsonb DEFAULT '{"primaryColor": "#3b82f6", "secondaryColor": "#10b981", "fontFamily": "Inter"}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE pitch_decks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own pitch decks"
  ON pitch_decks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pitch decks"
  ON pitch_decks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pitch decks"
  ON pitch_decks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pitch decks"
  ON pitch_decks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_pitch_decks_updated_at ON pitch_decks;
CREATE TRIGGER update_pitch_decks_updated_at
  BEFORE UPDATE ON pitch_decks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_pitch_decks_user_id ON pitch_decks(user_id);
