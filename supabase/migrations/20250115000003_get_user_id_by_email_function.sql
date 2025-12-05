-- Create SECURITY DEFINER function to get user ID by email
-- This function can access auth.users table with elevated privileges
-- Used for finding users by email (e.g., for messaging)

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM auth.users
  WHERE LOWER(email) = LOWER(user_email)
  LIMIT 1;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_user_id_by_email(TEXT) IS 'Returns user ID for a given email address. Requires authenticated user.';

