import { useCallback, useMemo } from 'react';

// NLU Interfaces
export interface Intent {
  name: string;
  confidence: number;
  entities: Entity[];
  context?: Record<string, any>;
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
  start: number;
  end: number;
  normalizedValue?: string;
}

export interface NLUResult {
  intents: Intent[];
  entities: Entity[];
  sentiment: {
    score: number; // -1 to 1
    label: 'positive' | 'negative' | 'neutral';
  };
  language: string;
  confidence: number;
  fallbackRequired: boolean;
  clarificationNeeded: boolean;
  suggestedQuestions?: string[];
}

export interface NLUConfig {
  enableIntentRecognition: boolean;
  enableEntityExtraction: boolean;
  enableSentimentAnalysis: boolean;
  confidenceThreshold: number;
  fallbackThreshold: number;
  maxIntents: number;
  customIntents?: CustomIntent[];
}

export interface CustomIntent {
  name: string;
  patterns: string[];
  entities: string[];
  responses: string[];
  priority: number;
}

// Business-specific intents
export enum BusinessIntent {
  BUSINESS_PLANNING = 'business_planning',
  MARKET_RESEARCH = 'market_research',
  FINANCIAL_PLANNING = 'financial_planning',
  COMPETITOR_ANALYSIS = 'competitor_analysis',
  PRICING_STRATEGY = 'pricing_strategy',
  FUNDING_QUESTIONS = 'funding_questions',
  LEGAL_COMPLIANCE = 'legal_compliance',
  MARKETING_STRATEGY = 'marketing_strategy',
  OPERATIONS_PLANNING = 'operations_planning',
  GROWTH_PLANNING = 'growth_planning',
  GENERAL_QUESTION = 'general_question',
  GREETING = 'greeting',
  GOODBYE = 'goodbye',
  HELP = 'help',
  UNKNOWN = 'unknown'
}

// Business entities
export enum BusinessEntity {
  INDUSTRY = 'industry',
  BUSINESS_STAGE = 'business_stage',
  BUDGET = 'budget',
  TIMELINE = 'timeline',
  LOCATION = 'location',
  COMPANY_SIZE = 'company_size',
  REVENUE_TARGET = 'revenue_target',
  CUSTOMER_SEGMENT = 'customer_segment',
  COMPETITOR = 'competitor',
  PRODUCT_TYPE = 'product_type',
  SERVICE_TYPE = 'service_type',
  FUNDING_TYPE = 'funding_type',
  LEGAL_STRUCTURE = 'legal_structure',
  MARKET_SIZE = 'market_size',
  PRICING_MODEL = 'pricing_model'
}

// Custom NLU Engine
export class BizMapNLU {
  private config: NLUConfig;
  private customIntents: Map<string, CustomIntent> = new Map();

  constructor(config: NLUConfig) {
    this.config = config;
    this.initializeCustomIntents();
  }

  private initializeCustomIntents() {
    const defaultIntents: CustomIntent[] = [
      {
        name: 'business_planning',
        patterns: [
          'create business plan',
          'write business plan',
          'develop business strategy',
          'plan my business',
          'business planning help'
        ],
        entities: ['industry', 'business_stage', 'timeline'],
        responses: ['I can help you create a comprehensive business plan.'],
        priority: 10
      },
      {
        name: 'market_research',
        patterns: [
          'market research',
          'analyze market',
          'competitor analysis',
          'market size',
          'target market'
        ],
        entities: ['industry', 'competitor', 'market_size'],
        responses: ['Let me help you with market research and analysis.'],
        priority: 9
      },
      {
        name: 'financial_planning',
        patterns: [
          'financial planning',
          'revenue projections',
          'budget planning',
          'financial model',
          'cash flow'
        ],
        entities: ['budget', 'revenue_target', 'timeline'],
        responses: ['I can assist you with financial planning and projections.'],
        priority: 9
      }
    ];

    defaultIntents.forEach(intent => {
      this.customIntents.set(intent.name, intent);
    });

    if (this.config.customIntents) {
      this.config.customIntents.forEach(intent => {
        this.customIntents.set(intent.name, intent);
      });
    }
  }

