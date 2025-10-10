// Demo data seeding utilities for the services demo

export type DemoScenario = {
  id: string;
  name: string;
  industry: string;
  icon: string;
  description: string;
  businessData: {
    businessName: string;
    overview: string;
    market: string;
    problem: string;
    solution: string;
    pricing: string;
    goals: string;
    uniqueValue: string;
    competition: string;
  };
  chatHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  successScore?: number;
};

export const demoScenarios: DemoScenario[] = [
  {
    id: 'tech-startup',
    name: 'CloudFlow Analytics',
    industry: 'Technology',
    icon: '💻',
    description: 'SaaS platform for real-time business analytics',
    businessData: {
      businessName: 'CloudFlow Analytics',
      overview: 'We provide real-time business analytics through an intuitive SaaS platform that helps SMBs make data-driven decisions without needing a data science team.',
      market: 'Small to medium-sized businesses (10-500 employees) across tech, e-commerce, and professional services who struggle with expensive enterprise analytics tools.',
      problem: 'Small businesses generate tons of data but can\'t afford enterprise analytics platforms that cost $10K+/month and require dedicated data teams to operate.',
      solution: 'CloudFlow provides plug-and-play analytics with AI-powered insights, automatic report generation, and real-time dashboards at 1/10th the cost of enterprise solutions.',
      pricing: '$99/month per user with unlimited data sources and AI-generated insights. Annual plans get 20% off.',
      goals: 'Launch MVP in 90 days, acquire 100 beta users in first 3 months, reach $10K MRR by month 6, and achieve product-market fit with <5% monthly churn.',
      uniqueValue: 'Our AI automatically identifies business insights and opportunities without users needing to build complex queries. It speaks in plain English, not SQL.',
      competition: 'Competing against Tableau ($70/user/month), PowerBI ($10/user/month), and Google Data Studio (free but complex). We differentiate with AI insights and simplicity.'
    },
    chatHistory: [
      {
        role: 'assistant',
        content: 'Welcome! I\'m excited to help you build your business plan. Let\'s start with the big picture - what problem does CloudFlow Analytics solve for your customers?'
      },
      {
        role: 'user',
        content: 'Small businesses generate tons of data but can\'t afford enterprise analytics platforms that cost $10K+/month and require dedicated data teams.'
      },
      {
        role: 'assistant',
        content: 'That\'s a real pain point! 📊 SMBs are drowning in data but can\'t make sense of it. Now, who exactly are your ideal customers? Paint me a picture of them.'
      },
      {
        role: 'user',
        content: 'Small to medium-sized businesses with 10-500 employees, primarily in tech, e-commerce, and professional services sectors.'
      }
    ],
    successScore: 87
  },
  {
    id: 'creative-agency',
    name: 'Pixel Perfect Studios',
    industry: 'Creative Services',
    icon: '🎨',
    description: 'Subscription-based unlimited design services',
    businessData: {
      businessName: 'Pixel Perfect Studios',
      overview: 'We offer unlimited design services on a monthly subscription for startups and SMBs who need consistent, professional design work without hiring full-time designers.',
      market: 'Startups, tech companies, and SMBs with $50K-$5M revenue who need ongoing design work but can\'t justify a full-time designer\'s $80K+ salary.',
      problem: 'Quality design is expensive and slow. Agencies charge $10K+ per project, freelancers are inconsistent, and full-time designers cost $80K+/year plus benefits.',
      solution: 'Unlimited design requests for a flat monthly fee. Average 48-hour turnaround on most requests. Pause or cancel anytime. All design file formats included.',
      pricing: '$2,500/month for unlimited requests, one request at a time. $4,500/month for simultaneous requests. No setup fees or contracts.',
      goals: 'Sign 10 recurring clients in first 90 days, reach $25K MRR by month 4, maintain 90%+ client retention rate, and hire 2nd designer by month 6.',
      uniqueValue: 'Predictable monthly cost, no project scoping delays, dedicated designer who learns your brand, unlimited revisions until you\'re 100% satisfied.',
      competition: 'Competing against Design Pickle ($499-$995/mo, limited types), 99designs (per-project, $299+), and hiring in-house. We offer higher quality than Design Pickle at better value than hiring.'
    },
    chatHistory: [
      {
        role: 'assistant',
        content: 'Hey there! Let\'s build something amazing together. Tell me about Pixel Perfect Studios - what makes it special?'
      },
      {
        role: 'user',
        content: 'We provide unlimited design services for a flat monthly fee, helping startups get professional design without hiring full-time designers.'
      },
      {
        role: 'assistant',
        content: 'Love the subscription model! 🎨 Who\'s your dream client? Who needs this the most?'
      }
    ],
    successScore: 82
  },
  {
    id: 'ecommerce',
    name: 'EcoStyle Boutique',
    industry: 'E-commerce',
    icon: '🛍️',
    description: 'Sustainable fashion marketplace',
    businessData: {
      businessName: 'EcoStyle Boutique',
      overview: 'A curated online marketplace connecting eco-conscious shoppers with verified sustainable fashion brands. Every brand is vetted for environmental and ethical practices.',
      market: 'Eco-conscious millennials and Gen Z (ages 22-40) in urban areas, household income $50K+, who actively seek sustainable alternatives but struggle to find trustworthy options.',
      problem: 'It\'s nearly impossible to verify if fashion brands are truly sustainable. Greenwashing is rampant, research is time-consuming, and eco-friendly options are scattered across hundreds of small brands.',
      solution: 'We do the vetting work for customers. Every brand on our platform meets strict sustainability criteria. Shoppers can browse beautiful fashion knowing every item is genuinely eco-friendly.',
      pricing: 'Items range from $50-$300. We take 20% commission on all sales. Brands pay no listing fees, just commission on what sells.',
      goals: 'Partner with 50 sustainable brands by month 3, achieve $50K in GMV (gross merchandise value) by month 6, acquire 5,000 newsletter subscribers, and reach profitability at $100K monthly GMV.',
      uniqueValue: 'Every brand is manually vetted against 10+ sustainability criteria. We provide detailed transparency reports for each brand. No greenwashing, guaranteed.',
      competition: 'Competing against Etsy (not focused on sustainability), mainstream retailers adding "eco" lines (greenwashing), and individual sustainable brands. We aggregate the best options in one trustworthy place.'
    },
    chatHistory: [
      {
        role: 'assistant',
        content: 'Welcome! I love sustainable businesses. Tell me what EcoStyle Boutique is all about.'
      },
      {
        role: 'user',
        content: 'We\'re building a marketplace for verified sustainable fashion brands. Every brand is vetted to prevent greenwashing.'
      }
    ],
    successScore: 79
  },
  {
    id: 'food-beverage',
    name: 'BrewCraft Mobile',
    industry: 'Food & Beverage',
    icon: '☕',
    description: 'Mobile specialty coffee bar',
    businessData: {
      businessName: 'BrewCraft Mobile',
      overview: 'High-end mobile coffee bar serving specialty coffee at corporate offices, events, and farmers markets. We bring third-wave coffee experience directly to customers.',
      market: 'Corporate offices (50+ employees) in business districts, weekend events/markets, and private parties. Target customers value quality coffee and are willing to pay premium prices.',
      problem: 'Office workers are tired of mediocre office coffee but don\'t have time to wait 15 minutes at the local cafe. Event organizers want quality coffee but don\'t want to compromise on experience.',
      solution: 'We bring barista-quality specialty coffee directly to offices and events with our custom-built mobile bar. Same quality as top cafes, none of the wait time or travel.',
      pricing: 'Corporate: $350/visit (50+ drinks), $1,500/week for 3 visits. Events: $500 minimum + $6-8 per drink. Private: $750 minimum for 2 hours.',
      goals: 'Secure 5 corporate clients with weekly service by month 3, book 8+ events per month by month 4, generate $15K revenue by month 3, expand to second vehicle by month 8.',
      uniqueValue: 'We use top-tier equipment (espresso machine worth $15K), source single-origin specialty beans, and our baristas are trained at third-wave coffee shops. Quality rivals the best cafes.',
      competition: 'Competing against office K-cups (cheap but terrible), nearby cafes (quality but inconvenient), and catering companies (fast but low quality). We combine the best of all worlds.'
    },
    chatHistory: [
      {
        role: 'assistant',
        content: 'Welcome! ☕ Let\'s brew up an amazing business plan. What\'s the concept behind BrewCraft Mobile?'
      }
    ],
    successScore: 75
  }
];

