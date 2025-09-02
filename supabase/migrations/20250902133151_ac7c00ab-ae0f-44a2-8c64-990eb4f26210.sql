-- Clean up database by removing problematic profiles
-- Remove Javier Alonso profile completely
DELETE FROM profiles WHERE full_name = 'Javier Alonso';

-- Remove duplicate profiles without avatars, keeping only ones with avatars
DELETE FROM profiles WHERE avatar_url IS NULL OR avatar_url = '';

-- Remove any posts that might be orphaned (not linked to existing profiles)
DELETE FROM community_posts WHERE user_id NOT IN (SELECT id FROM profiles);