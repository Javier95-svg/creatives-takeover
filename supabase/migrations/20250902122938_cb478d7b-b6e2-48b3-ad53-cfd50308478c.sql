-- First, clear existing posts and comments
DELETE FROM public.post_comments;
DELETE FROM public.community_posts;

-- Update existing profiles to have more realistic names
UPDATE public.profiles 
SET full_name = CASE id
  WHEN '550e8400-e29b-41d4-a716-446655440000' THEN 'Alex Chen'
  WHEN '69554ec4-228b-41dc-b6bc-98ea690bf166' THEN 'Sarah Martinez'
  ELSE full_name
END;

-- Insert additional realistic profiles for the existing user (we'll create variations)
INSERT INTO public.profiles (id, full_name) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Mike Johnson'),
('550e8400-e29b-41d4-a716-446655440002', 'Emma Rodriguez'),
('550e8400-e29b-41d4-a716-446655440003', 'David Kim'),
('550e8400-e29b-41d4-a716-446655440004', 'Lisa Thompson'),
('550e8400-e29b-41d4-a716-446655440005', 'Jason Park'),
('550e8400-e29b-41d4-a716-446655440006', 'Rachel White'),
('550e8400-e29b-41d4-a716-446655440007', 'Tom Wilson'),
('550e8400-e29b-41d4-a716-446655440008', 'Maya Patel')
ON CONFLICT (id) DO NOTHING;

-- Insert realistic, shorter community posts using the existing user ID
INSERT INTO public.community_posts (id, user_id, title, content, tags, upvotes, downvotes, comment_count) VALUES 
('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'Just hit $1k MRR with my SaaS!', 'Been working on a simple invoice generator for freelancers for 8 months. Finally crossed $1k MRR this week! 🎉

Started with just 3 features. Kept it super simple. Word of mouth has been everything.

Next goal: $5k by end of year. Anyone else building in the B2B space?', ARRAY['milestone', 'saas', 'mrr'], 47, 2, 12),

('22222222-2222-2222-2222-222222222222', '69554ec4-228b-41dc-b6bc-98ea690bf166', 'Failed my first startup. Lessons learned?', 'Spent 2 years building a social app that nobody used. Burned through $15k of savings.

Biggest mistakes:
- Built for 6 months without talking to users
- Tried to solve a problem I didn''t have
- Got obsessed with features nobody wanted

Back to the drawing board. This time starting with customer interviews first.', ARRAY['failure', 'lessons', 'startup'], 73, 5, 18),

('33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', 'Side hustle bringing in $500/month', 'Started selling Notion templates 4 months ago. Now making around $500/month.

What works:
- Twitter for discovery  
- Gumroad for sales
- Simple is better

Not life changing money but feels good to earn from something I built. Anyone else in the digital products space?', ARRAY['side-hustle', 'notion', 'passive-income'], 34, 1, 8),

('44444444-4444-4444-4444-444444444444', '69554ec4-228b-41dc-b6bc-98ea690bf166', 'Should I quit my job to go full-time?', 'My side project is making $2.3k/month consistently for last 3 months. Day job pays $75k.

Part of me wants to jump but scared about healthcare, steady income etc. 

For those who made the leap - any advice? What revenue threshold made you comfortable?', ARRAY['advice', 'full-time', 'career'], 89, 3, 24),

('55555555-5555-5555-5555-555555555555', '550e8400-e29b-41d4-a716-446655440000', 'Validation > Building', 'Wasted 6 months building a "revolutionary" productivity app. 

Turns out people are happy with Notion/Trello. Whoops.

Now I talk to 5 potential customers before writing any code. Game changer.', ARRAY['validation', 'mvp', 'customer-development'], 156, 8, 31),

('66666666-6666-6666-6666-666666666666', '69554ec4-228b-41dc-b6bc-98ea690bf166', 'Anyone else struggling with imposter syndrome?', 'Been coding for 2 years, just launched my first real project. 

Getting good feedback but I keep thinking "I have no idea what I''m doing" 😅

How do you push through self-doubt? Especially when comparing yourself to all these "successful" founders online?', ARRAY['mental-health', 'imposter-syndrome', 'motivation'], 124, 2, 43),

('77777777-7777-7777-7777-777777777777', '550e8400-e29b-41d4-a716-446655440000', 'Bootstrapped vs VC - my take', 'Tried raising money for 8 months. Got a few meetings but no term sheets.

Best thing that happened to me. Now bootstrapping and actually profitable at $4k MRR.

Sometimes the "easy" money isn''t worth the hassle. Anyone else choosing bootstrap over VC?', ARRAY['bootstrapped', 'vc', 'funding'], 92, 12, 19),

('88888888-8888-8888-8888-888888888888', '69554ec4-228b-41dc-b6bc-98ea690bf166', 'Pricing is hard', 'Launched at $9/month. Nobody paid.
Raised to $29/month. Still nothing.
Dropped to $19/month. Suddenly 50 signups.

Pricing psychology is weird. Still trying to figure out the sweet spot.', ARRAY['pricing', 'saas', 'conversion'], 67, 4, 15),

('99999999-9999-9999-9999-999999999999', '550e8400-e29b-41d4-a716-446655440000', 'Remote work changed everything', 'Used to think you needed to be in SF/NYC to build something big.

Working from my parents house in Ohio, just hit $10k MRR with my dev tool.

Location doesn''t matter anymore. Internet + skills = opportunity anywhere.', ARRAY['remote', 'location-independence', 'dev-tools'], 203, 7, 38),

('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '69554ec4-228b-41dc-b6bc-98ea690bf166', 'Marketing for introverts?', 'Built a solid product but terrible at self-promotion. Twitter feels like shouting into the void.

What marketing channels work for people who hate "marketing"?

Product Hunt helped a bit but looking for more sustainable growth strategies.', ARRAY['marketing', 'introvert', 'growth'], 85, 1, 22);