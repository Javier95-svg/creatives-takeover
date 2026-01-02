-- Migration: Create cofounder_posts table
-- Description: Stores co-founder search posts from users
-- Date: 2026-01-02

-- Create cofounder_posts table
CREATE TABLE IF NOT EXISTS cofounder_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  project_description TEXT NOT NULL,
  industry TEXT,
  stage TEXT NOT NULL,
  looking_for TEXT[] NOT NULL,
  commitment TEXT,
  location TEXT,
  equity_range TEXT,
  additional_info TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cofounder_posts_user_id ON cofounder_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_cofounder_posts_status ON cofounder_posts(status);
CREATE INDEX IF NOT EXISTS idx_cofounder_posts_stage ON cofounder_posts(stage);
CREATE INDEX IF NOT EXISTS idx_cofounder_posts_created_at ON cofounder_posts(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE cofounder_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all active posts
CREATE POLICY "Anyone can view active cofounder posts"
  ON cofounder_posts
  FOR SELECT
  USING (status = 'active');

-- Policy: Users can insert their own posts
CREATE POLICY "Users can create their own cofounder posts"
  ON cofounder_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own posts
CREATE POLICY "Users can update their own cofounder posts"
  ON cofounder_posts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own posts
CREATE POLICY "Users can delete their own cofounder posts"
  ON cofounder_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comments to document the table
COMMENT ON TABLE cofounder_posts IS 'Stores co-founder search posts created by users';
COMMENT ON COLUMN cofounder_posts.project_name IS 'Name of the project/startup';
COMMENT ON COLUMN cofounder_posts.project_description IS 'Detailed description of the project';
COMMENT ON COLUMN cofounder_posts.industry IS 'Industry or sector (e.g., HealthTech, FinTech)';
COMMENT ON COLUMN cofounder_posts.stage IS 'Current stage of the project (idea, building-mvp, mvp-ready, early-users, funded)';
COMMENT ON COLUMN cofounder_posts.looking_for IS 'Array of co-founder types being sought (technical, business, marketing, design, finance)';
COMMENT ON COLUMN cofounder_posts.commitment IS 'Expected time commitment (full-time, part-time, etc.)';
COMMENT ON COLUMN cofounder_posts.location IS 'Location or remote work preference';
COMMENT ON COLUMN cofounder_posts.equity_range IS 'Equity range offered (e.g., 20-30%)';
COMMENT ON COLUMN cofounder_posts.additional_info IS 'Any additional information';
COMMENT ON COLUMN cofounder_posts.status IS 'Post status (active, inactive, closed)';
