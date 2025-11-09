export interface FundingProgram {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  type: 'accelerator' | 'contest' | 'grant' | 'investor_network';
  keywords: string[];
  location: string[];
  fundingRange?: string;
  opportunityScore: number;
  eligibility: string[];
  fundingTypes: string[];
  keyDates: {
    applicationOpen?: string;
    applicationClose?: string;
    decisionDate?: string;
  };
  applicationSteps: Array<{
    id: string;
    title: string;
    description: string;
    example?: string;
    resourceLabel?: string;
    resourceUrl?: string;
  }>;
  tips: {
    mistakes: string[];
    winning: string[];
  };
  communityQuestions?: Array<{
    question: string;
    answers?: string[];
  }>;
}

export const fundingPrograms: FundingProgram[] = [
  {
    id: 'y-combinator',
    title: 'Y Combinator',
    description:
      "The world's most prestigious startup accelerator. Provides $500k investment, mentorship, and access to a vast network.",
    url: 'https://www.ycombinator.com/apply',
    category: 'accelerator',
    type: 'accelerator',
    keywords: ['seed funding', 'mentorship', 'silicon valley', 'tech startups'],
    location: ['Global', 'USA'],
    fundingRange: '$500,000',
    opportunityScore: 95,
    eligibility: [
      'Early-stage startup with a live MVP or strong prototype',
      'Founding team able to relocate to the Bay Area during the batch',
      'Company incorporated or willing to incorporate in the US',
      'Committed to building a venture-scale company'
    ],
    fundingTypes: ['Equity investment', 'Mentorship', 'Demo Day exposure'],
    keyDates: {
      applicationOpen: '2025-01-01',
      applicationClose: '2025-03-15',
      decisionDate: '2025-04-30'
    },
    applicationSteps: [
      {
        id: 'yc-step-1',
        title: 'Complete the online application',
        description:
          'Answer the YC questionnaire with concise metrics and team background. Record the optional founder video.',
        example:
          'Describe what your company does in 50 words: “We help Shopify brands turn high-intent site visitors into SMS subscribers through AI-driven incentives.”',
        resourceLabel: 'YC application worksheet (Google Doc)',
        resourceUrl: 'https://www.ycombinator.com/apply'
      },
      {
        id: 'yc-step-2',
        title: 'Prepare traction evidence',
        description:
          'Gather charts/screenshots for user growth, revenue, or validated experiments to upload as supplementary materials.',
        example:
          'Attach a screenshot of cohort retention, or market experiment showing 35% landing page conversion.',
        resourceLabel: 'Traction deck template',
        resourceUrl: 'https://airtable.com/shrV47QHc28K4'
      },
      {
        id: 'yc-step-3',
        title: 'Schedule founder interview',
        description:
          'If shortlisted, respond within 24 hours to confirm your 10-minute video interview slot and rehearse answers with mock questions.',
        example: 'Practice answering: “Tell us about a time your team moved exceptionally fast.”',
        resourceLabel: 'Founder interview prep guide',
        resourceUrl: 'https://www.ycombinator.com/library'
      }
    ],
    tips: {
      mistakes: [
        'Submitting vague answers without clear metrics or focus',
        'Ignoring the optional founder video introduction',
        'Over-emphasizing deck polish instead of product progress'
      ],
      winning: [
        'Share one clear insight that competitors overlook',
        'Quantify traction honestly—even waitlists or pilot results count',
        'Explain founder/market fit and why your team moves fast'
      ]
    },
    communityQuestions: [
      {
        question: 'Do we need to be incorporated before applying?',
        answers: ['No, but YC expects you to incorporate (typically in the US) if accepted.']
      },
      {
        question: 'How long should the founder video be?',
        answers: ['Keep it under one minute, focus on energy, clarity, and team chemistry.']
      }
    ]
  },
  {
    id: 'techstars',
    title: 'Techstars',
    description:
      'Global startup accelerator with industry-specific programs. Offers $120k investment and lifetime access to mentors.',
    url: 'https://www.techstars.com/accelerators',
    category: 'accelerator',
    type: 'accelerator',
    keywords: ['accelerator', 'mentorship', 'global', 'seed funding'],
    location: ['Global', 'USA', 'Europe'],
    fundingRange: '$120,000',
    opportunityScore: 90,
    eligibility: [
      'Scalable, venture-ready startup with a strong founding team',
      'Ability to participate full-time in the 13-week program (onsite or hybrid, depending on city)',
      'Proof of market insight and validated customer problem',
      'Willingness to share equity (6% common) for participation'
    ],
    fundingTypes: ['Equity investment', 'Mentorship', 'Corporate partnerships'],
    keyDates: {
      applicationOpen: '2025-02-01',
      applicationClose: '2025-04-10',
      decisionDate: '2025-05-20'
    },
    applicationSteps: [
      {
        id: 'ts-step-1',
        title: 'Select a program city and focus',
        description:
          "Choose the Techstars accelerator that aligns with your industry (e.g., FinTech, Mobility, Climate). Tailor the application to that program's theme.",
        example: 'If applying to Techstars Climate, highlight your carbon reduction metrics or partnerships.',
        resourceLabel: 'Program selector worksheet',
        resourceUrl: 'https://www.techstars.com/accelerators'
      },
      {
        id: 'ts-step-2',
        title: 'Complete founding team questionnaire',
        description:
          'Submit team bios, share unique strengths, and demonstrate execution track record or domain expertise.',
        example: 'Add a founder note: “Previously built a profitable Shopify app sold to private equity in 2022.”',
        resourceLabel: 'Techstars team profile template',
        resourceUrl: 'https://techstarsmy.com/team-template'
      },
      {
        id: 'ts-step-3',
        title: 'Upload traction and pipeline details',
        description:
          'Share customer discovery results, pilot LOIs, and financial projections for the next 18 months.',
        example: 'Provide pipeline screenshot showing 20 qualified enterprise leads with expected close timelines.',
        resourceLabel: 'Traction snapshot template',
        resourceUrl: 'https://techstars.com/resources'
      }
    ],
    tips: {
      mistakes: [
        'Submitting the same generic application to multiple locations',
        'Underestimating the importance of founder-market fit',
        'Failing to outline a clear usage plan for the $120k funding'
      ],
      winning: [
        'Explain how Techstars mentorship will accelerate a specific growth lever',
        'Highlight diversity and complementary skills on the founding team',
        'Share customer quotes validating the urgency of the problem'
      ]
    },
    communityQuestions: [
      {
        question: 'Can solo founders apply?',
        answers: ['Yes, Techstars accepts solo founders but prefers evidence of execution velocity.']
      },
      {
        question: 'Is in-person attendance mandatory?',
        answers: ['Most programs have hybrid flexibility, but founders should plan for significant on-site engagement.']
      }
    ]
  },
  {
    id: '500-global',
    title: '500 Global (formerly 500 Startups)',
    description: 'Venture capital firm and accelerator investing in early-stage startups globally.',
    url: 'https://500.co/',
    category: 'accelerator',
    type: 'accelerator',
    keywords: ['venture capital', 'early-stage', 'global', 'diverse founders'],
    location: ['Global'],
    fundingRange: '$150,000',
    opportunityScore: 88,
    eligibility: [
      'Early-stage startup with measurable traction (e.g., revenue, MAUs, or pilot results)',
      'Founders able to dedicate full-time to the program',
      'Clear monetization strategy and global expansion potential',
      'Comfortable with convertible note terms ($150k for 6% equity)'
    ],
    fundingTypes: ['Equity investment', 'Growth mentorship', 'Demo Day access'],
    keyDates: {
      applicationOpen: '2025-03-01',
      applicationClose: '2025-05-05',
      decisionDate: '2025-06-15'
    },
    applicationSteps: [
      {
        id: '500-step-1',
        title: 'Submit portfolio metrics',
        description:
          'Upload key metrics (ARR, user growth, retention) and provide narrative on recent traction.',
        example: 'Include a retention chart: “Day 30 retention of 42% with 18% MoM growth for last quarter.”',
        resourceLabel: 'Metrics reporting guide',
        resourceUrl: 'https://500.co/accelerators'
      },
      {
        id: '500-step-2',
        title: 'Record founder pitch video',
        description:
          'Share a 2-minute video covering problem, solution, traction, and why now. Speak directly to the camera.',
        example: 'Use the script: Problem -> Customers -> Solution -> Traction -> Team -> Ask.',
        resourceLabel: 'Pitch video storyboard',
        resourceUrl: 'https://500.co/library'
      },
      {
        id: '500-step-3',
        title: 'Complete diligence questionnaire',
        description:
          'Provide company documents (cap table, financial statements, IP assignments) upon request.',
        example: 'Have your SAFE agreements and option pool details ready for quick upload.',
        resourceLabel: 'Diligence checklist',
        resourceUrl: 'https://airtable.com/shrHj00qEjY'
      }
    ],
    tips: {
      mistakes: [
        'Pitching a generic vision without traction evidence',
        'Submitting outdated financials or missing legal documentation',
        'Ignoring diversity of customer acquisition channels'
      ],
      winning: [
        'Highlight international growth or expansion readiness',
        'Share customer testimonials demonstrating high retention',
        'Be explicit about how $500k will unlock the next major milestone'
      ]
    },
    communityQuestions: [
      {
        question: 'Do we need US incorporation?',
        answers: ['No, 500 Global works with international entities but may request structural adjustments during investment.']
      }
    ]
  },
  {
    id: 'angellist',
    title: 'AngelList',
    description: 'Platform connecting startups with angel investors and venture capital firms.',
    url: 'https://www.angellist.com/',
    category: 'investor-network',
    type: 'investor_network',
    keywords: ['angel investors', 'venture capital', 'seed funding', 'networking'],
    location: ['Global'],
    opportunityScore: 85,
    eligibility: [
      'Startup actively raising a seed or pre-seed round',
      'Clear fundraising goal with terms prepared (e.g., SAFE, equity)',
      'Strong pitch materials (deck, metrics, founder story)',
      'Active investor outreach plan and profile'
    ],
    fundingTypes: ['Equity crowdfunding', 'Syndicate investment', 'Rolling fund'],
    keyDates: {
      applicationOpen: '2025-01-15',
      applicationClose: '2025-12-15',
      decisionDate: 'Rolling'
    },
    applicationSteps: [
      {
        id: 'angellist-step-1',
        title: 'Create or update your AngelList profile',
        description:
          'Optimize company profile with succinct description, traction metrics, and founder bios.',
        example: 'Add key metrics: “$45k MRR, 18% MoM growth, 40% CAC payback in 2 months.”',
        resourceLabel: 'Profile optimization checklist',
        resourceUrl: 'https://angel.co/startups'
      },
      {
        id: 'angellist-step-2',
        title: 'Upload pitch materials',
        description:
          'Attach fundraising deck, operating model, and investor FAQ. Set permission levels appropriately.',
        example: 'Provide deck focused on problem, solution, traction, business model, team, and ask.',
        resourceLabel: 'Seed pitch deck template',
        resourceUrl: 'https://notion.so/pitch-template'
      },
      {
        id: 'angellist-step-3',
        title: 'Activate outreach to syndicate leads',
        description:
          'Identify relevant syndicate leads and craft personalized messages referencing past investments.',
        example: 'Message template: “Saw you backed B2B SaaS in remote collaboration—here’s why we’re the next breakout.”',
        resourceLabel: 'Investor outreach tracker',
        resourceUrl: 'https://airtable.com/shrInvestorTracker'
      }
    ],
    tips: {
      mistakes: [
        'Generic outreach messages that ignore investor thesis',
        'Incomplete data rooms or unclear fundraising terms',
        'Underestimating response time or follow-up cadence'
      ],
      winning: [
        'Highlight social proof (advisors, notable customers, earlier investors)',
        'Share traction snapshots updated weekly',
        'Use rolling closes to create momentum and scarcity'
      ]
    },
    communityQuestions: [
      {
        question: 'Can AngelList support non-US companies?',
        answers: ['Yes, but additional compliance steps may be required—consult AngelList support for entity specifics.']
      }
    ]
  },
  {
    id: 'aws-activate',
    title: 'AWS Activate',
    description: "Amazon's startup program offering up to $100k in AWS credits, training, and support.",
    url: 'https://aws.amazon.com/activate/',
    category: 'grant',
    type: 'grant',
    keywords: ['cloud credits', 'infrastructure', 'tech startups', 'aws'],
    location: ['Global'],
    fundingRange: 'Up to $100,000 in credits',
    opportunityScore: 82,
    eligibility: [
      'Early-stage startup with active AWS account (less than 10 employees for Activate Founders tier)',
      'Not previously received equal or greater Activate credit package',
      'Valid company website and public product presence',
      'Founder or team member able to provide incorporation details'
    ],
    fundingTypes: ['Cloud credits', 'Technical support', 'Training resources'],
    keyDates: {
      applicationOpen: '2025-01-01',
      applicationClose: '2025-12-31',
      decisionDate: 'Rolling'
    },
    applicationSteps: [
      {
        id: 'aws-step-1',
        title: 'Verify AWS account and organization',
        description:
          'Ensure your AWS account is active, with billing info up-to-date and organization details completed.',
        example: 'Confirm root account email matches your company domain to avoid verification delays.',
        resourceLabel: 'AWS Activate checklist',
        resourceUrl: 'https://aws.amazon.com/activate/'
      },
      {
        id: 'aws-step-2',
        title: 'Complete Activate application form',
        description:
          'Provide startup description, traction metrics, and AWS usage plan. Specify how credits will reduce cost.',
        example:
          'Usage plan example: “Deploy staging and production clusters for analytics pipeline, projected spend $2.5k/mo.”',
        resourceLabel: 'Application worksheet (Google Sheet)',
        resourceUrl: 'https://docs.google.com/spreadsheets/d/activate-template'
      },
      {
        id: 'aws-step-3',
        title: 'Submit supporting materials',
        description:
          'Upload pitch deck or executive summary highlighting technical architecture and business impact.',
        example: 'Include architecture diagram to demonstrate AWS workloads.',
        resourceLabel: 'Architecture diagram template',
        resourceUrl: 'https://aws.amazon.com/architecture/icons/'
      }
    ],
    tips: {
      mistakes: [
        'Providing vague or generic usage plans for credits',
        'Applying with a personal email rather than company domain',
        'Ignoring follow-up emails requesting additional verification'
      ],
      winning: [
        'Quantify projected AWS workloads and cost savings',
        'Showcase AWS-native services you plan to adopt',
        'Mention partners or accelerators recommending you'
      ]
    },
    communityQuestions: [
      {
        question: 'Can I reapply if I was previously rejected?',
        answers: ['Yes, refine your usage plan and reapply after 90 days—highlight product progress.']
      }
    ]
  },
  {
    id: 'mit-100k',
    title: 'MIT $100K Entrepreneurship Competition',
    description: 'One of the most prestigious university-based startup competitions.',
    url: 'https://www.mit100k.org/',
    category: 'contest',
    type: 'contest',
    keywords: ['competition', 'university', 'prize money', 'innovation'],
    location: ['USA', 'Global'],
    fundingRange: '$100,000',
    opportunityScore: 87,
    eligibility: [
      'At least one team member must be currently affiliated with MIT (student, staff, or alumnus within last 5 years)',
      'Team must have a business idea with clear commercialization path',
      'Pitch must not include prior winners with same concept',
      'Able to attend live finals in Cambridge, MA if selected'
    ],
    fundingTypes: ['Grant prize', 'Mentorship', 'Showcase exposure'],
    keyDates: {
      applicationOpen: '2025-01-10',
      applicationClose: '2025-03-05',
      decisionDate: '2025-04-22'
    },
    applicationSteps: [
      {
        id: 'mit-step-1',
        title: 'Register team on MIT $100K portal',
        description:
          'Create team profile, list members, and confirm MIT affiliation. Upload initial executive summary.',
        example:
          'Executive summary about climate robotics with 200-word problem/solution/traction overview.',
        resourceLabel: 'Executive summary template',
        resourceUrl: 'https://www.mit100k.org/resources'
      },
      {
        id: 'mit-step-2',
        title: 'Submit written deliverables',
        description:
          'Provide 5-page business plan, financial model, and go-to-market strategy. Include customer discovery insights.',
        example: 'Use Lean Canvas format with MIT-specific market validation.',
        resourceLabel: 'Business plan template (PDF)',
        resourceUrl: 'https://www.mit100k.org/template'
      },
      {
        id: 'mit-step-3',
        title: 'Prepare pitch deck and demo',
        description:
          'If selected for semi-finals, craft 5-minute pitch deck and demo video. Rehearse Q&A.',
        example: 'Highlight MIT resources leveraged (labs, professors, ecosystem).',
        resourceLabel: 'Pitch deck template',
        resourceUrl: 'https://www.mit100k.org/resources'
      }
    ],
    tips: {
      mistakes: [
        'Unclear MIT connection or lack of team commitment',
        'Ignoring judges’ scoring criteria (market validation, impact)',
        'Submitting business plan without revenue projections'
      ],
      winning: [
        'Highlight differentiation and MIT ecosystem advantages',
        'Include customer interviews and letters of support',
        'Demonstrate social impact and scalable business model'
      ]
    },
    communityQuestions: [
      {
        question: 'Do non-MIT co-founders count?',
        answers: ['Yes, as long as one qualified MIT-affiliated member remains active on the team.']
      }
    ]
  },
  {
    id: 'google-for-startups',
    title: 'Google for Startups',
    description:
      "Google's global initiative supporting startups with cloud credits, mentorship, and resources.",
    url: 'https://startup.google.com/',
    category: 'accelerator',
    type: 'accelerator',
    keywords: ['google cloud', 'mentorship', 'tech startups', 'resources'],
    location: ['Global'],
    opportunityScore: 84,
    eligibility: [
      'Tech startup with validated product and early user traction',
      'Founders committed to participating in workshops and mentorship',
      'Ability to articulate how Google resources will accelerate growth',
      'Diversity in founding team is highly encouraged'
    ],
    fundingTypes: ['Cloud credits', 'Mentorship', 'Community support'],
    keyDates: {
      applicationOpen: '2025-02-05',
      applicationClose: '2025-04-20',
      decisionDate: '2025-05-25'
    },
    applicationSteps: [
      {
        id: 'gfs-step-1',
        title: 'Complete program interest form',
        description: 'Share company overview, impact metrics, and growth milestones.',
        example: 'Mention 5,000 MAUs with 22% week-one retention and top customer segments.',
        resourceLabel: 'Interest form preview',
        resourceUrl: 'https://startup.google.com/'
      },
      {
        id: 'gfs-step-2',
        title: 'Record customer impact story',
        description:
          'Upload 90-second video showing how customers benefit from your solution.',
        example: 'Customer testimonial: “Since integrating we increased saved hours by 35% monthly.”',
        resourceLabel: 'Storyboarding guide',
        resourceUrl: 'https://docs.google.com/document/d/storyboard'
      },
      {
        id: 'gfs-step-3',
        title: 'Outline mentor engagement plan',
        description:
          'Describe top 3 challenges where Google mentors can help (e.g., ML architecture, growth marketing, partnerships).',
        example: 'Challenge list highlighting need for advanced analytics instrumentation.',
        resourceLabel: 'Mentor strategy template',
        resourceUrl: 'https://startup.google.com/programs'
      }
    ],
    tips: {
      mistakes: [
        'Submitting generic responses without measurable impact',
        'Neglecting to show how Google resources uniquely help you',
        'Uploading low-quality or overly long videos'
      ],
      winning: [
        'Highlight underrepresented founder story or social impact',
        'Share quantifiable user results and testimonials',
        'Provide a specific mentor engagement roadmap'
      ]
    },
    communityQuestions: [
      {
        question: 'Can we apply to multiple Google programs?',
        answers: ['Yes, but tailor each application and disclose overlapping cohorts.']
      }
    ]
  },
  {
    id: 'kickstarter',
    title: 'Kickstarter',
    description: 'Crowdfunding platform for creative projects and product launches.',
    url: 'https://www.kickstarter.com/',
    category: 'contest',
    type: 'contest',
    keywords: ['crowdfunding', 'creative', 'product launch', 'community funding'],
    location: ['Global'],
    opportunityScore: 78,
    eligibility: [
      'Physical or digital product that complies with Kickstarter guidelines',
      'Detailed production plan and cost breakdown',
      'Compelling story, prototype visuals, and reward tiers',
      'Ability to fulfill rewards within 12 months of campaign end'
    ],
    fundingTypes: ['Crowdfunding', 'Community pre-orders', 'Launch exposure'],
    keyDates: {
      applicationOpen: '2025-01-01',
      applicationClose: '2025-12-31',
      decisionDate: 'Rolling'
    },
    applicationSteps: [
      {
        id: 'ks-step-1',
        title: 'Draft your campaign page',
        description:
          'Prepare visuals, copy, and reward tiers. Highlight story, benefits, and production timeline.',
        example: 'Add sections: The Problem, The Solution, What Backers Get, Timeline, Risks.',
        resourceLabel: 'Campaign planning template',
        resourceUrl: 'https://www.kickstarter.com/help/handbook'
      },
      {
        id: 'ks-step-2',
        title: 'Submit project for review',
        description: 'Kickstarter reviews compliance and may request changes. Average review time is 3 business days.',
        example: 'Ensure no prohibited items (weapons, equity, medical claims).',
        resourceLabel: 'Policy checklist',
        resourceUrl: 'https://www.kickstarter.com/rules'
      },
      {
        id: 'ks-step-3',
        title: 'Plan pre-launch marketing',
        description: 'Build email list, teaser video, and launch day social posts. Prepare to engage backers daily.',
        example: 'Schedule live Q&A during first 48 hours to boost conversions.',
        resourceLabel: 'Launch marketing calendar',
        resourceUrl: 'https://notion.so/kickstarter-launch'
      }
    ],
    tips: {
      mistakes: [
        'Launching without an audience or email list',
        'Underestimating manufacturing and shipping costs',
        'Ignoring backer communication during campaign'
      ],
      winning: [
        'Offer compelling early-bird reward tiers',
        'Showcase high-quality prototype photos and demo video',
        'Line up press, influencers, and partners before launch'
      ]
    },
    communityQuestions: [
      {
        question: 'Can we run multiple campaigns?',
        answers: ['Yes, but deliver previous rewards before launching another project.']
      }
    ]
  },
  {
    id: 'microsoft-for-startups',
    title: 'Microsoft for Startups',
    description:
      "Microsoft's program offering Azure credits, technical support, and go-to-market resources.",
    url: 'https://www.microsoft.com/en-us/startups',
    category: 'grant',
    type: 'grant',
    keywords: ['azure credits', 'microsoft', 'cloud', 'enterprise startups'],
    location: ['Global'],
    fundingRange: 'Up to $150,000 in credits',
    opportunityScore: 83,
    eligibility: [
      'Company less than 7 years old and earning under $25M ARR',
      'Building a B2B or enterprise-focused product',
      'Willing to deploy on Azure and integrate Microsoft APIs',
      'Have working product and go-to-market strategy'
    ],
    fundingTypes: ['Cloud credits', 'Technical support', 'Go-to-market partnership'],
    keyDates: {
      applicationOpen: '2025-02-01',
      applicationClose: '2025-12-31',
      decisionDate: 'Rolling (4-6 weeks)'
    },
    applicationSteps: [
      {
        id: 'microsoft-step-1',
        title: 'Create Microsoft Founders Hub account',
        description: 'Sign up, verify company info, and connect your Azure tenant.',
        example: 'Use company email domain to expedite verification.',
        resourceLabel: 'Founders Hub signup',
        resourceUrl: 'https://foundershub.startups.microsoft.com/'
      },
      {
        id: 'microsoft-step-2',
        title: 'Submit product and traction details',
        description:
          'Describe your solution, customer base, and technical architecture. Include current Azure usage (if any).',
        example:
          'Explain: “We process 1TB/day of telemetry stored in Azure Data Lake with Synapse analytics layers.”',
        resourceLabel: 'Product overview template',
        resourceUrl: 'https://microsoft.com/startups-resources'
      },
      {
        id: 'microsoft-step-3',
        title: 'Define co-sell readiness plan',
        description:
          'Prepare go-to-market plan and confirm ability to list on Azure Marketplace within 6 months.',
        example: 'Outline onboarding tasks, pricing model, and marketplace listing timeline.',
        resourceLabel: 'Co-sell readiness checklist',
        resourceUrl: 'https://learn.microsoft.com/en-us/partner-center/'
      }
    ],
    tips: {
      mistakes: [
        'Applying without clear Azure deployment strategy',
        'Neglecting to show enterprise customer traction',
        'Providing vague GTM plans for co-selling'
      ],
      winning: [
        'Highlight enterprise logos or pilots leveraging Microsoft stack',
        'Share concrete Azure cost projections',
        'Commit to listing on Marketplace and describe timeline'
      ]
    },
    communityQuestions: [
      {
        question: 'Can we use credits for any Azure service?',
        answers: ['Yes, credits cover most Azure services except a few restricted offerings—check guidelines.']
      }
    ]
  },
  {
    id: 'seedcamp',
    title: 'Seedcamp',
    description: "Europe's seed fund providing investment and support for early-stage tech startups.",
    url: 'https://seedcamp.com/',
    category: 'accelerator',
    type: 'accelerator',
    keywords: ['seed funding', 'europe', 'tech', 'mentorship'],
    location: ['Europe', 'UK'],
    fundingRange: '€100,000 - €500,000',
    opportunityScore: 86,
    eligibility: [
      'Tech-enabled startup incorporated in Europe or the UK',
      'Pre-seed or seed stage with clear product insight',
      'Founding team with strong execution track record',
      'Ability to join in-person onboarding in London'
    ],
    fundingTypes: ['Equity investment', 'Mentorship', 'Founder network'],
    keyDates: {
      applicationOpen: '2025-01-20',
      applicationClose: '2025-04-25',
      decisionDate: '2025-05-30'
    },
    applicationSteps: [
      {
        id: 'seedcamp-step-1',
        title: 'Submit Seedcamp application form',
        description: 'Provide company info, traction metrics, and link to product demo or deck.',
        example: 'Include deck showing 3-year financial projections and TAM analysis.',
        resourceLabel: 'Seedcamp deck outline',
        resourceUrl: 'https://seedcamp.com/resources'
      },
      {
        id: 'seedcamp-step-2',
        title: 'Record 2-minute founder video',
        description:
          'Explain what you are building, why now, and why your team. Keep it high energy.',
        example:
          'Highlight unfair advantage, e.g., “Former Revolut product leads building next-gen treasury tools.”',
        resourceLabel: 'Founder video script template',
        resourceUrl: 'https://seedcamp.com/blog'
      },
      {
        id: 'seedcamp-step-3',
        title: 'Prepare diligence materials',
        description: 'Collect cap table, financial model, customer references ahead of partner interviews.',
        example: 'Create a secure data room on Notion/Dropbox organized by topic.',
        resourceLabel: 'Seedcamp diligence checklist',
        resourceUrl: 'https://seedcamp.com/resources'
      }
    ],
    tips: {
      mistakes: [
        'Unclear go-to-market for European expansion',
        'Incomplete data room when requested for diligence',
        'Pitch deck lacking traction or product roadmap'
      ],
      winning: [
        'Show pipeline of European enterprise or SME customers',
        'Highlight founder experience in the target industry',
        'Articulate how Seedcamp capital accelerates specific milestones'
      ]
    },
    communityQuestions: [
      {
        question: 'Will Seedcamp invest outside Europe?',
        answers: ['They focus on European HQs but support global expansion once backed.']
      }
    ]
  },
  {
    id: 'founder-institute',
    title: 'Founder Institute',
    description:
      'Global pre-seed accelerator helping aspiring founders build meaningful and enduring technology companies.',
    url: 'https://fi.co/',
    category: 'accelerator',
    type: 'accelerator',
    keywords: ['pre-seed', 'global', 'early-stage', 'founder support'],
    location: ['Global'],
    opportunityScore: 81,
    eligibility: [
      'Idea-stage or early product startup with founder committed to structured curriculum',
      'Ability to attend weekly sessions (virtual or local chapters)',
      'Willingness to receive critical feedback and iterate quickly',
      'Completion of predictive admissions test'
    ],
    fundingTypes: ['Curriculum', 'Mentorship', 'Equity collective'],
    keyDates: {
      applicationOpen: '2025-01-05',
      applicationClose: '2025-03-25',
      decisionDate: '2025-04-05'
    },
    applicationSteps: [
      {
        id: 'fi-step-1',
        title: 'Take the Founder Institute admissions test',
        description:
          'Complete the 30-minute aptitude assessment measuring entrepreneurial traits.',
        example: 'Score above the cohort threshold to receive invite (FI emails results within 48 hours).',
        resourceLabel: 'Admissions prep guide',
        resourceUrl: 'https://fi.co/apply'
      },
      {
        id: 'fi-step-2',
        title: 'Pay course fee and sign agreements',
        description:
          'Confirm participation, understand equity collective terms, and set cohort goals.',
        example: 'Plan 20-hour weekly commitment for assignments and mentor meetings.',
        resourceLabel: 'Participation agreement summary',
        resourceUrl: 'https://fi.co/terms'
      },
      {
        id: 'fi-step-3',
        title: 'Prepare for sprint deliverables',
        description: 'Review syllabus, align with mentors, and draft initial customer discovery plan.',
        example: 'Set weekly accountability targets in Founder Dashboard.',
        resourceLabel: 'Cohort checklist',
        resourceUrl: 'https://fi.co/guide'
      }
    ],
    tips: {
      mistakes: [
        'Underestimating weekly workload and deliverables',
        'Skipping mentor feedback sessions',
        'Failing to validate problem assumptions before building'
      ],
      winning: [
        'Engage with accountability assignments immediately',
        'Share weekly progress updates with cohort peers',
        'Leverage mentor network for early customer interviews'
      ]
    },
    communityQuestions: [
      {
        question: 'Is there equity taken upfront?',
        answers: ['No upfront equity is required; FI uses a structured equity collective distributed after graduation milestones.']
      }
    ]
  },
  {
    id: 'small-business-innovation-research',
    title: 'SBIR Program',
    description:
      'US government program providing grants to small businesses for R&D with commercialization potential.',
    url: 'https://www.sbir.gov/',
    category: 'grant',
    type: 'grant',
    keywords: ['government grant', 'r&d', 'usa', 'innovation'],
    location: ['USA'],
    fundingRange: 'Up to $1,750,000',
    opportunityScore: 89,
    eligibility: [
      'US-based small business with <500 employees',
      'Majority-owned by US citizens or permanent residents',
      'Conducting R&D aligned with agency solicitations',
      'Ability to perform work in the US and comply with federal regulations'
    ],
    fundingTypes: ['Non-dilutive grant', 'Federal R&D contract'],
    keyDates: {
      applicationOpen: '2025-01-15',
      applicationClose: '2025-04-30',
      decisionDate: '2025-08-15'
    },
    applicationSteps: [
      {
        id: 'sbir-step-1',
        title: 'Identify agency solicitation',
        description:
          'Search SBIR.gov for relevant topics across agencies (NASA, NSF, DoD). Note submission rules.',
        example: 'Download DoD 2025.1 SBIR BAA and highlight topic alignment.',
        resourceLabel: 'SBIR topic search',
        resourceUrl: 'https://www.sbir.gov/solicitations'
      },
      {
        id: 'sbir-step-2',
        title: 'Register for required IDs',
        description:
          'Create SAM.gov, UEI, Grants.gov, and SBA Company Registry accounts (takes 2-3 weeks).',
        example: 'Complete SAM registration with NAICS code and banking info.',
        resourceLabel: 'Registration checklist',
        resourceUrl: 'https://www.sbir.gov/registration'
      },
      {
        id: 'sbir-step-3',
        title: 'Prepare Phase I proposal',
        description:
          'Draft technical narrative, work plan, commercialization strategy, and budget justification following agency format.',
        example: 'Include Gantt chart for 6-month Phase I with milestones and deliverables.',
        resourceLabel: 'SBIR Phase I template',
        resourceUrl: 'https://www.sbir.gov/tutorials'
      }
    ],
    tips: {
      mistakes: [
        'Missing pre-registration deadlines for SAM/Grants.gov',
        'Ignoring page limits or formatting instructions',
        'Weak commercialization section lacking market analysis'
      ],
      winning: [
        'Contact agency program manager with concise questions before submitting',
        'Include letters of support from potential customers or partners',
        'Demonstrate technical feasibility with preliminary data'
      ]
    },
    communityQuestions: [
      {
        question: 'Can we subcontract part of the work?',
        answers: ['Yes, but at least two-thirds of Phase I work must be performed by the small business.']
      },
      {
        question: 'How competitive is SBIR?',
        answers: [
          'Success rates vary by agency (10-20% typical). Strong technical narrative and commercialization plan are critical.'
        ]
      }
    ]
  }
];
