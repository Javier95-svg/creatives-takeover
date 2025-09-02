-- Insert sample admin user profile for community posts (only if not exists)
INSERT INTO profiles (id, full_name, avatar_url) 
SELECT '550e8400-e29b-41d4-a716-446655440000', 'Sarah Chen', '/lovable-uploads/2ae69f5c-24f2-4a91-ae89-df8696970fd3.png'
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = '550e8400-e29b-41d4-a716-446655440000');

-- Delete any existing test posts to avoid conflicts
DELETE FROM post_comments WHERE post_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

DELETE FROM community_posts WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

-- Insert credible community posts with realistic entrepreneurial stories
INSERT INTO community_posts (id, user_id, title, content, tags, upvotes, downvotes, comment_count, created_at, ai_summary, ai_insights, ai_related_topics, ai_trending_angle, ai_next_step) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  '550e8400-e29b-41d4-a716-446655440000',
  'From $0 to $50K MRR in 18 months - My SaaS Journey',
  'Started building a project management tool for freelancers after struggling with existing solutions. Here''s what worked:

• Validated the problem by talking to 100+ freelancers before writing any code
• Built an MVP in 3 months using no-code tools (Bubble + Zapier)
• Got first 10 paying customers through direct outreach on LinkedIn
• Focused on one core feature: time tracking with automatic invoicing
• Raised prices 4x over 12 months (from $9 to $39/month)
• Now at $47K MRR with 1,200+ active users

Key lessons: Start simple, talk to customers constantly, and don''t be afraid to charge what you''re worth.',
  ARRAY['saas', 'bootstrapped', 'validation', 'pricing'],
  156,
  3,
  5,
  NOW() - INTERVAL '2 days',
  'Bootstrapped SaaS grew from $0 to $50K MRR in 18 months through customer validation, simple MVP, and strategic pricing increases.',
  ARRAY['Customer validation before building', 'MVP-first approach', 'Direct outreach for early customers', 'Progressive pricing strategy'],
  ARRAY['mvp development', 'customer discovery', 'pricing strategy', 'freelancer tools'],
  'Bootstrapped SaaS success story with clear metrics and actionable advice',
  'Document the detailed customer acquisition strategy and create a case study'
),
(
  '22222222-2222-2222-2222-222222222222',
  '550e8400-e29b-41d4-a716-446655440000',
  'We raised $2M then nearly died - Here''s what went wrong',
  'Raised a Series A for our fintech startup, then almost shut down 8 months later. Painful lessons learned:

The money made us lazy. We stopped talking to customers and started building features nobody wanted. Burned through $1.5M on a team of 15 people working on the wrong things.

Wake-up call: Only 12% of users were active after 30 days. We had to lay off 60% of the team and go back to basics.

What saved us:
• Cut features from 47 to 3 core ones
• Spent 3 months doing customer interviews
• Rebuilt the product based on actual user needs
• Focused on retention over acquisition

We''re now profitable with a lean team of 6. Sometimes the best thing that can happen is almost failing.',
  ARRAY['fundraising', 'failure', 'pivot', 'lessons'],
  298,
  12,
  3,
  NOW() - INTERVAL '5 days',
  'Fintech startup raised $2M but nearly failed due to losing customer focus, then recovered by cutting features and focusing on user needs.',
  ARRAY['Fundraising can create false confidence', 'Customer feedback is critical post-funding', 'Feature bloat kills products', 'Small teams can be more effective'],
  ARRAY['fundraising mistakes', 'product-market fit', 'team building', 'startup failure'],
  'Cautionary tale about post-funding challenges with recovery strategy',
  'Create a framework for maintaining customer focus after fundraising'
),
(
  '33333333-3333-3333-3333-333333333333',
  '550e8400-e29b-41d4-a716-446655440000',
  'Sold my side project for $180K after 3 years',
  'Built a simple Chrome extension that helps developers find color palettes. Started as a weekend project, ended up changing my life.

Timeline:
Year 1: 50 users, $0 revenue (didn''t even think about monetization)
Year 2: 5,000 users, launched Pro version at $5/month, made $2K total
Year 3: 25,000 users, $4K MRR, got acquisition offer

The buyer was a design tools company looking to expand their developer offerings. Due diligence took 2 months, but the process was smooth.

What made it valuable:
• Consistent user growth (20% month-over-month for 18 months)
• High user engagement (60% weekly active users)
• Recurring revenue model
• Clean, well-documented codebase

Used the money to go full-time on my next project. Sometimes the smallest ideas have the biggest impact.',
  ARRAY['acquisition', 'chrome-extension', 'side-project', 'bootstrap'],
  187,
  5,
  2,
  NOW() - INTERVAL '1 week',
  'Developer sold Chrome extension side project for $180K after 3 years of organic growth and consistent user engagement.',
  ARRAY['Side projects can become valuable assets', 'User engagement more important than user count', 'Recurring revenue increases valuation', 'Clean code matters for acquisitions'],
  ARRAY['browser extensions', 'acquisition process', 'valuation factors', 'developer tools'],
  'Inspiring side project success story with clear progression metrics',
  'Break down the acquisition process and valuation methodology'
),
(
  '44444444-4444-4444-4444-444444444444',
  '550e8400-e29b-41d4-a716-446655440000',
  'Made $67K in 48 hours with a simple landing page',
  'Launched a digital course about building GPT wrappers. No ads, no influencer marketing, just a well-crafted landing page and strategic launch.

Pre-launch (2 weeks):
• Built email list of 1,200 developers through free resources
• Created anticipation with "behind the scenes" content
• Price anchored at $497 (ended up charging $97)

Launch day:
• Sent personal email to my list at 6 AM
• Posted on 5 relevant communities (not spam, added real value)
• Did a live demo on Twitter Spaces
• 692 sales in first 48 hours

Key factors:
• Solved a real, urgent problem (everyone wanted to build AI tools)
• Social proof from beta students
• Limited-time pricing created urgency
• Personal brand built over 2 years made people trust me

The course now makes $15K/month on autopilot. Sometimes you don''t need complicated funnels, just a great product and genuine relationships.',
  ARRAY['course-launch', 'marketing', 'ai-tools', 'personal-brand'],
  234,
  8,
  2,
  NOW() - INTERVAL '3 days',
  'Developer made $67K in 48 hours launching AI course through strategic pre-launch, email marketing, and community engagement.',
  ARRAY['Email list building is crucial for launches', 'Personal brand amplifies product launches', 'Urgency and scarcity drive conversions', 'Community engagement beats paid ads'],
  ARRAY['course creation', 'email marketing', 'product launches', 'ai education'],
  'Impressive course launch with clear pre-launch strategy and execution',
  'Document the complete launch sequence and email templates used'
),
(
  '55555555-5555-5555-5555-555555555555',
  '550e8400-e29b-41d4-a716-446655440000',
  'A/B tested our pricing page - 47% increase in conversions',
  'Our SaaS was struggling with conversions. 5,000+ visitors/month but only 1.2% converting to paid plans. Spent 6 weeks testing everything.

What we tested:
• Price positioning (3 vs 4 tiers)
• Annual vs monthly emphasis  
• Feature descriptions (benefits vs features)
• Social proof placement
• CTA button copy and colors

Winning changes:
✅ Removed the cheapest tier (focused attention on middle option)
✅ Led with annual pricing (33% chose annual vs 8% before)
✅ Added calculator showing ROI instead of listing features
✅ Moved testimonials above pricing (not below)
✅ Changed CTA from "Start Free Trial" to "Get Started Free"

Results: 1.2% → 1.76% conversion rate
Monthly impact: +$23K ARR

The biggest lesson: Small copy changes matter more than design. Test one thing at a time. And always measure business metrics, not just click-through rates.',
  ARRAY['conversion-optimization', 'pricing', 'ab-testing', 'saas'],
  167,
  4,
  1,
  NOW() - INTERVAL '4 days',
  'SaaS company increased pricing page conversions by 47% through systematic A/B testing of pricing structure, copy, and positioning.',
  ARRAY['Fewer pricing tiers can improve conversions', 'Annual pricing should be emphasized', 'ROI calculators outperform feature lists', 'CTA copy significantly impacts conversions'],
  ARRAY['conversion rate optimization', 'pricing psychology', 'user experience', 'revenue optimization'],
  'Data-driven pricing optimization with measurable business impact',
  'Create a systematic framework for pricing page optimization'
);

