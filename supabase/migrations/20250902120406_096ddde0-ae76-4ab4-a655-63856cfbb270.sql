-- Insert credible sample posts for the community
-- First, let's create a sample user profile for the posts
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'community@creativestakeover.com',
  crypt('temppassword', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"full_name": "Community Admin"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Create profile for the community admin
INSERT INTO public.profiles (id, full_name, avatar_url, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Community Admin',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Insert credible entrepreneurial stories
INSERT INTO public.community_posts (
  id,
  user_id, 
  title, 
  content, 
  tags, 
  upvotes, 
  downvotes, 
  comment_count,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'From $0 to $50K MRR: How I Built a SaaS in My Spare Time',
  'After working as a software engineer at a Fortune 500 company for 5 years, I was burning out. I decided to scratch my own itch and build a tool that would help developers track their coding time across projects.

**The Problem**: As a freelancer on weekends, I struggled to accurately bill clients because I couldn''t track time spent on different features within the same project.

**The Solution**: I built TimeTracker Pro - a simple desktop app that integrates with popular IDEs and automatically categorizes coding time by file types, projects, and custom tags.

**Key Lessons Learned:**
1. **Start small**: My MVP was literally just a timer with project selection. No fancy UI, no integrations.
2. **Talk to users early**: I posted in r/freelance and got 50 beta testers in 2 days.
3. **Price confidently**: I initially priced at $5/month, but users kept asking for more features. Now it''s $29/month and conversion is higher.
4. **Automate everything**: Stripe for billing, GitHub Actions for deployment, Intercom for support.

**The Numbers:**
- Month 1: $200 MRR (beta users converting)
- Month 6: $12K MRR 
- Month 12: $35K MRR
- Month 18: $50K MRR (current)

**What I''d Do Differently:**
- Hire a designer sooner. Good UI/UX increased conversions by 40%.
- Set up analytics from day 1. I was flying blind for the first 6 months.
- Build an audience before building the product.

The biggest surprise? 60% of my customers aren''t freelancers - they''re in-house developers who want to optimize their productivity. Sometimes the market teaches you who your real customers are.

Happy to answer any questions about the technical stack, marketing, or the journey!',
  ARRAY['saas', 'bootstrapped', 'developer-tools', 'mrr', 'productivity'],
  234,
  12,
  47,
  now() - interval '2 days',
  now() - interval '2 days'
),
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'My $100K Product Launch Failed - Here''s What I Learned',
  'Two years ago, I quit my marketing job to launch "FitMeal" - a meal planning app with AI nutrition coaching. I had savings, a solid plan, and was convinced I''d found the next big thing. Spoiler alert: I was wrong.

**What I Built**: 
A mobile app that would create personalized meal plans based on fitness goals, dietary restrictions, and food preferences. Think MyFitnessPal meets personal trainer.

**The Mistakes:**
1. **Built in isolation**: Spent 8 months building without talking to potential customers.
2. **Over-engineered**: Added AI features that users didn''t care about while missing basic functionality.
3. **Wrong pricing model**: Charged $19.99/month when competitors were freemium.
4. **No marketing strategy**: Expected "if you build it, they will come."

**The Reality Check:**
- Launch day: 12 downloads
- Week 1: 34 downloads, 2 paid users
- Month 1: 156 downloads, 8 paid users
- Month 3: Shut down

**The Brutal Truth:**
People didn''t need another meal planning app. The market was saturated with free alternatives. My "AI coaching" was just keyword matching that users could easily spot.

**What I Learned:**
1. **Validate early and often**: I should have tested the concept with landing pages and surveys before writing a single line of code.
2. **Competition isn''t always bad**: I avoided looking at competitors, thinking it would "taint my vision." Big mistake.
3. **Freemium works**: The successful apps in this space all started free with premium features.
4. **Marketing = Product**: No one will find your app without a go-to-market strategy.

**The Silver Lining:**
The failure led me to my current successful business. I now run a marketing consultancy helping other app developers avoid my mistakes. We''re at $30K MRR after 14 months.

**Key Takeaway**: Failure is expensive education, but only if you actually learn from it.

Anyone else have similar stories? Would love to hear how you bounced back from product failures.',
  ARRAY['failure', 'lessons-learned', 'mobile-app', 'validation', 'pivot'],
  187,
  8,
  31,
  now() - interval '5 days',
  now() - interval '5 days'
),
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'Bootstrapped to $1M ARR Without Venture Capital: The Unsexy Truth',
  'Everyone talks about unicorns and VC funding, but 99% of successful businesses are boring, profitable, and bootstrapped. Here''s how I built a "unsexy" B2B software company to 7 figures.

**The Business**: 
InvoiceFlow - automated invoicing and payment processing for small service businesses (plumbers, electricians, contractors, etc.).

**Why This Market?**
- These businesses hate dealing with invoices
- They lose money on late payments
- Existing solutions were either too complex or too expensive
- Word-of-mouth marketing works incredibly well in these industries

**The Journey:**
- Year 1: $50K ARR (100 customers)
- Year 2: $250K ARR (500 customers) 
- Year 3: $600K ARR (1,200 customers)
- Year 4: $1.1M ARR (2,200 customers)

**Key Success Factors:**
1. **Niche Focus**: Instead of competing with QuickBooks, I focused exclusively on field service businesses.
2. **Simple Pricing**: $49/month, no tiers, no complicated feature matrix.
3. **Customer Success**: 92% retention rate because I obsess over customer success.
4. **Referral Program**: 40% of new customers come from referrals.

**What Made the Difference:**
- **Industry Events**: I attended every trade show for contractors. Boring? Yes. Effective? Absolutely.
- **Content Marketing**: I write about business problems these contractors face, not just software features.
- **Phone Support**: While competitors moved to chat-only, I kept human phone support.

**The Unsexy Reality:**
- No viral growth or hockey stick metrics
- Customer acquisition is slow but steady
- Growth rate is predictable (15-20% year over year)
- It''s a business, not a rocket ship

**Challenges:**
- Slow sales cycles (3-6 months)
- High touch onboarding required
- Credit card failures and payment issues
- Seasonal fluctuations in some markets

**Financial Breakdown (Year 4):**
- Revenue: $1.1M
- Cost of Goods Sold: $200K (hosting, payment processing, etc.)
- Marketing: $150K
- Development: $300K (2 full-time developers)
- Operations: $180K (support, admin)
- Profit: $270K

Not Silicon Valley money, but enough for financial freedom and a good life.

**Advice for Fellow Bootstrappers:**
1. Find a problem people will pay to solve
2. Start with a narrow niche
3. Charge from day one
4. Focus on retention over acquisition
5. Build systems for everything

The glamorous startup stories get all the attention, but there''s real opportunity in solving boring problems for businesses that actually have money to spend.

What "unsexy" business ideas are you considering?',
  ARRAY['bootstrapped', 'b2b', 'profitability', 'arr', 'niche'],
  312,
  18,
  68,
  now() - interval '1 week',
  now() - interval '1 week'
),
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'Sold My Side Project for $150K After 18 Months',
  'Last month I sold PasswordVault, a browser extension I built in my spare time, for $150K. Here''s the complete story and breakdown.

