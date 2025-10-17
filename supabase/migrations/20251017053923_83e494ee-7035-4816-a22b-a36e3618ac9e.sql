-- Add username and social media fields to profiles table
-- Check if username column already exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT;
  END IF;
END $$;

-- Add social media columns if they don't exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Generate unique usernames for users without one
UPDATE public.profiles 
SET username = LOWER(REGEXP_REPLACE(full_name, '[^a-zA-Z0-9]', '', 'g')) || SUBSTRING(id::TEXT FROM 1 FOR 4)
WHERE username IS NULL;

-- Handle duplicate usernames by appending unique suffix
WITH duplicates AS (
  SELECT username, array_agg(id ORDER BY created_at) as ids
  FROM public.profiles 
  WHERE username IS NOT NULL
  GROUP BY username 
  HAVING COUNT(*) > 1
)
UPDATE public.profiles p
SET username = p.username || SUBSTRING(p.id::TEXT FROM 1 FOR 6)
FROM duplicates d
WHERE p.username = d.username 
  AND p.id = ANY(d.ids[2:]);

-- Now add unique constraint
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Make profiles publicly readable for viewing profile pages
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);

-- Users can still update their own profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);