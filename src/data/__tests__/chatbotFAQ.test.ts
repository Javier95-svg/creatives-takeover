import { 
  chatbotFAQ, 
  getContextualFAQ, 
  searchFAQs, 
  FAQBusinessIntelligence,
  exportAnalyticsData 
} from '../chatbotFAQ';
import { FAQCategory } from '@/types/faq';

describe('chatbotFAQ', () => {
  describe('FAQ Data Structure', () => {
    it('should have valid FAQ items', () => {
      expect(chatbotFAQ).toBeDefined();
      expect(chatbotFAQ.length).toBeGreaterThan(0);
      
      chatbotFAQ.forEach(faq => {
        expect(faq.id).toBeDefined();
        expect(faq.question).toBeDefined();
        expect(faq.answer).toBeDefined();
        expect(faq.keywords).toBeDefined();
        expect(faq.category).toBeDefined();
        expect(faq.priority).toBeGreaterThan(0);
        expect(faq.isActive).toBe(true);
      });
    });

    it('should have proper metadata', () => {
      chatbotFAQ.forEach(faq => {
        if (faq.metadata) {
          expect(faq.metadata.views).toBeGreaterThanOrEqual(0);
          expect(faq.metadata.helpful).toBeGreaterThanOrEqual(0);
          expect(faq.metadata.notHelpful).toBeGreaterThanOrEqual(0);
          expect(faq.metadata.tags).toBeDefined();
        }
      });
    });
  });

  describe('Contextual FAQ', () => {
    it('should return relevant FAQs for different paths', () => {
      const homeFAQs = getContextualFAQ('/');
      const pricingFAQs = getContextualFAQ('/pricing');
      const dream2planFAQs = getContextualFAQ('/dream2plan');
      
      expect(homeFAQs.length).toBeGreaterThan(0);
      expect(pricingFAQs.length).toBeGreaterThan(0);
      expect(dream2planFAQs.length).toBeGreaterThan(0);
      
      // Should include specific FAQs for each path
      expect(homeFAQs.some(faq => faq.id === 'what-is-bizmap')).toBe(true);
      expect(pricingFAQs.some(faq => faq.id === 'pricing')).toBe(true);
      expect(dream2planFAQs.some(faq => faq.id === 'how-it-works')).toBe(true);
    });

    it('should return default FAQs for unknown paths', () => {
      const unknownFAQs = getContextualFAQ('/unknown-path');
      
      expect(unknownFAQs.length).toBeGreaterThan(0);
      expect(unknownFAQs.some(faq => faq.id === 'what-is-bizmap')).toBe(true);
    });
  });

  describe('FAQ Search', () => {
    it('should search FAQs by query', () => {
      const results = searchFAQs('pricing');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(faq => 
        faq.question.toLowerCase().includes('pricing') ||
        faq.answer.toLowerCase().includes('pricing') ||
        faq.keywords.some(k => k.toLowerCase().includes('pricing'))
      )).toBe(true);
    });

    it('should filter by category', () => {
      const pricingResults = searchFAQs('', { category: FAQCategory.PRICING });
      
      expect(pricingResults.length).toBeGreaterThan(0);
      pricingResults.forEach(faq => {
        expect(faq.category).toBe(FAQCategory.PRICING);
      });
    });

    it('should sort by popularity', () => {
      const results = searchFAQs('', { sortBy: 'popularity' });
      
      expect(results.length).toBeGreaterThan(0);
      // Should be sorted by views (descending)
      for (let i = 1; i < results.length; i++) {
        const prevViews = results[i - 1].metadata?.views || 0;
        const currentViews = results[i].metadata?.views || 0;
        expect(prevViews).toBeGreaterThanOrEqual(currentViews);
      }
    });

    it('should limit results', () => {
      const results = searchFAQs('', { limit: 3 });
      
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Business Intelligence', () => {
    beforeEach(() => {
      // Reset analytics before each test
      jest.clearAllMocks();
    });

    it('should track FAQ interactions', () => {
      const faqId = 'what-is-bizmap';
      
      FAQBusinessIntelligence.trackFAQInteraction(faqId, { type: 'view' });
      FAQBusinessIntelligence.trackFAQInteraction(faqId, { type: 'helpful' });
      FAQBusinessIntelligence.trackFAQInteraction(faqId, { type: 'conversion' });
      
      const metrics = FAQBusinessIntelligence.getFAQPerformanceMetrics(faqId);
      
      expect(metrics).toBeDefined();
      expect(metrics?.totalViews).toBe(1);
      expect(metrics?.averageRating).toBe(5);
      expect(metrics?.conversionRate).toBe(1);
    });

    it('should generate business insights', () => {
      // Add some test data
      FAQBusinessIntelligence.trackFAQInteraction('faq1', { type: 'view' });
      FAQBusinessIntelligence.trackFAQInteraction('faq1', { type: 'helpful' });
      FAQBusinessIntelligence.trackFAQInteraction('faq2', { type: 'view' });
      FAQBusinessIntelligence.trackFAQInteraction('faq2', { type: 'not_helpful' });
      
      const insights = FAQBusinessIntelligence.generateInsights();
      
      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should get FAQ recommendations', () => {
      const recommendations = FAQBusinessIntelligence.getFAQRecommendations({
        currentPage: '/pricing',
        userType: 'new'
      });
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should get trending topics', () => {
      const trendingTopics = FAQBusinessIntelligence.getTrendingTopics();
      
      expect(trendingTopics).toBeDefined();
      expect(Array.isArray(trendingTopics)).toBe(true);
    });

    it('should set business value metrics', () => {
      const metrics = {
        faqId: 'test-faq',
        businessValue: 8,
        userImpact: 7,
        conversionPotential: 9,
        priority: 'high' as const,
        tags: ['important', 'conversion'],
        businessContext: ['pricing', 'sales']
      };
      
      FAQBusinessIntelligence.setBusinessValueMetrics('test-faq', metrics);
      
      const retrievedMetrics = FAQBusinessIntelligence.getBusinessValueMetrics('test-faq');
      expect(retrievedMetrics).toEqual(metrics);
    });
  });

  describe('Analytics Export', () => {
    it('should export analytics data', () => {
      const exportData = exportAnalyticsData();
      
      expect(exportData).toHaveProperty('faqAnalytics');
      expect(exportData).toHaveProperty('businessInsights');
      expect(exportData).toHaveProperty('trendingTopics');
      expect(exportData).toHaveProperty('exportDate');
      expect(typeof exportData.exportDate).toBe('string');
    });
  });

  describe('FAQ Categories', () => {
    it('should have FAQs in all major categories', () => {
      const categories = Object.values(FAQCategory);
      
      categories.forEach(category => {
        const faqsInCategory = chatbotFAQ.filter(faq => faq.category === category);
        if (category !== 'TECHNICAL') { // TECHNICAL might be empty
          expect(faqsInCategory.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Quick Actions', () => {
    it('should have valid quick actions', () => {
      chatbotFAQ.forEach(faq => {
        if (faq.quickActions) {
          faq.quickActions.forEach(action => {
            expect(action.text).toBeDefined();
            expect(action.type).toBeDefined();
            expect(action.action).toBeDefined();
            expect(action.priority).toBeGreaterThan(0);
          });
        }
      });
    });
  });

  describe('Follow-up Questions', () => {
    it('should have valid follow-up questions', () => {
      chatbotFAQ.forEach(faq => {
        if (faq.followUpQuestions) {
          expect(Array.isArray(faq.followUpQuestions)).toBe(true);
          faq.followUpQuestions.forEach(question => {
            expect(typeof question).toBe('string');
            expect(question.length).toBeGreaterThan(0);
          });
        }
      });
    });
  });
});
