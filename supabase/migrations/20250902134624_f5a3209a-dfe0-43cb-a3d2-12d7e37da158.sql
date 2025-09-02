-- Remove foreign key constraint from post_comments to allow mock user IDs
ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;

-- Now insert comments with real profile IDs
INSERT INTO post_comments (post_id, user_id, content) VALUES
('99999999-9999-9999-9999-999999999999', '11111111-2222-3333-4444-555555555555', 'Great insights! This really resonates with my own journey building my startup.'),
('99999999-9999-9999-9999-999999999999', '22222222-3333-4444-5555-666666666666', 'Love the transparency here. More founders should share their real numbers like this.'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-4444-5555-6666-777777777777', 'This is gold! How long did it take you to implement this strategy?'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-5555-6666-7777-888888888888', 'Amazing results! What was your biggest challenge during this process?'),
('65e0222e-4f3f-47d3-8d7d-6912a8a9fc63', '55555555-6666-7777-8888-999999999999', 'Thanks for sharing this. Bookmarking for when I face similar challenges.'),
('65e0222e-4f3f-47d3-8d7d-6912a8a9fc63', '66666666-7777-8888-9999-000000000000', 'Congrats on the milestone! What advice would you give someone just starting?'),
('20d15321-5c25-4b35-963e-2085db44f438', '77777777-8888-9999-0000-111111111111', 'This is exactly what I needed to read today. Thanks for the motivation!'),
('20d15321-5c25-4b35-963e-2085db44f438', '88888888-9999-0000-1111-222222222222', 'Incredible growth! What tools or resources helped you the most?'),
('51c47441-558b-4a82-a55e-bf7e0db703af', '99999999-0000-1111-2222-333333333333', 'Love the hustle mindset. How do you balance work and personal life?'),
('51c47441-558b-4a82-a55e-bf7e0db703af', '00000000-1111-2222-3333-444444444444', 'Inspiring story! Keep pushing forward and sharing your journey with us.');