-- Add realistic comments from different users for each post
INSERT INTO post_comments (post_id, user_id, content) 
SELECT 
  cp.id as post_id,
  p.id as user_id,
  CASE 
    WHEN ROW_NUMBER() OVER () % 10 = 1 THEN 'Great insights! This really resonates with my own journey building my startup.'
    WHEN ROW_NUMBER() OVER () % 10 = 2 THEN 'Love the transparency here. More founders should share their real numbers like this.'
    WHEN ROW_NUMBER() OVER () % 10 = 3 THEN 'This is gold! How long did it take you to implement this strategy?'
    WHEN ROW_NUMBER() OVER () % 10 = 4 THEN 'Amazing results! What was your biggest challenge during this process?'
    WHEN ROW_NUMBER() OVER () % 10 = 5 THEN 'Thanks for sharing this. Bookmarking for when I face similar challenges.'
    WHEN ROW_NUMBER() OVER () % 10 = 6 THEN 'Congrats on the milestone! What advice would you give someone just starting?'
    WHEN ROW_NUMBER() OVER () % 10 = 7 THEN 'This is exactly what I needed to read today. Thanks for the motivation!'
    WHEN ROW_NUMBER() OVER () % 10 = 8 THEN 'Incredible growth! What tools or resources helped you the most?'
    WHEN ROW_NUMBER() OVER () % 10 = 9 THEN 'Love the hustle mindset. How do you balance work and personal life?'
    ELSE 'Inspiring story! Keep pushing forward and sharing your journey with us.'
  END as content
FROM community_posts cp
CROSS JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY full_name) as rn 
  FROM profiles 
  WHERE full_name != 'Javier Alonso'
  LIMIT 8
) p
WHERE cp.id IN (
  SELECT id FROM community_posts ORDER BY created_at LIMIT 10
)
AND MOD(ABS(HASHTEXT(cp.id::text) + p.rn), 3) = 0  -- Randomly assign 2-3 comments per post