**The Origin Story:**
I was frustrated with existing password managers being too complex for my non-tech family members. My mom was still using the same password for everything, despite my many lectures about security.

**The Product:**
A dead-simple browser extension that:
- Generates strong passwords
- Stores them locally (no cloud sync complexity)
- One-click login for saved sites
- Works offline
- No subscription fees

**The Build:**
- 2 months to MVP (evenings and weekends)
- Built with vanilla JavaScript (keep it simple)
- Chrome Web Store launch: September 2022
- Total development time: ~200 hours

**Growth Timeline:**
- Month 1: 500 users
- Month 3: 2,500 users  
- Month 6: 8,000 users
- Month 12: 25,000 users
- Month 18: 45,000 users (at sale)

**Revenue Model:**
- Free extension with optional $9.99 "Pro" features
- Pro features: backup/restore, password strength analysis, dark mode
- Conversion rate: ~8% of users upgrade to Pro
- Peak monthly revenue: $3,200

**Marketing That Worked:**
1. **Reddit**: Posted in r/privacy and r/security. Got 10K downloads from one post.
2. **Product Hunt**: Launched and hit #3 product of the day.
3. **Word of mouth**: Simple products get shared more.
4. **Chrome Web Store optimization**: Good screenshots and description matter.

**Why I Sold:**
- Increasing complexity of browser security requirements
- Chrome Web Store policy changes were constant stress
- Wanted to focus on my main business
- Good exit multiple (3.5x annual revenue)

**The Sale Process:**
- Listed on MicroAcquire and Flippa
- Got 8 serious inquiries
- Buyer was a small software company looking to expand their security offerings
- Due diligence took 3 weeks
- Used an escrow service for the transaction

**Key Lessons:**
1. **Simple wins**: The simpler the product, the easier it is to market and support.
2. **Solve your own problem**: The best products come from personal frustration.
3. **Distribution matters**: Chrome Web Store was perfect distribution for this product.
4. **Know when to exit**: Don''t get emotionally attached to projects.

**What I''d Do Differently:**
- Start charging sooner (was free for first 6 months)
- Build email list from day one
- Create content around password security earlier

