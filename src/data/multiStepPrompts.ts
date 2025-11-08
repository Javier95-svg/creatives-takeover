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

// Helper function to generate standard steps 2-7 from step 1
function generateStandardSteps(conceptTitle: string, step1Prompt: string): Array<{step: number; title: string; dayRange: string; prompt: string}> {
  return [
    {
      step: 1,
      title: "Business Concept",
      dayRange: "Days 1-2",
      prompt: step1Prompt
    },
    {
      step: 2,
      title: "Target Customer",
      dayRange: "Days 3-4",
      prompt: `For my ${conceptTitle.toLowerCase()} business: Describe my ideal first customer in detail - their demographics, pain points, where they spend time online, and specific places I can find them in the next 7 days. Include 3-5 specific channels or communities where I'll find early adopters.`
    },
    {
      step: 3,
      title: "Validation Plan",
      dayRange: "Days 5-7",
      prompt: `For my ${conceptTitle.toLowerCase()} business: List 3 specific ways I'll validate demand this week: 1) Customer discovery method (interviews, surveys), 2) Market test approach (landing page, pre-orders), 3) Competitive research. What metrics will prove people want this?`
    },
    {
      step: 4,
      title: "MVP Design",
      dayRange: "Days 8-14",
      prompt: `For my ${conceptTitle.toLowerCase()} business: Describe the absolute MINIMUM viable product - only the core features that solve the main problem. List 3-5 essential features to build, and explicitly state 3-5 things I'm NOT building yet to stay lean and launch fast.`
    },
    {
      step: 5,
      title: "Launch Strategy",
      dayRange: "Days 15-21",
      prompt: `For my ${conceptTitle.toLowerCase()} business: Detail my plan to get first 10 customers - list 5 specific channels/tactics I'll use, what special launch offer I'll make, and how I'll create urgency. Include both online and offline strategies if relevant.`
    },
    {
      step: 6,
      title: "Pricing Model",
      dayRange: "Days 22-25",
      prompt: `For my ${conceptTitle.toLowerCase()} business: What will I charge and why? Include pricing tier, competitor comparison, cost justification, and any early bird/launch discount. What pricing helps me get first paying customer by Day 30 while staying profitable?`
    },
    {
      step: 7,
      title: "Day 30 Success Metrics",
      dayRange: "Days 26-30",
      prompt: `For my ${conceptTitle.toLowerCase()} business: Define success on Day 30 - specific numbers for customers/revenue, email signups, active users, or other key metrics. What results would prove this concept works and justify continuing to build?`
    }
  ];
}

