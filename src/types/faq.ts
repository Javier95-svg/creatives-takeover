// Enhanced FAQ interface with improved type safety and functionality

export enum FAQCategory {
  GENERAL = 'general',
  TECHNICAL = 'technical',
  BILLING = 'billing',
  ACCOUNT = 'account',
  PRODUCT = 'product',
  SUPPORT = 'support',
  PRICING = 'pricing',
  PROCESS = 'process',
  COMMUNITY = 'community',
  FEATURES = 'features',
  TECHNOLOGY = 'technology'
}

export enum QuickActionType {
  LINK = 'link',
  NAVIGATE = 'navigate',
  SCROLL = 'scroll',
  FAQ = 'faq',
  PHONE = 'phone',
  EMAIL = 'email',
  SEARCH = 'search',
  FORM = 'form',
  CHAT = 'chat'
}

export interface QuickAction {
  id?: string;
  text: string;
  type: QuickActionType;
  action: string; // Legacy compatibility
  href?: string;
  payload?: Record<string, unknown>; // For custom action data
  icon?: string; // Icon identifier for UI
  priority?: number; // For ordering actions (1-10, 1 = highest)
  requiresAuth?: boolean; // Whether action requires user authentication
}

export interface FAQMetadata {
  views: number;
  helpful: number;
  notHelpful: number;
  lastViewed?: string; // ISO date string
  avgResponseTime?: number; // Average time to resolve (in seconds)
  relatedQuestions?: string[]; // IDs of related FAQ items
  tags?: string[]; // Additional classification tags
}

export interface FAQItem {
  id: string;
  
  // Content
  question: string;
  answer: string;
  shortAnswer?: string; // Brief version for quick responses
  
  // Classification and search
  keywords: string[];
  synonyms?: string[];
  category: FAQCategory | string; // Allow string for backward compatibility
  subcategory?: string;
  
  // Metadata
  priority: number; // 1-10, higher = more important
  isActive: boolean;
  createdAt: string; // ISO date string
  lastUpdated: string; // ISO date string
  version: number; // For versioning answers
  
  // Enhanced functionality
  quickActions?: QuickAction[];
  followUpQuestions?: string[]; // Common follow-up questions
  prerequisites?: string[]; // IDs of FAQs that should be read first
  
  // Analytics and optimization
  metadata?: FAQMetadata;
  
  // Internationalization support
  locale?: string; // e.g., 'en-US', 'es-ES'
  translations?: Record<string, Partial<Pick<FAQItem, 'question' | 'answer' | 'shortAnswer'>>>;
  
  // Access control
  requiredRole?: string; // For role-based access
  isPublic: boolean;
}

// Utility types for better type safety
export type FAQSearchResult = FAQItem & {
  relevanceScore: number;
  matchedKeywords: string[];
  highlightedAnswer?: string; // Answer with search terms highlighted
};

export interface FAQCollection {
  items: FAQItem[];
  categories: FAQCategory[];
  totalCount: number;
  lastSynced?: string;
  version: string;
}

// Helper functions for working with FAQ data
export class FAQUtils {
  static isExpired(item: FAQItem, maxAgeInDays: number = 90): boolean {
    const lastUpdate = new Date(item.lastUpdated);
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000;
    return Date.now() - lastUpdate.getTime() > maxAge;
  }
  
  static getSearchTerms(item: FAQItem): string[] {
    return [
      ...item.keywords,
      ...(item.synonyms || []),
      item.question,
      item.answer
    ].map(term => term.toLowerCase());
  }
  
  static calculateRelevance(item: FAQItem, searchQuery: string): number {
    const query = searchQuery.toLowerCase();
    
    let score = 0;
    
    // Exact matches in question get highest score
    if (item.question.toLowerCase().includes(query)) score += 10;
    
    // Keyword matches
    const keywordMatches = item.keywords.filter(k => 
      k.toLowerCase().includes(query) || query.includes(k.toLowerCase())
    );
    score += keywordMatches.length * 5;
    
    // Answer content matches
    if (item.answer.toLowerCase().includes(query)) score += 3;
    
    // Priority boost
    score += item.priority;
    
    // Popularity boost (if metadata exists)
    if (item.metadata?.views) {
      score += Math.log(item.metadata.views) * 0.5;
    }
    
    return score;
  }
  
  static sortByRelevance(items: FAQItem[], query: string): FAQSearchResult[] {
    return items
      .map(item => ({
        ...item,
        relevanceScore: this.calculateRelevance(item, query),
        matchedKeywords: item.keywords.filter(k => 
          k.toLowerCase().includes(query.toLowerCase())
        ),
        highlightedAnswer: this.highlightText(item.answer, query)
      }))
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  
  private static highlightText(text: string, query: string): string {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
  
  static groupByCategory(items: FAQItem[]): Record<FAQCategory, FAQItem[]> {
    return items.reduce((acc, item) => {
      const category = item.category as FAQCategory;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<FAQCategory, FAQItem[]>);
  }
}

// Factory function for creating FAQ items
export const createFAQItem = (data: Partial<FAQItem>): FAQItem => {
  const now = new Date().toISOString();
  
  return {
    id: data.id || crypto.randomUUID(),
    question: data.question || '',
    answer: data.answer || '',
    keywords: data.keywords || [],
    category: data.category || FAQCategory.GENERAL,
    priority: data.priority || 5,
    isActive: data.isActive ?? true,
    isPublic: data.isPublic ?? true,
    createdAt: data.createdAt || now,
    lastUpdated: data.lastUpdated || now,
    version: data.version || 1,
    ...data
  };
};

// Type guards
export const isFAQItem = (obj: unknown): obj is FAQItem => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'question' in obj &&
    'answer' in obj &&
    'keywords' in obj &&
    'category' in obj
  );
};