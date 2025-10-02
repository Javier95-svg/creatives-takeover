-- Disable RLS temporarily and recreate with simple policy
ALTER TABLE job_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Drop all INSERT policies
DROP POLICY IF EXISTS "Users can create job applications" ON job_applications;
DROP POLICY IF EXISTS "Users can create their own applications" ON job_applications;
DROP POLICY IF EXISTS "Anyone can submit applications" ON job_applications;

-- Create simple public INSERT policy
CREATE POLICY "Public can submit applications" 
ON job_applications 
FOR INSERT 
WITH CHECK (true);