-- Create a demo post with realistic content
INSERT INTO public.community_posts (
  user_id,
  title, 
  content,
  tags,
  upvotes,
  downvotes,
  comment_count
) VALUES (
  gen_random_uuid(),
  'Demo: First $100 MRR milestone reached!',
  'After 6 months of building in public, I finally hit my first $100 MRR with my SaaS tool for small businesses. The journey was tough but here are the key lessons I learned: 1) Validate early and often 2) Focus on one customer segment 3) Don''t over-engineer the MVP. Happy to share more details about my tech stack, marketing strategy, and pricing decisions. AMA!',
  ARRAY['startup', 'saas', 'mrr', 'bootstrap', 'validation']::text[],
  47,
  2,
  8
);