-- Insert some realistic comments for the posts
INSERT INTO post_comments (id, post_id, user_id, content, upvotes, downvotes, created_at) VALUES 
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'This is exactly what I needed to read. Currently at the validation stage with my own project. Did you use any specific framework for customer interviews?', 12, 0, NOW() - INTERVAL '1 day'),
('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'Love the pricing progression story. Too many founders are afraid to raise prices. Bookmarking this for reference!', 8, 0, NOW() - INTERVAL '18 hours'),
('c3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'Great insights on customer validation. The LinkedIn outreach approach is interesting - did you get many responses?', 5, 0, NOW() - INTERVAL '12 hours'),
('c4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'MVP approach with no-code is smart. Proves the concept before investing in custom development.', 7, 0, NOW() - INTERVAL '6 hours'),
('c5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'The pricing evolution from $9 to $39 is a great case study. Did you see churn when you increased prices?', 9, 0, NOW() - INTERVAL '3 hours'),
('c6666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'Brutal but honest. We raised seed funding last year and I see some of these patterns emerging. Thanks for the wake-up call.', 15, 0, NOW() - INTERVAL '4 days'),
('c7777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'The 12% retention rate is a harsh reality check. How did you identify which features to cut vs keep?', 11, 0, NOW() - INTERVAL '3 days'),
('c8888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'Going from 15 to 6 people and becoming profitable is incredible. Team size vs productivity is so misunderstood.', 13, 0, NOW() - INTERVAL '2 days'),
('c9999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', 'Congrats on the exit! Did you approach them or did they find you? Always wondering how these conversations start.', 6, 0, NOW() - INTERVAL '5 days'),
('ca111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', 'Chrome extensions are such an underrated business model. 60% weekly active users is amazing engagement.', 8, 0, NOW() - INTERVAL '4 days'),
('cb222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', '550e8400-e29b-41d4-a716-446655440000', '$67K in 48 hours is insane! The pre-launch strategy is gold. How long did it take you to build that initial email list?', 9, 1, NOW() - INTERVAL '2 days'),
('cc333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '550e8400-e29b-41d4-a716-446655440000', 'Twitter Spaces for demos is brilliant. Personal touch at scale. Going to try this for my next launch.', 7, 0, NOW() - INTERVAL '1 day'),
('cd444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', '550e8400-e29b-41d4-a716-446655440000', 'The ROI calculator insight is huge. Features tell, benefits sell, but ROI closes. Thanks for sharing the specific changes!', 10, 0, NOW() - INTERVAL '3 days');