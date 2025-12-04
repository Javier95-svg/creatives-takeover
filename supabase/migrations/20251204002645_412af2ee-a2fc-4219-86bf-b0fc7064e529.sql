-- Drop the problematic policy that queries auth.users
DROP POLICY IF EXISTS "Admin full access to mentors" ON public.mentors;

-- Create new policy using the has_role function
CREATE POLICY "Admin full access to mentors"
ON public.mentors
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));