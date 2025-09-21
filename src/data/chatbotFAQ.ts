export interface FAQItem {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
  category: string;
  quickActions?: Array<{
    text: string;
    action: string;
    href?: string;
  }>;
}

export const chatbotFAQ: FAQItem[] = [
  {
    id: 'what-is-bizmap',
    keywords: ['what is', 'bizmap', 'about', 'explain', 'what does', 'service'],
    question: 'What is BizMap AI?',
    answer: 'BizMap AI is an AI-powered business planning platform that transforms your ideas into comprehensive, actionable business plans in minutes. We use advanced AI to provide market analysis, validation experiments, and custom execution strategies.',
    category: 'general',
    quickActions: [
      { text: 'Start Planning', action: 'navigate', href: '/dream2plan' },
      { text: 'View Demo', action: 'navigate', href: '/demo-calls' }
    ]
  },
  {
    id: 'pricing',
    keywords: ['price', 'cost', 'pricing', 'how much', 'plans', 'subscription', 'free'],
    question: 'How much does it cost?',
    answer: 'We offer flexible pricing plans starting with a free tier. Our Starter plan includes basic features, while Elite and Teams plans provide advanced AI analysis, unlimited business plans, and priority support.',
    category: 'pricing',
    quickActions: [
      { text: 'View Pricing', action: 'navigate', href: '/pricing' },
      { text: 'Start Free Trial', action: 'navigate', href: '/signup' }
    ]
  },
  {
    id: 'how-it-works',
    keywords: ['how does', 'work', 'process', 'steps', 'guide', 'tutorial'],
    question: 'How does the business planning work?',
    answer: 'Simply describe your business idea, and our AI analyzes it in 4 steps: Market Research, Validation Experiments, Business Model Design, and Execution Strategy. You get a comprehensive business plan in minutes, not weeks.',
    category: 'process',
    quickActions: [
      { text: 'Try It Now', action: 'navigate', href: '/dream2plan' },
      { text: 'Learn More', action: 'scroll', href: '#how-we-work' }
    ]
  },
  {
    id: 'free-trial',
    keywords: ['free', 'trial', 'demo', 'test', 'try', 'without paying'],
    question: 'Can I try it for free?',
    answer: 'Yes! We offer a free tier that includes basic business plan generation. You can also schedule a live demo to see the full platform in action with one of our experts.',
    category: 'pricing',
    quickActions: [
      { text: 'Start Free', action: 'navigate', href: '/signup' },
      { text: 'Schedule Demo', action: 'navigate', href: '/demo-calls' }
    ]
  },
  {
    id: 'community',
    keywords: ['community', 'connect', 'network', 'entrepreneurs', 'share', 'stories'],
    question: 'How can I connect with other entrepreneurs?',
    answer: 'Join our vibrant community where entrepreneurs share their journeys, wins, failures, and lessons learned. It\'s like Reddit for entrepreneurs - post your story, ask questions, and learn from others.',
    category: 'community',
    quickActions: [
      { text: 'Join Community', action: 'navigate', href: '/community' },
      { text: 'View Stories', action: 'navigate', href: '/community' }
    ]
  },
  {
    id: 'accountability',
    keywords: ['accountability', 'partners', 'motivation', 'support', 'goals', 'progress'],
    question: 'How do accountability partners work?',
    answer: 'Connect with like-minded entrepreneurs who help you stay motivated and on track. Share your goals, check in regularly, and celebrate achievements together. It\'s proven to increase success rates significantly.',
    category: 'features',
    quickActions: [
      { text: 'Find Partners', action: 'navigate', href: '/accountability' },
      { text: 'Learn More', action: 'navigate', href: '/services' }
    ]
  },
  {
    id: 'support',
    keywords: ['help', 'support', 'contact', 'assistance', 'problem', 'issue'],
    question: 'How can I get help or support?',
    answer: 'We offer multiple support channels: live chat, email support, comprehensive FAQ, and video tutorials. Premium users get priority support and can schedule one-on-one calls with our experts.',
    category: 'support',
    quickActions: [
      { text: 'Contact Us', action: 'navigate', href: '/contact' },
      { text: 'View FAQ', action: 'navigate', href: '/faq' }
    ]
  },
  {
    id: 'ai-technology',
    keywords: ['ai', 'technology', 'gpt', 'artificial intelligence', 'model', 'advanced'],
    question: 'What AI technology do you use?',
    answer: 'We use state-of-the-art AI models including GPT-5 for business analysis, market research, and strategic planning. Our AI is specifically trained on business planning methodologies and real market data.',
    category: 'technology',
    quickActions: [
      { text: 'See AI in Action', action: 'navigate', href: '/dream2plan' },
      { text: 'Learn About Features', action: 'navigate', href: '/services' }
    ]
  }
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