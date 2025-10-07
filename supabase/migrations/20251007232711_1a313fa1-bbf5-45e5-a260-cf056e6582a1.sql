-- Remove all RLS policies from job_applications table
DROP POLICY IF EXISTS "Admins can delete job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Admins can update job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Admins can view all job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Service role can manage all job applications" ON public.job_applications;