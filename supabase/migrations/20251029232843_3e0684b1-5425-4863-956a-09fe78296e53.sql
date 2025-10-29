-- Drop ALL existing SELECT policies on profiles table
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view basic profile info for community members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles they follow or are friends with" ON public.profiles;
DROP POLICY IF EXISTS "Users can view followed profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create restrictive policies: only owner and confirmed followers
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view followed profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_follows
      WHERE follower_id = auth.uid() 
        AND following_id = profiles.id 
        AND status = 'accepted'
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 
  'Users can view their complete profile data';
COMMENT ON POLICY "Users can view followed profiles" ON public.profiles IS 
  'Users can view profiles of people they follow with accepted status';