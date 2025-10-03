/**
 * Creative Entrepreneur Response Templates
 * 
 * Industry-specific templates that embody the 7 principles for BizMap AI
 */

export interface IndustryTemplate {
  industry: string;
  welcomeMessage: string;
  problemValidation: string[];
  solutionExamples: string[];
  pricingGuidance: string;
  marketingChannels: string[];
  commonChallenges: string[];
  quickWins: string[];
}

export const creativeIndustryTemplates: Record<string, IndustryTemplate> = {
  technology: {
    industry: 'Technology / Software',
    welcomeMessage: "Tech is exciting! Whether you're building an app, SaaS tool, or digital product, I'm here to help you validate your idea and find your first users.",
    problemValidation: [
      "What frustration are you trying to eliminate for your users?",
      "How are people solving this problem today without your solution?",
      "What makes this problem worth solving right now?"
    ],
    solutionExamples: [
      "A no-code tool that makes X easier for Y professionals",
      "An automation that saves Z industry 10 hours per week",
      "A mobile app that connects A with B in real-time"
    ],
    pricingGuidance: "Most tech products use subscription pricing ($9-99/mo for B2C, $49-299/mo for B2B). Start with a simple free trial or freemium model to build trust.",
    marketingChannels: [
      "Product Hunt launch for tech-savvy early adopters",
      "LinkedIn content for B2B products",
      "Reddit communities where your target users hang out",
      "Twitter/X for building in public and attracting feedback",
      "YouTube tutorials showing your product solving real problems"
    ],
    commonChallenges: [
      "Finding product-market fit before scaling",
      "Choosing between features vs. shipping fast",
      "Pricing without undervaluing your work",
      "Getting visible in a crowded market"
    ],
    quickWins: [
      "Create a landing page this week to test interest",
      "Interview 10 potential users about their pain points",
      "Build a super simple MVP - one core feature that works",
      "Join 3 online communities where your users are active"
    ]
  },

  creative_services: {
    industry: 'Creative Services (Design, Writing, Photography, etc.)',
    welcomeMessage: "Creative work is your superpower! Let's build a business that lets you do what you love while attracting clients who truly value your craft.",
    problemValidation: [
      "What gap do you see in the current creative market?",
      "What frustrates your ideal clients about working with other creatives?",
      "What unique perspective or style do you bring to your work?"
    ],
    solutionExamples: [
      "Brand identity design for eco-conscious startups",
      "Content writing for SaaS companies that hate boring copy",
      "Event photography that captures candid, emotional moments",
      "UI/UX design specifically for mental health apps"
    ],
    pricingGuidance: "Many creatives start by underpricing. Try package pricing ($500, $2000, $5000) instead of hourly rates. It values your expertise, not just your time. Include 2-3 revision rounds to set boundaries.",
    marketingChannels: [
      "Instagram/TikTok showcasing your process and personality",
      "Behance or Dribbble portfolio for design work",
      "Medium articles about your creative philosophy",
      "Local networking events and creative meetups",
      "Referral program - happy clients are your best marketers",
      "Collaborate with complementary creatives (photographers + designers)"
    ],
    commonChallenges: [
      "Setting boundaries with client requests",
      "Inconsistent income from project to project",
      "Attracting the right clients vs. anyone who pays",
      "Balancing creative integrity with client needs"
    ],
    quickWins: [
      "Define your niche in one sentence (example: 'Playful branding for wellness brands')",
      "Create 3 package options with clear deliverables",
      "Reach out to 5 past clients for testimonials",
      "Post one piece of work with the story behind it this week"
    ]
  },

  food_beverage: {
    industry: 'Food & Beverage',
    welcomeMessage: "Food brings people together! Whether it's a food truck, catering service, or packaged product, let's create something people will crave.",
    problemValidation: [
      "What food experience is missing in your area or market?",
      "What dietary need or preference is underserved?",
      "What emotional connection or memory does your food create?"
    ],
    solutionExamples: [
      "Plant-based comfort food for busy professionals",
      "Authentic [cuisine] catering for corporate events",
      "Specialty coffee shop that doubles as a coworking space",
      "Meal prep service for families with picky eaters"
    ],
    pricingGuidance: "Food costs (ingredients + packaging) should be 25-35% of your menu price. Don't forget labor and overhead! Start with 3-5 hero items priced at $8-15 (retail) or $50-120/person (catering). Test pricing with pop-ups before committing.",
    marketingChannels: [
      "Instagram/TikTok with mouth-watering food photos and videos",
      "Local food festivals and farmers markets",
      "Google My Business for local search",
      "Partnerships with local businesses (coffee shop sells your pastries)",
      "Word of mouth from sampling events",
      "Food influencer collaborations"
    ],
    commonChallenges: [
      "Food safety regulations and permits (varies by location)",
      "Managing food waste and inventory",
      "Seasonal ingredient availability and pricing fluctuations",
      "Building consistent customer habits"
    ],
    quickWins: [
      "Host a tasting event with 20-30 people for honest feedback",
      "Calculate exact food costs for your top 3 menu items",
      "Get 3 health department or permit questions answered this week",
      "Create a signature dish that photographs beautifully"
    ]
  },

  coaching_consulting: {
    industry: 'Coaching / Consulting',
    welcomeMessage: "Your expertise can transform lives or businesses! Let's package your knowledge in a way that attracts the right clients and creates real impact.",
    problemValidation: [
      "What transformation do you help people achieve?",
      "What's the cost of NOT solving this problem for your clients?",
      "What makes your approach different from other coaches/consultants?"
    ],
    solutionExamples: [
      "Career coaching for tech professionals seeking leadership roles",
      "Business consulting for product-based businesses scaling to $1M",
      "Life coaching for entrepreneurs battling burnout",
      "Financial coaching for creative freelancers"
    ],
    pricingGuidance: "Coaching/consulting often ranges from $150-500/session (1-on-1) or $1500-5000 for packages (8-12 weeks). Don't sell single sessions - packages create commitment and better results. Consider group programs at $500-1500/person for leverage.",
    marketingChannels: [
      "LinkedIn content demonstrating your expertise",
      "Free discovery calls that showcase your value",
      "Webinars or workshops on your signature topic",
      "Podcast guesting in your niche",
      "Case studies and client transformations",
      "Referral partnerships with complementary service providers"
    ],
    commonChallenges: [
      "Proving ROI when outcomes are intangible",
      "Trading time for money without scalability",
      "Overcoming 'anyone can be a coach' skepticism",
      "Finding clients who can afford and commit to your services"
    ],
    quickWins: [
      "Define your ideal client in detail (be specific!)",
      "Create a signature framework or process (3-5 steps)",
      "Offer 5 free discovery calls to test your positioning",
      "Write 3 LinkedIn posts about client transformations this week"
    ]
  },

  ecommerce_retail: {
    industry: 'E-commerce / Retail',
    welcomeMessage: "Selling physical products is both art and science! Let's figure out what you're selling, who's buying, and how to make it profitable.",
    problemValidation: [
      "What product gap are you filling in the market?",
      "Why would someone choose your product over alternatives?",
      "What emotional benefit does your product provide?"
    ],
    solutionExamples: [
      "Sustainable home goods for eco-conscious millennials",
      "Niche hobby supplies that big box stores don't carry",
      "Curated gift boxes for [specific occasion or persona]",
      "Custom or personalized products that big brands can't offer"
    ],
    pricingGuidance: "Aim for 2.5-4x markup on cost of goods sold (COGS). If an item costs you $10 to make/buy, sell it for $25-40. Factor in shipping, payment processing (3%), returns, and advertising costs (15-30% of revenue for DTC brands).",
    marketingChannels: [
      "Instagram/TikTok shop with shoppable posts",
      "Pinterest for discovery-driven products",
      "Etsy or Shopify depending on product type",
      "Email marketing for repeat purchases",
      "Influencer partnerships or affiliate programs",
      "Pop-up shops and local markets for brand building"
    ],
    commonChallenges: [
      "Managing inventory without overbuying",
      "Shipping costs eating into margins",
      "Competing with Amazon or big box stores on price",
      "Getting discovered in a crowded online marketplace"
    ],
    quickWins: [
      "Calculate true cost per unit including all hidden fees",
      "Set up a simple Shopify or Etsy store this week",
      "Get 10 product photos taken (phone is fine!)",
      "Test one product with friends/family and collect detailed feedback"
    ]
  },

  health_wellness: {
    industry: 'Health & Wellness',
    welcomeMessage: "Health and wellness is deeply personal. Let's create a business that helps people feel better while building something sustainable for you.",
    problemValidation: [
      "What health struggle or wellness gap are you addressing?",
      "How are people currently trying to solve this? What's not working?",
      "What qualifications or personal experience make you credible?"
    ],
    solutionExamples: [
      "Virtual yoga classes for desk workers with back pain",
      "Nutrition coaching for busy parents",
      "Mental health app for entrepreneur burnout",
      "Functional fitness training for people over 50"
    ],
    pricingGuidance: "Wellness services range widely: Group classes $15-30/session, 1-on-1 sessions $60-150/hour, Online programs $99-399 one-time or $29-99/month. Start with package deals (10-session bundles) to encourage commitment.",
    marketingChannels: [
      "Instagram/YouTube with helpful wellness tips and client wins",
      "Local partnerships (gyms, health food stores, offices)",
      "Free community workshops or challenges",
      "Google My Business for local wellness searches",
      "Client testimonials and transformation stories",
      "Wellness podcasts and blogs as a guest expert"
    ],
    commonChallenges: [
      "Building trust and credibility in a skeptical market",
      "Managing liability and insurance requirements",
      "Balancing personalized service with scalability",
      "Navigating health claims regulations"
    ],
    quickWins: [
      "Define your specific wellness niche (be ultra-specific)",
      "Create one free valuable resource (guide, video, challenge)",
      "Research insurance and certification requirements in your area",
      "Host a free workshop or class for 10-15 people"
    ]
  },

  education_training: {
    industry: 'Education & Training',
    welcomeMessage: "Teaching is one of the most rewarding businesses! Let's package your knowledge so others can learn and you can scale beyond 1-on-1 teaching.",
    problemValidation: [
      "What skill or knowledge gap are you helping people fill?",
      "What's the transformation students experience after learning from you?",
      "Why are existing educational options not working for your audience?"
    ],
    solutionExamples: [
      "Online course teaching [specific skill] to [specific audience]",
      "In-person workshops for hands-on learning experiences",
      "Membership community with ongoing training and support",
      "Corporate training programs for upskilling teams"
    ],
    pricingGuidance: "Education pricing varies by format: Online courses $97-997, Live cohort programs $500-3000, Corporate training $2000-10,000/day, Membership $29-99/month. Higher prices = higher perceived value + more committed students = better outcomes.",
    marketingChannels: [
      "YouTube tutorials that establish expertise",
      "Free mini-course or webinar as a funnel",
      "LinkedIn for B2B training programs",
      "Course platforms like Teachable, Thinkific, or Kajabi",
      "Student success stories and case studies",
      "Partnerships with complementary educators"
    ],
    commonChallenges: [
      "Creating engaging curriculum that leads to outcomes",
      "Scaling beyond trading time for money",
      "Managing student expectations and support needs",
      "Proving value and ROI to students or companies"
    ],
    quickWins: [
      "Outline your signature course or program (3-8 modules)",
      "Teach your concept to 5 beta students for feedback",
      "Create one free YouTube or LinkedIn video this week",
      "Write down 10 outcomes your students will achieve"
    ]
  }
};

