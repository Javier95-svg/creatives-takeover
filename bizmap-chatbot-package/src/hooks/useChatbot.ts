import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatbotFAQ, getContextualFAQ } from './data/chatbotFAQ';
import { FAQItem, FAQUtils } from './types/faq';

// Enhanced message types for business planning
export enum MessageType {
  TEXT = 'text',
  BUSINESS_PLAN_SECTION = 'business_plan_section',
  FINANCIAL_PROJECTION = 'financial_projection',
  MARKET_ANALYSIS = 'market_analysis',
  SWOT_ANALYSIS = 'swot_analysis',
  ACTION_ITEMS = 'action_items',
  DOCUMENT = 'document',
  FORM = 'form',
  RECOMMENDATION = 'recommendation'
}

export enum ConversationContext {
  WELCOME = 'welcome',
  BUSINESS_CONCEPT = 'business_concept',
  MARKET_RESEARCH = 'market_research',
  FINANCIAL_PLANNING = 'financial_planning',
  OPERATIONS = 'operations',
  MARKETING_STRATEGY = 'marketing_strategy',
  LEGAL_COMPLIANCE = 'legal_compliance',
  GROWTH_PLANNING = 'growth_planning',
  TROUBLESHOOTING = 'troubleshooting',
  FAQ = 'faq'
}

export interface BusinessContext {
  industry?: string;
  businessType?: 'startup' | 'existing' | 'franchise' | 'acquisition';
  stage?: 'idea' | 'planning' | 'launch' | 'growth' | 'expansion';
  location?: string;
  budget?: number;
  timeline?: string;
  experience?: 'first-time' | 'experienced' | 'serial-entrepreneur';
  goals?: string[];
  painPoints?: string[];
  completedSections?: string[];
}

export interface QuickAction {
  id: string;
  text: string;
  action: string;
  href?: string;
  icon?: string;
  type: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
  requiresAuth?: boolean;
  payload?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  type: MessageType;
  context?: ConversationContext;
  quickActions?: QuickAction[];
  metadata?: {
    confidence?: number;
    sources?: string[];
    businessPlanSection?: string;
    suggestedFollowUps?: string[];
    estimatedReadTime?: number;
  };
  attachments?: Array<{
    type: 'pdf' | 'xlsx' | 'docx' | 'image';
    name: string;
    url: string;
    size?: number;
  }>;
}

export interface ConversationState {
  context: ConversationContext;
  businessContext: BusinessContext;
  currentTopic?: string;
  awaitingInput?: string;
  lastBotAction?: string;
  sessionDuration: number;
  messageCount: number;
  userSatisfaction?: number;
}

// AI Response Generation Interface
interface AIResponse {
  content: string;
  type: MessageType;
  quickActions?: QuickAction[];
  metadata?: ChatMessage['metadata'];
  shouldTriggerAction?: string;
  contextUpdate?: Partial<BusinessContext>;
}

