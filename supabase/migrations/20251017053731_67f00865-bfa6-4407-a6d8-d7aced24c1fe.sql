-- Add username and social media fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Update existing users to have unique usernames
DO $$
DECLARE
  profile_record RECORD;
  base_username TEXT;
  final_username TEXT;
  counter INTEGER;
BEGIN
  FOR profile_record IN SELECT id, full_name FROM public.profiles WHERE username IS NULL LOOP
    -- Generate base username from full_name or id
    base_username := COALESCE(
      LOWER(REGEXP_REPLACE(profile_record.full_name, '[^a-zA-Z0-9]', '', 'g')),
      'user' || SUBSTRING(profile_record.id::TEXT FROM 1 FOR 8)
    );
    
    -- Ensure uniqueness by appending counter if needed
    final_username := base_username;
    counter := 1;
    
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
      final_username := base_username || counter;
      counter := counter + 1;
    END LOOP;
    
    -- Update the profile with unique username
    UPDATE public.profiles SET username = final_username WHERE id = profile_record.id;
  END LOOP;
END $$;

-- Now add unique constraint
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_username_key UNIQUE (username);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Make profiles publicly readable for viewing profile pages
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);

-- Allow users to view all profiles (for the community)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);