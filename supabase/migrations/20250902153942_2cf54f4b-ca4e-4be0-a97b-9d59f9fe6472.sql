DO $$
DECLARE
  post_id uuid := '55555555-5555-5555-5555-555555555555'; -- David Kim's post
  u1 uuid;
  u2 uuid;
  u3 uuid;
  u4 uuid;
BEGIN
  -- Create 4 commenter profiles (if they don't already exist)
  u1 := gen_random_uuid();
  u2 := gen_random_uuid();
  u3 := gen_random_uuid();
  u4 := gen_random_uuid();

  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES
    (u1, 'Maya Chen', 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=400&h=400&fit=crop&crop=face'),
    (u2, 'Carlos Rodriguez', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face'),
    (u3, 'Priya Sharma', 'https://images.unsplash.com/photo-1544005314-0ceecf7a77ce?w=400&h=400&fit=crop&crop=face'),
    (u4, 'Jordan Park', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face');

  -- Add 4 comments to the post by different users
  INSERT INTO public.post_comments (post_id, user_id, content)
  VALUES
    (post_id, u1, 'This is incredible! What was your biggest challenge during implementation?'),
    (post_id, u2, 'Thanks for sharing! How long did this take you to build?'),
    (post_id, u3, 'Amazing results! Any advice for someone just starting out?'),
    (post_id, u4, 'Love the transparency. What metrics do you track regularly?');
END $$;