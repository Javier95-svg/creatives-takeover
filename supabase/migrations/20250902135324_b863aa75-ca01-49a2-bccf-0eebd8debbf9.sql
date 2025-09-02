-- Allow public to view profiles (safe: only id, full_name, avatar_url are stored)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Public can view profiles'
  ) THEN
    CREATE POLICY "Public can view profiles"
    ON public.profiles
    FOR SELECT
    USING (true);
  END IF;
END $$;