// Imposter Syndrome & Encouragement Responses
export const imposterSyndromeResponses = [
  "It's completely normal to feel like you don't know enough. Every successful entrepreneur has felt this way. The fact that you're thinking critically about your business is actually a great sign!",
  "Here's a secret: You don't need to have everything figured out before you start. You'll learn 10x more by doing than by planning perfectly. Let's focus on one small step you can take this week.",
  "Imposter syndrome loves to show up right when you're about to do something brave. The cure? Action. What's one tiny thing you could test this week to prove your idea has legs?",
  "Remember: Your customers don't need you to be perfect. They need you to solve their problem better than the current options. That's it. Do you think you can do that?",
  "Most successful businesses were started by people who felt 'not ready yet.' The difference? They started anyway. What if we focus less on being ready and more on learning fast?"
];

// Conversation Flow Examples
export const conversationFlowExamples = {
  discovery: {
    botOpening: "Hey! I'm excited to help you build your business. Let's start simple - what kind of business are you thinking about? (Don't worry about having all the details figured out yet!)",
    userResponses: [
      "I want to start a coffee shop",
      "I'm thinking about doing freelance graphic design",
      "Not sure yet, just exploring"
    ],
    botFollowUp: "Love that! [industry] can be really rewarding. What's drawing you to this? Is it something you're passionate about, or did you spot a gap in the market?",
    principle: "USER EXPERIENCE - Start with curiosity, not interrogation"
  },
  
  problem_validation: {
    botOpening: "Let's dig into the problem you're solving. The stronger the problem, the easier everything else becomes. What frustration or pain point would your business address?",
    userResponses: [
      "People don't have good options for X",
      "My target customers are struggling with Y",
      "I'm not sure if there's a real problem"
    ],
    botFollowUp: "Okay, here's a helpful reframe: Think about your ideal customer on their worst day related to this problem. What are they feeling? What are they searching for? What have they already tried that didn't work?",
    principle: "QUALITY & COMPREHENSIVENESS - Guide them to think deeply"
  },

  pricing_strategy: {
    botOpening: "Money planning can feel awkward, but it's crucial! Let's figure out pricing that works for both you and your customers. What do you think people would pay for what you're offering?",
    userResponses: [
      "Maybe a certain amount",
      "I have no idea",
      "I don't want to charge too much"
    ],
    botFollowUp: "Here's what similar industry businesses typically charge in range. But more important than comparing is this - what would make this a no-brainer for your ideal customer? What value are they getting that's worth way more than they're paying?",
    principle: "AUTOMATION EFFICIENCY - Provide benchmarks to speed up decisions"
  },

  marketing_channels: {
    botOpening: "Getting your first customers is all about showing up where they already are. Where does your ideal customer spend their time online or offline?",
    userResponses: [
      "Social media I think",
      "Not sure",
      "Everywhere?"
    ],
    botFollowUp: "Let's get specific! If your ideal customer is taking a break at work, where are they scrolling? If they're looking for solutions on the weekend, what are they googling? Pick ONE channel to master first - it's better to be great at one place than mediocre everywhere.",
    principle: "COST-EFFECTIVENESS - Help them focus resources"
  }
};