export const getDemoScenario = (scenarioId: string): DemoScenario | undefined => {
  return demoScenarios.find(s => s.id === scenarioId);
};

export const getRandomScenario = (): DemoScenario => {
  return demoScenarios[Math.floor(Math.random() * demoScenarios.length)];
};

// Sample community posts for demo
export const demoCommunityPosts = [
  {
    id: 'demo-1',
    title: '🚀 Just launched my MVP!',
    content: 'After 3 months of development, CloudFlow Analytics is live! Got our first 5 beta users and the feedback is amazing. The AI insights feature is getting the most love.',
    upvotes: 47,
    comments: 12,
    author: 'Alex Chen',
    tags: ['Launch', 'SaaS', 'Analytics']
  },
  {
    id: 'demo-2',
    title: '💡 Pricing strategy advice needed',
    content: 'Working on subscription design service. Debating between $1,999/mo (unlimited) vs tiered pricing ($999, $1,999, $3,999). What do you think works better for design services?',
    upvotes: 34,
    comments: 18,
    author: 'Sarah Martinez',
    tags: ['Pricing', 'Design', 'Advice']
  }
];

// Sample sprint tasks for demo
export const demoSprintTasks = [
  {
    id: 'task-1',
    title: 'Set up landing page with email capture',
    status: 'completed',
    priority: 'high',
    category: 'Marketing'
  },
  {
    id: 'task-2',
    title: 'Create product demo video',
    status: 'in-progress',
    priority: 'high',
    category: 'Marketing'
  },
  {
    id: 'task-3',
    title: 'Reach out to 50 potential beta users',
    status: 'todo',
    priority: 'medium',
    category: 'Sales'
  }
];

// Sample market trends for demo
export const demoMarketTrends = [
  {
    id: 'trend-1',
    title: 'AI-powered analytics seeing 300% growth',
    summary: 'SMB adoption of AI analytics tools has tripled in the past 12 months as prices become more accessible.',
    relevance: 'high',
    opportunity: 'Market timing is perfect for CloudFlow entry'
  },
  {
    id: 'trend-2',
    title: 'Subscription fatigue concerns growing',
    summary: 'Consumers report subscription overload, but B2B SaaS remains strong with 92% retention rates.',
    relevance: 'medium',
    opportunity: 'Focus on ROI messaging to justify subscription'
  }
];
