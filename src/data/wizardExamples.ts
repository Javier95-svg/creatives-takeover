/**
 * Wizard Examples Database
 * High-quality example answers for each wizard step
 */

export interface WizardExample {
  stepKey: string;
  stepTitle: string;
  examples: string[];
}

export const wizardExamples: WizardExample[] = [
  {
    stepKey: 'concept',
    stepTitle: 'Business Concept',
    examples: [
      'I\'m creating a scheduling tool for independent hair stylists who struggle to manage appointments via text messages and Instagram DMs. They lose bookings because they can\'t respond quickly enough, and clients get frustrated not knowing available times. My target customers are mobile stylists in urban areas who serve 15-30 clients per month.',
      'Small e-commerce brands (under $1M revenue) waste 10-15 hours per week manually creating social media posts for their products. I\'m building an AI tool that generates product photos and captions from a single product image, helping them maintain consistent social presence without hiring a social media manager.',
      'Freelance designers struggle to get paid on time - 67% wait 30+ days for payment. I\'m building a payment platform specifically for creative freelancers that offers instant payment advances (within 24 hours) in exchange for a small fee, so they don\'t have to chase invoices or worry about cash flow.',
    ],
  },
  {
    stepKey: 'customer',
    stepTitle: 'Target Customer',
    examples: [
      'My first customer is Sarah, a 32-year-old mobile hair stylist in Chicago with 25 regular clients. She charges $80-150 per appointment and books via Instagram DMs and text. She loses 3-5 bookings per month because she can\'t respond fast enough while working. I can find customers like her in Facebook groups for hair stylists, Instagram hashtags like #mobilestylist, and local beauty professional meetups.',
      'My ideal first customer is Jake, owner of a Shopify store selling home decor items doing $30K/month in revenue. He spends $500/month on Canva Pro and still struggles to create enough content. He\'s active in e-commerce Facebook groups, r/shopify, and Indie Hackers. He currently uses a VA for $15/hour to create posts but quality is inconsistent.',
      'Emma, a 29-year-old freelance graphic designer in Austin making $75K/year with 8-12 active clients. She invoices via QuickBooks but clients typically pay in 45-60 days. She\'s had to take out a personal loan twice to cover rent gaps. I can reach designers like her through Dribbble community, Designer Hangout Slack, and AIGA local chapters.',
    ],
  },
  {
    stepKey: 'validation',
    stepTitle: 'Validation Plan',
    examples: [
      'In the next 7 days, I\'ll conduct 10 phone interviews with mobile stylists to confirm they lose bookings due to slow responses. I\'ll ask them to show me their current booking process and how much revenue they estimate losing. Success means 7+ stylists confirm the problem and 5+ say they\'d pay $30-50/month to solve it. I\'ll find interviewees by DMing 50 stylists on Instagram.',
      'I\'ll create a landing page showing 3 sample AI-generated product posts and run $200 in Facebook ads targeting e-commerce owners. Goal is 100 email signups in 7 days from people who want to try it. I\'ll also post in 5 Shopify Facebook groups asking if anyone would pay $49/month for this tool. Success means 100+ emails and 20+ positive comments.',
      'I\'ll build a waitlist landing page and post it in 10 designer communities explaining the instant payment feature. Goal: 50 signups in 10 days from freelancers who confirm they have payment timing issues. I\'ll also conduct 5 interviews with designers asking about their biggest payment frustrations and if they\'d pay 3% fee for instant payment.',
    ],
  },
  {
    stepKey: 'mvp',
    stepTitle: 'MVP Design',
    examples: [
      'My MVP is a simple booking page (like Calendly) where stylists can share their available times. Clients book directly and get instant confirmation via text. Core features: (1) Calendar sync with Google/Apple, (2) Automated text reminders 24 hours before, (3) Online payment collection, (4) Mobile-friendly booking page. I\'m NOT including: marketing automation, client profiles, package deals, or gift cards. This covers 80% of the booking workflow.',
      'MVP is a Shopify app where users upload one product photo, select their brand colors, and get 10 social post variations with captions. Features: (1) AI background removal and enhancement, (2) Auto-generated captions in brand voice, (3) Direct post to Instagram/Facebook, (4) 10 posts per month limit. Excluding: video creation, Pinterest support, analytics dashboard, or scheduling beyond 1 week. This proves the core value prop.',
      'MVP is a web portal where freelancers upload their invoice, we verify client creditworthiness, and send payment in 24 hours minus 3% fee. Features: (1) Invoice upload and parsing, (2) Client credit check, (3) Instant approval/denial, (4) ACH payment within 24 hours. Not including: dispute resolution, client relationship tracking, or recurring invoice handling. Focus is proving the instant payment value.',
    ],
  },
  {
    stepKey: 'launch',
    stepTitle: 'Launch Strategy',
    examples: [
      'To get my first 10 customers: (1) Post in "Mobile Beauty Professionals" Facebook group (12K members) with a special founding member offer - $19/month for first 6 months, (2) DM 100 stylists on Instagram who post booking availability in their stories, offering free setup call, (3) Partner with 2 beauty supply stores to put flyers at checkout. Timeline: Week 1-2 for outreach, goal is 10 paying customers by Day 21.',
      'Getting first 10 users: (1) Post on Product Hunt with "Early Bird" pricing ($29/month vs $49), (2) Share in r/shopify, r/ecommerce, and Indie Hackers with before/after examples, (3) Reach out to 50 e-commerce influencers offering free lifetime access for a testimonial, (4) Run $500 Facebook ads targeting Shopify store owners. Goal: 10 paying users by end of Week 3.',
      'First 10 customer plan: (1) Post in 5 designer Slack communities (Designer Hangout, AIGA network) offering founding member rate of 2% fee vs 3%, (2) Create case study showing how a designer got paid $2,500 in 24 hours instead of waiting 60 days, share on LinkedIn, (3) Partner with 3 freelance platforms (Upwork, Contra) to offer service to their users. Target: 10 funded invoices in first 30 days.',
    ],
  },
  {
    stepKey: 'pricing',
    stepTitle: 'Pricing Model',
    examples: [
      'Subscription model: $39/month for unlimited bookings and 50 text messages. Additional texts at $0.10 each. Free 14-day trial, no credit card required. This pricing works because stylists typically book 20-30 appointments per month worth $2,000-4,000 in revenue, so $39 is less than 2% of their income. Competitors charge $50-80/month. I\'m pricing lower to grow fast initially.',
      'Freemium subscription: Free tier with 10 posts/month, $49/month for 100 posts, $99/month for unlimited. Add-on: Video posts for $20/month extra. E-commerce stores doing $30K+/month revenue easily justify $49 for content that would cost $500+ with a VA or $1,000+ with an agency. Comparable tools (Canva Pro, Later) charge $30-50/month but don\'t include AI generation.',
      'Transaction-based: 3% fee on each invoice we advance (minimum $15 fee). No monthly subscription. If a designer gets $2,000 advanced, we charge $60. This is cheaper than factoring companies (5-8%) and less risky than taking out loans. Revenue potential: If we fund $50K in invoices per month, that\'s $1,500 in revenue. Need to reach $100K/month in funded invoices to cover costs.',
    ],
  },
  {
    stepKey: 'goals',
    stepTitle: 'Day 30 Success Goals',
    examples: [
      'By Day 30, success means: (1) 10 paying subscribers at $39/month = $390 MRR, (2) Average of 15 bookings per stylist per month processed through the platform, (3) 4.5+ star rating from customer feedback, (4) At least 3 stylists report they\'ve stopped losing bookings to slow responses, (5) Churn rate under 20%. These metrics prove the core value proposition and justify building v2.',
      'Day 30 goals: (1) 20 paying users generating $980 in MRR ($49/month plan), (2) Users create average of 40 posts per month showing product utility, (3) At least 10 users upgrade from free to paid tier (20% conversion), (4) 3 video testimonials from happy customers, (5) 30% of users report saving 5+ hours per week. This validates product-market fit for seed round pitch.',
      'Success by Day 30: (1) Fund $25,000 in invoices generating $750 in revenue (3% fee), (2) Process 15 invoices from 10 different designers, (3) 100% on-time payment (no late payments), (4) Net Promoter Score of 8+, (5) Zero disputes or chargebacks. These numbers show we can scale to $50K/month in funded invoices (my first major milestone) and prove credit risk model works.',
    ],
  },
];

/**
 * Get examples for a specific wizard step
 */
export function getExamplesForStep(stepKey: string): string[] {
  const step = wizardExamples.find((s) => s.stepKey === stepKey);
  return step?.examples || [];
}

/**
 * Get a random example for a specific step
 */
export function getRandomExample(stepKey: string): string | null {
  const examples = getExamplesForStep(stepKey);
  if (examples.length === 0) return null;
  return examples[Math.floor(Math.random() * examples.length)];
}
