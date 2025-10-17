-- Delete comments from David Kim and Priya Sharma
DELETE FROM post_comments 
WHERE user_id IN (
  SELECT id FROM profiles WHERE full_name IN ('David Kim', 'Priya Sharma')
);