**Post-Sale:**
The buyer has grown it to 65K+ users and added team features. Sometimes the right buyer can take your project further than you could alone.

Currently working on a new project in the productivity space. The side project game continues!

Anyone else sold their side projects? What was your experience?',
  ARRAY['side-project', 'acquisition', 'browser-extension', 'exit', 'security'],
  156,
  5,
  29,
  now() - interval '10 days',
  now() - interval '10 days'
),
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'The $5K Marketing Experiment That Changed Everything',
  'Six months ago, my SaaS was stuck at $8K MRR with barely any growth. I decided to spend my last $5K on a marketing experiment that I was sure would fail. It didn''t.

**The Context:**
My project management tool for creative agencies was decent but invisible. I''d tried:
- Content marketing (6 months, minimal results)
- Google Ads (burned through $3K, terrible ROI)
- Social media (crickets)
- Cold email (10% open rate, 0% conversion)

I was ready to shut down and go back to freelancing.

**The Hail Mary Experiment:**
Instead of trying to compete with Asana and Monday.com on features, I decided to become THE solution for one specific problem: managing client revisions in creative projects.

**The $5K Spend:**
- $2K: Hired a freelance designer to create 10 beautiful case study videos
- $1.5K: Sponsored posts in 5 niche Facebook groups for creative agencies  
- $1K: LinkedIn ads targeting creative directors at agencies
- $500: A small booth at a local creative industry meetup

**The Videos:**
Each 2-minute case study showed:
- A real agency''s revision nightmare (before)
- How they solved it with my tool (after)  
- Actual results (time saved, client satisfaction)

**The Results (First 30 days):**
- Website traffic: +400%
- Demo requests: +800%
- Trial conversions: +250%
- MRR growth: $8K → $14K

**What Made It Work:**
1. **Hyper-specific positioning**: "Revision management" vs. "project management"
2. **Social proof in context**: Real agencies, real problems, real solutions
3. **Right channels**: Creative directors actually hang out in those Facebook groups
4. **Perfect timing**: Posted videos when people were most frustrated (Monday mornings)

**6 Months Later:**
- MRR: $31K (nearly 4x growth)
- Team: Hired 2 part-time developers
- Positioning: Known as "the revision tool" in creative circles
- Waitlist: 200+ agencies wanting onboarding

**The Mindset Shift:**
I stopped trying to be everything to everyone and became something specific to someone. The narrower I went, the faster I grew.

**Unexpected Benefits:**
- Word-of-mouth referrals increased 300%
- Customer support became easier (everyone has similar use cases)
- Product development became clearer (I know exactly what to build)
- Pricing power increased (specific solutions command premium prices)

**What I''d Tell My Past Self:**
"Stop being afraid of being too niche. The riches are in the niches, and your $5K hail mary will become your biggest growth lever."

**The Takeaway:**
Sometimes the breakthrough isn''t about doing more marketing. It''s about doing the right marketing to the right people with the right message.

Currently planning the next $5K experiment to hit $50K MRR. The game continues!

What marketing experiments have worked (or failed spectacularly) for you?',
  ARRAY['marketing', 'positioning', 'saas-growth', 'niche', 'case-studies'],
  203,
  9,
  35,
  now() - interval '3 days',
  now() - interval '3 days'
);

-- Add some realistic comments to make the community feel active
INSERT INTO public.post_comments (
  id,
  post_id,
  user_id,
  content,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  (SELECT id FROM public.community_posts WHERE title LIKE 'From $0 to $50K MRR%' LIMIT 1),
  '550e8400-e29b-41d4-a716-446655440000',
  'This is incredibly inspiring! I''m currently at the $200 MRR stage with my own developer tool. The pricing lesson really resonates - I''ve been undervaluing my product. Did you find resistance when you increased from $5 to $29?',
  now() - interval '1 day',
  now() - interval '1 day'
),
(
  gen_random_uuid(),
  (SELECT id FROM public.community_posts WHERE title LIKE 'My $100K Product Launch Failed%' LIMIT 1),
  '550e8400-e29b-41d4-a716-446655440000',
  'Thank you for sharing this. I''m 6 months into building my fitness app and this post made me realize I haven''t talked to a single potential customer yet. Pivoting to validation mode immediately!',
  now() - interval '2 days',
  now() - interval '2 days'
),
(
  gen_random_uuid(),
  (SELECT id FROM public.community_posts WHERE title LIKE 'Bootstrapped to $1M ARR%' LIMIT 1),
  '550e8400-e29b-41d4-a716-446655440000',
  'Love seeing bootstrapped success stories! The trade show strategy is brilliant. Most SaaS founders ignore offline marketing but it sounds like that''s where you found your competitive advantage.',
  now() - interval '5 days',
  now() - interval '5 days'
);