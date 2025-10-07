-- Remove the INSERT RLS policy from job_applications
-- Base table permissions (GRANT INSERT) are sufficient for anonymous applications
DROP POLICY IF EXISTS "Allow anonymous job applications" ON public.job_applications;