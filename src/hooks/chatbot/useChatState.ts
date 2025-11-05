import { useState, useCallback } from 'react';
import { ChatMessage, BusinessContext } from '@/types/api';

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

interface ConversationMemory {
  userPreferences: Record<string, any>;
  previousTopics: string[];
  importantDetails: Record<string, string>;
  userGoals: string[];
  painPoints: string[];
  industryContext?: string;
  businessStage?: string;
  lastInteractionTime: Date;
}

export interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isTyping: boolean;
  context: ConversationContext;
  businessContext: BusinessContext;
  sessionDuration: number;
  messageCount: number;
  errorCount: number;
  lastError?: string;
  isProcessing: boolean;
  conversationMemory: ConversationMemory;
}

/**
 * Manages core chat state
 */
export function useChatState() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<ConversationContext>(ConversationContext.WELCOME);
  const [businessContext, setBusinessContext] = useState<BusinessContext>({});
  const [sessionDuration, setSessionDuration] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationMemory, setConversationMemory] = useState<ConversationMemory>({
    userPreferences: {},
    previousTopics: [],
    importantDetails: {},
    userGoals: [],
    painPoints: [],
    lastInteractionTime: new Date()
  });

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    setMessageCount(prev => prev + 1);
  }, []);

  const updateLastMessage = useCallback((updates: Partial<ChatMessage>) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastIndex = newMessages.length - 1;
      if (lastIndex >= 0) {
        newMessages[lastIndex] = { ...newMessages[lastIndex], ...updates };
      }
      return newMessages;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setMessageCount(0);
  }, []);

  const updateBusinessContext = useCallback((updates: Partial<BusinessContext>) => {
    setBusinessContext(prev => ({ ...prev, ...updates }));
  }, []);

  const updateMemory = useCallback((updates: Partial<ConversationMemory>) => {
    setConversationMemory(prev => ({
      ...prev,
      ...updates,
      lastInteractionTime: new Date()
    }));
  }, []);

  const recordError = useCallback((error: string) => {
    setLastError(error);
    setErrorCount(prev => prev + 1);
  }, []);

  const resetState = useCallback(() => {
    setMessages([]);
    setContext(ConversationContext.WELCOME);
    setBusinessContext({});
    setMessageCount(0);
    setErrorCount(0);
    setLastError(undefined);
    setIsProcessing(false);
    setConversationMemory({
      userPreferences: {},
      previousTopics: [],
      importantDetails: {},
      userGoals: [],
      painPoints: [],
      lastInteractionTime: new Date()
    });
  }, []);

  return {
    // State
    isOpen,
    messages,
    isTyping,
    context,
    businessContext,
    sessionDuration,
    messageCount,
    errorCount,
    lastError,
    isProcessing,
    conversationMemory,
    
    // Actions
    setIsOpen,
    setIsTyping,
    setContext,
    setIsProcessing,
    addMessage,
    updateLastMessage,
    clearMessages,
    updateBusinessContext,
    updateMemory,
    recordError,
    resetState
  };
}
