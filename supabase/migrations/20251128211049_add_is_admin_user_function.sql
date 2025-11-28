-- Create SECURITY DEFINER function to check if current user is admin
-- This function can access auth.users table with elevated privileges
-- and is used by storage RLS policies

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
  )
$$;

