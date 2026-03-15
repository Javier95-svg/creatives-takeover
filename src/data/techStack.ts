export interface TechStackProduct {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  price: string;
  logo?: string; // Logo URL or image path
}

export interface TechStackCategory {
  id: string;
  name: string;
  description: string;
  icon: string; // Icon name from lucide-react
  products: TechStackProduct[];
}

export type TechStackData = TechStackCategory[];

export const techStackData: TechStackData = [
  {
    id: 'frontend',
    name: 'Frontend',
    description: 'The user interface layer of your application. Your frontend framework determines how users interact with your product and affects development speed, user experience, and scalability.',
    icon: 'Monitor',
    products: [
      {
        id: 'react',
        name: 'React',
        description: 'A JavaScript library for building user interfaces with component-based architecture.',
        pros: [
          'Large ecosystem and community support',
          'Flexible and unopinionated',
          'Strong performance with virtual DOM',
          'Widely adopted in industry'
        ],
        cons: [
          'Steep learning curve for beginners',
          'Requires additional libraries for routing and state management',
          'Frequent updates can cause breaking changes'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/react.svg'
      },
      {
        id: 'vue',
        name: 'Vue.js',
        description: 'A progressive JavaScript framework for building user interfaces with an approachable learning curve.',
        pros: [
          'Easy to learn and integrate',
          'Excellent documentation',
          'Lightweight and performant',
          'Flexible template syntax'
        ],
        cons: [
          'Smaller ecosystem compared to React',
          'Less corporate backing',
          'Fewer job opportunities in some markets'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/vuedotjs.svg'
      },
      {
        id: 'nextjs',
        name: 'Next.js',
        description: 'A React framework that provides server-side rendering, static site generation, and API routes out of the box.',
        pros: [
          'Built-in SEO optimization',
          'Excellent performance with SSR and SSG',
          'Great developer experience',
          'Strong TypeScript support'
        ],
        cons: [
          'Vendor lock-in to Vercel for optimal deployment',
          'Can be overkill for simple projects',
          'Learning curve for SSR concepts'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/nextdotjs.svg'
      },
      {
        id: 'angular',
        name: 'Angular',
        description: 'A comprehensive TypeScript-based framework for building large-scale enterprise applications.',
        pros: [
          'Full-featured framework with built-in tools',
          'Strong TypeScript integration',
          'Excellent for enterprise applications',
          'Comprehensive testing support'
        ],
        cons: [
          'Steep learning curve',
          'Heavier bundle size',
          'More opinionated and less flexible',
          'Slower development for small projects'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/angular.svg'
      }
    ]
  },
  {
    id: 'backend',
    name: 'Backend',
    description: 'The server-side logic that powers your application. Your backend handles data processing, business logic, and API endpoints. Critical for security, performance, and scalability.',
    icon: 'Server',
    products: [
      {
        id: 'nodejs',
        name: 'Node.js',
        description: 'A JavaScript runtime built on Chrome\'s V8 engine, enabling server-side JavaScript development.',
        pros: [
          'Single language for frontend and backend',
          'Large package ecosystem (npm)',
          'Excellent for real-time applications',
          'Strong community support'
        ],
        cons: [
          'Single-threaded can be limiting for CPU-intensive tasks',
          'Callback hell without proper async patterns',
          'Less mature than traditional backend languages'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/nodedotjs.svg'
      },
      {
        id: 'django',
        name: 'Django',
        description: 'A high-level Python web framework that encourages rapid development and clean, pragmatic design.',
        pros: [
          'Batteries-included approach',
          'Strong security features built-in',
          'Excellent admin interface',
          'Great for content-heavy applications'
        ],
        cons: [
          'Can be heavy for simple APIs',
          'Less flexible than microframeworks',
          'Steeper learning curve for beginners',
          'Monolithic structure'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/django.svg'
      },
      {
        id: 'supabase',
        name: 'Supabase',
        description: 'An open-source Firebase alternative providing PostgreSQL database, authentication, and real-time subscriptions.',
        pros: [
          'PostgreSQL with full SQL capabilities',
          'Built-in authentication and authorization',
          'Real-time subscriptions',
          'Generous free tier'
        ],
        cons: [
          'Smaller ecosystem than Firebase',
          'Less mature documentation',
          'Vendor lock-in concerns',
          'Limited serverless function support'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/supabase.svg'
      },
      {
        id: 'firebase',
        name: 'Firebase',
        description: 'Google\'s platform for building mobile and web applications with backend services and infrastructure.',
        pros: [
          'Comprehensive backend services',
          'Excellent real-time database',
          'Strong authentication system',
          'Generous free tier for startups'
        ],
        cons: [
          'NoSQL database limitations',
          'Vendor lock-in to Google',
          'Can become expensive at scale',
          'Less flexible than custom backends'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/firebase.svg'
      }
    ]
  },
  {
    id: 'hosting',
    name: 'Hosting / Infrastructure',
    description: 'Where your application lives and runs. Infrastructure choices impact uptime, performance, global reach, and operational complexity. Essential for delivering a reliable product experience.',
    icon: 'Cloud',
    products: [
      {
        id: 'vercel',
        name: 'Vercel',
        description: 'A platform for frontend frameworks and static sites with automatic deployments and edge network.',
        pros: [
          'Zero-config deployments',
          'Excellent performance with edge network',
          'Great developer experience',
          'Free tier for personal projects'
        ],
        cons: [
          'Primarily optimized for frontend',
          'Serverless function limitations',
          'Can be expensive at scale',
          'Vendor lock-in for optimal features'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/vercel.svg'
      },
      {
        id: 'aws',
        name: 'AWS',
        description: 'Amazon Web Services provides a comprehensive cloud computing platform with extensive service offerings.',
        pros: [
          'Extensive service catalog',
          'Highly scalable and reliable',
          'Pay-as-you-go pricing',
          'Industry standard for enterprise'
        ],
        cons: [
          'Complex pricing structure',
          'Steep learning curve',
          'Can be overwhelming for beginners',
          'Costs can spiral without monitoring'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/amazonaws.svg'
      },
      {
        id: 'railway',
        name: 'Railway',
        description: 'A modern platform that makes it easy to deploy applications with automatic scaling and zero configuration.',
        pros: [
          'Simple deployment process',
          'Automatic scaling',
          'Good developer experience',
          'Reasonable pricing'
        ],
        cons: [
          'Smaller ecosystem than AWS',
          'Less enterprise features',
          'Newer platform with less documentation',
          'Limited service offerings'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/railway.svg'
      },
      {
        id: 'render',
        name: 'Render',
        description: 'A unified cloud platform for hosting web services, databases, and static sites with automatic SSL.',
        pros: [
          'Simple deployment workflow',
          'Automatic SSL certificates',
          'Free tier available',
          'Good for small to medium projects'
        ],
        cons: [
          'Less scalable than AWS',
          'Limited advanced features',
          'Can be slower than competitors',
          'Smaller community support'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/render.svg'
      }
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Tools to understand user behavior and product performance. Analytics help you make data-driven decisions, identify growth opportunities, and optimize your product based on real usage patterns.',
    icon: 'BarChart',
    products: [
      {
        id: 'google-analytics',
        name: 'Google Analytics',
        description: 'A web analytics service that tracks and reports website traffic and user behavior.',
        pros: [
          'Free and comprehensive',
          'Industry standard',
          'Extensive documentation',
          'Integrates with Google services'
        ],
        cons: [
          'Privacy concerns with data collection',
          'Complex interface for beginners',
          'Data sampling on free tier',
          'Requires cookie consent in many regions'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googleanalytics.svg'
      },
      {
        id: 'mixpanel',
        name: 'Mixpanel',
        description: 'An advanced analytics platform focused on event tracking and user behavior analysis.',
        pros: [
          'Powerful event tracking',
          'Great for product analytics',
          'User segmentation features',
          'Real-time data updates'
        ],
        cons: [
          'Expensive at scale',
          'Steeper learning curve',
          'Requires implementation effort',
          'Can be overkill for simple sites'
        ],
        price: '$25/month',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/mixpanel.svg'
      },
      {
        id: 'amplitude',
        name: 'Amplitude',
        description: 'A product analytics platform that helps teams understand user behavior and drive growth.',
        pros: [
          'Excellent user journey tracking',
          'Strong visualization tools',
          'Good free tier',
          'Great for product teams'
        ],
        cons: [
          'Complex setup process',
          'Can be expensive for high volume',
          'Requires technical knowledge',
          'Less suitable for marketing analytics'
        ],
        price: 'Free / Usage-based',
        logo: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Ccircle cx="12" cy="12" r="12" fill="%2300D4FF"/%3E%3Cpath d="M8.2 17.2C8.3 17.1 8.4 17 12 7.5C15.6 17 15.7 17.1 15.8 17.2M10.2 13.2C10.3 13.1 11.2 10.8 11.5 10.5C11.8 10.8 12.7 13.1 12.8 13.2" stroke="%23000000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/%3E%3Cpath d="M9.5 12.2C9.8 12.1 10.5 11.8 11.5 11.8C12.5 11.8 13.2 12.1 13.5 12.2" stroke="%23000000" stroke-width="2.2" stroke-linecap="round" fill="none"/%3E%3C/svg%3E'
      },
      {
        id: 'posthog',
        name: 'PostHog',
        description: 'An open-source product analytics platform that provides insights into user behavior and product usage.',
        pros: [
          'Open-source and self-hostable',
          'Comprehensive feature set',
          'Good privacy controls',
          'Reasonable pricing'
        ],
        cons: [
          'Smaller community than competitors',
          'Self-hosting requires infrastructure',
          'Less mature than established players',
          'Limited third-party integrations'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/posthog.svg'
      }
    ]
  },
  {
    id: 'payments',
    name: 'Payments',
    description: 'How you accept money from customers. Payment processing is critical for revenue generation. The right solution balances ease of integration, transaction fees, and global reach.',
    icon: 'CreditCard',
    products: [
      {
        id: 'stripe',
        name: 'Stripe',
        description: 'A payment processing platform that enables businesses to accept payments online with a developer-friendly API.',
        pros: [
          'Excellent developer experience',
          'Comprehensive documentation',
          'Supports many payment methods',
          'Strong security and compliance'
        ],
        cons: [
          'Transaction fees can add up',
          'Requires technical integration',
          'Account approval process',
          'Less suitable for physical retail'
        ],
        price: '2.9% + $0.30 per transaction',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/stripe.svg'
      },
      {
        id: 'paypal',
        name: 'PayPal',
        description: 'A widely recognized payment processor that allows customers to pay using their PayPal accounts or cards.',
        pros: [
          'High brand recognition',
          'Easy customer checkout',
          'Global acceptance',
          'Buyer protection features'
        ],
        cons: [
          'Higher fees than some competitors',
          'Less developer-friendly API',
          'Account holds and freezes possible',
          'Limited customization options'
        ],
        price: '2.9% + $0.30 per transaction',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/paypal.svg'
      },
      {
        id: 'square',
        name: 'Square',
        description: 'A payment processing platform that offers both online and in-person payment solutions for businesses.',
        pros: [
          'Unified online and offline payments',
          'Simple pricing structure',
          'Good for small businesses',
          'Hardware options available'
        ],
        cons: [
          'Less flexible than Stripe',
          'Limited international support',
          'Fewer advanced features',
          'Less suitable for complex use cases'
        ],
        price: '2.6% + $0.10 per transaction',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/square.svg'
      },
      {
        id: 'paddle',
        name: 'Paddle',
        description: 'A merchant of record platform that handles payments, taxes, and compliance for software businesses.',
        pros: [
          'Handles tax compliance automatically',
          'Good for SaaS businesses',
          'Simplified international sales',
          'Reduces legal complexity'
        ],
        cons: [
          'Higher fees than payment processors',
          'Less control over customer data',
          'Limited customization',
          'Smaller ecosystem'
        ],
        price: '5% + $0.50 per transaction',
        logo: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"%3E%3Cpath d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 22.8C6.04 22.8 1.2 17.96 1.2 12S6.04 1.2 12 1.2 22.8 6.04 22.8 12 17.96 22.8 12 22.8zm-1.2-6.6h2.4v-7.2h-2.4v7.2zm0-8.4h2.4V6h-2.4v1.8z"/%3E%3C/svg%3E'
      }
    ]
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Email delivery for transactional messages and user communication. Reliable email infrastructure ensures users receive important notifications, password resets, and updates, directly impacting user trust and engagement.',
    icon: 'Mail',
    products: [
      {
        id: 'sendgrid',
        name: 'SendGrid',
        description: 'A cloud-based email service that delivers transactional and marketing emails with high deliverability rates.',
        pros: [
          'High deliverability rates',
          'Good free tier',
          'Comprehensive API',
          'Strong analytics'
        ],
        cons: [
          'Can be expensive at scale',
          'Complex pricing tiers',
          'Less user-friendly interface',
          'Limited template options'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/twiliosendgrid.svg'
      },
      {
        id: 'mailchimp',
        name: 'Mailchimp',
        description: 'An all-in-one marketing platform that combines email marketing, automation, and analytics tools.',
        pros: [
          'User-friendly interface',
          'Good for marketing campaigns',
          'Built-in automation',
          'Free tier available'
        ],
        cons: [
          'Expensive for transactional emails',
          'Less developer-friendly',
          'Can be slow for high volume',
          'Limited API flexibility'
        ],
        price: 'Free / Usage-based',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/mailchimp.svg'
      },
      {
        id: 'resend',
        name: 'Resend',
        description: 'A modern email API for developers that focuses on simplicity and deliverability for transactional emails.',
        pros: [
          'Developer-friendly API',
          'Simple pricing',
          'Good deliverability',
          'React email support'
        ],
        cons: [
          'Newer platform with less history',
          'Limited marketing features',
          'Smaller ecosystem',
          'Fewer integrations'
        ],
        price: 'Free / Usage-based',
        logo: 'https://logo.clearbit.com/resend.com'
      },
      {
        id: 'postmark',
        name: 'Postmark',
        description: 'A transactional email service known for high deliverability and detailed bounce handling.',
        pros: [
          'Excellent deliverability',
          'Detailed bounce handling',
          'Simple pricing model',
          'Great for transactional emails'
        ],
        cons: [
          'Not suitable for marketing emails',
          'Higher cost per email',
          'Limited free tier',
          'Less feature-rich than competitors'
        ],
        price: '$15/month',
        logo: 'https://logo.clearbit.com/postmarkapp.com'
      }
    ]
  },
  {
    id: 'lead-generation',
    name: 'Lead Generation',
    description: 'Tools to find and connect with potential customers. Lead generation platforms help you identify prospects, gather contact information, and initiate sales conversations, accelerating your go-to-market efforts.',
    icon: 'Users',
    products: [
      {
        id: 'apollo',
        name: 'Apollo.io',
        description: 'A sales intelligence platform that provides contact data, email sequences, and CRM integration for sales teams.',
        pros: [
          'Large contact database',
          'Email sequencing features',
          'CRM integrations',
          'Good for B2B sales'
        ],
        cons: [
          'Expensive pricing',
          'Data accuracy varies',
          'Can feel spammy if misused',
          'Requires compliance awareness'
        ],
        price: '$49/month',
        logo: 'https://logo.clearbit.com/apollo.io'
      },
      {
        id: 'liskit',
        name: 'Liskit',
        description: 'A lead generation platform that helps businesses find and connect with potential customers through various channels.',
        pros: [
          'Multiple lead sources',
          'Affordable pricing',
          'Easy to use',
          'Good for small businesses'
        ],
        cons: [
          'Smaller database than competitors',
          'Less advanced features',
          'Limited integrations',
          'Newer platform'
        ],
        price: '$29/month',
        logo: 'https://logo.clearbit.com/liskit.com'
      },
      {
        id: 'linkedin-sales',
        name: 'LinkedIn Sales Navigator',
        description: 'LinkedIn\'s premium tool for sales professionals to find leads, build relationships, and track prospects.',
        pros: [
          'Access to LinkedIn network',
          'Advanced search filters',
          'InMail messaging',
          'Lead recommendations'
        ],
        cons: [
          'Expensive subscription',
          'Requires active LinkedIn presence',
          'Limited to LinkedIn data',
          'Can be time-consuming'
        ],
        price: '$79/month'
      },
      {
        id: 'hunter',
        name: 'Hunter',
        description: 'An email finder tool that helps you discover email addresses associated with domain names and individuals.',
        pros: [
          'Accurate email verification',
          'Simple API',
          'Chrome extension available',
          'Good free tier'
        ],
        cons: [
          'Limited to email finding',
          'Can be expensive for bulk',
          'Rate limits on free tier',
          'Less comprehensive than full platforms'
        ],
        price: 'Free / Usage-based',
        logo: 'https://logo.clearbit.com/hunter.io'
      }
    ]
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'Customer relationship management tools help you organize leads, track deals, manage pipelines, and keep sales follow-up moving. A strong CRM becomes the operating system for your revenue process.',
    icon: 'Users',
    products: [
      {
        id: 'hubspot-crm',
        name: 'HubSpot',
        description: 'A widely adopted CRM with contact management, pipeline tracking, and marketing integrations that fit startups and growing teams.',
        pros: [
          'Free CRM entry point with upgrade path',
          'Easy to use and onboard teams quickly',
          'Strong marketing and automation ecosystem',
          'Large integration marketplace'
        ],
        cons: [
          'Paid upgrades can get expensive as you scale',
          'Advanced automation is locked behind higher tiers',
          'Can feel opinionated for custom workflows',
          'Seat-based pricing adds up for larger teams'
        ],
        price: 'Free / $15 per seat/month',
        logo: 'https://logo.clearbit.com/hubspot.com'
      },
      {
        id: 'salesforce-crm',
        name: 'Salesforce',
        description: 'An enterprise-grade CRM platform built for customizable sales workflows, reporting, and large-scale customer operations.',
        pros: [
          'Highly customizable for complex sales teams',
          'Massive ecosystem and AppExchange integrations',
          'Strong reporting and forecasting capabilities',
          'Trusted enterprise standard'
        ],
        cons: [
          'Steeper learning curve than simpler CRMs',
          'Implementation often requires more setup time',
          'Costs rise quickly with add-ons and seats',
          'Can be overkill for early-stage startups'
        ],
        price: 'Free / $25 per user/month',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/salesforce.svg'
      },
      {
        id: 'zoho-crm',
        name: 'Zoho CRM',
        description: 'A flexible CRM for startups and SMBs that combines deal tracking, workflow automation, and multi-channel communication.',
        pros: [
          'Affordable compared with many CRM competitors',
          'Broad feature set for growing teams',
          'Good automation and workflow tools',
          'Fits well inside the wider Zoho ecosystem'
        ],
        cons: [
          'Interface can feel less polished than peers',
          'Advanced setup takes some configuration work',
          'Learning the ecosystem can take time',
          'Some integrations are less seamless than top-tier rivals'
        ],
        price: 'Free / $14 per user/month',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/zoho.svg'
      },
      {
        id: 'pipedrive-crm',
        name: 'Pipedrive',
        description: 'A sales-focused CRM known for visual pipelines, straightforward usability, and fast setup for teams that need to move deals efficiently.',
        pros: [
          'Very intuitive pipeline management',
          'Quick setup for lean sales teams',
          'Strong activity and deal tracking',
          'Good fit for outbound and SMB workflows'
        ],
        cons: [
          'Less robust for complex enterprise needs',
          'Advanced features require higher plans',
          'Limited all-in-one marketing depth',
          'Can need extra tools for broader operations'
        ],
        price: '$14 per user/month',
        logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/pipedrive.svg'
      }
    ]
  }
];

