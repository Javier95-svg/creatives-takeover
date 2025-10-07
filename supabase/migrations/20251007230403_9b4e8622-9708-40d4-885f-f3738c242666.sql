-- Fix INSERT policy to allow anonymous job applications
-- Drop all existing INSERT policies on job_applications
DROP POLICY IF EXISTS "Anyone can submit job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can insert their own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Authenticated users can insert applications" ON public.job_applications;

-- Create a new INSERT policy that allows anyone (including anonymous) to submit applications
CREATE POLICY "Allow anonymous job applications"
ON public.job_applications
FOR INSERT
WITH CHECK (true);