-- Create custom_prompt_chains table for user-generated prompt chains
CREATE TABLE IF NOT EXISTS public.custom_prompt_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  concept_title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  steps JSONB NOT NULL,
  author_name TEXT NOT NULL,
  published BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.custom_prompt_chains ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view published prompt chains
CREATE POLICY "Published prompt chains are viewable by everyone"
  ON public.custom_prompt_chains
  FOR SELECT
  USING (published = true);

-- Users can view their own prompt chains (published or not)
CREATE POLICY "Users can view their own prompt chains"
  ON public.custom_prompt_chains
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own prompt chains
CREATE POLICY "Users can create their own prompt chains"
  ON public.custom_prompt_chains
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own prompt chains
CREATE POLICY "Users can update their own prompt chains"
  ON public.custom_prompt_chains
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own prompt chains
CREATE POLICY "Users can delete their own prompt chains"
  ON public.custom_prompt_chains
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_prompt_chains_user_id ON public.custom_prompt_chains(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_prompt_chains_published ON public.custom_prompt_chains(published);
CREATE INDEX IF NOT EXISTS idx_custom_prompt_chains_category ON public.custom_prompt_chains(category);
CREATE INDEX IF NOT EXISTS idx_custom_prompt_chains_created_at ON public.custom_prompt_chains(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_prompt_chains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_custom_prompt_chains_updated_at
  BEFORE UPDATE ON public.custom_prompt_chains
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_prompt_chains_updated_at();

