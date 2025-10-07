-- Enable Row Level Security on job_applications table
-- This protects sensitive applicant data (names, emails, LinkedIn, CVs) from public access
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit job applications (guest or authenticated)
-- This is necessary because the JobApplicationForm allows anonymous applications
CREATE POLICY "Anyone can submit job applications"
ON public.job_applications
FOR INSERT
WITH CHECK (true);

-- Add admin-only delete policy for data management
CREATE POLICY "Admins can delete applications"
ON public.job_applications
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add comment explaining the security model
COMMENT ON TABLE public.job_applications IS 'Contains sensitive applicant PII. RLS enabled with admin-only read/update/delete access. Anonymous insert allowed for guest applications.';