-- Delete old posts and create more varied, human-like posts
DELETE FROM community_posts WHERE user_id IN (
  SELECT id FROM profiles WHERE full_name IN ('Maya Chen', 'Carlos Rodriguez', 'Priya Sharma', 'Jordan Park')
);

-- Add varied, human-like posts with different writing styles and personalities
INSERT INTO community_posts (title, content, tags, user_id, upvotes, downvotes, comment_count, created_at, updated_at) VALUES
-- Maya Chen's post - casual and excited about her SaaS
(
  'OMG just hit $10K MRR!! 🚀✨',
  'guys I''m literally shaking rn... my little productivity app just crossed $10K MRR!!!

Started this whole thing because I was drowning in freelance chaos - tracking time, chasing invoices, missing deadlines. So I built a simple dashboard for myself.

Fast forward 6 months and here we are! 347 customers paying $29/month 💰

Some things that worked:
- Launched super minimal (like embarrassingly basic lol)
- Didn''t spend a dime on ads, just tweeted my journey
- Actually talked to customers instead of guessing what they wanted

Biggest rookie mistakes:
- Almost killed myself with feature requests 
- Spent 3 weeks on a feature literally 2 people asked for 🤦‍♀️
- Underpriced at first ($9/month... yikes)

Working on v2 now with Slack integration which everyone keeps asking for. Still can''t believe this is real tbh

Happy to answer any questions! Or just celebrate with me because I''m too excited to work today 😅

#buildinpublic #saas #founder',
  ARRAY['saas', 'buildinpublic', 'mrr', 'productivity', 'founder'],
  (SELECT id FROM profiles WHERE full_name = 'Maya Chen' LIMIT 1),
  42,
  1,
  18,
  now() - interval '2 days 3 hours',
  now() - interval '2 days 3 hours'
),

-- Carlos Rodriguez's post - more formal business analysis
(
  'Why "Boring" Businesses Win: $52K ARR Case Study',
  'After 18 months building what most would consider an "unsexy" business, I want to share why boring can be beautiful.

**The Problem:** Small accounting firms spending 10+ hours/week manually entering invoice data. My accountant friend was literally paying someone $15/hour to type numbers from PDFs into QuickBooks.

**The Solution:** Built a simple automation tool that:
- Extracts data from PDF invoices using OCR
- Auto-categorizes expenses with 94% accuracy  
- Integrates directly with QB/Xero
- Generates monthly reports

**The Numbers (18 months in):**
- 47 active customers
- $52K ARR ($4.3K monthly)
- Average deal size: $1,200/year
- Customer retention: 92%
- Team: Just me + 1 part-time developer

**Key Insights:**

1. **Niche markets pay premium prices** - These firms gladly pay $200-500/month because we save them thousands in labor costs

2. **Less competition = easier growth** - While everyone builds another SaaS for marketers, B2B verticals are underserved

3. **Customer development is everything** - Spent 3 months just talking to accountants before writing a line of code

4. **Distribution through relationships** - 80% of customers came through referrals from existing clients

**What''s Next:**
Expanding into tax prep automation. The same firms that need invoice processing also struggle with tax document organization.

For anyone considering B2B: find a specific group of people doing repetitive, expensive work. Build something that eliminates that work. Charge accordingly.

Questions welcome.',
  ARRAY['b2b', 'automation', 'bootstrapped', 'case-study', 'vertical-saas'],
  (SELECT id FROM profiles WHERE full_name = 'Carlos Rodriguez' LIMIT 1),
  67,
  3,
  24,
  now() - interval '4 days 1 hour',
  now() - interval '4 days 1 hour'
),

