-- Disable Row Level Security on job_applications table
-- This allows INSERT operations without any policy restrictions
ALTER TABLE public.job_applications DISABLE ROW LEVEL SECURITY;