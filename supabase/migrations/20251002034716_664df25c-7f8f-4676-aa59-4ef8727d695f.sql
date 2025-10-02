-- Drop the existing INSERT policy for job_applications
DROP POLICY IF EXISTS "Users can create job applications" ON job_applications;

-- Create a new INSERT policy that properly handles NULL comparisons for guest users
CREATE POLICY "Users can create job applications" ON job_applications
FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND user_id IS NULL)
);