export const multiStepPrompts: MultiStepPrompt[] = [
  // Detailed concepts (IDs 1-5) - Fully customized 7 steps
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
  },

  // Standard template concepts (IDs 6-48) - Using helper function for steps 2-7
  {
    id: 6,
    conceptTitle: "No-Code AI App Builder Service",
    category: "ai",
    description: "Help businesses build AI-powered apps without coding",
    tags: ["no-code", "AI", "app development", "B2B"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "No-Code AI App Builder Service",
      "I want to start a service that helps small businesses build AI-powered applications using no-code platforms like Bubble, Zapier, and AI APIs. I have some technical skills, $5,000 budget, and can work full-time. My target is businesses that want AI functionality but can't afford custom development."
    )
  },
  {
    id: 7,
    conceptTitle: "Creator Management Platform",
    category: "creator",
    description: "Help content creators manage their business operations",
    tags: ["creator economy", "SaaS", "influencer marketing", "B2B"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Creator Management Platform",
      "I want to build a SaaS platform that helps content creators manage their brand partnerships, sponsorship deals, content calendar, and finances in one place. I have business experience, $12,000 budget, and can work full-time. The target market is mid-tier creators (10K-500K followers) who are getting overwhelmed managing their creator business."
    )
  },
  {
    id: 8,
    conceptTitle: "Course Creation Consultancy",
    category: "creator",
    description: "Help experts turn knowledge into profitable online courses",
    tags: ["online courses", "consulting", "education", "expertise monetization"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Course Creation Consultancy",
      "I want to start a consultancy that helps professionals and experts create, launch, and market online courses. I have marketing and educational background, $3,000 budget, and can start part-time. My goal is to help people monetize their expertise through course creation, from content development to launch strategy."
    )
  },
  {
    id: 9,
    conceptTitle: "Micro-Influencer Marketplace",
    category: "creator",
    description: "Connect local businesses with micro-influencers",
    tags: ["influencer marketing", "marketplace", "local business", "micro-influencers"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Micro-Influencer Marketplace",
      "I want to create a platform that connects local businesses with micro-influencers (1K-50K followers) in their area for authentic marketing campaigns. I have marketing experience, $8,000 budget, and can work full-time. The focus is on local restaurants, shops, and services working with community influencers."
    )
  },
  {
    id: 10,
    conceptTitle: "Subscription Box for Remote Workers",
    category: "ecommerce",
    description: "Curated productivity and wellness items for remote professionals",
    tags: ["subscription", "remote work", "productivity", "wellness"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Subscription Box for Remote Workers",
      "I want to launch a subscription box service targeting remote workers and digital nomads, featuring productivity tools, ergonomic accessories, healthy snacks, and wellness items. I have $10,000 budget, some e-commerce experience, and can work full-time. The target audience is remote professionals who want to improve their home office setup and wellbeing."
    )
  },
  {
    id: 11,
    conceptTitle: "AI-Powered Project Management Tool",
    category: "saas",
    description: "Smart project management with AI assistance and automation",
    tags: ["saas", "AI", "project management", "automation"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "AI-Powered Project Management Tool",
      "I want to create a SaaS project management tool that uses AI to predict project delays, suggest optimal task assignments, and automate routine project management tasks. I have technical skills, $15,000+ budget, and can work full-time. The target market is mid-size companies (50-200 employees) struggling with project visibility."
    )
  },
  {
    id: 12,
    conceptTitle: "Mobile App for Local Services",
    category: "saas",
    description: "Connecting service providers with customers",
    tags: ["mobile app", "marketplace", "local services", "on-demand"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Mobile App for Local Services",
      "I'm planning a mobile app that connects local service providers (plumbers, electricians, cleaners) with customers who need quick help. I have technical skills, $15,000 budget, and can work full-time. Think 'Uber for home services' but focused on my local market first with same-day booking capabilities."
    )
  },
  {
    id: 13,
    conceptTitle: "Carbon Footprint Tracking SaaS",
    category: "sustainability",
    description: "Help businesses measure and reduce their environmental impact",
    tags: ["climate tech", "sustainability", "SaaS", "ESG reporting"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Carbon Footprint Tracking SaaS",
      "I want to create a SaaS platform that helps small and medium businesses track their carbon footprint, get actionable reduction recommendations, and report on their sustainability progress. I have environmental science background, $12,000 budget, and can work full-time. The target market is companies preparing for ESG reporting requirements."
    )
  },
  {
    id: 14,
    conceptTitle: "Renewable Energy Consulting",
    category: "sustainability",
    description: "Help homeowners and businesses transition to clean energy",
    tags: ["renewable energy", "consulting", "solar", "sustainability"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Renewable Energy Consulting",
      "I want to start a consulting business that helps homeowners and small businesses evaluate, plan, and implement renewable energy solutions like solar panels and battery storage. I have engineering background, $4,000 budget, and can start part-time. My goal is to make the transition to clean energy simple and cost-effective."
    )
  },
  {
    id: 15,
    conceptTitle: "Sustainable Product Marketplace",
    category: "sustainability",
    description: "Curated platform for verified eco-friendly products",
    tags: ["marketplace", "sustainability", "eco-friendly", "conscious consumption"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Sustainable Product Marketplace",
      "I want to create an online marketplace exclusively for verified sustainable and eco-friendly products, with strict vetting criteria and transparent impact metrics. I have e-commerce experience, $8,000 budget, and can work full-time. The platform will focus on helping conscious consumers find genuinely sustainable alternatives to everyday products."
    )
  },
  {
    id: 16,
    conceptTitle: "Mental Health App for Remote Workers",
    category: "health",
    description: "Digital wellness solution for isolated remote professionals",
    tags: ["mental health", "remote work", "wellness app", "burnout prevention"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Mental Health App for Remote Workers",
      "I want to develop a mental health and wellness app specifically for remote workers dealing with isolation, work-life balance issues, and burnout. I have psychology background, $10,000 budget, and can work full-time. The app should include guided meditations, virtual coworking sessions, and mood tracking."
    )
  },
  {
    id: 17,
    conceptTitle: "Senior Care Coordination Service",
    category: "health",
    description: "Help families manage elderly care with technology",
    tags: ["elderly care", "health tech", "family coordination", "aging population"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Senior Care Coordination Service",
      "I want to start a service that helps families coordinate care for elderly parents using a combination of technology and personal support. I have healthcare experience, $6,000 budget, and can dedicate 40+ hours weekly. The service will include medication reminders, appointment scheduling, and family communication tools."
    )
  },
  {
    id: 18,
    conceptTitle: "Corporate Wellness Platform",
    category: "health",
    description: "Comprehensive employee wellness programs for modern workplaces",
    tags: ["corporate wellness", "employee health", "B2B", "workplace wellness"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Corporate Wellness Platform",
      "I want to create a comprehensive wellness platform for companies to improve employee health and reduce healthcare costs. I have HR and wellness background, $12,000 budget, and can work full-time. The platform should include fitness challenges, mental health resources, nutrition tracking, and stress management tools."
    )
  },
  {
    id: 19,
    conceptTitle: "Local Fitness Coaching with Virtual Reality",
    category: "local",
    description: "Combine in-person and VR fitness experiences",
    tags: ["fitness", "VR", "local", "innovative training"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Local Fitness Coaching with Virtual Reality",
      "I'm a certified personal trainer who wants to start a fitness business combining traditional personal training with virtual reality workout experiences. I have fitness expertise, $8,000 budget including VR equipment, and can work full-time. The target market is tech-savvy fitness enthusiasts looking for immersive workout experiences."
    )
  },
  {
    id: 20,
    conceptTitle: "Hyperlocal Delivery Network",
    category: "local",
    description: "Same-day delivery for local businesses and residents",
    tags: ["delivery", "local business", "logistics", "community"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Hyperlocal Delivery Network",
      "I want to create a hyperlocal delivery network that helps local businesses offer same-day delivery while also providing personal shopping and errand services for busy residents. I have logistics experience, $7,000 budget, and can work full-time. The focus is on building a strong community network of reliable delivery partners."
    )
  },
  {
    id: 21,
    conceptTitle: "Coworking Space for Creators",
    category: "local",
    description: "Physical space designed for content creators and digital professionals",
    tags: ["coworking", "content creation", "real estate", "community"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Coworking Space for Creators",
      "I want to open a coworking space specifically designed for content creators, including podcast studios, video recording rooms, and photography setups alongside traditional workspaces. I have real estate experience, $25,000 budget, and can commit full-time. The target market is freelance creators, small agencies, and remote workers."
    )
  },
  {
    id: 22,
    conceptTitle: "AI Implementation Consultancy",
    category: "consulting",
    description: "Help businesses integrate AI tools into their operations",
    tags: ["AI consulting", "business automation", "digital transformation", "B2B"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "AI Implementation Consultancy",
      "I want to start a consultancy that helps small and medium businesses identify and implement AI tools to improve their operations, from customer service chatbots to automated data analysis. I have business and technical background, $5,000 budget, and can dedicate 35+ hours weekly. My goal is to democratize AI adoption for smaller companies."
    )
  },
  {
    id: 23,
    conceptTitle: "Remote Work Transition Consulting",
    category: "consulting",
    description: "Help traditional businesses successfully adopt remote work",
    tags: ["remote work", "organizational change", "HR consulting", "business transformation"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Remote Work Transition Consulting",
      "I want to help traditional businesses successfully transition to hybrid or fully remote work models. I have HR and organizational psychology background, $3,000 budget, and can start part-time. My services include culture assessment, tool recommendations, policy development, and change management for remote work adoption."
    )
  },
  {
    id: 24,
    conceptTitle: "Sustainability Compliance Consulting",
    category: "consulting",
    description: "Help businesses meet new environmental regulations and ESG requirements",
    tags: ["ESG consulting", "sustainability", "compliance", "environmental regulations"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Sustainability Compliance Consulting",
      "I want to start a consulting practice that helps businesses comply with increasing environmental regulations and ESG reporting requirements. I have environmental law and business background, $4,000 budget, and can work 30+ hours weekly. My target clients are mid-size companies facing new sustainability compliance challenges."
    )
  },
  {
    id: 25,
    conceptTitle: "Digital Estate Planning Service",
    category: "consulting",
    description: "Help people manage their digital assets and online presence after death",
    tags: ["digital estate", "legacy planning", "digital assets", "legal services"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Digital Estate Planning Service",
      "I want to create a service that helps people organize and plan for their digital assets, social media accounts, cryptocurrency, and online subscriptions for when they pass away. I have legal background, $3,500 budget, and can start part-time. This addresses the growing need for digital legacy planning in our increasingly online world."
    )
  },
  {
    id: 26,
    conceptTitle: "Loneliness Solutions Platform",
    category: "health",
    description: "Combat social isolation with community-building technology",
    tags: ["social connection", "community building", "mental health", "loneliness"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Loneliness Solutions Platform",
      "I want to create a platform that helps combat loneliness and social isolation by connecting people with shared interests for both virtual and in-person activities. I have community organizing experience, $9,000 budget, and can work full-time. The focus is on creating meaningful connections for people struggling with social isolation, especially post-pandemic."
    )
  },
  {
    id: 27,
    conceptTitle: "AI Voice Assistant for Seniors",
    category: "saas",
    description: "Voice-activated companion and helper for elderly users",
    tags: ["AI", "voice technology", "elderly care", "healthcare"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "AI Voice Assistant for Seniors",
      "I want to create an AI-powered voice assistant specifically designed for seniors to help with medication reminders, emergency contacts, entertainment, and staying connected with family. I have tech background, $12,000 budget, and can work full-time. The product should be simple, reliable, and focused on improving quality of life for aging adults."
    )
  },
  {
    id: 28,
    conceptTitle: "AI-Powered Personal Finance Coach",
    category: "saas",
    description: "Smart financial planning and budgeting with AI insights",
    tags: ["AI", "fintech", "personal finance", "budgeting"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "AI-Powered Personal Finance Coach",
      "I want to develop an AI-driven personal finance app that analyzes spending patterns, predicts future expenses, and provides personalized budgeting and investment advice. I have fintech experience, $15,000 budget, and can dedicate full-time. Target audience is millennials and Gen Z looking for smarter money management."
    )
  },
  {
    id: 29,
    conceptTitle: "No-Code AI Automation Platform",
    category: "saas",
    description: "Help small businesses automate tasks without coding",
    tags: ["no-code", "AI automation", "small business", "productivity"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "No-Code AI Automation Platform",
      "I want to create a no-code platform that allows small business owners to build AI-powered automations for customer service, data entry, and marketing tasks. I have technical background, $20,000+ budget, and can work full-time. The goal is to make AI automation accessible to non-technical business owners."
    )
  },
  {
    id: 30,
    conceptTitle: "AI Content Creation Studio",
    category: "creator",
    description: "AI-powered tools for content creators and marketers",
    tags: ["AI content", "creator tools", "video editing", "automation"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "AI Content Creation Studio",
      "I want to launch a service that helps content creators and small businesses generate high-quality video, image, and text content using AI tools. I have marketing and design experience, $8,000 budget, and can work full-time. The service includes AI video editing, thumbnail generation, and content scheduling across platforms."
    )
  },
  {
    id: 31,
    conceptTitle: "Virtual Event Production Company",
    category: "creator",
    description: "Professional virtual and hybrid event planning and execution",
    tags: ["virtual events", "event planning", "business services", "technology"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Virtual Event Production Company",
      "I want to start an event production company specializing in virtual and hybrid events for businesses, creators, and organizations. I have event planning experience, $10,000 budget, and can work full-time. Services include technical setup, engagement strategies, and post-event analytics for immersive online experiences."
    )
  },
  {
    id: 32,
    conceptTitle: "Creator Analytics & Growth Platform",
    category: "creator",
    description: "Data-driven insights for content creator success",
    tags: ["creator analytics", "social media", "data analysis", "growth hacking"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Creator Analytics & Growth Platform",
      "I want to build a platform that provides deep analytics and growth strategies for content creators across multiple platforms (TikTok, Instagram, YouTube, etc.). I have data analysis background, $12,000 budget, and can work full-time. The platform will offer audience insights, optimal posting times, and content performance predictions."
    )
  },
  {
    id: 33,
    conceptTitle: "AI Mental Health Screening App",
    category: "health",
    description: "Early detection and intervention for mental health issues",
    tags: ["mental health", "AI", "healthcare", "prevention"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "AI Mental Health Screening App",
      "I want to develop an app that uses AI to analyze text, voice, and behavioral patterns to provide early mental health screening and connect users with appropriate resources. I have psychology and tech background, $15,000 budget, and can work full-time. The focus is on preventive mental healthcare and reducing barriers to treatment."
    )
  },
  {
    id: 34,
    conceptTitle: "Personalized Nutrition Planning Service",
    category: "health",
    description: "AI-driven meal planning based on individual health data",
    tags: ["nutrition", "personalized medicine", "meal planning", "health optimization"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Personalized Nutrition Planning Service",
      "I want to create a service that combines genetic testing, health metrics, and lifestyle data to provide personalized nutrition plans and meal recommendations. I have nutrition background, $10,000 budget, and can work full-time. The service includes meal delivery partnerships and health tracking integration."
    )
  },
  {
    id: 35,
    conceptTitle: "Workplace Wellness Coaching",
    category: "health",
    description: "On-site and virtual wellness programs for companies",
    tags: ["workplace wellness", "coaching", "corporate health", "stress management"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Workplace Wellness Coaching",
      "I want to start a wellness coaching business that provides on-site and virtual wellness programs for companies dealing with employee burnout and stress. I have wellness coaching certification, $5,000 budget, and can start part-time. Services include stress management workshops, fitness classes, and mental health first aid training."
    )
  },
  {
    id: 36,
    conceptTitle: "Carbon Credit Marketplace for SMBs",
    category: "sustainability",
    description: "Simplified carbon offsetting for small businesses",
    tags: ["carbon credits", "climate tech", "sustainability", "marketplace"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Carbon Credit Marketplace for SMBs",
      "I want to create a marketplace that makes it easy for small businesses to purchase verified carbon credits and track their carbon neutrality progress. I have environmental science background, $12,000 budget, and can work full-time. The platform will focus on transparency, affordability, and measurable impact for climate-conscious SMBs."
    )
  },
  {
    id: 37,
    conceptTitle: "Sustainable Fashion Rental Platform",
    category: "sustainability",
    description: "Circular fashion economy through clothing rental",
    tags: ["sustainable fashion", "rental economy", "circular economy", "clothing"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Sustainable Fashion Rental Platform",
      "I want to launch a clothing rental platform focused on sustainable fashion brands, targeting environmentally conscious consumers who want to reduce textile waste. I have fashion industry experience, $15,000 budget, and can work full-time. The platform includes professional cleaning, style consultations, and rent-to-own options."
    )
  },
  {
    id: 38,
    conceptTitle: "Home Energy Optimization Service",
    category: "sustainability",
    description: "Smart home energy auditing and optimization",
    tags: ["energy efficiency", "smart home", "renewable energy", "home optimization"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Home Energy Optimization Service",
      "I want to start a service that helps homeowners optimize their energy usage through smart home technology, solar installations, and energy-efficient upgrades. I have electrical engineering background, $8,000 budget, and can work full-time. The service includes energy audits, smart device installation, and ongoing optimization."
    )
  },
  {
    id: 39,
    conceptTitle: "AI-Powered Learning Platform for Kids",
    category: "saas",
    description: "Personalized education technology for children",
    tags: ["EdTech", "AI", "children's education", "personalized learning"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "AI-Powered Learning Platform for Kids",
      "I want to create an AI-powered learning platform that adapts to each child's learning style and pace, making education more engaging and effective. I have education and tech background, $18,000 budget, and can work full-time. The platform covers core subjects with gamification, progress tracking, and parent insights."
    )
  },
  {
    id: 40,
    conceptTitle: "Professional Skills Bootcamp",
    category: "consulting",
    description: "Intensive training for in-demand digital skills",
    tags: ["skills training", "bootcamp", "professional development", "career transition"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Professional Skills Bootcamp",
      "I want to start intensive bootcamp programs teaching high-demand skills like AI prompt engineering, no-code development, and digital marketing to professionals looking to upskill. I have training and business background, $7,000 budget, and can work full-time. Programs will be project-based with job placement assistance."
    )
  },
  {
    id: 41,
    conceptTitle: "Language Learning for Remote Workers",
    category: "saas",
    description: "Business-focused language learning with cultural context",
    tags: ["language learning", "remote work", "business communication", "cultural training"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Language Learning for Remote Workers",
      "I want to develop a language learning platform specifically for remote workers who need to communicate effectively in international business settings. I have linguistics background, $10,000 budget, and can work full-time. The platform focuses on business communication, cultural awareness, and virtual meeting skills."
    )
  },
  {
    id: 42,
    conceptTitle: "Neighborhood Social Network",
    category: "local",
    description: "Hyperlocal community platform for neighbors",
    tags: ["community building", "social network", "local services", "neighborhood"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Neighborhood Social Network",
      "I want to create a social network app that connects neighbors for local recommendations, community events, skill sharing, and mutual aid. I have community organizing experience, $8,000 budget, and can work full-time. The platform emphasizes safety, verification, and building stronger local communities."
    )
  },
  {
    id: 43,
    conceptTitle: "Mobile Car Care Service",
    category: "local",
    description: "On-demand automotive maintenance and detailing",
    tags: ["automotive", "mobile service", "convenience", "on-demand"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Mobile Car Care Service",
      "I want to start a mobile car care service that comes to customers' locations for routine maintenance, detailing, and minor repairs. I have automotive experience, $12,000 budget for equipment and vehicle, and can work full-time. The service targets busy professionals and includes electric vehicle specialization."
    )
  },
  {
    id: 44,
    conceptTitle: "Senior Tech Support Service",
    category: "local",
    description: "Patient technology help for elderly users",
    tags: ["senior services", "tech support", "elderly care", "digital literacy"],
    difficulty: "Easy",
    steps: generateStandardSteps(
      "Senior Tech Support Service",
      "I want to start a business providing patient, in-home technology support for seniors who struggle with smartphones, tablets, and smart home devices. I have customer service background, $3,000 budget, and can start part-time. Services include device setup, training, and ongoing support with a focus on safety and simplicity."
    )
  },
  {
    id: 45,
    conceptTitle: "Micro-Investment App for Gen Z",
    category: "saas",
    description: "Social investing platform for young investors",
    tags: ["fintech", "micro-investing", "Gen Z", "social investing"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Micro-Investment App for Gen Z",
      "I want to create a micro-investment app that makes investing accessible and social for Gen Z users through fractional shares, gamification, and peer learning. I have fintech experience, $25,000+ budget, and can work full-time. The app includes investment education, social features, and integration with popular payment apps."
    )
  },
  {
    id: 46,
    conceptTitle: "Freelancer Financial Management",
    category: "saas",
    description: "All-in-one financial platform for independent contractors",
    tags: ["freelancer tools", "financial management", "gig economy", "accounting"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Freelancer Financial Management",
      "I want to build a financial management platform specifically for freelancers and independent contractors, including invoicing, expense tracking, tax preparation, and retirement planning. I have accounting background, $15,000 budget, and can work full-time. The platform addresses the unique financial challenges of gig economy workers."
    )
  },
  {
    id: 47,
    conceptTitle: "Telemedicine Platform for Rural Areas",
    category: "health",
    description: "Bridge healthcare gaps in underserved communities",
    tags: ["telemedicine", "rural healthcare", "health equity", "digital health"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Telemedicine Platform for Rural Areas",
      "I want to create a telemedicine platform specifically designed for rural and underserved communities, with features like mobile connectivity optimization and local health worker integration. I have healthcare and tech background, $20,000+ budget, and can work full-time. The goal is to improve healthcare access where traditional services are limited."
    )
  },
  {
    id: 48,
    conceptTitle: "Pet Health Monitoring Service",
    category: "health",
    description: "Tech-enabled preventive care for pets",
    tags: ["pet health", "wearable tech", "veterinary care", "AI monitoring"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Pet Health Monitoring Service",
      "I want to launch a service that uses wearable devices and AI to monitor pet health, detect early signs of illness, and provide personalized care recommendations to pet owners. I have veterinary background, $12,000 budget, and can work full-time. The service includes vet consultations and emergency alerts for pet health issues."
    )
  },
  {
    id: 49,
    conceptTitle: "AI Resume Builder & Career Coach",
    category: "saas",
    description: "AI-powered resume optimization and career guidance platform",
    tags: ["AI", "career services", "job search", "professional development"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "AI Resume Builder & Career Coach",
      "I want to create an AI-powered platform that helps job seekers optimize their resumes, prepare for interviews, and get personalized career advice. I have HR and tech background, $8,000 budget, and can work full-time. The platform analyzes job descriptions, suggests improvements, and provides industry-specific guidance for career advancement."
    )
  },
  {
    id: 50,
    conceptTitle: "Podcast Production Agency",
    category: "creator",
    description: "Full-service podcast creation and management for businesses and creators",
    tags: ["podcasting", "audio production", "content creation", "business services"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Podcast Production Agency",
      "I want to start an agency that handles everything for clients who want to launch podcasts: recording, editing, show notes, distribution, and promotion. I have audio production experience, $6,000 budget for equipment, and can work full-time. Target clients are thought leaders, businesses, and creators who want professional podcast production without the technical hassle."
    )
  },
  {
    id: 51,
    conceptTitle: "Smart Home Installation Service",
    category: "local",
    description: "Professional setup and integration of smart home devices",
    tags: ["smart home", "IoT", "home automation", "local services"],
    difficulty: "Easy",
    steps: generateStandardSteps(
      "Smart Home Installation Service",
      "I want to offer professional smart home installation and setup services for homeowners who want automation but find it overwhelming. I have technical skills, $4,000 budget for tools and marketing, and can start part-time. Services include device installation, network optimization, automation setup, and ongoing support for smart homes."
    )
  },
  {
    id: 52,
    conceptTitle: "B2B Lead Generation SaaS",
    category: "saas",
    description: "Automated lead finding and qualification for B2B sales teams",
    tags: ["B2B", "sales automation", "lead generation", "AI"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "B2B Lead Generation SaaS",
      "I want to build a SaaS tool that uses AI to find, qualify, and enrich B2B leads automatically by scraping LinkedIn, company websites, and databases. I have sales and tech background, $15,000 budget, and can work full-time. The platform provides verified contact info, company insights, and personalized outreach suggestions for sales teams."
    )
  },
  {
    id: 53,
    conceptTitle: "Sustainable Meal Prep Service",
    category: "local",
    description: "Locally-sourced meal prep with eco-friendly packaging",
    tags: ["food service", "sustainability", "meal prep", "local business"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Sustainable Meal Prep Service",
      "I want to start a meal prep business that sources ingredients from local farms, uses compostable packaging, and delivers healthy, ready-to-eat meals. I have culinary background, $10,000 budget for kitchen equipment and initial inventory, and can work full-time. Target customers are health-conscious professionals who care about sustainability and convenience."
    )
  },
  {
    id: 54,
    conceptTitle: "Virtual Assistant Matching Platform",
    category: "saas",
    description: "Connect businesses with vetted virtual assistants worldwide",
    tags: ["remote work", "marketplace", "virtual assistants", "gig economy"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Virtual Assistant Matching Platform",
      "I want to create a platform that matches businesses with pre-vetted virtual assistants based on skills, timezone, and budget. I have marketplace experience, $12,000 budget, and can work full-time. The platform includes skill assessments, time tracking, payment processing, and quality guarantees to make hiring VAs seamless for small businesses."
    )
  },
  {
    id: 55,
    conceptTitle: "Children's Coding Bootcamp",
    category: "consulting",
    description: "After-school and summer coding programs for kids",
    tags: ["education", "coding", "children", "STEM"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Children's Coding Bootcamp",
      "I want to launch coding classes for kids ages 8-16, teaching programming through game development, robotics, and web design. I have teaching and programming background, $5,000 budget for equipment and curriculum, and can start part-time. Classes will be offered after-school, weekends, and summer camps with both in-person and virtual options."
    )
  },
  {
    id: 56,
    conceptTitle: "Influencer CRM Platform",
    category: "creator",
    description: "Relationship management tool for influencers and brand partnerships",
    tags: ["influencer marketing", "CRM", "creator tools", "brand partnerships"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Influencer CRM Platform",
      "I want to build a CRM specifically designed for influencers to manage brand relationships, track partnerships, organize contracts, and measure campaign performance. I have SaaS experience, $10,000 budget, and can work full-time. The platform helps creators professionalize their business operations and maximize partnership revenue."
    )
  },
  {
    id: 57,
    conceptTitle: "Electric Vehicle Charging Network",
    category: "sustainability",
    description: "Install and operate EV charging stations in strategic locations",
    tags: ["EV infrastructure", "sustainability", "charging stations", "clean energy"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Electric Vehicle Charging Network",
      "I want to install and operate electric vehicle charging stations in underserved areas like apartment complexes, offices, and retail centers. I have business development background, $30,000+ budget for equipment, and can work full-time. Revenue comes from charging fees, advertising on stations, and partnerships with property owners."
    )
  },
  {
    id: 58,
    conceptTitle: "Niche Job Board Platform",
    category: "saas",
    description: "Specialized job board for specific industry or skill set",
    tags: ["job board", "recruitment", "niche market", "marketplace"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Niche Job Board Platform",
      "I want to create a job board focused on a specific niche (e.g., remote design jobs, sustainability careers, Web3 roles) where employers pay to post and talent gets curated opportunities. I have recruitment experience, $6,000 budget, and can work full-time. The platform emphasizes quality over quantity with verified companies and skilled professionals."
    )
  },
  {
    id: 59,
    conceptTitle: "Personal Branding Consultancy",
    category: "consulting",
    description: "Help professionals build their personal brand online",
    tags: ["personal branding", "social media", "career development", "consulting"],
    difficulty: "Easy",
    steps: generateStandardSteps(
      "Personal Branding Consultancy",
      "I want to start a consultancy helping professionals (executives, entrepreneurs, experts) build their personal brand on LinkedIn and other platforms. I have marketing background, $3,000 budget, and can start part-time. Services include brand strategy, content creation guidance, profile optimization, and engagement coaching to increase visibility and opportunities."
    )
  },
  {
    id: 60,
    conceptTitle: "Smart Vending Machine Business",
    category: "ecommerce",
    description: "Modern vending machines with healthy snacks and tech products",
    tags: ["vending machines", "passive income", "retail", "automation"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Smart Vending Machine Business",
      "I want to operate smart vending machines stocked with healthy snacks, tech accessories, and local products in high-traffic locations like gyms, offices, and universities. I have $15,000 budget for machines and initial inventory, and can manage part-time. Machines accept mobile payments and provide real-time inventory tracking for efficient operations."
    )
  }
];
