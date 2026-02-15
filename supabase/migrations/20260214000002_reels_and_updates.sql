-- Create user_reels table for video content
CREATE TABLE IF NOT EXISTS public.user_reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create startup_updates table for startup milestones and updates
CREATE TABLE IF NOT EXISTS public.startup_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL CHECK (update_type IN ('milestone', 'launch', 'funding', 'team', 'product', 'other')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_reels
CREATE POLICY "Anyone can view reels"
  ON public.user_reels
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own reels"
  ON public.user_reels
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reels"
  ON public.user_reels
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reels"
  ON public.user_reels
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for startup_updates
CREATE POLICY "Anyone can view startup updates"
  ON public.startup_updates
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own startup updates"
  ON public.startup_updates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own startup updates"
  ON public.startup_updates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own startup updates"
  ON public.startup_updates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_user_reels_user_id ON public.user_reels(user_id);
CREATE INDEX idx_user_reels_created_at ON public.user_reels(created_at DESC);
CREATE INDEX idx_startup_updates_user_id ON public.startup_updates(user_id);
CREATE INDEX idx_startup_updates_created_at ON public.startup_updates(created_at DESC);
CREATE INDEX idx_startup_updates_type ON public.startup_updates(update_type);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_user_reels_updated_at
  BEFORE UPDATE ON public.user_reels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_startup_updates_updated_at
  BEFORE UPDATE ON public.startup_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
