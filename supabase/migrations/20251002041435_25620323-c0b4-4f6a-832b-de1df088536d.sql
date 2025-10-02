-- Completely disable RLS on job_applications to allow public submissions
ALTER TABLE job_applications DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure clean slate
DROP POLICY IF EXISTS "Public can submit applications" ON job_applications;
DROP POLICY IF EXISTS "Users can create job applications" ON job_applications;
DROP POLICY IF EXISTS "Users can create their own applications" ON job_applications;
DROP POLICY IF EXISTS "Anyone can submit applications" ON job_applications;