  async processText(text: string): Promise<NLUResult> {
    const normalizedText = this.normalizeText(text);
    
    // Extract entities first
    const entities = this.extractEntities(normalizedText);
    
    // Recognize intents
    const intents = await this.recognizeIntents(normalizedText, entities);
    
    // Analyze sentiment
    const sentiment = this.analyzeSentiment(normalizedText);
    
    // Determine if fallback is needed
    const fallbackRequired = this.shouldFallback(intents, sentiment);
    
    // Check if clarification is needed
    const clarificationNeeded = this.needsClarification(intents, entities);
    
    // Generate suggested questions
    const suggestedQuestions = this.generateSuggestedQuestions(intents, entities);

    return {
      intents,
      entities,
      sentiment,
      language: this.detectLanguage(text),
      confidence: this.calculateOverallConfidence(intents, entities),
      fallbackRequired,
      clarificationNeeded,
      suggestedQuestions
    };
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];
    
    // Industry detection
    const industryPatterns = {
      technology: ['tech', 'software', 'app', 'digital', 'ai', 'saas', 'platform', 'startup'],
      healthcare: ['health', 'medical', 'wellness', 'fitness', 'pharma', 'clinic', 'hospital'],
      retail: ['retail', 'store', 'shop', 'ecommerce', 'product', 'fashion', 'merchandise'],
      food: ['food', 'restaurant', 'catering', 'delivery', 'cooking', 'beverage', 'restaurant'],
      education: ['education', 'training', 'course', 'school', 'learning', 'academy'],
      finance: ['finance', 'fintech', 'banking', 'investment', 'insurance', 'financial']
    };

    Object.entries(industryPatterns).forEach(([industry, patterns]) => {
      patterns.forEach(pattern => {
        const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
        const match = text.match(regex);
        if (match) {
          entities.push({
            type: BusinessEntity.INDUSTRY,
            value: industry,
            confidence: 0.9,
            start: text.indexOf(pattern),
            end: text.indexOf(pattern) + pattern.length,
            normalizedValue: industry
          });
        }
      });
    });

    // Business stage detection
    const stagePatterns = {
      idea: ['idea', 'concept', 'thinking about', 'considering'],
      planning: ['planning', 'plan', 'preparing', 'developing'],
      launch: ['launch', 'starting', 'launching', 'opening'],
      growth: ['growing', 'expanding', 'scaling', 'growth'],
      expansion: ['expanding', 'new markets', 'international']
    };

    Object.entries(stagePatterns).forEach(([stage, patterns]) => {
      patterns.forEach(pattern => {
        const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
        const match = text.match(regex);
        if (match) {
          entities.push({
            type: BusinessEntity.BUSINESS_STAGE,
            value: stage,
            confidence: 0.8,
            start: text.indexOf(pattern),
            end: text.indexOf(pattern) + pattern.length,
            normalizedValue: stage
          });
        }
      });
    });

    // Budget detection
    const budgetRegex = /\$[\d,]+|\d+\s*(k|thousand|million|billion)/gi;
    const budgetMatches = text.match(budgetRegex);
    if (budgetMatches) {
      budgetMatches.forEach(match => {
        entities.push({
          type: BusinessEntity.BUDGET,
          value: match,
          confidence: 0.9,
          start: text.indexOf(match),
          end: text.indexOf(match) + match.length,
          normalizedValue: this.normalizeBudget(match)
        });
      });
    }

