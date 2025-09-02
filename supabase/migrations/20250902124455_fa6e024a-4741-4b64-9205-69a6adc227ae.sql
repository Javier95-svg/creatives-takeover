-- Create unique user profiles with proper UUIDs and avatars
INSERT INTO public.profiles (id, full_name, avatar_url) VALUES 
('11111111-2222-3333-4444-555555555555', 'Alex Chen', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'),
('22222222-3333-4444-5555-666666666666', 'Sarah Martinez', 'https://images.unsplash.com/photo-1494790108755-2616b332c6cd?w=400&h=400&fit=crop&crop=face'),
('33333333-4444-5555-6666-777777777777', 'Mike Johnson', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'),
('44444444-5555-6666-7777-888888888888', 'Emma Rodriguez', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'),
('55555555-6666-7777-8888-999999999999', 'David Kim', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face'),
('66666666-7777-8888-9999-000000000000', 'Lisa Thompson', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=face'),
('77777777-8888-9999-0000-111111111111', 'Jason Park', 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=400&h=400&fit=crop&crop=face'),
('88888888-9999-0000-1111-222222222222', 'Rachel White', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face'),
('99999999-0000-1111-2222-333333333333', 'Tom Wilson', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face'),
('00000000-1111-2222-3333-444444444444', 'Maya Patel', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=400&fit=crop&crop=face')
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url;

-- Update each post to use a different unique user (no repeated names)
UPDATE public.community_posts SET user_id = '11111111-2222-3333-4444-555555555555' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.community_posts SET user_id = '22222222-3333-4444-5555-666666666666' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.community_posts SET user_id = '33333333-4444-5555-6666-777777777777' WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE public.community_posts SET user_id = '44444444-5555-6666-7777-888888888888' WHERE id = '44444444-4444-4444-4444-444444444444';
UPDATE public.community_posts SET user_id = '55555555-6666-7777-8888-999999999999' WHERE id = '55555555-5555-5555-5555-555555555555';
UPDATE public.community_posts SET user_id = '66666666-7777-8888-9999-000000000000' WHERE id = '66666666-6666-6666-6666-666666666666';
UPDATE public.community_posts SET user_id = '77777777-8888-9999-0000-111111111111' WHERE id = '77777777-7777-7777-7777-777777777777';
UPDATE public.community_posts SET user_id = '88888888-9999-0000-1111-222222222222' WHERE id = '88888888-8888-8888-8888-888888888888';
UPDATE public.community_posts SET user_id = '99999999-0000-1111-2222-333333333333' WHERE id = '99999999-9999-9999-9999-999999999999';
UPDATE public.community_posts SET user_id = '00000000-1111-2222-3333-444444444444' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';