// Language Translation Map
export const languageTranslationMap: Record<string, string> = {
  // Business jargon → Creative-friendly language
  "value proposition": "what makes you special",
  "unique selling proposition": "your unfair advantage",
  "target market": "your ideal customers",
  "target audience": "who you're helping",
  "customer segmentation": "different types of customers you serve",
  "market penetration": "getting your first customers",
  "go-to-market strategy": "your launch plan",
  "revenue model": "how you'll earn money",
  "business model": "how your business works",
  "competitive advantage": "what you do better than others",
  "market share": "your slice of the pie",
  "customer acquisition cost": "what it costs to get a customer",
  "lifetime value": "how much a customer is worth over time",
  "burn rate": "how fast you're spending money",
  "runway": "how long your money will last",
  "pivot": "change direction",
  "stakeholders": "people who care about your business",
  "key performance indicators": "numbers you're tracking",
  "metrics": "what you're measuring",
  "scalability": "ability to grow without breaking",
  "leverage": "use",
  "synergy": "teamwork",
  "ecosystem": "community",
  "bandwidth": "time and energy",
  "circle back": "revisit this later",
  "low-hanging fruit": "easy wins",
  "move the needle": "make real progress",
  "paradigm shift": "big change in thinking",
  "core competency": "what you're really good at"
};

// Export helper function to get translated language
export function translateJargon(text: string): string {
  let translated = text;
  Object.entries(languageTranslationMap).forEach(([jargon, friendly]) => {
    const regex = new RegExp(jargon, 'gi');
    translated = translated.replace(regex, friendly);
  });
  return translated;
}

// Export helper to get industry-specific template
export function getIndustryTemplate(industry: string): IndustryTemplate | null {
  const normalizedIndustry = industry.toLowerCase().replace(/\s+/g, '_');
  return creativeIndustryTemplates[normalizedIndustry] || null;
}
