-- Create unique user profiles with avatars (excluding Javier Alonso)
DELETE FROM public.profiles WHERE id NOT IN (
  SELECT DISTINCT user_id FROM auth.users
);

-- Insert unique profiles for each post with generated avatar URLs
INSERT INTO public.profiles (id, full_name, avatar_url) VALUES 
('user-001-alex-chen', 'Alex Chen', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'),
('user-002-sarah-martinez', 'Sarah Martinez', 'https://images.unsplash.com/photo-1494790108755-2616b332c6cd?w=400&h=400&fit=crop&crop=face'),
('user-003-mike-johnson', 'Mike Johnson', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'),
('user-004-emma-rodriguez', 'Emma Rodriguez', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'),
('user-005-david-kim', 'David Kim', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face'),
('user-006-lisa-thompson', 'Lisa Thompson', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=face'),
('user-007-jason-park', 'Jason Park', 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=400&h=400&fit=crop&crop=face'),
('user-008-rachel-white', 'Rachel White', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face'),
('user-009-tom-wilson', 'Tom Wilson', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face'),
('user-010-maya-patel', 'Maya Patel', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=400&fit=crop&crop=face')
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url;

-- Update posts to use different users for each post
UPDATE public.community_posts SET user_id = 'user-001-alex-chen' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.community_posts SET user_id = 'user-002-sarah-martinez' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.community_posts SET user_id = 'user-003-mike-johnson' WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE public.community_posts SET user_id = 'user-004-emma-rodriguez' WHERE id = '44444444-4444-4444-4444-444444444444';
UPDATE public.community_posts SET user_id = 'user-005-david-kim' WHERE id = '55555555-5555-5555-5555-555555555555';
UPDATE public.community_posts SET user_id = 'user-006-lisa-thompson' WHERE id = '66666666-6666-6666-6666-666666666666';
UPDATE public.community_posts SET user_id = 'user-007-jason-park' WHERE id = '77777777-7777-7777-7777-777777777777';
UPDATE public.community_posts SET user_id = 'user-008-rachel-white' WHERE id = '88888888-8888-8888-8888-888888888888';
UPDATE public.community_posts SET user_id = 'user-009-tom-wilson' WHERE id = '99999999-9999-9999-9999-999999999999';
UPDATE public.community_posts SET user_id = 'user-010-maya-patel' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';