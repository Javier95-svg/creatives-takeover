import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { chatbotFAQ, getContextualFAQ } from '@/data/chatbotFAQ';
import { FAQItem, FAQUtils } from '@/types/faq';

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

export const useChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>({
    context: ConversationContext.WELCOME,
    businessContext: {},
    sessionDuration: 0,
    messageCount: 0
  });
  
  const location = useLocation();
  const navigate = useNavigate();
  const sessionStartTime = useRef(Date.now());

  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const updateConversationState = (updates: Partial<ConversationState>) => {
    setConversationState(prev => ({ ...prev, ...updates }));
  };

  const getContextualWelcomeMessage = useCallback((): ChatMessage => {
    const path = location.pathname;
    let content = "👋 Hi! I'm your AI business planning assistant.";
    let quickActions: QuickAction[] = [];

    if (path.includes('/business-plan')) {
      content += " I see you're working on a business plan. How can I help you today?";
      quickActions = [
        { id: '1', text: 'Start from scratch', action: 'start_new_plan', type: 'primary', icon: '🚀' },
        { id: '2', text: 'Continue existing plan', action: 'continue_plan', type: 'secondary', icon: '📋' },
        { id: '3', text: 'Get plan template', action: 'get_template', type: 'info', icon: '📄' }
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
  }, [location.pathname]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = getContextualWelcomeMessage();
      setMessages([welcomeMessage]);
    }
  }, [getContextualWelcomeMessage]);

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
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const contextualFAQs = getContextualFAQ(location.pathname);
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
          content: "I'd be happy to help! I can assist with business planning, market research, financial projections, and more.",
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
  }, [conversationState, location.pathname]);

  const handleQuickAction = useCallback(async (action: string, href?: string) => {
    if (action === 'navigate' && href) {
      navigate(href);
    } else if (action === 'faq' && href) {
      const faqItem = chatbotFAQ.find(item => item.id === href);
      if (faqItem) {
        sendMessage(faqItem.question);
      }
    } else {
      sendMessage(action);
    }
  }, [navigate, sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setTimeout(() => {
      const welcomeMessage = getContextualWelcomeMessage();
      setMessages([welcomeMessage]);
    }, 100);
  }, [getContextualWelcomeMessage]);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    setIsOpen,
    messages,
    isTyping,
    conversationState,
    sendMessage,
    handleQuickAction,
    clearChat,
    toggleChat,
    
    // Enhanced features
    businessContext: conversationState.businessContext,
    currentContext: conversationState.context,
    sessionDuration: conversationState.sessionDuration,
    messageCount: conversationState.messageCount,
    
    // Legacy compatibility
    clearConversation: clearChat,
    generateId,
    updateConversationState
  };
};