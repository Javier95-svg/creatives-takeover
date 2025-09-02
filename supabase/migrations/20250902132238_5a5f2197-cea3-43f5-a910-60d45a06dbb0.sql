-- Seed a demo community post with diverse sample comments
-- Ensures comments come from different accounts with unique names and avatars

-- Generate demo users
WITH u_author AS (
  SELECT gen_random_uuid() AS id, 'Casey Morgan'::text AS full_name, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Casey%20Morgan'::text AS avatar_url
),
 u1 AS (
  SELECT gen_random_uuid() AS id, 'Ava Carter'::text AS full_name, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ava%20Carter'::text AS avatar_url
),
 u2 AS (
  SELECT gen_random_uuid() AS id, 'Leo Nguyen'::text AS full_name, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo%20Nguyen'::text AS avatar_url
),
 u3 AS (
  SELECT gen_random_uuid() AS id, 'Maya Patel'::text AS full_name, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya%20Patel'::text AS avatar_url
),
 inserted_profiles AS (
  -- Insert profiles (these ids may not exist in auth.users, used only for display)
  INSERT INTO public.profiles (id, full_name, avatar_url)
  SELECT id, full_name, avatar_url FROM u_author
  UNION ALL
  SELECT id, full_name, avatar_url FROM u1
  UNION ALL
  SELECT id, full_name, avatar_url FROM u2
  UNION ALL
  SELECT id, full_name, avatar_url FROM u3
  ON CONFLICT (id) DO NOTHING
  RETURNING id
),
 inserted_post AS (
  INSERT INTO public.community_posts (user_id, title, content, tags)
  SELECT (SELECT id FROM u_author),
         'Demo: First $100 MRR story',
         'Shipped a scrappy MVP over a weekend and landed my first 5 customers via cold DMs. Used no-code for onboarding and Stripe for billing. Here''s what worked and what didn''t. Ask me anything!',
         ARRAY['startup','mvp','saas','validation']::text[]
  RETURNING id
)
INSERT INTO public.post_comments (post_id, user_id, content)
SELECT (SELECT id FROM inserted_post), (SELECT id FROM u1), 'Love this! What channel converted best for you?'
UNION ALL
SELECT (SELECT id FROM inserted_post), (SELECT id FROM u2), 'Congrats! How did you price the MVP initially?'
UNION ALL
SELECT (SELECT id FROM inserted_post), (SELECT id FROM u3), 'Any lessons on avoiding scope creep while shipping that fast?';