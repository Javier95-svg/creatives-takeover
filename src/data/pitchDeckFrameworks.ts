// Pitch Deck Framework Data

export interface BuilderFramework {
  id: string;
  name: string;
  description: string;
  bestFor: string[];
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    actions: string[];
    examples?: string[];
  }>;
  icon: string; // Lucide icon name
}

export const PITCH_DECK_FRAMEWORKS: BuilderFramework[] = [
  {
    id: 'traction-first',
    name: 'Traction-First Framework',
    description: 'Lead with metrics and proof points. Best for startups with strong early traction.',
    bestFor: ['Startups with revenue', 'Strong user growth', 'Impressive KPIs', 'Series A+'],
    icon: 'TrendingUp',
    steps: [
      {
        stepNumber: 1,
        title: 'Start with Your Best Metric',
        description: 'Open with your most impressive traction metric immediately after the cover slide',
        actions: [
          'Identify your strongest metric (MRR, ARR, users, growth rate)',
          'Create a visual representation (chart, comparison)',
          'Add context: timeframe, industry comparison',
          'Make the number the hero of the slide'
        ],
        examples: [
          '$500K ARR in 6 months',
          '10,000 paying customers, 40% MoM growth',
          '3x faster adoption than Dropbox at this stage',
          '150% net revenue retention'
        ]
      },
      {
        stepNumber: 2,
        title: 'Establish the Problem',
        description: 'Now that you have attention, explain what problem you solve',
        actions: [
          'Define the pain point clearly',
          'Show why it matters (market size, cost)',
          'Explain why existing solutions fail',
          'Keep it brief - you\'ve already proven traction'
        ],
        examples: [
          'Small businesses waste 20 hours/week on manual bookkeeping',
          'Enterprise sales teams lose 30% of deals to slow proposal generation',
          '60% of SaaS trials never convert due to poor onboarding'
        ]
      },
      {
        stepNumber: 3,
        title: 'Show the Full Metrics Story',
        description: 'Dive deep into your traction with comprehensive metrics',
        actions: [
          'Show revenue growth over time',
          'Display user acquisition and retention',
          'Highlight unit economics (CAC, LTV)',
          'Include customer logos or testimonials',
          'Compare to industry benchmarks'
        ],
        examples: [
          'Cohort retention chart showing 85% month-1 retention',
          'CAC payback period of 3 months',
          'NRR of 120% from upsells',
          'Customer logos from Fortune 500 companies'
        ]
      },
      {
        stepNumber: 4,
        title: 'Explain How It Works',
        description: 'Show your product/solution that drives these metrics',
        actions: [
          'Product screenshots or demo',
          'Key features that drive retention',
          'Technology differentiators',
          'Why customers love it (testimonials)'
        ]
      },
      {
        stepNumber: 5,
        title: 'Market Opportunity',
        description: 'Show how big this can get',
        actions: [
          'TAM/SAM/SOM breakdown',
          'Market growth trends',
          'Your current penetration',
          'Expansion opportunities'
        ]
      },
      {
        stepNumber: 6,
        title: 'Business Model & Unit Economics',
        description: 'Prove this is a sustainable business',
        actions: [
          'Revenue model explanation',
          'Pricing strategy',
          'Unit economics deep dive',
          'Path to profitability'
        ]
      },
      {
        stepNumber: 7,
        title: 'Roadmap & Vision',
        description: 'What you\'ll build with funding',
        actions: [
          'Product roadmap',
          'Market expansion plans',
          'Hiring plan',
          'Key milestones with timeline'
        ]
      },
      {
        stepNumber: 8,
        title: 'Team',
        description: 'Show you can execute',
        actions: [
          'Founder backgrounds',
          'Key hires',
          'Domain expertise',
          'Track record'
        ]
      },
      {
        stepNumber: 9,
        title: 'The Ask',
        description: 'Investment details',
        actions: [
          'Amount raising',
          'Use of funds',
          'Milestones to achieve',
          'Expected outcomes'
        ]
      }
    ]
  },
  {
    id: 'problem-agitate-solve',
    name: 'Problem-Agitate-Solve (PAS)',
    description: 'Classic persuasion framework. Define problem, agitate the pain, then present solution.',
    bestFor: ['Clear pain points', 'Broken user experiences', 'Inefficient processes', 'Early-stage'],
    icon: 'Lightbulb',
    steps: [
      {
        stepNumber: 1,
        title: 'Problem: Define the Pain',
        description: 'Start by clearly stating the problem your target customer faces',
        actions: [
          'Identify a specific, relatable problem',
          'Focus on one clear pain point',
          'Make it personal and emotional',
          'Use concrete examples or stories'
        ],
        examples: [
          'Freelancers spend 15 hours/week chasing invoices',
          'Marketing teams can\'t prove ROI on content',
          'Remote teams struggle with async communication',
          'Small businesses can\'t afford enterprise software'
        ]
      },
      {
        stepNumber: 2,
        title: 'Agitate: Make the Pain Real',
        description: 'Intensify the problem by showing consequences and impact',
        actions: [
          'Quantify the cost (time, money, opportunity)',
          'Show ripple effects of the problem',
          'Paint a picture of ongoing frustration',
          'Use statistics or research to validate',
          'Include customer quotes about the pain'
        ],
        examples: [
          'This wastes $50K/year and kills cash flow',
          'Leading to missed deadlines, client churn, and burnout',
          'Teams have tried 5 different tools, nothing works',
          'The problem is getting worse as teams grow'
        ]
      },
      {
        stepNumber: 3,
        title: 'Solve: Introduce Your Solution',
        description: 'Present your product as the answer',
        actions: [
          'Explain how you solve the specific problem',
          'Focus on transformation and benefits',
          'Show before/after scenarios',
          'Make it simple and clear'
        ],
        examples: [
          'Automate invoicing and get paid 60% faster',
          'Connect every content piece to revenue',
          'One platform that actually works for async teams',
          'Enterprise features at 1/10th the price'
        ]
      },
      {
        stepNumber: 4,
        title: 'Show How It Works',
        description: 'Demonstrate the solution in action',
        actions: [
          'Product walkthrough',
          'Key features that solve the pain',
          'User workflow',
          'Quick wins and time to value'
        ]
      },
      {
        stepNumber: 5,
        title: 'Prove It Works',
        description: 'Provide evidence and social proof',
        actions: [
          'Customer testimonials',
          'Usage metrics',
          'Case studies',
          'Before/after results'
        ],
        examples: [
          'Users get paid 2 weeks faster on average',
          '89% of customers report 10x better visibility',
          'Teams save 20+ hours per week',
          '500 companies switched from competitors'
        ]
      },
      {
        stepNumber: 6,
        title: 'Market Opportunity',
        description: 'Show the scale of the problem',
        actions: [
          'How many people have this problem',
          'Market size (TAM/SAM/SOM)',
          'Growth trends',
          'Why now is the right time'
        ]
      },
      {
        stepNumber: 7,
        title: 'Business Model',
        description: 'How you capture value',
        actions: [
          'Pricing that reflects value created',
          'Revenue model',
          'Unit economics',
          'Scalability'
        ]
      },
      {
        stepNumber: 8,
        title: 'Competition',
        description: 'Why alternatives don\'t work',
        actions: [
          'Current inadequate solutions',
          'Why competitors miss the mark',
          'Your unique approach',
          'Sustainable advantages'
        ]
      },
      {
        stepNumber: 9,
        title: 'Team',
        description: 'Why you can solve this',
        actions: [
          'Personal experience with the problem',
          'Domain expertise',
          'Relevant background',
          'Commitment to the solution'
        ]
      },
      {
        stepNumber: 10,
        title: 'Ask',
        description: 'Investment to scale the solution',
        actions: [
          'Amount needed',
          'How funds accelerate solution delivery',
          'Impact and milestones',
          'Timeline'
        ]
      }
    ]
  },
  {
    id: 'heros-journey',
    name: 'The Hero\'s Journey',
    description: 'Storytelling approach inspired by classic narratives. Make the customer the hero.',
    bestFor: ['Consumer products', 'Emotional connections', 'Transformative solutions', 'Vision-driven'],
    icon: 'Sparkles',
    steps: [
      {
        stepNumber: 1,
        title: 'The Ordinary World',
        description: 'Set the scene - describe the status quo',
        actions: [
          'Describe the current state',
          'Introduce your customer (the hero)',
          'Show their daily reality',
          'Make it relatable and human'
        ],
        examples: [
          'Meet Sarah, a working mom trying to stay healthy',
          'Small business owners juggling 10 different tools',
          'Students struggling to stay focused in a distracted world',
          'Creators spending more time on admin than creating'
        ]
      },
      {
        stepNumber: 2,
        title: 'The Call to Adventure',
        description: 'The problem emerges, disrupting the ordinary',
        actions: [
          'Introduce the challenge or opportunity',
          'Show what\'s at stake',
          'Create urgency or emotional weight',
          'Make the hero realize change is needed'
        ],
        examples: [
          'But she has no time for meal planning or gym',
          'Missing important tasks because they\'re scattered everywhere',
          'Failing classes despite working harder than ever',
          'Burning out from non-creative work'
        ]
      },
      {
        stepNumber: 3,
        title: 'Meeting the Mentor',
        description: 'Your product enters as the guide',
        actions: [
          'Introduce your solution as the mentor/tool',
          'Show how it empowers the hero',
          'Position as enabler, not savior',
          'Focus on partnership and support'
        ],
        examples: [
          'AI that creates personalized meal plans in seconds',
          'One intelligent workspace that connects everything',
          'Study system designed by neuroscientists',
          'Automation that handles the busywork'
        ]
      },
      {
        stepNumber: 4,
        title: 'The Journey Begins',
        description: 'Show the transformation process',
        actions: [
          'Demonstrate the product experience',
          'Show key moments of empowerment',
          'Highlight ease of adoption',
          'Build momentum'
        ],
        examples: [
          'Sarah gets healthy meals without the stress',
          'Teams move 3x faster with everything connected',
          'Students see grades improve in weeks',
          'Creators double their output'
        ]
      },
      {
        stepNumber: 5,
        title: 'Trials and Victories',
        description: 'Real results and proof points',
        actions: [
          'Show metrics and outcomes',
          'Customer testimonials',
          'Success stories',
          'Tangible transformations'
        ],
        examples: [
          '10,000 parents eating healthy, saving 5 hours/week',
          '50,000 teams achieving inbox zero daily',
          '85% of students improved GPA by full letter grade',
          'Creators earning 2x more while working less'
        ]
      },
      {
        stepNumber: 6,
        title: 'The Greater Quest',
        description: 'Expand the vision - the bigger mission',
        actions: [
          'Reveal the larger transformation',
          'Show the ripple effects',
          'Paint the future you\'re building',
          'Connect to deeper purpose'
        ],
        examples: [
          'Building a healthier generation of families',
          'Enabling teams to do their best work',
          'Democratizing world-class education',
          'Unleashing human creativity at scale'
        ]
      },
      {
        stepNumber: 7,
        title: 'The Market of Heroes',
        description: 'Show how many can benefit',
        actions: [
          'Market size = people who need this transformation',
          'Growth of the problem/opportunity',
          'Why now is the moment',
          'Movement potential'
        ]
      },
      {
        stepNumber: 8,
        title: 'The Path Forward',
        description: 'Business model and sustainability',
        actions: [
          'How you sustain the mission',
          'Pricing that\'s accessible',
          'Revenue model',
          'Economics that work'
        ]
      },
      {
        stepNumber: 9,
        title: 'The Fellowship',
        description: 'Your team and community',
        actions: [
          'Founders who deeply understand the journey',
          'Team members who share the mission',
          'Community of heroes (customers)',
          'Advisors and partners'
        ]
      },
      {
        stepNumber: 10,
        title: 'The Call to Join',
        description: 'Investment as partnership in the quest',
        actions: [
          'Invite investors to join the mission',
          'What you\'ll achieve together',
          'Funding needed for next chapter',
          'Impact of success'
        ]
      }
    ]
  }
];
