-- ============================================
-- PITCH DECK ANALYZER SETUP
-- Run this script in Supabase SQL Editor
-- ============================================

-- 1. Create the pitch-deck-uploads storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('pitch-deck-uploads', 'pitch-deck-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS Policies
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload pitch decks" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own pitch decks" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own pitch decks" ON storage.objects;
DROP POLICY IF EXISTS "Public can read pitch decks" ON storage.objects;

-- Users can upload their own pitch decks
CREATE POLICY "Users can upload pitch decks"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pitch-deck-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can read their own pitch decks
CREATE POLICY "Users can read own pitch decks"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pitch-deck-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own pitch decks
CREATE POLICY "Users can delete own pitch decks"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pitch-deck-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Service role can read all pitch decks (needed for edge functions)
CREATE POLICY "Service role can read pitch decks"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pitch-deck-uploads'
  AND auth.role() = 'service_role'
);

-- 3. Create pitch_deck_analyses table
CREATE TABLE IF NOT EXISTS pitch_deck_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  storage_path TEXT,

  -- Scores (0-100)
  overall_score NUMERIC(5,2),
  verdict TEXT, -- 'Strong', 'Promising', 'Needs Work', 'Weak'

  -- Sub-scores (6 dimensions)
  story_clarity_score NUMERIC(5,2),
  market_opportunity_score NUMERIC(5,2),
  traction_proof_score NUMERIC(5,2),
  business_model_score NUMERIC(5,2),
  team_credibility_score NUMERIC(5,2),
  fundraising_readiness_score NUMERIC(5,2),

  -- Analysis content
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  key_insights JSONB DEFAULT '{}',

  -- Metadata
  analysis_version TEXT DEFAULT '1.0',
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,
  feedback_submitted_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pitch_deck_analyses_user_id ON pitch_deck_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_pitch_deck_analyses_created_at ON pitch_deck_analyses(created_at DESC);

-- 5. Enable RLS on the table
ALTER TABLE pitch_deck_analyses ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for pitch_deck_analyses
DROP POLICY IF EXISTS "Users can view own analyses" ON pitch_deck_analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON pitch_deck_analyses;
DROP POLICY IF EXISTS "Users can update own analyses" ON pitch_deck_analyses;

CREATE POLICY "Users can view own analyses"
ON pitch_deck_analyses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
ON pitch_deck_analyses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
ON pitch_deck_analyses FOR UPDATE
USING (auth.uid() = user_id);

-- 7. Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_pitch_deck_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pitch_deck_analyses_updated_at ON pitch_deck_analyses;
CREATE TRIGGER pitch_deck_analyses_updated_at
  BEFORE UPDATE ON pitch_deck_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_pitch_deck_analyses_updated_at();

-- ============================================
-- VERIFICATION QUERIES (optional - run to check)
-- ============================================

-- Check bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'pitch-deck-uploads';

-- Check table exists:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pitch_deck_analyses';

-- Check policies:
-- SELECT * FROM pg_policies WHERE tablename = 'pitch_deck_analyses';