    return entities;
  }

  private async recognizeIntents(text: string, entities: Entity[]): Promise<Intent[]> {
    const intents: Intent[] = [];

    // Check custom intents
    for (const [name, intent] of this.customIntents) {
      const confidence = this.calculateIntentConfidence(text, intent);
      if (confidence > this.config.confidenceThreshold) {
        intents.push({
          name,
          confidence,
          entities: entities.filter(e => intent.entities.includes(e.type)),
          context: this.extractContext(text, intent)
        });
      }
    }

    // Check business intents
    const businessIntents = this.recognizeBusinessIntents(text, entities);
    intents.push(...businessIntents);

    // Sort by confidence and priority
    return intents
      .sort((a, b) => {
        const aPriority = this.customIntents.get(a.name)?.priority || 5;
        const bPriority = this.customIntents.get(b.name)?.priority || 5;
        return (b.confidence * bPriority) - (a.confidence * aPriority);
      })
      .slice(0, this.config.maxIntents);
  }

  private calculateIntentConfidence(text: string, intent: CustomIntent): number {
    let confidence = 0;
    let matches = 0;

    intent.patterns.forEach(pattern => {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(text)) {
        matches++;
        confidence += 0.3;
      }
    });

    // Partial pattern matching
    intent.patterns.forEach(pattern => {
      const words = pattern.split(' ');
      const textWords = text.split(' ');
      const wordMatches = words.filter(word => 
        textWords.some(textWord => textWord.includes(word))
      ).length;
      
      if (wordMatches > 0) {
        confidence += (wordMatches / words.length) * 0.2;
      }
    });

    return Math.min(confidence, 1.0);
  }

  private recognizeBusinessIntents(text: string, entities: Entity[]): Intent[] {
    const intents: Intent[] = [];

    // Business planning intent
    if (this.hasKeywords(text, ['business plan', 'plan business', 'strategy', 'roadmap'])) {
      intents.push({
        name: BusinessIntent.BUSINESS_PLANNING,
        confidence: 0.9,
        entities: entities.filter(e => e.type === BusinessEntity.INDUSTRY || e.type === BusinessEntity.BUSINESS_STAGE)
      });
    }

    // Market research intent
    if (this.hasKeywords(text, ['market research', 'competitor', 'analysis', 'market size'])) {
      intents.push({
        name: BusinessIntent.MARKET_RESEARCH,
        confidence: 0.9,
        entities: entities.filter(e => e.type === BusinessEntity.INDUSTRY || e.type === BusinessEntity.COMPETITOR)
      });
    }

    // Financial planning intent
    if (this.hasKeywords(text, ['financial', 'budget', 'revenue', 'cost', 'money', 'funding'])) {
      intents.push({
        name: BusinessIntent.FINANCIAL_PLANNING,
        confidence: 0.9,
        entities: entities.filter(e => e.type === BusinessEntity.BUDGET || e.type === BusinessEntity.REVENUE_TARGET)
      });
    }

    // Greeting intent
    if (this.hasKeywords(text, ['hello', 'hi', 'hey', 'good morning', 'good afternoon'])) {
      intents.push({
        name: BusinessIntent.GREETING,
        confidence: 0.95,
        entities: []
      });
    }

    // Help intent
    if (this.hasKeywords(text, ['help', 'assist', 'support', 'guide', 'how to'])) {
      intents.push({
        name: BusinessIntent.HELP,
        confidence: 0.9,
        entities: []
      });
    }

    return intents;
  }

  private hasKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private analyzeSentiment(text: string): { score: number; label: 'positive' | 'negative' | 'neutral' } {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'helpful', 'useful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'useless', 'confusing', 'difficult', 'problem', 'issue'];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    const score = (positiveCount - negativeCount) / Math.max(words.length, 1);
    
    let label: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (score > 0.1) label = 'positive';
    else if (score < -0.1) label = 'negative';

    return { score, label };
  }

  private detectLanguage(text: string): string {
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase().split(/\s+/);
    const englishCount = words.filter(word => englishWords.includes(word)).length;
    
    return englishCount > words.length * 0.1 ? 'en' : 'unknown';
  }

  private shouldFallback(intents: Intent[], sentiment: { score: number; label: string }): boolean {
    if (intents.length === 0) return true;
    if (intents[0].confidence < this.config.fallbackThreshold) return true;
    if (sentiment.label === 'negative' && intents[0].confidence < 0.7) return true;
    return false;
  }

  private needsClarification(intents: Intent[], entities: Entity[]): boolean {
    if (intents.length > 1 && intents[0].confidence - intents[1].confidence < 0.2) return true;
    if (intents.length === 0) return true;
    return false;
  }

  private generateSuggestedQuestions(intents: Intent[], entities: Entity[]): string[] {
    const suggestions: string[] = [];

    if (intents.length === 0) {
      suggestions.push(
        "What type of business are you planning?",
        "Do you need help with market research?",
        "Are you looking for financial planning assistance?"
      );
    } else if (intents[0].name === BusinessIntent.BUSINESS_PLANNING) {
      suggestions.push(
        "What industry is your business in?",
        "What stage is your business at?",
        "Do you have a target market in mind?"
      );
    } else if (intents[0].name === BusinessIntent.MARKET_RESEARCH) {
      suggestions.push(
        "Who are your main competitors?",
        "What's your target market size?",
        "What's your unique value proposition?"
      );
    }

    return suggestions.slice(0, 3);
  }

  private calculateOverallConfidence(intents: Intent[], entities: Entity[]): number {
    if (intents.length === 0) return 0;
    
    const intentConfidence = intents[0].confidence;
    const entityConfidence = entities.length > 0 
      ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length 
      : 0.5;
    
    return (intentConfidence + entityConfidence) / 2;
  }

  private extractContext(text: string, intent: CustomIntent): Record<string, any> {
    const context: Record<string, any> = {};
    
    if (intent.name === 'business_planning') {
      context.hasIndustry = text.includes('industry') || text.includes('sector');
      context.hasStage = text.includes('stage') || text.includes('phase');
      context.hasTimeline = text.includes('timeline') || text.includes('deadline');
    }
    
    return context;
  }

  private normalizeBudget(budget: string): string {
    const num = budget.replace(/[$,]/g, '');
    const multiplier = budget.toLowerCase().includes('k') ? 1000 : 
                     budget.toLowerCase().includes('million') ? 1000000 :
                     budget.toLowerCase().includes('billion') ? 1000000000 : 1;
    
    return (parseInt(num) * multiplier).toString();
  }
}

