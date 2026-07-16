import { FAQItem, FAQCategory, QuickActionType, createFAQItem } from '@/types/faq';

// Business intelligence and analytics interfaces
export interface FAQAnalytics {
  totalViews: number;
  averageRating: number;
  resolutionRate: number;
  mostSearchedTerms: string[];
  userSatisfactionTrend: number[];
  conversionRate: number;
  lastUpdated: string;
}

export interface BusinessInsight {
  category: string;
  insight: string;
  confidence: number;
  source: string;
  lastValidated: string;
  relatedFAQs: string[];
}

export interface FAQBusinessMetrics {
  faqId: string;
  businessValue: number; // 1-10 scale
  userImpact: number; // 1-10 scale
  conversionPotential: number; // 1-10 scale
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  businessContext: string[];
}

// Enhanced FAQ data with business intelligence
export const chatbotFAQ: FAQItem[] = [
  createFAQItem({
    id: 'what-is-bizmap',
    keywords: ['what is', 'bizmap', 'about', 'explain', 'what does', 'service'],
    synonyms: ['what does bizmap do', 'tell me about bizmap', 'bizmap platform'],
    question: 'What is Creatives Takeover?',
    answer: 'Creatives Takeover is a founder support platform built to help people build startups from scratch. BizMap AI is the guided AI workspace inside that journey, helping you move through the Startup Development Cycle with validation, decision support, and execution guidance.',
    shortAnswer: 'A founder support platform that helps you build a startup from scratch with guided AI and execution tools.',
    category: FAQCategory.GENERAL,
    priority: 9,
    quickActions: [
      { text: 'Start Planning', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/bizmap-ai', priority: 1 },
      { text: 'Learn More', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/marketplace', priority: 2 }
    ],
    metadata: {
      views: 2847,
      helpful: 234,
      notHelpful: 12,
      tags: ['platform', 'AI', 'startup development']
    }
  }),
  createFAQItem({
    id: 'pricing',
    keywords: ['price', 'cost', 'pricing', 'how much', 'plans', 'subscription', 'free'],
    synonyms: ['what does it cost', 'subscription price', 'plan costs'],
    question: 'How much does it cost?',
    answer: 'We offer four plans: Rookie is free with 50 credits/month, Starter is $9/month or $79/year with 100 credits, Rising is $29/month or $239/year with 250 credits, and Pro is $65/month or $589/year with 600 credits. Demo Studio costs 4 credits on Rookie and 3 credits on paid plans. MVP Builder is available on every plan and charges per AI action.',
    shortAnswer: 'Rookie, Starter, Rising, and Pro give you 50, 100, 250, and 600 monthly credits respectively.',
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
    question: 'How does the Startup Development Cycle work?',
    answer: 'The Startup Development Cycle helps you move from rough idea to real startup in stages: clarify the problem, validate demand, define the customer, shape the offer, decide what to build, and keep executing with focus. BizMap AI and the surrounding tools support each step so you keep moving instead of getting stuck in theory.',
    shortAnswer: 'A guided startup-building process that takes you from rough idea to validated execution steps.',
    category: FAQCategory.PROCESS,
    priority: 8,
    quickActions: [
      { text: 'Try It Now', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/bizmap-ai', priority: 1 },
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
    answer: 'Yes. Rookie is free forever and gives you 10 monthly credits, free ICP Builder access, Insighta Test, Newspaper, and early-stage browsing or preview access across the platform. You can also schedule a live demo to see the full workflow before upgrading.',
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
      { text: 'Join Community', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/mentorship', priority: 1 },
      { text: 'View Stories', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/mentorship', priority: 2 }
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
      { text: 'Learn More', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/marketplace', priority: 2 }
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
      { text: 'See AI in Action', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/bizmap-ai', priority: 1 },
      { text: 'Learn About Features', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/marketplace', priority: 2 }
    ],
    followUpQuestions: ['How does the Startup Development Cycle work?', 'What is Creatives Takeover?'],
    metadata: {
      views: 1089,
      helpful: 98,
      notHelpful: 5,
      tags: ['AI', 'technology', 'GPT-5', 'models']
    }
  }),
  // New enhanced FAQ items with business intelligence
  createFAQItem({
    id: 'business-plan-sections',
    keywords: ['startup development cycle', 'stages', 'process', 'execution', 'mvp', 'validation'],
    synonyms: ['startup process', 'build from scratch', 'how the cycle works'],
    question: 'What does the Startup Development Cycle include?',
    answer: 'The Startup Development Cycle covers the work founders actually need to do next: understanding the problem, validating demand, defining the customer, refining positioning, choosing the right stack, shaping the MVP, and building a realistic execution rhythm. It is designed to help you move from scratch to momentum, not just generate a polished document.',
    shortAnswer: 'A guided cycle covering validation, customer clarity, positioning, MVP decisions, stack choices, and execution.',
    category: FAQCategory.PROCESS,
    priority: 8,
    quickActions: [
      { text: 'Start Building', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/bizmap-ai', priority: 1 },
      { text: 'View Template', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/marketplace', priority: 2 }
    ],
    metadata: {
      views: 1456,
      helpful: 134,
      notHelpful: 8,
      tags: ['startup development', 'validation', 'execution', 'MVP']
    }
  }),
  createFAQItem({
    id: 'market-research-tools',
    keywords: ['market research', 'analysis', 'competitors', 'industry', 'data', 'insights'],
    synonyms: ['market analysis', 'competitive research', 'industry analysis'],
    question: 'What market research tools do you provide?',
    answer: 'We provide comprehensive market research including competitor analysis, industry trends, target market identification, pricing strategies, and market size calculations. Our AI analyzes real-time data from multiple sources to give you actionable insights.',
    shortAnswer: 'Competitor analysis, industry trends, target market research, pricing strategies, and market size calculations.',
    category: FAQCategory.FEATURES,
    priority: 7,
    quickActions: [
      { text: 'Start Market Research', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/bizmap-ai', priority: 1 },
      { text: 'View Sample Analysis', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/marketplace', priority: 2 }
    ],
    metadata: {
      views: 1234,
      helpful: 112,
      notHelpful: 6,
      tags: ['market research', 'analysis', 'competitors', 'insights']
    }
  }),
  createFAQItem({
    id: 'financial-projections',
    keywords: ['financial', 'projections', 'forecasting', 'revenue', 'expenses', 'cash flow'],
    synonyms: ['financial modeling', 'revenue forecasting', 'financial planning'],
    question: 'How accurate are the financial projections?',
    answer: 'Our financial projections are based on industry benchmarks, market data, and proven financial modeling techniques. While we provide realistic estimates, actual results may vary based on market conditions and execution. We recommend regular updates as your business grows.',
    shortAnswer: 'Based on industry benchmarks and market data, with recommendations for regular updates.',
    category: FAQCategory.FEATURES,
    priority: 8,
    quickActions: [
      { text: 'Create Financial Model', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/bizmap-ai', priority: 1 },
      { text: 'Learn More', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/marketplace', priority: 2 }
    ],
    metadata: {
      views: 987,
      helpful: 89,
      notHelpful: 4,
      tags: ['financial', 'projections', 'forecasting', 'modeling']
    }
  }),
  createFAQItem({
    id: 'data-security',
    keywords: ['security', 'privacy', 'data protection', 'confidential', 'safe', 'secure'],
    synonyms: ['data privacy', 'information security', 'confidentiality'],
    question: 'Is my business idea safe?',
    answer: 'Yes. Your workspace is private by default and protected with secure infrastructure, encryption, and access controls. We do not share or sell your private startup work. And in practical terms, ideas are rarely stolen into success - execution, customer understanding, and speed matter far more. Our goal is to help you move faster while keeping your work private.',
    shortAnswer: 'Yes. Your startup work stays private, protected, and tied to your workspace.',
    category: FAQCategory.TECHNICAL,
    priority: 9,
    quickActions: [
      { text: 'View Privacy Policy', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/privacy', priority: 1 },
      { text: 'Contact Security Team', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/contact', priority: 2 }
    ],
    metadata: {
      views: 756,
      helpful: 67,
      notHelpful: 2,
      tags: ['security', 'privacy', 'data protection', 'encryption']
    }
  }),
  createFAQItem({
    id: 'integration-options',
    keywords: ['integrate', 'api', 'export', 'import', 'connect', 'sync'],
    synonyms: ['API integration', 'data export', 'system integration'],
    question: 'Can I integrate with other business tools?',
    answer: 'Yes! We offer API access and integrations with popular business tools like CRM systems, accounting software, project management platforms, and more. You can also export your business plans in multiple formats (PDF, Word, Excel).',
    shortAnswer: 'API access and integrations with CRM, accounting, and project management tools, plus multiple export formats.',
    category: FAQCategory.TECHNICAL,
    priority: 6,
    quickActions: [
      { text: 'View Integrations', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/marketplace', priority: 1 },
      { text: 'API Documentation', action: 'navigate', type: QuickActionType.NAVIGATE, href: '/api-docs', priority: 2 }
    ],
    metadata: {
      views: 543,
      helpful: 45,
      notHelpful: 3,
      tags: ['integration', 'API', 'export', 'connect']
    }
  })
];

// Enhanced contextual FAQ with business intelligence
export const getContextualFAQ = (currentPath: string): FAQItem[] => {
  const contextualMap: Record<string, string[]> = {
    '/': ['what-is-bizmap', 'how-it-works', 'free-trial'],
    '/pricing': ['pricing', 'free-trial', 'support'],
    '/bizmap-ai': ['how-it-works', 'ai-technology', 'business-plan-sections', 'market-research-tools'],
    '/mentorship': ['community', 'accountability', 'support'],
    '/marketplace': ['what-is-bizmap', 'accountability', 'ai-technology', 'integration-options'],
    '/contact': ['support', 'pricing', 'free-trial'],
    '/financial': ['financial-projections', 'pricing', 'support'],
    '/market-research': ['market-research-tools', 'business-plan-sections', 'support'],
    '/security': ['data-security', 'privacy', 'support']
  };

  const relevantIds = contextualMap[currentPath] || ['what-is-bizmap', 'pricing', 'support'];
  return chatbotFAQ.filter(item => relevantIds.includes(item.id));
};

// Business intelligence and analytics functions
export class FAQBusinessIntelligence {
  private static analytics: Map<string, FAQAnalytics> = new Map();
  private static businessMetrics: Map<string, FAQBusinessMetrics> = new Map();
  private static insights: BusinessInsight[] = [];

  // Track FAQ interaction for analytics
  static trackFAQInteraction(faqId: string, interaction: {
    type: 'view' | 'click' | 'helpful' | 'not_helpful' | 'conversion';
    data?: any;
  }): void {
    const currentAnalytics = this.analytics.get(faqId) || {
      totalViews: 0,
      averageRating: 0,
      resolutionRate: 0,
      mostSearchedTerms: [],
      userSatisfactionTrend: [],
      conversionRate: 0,
      lastUpdated: new Date().toISOString()
    };

    switch (interaction.type) {
      case 'view':
        currentAnalytics.totalViews += 1;
        break;
      case 'helpful':
        currentAnalytics.averageRating = (currentAnalytics.averageRating + 5) / 2;
        currentAnalytics.userSatisfactionTrend.push(5);
        break;
      case 'not_helpful':
        currentAnalytics.averageRating = (currentAnalytics.averageRating + 1) / 2;
        currentAnalytics.userSatisfactionTrend.push(1);
        break;
      case 'conversion':
        currentAnalytics.conversionRate = (currentAnalytics.conversionRate + 1) / currentAnalytics.totalViews;
        break;
    }

    currentAnalytics.lastUpdated = new Date().toISOString();
    this.analytics.set(faqId, currentAnalytics);
  }

  // Get business insights from FAQ data
  static getBusinessInsights(): BusinessInsight[] {
    return this.insights;
  }

  // Generate insights from FAQ analytics
  static generateInsights(): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    // Most popular FAQs
    const popularFAQs = Array.from(this.analytics.entries())
      .sort(([,a], [,b]) => b.totalViews - a.totalViews)
      .slice(0, 5);

    insights.push({
      category: 'User Engagement',
      insight: `Top FAQ: ${popularFAQs[0]?.[0]} with ${popularFAQs[0]?.[1].totalViews} views`,
      confidence: 0.9,
      source: 'FAQ Analytics',
      lastValidated: new Date().toISOString(),
      relatedFAQs: popularFAQs.map(([id]) => id)
    });

    // Low satisfaction FAQs
    const lowSatisfactionFAQs = Array.from(this.analytics.entries())
      .filter(([,analytics]) => analytics.averageRating < 3)
      .map(([id]) => id);

    if (lowSatisfactionFAQs.length > 0) {
      insights.push({
        category: 'Content Quality',
        insight: `${lowSatisfactionFAQs.length} FAQs need improvement based on user feedback`,
        confidence: 0.8,
        source: 'User Ratings',
        lastValidated: new Date().toISOString(),
        relatedFAQs: lowSatisfactionFAQs
      });
    }

    // High conversion FAQs
    const highConversionFAQs = Array.from(this.analytics.entries())
      .filter(([,analytics]) => analytics.conversionRate > 0.1)
      .map(([id]) => id);

    if (highConversionFAQs.length > 0) {
      insights.push({
        category: 'Conversion Optimization',
        insight: `${highConversionFAQs.length} FAQs are driving conversions effectively`,
        confidence: 0.85,
        source: 'Conversion Data',
        lastValidated: new Date().toISOString(),
        relatedFAQs: highConversionFAQs
      });
    }

    this.insights = insights;
    return insights;
  }

  // Get FAQ performance metrics
  static getFAQPerformanceMetrics(faqId: string): FAQAnalytics | null {
    return this.analytics.get(faqId) || null;
  }

  // Get business value metrics for FAQ
  static getBusinessValueMetrics(faqId: string): FAQBusinessMetrics | null {
    return this.businessMetrics.get(faqId) || null;
  }

  // Set business value metrics
  static setBusinessValueMetrics(faqId: string, metrics: FAQBusinessMetrics): void {
    this.businessMetrics.set(faqId, metrics);
  }

  // Get trending topics from search terms
  static getTrendingTopics(): string[] {
    const allTerms = Array.from(this.analytics.values())
      .flatMap(analytics => analytics.mostSearchedTerms);
    
    const termCounts = allTerms.reduce((acc, term) => {
      acc[term] = (acc[term] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(termCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([term]) => term);
  }

  // Get FAQ recommendations based on user behavior
  static getFAQRecommendations(userContext: {
    currentPage?: string;
    previousFAQs?: string[];
    userType?: 'new' | 'returning' | 'premium';
  }): FAQItem[] {
    const { currentPage, previousFAQs = [], userType = 'new' } = userContext;
    
    // Get contextual FAQs first
    let recommendations = currentPage ? getContextualFAQ(currentPage) : chatbotFAQ;
    
    // Filter out previously viewed FAQs for new users
    if (userType === 'new') {
      recommendations = recommendations.filter(faq => !previousFAQs.includes(faq.id));
    }
    
    // Sort by priority and analytics
    recommendations = recommendations.sort((a, b) => {
      const aAnalytics = this.analytics.get(a.id);
      const bAnalytics = this.analytics.get(b.id);
      
      // Priority first, then analytics
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      if (aAnalytics && bAnalytics) {
        return bAnalytics.totalViews - aAnalytics.totalViews;
      }
      
      return 0;
    });
    
    return recommendations.slice(0, 5); // Return top 5 recommendations
  }
}

// Enhanced FAQ search with business intelligence
export const searchFAQs = (query: string, options: {
  category?: FAQCategory;
  includeInactive?: boolean;
  sortBy?: 'relevance' | 'popularity' | 'recent';
  limit?: number;
} = {}): FAQItem[] => {
  const { category, includeInactive = false, sortBy = 'relevance', limit = 10 } = options;
  
  let results = chatbotFAQ.filter(faq => 
    includeInactive || faq.isActive
  );
  
  if (category) {
    results = results.filter(faq => faq.category === category);
  }
  
  // Apply search logic - results already filtered by relevance above
  // No additional sorting needed as search already orders by relevance
  
  // Apply sorting
  switch (sortBy) {
    case 'popularity':
      results = results.sort((a, b) => {
        const aViews = a.metadata?.views || 0;
        const bViews = b.metadata?.views || 0;
        return bViews - aViews;
      });
      break;
    case 'recent':
      results = results.sort((a, b) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
      break;
    // 'relevance' is already applied by FAQUtils.sortByRelevance
  }
  
  return results.slice(0, limit);
};

// Export analytics data for external systems
export const exportAnalyticsData = (): {
  faqAnalytics: Record<string, FAQAnalytics>;
  businessInsights: BusinessInsight[];
  trendingTopics: string[];
  exportDate: string;
} => {
  return {
    faqAnalytics: Object.fromEntries(FAQBusinessIntelligence['analytics']),
    businessInsights: FAQBusinessIntelligence.getBusinessInsights(),
    trendingTopics: FAQBusinessIntelligence.getTrendingTopics(),
    exportDate: new Date().toISOString()
  };
};
