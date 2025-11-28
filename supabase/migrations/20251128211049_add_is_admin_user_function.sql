-- Create SECURITY DEFINER function to check if current user is admin
-- This function can access auth.users table with elevated privileges
-- and is used by storage RLS policies

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Return false if no user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Try to get email from auth.users (this requires SECURITY DEFINER)
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Check if email matches admin email
  IF user_email IS NOT NULL AND LOWER(user_email) = 'admin@creatives-takeover.com' THEN
    RETURN true;
  END IF;
  
  -- Fallback: check if user has professional tier in profiles (admin should have this)
  -- This is less secure but works as a fallback if auth.users access fails
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND subscription_tier = 'professional'
  ) THEN
    -- Double-check through subscribers table for additional security
    IF EXISTS (
      SELECT 1
      FROM public.subscribers
      WHERE user_id = auth.uid()
      AND LOWER(email) = 'admin@creatives-takeover.com'
      AND subscription_tier = 'professional'
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
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

