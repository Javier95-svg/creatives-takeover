-- Delete posts from Jordan Park and Maya Chen
DELETE FROM community_posts 
WHERE user_id IN (
  '3f8e63f8-fa94-408d-ae10-7f595e826d4d',  -- Jordan Park
  '99119182-f64b-4530-8d98-64168af43500'   -- Maya Chen
);