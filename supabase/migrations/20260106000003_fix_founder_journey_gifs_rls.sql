-- Fix RLS policies for founder_journey_gifs table
-- Use is_admin_user() function instead of auth.email() for better reliability

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can insert founder journey GIFs" ON public.founder_journey_gifs;
DROP POLICY IF EXISTS "Admin can update founder journey GIFs" ON public.founder_journey_gifs;
DROP POLICY IF EXISTS "Admin can delete founder journey GIFs" ON public.founder_journey_gifs;
DROP POLICY IF EXISTS "Public can view active founder journey GIFs" ON public.founder_journey_gifs;

-- Grant base permissions (required for RLS to work)
GRANT INSERT, UPDATE, DELETE ON public.founder_journey_gifs TO authenticated;
GRANT SELECT ON public.founder_journey_gifs TO authenticated, anon;

-- Recreate policies using is_admin_user() function
-- Admin can insert GIFs
CREATE POLICY "Admin can insert founder journey GIFs"
ON public.founder_journey_gifs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_user()
  AND uploaded_by = auth.uid()
);

-- Admin can update GIFs
CREATE POLICY "Admin can update founder journey GIFs"
ON public.founder_journey_gifs
FOR UPDATE
TO authenticated
USING (
  public.is_admin_user() = true
);

-- Admin can delete GIFs
CREATE POLICY "Admin can delete founder journey GIFs"
ON public.founder_journey_gifs
FOR DELETE
TO authenticated
USING (
  public.is_admin_user() = true
);

-- Public can view active GIFs
CREATE POLICY "Public can view active founder journey GIFs"
ON public.founder_journey_gifs
FOR SELECT
USING (is_active = true);

