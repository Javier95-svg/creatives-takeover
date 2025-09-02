-- Allow everyone to view all profiles (for community display purposes)
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);