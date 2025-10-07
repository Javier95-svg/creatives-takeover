-- CRITICAL FIX: Grant INSERT permission to anon and authenticated roles
-- RLS policies alone are not enough - the roles must have base table permissions
-- This is why "new row violates row-level security policy" error occurs

-- Grant INSERT permission to both anon (for guest applications) and authenticated users
GRANT INSERT ON public.job_applications TO anon;
GRANT INSERT ON public.job_applications TO authenticated;

-- Also ensure they can read their own applications (for authenticated users)
GRANT SELECT ON public.job_applications TO authenticated;

-- Comment explaining the permission model
COMMENT ON TABLE public.job_applications IS 
'Job applications with RLS enabled. Base permissions: anon/authenticated can INSERT (controlled by RLS policy). Only admins can SELECT/UPDATE/DELETE via RLS policies.';