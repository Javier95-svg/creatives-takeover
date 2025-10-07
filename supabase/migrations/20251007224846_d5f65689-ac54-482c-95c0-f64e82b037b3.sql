-- CRITICAL SECURITY FIX: Enable Row Level Security on job_applications table
-- The table has all necessary policies defined but RLS was never enabled
-- Without RLS, all job applications (names, emails, LinkedIn, CVs) are publicly accessible
-- This fixes the EXPOSED_JOB_APPLICATIONS security finding
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;