import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FAQItem, FAQCategory, createFAQItem } from '@/types/faq';

export interface DynamicFAQConfig {
  enableLiveUpdates: boolean;
  cacheTimeout: number; // in milliseconds
  enableVersioning: boolean;
  enableAIGeneratedAnswers: boolean;
  aiProvider?: 'openai' | 'anthropic' | 'local';
  aiApiKey?: string;
}

export interface FAQVersion {
  id: string;
  faqId: string;
  version: number;
  content: {
    question: string;
    answer: string;
    shortAnswer?: string;
  };
  createdAt: string;
  isActive: boolean;
  changeLog: string;
}

export interface AIGeneratedAnswer {
  question: string;
  answer: string;
  confidence: number;
  sources: string[];
  generatedAt: string;
  model: string;
}

export class DynamicFAQManager {
  private config: DynamicFAQConfig;
  private cache: Map<string, { data: FAQItem[]; timestamp: number }> = new Map();
  private versions: Map<string, FAQVersion[]> = new Map();

  constructor(config: DynamicFAQConfig) {
    this.config = config;
  }

  async getFAQs(forceRefresh: boolean = false): Promise<FAQItem[]> {
    const cacheKey = 'faqs';
    const cached = this.cache.get(cacheKey);
    
    if (!forceRefresh && cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase
        .from('dynamic_faqs')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      const faqs = data.map(item => createFAQItem({
        id: item.id,
        question: item.question,
        answer: item.answer,
        shortAnswer: item.short_answer,
        keywords: item.keywords || [],
        synonyms: item.synonyms || [],
        category: item.category,
        priority: item.priority,
        isActive: item.is_active,
        createdAt: item.created_at,
        lastUpdated: item.updated_at,
        version: item.version,
        quickActions: item.quick_actions || [],
        followUpQuestions: item.follow_up_questions || [],
        metadata: {
          views: item.views || 0,
          helpful: item.helpful || 0,
          notHelpful: item.not_helpful || 0,
          tags: item.tags || []
        }
      }));

      this.cache.set(cacheKey, { data: faqs, timestamp: Date.now() });
      return faqs;
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      return cached?.data || [];
    }
  }

