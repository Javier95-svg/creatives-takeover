-- Add role column to profiles table
-- Allows users to identify as: founders, investors, or accelerators
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT NULL
CHECK (role IS NULL OR role IN ('founders', 'investors', 'accelerators'));
