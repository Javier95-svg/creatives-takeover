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
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = auth.uid()
      AND LOWER(email) = 'admin@creatives-takeover.com'
    ),
    false
  )
$$;

-- Grant execute permissions to authenticated and anon roles
-- This is required for the function to be usable in storage RLS policies
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated, anon;

-- Create alternative function that checks through subscribers table
-- This might work better in storage policies if auth.users access is restricted
CREATE OR REPLACE FUNCTION public.is_admin_user_via_subscribers()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return false if no user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user exists in subscribers table with admin email and professional tier
  RETURN EXISTS (
    SELECT 1
    FROM public.subscribers
    WHERE user_id = auth.uid()
    AND LOWER(email) = 'admin@creatives-takeover.com'
    AND subscription_tier = 'professional'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin_user_via_subscribers() TO authenticated, anon;

