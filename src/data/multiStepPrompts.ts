// Multi-step prompts for BizMap AI - Complete 30-day journey
// Each business concept has 7 prompts covering all BizMap steps

export interface MultiStepPrompt {
  id: number;
  conceptTitle: string;
  category: string;
  description: string;
  tags: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  steps: {
    step: number;
    title: string;
    dayRange: string;
    prompt: string;
  }[];
}

export const multiStepPrompts: MultiStepPrompt[] = [
  {
    id: 1,
    conceptTitle: "AI-Powered Customer Service Automation",
    category: "ai",
    description: "Build AI chatbots and customer support solutions for small businesses",
    tags: ["AI", "automation", "customer service", "B2B"],
    difficulty: "Hard",
    steps: [
      {
        step: 1,
        title: "Business Concept",
        dayRange: "Days 1-2",
        prompt: "I want to start a business providing AI-powered customer service automation for small and medium businesses. The core problem I'm solving is helping businesses reduce support costs (averaging $15-30/hour for agents) while improving 24/7 availability and faster response times. My solution uses AI chatbots, automated email responses, and smart ticketing systems. I have technical background, $7,000 budget, and can work full-time."
      },
      {
        step: 2,
        title: "Target Customer",
        dayRange: "Days 3-4",
        prompt: "My ideal first customers are e-commerce businesses with 5-50 employees who are currently overwhelmed with customer inquiries (50+ daily). They're active in Shopify communities, e-commerce Facebook groups, and attend local small business networking events. I can reach them through Shopify app store, LinkedIn outreach to e-commerce CMOs, and partnering with Shopify consultants who can recommend my service."
      },
      {
        step: 3,
        title: "Validation Plan",
        dayRange: "Days 5-7",
        prompt: "To validate demand this week, I will: 1) Conduct 10 interviews with e-commerce business owners about their customer service pain points and current costs, 2) Create a landing page offering a free chatbot audit and track signups (goal: 25 emails), 3) Analyze 5 competitors' pricing and features to identify gaps in the market that I can fill."
      },
      {
        step: 4,
        title: "MVP Design",
        dayRange: "Days 8-14",
        prompt: "My minimum viable product includes: 1) Pre-built AI chatbot trained on common e-commerce FAQs (shipping, returns, order status), 2) Simple dashboard showing conversation analytics, 3) Email integration for escalating complex queries to humans, 4) One-click Shopify integration. I'm skipping advanced features like multi-language support, custom AI training, and CRM integrations for the MVP."
      },
      {
        step: 5,
        title: "Launch Strategy",
        dayRange: "Days 15-21",
        prompt: "To get my first 10 users, I will: 1) Launch on Product Hunt with a special founder's deal, 2) Post in 5 Shopify Facebook groups with a free trial offer, 3) Reach out to 20 e-commerce businesses personally via LinkedIn with customized demos, 4) Partner with 2 Shopify consultants to recommend my tool, 5) Offer first 10 customers lifetime 50% discount in exchange for testimonials."
      },
      {
        step: 6,
        title: "Pricing Model",
        dayRange: "Days 22-25",
        prompt: "Pricing strategy: Early bird special at $49/month (normally $99) for first 10 customers with lifetime discount. This covers up to 1,000 conversations/month. I chose this because competitor pricing ranges from $79-$200/month, and my lower price helps overcome initial trust barriers while still covering hosting costs ($10/month) and OpenAI API fees ($20-30/month per customer)."
      },
      {
        step: 7,
        title: "Day 30 Success Metrics",
        dayRange: "Days 26-30",
        prompt: "Success on Day 30 means: 2 paying customers at $49/month = $98 MRR, 100 email signups showing interest, 30 active trial users testing the chatbot, and positive feedback confirming this solves a real problem. This proves the business model works and I can confidently invest more time scaling it."
      }
    ]
  },
  {
    id: 2,
    conceptTitle: "Social Commerce Store (TikTok Shop)",
    category: "ecommerce",
    description: "Build a business around social media selling and livestream shopping",
    tags: ["social commerce", "TikTok", "live selling", "Gen Z"],
    difficulty: "Medium",
    steps: [
      {
        step: 1,
        title: "Business Concept",
        dayRange: "Days 1-2",
        prompt: "I want to start a social commerce business using TikTok Shop and Instagram Shopping to sell trending lifestyle and tech accessories to Gen Z customers. The problem I'm solving is making online shopping more entertaining and social - turning boring product pages into fun, interactive experiences. I have $6,000 budget, social media experience, and can dedicate 30+ hours weekly."
      },
      {
        step: 2,
        title: "Target Customer",
        dayRange: "Days 3-4",
        prompt: "My ideal first customers are Gen Z (ages 18-25), active on TikTok 2+ hours daily, interested in aesthetic phone accessories, LED lights, and trendy home decor. They follow lifestyle influencers, engage with #TikTokMadeMeBuyIt content, and prefer discovering products through entertainment rather than traditional ads. I can find them through TikTok FYP, aesthetic Pinterest communities, and Instagram explore page."
      },
      {
        step: 3,
        title: "Validation Plan",
        dayRange: "Days 5-7",
        prompt: "To validate demand this week: 1) Create 10 TikTok videos showcasing product ideas and track views/engagement (goal: 10,000 total views), 2) Survey 30 Gen Z friends/online communities about which products they'd buy immediately, 3) Test 5 products from AliExpress with Instagram story polls to gauge interest before buying inventory."
      },
      {
        step: 4,
        title: "MVP Design",
        dayRange: "Days 8-14",
        prompt: "My MVP includes: 1) TikTok Shop storefront with 10 curated trending products, 2) 3 viral-style TikTok videos per day showing products in use, 3) Simple Instagram Shopping posts, 4) Basic Shopify store as backup. I'm skipping: custom website, influencer partnerships, and multi-platform expansion until I prove TikTok works."
      },
      {
        step: 5,
        title: "Launch Strategy",
        dayRange: "Days 15-21",
        prompt: "To get my first 10 customers: 1) Post 21 TikTok videos (3/day for 7 days) using trending sounds and hashtags, 2) Go live on TikTok 3 times showing products and offering live-exclusive discounts, 3) Engage with 100 comments daily on competitor posts, 4) Share in 3 Gen Z Facebook/Discord communities, 5) Offer first 10 customers 30% off + free shipping."
      },
      {
        step: 6,
        title: "Pricing Model",
        dayRange: "Days 22-25",
        prompt: "Pricing: Products range from $12-35 (2-3x my cost from suppliers), which is competitive with Amazon but positioned as 'exclusive finds'. Launch special: 25% off first purchase with code LAUNCH25. This pricing works because Gen Z is willing to pay premium for unique, aesthetic products they discover on social media vs mass-market options."
      },
      {
        step: 7,
        title: "Day 30 Success Metrics",
        dayRange: "Days 26-30",
        prompt: "Success on Day 30: 10 paying customers generating $250+ revenue, 1,000+ TikTok followers, one video with 50K+ views proving viral potential, 50+ email subscribers for future launches. This proves I can create engaging content that converts and validates expanding product line and scaling content production."
      }
    ]
  },
  {
    id: 3,
    conceptTitle: "Micro-SaaS for Remote Teams",
    category: "saas",
    description: "Build a focused tool solving one specific remote work problem",
    tags: ["micro-SaaS", "remote work", "productivity", "meetings"],
    difficulty: "Hard",
    steps: [
      {
        step: 1,
        title: "Business Concept",
        dayRange: "Days 1-2",
        prompt: "I'm a software developer building a micro-SaaS tool that helps remote teams reduce meeting fatigue by tracking meeting effectiveness and providing actionable insights. The problem: teams waste 30-50% of meeting time on unproductive discussions, leading to burnout and low morale. My solution integrates with Zoom/Teams to analyze meeting patterns, suggest improvements, and help teams run better, shorter meetings. I have technical skills, $8,000 budget, and can work full-time."
      },
      {
        step: 2,
        title: "Target Customer",
        dayRange: "Days 3-4",
        prompt: "My first customers are remote-first startup teams (10-50 people) led by founders/managers who are frustrated with excessive meetings. They're active in Indie Hackers, Slack communities for remote workers, and follow productivity influencers on Twitter. I can reach them through: Product Hunt, remote work Twitter, posting in r/startups, and LinkedIn outreach to remote company founders."
      },
      {
        step: 3,
        title: "Validation Plan",
        dayRange: "Days 5-7",
        prompt: "Validation plan: 1) Interview 15 remote team leaders about their meeting challenges and willingness to pay for a solution, 2) Create a Typeform survey shared in 5 remote work communities asking about meeting pain points (goal: 100 responses), 3) Build a simple landing page with demo video and track email signups (goal: 30 interested users)."
      },
      {
        step: 4,
        title: "MVP Design",
        dayRange: "Days 8-14",
        prompt: "MVP features: 1) Zoom integration that tracks meeting duration and participant engagement, 2) Simple dashboard showing weekly meeting stats (time spent, recurring meetings, largest time sinks), 3) Weekly email report with 3 actionable suggestions to reduce meeting time, 4) Basic team sharing. Skipping: AI analysis, calendar integrations, mobile app, advanced analytics until validated."
      },
      {
        step: 5,
        title: "Launch Strategy",
        dayRange: "Days 15-21",
        prompt: "Launch plan for first 10 users: 1) Product Hunt launch with founder story and special launch pricing, 2) Post detailed launch story on Indie Hackers with beta access links, 3) Twitter thread about building in public with demo, 4) Direct LinkedIn outreach to 30 remote company founders offering free 2-week trial, 5) Share in 3 Slack communities for remote teams."
      },
      {
        step: 6,
        title: "Pricing Model",
        dayRange: "Days 22-25",
        prompt: "Pricing: $29/month for teams up to 20 people (launch price, normally $49). Competitor analysis shows meeting tools range from $50-150/month, so I'm positioning as affordable entry point. This covers hosting ($5/month), Zoom API costs ($10/month), and leaves healthy margin. First 10 customers get lifetime 50% off to build testimonials and case studies."
      },
      {
        step: 7,
        title: "Day 30 Success Metrics",
        dayRange: "Days 26-30",
        prompt: "Day 30 success: 3 paying teams at $29/month = $87 MRR, 50 trial signups, 200+ landing page visitors, testimonials from 2 happy customers proving ROI. Most importantly: data showing teams actually reduced meeting time by average 15-20% using the tool. This validates product-market fit and justifies building more features."
      }
    ]
  },
  {
    id: 4,
    conceptTitle: "AI Content Creation Agency",
    category: "ai",
    description: "Leverage AI tools to create content for businesses at scale",
    tags: ["AI", "content creation", "marketing", "agency"],
    difficulty: "Medium",
    steps: [
      {
        step: 1,
        title: "Business Concept",
        dayRange: "Days 1-2",
        prompt: "I'm a marketer launching an AI content generation agency that creates blog posts, social media content, and marketing copy for small businesses. The problem: businesses need consistent content but can't afford $2,000-5,000/month for traditional agencies. My solution uses AI tools (GPT, Midjourney, Copy.ai) to deliver high-quality content faster and 60% cheaper. I have marketing expertise, $4,000 budget, and can dedicate 40+ hours weekly."
      },
      {
        step: 2,
        title: "Target Customer",
        dayRange: "Days 3-4",
        prompt: "First customers: Solo entrepreneurs and small businesses (1-10 employees) in coaching, real estate, and professional services who know they need content but are overwhelmed creating it. They're active in small business Facebook groups, follow marketing influencers on LinkedIn, and attend Chamber of Commerce meetings. I can reach them through local business networking, LinkedIn posts about AI + content, and Facebook group value posts."
      },
      {
        step: 3,
        title: "Validation Plan",
        dayRange: "Days 5-7",
        prompt: "Validation: 1) Offer 3 free content audits to local businesses and pitch my service after showing gaps, 2) Create sample AI-generated content portfolio for 5 industries and share in business groups to gauge interest, 3) Survey 20 small business owners about current content spend and pain points to identify sweet spot pricing."
      },
      {
        step: 4,
        title: "MVP Design",
        dayRange: "Days 8-14",
        prompt: "MVP service: 1) Monthly package: 4 blog posts + 20 social media posts + 2 email newsletters, 2) Simple Google Doc delivery with revision rounds, 3) Custom AI prompts tailored to each client's voice/brand, 4) Basic analytics on content performance. Skipping: Custom portal, video content, SEO optimization services, white-label options until proven."
      },
      {
        step: 5,
        title: "Launch Strategy",
        dayRange: "Days 15-21",
        prompt: "Launch plan: 1) Offer first 5 clients 'Founding Member' price of $497/month (50% off) for 6 months guaranteed, 2) LinkedIn daily posts showing before/after AI content examples, 3) Present at 2 local business networking events with live AI content generation demo, 4) Personal outreach to 25 businesses I identify needing content help, 5) Partner with web designers who can refer content clients."
      },
      {
        step: 6,
        title: "Pricing Model",
        dayRange: "Days 22-25",
        prompt: "Pricing: Launch at $497/month (normally $997/month after first 10 clients). This is 50-70% cheaper than traditional agencies but still profitable since AI tools cost me ~$50/month and content creation takes 5-8 hours vs traditional 20-30 hours. Positioning as premium quality at accessible prices for small businesses."
      },
      {
        step: 7,
        title: "Day 30 Success Metrics",
        dayRange: "Days 26-30",
        prompt: "Success metrics: 2 paying clients at $497/month = $994 MRR, 10 discovery calls completed, 5 proposals sent, portfolio of 30+ content pieces to showcase. Key validation: clients confirm content quality matches their brand voice and drives engagement. This proves AI+human oversight model works and I can scale by hiring part-time editors."
      }
    ]
  },
  {
    id: 5,
    conceptTitle: "Sustainable E-commerce Store",
    category: "ecommerce",
    description: "Starting an eco-friendly online retail business",
    tags: ["sustainability", "e-commerce", "retail", "eco-friendly"],
    difficulty: "Medium",
    steps: [
      {
        step: 1,
        title: "Business Concept",
        dayRange: "Days 1-2",
        prompt: "I want to start an e-commerce business selling sustainable, eco-friendly products with carbon-neutral shipping and plastic-free packaging. The problem: environmentally conscious consumers struggle to find genuinely sustainable alternatives that aren't greenwashed or overpriced. My solution curates verified eco-friendly products with full transparency on environmental impact. I have $5,000 to start, marketing experience, and can dedicate 20-30 hours per week."
      },
      {
        step: 2,
        title: "Target Customer",
        dayRange: "Days 3-4",
        prompt: "Target: Environmentally conscious millennials and Gen Z (25-35 years old) who actively try to reduce waste, follow sustainability influencers on Instagram, participate in Buy Nothing groups, and read blogs like Treehugger. They shop at Whole Foods, bring reusable bags everywhere, and are willing to pay 15-20% premium for verified sustainable products. I'll find them in zero-waste Facebook groups, sustainability subreddits, and Instagram eco-communities."
      },
      {
        step: 3,
        title: "Validation Plan",
        dayRange: "Days 5-7",
        prompt: "Validation: 1) Survey 50 people in zero-waste communities about their biggest challenges finding sustainable products and willingness to pay, 2) Create Instagram poll asking which product categories they want most (home, beauty, kitchen, etc.), 3) Test selling 5 products on Etsy first to validate demand before building full store, tracking which products get most interest."
      },
      {
        step: 4,
        title: "MVP Design",
        dayRange: "Days 8-14",
        prompt: "MVP: Simple Shopify store with 15 carefully curated products in 3 categories (kitchen, beauty, home). Each product page includes detailed sustainability credentials, environmental impact metrics, and sourcing transparency. Plastic-free shipping materials, carbon-neutral shipping through Offset partner. Skipping: subscription boxes, mobile app, loyalty programs, extensive product range until validated."
      },
      {
        step: 5,
        title: "Launch Strategy",
        dayRange: "Days 15-21",
        prompt: "Launch: 1) Partner with 3 micro-influencers in sustainability space (10K-50K followers) for product reviews, 2) Launch with 25% off opening week shared in 5 zero-waste Facebook groups, 3) Create valuable content (plastic-free living guides) to share in sustainability communities, 4) Instagram giveaway for first 100 followers, 5) Reach out to 10 sustainability bloggers for feature opportunities."
      },
      {
        step: 6,
        title: "Pricing Model",
        dayRange: "Days 22-25",
        prompt: "Pricing: Products marked up 2.5x wholesale cost, averaging $20-45 per item. Launch promotion: 20% off first order plus free carbon-neutral shipping over $50. This positioning works because sustainable product customers expect to pay premium for ethical sourcing, and competitive analysis shows similar products sell for 2-3x my planned prices on larger platforms."
      },
      {
        step: 7,
        title: "Day 30 Success Metrics",
        dayRange: "Days 26-30",
        prompt: "Success: 15 orders totaling $500+ revenue, 500+ Instagram followers, 100+ email subscribers, 3 positive product reviews showing customers value the sustainability aspect. This validates: 1) Product-market fit exists, 2) Pricing is acceptable, 3) Marketing channels work, giving confidence to expand product line and increase marketing spend."
      }
    ]
  }
];
