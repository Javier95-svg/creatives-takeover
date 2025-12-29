/**
 * Comprehensive 10-question assessment data with stage-specific visibility
 * Questions ordered by logical narrative flow: why → what → proof → scale → readiness
 */

import { Lightbulb, Rocket, TrendingUp, Target, Swords, Users as UsersIcon, DollarSign, Calculator, Scale, Network } from "lucide-react";
import { AssessmentQuestion } from "@/types/fundraisingAssessment";

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // QUESTION 1: Founder-Market Fit (NEW)
  {
    id: "founder_market_fit",
    title: "Founder-Market Fit",
    description: "Why are YOU uniquely positioned to solve this problem?",
    helpText: `Investors bet on people as much as ideas. Founder-market fit means you have a unique advantage - something that makes you the RIGHT person to build this business.

Why this matters:
Investors ask: "Why should this founder succeed where others might fail?" Your unique insights, experiences, or connections can make the difference between success and failure.

What counts as strong founder-market fit:
• You've personally experienced the problem you're solving
• You have deep domain expertise (worked in this industry for years)
• You have unique access to customers or distribution channels
• You've built similar businesses before and learned from them
• You have specialized technical skills that are rare

Scoring guide:
- 0-3: Generic idea, no special advantage
- 4-6: Some relevant experience or passion
- 7-8: Strong domain expertise or lived experience with the problem
- 9-10: Exceptional advantage - you're clearly the best person to build this

Examples:
- An Uber driver who builds driver scheduling software (lived experience) = 8-9
- A nurse building healthcare software (domain expertise) = 7-8
- Someone who "just thinks it's a cool idea" (no unique fit) = 2-3

Remember: Investors want to know your origin story. What makes YOU the person to solve this problem? Be honest about your advantages.`,
    icon: <Lightbulb className="h-5 w-5" />,
    order: 1,
    visibility: {
      ideation: 'required',
      validation: 'required',
      building: 'required',
      launching: 'required',
      scaling: 'required'
    }
  },

  // QUESTION 2: MVP Complete (EXISTING - moved to position 2)
  {
    id: "mvp",
    title: "MVP Complete",
    description: "Do you have a working version of your product that solves a real problem?",
    helpText: `An MVP (Minimum Viable Product) is the simplest version of your product that still solves a real problem for customers. You don't need all features - just enough to demonstrate value.

What counts as an MVP:
• A working prototype you can show to people (even if it's basic)
• Something that solves at least one core problem
• Can be a website, app, physical product, or service
• Doesn't need to be perfect or polished

Examples:
- A simple landing page that collects emails (0-3)
- A basic prototype with core features working (4-6)
- A functional product with real users testing it (7-8)
- A polished product with multiple features and user feedback incorporated (9-10)

Remember: Investors care more about whether you've validated the problem than whether your product is perfect. A working MVP that people actually use is better than a perfect product nobody wants.`,
    icon: <Rocket className="h-5 w-5" />,
    order: 2,
    visibility: {
      ideation: 'required',
      validation: 'required',
      building: 'required',
      launching: 'required',
      scaling: 'required'
    }
  },

  // QUESTION 3: Traction & Metrics (NEW)
  {
    id: "traction",
    title: "Traction & Metrics",
    description: "Do you have measurable traction that proves people want this?",
    helpText: `Traction means you have concrete evidence that people want your product - not just opinions, but actual numbers you can point to.

What counts as traction:
• Users: Active users, signups, returning customers
• Revenue: Money people have actually paid you
• Engagement: People actively using your product (DAU, MAU, usage time)
• Waitlist: People signed up waiting for your product
• Letters of intent: Companies committed to buying once you launch

Why this matters:
Investors want proof that your idea works in the real world, not just in theory. Traction reduces risk - it shows the market actually wants what you're building.

Scoring guide:
- 0-3: No measurable traction yet (just starting customer conversations)
- 4-6: Early traction (10-50 users, or $500-5k revenue, or strong waitlist)
- 7-8: Clear traction (100+ users, $10k+ revenue, or viral growth)
- 9-10: Strong traction (1000+ users, $50k+ revenue, or proven unit economics)

Examples:
- 500 email signups from landing page = 5-6
- 50 paying customers with $10k MRR = 7-8
- 5,000 active users with 40% retention = 8-9

Note for ideation stage: It's okay to score low here if you're early. Focus on getting those first users.

Remember: Investors want to see the trend line going up. Even small numbers growing quickly are impressive.`,
    icon: <TrendingUp className="h-5 w-5" />,
    order: 3,
    visibility: {
      ideation: 'optional',
      validation: 'required',
      building: 'required',
      launching: 'required',
      scaling: 'required'
    }
  },

  // QUESTION 4: Customer Feedback (EXISTING - moved to position 4)
  {
    id: "feedback",
    title: "Initial Customer Feedback",
    description: "Have you talked to potential customers and received feedback?",
    helpText: `Customer feedback means you've actually talked to people who might use your product and listened to what they say. This is crucial because it proves people actually want what you're building.

How to get customer feedback:
• Talk to 10-20 potential customers (people who have the problem you're solving)
• Ask open-ended questions: "What's your biggest challenge with [problem]?"
• Show them your product (even if it's just a sketch) and ask what they think
• Listen more than you talk - let them tell you what they need

What good feedback looks like:
- People say they'd use your product (0-3: No conversations yet)
- You've talked to 5-10 people and heard common themes (4-6: Getting started)
- You've talked to 15+ people and made changes based on their feedback (7-8: Strong validation)
- You have documented feedback, testimonials, and people actively using your product (9-10: Excellent validation)

Key questions to ask:
• "Would you pay for this?" (validates willingness to pay)
• "What's missing?" (identifies gaps)
• "Who else has this problem?" (finds your market)

Remember: Even negative feedback is valuable - it tells you what to fix before you waste time building the wrong thing.`,
    icon: <Target className="h-5 w-5" />,
    order: 4,
    visibility: {
      ideation: 'required',
      validation: 'required',
      building: 'required',
      launching: 'required',
      scaling: 'required'
    }
  },

  // QUESTION 5: Competitive Positioning (NEW)
  {
    id: "competitive_positioning",
    title: "Competitive Positioning",
    description: "What makes you different from competitors or alternatives?",
    helpText: `Every investor will ask: "Why you vs the competition?" You need a clear answer that shows you understand your market and have a defensible advantage.

Understanding your competition:
Your competition isn't just other startups - it's ANYTHING people do today to solve this problem:
• Direct competitors: Companies building the same thing
• Indirect competitors: Different solutions to the same problem
• Substitutes: What people do TODAY without any product

What makes good competitive positioning:
• You have a unique approach or technology
• You serve a specific niche better than anyone
• You have a distribution advantage (unique access to customers)
• You move faster than big companies
• You have proprietary data or insights

Scoring guide:
- 0-3: Haven't researched competitors, or no clear differentiation
- 4-6: Know your competitors, have some differentiation
- 7-8: Clear competitive advantage, can articulate why you'll win
- 9-10: Defensible moat (network effects, data, brand, or technology others can't copy)

Examples:
- "We're like Uber but for..." = 2-3 (not differentiated)
- "We serve small clinics, competitors target hospitals" = 6-7 (niche focus)
- "We have proprietary AI trained on 10M healthcare records" = 8-9 (defensible)

Red flags:
❌ "We have no competition" (wrong - there's always competition)
❌ "We'll be first to market" (rarely matters as much as execution)
✅ "Here's why we're 10x better for THIS specific customer"

Remember: Investors want to see you've done the homework. Show you understand the competitive landscape and have a plan to win.`,
    icon: <Swords className="h-5 w-5" />,
    order: 5,
    visibility: {
      ideation: 'optional',
      validation: 'required',
      building: 'required',
      launching: 'required',
      scaling: 'required'
    }
  },

  // QUESTION 6: Go-to-Market Strategy (NEW)
  {
    id: "gtm_strategy",
    title: "Go-to-Market Strategy",
    description: "Do you have a clear plan for how you'll acquire customers?",
    helpText: `A Go-to-Market (GTM) strategy is your plan for finding and acquiring customers profitably. It answers: "How will you get from 10 to 10,000 customers?"

Key components of a GTM strategy:
1. Customer Acquisition Channels: Where will you find customers?
   • Content marketing (SEO, blog, social media)
   • Paid ads (Google, Facebook, LinkedIn)
   • Sales team (outbound, partnerships)
   • Product-led growth (free trial, freemium, viral loops)

2. Customer Acquisition Cost (CAC): How much to acquire one customer?
3. Customer Lifetime Value (LTV): How much is a customer worth?
4. Payback Period: How long to recover acquisition cost?

Scoring guide:
- 0-3: No clear plan, hope customers will "find us somehow"
- 4-6: Identified 1-2 channels, testing them out
- 7-8: Clear multi-channel plan, know which channels work
- 9-10: Proven repeatable playbook, know CAC/LTV, scaling what works

Examples by business model:
- B2B SaaS: "We do LinkedIn outbound + SEO content + partnerships" = 6-7
- Consumer app: "We tested TikTok ($15 CAC) + referrals (30% viral coefficient)" = 8-9
- Marketplace: "Cold start with supply side, then demand finds us organically" = 7-8

Red flags:
❌ "We'll go viral" (rarely happens organically)
❌ "Build it and they will come" (they won't)
✅ "We've tested 5 channels, these 2 have positive ROI"

Why investors care:
A great product with no distribution strategy dies. Investors want to see you know HOW you'll get customers, not just that you're building a great product.

Remember: Your GTM strategy should be specific, tested, and repeatable. "We'll figure it out later" is not an answer investors want to hear.`,
    icon: <UsersIcon className="h-5 w-5" />,
    order: 6,
    visibility: {
      ideation: 'hidden',
      validation: 'optional',
      building: 'required',
      launching: 'required',
      scaling: 'required'
    }
  },

  // QUESTION 7: Unit Economics (NEW)
  {
    id: "unit_economics",
    title: "Unit Economics",
    description: "Do you understand your costs and revenue per customer?",
    helpText: `Unit economics means understanding if your business can be profitable at scale - does each customer make you money or lose money?

The core formula:
LTV (Lifetime Value) > CAC (Customer Acquisition Cost) = Good business
LTV < CAC = You lose money on every customer (bad!)

Key metrics to know:
1. Customer Acquisition Cost (CAC):
   Total sales/marketing spend ÷ new customers = CAC
   Example: Spent $10,000, got 100 customers = $100 CAC

2. Customer Lifetime Value (LTV):
   Average revenue per customer × average customer lifespan
   Example: $50/month × 24 months = $1,200 LTV

3. LTV:CAC Ratio:
   Target: 3:1 or better (make $3 for every $1 spent)
   Example: $1,200 LTV ÷ $100 CAC = 12:1 ratio (excellent!)

4. Payback Period:
   How long to recover acquisition cost from revenue
   Target: <12 months
   Example: $100 CAC ÷ $50/month = 2 months payback (great!)

Scoring guide:
- 0-3: Don't know costs or revenue yet (too early)
- 4-6: Rough estimates, know it's close to breakeven
- 7-8: Calculated LTV & CAC, positive unit economics
- 9-10: Proven unit economics, know exactly what levers to pull to improve

Examples:
- SaaS: $1,000 LTV, $200 CAC, 5:1 ratio = 8-9
- E-commerce: $200 LTV, $250 CAC, 0.8:1 ratio = 3-4 (need to improve!)
- Marketplace: $50 LTV, $10 CAC, 5:1 ratio = 7-8

Why this matters:
Investors need to see a path to profitability. If you lose money on every customer, you can't just "make it up in volume." You need to show the math works.

Early stage note:
It's okay if your unit economics aren't perfect yet - investors know early companies are still learning. But you should at least KNOW your numbers and have a plan to improve them.

Remember: The best startups have strong unit economics from day one. If the math doesn't work at small scale, it won't work at large scale either.`,
    icon: <Calculator className="h-5 w-5" />,
    order: 7,
    visibility: {
      ideation: 'hidden',
      validation: 'hidden',
      building: 'optional',
      launching: 'required',
      scaling: 'required'
    }
  },

  // QUESTION 8: Team in Place (EXISTING - moved to position 8)
  {
    id: "team",
    title: "Team in Place",
    description: "Do you have the right people to build and grow your startup?",
    helpText: `Having the "right people" means you have the skills needed to build your product and grow your business. This could be just you, a co-founder, or a small team.

Essential skills to consider:
• Technical skills: Can someone build the product? (coding, design, manufacturing, etc.)
• Business skills: Can someone handle sales, marketing, operations?
• Domain expertise: Does someone understand the industry/problem deeply?
• Execution ability: Can the team actually get things done?

Scoring guide:
- 0-3: You're doing it alone and missing key skills (consider finding help)
- 4-6: You have some skills covered, maybe a co-founder or advisor
- 7-8: You have a solid team with complementary skills
- 9-10: You have an experienced team with proven track records

When to find a co-founder:
• You're missing critical skills (e.g., you're technical but can't sell)
• You need someone to share the workload
• You want someone to challenge your ideas and keep you accountable

What "right people" means:
• They believe in your vision
• They have skills you don't have
• They're committed and reliable
• They complement your weaknesses

Remember: A solo founder with advisors can work, but investors often prefer teams because it shows you can work with others and reduces risk.`,
    icon: <UsersIcon className="h-5 w-5" />,
    order: 8,
    visibility: {
      ideation: 'required',
      validation: 'required',
      building: 'required',
      launching: 'required',
      scaling: 'required'
    }
  },

  // QUESTION 9: Runway Secured (EXISTING - moved to position 9)
  {
    id: "runway",
    title: "Runway Secured",
    description: "Do you have enough money to operate while fundraising?",
    helpText: `Runway is how many months you can operate your startup without new funding. Think of it like fuel in your car - you need enough to get where you're going.

Why runway matters:
Fundraising takes time (often 3-6 months or longer). If you run out of money during fundraising, you'll be desperate and make bad decisions. Having runway gives you the power to say "no" to bad deals and wait for the right investors.

How to calculate your runway:
1. Add up all your monthly expenses (salaries, rent, software, etc.)
2. Divide your available cash by monthly expenses
3. That's your runway in months

Example:
• You have $30,000 saved
• Your monthly expenses are $5,000
• Your runway = 6 months ($30,000 ÷ $5,000)

Scoring guide:
- 0-3: Less than 3 months runway (very risky - start cutting costs or find income)
- 4-6: 3-6 months runway (decent, but try to extend it)
- 7-8: 6-12 months runway (good - gives you time to be selective)
- 9-10: 12+ months runway (excellent - you're in a strong position)

Ways to extend runway:
• Reduce costs (work from home, use free tools, delay hiring)
• Find additional income (consulting, part-time work, small revenue)
• Get a small loan or line of credit
• Ask family/friends for a bridge loan

What's a good minimum?
Most investors want to see at least 3-6 months of runway. This shows you're not desperate and gives you time to close a deal. Less than 3 months is risky because fundraising can take longer than expected.

Remember: Runway isn't just about money - it's about having time to make good decisions. The more runway you have, the better position you're in to negotiate with investors.`,
    icon: <DollarSign className="h-5 w-5" />,
    order: 9,
    visibility: {
      ideation: 'optional',
      validation: 'required',
      building: 'required',
      launching: 'required',
      scaling: 'required'
    }
  },

  // QUESTION 10: Legal & IP Readiness (NEW)
  {
    id: "legal_readiness",
    title: "Legal & IP Readiness",
    description: "Do you have the legal basics in place for fundraising?",
    helpText: `Legal readiness means you have the foundational legal structures that investors require before they'll invest. Missing these can kill deals or cost you equity.

Essential legal basics for fundraising:

1. Company Formation:
   • Incorporated as a C-Corp (Delaware C-Corp is standard in US)
   • Clear cap table showing who owns what
   • Board of directors established

2. Founder Agreements:
   • Equity split among founders clearly documented
   • Vesting schedules (typically 4 years with 1-year cliff)
   • IP assignment agreements (company owns all IP, not founders)

3. Clean IP (Intellectual Property):
   • All code/designs owned by company, not individuals
   • No IP conflicts with previous employers
   • Trademarks filed (if applicable)

4. Basic Contracts:
   • Employee/contractor agreements with IP clauses
   • NDAs where appropriate (don't overuse)
   • Customer agreements or terms of service

Scoring guide:
- 0-3: No company formed, no legal docs
- 4-6: Company formed, basic founder agreement, working on rest
- 7-8: Clean incorporation, founder vesting, IP assigned
- 9-10: Full legal package, investor-ready, past legal audit

Common red flags investors see:
❌ Founder equity not vested (founders can walk with equity)
❌ IP still owned by individual founders (not the company)
❌ Co-founder disputes or unclear equity splits
❌ LLC instead of C-Corp (harder for investors to invest in)

Why this matters:
Investors won't invest until legal is clean. If you have legal issues, expect them to:
- Delay or kill the deal
- Lower your valuation
- Require you to fix at your expense before they invest

Cost guidance:
- Basic formation + founder docs: $2,000-5,000
- Full investor-ready package: $10,000-20,000
- Resources: Clerky ($2,000), Stripe Atlas ($500), or traditional lawyer ($5,000+)

Early stage note:
If you're in ideation stage, it's okay to score low here - just know you'll need this before raising. If you're validation+ stage, this should be done.

Remember: Legal isn't exciting, but it's essential. Investors have seen deals die because of bad legal structures. Don't let this be your dealbreaker.`,
    icon: <Scale className="h-5 w-5" />,
    order: 10,
    visibility: {
      ideation: 'hidden',
      validation: 'optional',
      building: 'required',
      launching: 'required',
      scaling: 'required'
    }
  },

  // QUESTION 11: Investor Network & Warm Intros (NEW)
  {
    id: "investor_network",
    title: "Investor Network & Warm Intros",
    description: "Do you have access to investors through warm introductions?",
    helpText: `Fundraising is relationship-driven. Cold emails rarely work - you need warm introductions from people investors trust. Having a strong network dramatically increases your chances of raising capital.

Why this matters:
Investors get hundreds of cold pitches weekly and ignore 95%+ of them. A warm intro from someone they respect gets you in the door. Your network is often as important as your business metrics.

What counts as a strong investor network:

1. Direct Connections (Best):
   • You've worked with VCs before (previous company, advisor relationships)
   • You know partners at funds personally
   • Investors have reached out to YOU based on reputation

2. Second-Degree Connections (Good):
   • Your advisors/mentors can introduce you to investors
   • Other founders in your network will vouch for you
   • Accelerator/incubator alumni connections
   • Industry leaders who know relevant investors

3. Third-Degree Connections (Decent):
   • LinkedIn connections who can make intros
   • Angel networks you've joined
   • Pitch events and demo days
   • Active participation in startup communities

4. No Network (Challenging):
   • Only have cold email/LinkedIn outreach
   • No startup ecosystem connections
   • No advisors or mentors with investor access

Scoring guide:
- 0-2: No investor connections, will rely purely on cold outreach
- 3-4: Some startup community involvement, few second-degree connections
- 5-6: Active in ecosystem, several people who could potentially intro you
- 7-8: Strong network, multiple warm intro paths to relevant investors
- 9-10: Well-connected, investors know you or can easily be introduced

How to build your network NOW:

Early Stage (0-4 score):
• Join startup communities (Startup Grind, local meetups)
• Find 2-3 advisors who believe in your vision
• Attend demo days and pitch events (even just to watch)
• Help other founders - give before you ask
• Join relevant accelerators or incubators

Growing Network (5-7 score):
• Get warm intros to angel investors for practice pitches
• Ask advisors: "Who should I know in my space?"
• Speak at events or write about your domain expertise
• Connect with other founders who've raised recently
• Join angel networks or syndicate platforms

Strong Network (8-10 score):
• Maintain relationships - update your network quarterly
• Make intros between people in your network (give value)
• Host dinners or events for your community
• Share your fundraising journey transparously
• Help other founders with intros when you can

Red Flags:
❌ Waiting until you need funding to start building relationships
❌ Only reaching out when you want something
❌ Neglecting your network between raises
❌ Not being helpful to others in your ecosystem

Green Flags:
✅ Building relationships months before you need them
✅ Regularly giving value without asking for anything
✅ Being known in your niche or industry
✅ Other founders vouching for you unprompted

Practical Steps:
1. List 20 people who could intro you to investors
2. For each gap, identify WHO could make that connection
3. Reach out to help, not to ask (yet)
4. Attend 2-3 startup events per month
5. Join a founder community (On Deck, South Park Commons, local groups)

The Fundraising Reality:
• ~80% of successful fundraises come from warm intros
• Building relationships takes 3-6 months minimum
• Your "network strength" often predicts fundraising success
• Investors fund people they trust or who come recommended

Bottom Line:
If your score is below 5, start building your network NOW - don't wait until you need to raise. Fundraising is a relationship game, and relationships take time to build.

Remember: The best time to build your investor network was 6 months ago. The second best time is today. Start with one coffee, one intro request, one helpful connection at a time.`,
    icon: <Network className="h-5 w-5" />,
    order: 11,
    visibility: {
      ideation: 'optional',
      validation: 'required',
      building: 'required',
      launching: 'required',
      scaling: 'required'
    }
  }
];

/**
 * Score labels for UI display (0-10 scale)
 */
export const SCORE_LABELS: { [key: number]: string } = {
  0: "Not Started",
  1: "Just Beginning",
  2: "Early Stage",
  3: "Making Progress",
  4: "Getting There",
  5: "Halfway There",
  6: "Strong Progress",
  7: "Almost Ready",
  8: "Very Close",
  9: "Nearly Complete",
  10: "Complete"
};

/**
 * Industry options for context collection
 */
export const INDUSTRY_OPTIONS = [
  'SaaS',
  'Fintech',
  'Healthcare',
  'E-commerce',
  'Marketplace',
  'EdTech',
  'Climate Tech',
  'AI/ML',
  'Consumer',
  'Enterprise Software',
  'Hardware',
  'Biotech',
  'Real Estate Tech',
  'Food & Beverage',
  'Other'
];

/**
 * Business model options for context collection
 */
export const BUSINESS_MODEL_OPTIONS = [
  'B2B SaaS',
  'B2C SaaS',
  'Marketplace',
  'E-commerce / DTC',
  'Enterprise Software',
  'Freemium',
  'Subscription',
  'Transactional',
  'Advertising',
  'Other'
];
