-- Delete comment from Jordan Park
-- Removes the comment: 'Love the transparency. What metrics do you track regularly?'

DELETE FROM post_comments 
WHERE user_id = (SELECT id FROM profiles WHERE full_name = 'Jordan Park' LIMIT 1)
  AND content = 'Love the transparency. What metrics do you track regularly?';

