import { FAQItem, FAQCategory, QuickActionType, createFAQItem } from '@/types/faq';

export const chatbotFAQ: FAQItem[] = [
  createFAQItem({
    id: 'what-is-bizmap',
    keywords: ['what is', 'bizmap', 'about', 'explain', 'what does', 'service'],
    synonyms: ['what does bizmap do', 'tell me about bizmap', 'bizmap platform'],
    question: 'What is BizMap AI?',
    answer: 'BizMap AI is an AI-powered business planning platform that transforms your ideas into comprehensive, actionable business plans in minutes. We use advanced AI to provide market analysis, validation experiments, and custom execution strategies.',
    shortAnswer: 'An AI-powered platform that creates comprehensive business plans from your ideas in minutes.',
    category: FAQCategory.GENERAL,
    priority: 9,
    quickActions: [
      { text: 'Start Planning', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/dream2plan', priority: 1 },
      { text: 'Learn More', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/services', priority: 2 }
    ],
    metadata: {
      views: 2847,
      helpful: 234,
      notHelpful: 12,
      tags: ['platform', 'AI', 'business planning']
    }
  }),

  createFAQItem({
    id: 'pricing',
    keywords: ['price', 'cost', 'pricing', 'how much', 'plans', 'subscription', 'free'],
    synonyms: ['what does it cost', 'subscription price', 'plan costs'],
    question: 'How much does it cost?',
    answer: 'We offer flexible pricing plans starting with a free tier. Our Starter plan includes basic features, while Elite and Teams plans provide advanced AI analysis, unlimited business plans, and priority support.',
    shortAnswer: 'Flexible plans from free tier to Elite and Teams with advanced features.',
    category: FAQCategory.PRICING,
    priority: 8,
    quickActions: [
      { text: 'View Pricing', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/pricing', priority: 1 },
      { text: 'Start Free Trial', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/signup', priority: 2 }
    ],
    metadata: {
      views: 1923,
      helpful: 187,
      notHelpful: 8,
      tags: ['pricing', 'plans', 'subscription']
    }
  }),

  createFAQItem({
    id: 'how-it-works',
    keywords: ['how does', 'work', 'process', 'steps', 'guide', 'tutorial'],
    synonyms: ['how it functions', 'planning process', 'step by step'],
    question: 'How does the business planning work?',
    answer: 'Simply describe your business idea, and our AI analyzes it in 4 steps: Market Research, Validation Experiments, Business Model Design, and Execution Strategy. You get a comprehensive business plan in minutes, not weeks.',
    shortAnswer: '4-step AI process: Research, Validation, Business Model, Execution Strategy.',
    category: FAQCategory.PROCESS,
    priority: 8,
    quickActions: [
      { text: 'Try It Now', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/dream2plan', priority: 1 },
      { text: 'Learn More', action: 'scroll', type: QuickActionType.SCROLL, href: '#how-we-work', priority: 2 }
    ],
    followUpQuestions: ['What AI technology do you use?', 'How much does it cost?'],
    metadata: {
      views: 1567,
      helpful: 145,
      notHelpful: 6,
      tags: ['process', 'AI', 'steps']
    }
  }),

  createFAQItem({
    id: 'free-trial',
    keywords: ['free', 'trial', 'demo', 'test', 'try', 'without paying'],
    synonyms: ['free version', 'trial period', 'demo version'],
    question: 'Can I try it for free?',
    answer: 'Yes! We offer a free tier that includes basic business plan generation. You can also schedule a live demo to see the full platform in action with one of our experts.',
    shortAnswer: 'Yes! Free tier available plus live demo options.',
    category: FAQCategory.PRICING,
    priority: 7,
    quickActions: [
      { text: 'Start Free', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/signup', priority: 1 },
      { text: 'View Pricing', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/pricing', priority: 2 }
    ],
    metadata: {
      views: 1234,
      helpful: 112,
      notHelpful: 4,
      tags: ['free', 'trial', 'demo']
    }
  }),

  createFAQItem({
    id: 'community',
    keywords: ['community', 'connect', 'network', 'entrepreneurs', 'share', 'stories'],
    synonyms: ['networking', 'entrepreneur community', 'connect with others'],
    question: 'How can I connect with other entrepreneurs?',
    answer: 'Join our vibrant community where entrepreneurs share their journeys, wins, failures, and lessons learned. It\'s like Reddit for entrepreneurs - post your story, ask questions, and learn from others.',
    shortAnswer: 'Vibrant entrepreneur community for sharing journeys and networking.',
    category: FAQCategory.COMMUNITY,
    priority: 6,
    quickActions: [
      { text: 'Join Community', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/community', priority: 1 },
      { text: 'View Stories', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/community', priority: 2 }
    ],
    metadata: {
      views: 987,
      helpful: 89,
      notHelpful: 3,
      tags: ['community', 'networking', 'entrepreneurs']
    }
  }),

  createFAQItem({
    id: 'accountability',
    keywords: ['accountability', 'partners', 'motivation', 'support', 'goals', 'progress'],
    synonyms: ['accountability system', 'partner matching', 'goal tracking'],
    question: 'How do accountability partners work?',
    answer: 'Connect with like-minded entrepreneurs who help you stay motivated and on track. Share your goals, check in regularly, and celebrate achievements together. It\'s proven to increase success rates significantly.',
    shortAnswer: 'Partner with entrepreneurs for motivation, goal sharing, and progress tracking.',
    category: FAQCategory.FEATURES,
    priority: 6,
    quickActions: [
      { text: 'Find Partners', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/accountability', priority: 1 },
      { text: 'Learn More', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/services', priority: 2 }
    ],
    metadata: {
      views: 756,
      helpful: 67,
      notHelpful: 2,
      tags: ['accountability', 'partners', 'motivation']
    }
  }),

  createFAQItem({
    id: 'support',
    keywords: ['help', 'support', 'contact', 'assistance', 'problem', 'issue'],
    synonyms: ['customer service', 'get help', 'technical support'],
    question: 'How can I get help or support?',
    answer: 'We offer multiple support channels: live chat, email support, comprehensive FAQ, and video tutorials. Premium users get priority support and can schedule one-on-one calls with our experts.',
    shortAnswer: 'Multiple support channels including live chat, email, FAQ, and tutorials.',
    category: FAQCategory.SUPPORT,
    priority: 7,
    quickActions: [
      { text: 'Contact Us', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/contact', priority: 1 },
      { text: 'View FAQ', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/faq', priority: 2 }
    ],
    metadata: {
      views: 1456,
      helpful: 128,
      notHelpful: 7,
      tags: ['support', 'help', 'contact']
    }
  }),

  createFAQItem({
    id: 'ai-technology',
    keywords: ['ai', 'technology', 'gpt', 'artificial intelligence', 'model', 'advanced'],
    synonyms: ['AI models', 'machine learning', 'artificial intelligence tech'],
    question: 'What AI technology do you use?',
    answer: 'We use state-of-the-art AI models including GPT-5 for business analysis, market research, and strategic planning. Our AI is specifically trained on business planning methodologies and real market data.',
    shortAnswer: 'GPT-5 and advanced AI models trained on business planning and market data.',
    category: FAQCategory.TECHNOLOGY,
    priority: 5,
    quickActions: [
      { text: 'See AI in Action', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/dream2plan', priority: 1 },
      { text: 'Learn About Features', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/services', priority: 2 }
    ],
    followUpQuestions: ['How does the business planning work?', 'What is BizMap AI?'],
    metadata: {
      views: 1089,
      helpful: 98,
      notHelpful: 5,
      tags: ['AI', 'technology', 'GPT-5', 'models']
    }
  })
];

export const getContextualFAQ = (currentPath: string): FAQItem[] => {
  const contextualMap: Record<string, string[]> = {
    '/': ['what-is-bizmap', 'how-it-works', 'free-trial'],
    '/pricing': ['pricing', 'free-trial', 'support'],
    '/dream2plan': ['how-it-works', 'ai-technology', 'support'],
    '/community': ['community', 'accountability', 'support'],
    '/services': ['what-is-bizmap', 'accountability', 'ai-technology'],
    '/contact': ['support', 'pricing', 'free-trial']
  };

  const relevantIds = contextualMap[currentPath] || ['what-is-bizmap', 'pricing', 'support'];
  return chatbotFAQ.filter(item => relevantIds.includes(item.id));
};