export const useChatbot = (currentPath?: string) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>({
    context: ConversationContext.WELCOME,
    businessContext: {},
    sessionDuration: 0,
    messageCount: 0
  });
  
  const navigate = useNavigate ? useNavigate() : null;
  const sessionStartTime = useRef(Date.now());
  const typingTimeout = useRef<NodeJS.Timeout>();
  const conversationHistory = useRef<ChatMessage[]>([]);

  // Business planning knowledge base
  const businessPlanningPrompts = useMemo(() => ({
    [ConversationContext.BUSINESS_CONCEPT]: {
      questions: [
        "What's your business idea?",
        "Who is your target customer?",
        "What problem does your business solve?",
        "What makes your solution unique?"
      ],
      nextSteps: ["Let's analyze your market opportunity", "Let's create a basic business model"]
    },
    [ConversationContext.MARKET_RESEARCH]: {
      questions: [
        "Who are your main competitors?",
        "What's your target market size?",
        "How do customers currently solve this problem?",
        "What's your pricing strategy?"
      ],
      nextSteps: ["Let's work on financial projections", "Let's develop your marketing strategy"]
    },
    [ConversationContext.FINANCIAL_PLANNING]: {
      questions: [
        "What are your startup costs?",
        "What's your expected monthly revenue?",
        "What are your ongoing expenses?",
        "When do you expect to break even?"
      ],
      nextSteps: ["Let's plan your operations", "Let's discuss funding options"]
    }
  }), []);

  const getContextualWelcomeMessage = useCallback((): ChatMessage => {
    const path = currentPath || '/';
    let content = "👋 Hi! I'm your AI business planning assistant.";
    let quickActions: QuickAction[] = [];

    if (path.includes('/business-plan')) {
      content += " I see you're working on a business plan. How can I help you today?";
      quickActions = [
        { id: '1', text: 'Start from scratch', action: 'start_new_plan', type: 'primary', icon: '🚀' },
        { id: '2', text: 'Continue existing plan', action: 'continue_plan', type: 'secondary', icon: '📋' },
        { id: '3', text: 'Get plan template', action: 'get_template', type: 'info', icon: '📄' }
      ];
    } else if (path.includes('/financial')) {
      content += " Let's work on your financial projections and funding strategy.";
      quickActions = [
        { id: '1', text: 'Create financial model', action: 'create_financial_model', type: 'primary', icon: '📊' },
        { id: '2', text: 'Review cash flow', action: 'review_cash_flow', type: 'secondary', icon: '💰' }
      ];
    } else {
      content += " I can help you with business planning, market research, financial projections, and much more!";
      quickActions = [
        { id: '1', text: 'Start business plan', action: 'start_business_plan', type: 'primary', icon: '📈' },
        { id: '2', text: 'Get business advice', action: 'get_advice', type: 'secondary', icon: '💡' },
        { id: '3', text: 'Browse templates', action: 'browse_templates', type: 'info', icon: '📚' }
      ];
    }

    return {
      id: generateId(),
      content,
      isBot: true,
      timestamp: new Date(),
      type: MessageType.TEXT,
      context: ConversationContext.WELCOME,
      quickActions
    };
  }, [currentPath]);

  // Initialize with contextual welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const contextualWelcome = getContextualWelcomeMessage();
      setMessages([contextualWelcome]);
      updateConversationState({ context: ConversationContext.WELCOME });
    }
  }, [currentPath, getContextualWelcomeMessage]);

  // Session tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setConversationState(prev => ({
        ...prev,
        sessionDuration: Date.now() - sessionStartTime.current
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const updateConversationState = (updates: Partial<ConversationState>) => {
    setConversationState(prev => ({ ...prev, ...updates }));
  };

  const simulateTyping = (duration: number = 1500) => {
    setIsTyping(true);
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
    }, duration);
  };

  // Simplified sendMessage for compatibility
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      content,
      isBot: false,
      timestamp: new Date(),
      type: MessageType.TEXT,
      context: conversationState.context
    };

    setMessages(prev => [...prev, userMessage]);
    simulateTyping();

    // Simple FAQ-based response
    setTimeout(() => {
      const contextualFAQs = getContextualFAQ(currentPath || '/');
      const searchResults = FAQUtils.sortByRelevance([...contextualFAQs, ...chatbotFAQ], content);
      
      let botResponse: ChatMessage;
      
      if (searchResults.length > 0 && searchResults[0].relevanceScore > 2) {
        const match = searchResults[0];
        botResponse = {
          id: generateId(),
          content: match.shortAnswer || match.answer,
          isBot: true,
          timestamp: new Date(),
          type: MessageType.TEXT,
          quickActions: match.quickActions?.map(action => ({
            ...action,
            id: generateId(),
            type: (action.type as any) || 'info'
          }))
        };
      } else {
        botResponse = {
          id: generateId(),
          content: "I'd be happy to help! While I don't have a specific answer for that question, I can help you with business planning, market research, financial projections, and more.",
          isBot: true,
          timestamp: new Date(),
          type: MessageType.TEXT,
          quickActions: [
            { id: '1', text: 'Get help', action: 'get_help', type: 'primary', icon: '❓' },
            { id: '2', text: 'Start over', action: 'restart_conversation', type: 'secondary', icon: '🔄' }
          ]
        };
      }

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  }, [conversationState, currentPath]);

  const handleQuickAction = useCallback((action: string, href?: string | Record<string, unknown>) => {
    const hrefString = typeof href === 'string' ? href : undefined;
    
    if (action === 'navigate' && hrefString) {
      if (navigate) {
        navigate(hrefString);
      } else {
        window.location.href = hrefString;
      }
    } else if (action === 'faq' && hrefString) {
      const faqItem = chatbotFAQ.find(item => item.id === hrefString);
      if (faqItem) {
        sendMessage(faqItem.question);
      }
    } else if (action === 'restart_conversation') {
      clearConversation();
    } else {
      sendMessage(action);
    }
  }, [navigate, sendMessage]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationState({
      context: ConversationContext.WELCOME,
      businessContext: {},
      sessionDuration: 0,
      messageCount: 0
    });
    conversationHistory.current = [];
    sessionStartTime.current = Date.now();
    
    setTimeout(() => {
      const welcomeMessage = getContextualWelcomeMessage();
      setMessages([welcomeMessage]);
    }, 100);
  }, [getContextualWelcomeMessage]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  return {
    isOpen,
    setIsOpen,
    messages,
    isTyping,
    sendMessage,
    handleQuickAction,
    clearConversation,
    
    // Legacy compatibility
    toggleChat: () => setIsOpen(prev => !prev),
    clearChat: clearConversation,
    
    // Advanced features (simplified)
    conversationState,
    businessContext: conversationState.businessContext,
    currentContext: conversationState.context
  };
};