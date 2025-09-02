-- Add demo community posts from different users (let IDs auto-generate)
INSERT INTO community_posts (title, content, tags, user_id, upvotes, downvotes, comment_count, created_at, updated_at) VALUES
(
  'From Idea to $10K MRR in 6 Months: My SaaS Journey',
  'Hey fellow builders! 👋

Just hit a major milestone with my productivity SaaS - $10K MRR after 6 months of building in public. Here''s what I learned:

**The Idea:** Started as a personal pain point - managing freelance projects across multiple clients. Built a simple dashboard to track time, deadlines, and invoices.

**Key Decisions:**
- Launched with just 3 core features
- Priced at $29/month from day one (don''t undervalue!)
- Built a waiting list of 200 people before launch
- Used Twitter/LinkedIn for marketing (no ads)

**The Numbers:**
- Month 1: $500 MRR (17 customers)
- Month 3: $3.2K MRR (110 customers) 
- Month 6: $10.1K MRR (347 customers)
- Current churn: 3.2%

**Biggest Challenges:**
1. Feature creep - customers wanted everything
2. Scaling customer support 
3. Technical debt from MVP decisions

**What Worked:**
- Weekly updates on social media
- Exceptional customer support
- Simple, focused product
- Building relationships, not just features

Currently working on v2.0 with better integrations. Happy to answer any questions!

#SaaS #BuildInPublic #Startup',
  ARRAY['saas', 'buildinpublic', 'mrr', 'startup', 'productivity'],
  (SELECT id FROM profiles WHERE full_name = 'Maya Chen' LIMIT 1),
  23,
  2,
  8,
  now() - interval '2 days',
  now() - interval '2 days'
),
(
  'Bootstrapped to $50K ARR: The Unsexy Business That Works',
  'Everyone talks about sexy SaaS startups, but let me tell you about my "boring" business that hit $50K ARR this year.

**The Business:** B2B invoice processing automation for small accounting firms.

Sounds exciting, right? 😅

**Why This Works:**
- Huge pain point (manual data entry sucks)
- Willing to pay customers ($200-500/month)
- Low competition in this niche
- Sticky once implemented

**The Journey:**
Started 18 months ago after my accountant friend complained about spending 10+ hours/week on invoice data entry. Built a simple tool that:
- Extracts data from PDF invoices
- Categorizes expenses automatically  
- Integrates with QuickBooks/Xero
- Generates reports

**Current Stats:**
- 47 active customers
- $52K ARR
- 92% customer retention
- Just me + 1 part-time dev
- Profitable since month 8

**Key Lessons:**
1. Boring can be beautiful (and profitable)
2. Talk to customers constantly
3. Solve real problems, not imaginary ones
4. Focus on one thing and do it well

**What''s Next:**
Looking to hire our first full-time employee and expand to tax prep automation.

Remember: You don''t need to change the world to build a great business. Sometimes the best opportunities are hiding in plain sight.

Questions? Fire away! 🚀',
  ARRAY['bootstrapped', 'b2b', 'automation', 'accounting', 'profitability'],
  (SELECT id FROM profiles WHERE full_name = 'Carlos Rodriguez' LIMIT 1),
  31,
  0,
  12,
  now() - interval '4 days',
  now() - interval '4 days'
),
(
  'Failed Fast, Learned Faster: My 3 Startup Attempts in 2 Years',
  'They say failure is the best teacher. Here''s what I learned from 3 startup failures in 24 months:

**Attempt #1: AI-Powered Recipe App**
- Duration: 8 months
- Spent: $12K
- Failure reason: No market research, built for myself
- Lesson: Your problems ≠ everyone''s problems

**Attempt #2: Freelancer Marketplace**
- Duration: 6 months  
- Spent: $8K
- Failure reason: Chicken-and-egg problem, no differentiation
- Lesson: Marketplaces are HARD. Need unique angle.

**Attempt #3: Social Media Scheduler**
- Duration: 4 months
- Spent: $5K  
- Failure reason: Saturated market, came too late
- Lesson: Timing matters. Research competition first.

**What I Learned:**
1. **Validate EVERYTHING** - Don''t assume demand exists
2. **Start smaller** - MVP should be embarrassingly simple
3. **Talk to customers** - Build relationships before products
4. **Focus on distribution** - Great product + no users = failure
5. **Money talks** - If people won''t pay, pivot or quit

**Current Status:**
Taking 3 months to just... listen. Talking to potential customers in different industries. No coding, just conversations.

**Next Steps:**
Found a real problem in the veterinary industry (thanks to my dog''s expensive vet bills 😅). Building relationships first, then solutions.

**For Fellow Builders:**
- Don''t be afraid to fail fast
- Each failure teaches you something valuable
- The goal isn''t to avoid failure, it''s to fail cheaply
- Most "overnight successes" had multiple attempts

What''s your biggest startup lesson? Share below! 👇',
  ARRAY['failure', 'lessons', 'validation', 'market-research', 'pivot'],
  (SELECT id FROM profiles WHERE full_name = 'Priya Sharma' LIMIT 1),
  45,
  3,
  15,
  now() - interval '1 day',
  now() - interval '1 day'
),
(
  'Solo Founder Update: $25K MRR with Zero Employees',
  'Month 14 update on my solo SaaS journey. Still just me, still growing! 📈

**The Product:** 
Developer tool for API monitoring and debugging. Think "Postman meets DataDog" but simpler.

**This Month''s Numbers:**
- MRR: $25,847 (+$2,156 from last month)
- Customers: 892 (+67)
- Churn: 4.1% (slight uptick, investigating)
- Support tickets: 23 (down from 31)

**What''s Working:**
- Content marketing on dev Twitter
- Integration partnerships (Stripe, AWS, etc.)
- Product-led growth features
- Responsive customer support (I answer within 2 hours)

**Challenges This Month:**
- Scaling support (considering hiring soon)
- Feature requests vs. core product focus
- Pricing optimization (testing new tiers)
- Work-life balance (working 60+ hours/week)

**Big Wins:**
1. **Partnership with Vercel** - They''re featuring us in their marketplace
2. **New enterprise tier** - Already got 3 signups at $299/month
3. **Automated onboarding** - Reduced time-to-value by 40%

**Coming Up:**
- Hiring first employee (Customer Success)
- Mobile app (lots of requests)
- Advanced analytics dashboard
- API rate limiting features

**Solo Founder Reality Check:**
It''s lonely but rewarding. Some days I question everything, other days I feel unstoppable. The freedom is incredible, but so is the pressure.

**Revenue Breakdown:**
- Starter ($29): 623 customers = $18,067
- Pro ($79): 234 customers = $18,486  
- Enterprise ($299): 8 customers = $2,392

**Advice for Fellow Solo Founders:**
- Automate everything you can
- Don''t try to be everything to everyone
- Take breaks (seriously, burnout is real)
- Celebrate small wins

Questions about the journey? Happy to share more details! 🚀

#SoloFounder #SaaS #Bootstrapped',
  ARRAY['solo-founder', 'saas', 'bootstrapped', 'developer-tools', 'growth'],
  (SELECT id FROM profiles WHERE full_name = 'Jordan Park' LIMIT 1),
  38,
  1,
  19,
  now() - interval '3 hours',
  now() - interval '3 hours'
);