// React Hook for NLU
export const useNLU = (config: NLUConfig = {
  enableIntentRecognition: true,
  enableEntityExtraction: true,
  enableSentimentAnalysis: true,
  confidenceThreshold: 0.6,
  fallbackThreshold: 0.4,
  maxIntents: 3
}) => {
  const nlu = useMemo(() => new BizMapNLU(config), [config]);

  const processMessage = useCallback(async (text: string): Promise<NLUResult> => {
    return await nlu.processText(text);
  }, [nlu]);

  const getIntentSuggestions = useCallback((intent: string): string[] => {
    const customIntent = nlu['customIntents'].get(intent);
    return customIntent?.responses || [];
  }, [nlu]);

  return {
    processMessage,
    getIntentSuggestions,
    config
  };
};

// Third-party NLU Integration
export interface ThirdPartyNLUConfig {
  provider: 'dialogflow' | 'luis' | 'wit' | 'rasa';
  apiKey: string;
  endpoint?: string;
  projectId?: string;
}

export class ThirdPartyNLUIntegration {
  private config: ThirdPartyNLUConfig;

  constructor(config: ThirdPartyNLUConfig) {
    this.config = config;
  }

  async processText(text: string): Promise<NLUResult> {
    switch (this.config.provider) {
      case 'dialogflow':
        return this.processWithDialogflow(text);
      case 'luis':
        return this.processWithLUIS(text);
      case 'wit':
        return this.processWithWit(text);
      case 'rasa':
        return this.processWithRasa(text);
      default:
        throw new Error(`Unsupported NLU provider: ${this.config.provider}`);
    }
  }