  async updateFAQ(faqId: string, updates: Partial<FAQItem>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('dynamic_faqs')
        .update({
          question: updates.question,
          answer: updates.answer,
          short_answer: updates.shortAnswer,
          keywords: updates.keywords,
          synonyms: updates.synonyms,
          category: updates.category,
          priority: updates.priority,
          quick_actions: updates.quickActions,
          follow_up_questions: updates.followUpQuestions,
          updated_at: new Date().toISOString(),
          version: (updates.version || 1) + 1
        })
        .eq('id', faqId);

      if (error) throw error;

      // Clear cache to force refresh
      this.cache.clear();
      return true;
    } catch (error) {
      console.error('Error updating FAQ:', error);
      return false;
    }
  }

  async createFAQ(faq: Omit<FAQItem, 'id' | 'createdAt' | 'lastUpdated' | 'version'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('dynamic_faqs')
        .insert({
          question: faq.question,
          answer: faq.answer,
          short_answer: faq.shortAnswer,
          keywords: faq.keywords,
          synonyms: faq.synonyms,
          category: faq.category,
          priority: faq.priority,
          is_active: faq.isActive,
          quick_actions: faq.quickActions,
          follow_up_questions: faq.followUpQuestions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1
        })
        .select('id')
        .single();

      if (error) throw error;

      // Clear cache to force refresh
      this.cache.clear();
      return data.id;
    } catch (error) {
      console.error('Error creating FAQ:', error);
      return null;
    }
  }

  async getFAQVersions(faqId: string): Promise<FAQVersion[]> {
    if (this.config.enableVersioning) {
      try {
        const { data, error } = await supabase
          .from('faq_versions')
          .select('*')
          .eq('faq_id', faqId)
          .order('version', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching FAQ versions:', error);
        return [];
      }
    }
    return [];
  }

  async generateAIAnswer(question: string): Promise<AIGeneratedAnswer | null> {
    if (!this.config.enableAIGeneratedAnswers) return null;

    try {
      let response;
      
      switch (this.config.aiProvider) {
        case 'openai':
          response = await this.generateWithOpenAI(question);
          break;
        case 'anthropic':
          response = await this.generateWithAnthropic(question);
          break;
        case 'local':
          response = await this.generateWithLocalModel(question);
          break;
        default:
          return null;
      }

      return {
        question,
        answer: response.answer,
        confidence: response.confidence,
        sources: response.sources,
        generatedAt: new Date().toISOString(),
        model: this.config.aiProvider || 'unknown'
      };
    } catch (error) {
      console.error('Error generating AI answer:', error);
      return null;
    }
  }

  private async generateWithOpenAI(question: string): Promise<{ answer: string; confidence: number; sources: string[] }> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.aiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a business planning expert. Provide helpful, accurate answers about business planning, market research, financial planning, and entrepreneurship. Always cite sources when possible.'
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    return {
      answer: data.choices[0].message.content,
      confidence: 0.8,
      sources: ['OpenAI GPT-4', 'Business Planning Knowledge Base']
    };
  }

  private async generateWithAnthropic(question: string): Promise<{ answer: string; confidence: number; sources: string[] }> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.aiApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `As a business planning expert, please answer this question: ${question}`
          }
        ]
      })
    });

    const data = await response.json();
    
    return {
      answer: data.content[0].text,
      confidence: 0.85,
      sources: ['Anthropic Claude', 'Business Planning Knowledge Base']
    };
  }

  private async generateWithLocalModel(question: string): Promise<{ answer: string; confidence: number; sources: string[] }> {
    const response = await fetch('/api/local-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question })
    });

    const data = await response.json();
    
    return {
      answer: data.answer,
      confidence: data.confidence || 0.7,
      sources: ['Local AI Model', 'Business Planning Knowledge Base']
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// React Hook for Dynamic FAQ
export const useDynamicFAQ = (config: DynamicFAQConfig) => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const manager = useMemo(() => new DynamicFAQManager(config), [config]);

  const loadFAQs = useCallback(async (forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await manager.getFAQs(forceRefresh);
      setFaqs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const updateFAQ = useCallback(async (faqId: string, updates: Partial<FAQItem>) => {
    const success = await manager.updateFAQ(faqId, updates);
    if (success) {
      await loadFAQs(true); // Refresh after update
    }
    return success;
  }, [manager, loadFAQs]);

  const createFAQ = useCallback(async (faq: Omit<FAQItem, 'id' | 'createdAt' | 'lastUpdated' | 'version'>) => {
    const id = await manager.createFAQ(faq);
    if (id) {
      await loadFAQs(true); // Refresh after creation
    }
    return id;
  }, [manager, loadFAQs]);

  const generateAIAnswer = useCallback(async (question: string) => {
    return await manager.generateAIAnswer(question);
  }, [manager]);

  const getFAQVersions = useCallback(async (faqId: string) => {
    return await manager.getFAQVersions(faqId);
  }, [manager]);

  const clearCache = useCallback(() => {
    manager.clearCache();
  }, [manager]);

  const getCacheStats = useCallback(() => {
    return manager.getCacheStats();
  }, [manager]);

  // Auto-load FAQs on mount
  useEffect(() => {
    loadFAQs();
  }, [loadFAQs]);

  // Set up live updates if enabled
  useEffect(() => {
    if (!config.enableLiveUpdates) return;

    const interval = setInterval(() => {
      loadFAQs(true);
    }, config.cacheTimeout);

    return () => clearInterval(interval);
  }, [config.enableLiveUpdates, config.cacheTimeout, loadFAQs]);

  return {
    faqs,
    loading,
    error,
    loadFAQs,
    updateFAQ,
    createFAQ,
    generateAIAnswer,
    getFAQVersions,
    clearCache,
    getCacheStats
  };
};
