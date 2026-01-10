// Pitch Deck Template Data

export interface PitchDeckTemplate {
  id: string;
  name: string;
  description: string;
  category: 'structure' | 'storytelling' | 'design' | 'industry-specific';
  stage: 'early-stage' | 'growth' | 'series-a' | 'series-b+';
  slideCount: number;
  slides: Array<{
    slideNumber: number;
    title: string;
    purpose: string;
    contentGuidelines: string[];
    designTips?: string[];
  }>;
  previewImage?: string;
  downloadUrl?: string;
  tags: string[];
}

export const PITCH_DECK_TEMPLATES: PitchDeckTemplate[] = [
  {
    id: 'problem-solution-basic',
    name: 'Problem-Solution Framework',
    description: 'Classic structure focusing on problem definition and solution clarity. Perfect for first-time founders.',
    category: 'structure',
    stage: 'early-stage',
    slideCount: 10,
    slides: [
      {
        slideNumber: 1,
        title: 'Cover Slide',
        purpose: 'Company name, tagline, contact',
        contentGuidelines: [
          'Company name and logo',
          'One-sentence tagline that describes what you do',
          'Your name and contact info',
          'Date (optional)'
        ],
        designTips: [
          'Keep it clean and professional',
          'Use high-quality logo',
          'Avoid cluttering with too much text'
        ]
      },
      {
        slideNumber: 2,
        title: 'Problem',
        purpose: 'Define the pain point you\'re solving',
        contentGuidelines: [
          'State the problem clearly in 1-2 sentences',
          'Show the impact (cost, time, frustration)',
          'Use a relatable example or story',
          'Avoid jargon - make it universal'
        ],
        designTips: [
          'Use visuals to illustrate the problem',
          'Consider before/after comparison',
          'Keep text minimal'
        ]
      },
      {
        slideNumber: 3,
        title: 'Solution',
        purpose: 'Introduce your product/service',
        contentGuidelines: [
          'Explain how you solve the problem',
          'Focus on benefits, not features',
          'Make it crystal clear what you do',
          'Use simple language'
        ],
        designTips: [
          'Product screenshot or demo',
          'Show the transformation',
          'Visual flow diagram'
        ]
      },
      {
        slideNumber: 4,
        title: 'Market Opportunity',
        purpose: 'Show market size and potential',
        contentGuidelines: [
          'TAM, SAM, SOM breakdown',
          'Market growth trends',
          'Target customer segment size',
          'Cite credible sources'
        ],
        designTips: [
          'Use charts or infographics',
          'Make numbers stand out',
          'Show upward trends'
        ]
      },
      {
        slideNumber: 5,
        title: 'Product',
        purpose: 'Deep dive into your product',
        contentGuidelines: [
          'Key features and benefits',
          'How it works (simplified)',
          'Unique value proposition',
          'Technology/innovation if relevant'
        ],
        designTips: [
          'Screenshots or product images',
          'User interface mockups',
          'Feature comparison table'
        ]
      },
      {
        slideNumber: 6,
        title: 'Traction',
        purpose: 'Prove market validation',
        contentGuidelines: [
          'User/customer metrics',
          'Revenue if applicable',
          'Growth rate',
          'Key milestones achieved',
          'Customer testimonials or logos'
        ],
        designTips: [
          'Growth charts',
          'Logo wall of customers',
          'Highlight impressive numbers'
        ]
      },
      {
        slideNumber: 7,
        title: 'Business Model',
        purpose: 'Explain how you make money',
        contentGuidelines: [
          'Revenue streams',
          'Pricing strategy',
          'Unit economics',
          'Customer acquisition cost (CAC)',
          'Lifetime value (LTV)'
        ],
        designTips: [
          'Revenue flow diagram',
          'Pricing tiers table',
          'Economics visualization'
        ]
      },
      {
        slideNumber: 8,
        title: 'Competition',
        purpose: 'Show competitive landscape',
        contentGuidelines: [
          'Main competitors',
          'Your differentiation',
          'Competitive advantages',
          'Market positioning'
        ],
        designTips: [
          'Competitive matrix',
          '2x2 positioning map',
          'Feature comparison table'
        ]
      },
      {
        slideNumber: 9,
        title: 'Team',
        purpose: 'Showcase founder expertise',
        contentGuidelines: [
          'Founder names and roles',
          'Relevant experience',
          'Domain expertise',
          'Advisor/investor names if notable'
        ],
        designTips: [
          'Professional headshots',
          'Clean layout',
          'Highlight key achievements'
        ]
      },
      {
        slideNumber: 10,
        title: 'Ask',
        purpose: 'State your funding ask',
        contentGuidelines: [
          'Amount raising',
          'Use of funds breakdown',
          'Milestones to be achieved',
          'Timeline'
        ],
        designTips: [
          'Pie chart for fund allocation',
          'Milestone timeline',
          'Clear call-to-action'
        ]
      }
    ],
    tags: ['beginner-friendly', 'pre-seed', 'seed', 'classic']
  },
  {
    id: 'traction-heavy',
    name: 'Traction-Heavy Deck',
    description: 'Lead with metrics and proof. Best for startups with strong early growth and revenue.',
    category: 'structure',
    stage: 'growth',
    slideCount: 12,
    slides: [
      {
        slideNumber: 1,
        title: 'Cover Slide',
        purpose: 'Company identity',
        contentGuidelines: [
          'Company name and logo',
          'Tagline',
          'Contact information'
        ]
      },
      {
        slideNumber: 2,
        title: 'Traction Highlight',
        purpose: 'Lead with your best metric',
        contentGuidelines: [
          'Most impressive growth metric',
          'Revenue number or user count',
          'Growth rate (MoM/YoY)',
          'Comparative context'
        ],
        designTips: [
          'Large, bold numbers',
          'Growth chart',
          'Comparison to benchmarks'
        ]
      },
      {
        slideNumber: 3,
        title: 'Problem',
        purpose: 'Context for the opportunity',
        contentGuidelines: [
          'The pain point',
          'Market validation of problem',
          'Current broken solutions'
        ]
      },
      {
        slideNumber: 4,
        title: 'Solution',
        purpose: 'Your product approach',
        contentGuidelines: [
          'How you solve it differently',
          'Core product functionality',
          'Key innovation'
        ]
      },
      {
        slideNumber: 5,
        title: 'Detailed Metrics',
        purpose: 'Full traction breakdown',
        contentGuidelines: [
          'Revenue metrics',
          'User metrics',
          'Engagement metrics',
          'Retention metrics',
          'Growth trajectory'
        ],
        designTips: [
          'Multiple charts',
          'Cohort analysis',
          'Unit economics'
        ]
      },
      {
        slideNumber: 6,
        title: 'Customer Proof',
        purpose: 'Show who uses you',
        contentGuidelines: [
          'Customer logos',
          'Case studies',
          'Testimonials',
          'Usage statistics'
        ]
      },
      {
        slideNumber: 7,
        title: 'Market',
        purpose: 'Size of opportunity',
        contentGuidelines: [
          'TAM/SAM/SOM',
          'Market trends',
          'Growth drivers'
        ]
      },
      {
        slideNumber: 8,
        title: 'Product Deep Dive',
        purpose: 'How it works',
        contentGuidelines: [
          'Product walkthrough',
          'Key features',
          'Technology moat'
        ]
      },
      {
        slideNumber: 9,
        title: 'Business Model',
        purpose: 'Path to profitability',
        contentGuidelines: [
          'Revenue model',
          'Unit economics',
          'CAC/LTV ratio',
          'Payback period'
        ]
      },
      {
        slideNumber: 10,
        title: 'Roadmap',
        purpose: 'Future vision',
        contentGuidelines: [
          'Product roadmap',
          'Expansion plans',
          'New revenue streams',
          'Geographic expansion'
        ]
      },
      {
        slideNumber: 11,
        title: 'Team',
        purpose: 'Execution capability',
        contentGuidelines: [
          'Founders and key hires',
          'Relevant experience',
          'Track record'
        ]
      },
      {
        slideNumber: 12,
        title: 'Ask & Use of Funds',
        purpose: 'Investment details',
        contentGuidelines: [
          'Round size',
          'Use of funds',
          'Milestones with funding',
          'Timeline to next milestone'
        ]
      }
    ],
    tags: ['growth-stage', 'revenue', 'series-a', 'metrics-focused']
  },
  {
    id: 'vision-driven',
    name: 'Vision-Driven Deck',
    description: 'Inspire with a bold vision. Ideal for moonshot ideas and transformative businesses.',
    category: 'storytelling',
    stage: 'early-stage',
    slideCount: 11,
    slides: [
      {
        slideNumber: 1,
        title: 'Cover Slide',
        purpose: 'Set the tone',
        contentGuidelines: [
          'Company name',
          'Bold tagline or mission',
          'Visually striking image'
        ],
        designTips: [
          'Dramatic imagery',
          'Inspiring visuals',
          'Strong typography'
        ]
      },
      {
        slideNumber: 2,
        title: 'The Vision',
        purpose: 'Paint the future',
        contentGuidelines: [
          'Your vision for the world',
          'What changes when you succeed',
          'The transformation you enable',
          'Think 10-20 years out'
        ],
        designTips: [
          'Aspirational imagery',
          'Before/after visualization',
          'Minimal text, maximum impact'
        ]
      },
      {
        slideNumber: 3,
        title: 'The Problem',
        purpose: 'Current state pain',
        contentGuidelines: [
          'What\'s broken today',
          'Why current solutions fail',
          'Urgency of the problem'
        ]
      },
      {
        slideNumber: 4,
        title: 'Why Now',
        purpose: 'Timing and trends',
        contentGuidelines: [
          'Technology enablers',
          'Market shifts',
          'Regulatory changes',
          'Consumer behavior trends'
        ]
      },
      {
        slideNumber: 5,
        title: 'The Solution',
        purpose: 'Your approach',
        contentGuidelines: [
          'How you\'re different',
          'Core innovation',
          'Why it will work now'
        ]
      },
      {
        slideNumber: 6,
        title: 'Product',
        purpose: 'Bring it to life',
        contentGuidelines: [
          'Product demo or mockup',
          'Key capabilities',
          'User experience'
        ]
      },
      {
        slideNumber: 7,
        title: 'Market Opportunity',
        purpose: 'Scale potential',
        contentGuidelines: [
          'Market size',
          'Growth trajectory',
          'Adjacent markets'
        ]
      },
      {
        slideNumber: 8,
        title: 'Traction',
        purpose: 'Early validation',
        contentGuidelines: [
          'Early adopters',
          'Partnerships',
          'Pilot programs',
          'Letters of intent'
        ]
      },
      {
        slideNumber: 9,
        title: 'Go-to-Market',
        purpose: 'Path to scale',
        contentGuidelines: [
          'Customer acquisition strategy',
          'Distribution channels',
          'Growth loops',
          'Network effects'
        ]
      },
      {
        slideNumber: 10,
        title: 'Team',
        purpose: 'Why you',
        contentGuidelines: [
          'Unique founder-market fit',
          'Unfair advantages',
          'Previous successes',
          'Commitment to the mission'
        ]
      },
      {
        slideNumber: 11,
        title: 'The Ask',
        purpose: 'Partner invitation',
        contentGuidelines: [
          'Investment ask',
          'What you\'ll achieve together',
          'Timeline to major milestones',
          'Vision of partnership'
        ]
      }
    ],
    tags: ['moonshot', 'pre-seed', 'seed', 'transformative', 'inspiring']
  },
  {
    id: 'product-demo',
    name: 'Product Demo Deck',
    purpose: 'Show, don\'t tell. Perfect for technical products with strong visual demos.',
    description: 'Product-first approach with heavy emphasis on demos and screenshots.',
    category: 'design',
    stage: 'early-stage',
    slideCount: 13,
    slides: [
      {
        slideNumber: 1,
        title: 'Cover Slide',
        purpose: 'Introduction',
        contentGuidelines: [
          'Company and product name',
          'One-line value prop',
          'Product screenshot'
        ]
      },
      {
        slideNumber: 2,
        title: 'Problem',
        purpose: 'User pain point',
        contentGuidelines: [
          'Specific user problem',
          'Current workflow pain',
          'Quantify the impact'
        ]
      },
      {
        slideNumber: 3,
        title: 'Solution Overview',
        purpose: 'Your approach',
        contentGuidelines: [
          'How your product solves it',
          'Core value proposition',
          'Why it\'s better'
        ]
      },
      {
        slideNumber: 4,
        title: 'Product Demo - Screen 1',
        purpose: 'Key feature showcase',
        contentGuidelines: [
          'Main dashboard or interface',
          'Primary use case',
          'Clear annotations',
          'Focus on user benefit'
        ],
        designTips: [
          'High-quality screenshot',
          'Annotate key features',
          'Show real data',
          'Minimize surrounding text'
        ]
      },
      {
        slideNumber: 5,
        title: 'Product Demo - Screen 2',
        purpose: 'Feature deep dive',
        contentGuidelines: [
          'Key differentiating feature',
          'How it works',
          'User workflow'
        ],
        designTips: [
          'Step-by-step visuals',
          'User flow diagram',
          'Before/after comparison'
        ]
      },
      {
        slideNumber: 6,
        title: 'Product Demo - Screen 3',
        purpose: 'Advanced capabilities',
        contentGuidelines: [
          'Power user features',
          'Integration capabilities',
          'Customization options'
        ]
      },
      {
        slideNumber: 7,
        title: 'User Experience',
        purpose: 'Show the journey',
        contentGuidelines: [
          'Onboarding flow',
          'Ease of use',
          'Time to value',
          'User testimonials'
        ]
      },
      {
        slideNumber: 8,
        title: 'Technology',
        purpose: 'Technical moat',
        contentGuidelines: [
          'Architecture overview',
          'Technical innovation',
          'Scalability',
          'Security/compliance'
        ]
      },
      {
        slideNumber: 9,
        title: 'Market & Customers',
        purpose: 'Who needs this',
        contentGuidelines: [
          'Target customer profile',
          'Market size',
          'Early customers/users'
        ]
      },
      {
        slideNumber: 10,
        title: 'Traction',
        purpose: 'Product-market fit proof',
        contentGuidelines: [
          'User metrics',
          'Usage statistics',
          'Retention data',
          'Customer feedback'
        ]
      },
      {
        slideNumber: 11,
        title: 'Roadmap',
        purpose: 'Future product vision',
        contentGuidelines: [
          'Upcoming features',
          'Product expansion',
          'Platform vision',
          'Timeline'
        ]
      },
      {
        slideNumber: 12,
        title: 'Team',
        purpose: 'Technical credibility',
        contentGuidelines: [
          'Technical founders',
          'Product expertise',
          'Previous products built'
        ]
      },
      {
        slideNumber: 13,
        title: 'Ask',
        purpose: 'Investment details',
        contentGuidelines: [
          'Funding amount',
          'Use for product development',
          'Hiring plan',
          'Go-to-market acceleration'
        ]
      }
    ],
    tags: ['product-focused', 'technical', 'B2B', 'SaaS', 'demo-heavy']
  },
  {
    id: 'saas-b2b',
    name: 'B2B SaaS Deck',
    description: 'Enterprise-focused structure with emphasis on business metrics and scalability.',
    category: 'industry-specific',
    stage: 'series-a',
    slideCount: 12,
    slides: [
      {
        slideNumber: 1,
        title: 'Cover Slide',
        purpose: 'Professional introduction',
        contentGuidelines: [
          'Company name',
          'Value proposition',
          'Founded year',
          'Contact info'
        ]
      },
      {
        slideNumber: 2,
        title: 'Problem',
        purpose: 'Enterprise pain point',
        contentGuidelines: [
          'Business problem you solve',
          'Cost of the problem',
          'Who in organization feels it',
          'Current inadequate solutions'
        ]
      },
      {
        slideNumber: 3,
        title: 'Solution',
        purpose: 'Your SaaS platform',
        contentGuidelines: [
          'Platform overview',
          'Key capabilities',
          'Integration ecosystem',
          'Deployment options'
        ]
      },
      {
        slideNumber: 4,
        title: 'Why Now',
        purpose: 'Market timing',
        contentGuidelines: [
          'Digital transformation trends',
          'Remote work drivers',
          'Technology enablers',
          'Regulatory changes'
        ]
      },
      {
        slideNumber: 5,
        title: 'Product',
        purpose: 'Platform walkthrough',
        contentGuidelines: [
          'Core modules',
          'Workflow automation',
          'Reporting/analytics',
          'Admin controls'
        ]
      },
      {
        slideNumber: 6,
        title: 'Customer Success',
        purpose: 'Case studies',
        contentGuidelines: [
          'Customer logos',
          'Use case examples',
          'ROI achieved',
          'Testimonials with metrics'
        ],
        designTips: [
          'Logo wall of recognizable brands',
          'ROI calculations',
          'Quote testimonials'
        ]
      },
      {
        slideNumber: 7,
        title: 'Market Opportunity',
        purpose: 'TAM breakdown',
        contentGuidelines: [
          'Total addressable market',
          'Serviceable market',
          'Current penetration',
          'Market growth rate'
        ]
      },
      {
        slideNumber: 8,
        title: 'Business Model',
        purpose: 'SaaS metrics',
        contentGuidelines: [
          'Pricing tiers',
          'ARR/MRR',
          'Net revenue retention',
          'CAC payback period',
          'LTV:CAC ratio',
          'Gross margin'
        ],
        designTips: [
          'SaaS metrics dashboard',
          'Pricing comparison table',
          'Growth projections'
        ]
      },
      {
        slideNumber: 9,
        title: 'Go-to-Market',
        purpose: 'Sales strategy',
        contentGuidelines: [
          'Sales channels (direct, partners, marketplace)',
          'Customer acquisition strategy',
          'Sales cycle length',
          'Expansion strategy (land and expand)'
        ]
      },
      {
        slideNumber: 10,
        title: 'Competition',
        purpose: 'Market positioning',
        contentGuidelines: [
          'Competitive landscape',
          'Positioning matrix',
          'Differentiation',
          'Switching costs'
        ]
      },
      {
        slideNumber: 11,
        title: 'Team',
        purpose: 'Enterprise experience',
        contentGuidelines: [
          'Founders with B2B background',
          'Previous enterprise sales',
          'Technical leadership',
          'Advisory board'
        ]
      },
      {
        slideNumber: 12,
        title: 'Financials & Ask',
        purpose: 'Investment opportunity',
        contentGuidelines: [
          'Current ARR',
          'Growth trajectory',
          'Unit economics',
          'Raise amount',
          'Use of funds',
          'Path to profitability'
        ]
      }
    ],
    tags: ['B2B', 'SaaS', 'enterprise', 'series-a', 'ARR-focused']
  }
];
