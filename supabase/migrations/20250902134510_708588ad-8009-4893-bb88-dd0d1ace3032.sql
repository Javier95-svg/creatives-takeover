-- Add realistic comments from different users
INSERT INTO post_comments (post_id, user_id, content) VALUES
-- Comments for first few posts with different users
((SELECT id FROM community_posts ORDER BY created_at LIMIT 1 OFFSET 0), (SELECT id FROM profiles WHERE full_name = 'Emma Chen'), 'Great insights! This really resonates with my own journey building my startup.'),
((SELECT id FROM community_posts ORDER BY created_at LIMIT 1 OFFSET 0), (SELECT id FROM profiles WHERE full_name = 'Marcus Rodriguez'), 'Love the transparency here. More founders should share their real numbers like this.'),
((SELECT id FROM community_posts ORDER BY created_at LIMIT 1 OFFSET 1), (SELECT id FROM profiles WHERE full_name = 'Sophia Kim'), 'This is gold! How long did it take you to implement this strategy?'),
((SELECT id FROM community_posts ORDER BY created_at LIMIT 1 OFFSET 1), (SELECT id FROM profiles WHERE full_name = 'David Thompson'), 'Amazing results! What was your biggest challenge during this process?'),
((SELECT id FROM community_posts ORDER BY created_at LIMIT 1 OFFSET 2), (SELECT id FROM profiles WHERE full_name = 'Zara Okafor'), 'Thanks for sharing this. Bookmarking for when I face similar challenges.'),
((SELECT id FROM community_posts ORDER BY created_at LIMIT 1 OFFSET 2), (SELECT id FROM profiles WHERE full_name = 'Alex Rivera'), 'Congrats on the milestone! What advice would you give someone just starting?'),
((SELECT id FROM community_posts ORDER BY created_at LIMIT 1 OFFSET 3), (SELECT id FROM profiles WHERE full_name = 'Priya Singh'), 'This is exactly what I needed to read today. Thanks for the motivation!'),
((SELECT id FROM community_posts ORDER BY created_at LIMIT 1 OFFSET 3), (SELECT id FROM profiles WHERE full_name = 'Jordan Parker'), 'Incredible growth! What tools or resources helped you the most?'),
((SELECT id FROM community_posts ORDER BY created_at LIMIT 1 OFFSET 4), (SELECT id FROM profiles WHERE full_name = 'Liam O''Connor'), 'Love the hustle mindset. How do you balance work and personal life?'),
((SELECT id FROM community_posts ORDER BY created_at LIMIT 1 OFFSET 4), (SELECT id FROM profiles WHERE full_name = 'Emma Chen'), 'Inspiring story! Keep pushing forward and sharing your journey with us.');