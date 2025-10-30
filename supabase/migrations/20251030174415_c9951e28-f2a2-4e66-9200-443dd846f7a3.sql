-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view photos" ON public.user_photos;
DROP POLICY IF EXISTS "Users can upload their own photos" ON public.user_photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.user_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.user_photos;

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