  private async processWithDialogflow(text: string): Promise<NLUResult> {
    const response = await fetch(`https://dialogflow.googleapis.com/v2/projects/${this.config.projectId}/agent/sessions/123:detectIntent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queryInput: {
          text: {
            text: text,
            languageCode: 'en'
          }
        }
      })
    });

    const data = await response.json();
    
    return {
      intents: [{
        name: data.queryResult.intent.displayName,
        confidence: data.queryResult.intentDetectionConfidence,
        entities: data.queryResult.parameters ? Object.entries(data.queryResult.parameters).map(([key, value]) => ({
          type: key,
          value: value as string,
          confidence: 0.9,
          start: 0,
          end: 0
        })) : []
      }],
      entities: [],
      sentiment: { score: 0, label: 'neutral' },
      language: 'en',
      confidence: data.queryResult.intentDetectionConfidence,
      fallbackRequired: !data.queryResult.intentDetectionConfidence || data.queryResult.intentDetectionConfidence < 0.5,
      clarificationNeeded: false,
      suggestedQuestions: []
    };
  }

  private async processWithLUIS(text: string): Promise<NLUResult> {
    const response = await fetch(`${this.config.endpoint}/luis/prediction/v3.0/apps/${this.config.projectId}/slots/production/predict`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: text
      })
    });

    const data = await response.json();
    
    return {
      intents: data.prediction.intents ? Object.entries(data.prediction.intents).map(([name, score]) => ({
        name,
        confidence: score as number,
        entities: []
      })) : [],
      entities: data.prediction.entities ? data.prediction.entities.map((entity: any) => ({
        type: entity.type,
        value: entity.entity,
        confidence: entity.score,
        start: entity.startIndex,
        end: entity.endIndex
      })) : [],
      sentiment: { score: 0, label: 'neutral' },
      language: 'en',
      confidence: data.prediction.topIntent?.score || 0,
      fallbackRequired: !data.prediction.topIntent || data.prediction.topIntent.score < 0.5,
      clarificationNeeded: false,
      suggestedQuestions: []
    };
  }

  private async processWithWit(text: string): Promise<NLUResult> {
    const response = await fetch(`https://api.wit.ai/message?v=20210920&q=${encodeURIComponent(text)}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });

    const data = await response.json();
    
    return {
      intents: data.intents ? data.intents.map((intent: any) => ({
        name: intent.name,
        confidence: intent.confidence,
        entities: []
      })) : [],
      entities: data.entities ? Object.entries(data.entities).map(([key, value]) => ({
        type: key,
        value: (value as any)[0].value,
        confidence: (value as any)[0].confidence,
        start: 0,
        end: 0
      })) : [],
      sentiment: { score: 0, label: 'neutral' },
      language: 'en',
      confidence: data.intents?.[0]?.confidence || 0,
      fallbackRequired: !data.intents || data.intents[0]?.confidence < 0.5,
      clarificationNeeded: false,
      suggestedQuestions: []
    };
  }

  private async processWithRasa(text: string): Promise<NLUResult> {
    const response = await fetch(`${this.config.endpoint}/webhooks/rest/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: 'user',
        message: text
      })
    });

    const data = await response.json();
    
    return {
      intents: data.intent ? [{
        name: data.intent.name,
        confidence: data.intent.confidence,
        entities: data.entities || []
      }] : [],
      entities: data.entities || [],
      sentiment: { score: 0, label: 'neutral' },
      language: 'en',
      confidence: data.intent?.confidence || 0,
      fallbackRequired: !data.intent || data.intent.confidence < 0.5,
      clarificationNeeded: false,
      suggestedQuestions: []
    };
  }
}