-- Priya Sharma's vulnerable post about failures
(
  'My 3 startup failures taught me everything about success',
  'Real talk: I failed 3 times before finding something that works.

**Failure #1: "IntelliChef" AI Recipe App**
- 8 months, $12K burned
- Beautiful UI, smart recommendations, meal planning
- Problem: I built for myself, not a market
- Downloaded by friends/family, used for 2 weeks max
- Lesson: Your problems ≠ universal problems

**Failure #2: "SkillBridge" Freelancer Platform** 
- 6 months, $8K down the drain
- "Uber for freelancers" (yes, I was that naive)
- Couldn''t solve chicken-egg problem
- Fiverr/Upwork already owned the space
- Lesson: Entering crowded markets without unique value = death

**Failure #3: "PostMaster" Social Media Scheduler**
- 4 months, $5K wasted  
- Decent product, good features
- Came 5 years too late (Buffer, Hootsuite dominated)
- Lesson: Timing matters more than features

**What changed everything:**
Taking 3 months to just... listen. No coding. Just conversations.

Talked to 50+ business owners across different industries. Found that veterinarians struggle with appointment scheduling more than any other profession (thanks to my dog''s expensive surgery bills for the insight 😅).

**Current status:**
- VetSchedule Pro: 8 weeks in development
- 12 vet clinics signed up for beta
- $180/month price point validated
- Pre-orders: $3,800

**Key learnings:**
1. Fail fast, but fail deliberately  
2. Validate demand before building anything
3. Pick industries you can access easily
4. One real customer > 100 theoretical ones

Anyone else been through startup hell? What broke you before it made you?',
  ARRAY['failure', 'lessons', 'validation', 'startup-journey', 'perseverance'],
  (SELECT id FROM profiles WHERE full_name = 'Priya Sharma' LIMIT 1),
  89,
  2,
  31,
  now() - interval '6 hours 20 minutes',
  now() - interval '6 hours 20 minutes'
),

-- Jordan Park's detailed monthly update
(
  'Month 14 Solo Founder Update: $25.8K MRR',
  '**TL;DR: Still growing, still solo, still slightly insane** 📊

Another month in the books building DevWatch (API monitoring for developers). Here''s the raw data:

**💰 Revenue:**
- MRR: $25,847 (+8.9% MoM)
- New customers: 67
- Churned: 19 (4.1% churn - need to investigate)
- Current customers: 892

**📈 Breakdown by plan:**
- Starter ($29): 623 customers = $18,067
- Pro ($79): 234 customers = $18,486
- Enterprise ($299): 8 customers = $2,392
- (Yes, Enterprise is killing it lately)

**🎯 What''s working:**
- Content marketing on dev Twitter (15K followers now!)
- Integration partnerships (Vercel featuring us = 🔥)
- Product-led onboarding (40% faster time-to-value)
- Support response time: <2 hours (I''m obsessive about this)

**😤 Pain points:**
- Working 65+ hour weeks (not sustainable)
- Feature requests vs core product tension
- Enterprise sales taking too much time
- Need to hire but scared to lose agility

**🚀 This month''s wins:**
1. Vercel marketplace partnership went live
2. New enterprise tier converting at 12%
3. Automated 70% of customer onboarding
4. API rate limiting shipped (huge customer request)

**🎪 Reality check:**
Solo founding is a roller coaster. Tuesday I felt unstoppable. Thursday I questioned everything. Friday I remembered why I love this.

The freedom is incredible but the pressure never stops. Every decision is mine. Every bug is my fault. Every success feels earned.

**📋 Next month goals:**
- Hit $28K MRR
- Ship mobile dashboard (finally!)
- Hire Customer Success contractor
- Fix whatever''s causing the churn spike

**🤝 For fellow solo founders:**
- Automate ruthlessly
- Say no to 90% of feature requests
- Sleep is not optional (learned this hard way)
- Celebrate the small wins

Questions? Advice? Want to commiserate about the solo founder life? Drop a comment!

*PS: If you''re a developer dealing with API nightmares, I''d love to show you DevWatch. DM me for a demo.*',
  ARRAY['solo-founder', 'saas', 'developer-tools', 'monthly-update', 'transparency'],
  (SELECT id FROM profiles WHERE full_name = 'Jordan Park' LIMIT 1),
  156,
  4,
  43,
  now() - interval '15 minutes',
  now() - interval '15 minutes'
);