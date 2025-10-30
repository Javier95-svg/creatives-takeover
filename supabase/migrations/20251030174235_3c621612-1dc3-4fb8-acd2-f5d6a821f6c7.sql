-- Create user_photos table for profile picture gallery
CREATE TABLE IF NOT EXISTS public.user_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view photos"
  ON public.user_photos
  FOR SELECT
  USING (true);

CREATE POLICY "Users can upload their own photos"
  ON public.user_photos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos"
  ON public.user_photos
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
  ON public.user_photos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_photos_user_id ON public.user_photos(user_id);
CREATE INDEX idx_user_photos_created_at ON public.user_photos(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_user_photos_updated_at
  BEFORE UPDATE ON public.user_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();