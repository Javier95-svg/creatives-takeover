-- Remove Maya Chen profile and related data
-- This migration cleans up the sample mentor profile

-- Delete Maya Chen from profiles table
DELETE FROM profiles WHERE full_name = 'Maya Chen';

-- Note: Due to foreign key constraints with ON DELETE CASCADE or ON DELETE SET NULL,
-- related records in other tables (posts, comments, etc.) will be handled automatically
-- based on the existing schema configuration.
