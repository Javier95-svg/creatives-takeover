-- Get some post IDs and profile IDs to create realistic comments
WITH post_data AS (
  SELECT id FROM community_posts LIMIT 5
),
profile_data AS (
  SELECT id FROM profiles WHERE full_name != 'Javier Alonso' LIMIT 8
)
INSERT INTO post_comments (post_id, user_id, content) VALUES
-- Comments for different posts from different users
((SELECT id FROM post_data LIMIT 1 OFFSET 0), (SELECT id FROM profile_data LIMIT 1 OFFSET 0), 'Great insights! This really resonates with my own journey building my startup.'),
((SELECT id FROM post_data LIMIT 1 OFFSET 0), (SELECT id FROM profile_data LIMIT 1 OFFSET 1), 'Love the transparency here. More founders should share their real numbers like this.'),
((SELECT id FROM post_data LIMIT 1 OFFSET 1), (SELECT id FROM profile_data LIMIT 1 OFFSET 2), 'This is gold! How long did it take you to implement this strategy?'),
((SELECT id FROM post_data LIMIT 1 OFFSET 1), (SELECT id FROM profile_data LIMIT 1 OFFSET 3), 'Amazing results! What was your biggest challenge during this process?'),
((SELECT id FROM post_data LIMIT 1 OFFSET 2), (SELECT id FROM profile_data LIMIT 1 OFFSET 4), 'Thanks for sharing this. Bookmarking for when I face similar challenges.'),
((SELECT id FROM post_data LIMIT 1 OFFSET 2), (SELECT id FROM profile_data LIMIT 1 OFFSET 5), 'Congrats on the milestone! What advice would you give someone just starting?'),
((SELECT id FROM post_data LIMIT 1 OFFSET 3), (SELECT id FROM profile_data LIMIT 1 OFFSET 6), 'This is exactly what I needed to read today. Thanks for the motivation!'),
((SELECT id FROM post_data LIMIT 1 OFFSET 3), (SELECT id FROM profile_data LIMIT 1 OFFSET 7), 'Incredible growth! What tools or resources helped you the most?'),
((SELECT id FROM post_data LIMIT 1 OFFSET 4), (SELECT id FROM profile_data LIMIT 1 OFFSET 0), 'Love the hustle mindset. How do you balance work and personal life?'),
((SELECT id FROM post_data LIMIT 1 OFFSET 4), (SELECT id FROM profile_data LIMIT 1 OFFSET 1), 'Inspiring story! Keep pushing forward and sharing your journey with us.');