import { useState, useCallback, useEffect, useRef, useMemo, useReducer } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { chatbotFAQ, getContextualFAQ } from '@/data/chatbotFAQ';
import { FAQItem, FAQUtils } from '@/types/faq';
import { supabase } from '@/integrations/supabase/client';
import { useNLU, NLUResult, BusinessIntent, BusinessEntity } from './useNLU';
import { streamChat } from './useStreamingChat';
import { useConversationMemory } from './useConversationMemory';
import { MEMORY_PATTERNS, detectMood, detectTone, extractTitle } from './useChatbot-memory-helpers';
import { useSocraticEngine } from './useSocraticEngine';
import { SocraticContext, ReasoningAnalysis, SocraticQuestion } from '@/types/socratic';
// Dynamic FAQ functionality removed - using static FAQs
// Advanced analytics functionality removed - to be implemented per IMPLEMENTATION_PLAN.md

// Enhanced message types for business planning - Compatible with ChatbotWidget
export interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  quickActions?: Array<{
    text: string;
    id?: string;
    action?: string;
    href?: string;
  }>;
  // Extended properties for business planning
  messageType?: 'text' | 'business_plan' | 'financial' | 'market_analysis' | 'recommendation';
  businessContext?: string;
  confidence?: number;
  sources?: string[];
  sourceMetadata?: Array<{
    title: string;
    url?: string;
    source?: string;
    sourceType?: 'web' | 'knowledge';
    snippet?: string;
    excerpt?: string;
    relevance?: number;
    similarity?: number;
    publishedDate?: string;
  }>;
  attachments?: Array<{
    type: 'pdf' | 'xlsx' | 'docx' | 'image';
    name: string;
    url: string;
  }>;
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
  FAQ = 'faq',
  // GTM Strategy contexts
  GTM_SEGMENTATION = 'gtm_segmentation',
  GTM_PERSONAS = 'gtm_personas',
  GTM_POSITIONING = 'gtm_positioning',
  GTM_PRICING = 'gtm_pricing',
  GTM_CHANNELS = 'gtm_channels',
  GTM_TACTICS = 'gtm_tactics',
  GTM_LAUNCH = 'gtm_launch',
  GTM_METRICS = 'gtm_metrics'
}

export interface BusinessContext {
  industry?: string;
  businessType?: 'startup' | 'existing' | 'franchise' | 'acquisition';
  stage?: 'idea' | 'planning' | 'launch' | 'growth' | 'expansion';
  location?: string;
  budget?: string;
  timeline?: string;
  experience?: 'first-time' | 'experienced' | 'serial-entrepreneur';
  goals?: string[];
  painPoints?: string[];
  completedSections?: string[];
}

interface ConversationState {
  context: ConversationContext;
  businessContext: BusinessContext;
  currentTopic?: string;
  sessionDuration: number;
  messageCount: number;
  userSatisfaction?: number;
  conversationFlow?: ConversationFlow;
  errorCount: number;
  lastError?: string;
  retryCount: number;
  isProcessing: boolean;
  conversationMemory: ConversationMemory;
}

interface ConversationFlow {
  currentStep: number;
  totalSteps: number;
  flowType: 'business_planning' | 'market_research' | 'financial_planning' | 'general_support';
  completedSteps: number[];
  nextSteps: string[];
  isCompleted: boolean;
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

interface AIResponse {
  content: string;
  quickActions?: ChatMessage['quickActions'];
  messageType?: ChatMessage['messageType'];
  confidence?: number;
  sources?: string[];
  contextUpdate?: Partial<BusinessContext>;
  shouldNavigate?: string;
  conversationFlowUpdate?: Partial<ConversationFlow>;
  memoryUpdate?: Partial<ConversationMemory>;
}

// Analytics and tracking interfaces
interface ChatAnalytics {
  totalMessages: number;
  averageResponseTime: number;
  userSatisfactionScore: number;
  mostAskedQuestions: string[];
  conversationCompletionRate: number;
  errorRate: number;
  popularTopics: string[];
  sessionDuration: number;
}

interface ConversationAction {
  type: 'ADD_MESSAGE' | 'UPDATE_STATE' | 'SET_ERROR' | 'CLEAR_ERROR' | 'UPDATE_MEMORY' | 'UPDATE_FLOW' | 'SET_PROCESSING' | 'INCREMENT_RETRY' | 'RESET_RETRY';
  payload?: any;
}

// Reducer for conversation state management
const conversationReducer = (state: ConversationState, action: ConversationAction): ConversationState => {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messageCount: state.messageCount + 1,
        conversationMemory: {
          ...state.conversationMemory,
          lastInteractionTime: new Date()
        }
      };
    
    case 'UPDATE_STATE':
      return {
        ...state,
        ...action.payload,
        errorCount: 0,
        retryCount: 0,
        lastError: undefined
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        errorCount: state.errorCount + 1,
        lastError: action.payload,
        isProcessing: false
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        errorCount: 0,
        lastError: undefined,
        retryCount: 0
      };
    
    case 'UPDATE_MEMORY':
      return {
        ...state,
        conversationMemory: {
          ...state.conversationMemory,
          ...action.payload
        }
      };
    
    case 'UPDATE_FLOW':
      return {
        ...state,
        conversationFlow: {
          ...state.conversationFlow,
          ...action.payload
        }
      };
    
    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload
      };
    
    case 'INCREMENT_RETRY':
      return {
        ...state,
        retryCount: state.retryCount + 1
      };
    
    case 'RESET_RETRY':
      return {
        ...state,
        retryCount: 0
      };
    
    default:
      return state;
  }
};

// Enhanced configuration interface
export interface EnhancedChatbotConfig {
  enableNLU: boolean;
  enableDynamicFAQ: boolean;
  enableAnalytics: boolean;
  enablePersonalization: boolean;
  enableAIGeneratedAnswers: boolean;
  nluConfig?: {
    confidenceThreshold: number;
    fallbackThreshold: number;
    enableSentimentAnalysis: boolean;
  };
  chatAnalyticsConfig?: {
    enableTracking: boolean;
    enableRealTimeAnalytics: boolean;
    enableUserSatisfaction: boolean;
    analyticsProviders: ('supabase' | 'google_analytics' | 'mixpanel' | 'amplitude')[];
  };
  personalizationConfig?: {
    enableProfileTracking: boolean;
    enableBehaviorAnalysis: boolean;
    enableContextualResponses: boolean;
    privacyMode: 'full' | 'limited' | 'minimal';
  };
  dynamicFAQConfig?: {
    enableLiveUpdates: boolean;
    cacheTimeout: number;
    enableVersioning: boolean;
    enableAIGeneratedAnswers: boolean;
    aiProvider?: 'openai' | 'anthropic' | 'local';
  };
}

export interface WizardMode {
  enabled: boolean;
  currentStep: number;
  steps: Array<{
    key: string;
    question: string;
    transition?: string;
  }>;
  answers: Record<string, string>;
  onStepComplete?: (step: number, answer: string) => void;
  onWizardComplete?: (answers: Record<string, string>) => void;
}

export interface SessionManagement {
  currentSessionId: string | null;
  createNewSession: (title?: string) => Promise<string | null>;
  setCurrentSessionId: (sessionId: string | null) => void;
  updateSession: (sessionId: string, updates: any) => Promise<void>;
}

export const useChatbot = (config: EnhancedChatbotConfig & { 
  wizardMode?: WizardMode;
  sessionManagement?: SessionManagement;
} = {
  enableNLU: true,
  enableDynamicFAQ: true,
  enableAnalytics: true,
  enablePersonalization: true,
  enableAIGeneratedAnswers: true,
  nluConfig: {
    confidenceThreshold: 0.6,
    fallbackThreshold: 0.4,
    enableSentimentAnalysis: true
  },
  chatAnalyticsConfig: {
    enableTracking: true,
    enableRealTimeAnalytics: true,
    enableUserSatisfaction: true,
    analyticsProviders: ['supabase']
  },
  personalizationConfig: {
    enableProfileTracking: true,
    enableBehaviorAnalysis: true,
    enableContextualResponses: true,
    privacyMode: 'full'
  },
  dynamicFAQConfig: {
    enableLiveUpdates: true,
    cacheTimeout: 300000, // 5 minutes
    enableVersioning: true,
    enableAIGeneratedAnswers: true,
    aiProvider: 'openai'
  }
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatMode, setChatMode] = useState<'wizard' | 'freeform' | 'tour-guide' | 'bizmap-structured'>('wizard');
  // Separate message storage per mode for independent conversations
  const [messagesByMode, setMessagesByMode] = useState<{
    'wizard': ChatMessage[];
    'freeform': ChatMessage[];
    'tour-guide': ChatMessage[];
    'bizmap-structured': ChatMessage[];
  }>({
    'wizard': [],
    'freeform': [],
    'tour-guide': [],
    'bizmap-structured': []
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [chatAnalytics, setChatAnalytics] = useState<ChatAnalytics>({
    totalMessages: 0,
    averageResponseTime: 0,
    userSatisfactionScore: 0,
    mostAskedQuestions: [],
    conversationCompletionRate: 0,
    errorRate: 0,
    popularTopics: [],
    sessionDuration: 0
  });
  
  const [conversationState, dispatch] = useReducer(conversationReducer, {
    context: ConversationContext.WELCOME,
    businessContext: {},
    sessionDuration: 0,
    messageCount: 0,
    errorCount: 0,
    retryCount: 0,
    isProcessing: false,
    conversationMemory: {
      userPreferences: {},
      previousTopics: [],
      importantDetails: {},
      userGoals: [],
      painPoints: [],
      lastInteractionTime: new Date()
    }
  });
  
  // Separate session IDs per mode for independent conversations
  const [sessionIdsByMode, setSessionIdsByMode] = useState<{
    'wizard': string;
    'freeform': string;
    'tour-guide': string;
    'bizmap-structured': string;
  }>({
    'wizard': `session_wizard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    'freeform': `session_freeform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    'tour-guide': `session_tour_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    'bizmap-structured': `session_structured_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });
  const sessionId = sessionIdsByMode[chatMode];
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatbot.ts:373',message:'sessionId initialized',data:{chatbotSessionId:sessionId,chatMode,currentSessionId:config.sessionManagement?.currentSessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  }, [sessionId, chatMode, config.sessionManagement?.currentSessionId]);
  // #endregion
  const [enableStreaming] = useState(true); // Enable streaming by default
  const [wizardStep, setWizardStep] = useState(config.wizardMode?.currentStep || 0);
  const [wizardAnswers, setWizardAnswers] = useState<Record<string, string>>(config.wizardMode?.answers || {});
  const sessionCreationAttempted = useRef(false); // Track if we've attempted to create a session
  
  // Sync messages with messagesByMode when chatMode changes (one-way: mode change -> load messages)
  useEffect(() => {
    const modeMessages = messagesByMode[chatMode] || [];
    setMessages(modeMessages);
  }, [chatMode]); // Only sync when mode changes, not when messagesByMode updates
  
  // Phase 3: Feedback Collection
  const [feedbackTriggerCount, setFeedbackTriggerCount] = useState(0);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const [sectionCompletionFeedback, setSectionCompletionFeedback] = useState<Record<string, number>>({});
  
  // Conversion tracking
  const [conversionPromptShown, setConversionPromptShown] = useState(false);
  const [conversionPromptDismissed, setConversionPromptDismissed] = useState(false);
  const [wizardStepWhenPrompted, setWizardStepWhenPrompted] = useState<number | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const sessionStartTime = useRef(Date.now());
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseTimeTracker = useRef<number[]>([]);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enhanced hooks initialization
  const nlu = useNLU({
    enableIntentRecognition: config.enableNLU,
    enableEntityExtraction: config.enableNLU,
    enableSentimentAnalysis: config.nluConfig?.enableSentimentAnalysis || true,
    confidenceThreshold: config.nluConfig?.confidenceThreshold || 0.6,
    fallbackThreshold: config.nluConfig?.fallbackThreshold || 0.4,
    maxIntents: 3
  });

  const { createMemory } = useConversationMemory();

  // Socratic Logic Engine
  const socraticEngine = useSocraticEngine({
    enableFallacyDetection: true,
    enableAssumptionSurfacing: true,
    enableEvidenceEvaluation: true,
    maxQuestionsPerSession: 8,
    reasoningDepth: 'medium',
    questionStyle: 'gentle'
  });

  // Socratic reasoning state
  const [socraticContext, setSocraticContext] = useState<SocraticContext>({
    businessContext: {},
    reasoningHistory: [],
    currentFocus: 'problem_solution_fit',
    userConfidence: 0.5,
    sessionGoals: []
  });

  // Streaming state
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingAbortRef = useRef(false);
  
  // Cancel streaming function
  const cancelStreaming = useCallback(() => {
    console.log('🛑 Canceling stream');
    streamingAbortRef.current = true;
    setIsStreaming(false);
    setStreamingMessage('');
  }, []);

  // Dynamic FAQ and advanced analytics to be implemented per IMPLEMENTATION_PLAN.md
  // These features are planned for future implementation

  // Business planning knowledge base with expanded industry insights
  const businessInsights = useMemo(() => ({
    technology: {
      trends: 'AI, cloud computing, and cybersecurity are driving growth',
      challenges: 'Rapid technological change, talent acquisition, funding competition',
      opportunities: 'Automation, SaaS solutions, mobile-first applications',
      pricing: '$50-500/month SaaS, $200-1000 customer acquisition cost',
      startupCosts: '$10K-50K for MVP, $50K-200K for full launch',
      keyMetrics: 'MRR, CAC, LTV, churn rate, activation rate'
    },
    healthcare: {
      trends: 'Telemedicine, personalized medicine, and health tech solutions',
      challenges: 'Regulatory compliance, data privacy, insurance coverage',
      opportunities: 'Aging population, preventive care, digital health',
      pricing: '$100-500/consultation, $50-200/month subscriptions',
      startupCosts: '$25K-100K for compliance, $100K-500K for full launch',
      keyMetrics: 'Patient acquisition cost, retention rate, compliance score'
    },
    retail: {
      trends: 'E-commerce growth, omnichannel experiences, sustainability',
      challenges: 'Supply chain disruptions, changing consumer behavior',
      opportunities: 'Direct-to-consumer, social commerce, personalization',
      pricing: '30-50% markup, $20-100 customer acquisition cost',
      startupCosts: '$5K-25K for online store, $25K-100K for physical location',
      keyMetrics: 'Conversion rate, AOV, inventory turnover'
    },
    food: {
      trends: 'Plant-based alternatives, food delivery, sustainability',
      challenges: 'Food safety regulations, supply chain complexity',
      opportunities: 'Health-conscious consumers, local sourcing, meal kits',
      pricing: '28-35% food cost, 30-35% labor cost, <10% rent',
      startupCosts: '$50K-200K for restaurant, $10K-50K for food truck',
      keyMetrics: 'Food cost percentage, labor cost percentage, table turnover'
    },
    education: {
      trends: 'Online learning, micro-credentials, personalized education',
      challenges: 'Student engagement, technology adoption, competition',
      opportunities: 'Skill gaps, lifelong learning, corporate training',
      pricing: '$50-500/course, $20-100/month subscriptions',
      startupCosts: '$5K-25K for online platform, $25K-100K for full program',
      keyMetrics: 'Completion rate, student satisfaction, retention rate'
    },
    finance: {
      trends: 'Fintech innovation, digital banking, cryptocurrency',
      challenges: 'Regulatory compliance, security, trust building',
      opportunities: 'Financial inclusion, automation, personalization',
      pricing: '1-3% transaction fees, $10-50/month subscriptions',
      startupCosts: '$100K-500K for compliance, $500K-2M for full launch',
      keyMetrics: 'Transaction volume, user acquisition, compliance score'
    },
    creative: {
      trends: 'Digital transformation, remote work, AI-assisted creativity',
      challenges: 'Pricing pressure, client acquisition, portfolio building',
      opportunities: 'Remote work, niche specialization, passive income',
      pricing: '$100-5000/project, $50-300 customer acquisition cost',
      startupCosts: '$2K-10K for portfolio, $10K-50K for full business',
      keyMetrics: 'Project completion rate, client retention, referral rate'
    }
  }), []);

  const businessPlanSections = useMemo(() => [
    'Executive Summary',
    'Company Description',
    'Market Analysis',
    'Organization & Management',
    'Products & Services',
    'Marketing & Sales Strategy',
    'Financial Projections',
    'Implementation Timeline'
  ], []);

  // Initialize with welcome message - Compatible with ChatbotWidget expectations
  useEffect(() => {
    // Only initialize if no session is selected and messages are empty
    const currentSessionId = config.sessionManagement?.currentSessionId;
    if (!currentSessionId && messages.length === 0) {
      if (config.wizardMode?.enabled && config.wizardMode.steps.length > 0) {
        // Initialize wizard mode with first question
        console.log('🚀 Initializing wizard mode with first question:', config.wizardMode.steps[0].question);
        const firstMessage: ChatMessage = {
          id: generateId(),
          content: config.wizardMode.steps[0].question,
          isBot: true,
          timestamp: new Date()
        };
        setMessages([firstMessage]);
        setMessagesByMode(prev => ({
          ...prev,
          [chatMode]: [firstMessage]
        }));
      } else {
        console.log('👋 Initializing with welcome message');
        const welcomeMessage = createWelcomeMessage();
        setMessages([welcomeMessage]);
        setMessagesByMode(prev => ({
          ...prev,
          [chatMode]: [welcomeMessage]
        }));
      }
      updateConversationState({ context: ConversationContext.WELCOME });
    }
  }, [location.pathname, config.wizardMode, config.sessionManagement?.currentSessionId, messages.length, chatMode]);

  // Session tracking and chatAnalytics updates
  useEffect(() => {
    const interval = setInterval(() => {
      const duration = Date.now() - sessionStartTime.current;
      dispatch({ type: 'UPDATE_STATE', payload: { sessionDuration: duration } });
      
      // Update chatAnalytics
      setChatAnalytics(prev => ({
        ...prev,
        sessionDuration: duration,
        averageResponseTime: responseTimeTracker.current.length > 0 
          ? responseTimeTracker.current.reduce((a, b) => a + b, 0) / responseTimeTracker.current.length 
          : 0,
        errorRate: conversationState.messageCount > 0 
          ? (conversationState.errorCount / conversationState.messageCount) * 100 
          : 0
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [conversationState.messageCount, conversationState.errorCount]);

  // Analytics tracking for user interactions
  const trackUserInteraction = useCallback((interaction: {
    type: 'question_asked' | 'quick_action_clicked' | 'satisfaction_rated' | 'conversation_completed';
    data?: any;
  }) => {
    setChatAnalytics(prev => {
      const updated = { ...prev };
      
      switch (interaction.type) {
        case 'question_asked':
          updated.totalMessages += 1;
          if (interaction.data?.question) {
            updated.mostAskedQuestions = [
              ...updated.mostAskedQuestions,
              interaction.data.question
            ].slice(-10); // Keep last 10 questions
          }
          break;
        
        case 'satisfaction_rated':
          if (interaction.data?.score) {
            updated.userSatisfactionScore = interaction.data.score;
          }
          break;
        
        case 'conversation_completed':
          updated.conversationCompletionRate = conversationState.conversationFlow?.isCompleted ? 100 : 0;
          break;
      }
      
      return updated;
    });
  }, [conversationState.conversationFlow]);

  // Phase 3: Feedback collection functions
  const collectFeedback = useCallback(async (feedbackData: {
    type: 'mid_conversation' | 'section_completion' | 'exit_intent';
    rating?: number;
    comment?: string;
    section?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Type assertion for new table not yet in generated types
      await supabase.from('chatbot_feedback' as any).insert({
        user_id: user?.id,
        session_id: sessionId,
        feedback_type: feedbackData.type,
        rating: feedbackData.rating,
        comment: feedbackData.comment,
        section: feedbackData.section,
        business_context: conversationState.businessContext,
        message_count: conversationState.messageCount
      } as any);
      
      if (feedbackData.rating) {
        trackUserInteraction({ type: 'satisfaction_rated', data: { score: feedbackData.rating } });
      }
    } catch (error) {
      console.error('Error collecting feedback:', error);
    }
  }, [sessionId, conversationState, trackUserInteraction]);

  const triggerFeedbackCheckIn = useCallback(() => {
    if (conversationState.messageCount % 10 === 0 && conversationState.messageCount > 0) {
      setShowFeedbackPrompt(true);
      setFeedbackTriggerCount(prev => prev + 1);
      
      const feedbackMessage: ChatMessage = {
        id: generateId(),
        content: "How's your experience so far? Your feedback helps me assist you better! 😊",
        isBot: true,
        timestamp: new Date(),
        quickActions: [
          { text: '⭐ Excellent (5)', action: 'rate_5' },
          { text: '👍 Good (4)', action: 'rate_4' },
          { text: '😐 Okay (3)', action: 'rate_3' },
          { text: '👎 Needs Work (2)', action: 'rate_2' }
        ]
      };
      
      setMessages(prev => [...prev, feedbackMessage]);
      // Also update messagesByMode to keep it in sync
      setMessagesByMode(prev => ({
        ...prev,
        [chatMode]: [...(prev[chatMode] || []), feedbackMessage]
      }));
    }
  }, [conversationState.messageCount]);

  const rateSectionCompletion = useCallback((section: string, rating: number) => {
    setSectionCompletionFeedback(prev => ({ ...prev, [section]: rating }));
    collectFeedback({
      type: 'section_completion',
      rating,
      section
    });
  }, [collectFeedback]);

  // Phase 3: Exit intent feedback
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (conversationState.messageCount > 5 && !conversationState.conversationFlow?.isCompleted) {
        collectFeedback({
          type: 'exit_intent',
          comment: 'User left before completing conversation'
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [conversationState, collectFeedback]);

  // Trigger feedback check-ins
  useEffect(() => {
    triggerFeedbackCheckIn();
  }, [conversationState.messageCount, triggerFeedbackCheckIn]);

  // Extract and store memory from conversations (background processing)
  const extractAndStoreMemory = useCallback(async (userMessage: string, aiResponse: string) => {
    // Move memory extraction to background to avoid blocking responses
    setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user's memory preference
        const { data: profile } = await supabase
          .from('profiles')
          .select('memory_preference')
          .eq('id', user.id)
          .single();

        const memoryPreference = profile?.memory_preference || 'important';
        
        // Memory extraction with importance scores
        const minImportance = memoryPreference === 'everything' ? 0.0 : 
                             memoryPreference === 'important' ? 0.5 : 0.8;

        // Find matching pattern
        for (const pattern of MEMORY_PATTERNS) {
          if (pattern.regex.test(userMessage) && pattern.importance >= minImportance) {
            // Extract title from first sentence
            const title = extractTitle(userMessage, pattern.titlePrefix);

            // Extract tags from business context
            const tags: string[] = [];
            if (conversationState.businessContext.industry) {
              tags.push(conversationState.businessContext.industry);
            }
            if (conversationState.businessContext.stage) {
              tags.push(conversationState.businessContext.stage);
            }

            await createMemory({
              memory_type: pattern.type,
              title,
              content: userMessage,
              importance_score: pattern.importance,
              tags: tags.length > 0 ? tags : undefined,
              business_stage: conversationState.businessContext.stage as any,
              user_mood: detectMood(userMessage) as any,
              ai_response_tone: detectTone(aiResponse) as any
            });

            break; // Only create one memory per message
          }
        }
      } catch (error) {
        console.error('Error storing memory:', error);
        // Don't block the conversation if memory storage fails
      }
    }, 0);
  }, [conversationState.businessContext, createMemory]);

  const generateId = (): string => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const updateConversationState = useCallback((updates: Partial<ConversationState>) => {
    dispatch({ type: 'UPDATE_STATE', payload: updates });
  }, []);

  // Enhanced error handling with retry logic
  const handleError = useCallback((error: Error, retryable: boolean = true) => {
    console.error('Chatbot Error:', error);
    
    dispatch({ type: 'SET_ERROR', payload: error.message });
    
    if (retryable && conversationState.retryCount < 3) {
      dispatch({ type: 'INCREMENT_RETRY' });
      
      // Auto-retry after delay
      retryTimeout.current = setTimeout(() => {
        dispatch({ type: 'CLEAR_ERROR' });
        // Trigger retry logic here if needed
      }, Math.pow(2, conversationState.retryCount) * 1000); // Exponential backoff
    }
  }, [conversationState.retryCount]);

  // Clear errors and reset retry count
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
    if (retryTimeout.current) {
      clearTimeout(retryTimeout.current);
      retryTimeout.current = null;
    }
  }, []);

  // Load messages from a session when it's selected
  const loadMessagesFromSession = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      console.warn('⚠️ loadMessagesFromSession called with empty sessionId');
      return;
    }
    
    try {
      setIsTyping(true);
      console.log('📥 Loading messages for session:', sessionId);
      
      // First, find the conversation for this session
      const { data: conversation, error: convError } = await supabase
        .from('chatbot_conversations')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle();
      
      if (convError) {
        console.error('Error loading conversation:', convError);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `Failed to load conversation: ${convError.message || 'Unknown error'}` 
        });
        setIsTyping(false);
        // Don't clear messages on error - keep existing state
        return;
      }
      
      // If no conversation exists, this is a new/empty session
      if (!conversation) {
        console.log('📭 No conversation found for session, starting fresh');
        setMessages([]);
        setMessagesByMode(prev => ({
          ...prev,
          [chatMode]: []
        }));
        dispatch({ 
          type: 'UPDATE_STATE', 
          payload: { 
            messageCount: 0,
            context: ConversationContext.WELCOME
          } 
        });
        setIsTyping(false);
        return;
      }
      
      // Load all messages for this conversation
      const { data: dbMessages, error: messagesError } = await supabase
        .from('chatbot_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });
      
      if (messagesError) {
        console.error('Error loading messages:', messagesError);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `Failed to load messages: ${messagesError.message || 'Unknown error'}` 
        });
        setIsTyping(false);
        // Don't clear messages on error - keep existing state
        return;
      }
      
      // Handle empty messages array
      if (!dbMessages || dbMessages.length === 0) {
        console.log('📭 No messages found for conversation');
        setMessages([]);
        setMessagesByMode(prev => ({
          ...prev,
          [chatMode]: []
        }));
        dispatch({ 
          type: 'UPDATE_STATE', 
          payload: { 
            messageCount: 0,
            context: ConversationContext.WELCOME
          } 
        });
        setIsTyping(false);
        return;
      }
      
      // Convert database messages to ChatMessage format with error handling
      const loadedMessages: ChatMessage[] = dbMessages
        .filter((msg) => {
          // Filter out invalid messages
          if (!msg.id || !msg.content) {
            console.warn('⚠️ Skipping invalid message:', msg);
            return false;
          }
          return true;
        })
        .map((msg) => {
          try {
            const metadata = typeof msg.metadata === 'object' && msg.metadata !== null 
              ? (msg.metadata as any) 
              : {};
            
            // Safely parse timestamp
            let timestamp: Date;
            try {
              timestamp = msg.created_at ? new Date(msg.created_at) : new Date();
              // Validate date
              if (isNaN(timestamp.getTime())) {
                timestamp = new Date();
              }
            } catch {
              timestamp = new Date();
            }
            
            return {
              id: msg.id || generateId(),
              content: msg.content || '',
              isBot: msg.role === 'assistant',
              timestamp,
              businessContext: metadata.businessContext,
              messageType: metadata.messageType || 'text',
              confidence: metadata.confidence,
              sources: Array.isArray(metadata.sources) ? metadata.sources : undefined,
              sourceMetadata: Array.isArray(metadata.sourceMetadata) 
                ? metadata.sourceMetadata 
                : (Array.isArray(metadata.sources) 
                  ? metadata.sources.map((s: any) => ({
                      title: s.title || s.name || '',
                      url: s.url || s.link,
                      source: s.source,
                      sourceType: s.sourceType || 'knowledge',
                      snippet: s.snippet || s.excerpt,
                      relevance: s.relevance || s.similarity,
                      publishedDate: s.publishedDate
                    }))
                  : undefined),
              quickActions: Array.isArray(metadata.quickActions) ? metadata.quickActions : undefined,
              attachments: Array.isArray(metadata.attachments) ? metadata.attachments : undefined
            };
          } catch (error) {
            console.error('Error converting message:', error, msg);
            // Return a minimal valid message
            return {
              id: msg.id || generateId(),
              content: msg.content || 'Error loading message',
              isBot: msg.role === 'assistant',
              timestamp: new Date(msg.created_at || Date.now())
            };
          }
        });
      
      console.log(`✅ Loaded ${loadedMessages.length} messages from session`);
      
      // Only update state if we have valid messages
      if (loadedMessages.length > 0) {
        setMessages(loadedMessages);
        setMessagesByMode(prev => ({
          ...prev,
          [chatMode]: loadedMessages
        }));
        
        const userMessages = loadedMessages.filter(m => !m.isBot);
        dispatch({ 
          type: 'UPDATE_STATE', 
          payload: { 
            messageCount: loadedMessages.length,
            context: userMessages.length > 0 
              ? ConversationContext.BUSINESS_CONCEPT 
              : ConversationContext.WELCOME
          } 
        });
      } else {
        // No valid messages - reset to empty
        setMessages([]);
        setMessagesByMode(prev => ({
          ...prev,
          [chatMode]: []
        }));
        dispatch({ 
          type: 'UPDATE_STATE', 
          payload: { 
            messageCount: 0,
            context: ConversationContext.WELCOME
          } 
        });
      }
      
    } catch (error) {
      console.error('Error loading messages from session:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error loading messages';
      dispatch({ 
        type: 'SET_ERROR', 
        payload: errorMessage
      });
      // Don't clear messages on error - keep existing state
    } finally {
      setIsTyping(false);
    }
  }, [chatMode]);

  // Load messages when session is selected (must be after loadMessagesFromSession is defined)
  const previousSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentSessionId = config.sessionManagement?.currentSessionId;
    
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatbot.ts:989',message:'session effect triggered',data:{currentSessionId,previousSessionId:previousSessionIdRef.current,chatbotSessionId:sessionId,messagesCount:messages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.log('🔍 useChatbot useEffect: currentSessionId =', currentSessionId, 'previous =', previousSessionIdRef.current);
    
    // Only load if sessionId changed and is not null
    if (currentSessionId && currentSessionId !== previousSessionIdRef.current) {
      previousSessionIdRef.current = currentSessionId;
      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatbot.ts:994',message:'session changed clearing messages',data:{currentSessionId,previousSessionId:previousSessionIdRef.current,messagesCountBefore:messages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.log('🔄 Session changed, loading messages:', currentSessionId);
      // Clear messages first to show loading state
      setMessages([]);
      setMessagesByMode(prev => ({
        ...prev,
        [chatMode]: []
      }));
      // Load messages
      loadMessagesFromSession(currentSessionId).catch((error) => {
        // #region agent log
        fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatbot.ts:1004',message:'loadMessagesFromSession failed',data:{currentSessionId,error:error instanceof Error?error.message:'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.error('Failed to load messages:', error);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `Failed to load messages: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      });
    } else if (!currentSessionId && previousSessionIdRef.current) {
      // Session was cleared, but only reset if we have messages to preserve
      // If messages exist, they might be from an anonymous session - preserve them
      // Only clear if explicitly switching to null (user selected "New Chat")
      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/71bda769-8df3-4a55-a084-5705fe238e94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatbot.ts:1024',message:'session cleared but preserving messages',data:{previousSessionId:previousSessionIdRef.current,messagesCount:messages.length,willPreserve:messages.length>0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.log('🔄 Session cleared, but preserving existing messages');
      previousSessionIdRef.current = null;
      // Don't clear messages - they might be from anonymous session that should persist
      // Only clear if user explicitly selects "New Chat" which sets currentSessionId to null
    }
  }, [config.sessionManagement?.currentSessionId, loadMessagesFromSession, chatMode]);

  const createWelcomeMessage = (): ChatMessage => {
    const path = location.pathname;
    let content = "👋 Welcome! I'm your AI Business Planning Assistant.";
    let quickActions: ChatMessage['quickActions'] = [];

    // Home page - Tour Guide mode
    if (path === '/') {
      setChatMode('tour-guide');
      content = `👋 Hey! I'm your guide to Creatives Takeover. We help creative entrepreneurs turn ideas into launched businesses in 30 days.

What would you like to know?`;

      quickActions = [
        { text: '🤔 What is this platform?', action: 'what_is_platform' },
        { text: '🤖 How does BizMap AI work?', action: 'how_bizmap_works' },
        { text: '📊 What is Insighta?', action: 'what_is_insighta' },
        { text: '💰 Pricing?', action: 'pricing_info' },
        { text: '🚀 Where to start?', action: 'getting_started' }
      ];
    } else if (path.includes('/bizmap-ai')) {
      content = `🚀 Welcome to Dream2Plan! I'm your AI Business Planning Assistant, here to help you transform your business dreams into actionable plans.

I can guide you through:
• **Business Concept Development** - Validate and refine your ideas
• **Market Research & Analysis** - Understand your opportunity
• **Financial Planning & Modeling** - Create realistic projections
• **Strategic Planning** - Develop your go-to-market strategy

Ready to turn your vision into a comprehensive business plan? Let's start with understanding your business concept!

What's your business idea or what industry are you exploring?`;

      quickActions = [
        { text: '💡 Validate My Business Idea', action: 'validate_idea' },
        { text: '🎯 Conduct Market Research', action: 'market_research' },
        { text: '📊 Create Financial Model', action: 'financial_model' },
        { text: '📋 Get Business Plan Template', action: 'business_template' }
      ];
    } else if (path.includes('/business-plan')) {
      content = `👋 Hi! I see you're working on a business plan. I'm here to guide you through every step of the process.

I can help you with:
• Business concept validation
• Market research and analysis  
• Financial projections and modeling
• Operations planning
• Marketing strategy development

What would you like to work on first?`;

      quickActions = [
        { text: '🚀 Start New Business Plan', action: 'start_new_plan' },
        { text: '📋 Continue Existing Plan', action: 'continue_plan' },
        { text: '📊 Financial Projections', action: 'financial_planning' },
        { text: '🎯 Market Research', action: 'market_research' }
      ];
    } else if (path.includes('/financial')) {
      content = `💰 Let's work on your financial planning! I can help you create comprehensive financial projections including:

• Revenue forecasting
• Expense planning
• Cash flow analysis
• Break-even calculations
• Investment requirements

What financial aspect would you like to focus on?`;

      quickActions = [
        { text: '📈 Revenue Projections', action: 'revenue_projections' },
        { text: '💸 Expense Planning', action: 'expense_planning' },
        { text: '💰 Cash Flow Analysis', action: 'cash_flow_analysis' },
        { text: '⚖️ Break-even Analysis', action: 'breakeven_analysis' }
      ];
    } else {
      content = `I'm your comprehensive business planning assistant! I can help you with:

🎯 **Business Strategy**
• Concept development and validation
• Market opportunity analysis
• Competitive positioning

📊 **Financial Planning**  
• Revenue and expense modeling
• Cash flow projections
• Investment planning

🚀 **Implementation**
• Operations planning
• Marketing strategy
• Growth planning

What aspect of your business would you like to explore?`;

      quickActions = [
        { text: '💡 Validate Business Idea', action: 'validate_idea' },
        { text: '📊 Create Financial Model', action: 'financial_model' },
        { text: '🎯 Analyze Market', action: 'market_analysis' },
        { text: '📋 Get Business Plan Template', action: 'business_template' }
      ];
    }

    return {
      id: generateId(),
      content,
      isBot: true,
      timestamp: new Date(),
      quickActions,
      messageType: 'recommendation',
      confidence: 1.0
    };
  };

  const simulateTyping = (duration: number = 200) => {
    // Reduced from 1200-2000ms to 200ms for instant response feel
    setIsTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
    }, duration);
  };

  // Helper functions for enhanced response handling
  const handleFallbackResponse = async (content: string, nluResult: NLUResult): Promise<AIResponse> => {
    // Fallback to general response
    return {
      content: `I understand you're asking about "${content}". While I don't have a specific answer for that, I can help you with business planning, market research, financial planning, and other business-related topics. Could you provide more details about what you'd like to know?`,
      quickActions: nluResult.suggestedQuestions?.map(q => ({ text: q, action: 'suggested_question' })) || [],
      confidence: 0.3,
      sources: ['General Knowledge Base']
    };
  };

  // Socratic reasoning quick actions
  const generateSocraticQuickActions = (reasoningAnalysis: ReasoningAnalysis): ChatMessage['quickActions'] => {
    const actions: ChatMessage['quickActions'] = [];
    
    if (reasoningAnalysis.logicGaps.length > 0) {
      actions.push({
        text: '🧠 Explore Logic Gaps',
        action: 'explore_logic_gaps',
        href: '#logic-gaps'
      });
    }
    
    if (reasoningAnalysis.assumptions.length > 0) {
      actions.push({
        text: '🔍 Test Assumptions',
        action: 'test_assumptions',
        href: '#assumptions'
      });
    }
    
    if (reasoningAnalysis.confidence < 0.7) {
      actions.push({
        text: '💡 Strengthen Reasoning',
        action: 'strengthen_reasoning',
        href: '#reasoning'
      });
    }
    
    actions.push({
      text: '📊 View Analysis',
      action: 'view_reasoning_analysis',
      href: '#analysis'
    });
    
    return actions;
  };

  const handleClarificationResponse = async (content: string, nluResult: NLUResult): Promise<AIResponse> => {
    const topIntents = nluResult.intents.slice(0, 2);
    
    return {
      content: `I want to make sure I understand you correctly. Are you asking about:
      
1. **${topIntents[0]?.name.replace('_', ' ')}** - ${topIntents[0]?.confidence > 0.7 ? 'This seems most likely' : 'This is one possibility'}
2. **${topIntents[1]?.name.replace('_', ' ')}** - ${topIntents[1]?.confidence > 0.7 ? 'This also seems likely' : 'This is another possibility'}

Or perhaps something else entirely? Please let me know which direction you'd like to go, or provide more details about your question.`,
      quickActions: [
        { text: `Yes, ${topIntents[0]?.name.replace('_', ' ')}`, action: 'clarify_intent', href: topIntents[0]?.name },
        { text: `Yes, ${topIntents[1]?.name.replace('_', ' ')}`, action: 'clarify_intent', href: topIntents[1]?.name },
        { text: 'Something else', action: 'rephrase_question' }
      ],
      confidence: 0.5,
      sources: ['Clarification System']
    };
  };

  // Enhanced AI response generation with Socratic reasoning
  const generateAIResponse = async (userMessage: string, nluResult?: NLUResult): Promise<AIResponse> => {
    const startTime = Date.now();
    dispatch({ type: 'SET_PROCESSING', payload: true });
    
    try {
      const lowerMessage = userMessage.toLowerCase();
      const { context, businessContext, conversationMemory } = conversationState;

      // Analyze reasoning with Socratic engine
      const reasoningAnalysis = socraticEngine.analyzeReasoning(userMessage);
      
      // Update Socratic context
      setSocraticContext(prev => ({
        ...prev,
        businessContext: {
          ...prev.businessContext,
          industry: businessContext.industry,
          stage: businessContext.stage,
          problem: reasoningAnalysis.entities.find(e => e.type === 'problem')?.text,
          solution: reasoningAnalysis.entities.find(e => e.type === 'solution')?.text,
          market: reasoningAnalysis.entities.find(e => e.type === 'market')?.text
        },
        reasoningHistory: [...prev.reasoningHistory, reasoningAnalysis],
        currentFocus: reasoningAnalysis.reasoningType,
        userConfidence: reasoningAnalysis.confidence
      }));

      // Generate Socratic questions if reasoning needs improvement
      const needsSocraticGuidance = reasoningAnalysis.logicGaps.length > 0 || 
                                   reasoningAnalysis.assumptions.length > 0 ||
                                   reasoningAnalysis.confidence < 0.7;

      if (needsSocraticGuidance) {
        const socraticGuidance = socraticEngine.guideReasoning(socraticContext, userMessage);
        
        // If we have high-priority Socratic questions, use them
        if (socraticGuidance.priority === 'high' && socraticGuidance.questions.length > 0) {
          const topQuestion = socraticGuidance.questions[0];
          return {
            content: `I'd like to explore your thinking more deeply. ${topQuestion.question}

${topQuestion.followUp ? `\n${topQuestion.followUp}` : ''}

This will help us strengthen your business logic and ensure you're building on solid foundations.`,
            messageType: 'business_plan',
            quickActions: socraticGuidance.questions.slice(1, 3).map(q => ({
              text: q.question.substring(0, 50) + '...',
              action: 'socratic_question',
              href: q.id
            })),
            confidence: 0.95,
            sources: ['Socratic Logic Engine', 'Business Reasoning Analysis']
          };
        }
      }

      // Track response time
      const responseTime = Date.now() - startTime;
      responseTimeTracker.current.push(responseTime);
      if (responseTimeTracker.current.length > 20) {
        responseTimeTracker.current.shift(); // Keep only last 20 response times
      }

      // Extract business information from message (lightweight)
      const extractedInfo = extractBusinessInformation(userMessage);
      
      // Update conversation memory with new information (background)
      if (extractedInfo.industry) {
        // Use setTimeout to defer heavy state updates
        setTimeout(() => {
          dispatch({ 
            type: 'UPDATE_MEMORY', 
            payload: { 
              industryContext: extractedInfo.industry,
              importantDetails: {
                ...conversationMemory.importantDetails,
                industry: extractedInfo.industry
              }
            } 
          });
        }, 0);
      }

      // Check FAQ first for quick answers (optimized)
      const contextualFAQs = getContextualFAQ(location.pathname);
      const allFAQs = [...contextualFAQs, ...chatbotFAQ];
      
      // Use simpler relevance scoring for faster processing
      const faqMatch = allFAQs.find(faq => 
        faq.question.toLowerCase().includes(lowerMessage) || 
        lowerMessage.includes(faq.question.toLowerCase())
      );
      
      if (faqMatch) {
        // Track FAQ usage for chatAnalytics (background)
        setTimeout(() => {
          trackUserInteraction({ 
            type: 'question_asked', 
            data: { question: userMessage, source: 'FAQ' } 
          });
        }, 0);
        
        return {
          content: faqMatch.answer,
          quickActions: faqMatch.quickActions,
          confidence: 0.9,
          sources: ['FAQ Database']
        };
      }

    // Context-aware business planning responses
    if (context === ConversationContext.BUSINESS_CONCEPT || lowerMessage.includes('business idea') || lowerMessage.includes('concept')) {
      return generateBusinessConceptResponse(userMessage, extractedInfo);
    }

    if (context === ConversationContext.MARKET_RESEARCH || lowerMessage.includes('market') || lowerMessage.includes('competition')) {
      return generateMarketResearchResponse(userMessage, extractedInfo);
    }

    if (context === ConversationContext.FINANCIAL_PLANNING || lowerMessage.includes('financial') || lowerMessage.includes('money') || lowerMessage.includes('revenue')) {
      return generateFinancialPlanningResponse(userMessage, extractedInfo);
    }

    // Industry-specific guidance
    if (extractedInfo.industry) {
      return generateIndustrySpecificResponse(extractedInfo.industry, userMessage);
    }

    // General business advice
    return generateGeneralBusinessAdvice(userMessage);
    
    } catch (error) {
      handleError(error as Error, true);
      throw error;
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  const extractBusinessInformation = (message: string): Partial<BusinessContext> => {
    const info: Partial<BusinessContext> = {};
    const lower = message.toLowerCase();

    // Industry detection
    const industryKeywords = {
      technology: ['tech', 'software', 'app', 'digital', 'ai', 'saas', 'platform'],
      healthcare: ['health', 'medical', 'wellness', 'fitness', 'pharma', 'clinic'],
      retail: ['retail', 'store', 'shop', 'ecommerce', 'product', 'fashion'],
      food: ['food', 'restaurant', 'catering', 'delivery', 'cooking', 'beverage'],
      education: ['education', 'training', 'course', 'school', 'learning'],
      finance: ['finance', 'fintech', 'banking', 'investment', 'insurance']
    };

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      if (keywords.some(keyword => lower.includes(keyword))) {
        info.industry = industry;
        break;
      }
    }

    // Business stage detection
    if (lower.includes('startup') || lower.includes('new business')) {
      info.businessType = 'startup';
      info.stage = 'idea';
    }
    if (lower.includes('existing business')) {
      info.businessType = 'existing';
    }
    if (lower.includes('planning')) {
      info.stage = 'planning';
    }
    if (lower.includes('launch') || lower.includes('starting')) {
      info.stage = 'launch';
    }

    // Experience level
    if (lower.includes('first time') || lower.includes('beginner')) {
      info.experience = 'first-time';
    }
    if (lower.includes('experienced') || lower.includes('serial entrepreneur')) {
      info.experience = 'experienced';
    }

    return info;
  };

  const generateBusinessConceptResponse = (message: string, info: Partial<BusinessContext>): AIResponse => {
    let content = "Great! Let's develop your business concept. ";

    if (info.industry) {
      const industryData = businessInsights[info.industry as keyof typeof businessInsights];
      if (industryData) {
        content += `I see you're interested in the ${info.industry} industry. ${industryData.trends}.

**Key Opportunities in ${info.industry}:**
${industryData.opportunities}

**Common Challenges to Consider:**
${industryData.challenges}

`;
      }
    }

    content += `To help you refine your business concept, let's explore:

🎯 **Value Proposition**: What unique problem does your business solve?
👥 **Target Market**: Who are your ideal customers?
💰 **Revenue Model**: How will you make money?
🏆 **Competitive Advantage**: What sets you apart?

What specific problem are you looking to solve with your business?`;

    return {
      content,
      messageType: 'business_plan',
      quickActions: [
        { text: '🎯 Define Target Market', action: 'define_target_market' },
        { text: '🔍 Research Competitors', action: 'research_competitors' },
        { text: '💎 Create Value Proposition', action: 'value_proposition' },
        { text: '📊 Validate Market Demand', action: 'validate_demand' }
      ],
      confidence: 0.92,
      sources: ['Business Planning Best Practices', 'Industry Analysis'],
      contextUpdate: { ...info, stage: 'planning' }
    };
  };

  const generateMarketResearchResponse = (message: string, info: Partial<BusinessContext>): AIResponse => {
    const content = `Excellent! Market research is crucial for business success. Let me guide you through a comprehensive market analysis.

📈 **Market Size Analysis (TAM-SAM-SOM Framework):**
• **Total Addressable Market (TAM)**: The entire market opportunity
• **Serviceable Addressable Market (SAM)**: Your realistic target market
• **Serviceable Obtainable Market (SOM)**: Your achievable market share

🏢 **Competitive Analysis Framework:**
1. **Direct Competitors**: Companies offering similar solutions
2. **Indirect Competitors**: Alternative solutions to the same problem
3. **Competitive Advantages**: What makes you different and better

👥 **Customer Research:**
• Demographics and psychographics
• Pain points and motivations
• Buying behavior and decision factors
• Price sensitivity and preferences

Would you like me to help you identify your main competitors or calculate your market size potential?`;

    return {
      content,
      messageType: 'market_analysis',
      quickActions: [
        { text: '🔍 Find Direct Competitors', action: 'find_competitors' },
        { text: '📊 Calculate Market Size', action: 'market_size_calculator' },
        { text: '👥 Create Customer Personas', action: 'customer_personas' },
        { text: '💰 Analyze Pricing Strategies', action: 'pricing_analysis' }
      ],
      confidence: 0.89,
      sources: ['Market Research Methodology', 'Competitive Analysis Framework']
    };
  };

  const generateFinancialPlanningResponse = (message: string, info: Partial<BusinessContext>): AIResponse => {
    const content = `Perfect! Let's build your financial foundation. A comprehensive financial plan includes several key components:

💰 **Revenue Projections:**
• Monthly/quarterly/annual revenue forecasts
• Multiple revenue streams identification
• Growth rate assumptions and seasonality factors
• Customer acquisition and retention metrics

💸 **Cost Structure:**
• **Fixed Costs**: Rent, insurance, salaries, software subscriptions
• **Variable Costs**: Materials, commissions, transaction fees
• **One-time Costs**: Equipment, setup, legal, marketing launch

📊 **Key Financial Statements:**
• Profit & Loss (P&L) projections
• Cash flow statements
• Balance sheet forecasts
• Break-even analysis

🎯 **Critical Metrics:**
• Customer Acquisition Cost (CAC)
• Customer Lifetime Value (CLV)
• Monthly Recurring Revenue (MRR)
• Burn rate and runway

What's your expected monthly revenue target for the first year of operations?`;

    return {
      content,
      messageType: 'financial',
      quickActions: [
        { text: '🧮 Build Financial Model', action: 'build_financial_model' },
        { text: '💰 Calculate Startup Costs', action: 'startup_costs_calculator' },
        { text: '📈 Revenue Forecasting', action: 'revenue_forecasting' },
        { text: '🏦 Explore Funding Options', action: 'funding_options' }
      ],
      confidence: 0.94,
      sources: ['Financial Modeling Best Practices', 'Startup Finance Guide']
    };
  };

  const generateIndustrySpecificResponse = (industry: string, message: string): AIResponse => {
    const industryData = businessInsights[industry as keyof typeof businessInsights];
    
    const content = `Based on your interest in the ${industry} industry, here's what you should know:

🌟 **Current Industry Trends:**
${industryData?.trends || 'Industry is experiencing significant growth and innovation opportunities.'}

⚡ **Key Opportunities:**
${industryData?.opportunities || 'Multiple growth vectors available for new entrants.'}

⚠️ **Challenges to Navigate:**
${industryData?.challenges || 'Regulatory considerations and competitive landscape factors.'}

**Recommended Next Steps:**
1. Conduct thorough market research in your specific niche
2. Identify key players and their market positioning
3. Validate your unique value proposition
4. Develop a minimum viable product (MVP) strategy

What specific aspect of the ${industry} industry interests you most?`;

    return {
      content,
      messageType: 'recommendation',
      quickActions: [
        { text: `📊 ${industry} Market Analysis`, action: `${industry}_market_analysis` },
        { text: '🏢 Industry Competitors', action: 'industry_competitors' },
        { text: '💡 Business Opportunities', action: 'business_opportunities' },
        { text: '📋 Industry Requirements', action: 'industry_requirements' }
      ],
      confidence: 0.87,
      sources: ['Industry Reports', 'Market Analysis'],
      contextUpdate: { industry }
    };
  };

  const generateGeneralBusinessAdvice = (message: string): AIResponse => {
    const lowerMessage = message.toLowerCase();
    
    // Handle specific emotional states and common concerns
    if (lowerMessage.includes('overwhelm') || lowerMessage.includes('too much') || lowerMessage.includes('confused')) {
      return {
        content: `I hear you - this probably feels like drinking from a fire hose right now. That means we're moving too fast. Let's slow wayyy down.

Forget everything we've covered. If you could only do ONE thing this week to move your business forward, what would it be?

Just one thing. We'll build from there. 🙂`,
        quickActions: [
          { text: '🧘 Let\'s Simplify', action: 'simplify_approach' },
          { text: '⏭️ Skip for Now', action: 'skip_section' },
          { text: '🎯 Focus on One Thing', action: 'single_focus' }
        ],
        confidence: 0.9,
        sources: ['Emotional Support Guidelines']
      };
    }

    if (lowerMessage.includes('don\'t know') || lowerMessage.includes('unqualified') || lowerMessage.includes('not qualified')) {
      return {
        content: `Let's talk about this - imposter syndrome is SO common with entrepreneurs. Here's the truth: You don't need a business degree or years of experience.

You need:
1. A problem you understand deeply
2. Willingness to learn as you go  
3. Resilience when things get tough

You already have #1 (that's why you're interested in this!). #2 and #3? Those are choices, not prerequisites.

What specifically makes you feel unqualified? Let's tackle that together.`,
        quickActions: [
          { text: '💪 Build Confidence', action: 'confidence_building' },
          { text: '📚 Learn Basics', action: 'learn_fundamentals' },
          { text: '🤝 Find Support', action: 'find_mentor' }
        ],
        confidence: 0.95,
        sources: ['Imposter Syndrome Support']
      };
    }

    if (lowerMessage.includes('money') || lowerMessage.includes('afford') || lowerMessage.includes('budget')) {
      return {
        content: `I hear you - money stress is real. Let's break this down:

**Absolute Minimum to Start** (Bootstrap Mode):
• Website: $12/year domain + free Wix/WordPress
• Payment processing: Free to start (Stripe, PayPal)
• Marketing: $0 (social media, word of mouth)
• Tools: Free tiers of everything
TOTAL: ~$50 to test your idea

**Comfortable Start** (Recommended):
• Website: $300-500 one-time + $20/mo hosting
• Basic branding: $200-500 (Fiverr/Upwork)
• Marketing: $500-1000 to test what works
• Emergency buffer: $1000
TOTAL: $2000-3000 for a solid launch

Where does your budget land? Let's plan for what you've got.`,
        quickActions: [
          { text: '💰 Bootstrap Plan', action: 'bootstrap_plan' },
          { text: '💸 Comfortable Start', action: 'comfortable_start' },
          { text: '🎯 Free Options First', action: 'free_alternatives' }
        ],
        confidence: 0.9,
        sources: ['Bootstrap Business Guide']
      };
    }

    // Default general advice
    const content = `I'm here to help you succeed in your business journey! Based on your question, here's my guidance:

Let me provide you with actionable insights tailored to your specific situation. To give you the most relevant advice, I'd like to understand:

🎯 **Your Business Focus:**
• What industry or market are you considering?
• What stage is your business in (idea, planning, launch, growth)?
• What specific challenges are you facing?

📈 **Common Success Factors:**
• Clear value proposition and target market definition
• Solid financial planning and cash flow management
• Strong marketing and customer acquisition strategy
• Operational efficiency and scalability planning

💡 **Quick Wins:**
• Validate your business idea with potential customers
• Create detailed financial projections
• Research your competition thoroughly
• Build a strong online presence

What specific aspect of your business would you like to focus on first?`;

    return {
      content,
      quickActions: [
        { text: '💡 Validate Business Idea', action: 'validate_business_idea' },
        { text: '📊 Create Business Plan', action: 'create_business_plan' },
        { text: '💰 Financial Planning', action: 'financial_planning' },
        { text: '🎯 Marketing Strategy', action: 'marketing_strategy' }
      ],
      confidence: 0.75,
      sources: ['Business Planning Guidelines', 'Entrepreneurship Best Practices']
    };
  };

  // Enhanced message sending function with NLU, personalization, and chatAnalytics
  const sendMessage = useCallback(async (content: string, messageAttachments: File[] = []) => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatbot.ts:1698',message:'sendMessage entry',data:{contentLength:content.length,isProcessing:conversationState.isProcessing,enableStreaming,wizardModeEnabled:config.wizardMode?.enabled,sessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log('🎬 sendMessage called:', { 
      content: content.substring(0, 50), 
      isProcessing: conversationState.isProcessing,
      enableStreaming,
      wizardModeEnabled: config.wizardMode?.enabled 
    });
    
    if (!content.trim() || conversationState.isProcessing) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatbot.ts:1706',message:'sendMessage blocked',data:{hasContent:!!content.trim(),isProcessing:conversationState.isProcessing},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('❌ Blocked: content empty or already processing');
      return;
    }

    // Auto-create session if user is authenticated and no session exists
    const { data: { user } } = await supabase.auth.getUser();
    const sessionMgmt = config.sessionManagement;
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatbot.ts:1713',message:'session check before send',data:{hasUser:!!user,hasSessionMgmt:!!sessionMgmt,currentSessionId:sessionMgmt?.currentSessionId,sessionCreationAttempted:sessionCreationAttempted.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (user && sessionMgmt && !sessionMgmt.currentSessionId && !sessionCreationAttempted.current) {
      // Check if this is the first user message (not counting welcome/bot messages)
      const userMessages = messages.filter(msg => !msg.isBot);
      if (userMessages.length === 0) {
        sessionCreationAttempted.current = true; // Mark as attempted to prevent duplicates
        console.log('🆕 Auto-creating chat session for first user interaction');
        
        // Generate title from first message (max 50 chars)
        const title = content.trim().length > 50 
          ? content.trim().substring(0, 47) + '...'
          : content.trim() || 'New Business Idea';
        
        try {
          const newSessionId = await sessionMgmt.createNewSession(title);
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatbot.ts:1728',message:'session creation result',data:{newSessionId,success:!!newSessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          if (newSessionId) {
            sessionMgmt.setCurrentSessionId(newSessionId);
            console.log('✅ Chat session created:', newSessionId);
            
            // Update session with initial wizard state if in wizard mode
            if (config.wizardMode?.enabled) {
              await sessionMgmt.updateSession(newSessionId, {
                current_step: config.wizardMode.currentStep || 0,
                answers: config.wizardMode.answers || {}
              });
            }
          } else {
            // Reset flag if creation failed so we can try again
            sessionCreationAttempted.current = false;
          }
        } catch (error) {
          console.error('Error auto-creating session:', error);
          // Reset flag on error so we can try again
          sessionCreationAttempted.current = false;
        }
      }
    }

    // Track user interaction
    trackUserInteraction({ 
      type: 'question_asked', 
      data: { question: content } 
    });

    // Create user message
    const userMessage: ChatMessage = {
      id: generateId(),
      content: content.trim(),
      isBot: false,
      timestamp: new Date()
    };

      setMessages(prev => [...prev, userMessage]);
      // Also update messagesByMode to keep it in sync
      setMessagesByMode(prev => ({
        ...prev,
        [chatMode]: [...(prev[chatMode] || []), userMessage]
      }));
    dispatch({ type: 'ADD_MESSAGE' });

    // Handle wizard mode with AI-enhanced responses
    if (config.wizardMode?.enabled && config.wizardMode.steps) {
      console.log('🧙 Wizard mode active, processing step:', wizardStep);
      const currentStepData = config.wizardMode.steps[wizardStep];
      if (currentStepData) {
        // Save the answer
        const newAnswers = { ...wizardAnswers, [currentStepData.key]: content.trim() };
        setWizardAnswers(newAnswers);
        
        // Show typing indicator for AI response
        simulateTyping();
        
        try {
          // Get user ID
          const { data: { user } } = await supabase.auth.getUser();
          const userId = user?.id || null;
          
          // Prepare conversation history (optimized - only last 5 messages)
          const conversationHistory = messages
            .filter(msg => msg.id !== 'streaming')
            .slice(-5)
            .map(msg => ({
              role: msg.isBot ? 'assistant' as const : 'user' as const,
              content: msg.content
            }));
          
          // Add placeholder streaming message
          const streamingMsg: ChatMessage = {
            id: 'streaming',
            content: '',
            isBot: true,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, streamingMsg]);
        // Also update messagesByMode to keep it in sync
        setMessagesByMode(prev => ({
          ...prev,
          [chatMode]: [...(prev[chatMode] || []), streamingMsg]
        }));
          setIsTyping(false);
          setIsStreaming(true);
          
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatbot.ts:1816',message:'calling streamChat wizard mode',data:{sessionId,historyLength:conversationHistory.length,wizardStep,chatMode,hasSessionId:!!sessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          console.log('📞 Calling streamChat function with:', {
            sessionId,
            historyLength: conversationHistory.length,
            wizardStep,
            chatMode
          });
          
          // Stream AI response with full wizard context
          await streamChat(
            content,
            sessionId,
            conversationHistory,
            conversationState.businessContext,
            userId,
            {
              enabled: true,
              steps: config.wizardMode.steps,
              currentStep: wizardStep,
              answers: newAnswers
            },
            wizardStep,
            chatMode,
            messageAttachments,
            (chunk) => {
              // #region agent log
              fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatbot.ts:1839',message:'streamChat chunk received',data:{chunkLength:chunk.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              setStreamingMessage(prev => prev + chunk);
            },
            (fullMessage, quickActions, sources) => {
              // #region agent log
              fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatbot.ts:1840',message:'streamChat complete',data:{fullMessageLength:fullMessage.length,hasQuickActions:!!quickActions,hasSources:!!sources},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              // Replace streaming message with final message and add quick actions
              setMessages(prev => {
                const updated = prev.map(msg => 
                  msg.id === 'streaming' 
                    ? { 
                        ...msg, 
                        id: generateId(), 
                        content: fullMessage,
                        quickActions: quickActions?.map(qa => ({ text: qa.text, id: qa.id, action: qa.text })),
                        sources: sources?.map((s: any) => s.url || s.title) || [],
                        sourceMetadata: sources
                      }
                    : msg
                );
                // Also update messagesByMode to keep it in sync
                setMessagesByMode(prevMode => ({
                  ...prevMode,
                  [chatMode]: updated
                }));
                return updated;
              });
              setStreamingMessage('');
              setIsStreaming(false);
            },
            (sources) => {
              // Handle sources as they arrive
            }
          );
          
          // Notify parent of step completion
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useChatbot.ts:1871',message:'wizard step completion',data:{wizardStep,nextStep:wizardStep+1,totalSteps:config.wizardMode.steps.length,willComplete:wizardStep+1>=config.wizardMode.steps.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          config.wizardMode.onStepComplete?.(wizardStep, content.trim());
          
          // Move to next step
          setWizardStep(wizardStep + 1);
          
          // Check if wizard complete
          if (wizardStep + 1 >= config.wizardMode.steps.length) {
            config.wizardMode.onWizardComplete?.(newAnswers);
          }
          
        } catch (error) {
          console.error('Wizard mode streaming error:', error);
          handleError(error instanceof Error ? error : new Error('Unknown wizard error'));
        }
        
        return;
      }
    }

    // Show typing indicator
    simulateTyping();

    try {
      // Get user ID for database tracking
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      // Use streaming if enabled
      if (enableStreaming) {
        // Add placeholder streaming message
        const streamingMsg: ChatMessage = {
          id: 'streaming',
          content: '',
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, streamingMsg]);
        // Also update messagesByMode to keep it in sync
        setMessagesByMode(prev => ({
          ...prev,
          [chatMode]: [...(prev[chatMode] || []), streamingMsg]
        }));
        setIsTyping(false); // Remove typing indicator when streaming starts

        // 🚀 OPTIMIZATION: Prepare conversation history for API (reduced from 5 to 6 for better context, but still optimized)
        // Smart selection: prioritize important messages (bot responses with insights, user questions)
        const importantMessages = messages
          .filter(msg => msg.id !== 'streaming')
          .map((msg, idx) => ({
            msg,
            importance: msg.isBot && msg.content.length > 100 ? 2 : 
                       !msg.isBot ? 1 : 0,
            recency: idx
          }))
          .sort((a, b) => {
            // Sort by importance first, then recency
            if (a.importance !== b.importance) return b.importance - a.importance;
            return b.recency - a.recency;
          })
          .slice(0, 6) // Take top 6 most important/recent
          .sort((a, b) => a.recency - b.recency) // Restore chronological order
          .map(item => item.msg);
        
        const conversationHistory = importantMessages.map(msg => ({
          role: msg.isBot ? 'assistant' as const : 'user' as const,
          content: msg.content
        }));

        // Start streaming
        setIsStreaming(true);
        await streamChat(
          content,
          sessionId,
          conversationHistory,
          conversationState.businessContext,
          userId,
          config.wizardMode,
          config.wizardMode?.currentStep || wizardStep,
          chatMode,
          messageAttachments,
          (chunk) => setStreamingMessage(prev => prev + chunk),
          (fullMessage, quickActions, sources) => {
            // Replace streaming message with final message and add quick actions
            setMessages(prev => {
              const updated = prev.map(msg => 
                msg.id === 'streaming' 
                  ? { 
                      ...msg, 
                      id: generateId(), 
                      content: fullMessage,
                      quickActions: quickActions?.map(qa => ({ text: qa.text, id: qa.id, action: qa.text })),
                      sources: sources?.map((s: any) => s.url || s.title) || [],
                      sourceMetadata: sources
                    }
                  : msg
              );
              // Also update messagesByMode to keep it in sync
              setMessagesByMode(prevMode => ({
                ...prevMode,
                [chatMode]: updated
              }));
              return updated;
            });
            setStreamingMessage('');
            setIsStreaming(false);
          },
          (sources) => {
            // Handle sources as they arrive (for UI updates)
            // Sources are already handled in onComplete
          }
        );

      } else {
        // Fallback to non-streaming response
        let aiResponse;
        let nluResult: NLUResult | null = null;

        // Process with NLU if enabled
        if (config.enableNLU) {
          nluResult = await nlu.processMessage(content);

          // Handle fallback scenarios
          if (nluResult.fallbackRequired) {
            aiResponse = await handleFallbackResponse(content, nluResult);
          } else if (nluResult.clarificationNeeded) {
            aiResponse = await handleClarificationResponse(content, nluResult);
          } else {
            aiResponse = await generateAIResponse(content, nluResult);
          }
        } else {
          // Fallback to original response generation
          aiResponse = await generateAIResponse(content);
        }

        // Create bot response message
        const botMessage: ChatMessage = {
          id: generateId(),
          content: aiResponse.content,
          isBot: true,
          timestamp: new Date(),
          quickActions: aiResponse.quickActions,
          messageType: aiResponse.messageType || 'text',
          confidence: aiResponse.confidence,
          sources: aiResponse.sources
        };

        setMessages(prev => [...prev, botMessage]);
        // Also update messagesByMode to keep it in sync
        setMessagesByMode(prev => ({
          ...prev,
          [chatMode]: [...(prev[chatMode] || []), botMessage]
        }));

        // Update conversation memory if provided
        if (aiResponse.memoryUpdate) {
          dispatch({ type: 'UPDATE_MEMORY', payload: aiResponse.memoryUpdate });
        }

        // Update business context if provided
        if (aiResponse.contextUpdate) {
          updateConversationState({
            businessContext: { ...conversationState.businessContext, ...aiResponse.contextUpdate }
          });
        }

        // Update conversation flow if provided
        if (aiResponse.conversationFlowUpdate) {
          dispatch({ type: 'UPDATE_FLOW', payload: aiResponse.conversationFlowUpdate });
        }

        // Clear any previous errors
        clearError();
      }

    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Enhanced error handling with retry options
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: conversationState.retryCount > 0 
          ? `I'm still having trouble processing your request. ${conversationState.retryCount < 3 ? 'Let me try a different approach...' : 'Please try rephrasing your question or contact support.'}`
          : "I apologize, but I'm experiencing some technical difficulties. Please try rephrasing your question or contact our support team if the issue persists.",
        isBot: true,
        timestamp: new Date(),
        quickActions: conversationState.retryCount < 3 ? [
          { text: '🔄 Try Again', action: 'retry_message' },
          { text: '📝 Rephrase Question', action: 'rephrase_question' },
          { text: '📞 Contact Support', action: 'contact_support' }
        ] : [
          { text: '📞 Contact Support', action: 'contact_support' },
          { text: '❓ Get Help', action: 'show_help' },
          { text: '🔄 Start Over', action: 'restart_conversation' }
        ]
      };

      setMessages(prev => [...prev, errorMessage]);
      // Also update messagesByMode to keep it in sync
      setMessagesByMode(prev => ({
        ...prev,
        [chatMode]: [...(prev[chatMode] || []), errorMessage]
      }));
      handleError(error as Error, true);
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  }, [conversationState, trackUserInteraction, generateAIResponse, updateConversationState, clearError, handleError, config, nlu, chatAnalytics, sessionId, messages, wizardStep, wizardAnswers, chatMode, enableStreaming]);

  // Handle quick action clicks - Compatible with ChatbotWidget expectations
  const handleQuickAction = useCallback(async (action: string, href?: string) => {
    // Handle navigation actions
    if (action === 'navigate' && href) {
      navigate(href);
      return;
    }

    if (action === 'contact_support') {
      navigate('/contact');
      return;
    }

    if (action === 'show_help') {
      navigate('/faq');
      return;
    }

    // Handle FAQ actions
    if (action === 'faq' && href) {
      const faqItem = chatbotFAQ.find(item => item.id === href);
      if (faqItem) {
        await sendMessage(faqItem.question);
        return;
      }
    }

    // Handle conversation actions
    switch (action) {
      case 'start_new_plan':
        updateConversationState({ context: ConversationContext.BUSINESS_CONCEPT });
        await sendMessage("I'd like to start creating a comprehensive business plan from scratch.");
        break;
      
      case 'continue_plan':
        await sendMessage("I want to continue working on my existing business plan. What section should we focus on?");
        break;
      
      case 'financial_planning':
      case 'financial_model':
      case 'build_financial_model':
        updateConversationState({ context: ConversationContext.FINANCIAL_PLANNING });
        await sendMessage("I need help with financial planning and projections for my business.");
        break;
      
      case 'market_research':
      case 'market_analysis':
        updateConversationState({ context: ConversationContext.MARKET_RESEARCH });
        await sendMessage("I want to conduct thorough market research for my business idea.");
        break;
      
      case 'validate_idea':
      case 'validate_business_idea':
        updateConversationState({ context: ConversationContext.BUSINESS_CONCEPT });
        await sendMessage("How can I validate my business idea to ensure there's market demand?");
        break;
      
      case 'restart_conversation':
        clearConversation();
        break;
      
      default:
        // For any other action, send it as a message
        const actionText = action.replace(/_/g, ' ');
        await sendMessage(`Help me with ${actionText}`);
    }
  }, [sendMessage, navigate]);

  // Enhanced clear conversation function with chatAnalytics reset
  const clearChat = useCallback(() => {
    setMessages([]);
    setMessagesByMode(prev => ({
      ...prev,
      [chatMode]: []
    }));
    dispatch({ 
      type: 'UPDATE_STATE', 
      payload: {
        context: ConversationContext.WELCOME,
        businessContext: {},
        sessionDuration: 0,
        messageCount: 0,
        errorCount: 0,
        retryCount: 0,
        isProcessing: false,
        conversationMemory: {
          userPreferences: {},
          previousTopics: [],
          importantDetails: {},
          userGoals: [],
          painPoints: [],
          lastInteractionTime: new Date()
        }
      }
    });
    sessionStartTime.current = Date.now();
    responseTimeTracker.current = [];
    
    // Reset chatAnalytics for new session
    setChatAnalytics({
      totalMessages: 0,
      averageResponseTime: 0,
      userSatisfactionScore: 0,
      mostAskedQuestions: [],
      conversationCompletionRate: 0,
      errorRate: 0,
      popularTopics: [],
      sessionDuration: 0
    });
    
    // Clear any pending timeouts
    if (retryTimeout.current) {
      clearTimeout(retryTimeout.current);
      retryTimeout.current = null;
    }
    
    // Re-initialize with welcome message
    setTimeout(() => {
      const welcomeMessage = createWelcomeMessage();
      setMessages([welcomeMessage]);
      setMessagesByMode(prev => ({
        ...prev,
        [chatMode]: [welcomeMessage]
      }));
    }, 100);
  }, [chatMode]);

  const clearConversation = clearChat;

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Enhanced export conversation data with chatAnalytics
  const exportConversation = useCallback(() => {
    const exportData = {
      conversation: messages.map(msg => ({
        content: msg.content,
        isBot: msg.isBot,
        timestamp: msg.timestamp,
        messageType: msg.messageType,
        confidence: msg.confidence,
        sources: msg.sources
      })),
      businessContext: conversationState.businessContext,
      conversationMemory: conversationState.conversationMemory,
      conversationFlow: conversationState.conversationFlow,
      chatAnalytics: chatAnalytics,
      sessionDuration: conversationState.sessionDuration,
      messageCount: conversationState.messageCount,
      errorCount: conversationState.errorCount,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-planning-session-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages, conversationState, chatAnalytics]);

  // Rate conversation satisfaction
  const rateSatisfaction = useCallback((score: number) => {
    trackUserInteraction({ 
      type: 'satisfaction_rated', 
      data: { score } 
    });
    
    setChatAnalytics(prev => ({
      ...prev,
      userSatisfactionScore: score
    }));
  }, [trackUserInteraction]);

  // Get conversation insights
  const getConversationInsights = useCallback(() => {
    return {
      totalMessages: conversationState.messageCount,
      sessionDuration: conversationState.sessionDuration,
      errorRate: chatAnalytics.errorRate,
      averageResponseTime: chatAnalytics.averageResponseTime,
      userSatisfaction: chatAnalytics.userSatisfactionScore,
      popularTopics: conversationState.conversationMemory.previousTopics,
      businessContext: conversationState.businessContext,
      conversationFlow: conversationState.conversationFlow,
      isProcessing: conversationState.isProcessing,
      hasErrors: conversationState.errorCount > 0,
      lastError: conversationState.lastError
    };
  }, [conversationState, chatAnalytics]);

  // Save conversation to backend
  const saveConversation = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('chatbot_conversations')
        .insert([{
          session_id: sessionId,
          user_id: user?.id || null,
          business_context: conversationState.businessContext as any
        }]);

      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error saving conversation:', error);
      return { success: false, error: (error as any).message };
    }
  }, [sessionId, conversationState]);

  // Trigger feedback at wizard milestones
  useEffect(() => {
    if (config.wizardMode?.enabled && wizardStep > 0) {
      // Trigger feedback at steps 2, 4, and 6
      if (wizardStep === 2 || wizardStep === 4 || wizardStep === 6) {
        const timer = setTimeout(() => {
          triggerFeedbackCheckIn();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [wizardStep, config.wizardMode?.enabled]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  // Enhanced return interface with new functionality
  return {
    // Core ChatbotWidget compatibility
    isOpen,
    setIsOpen,
    messages,
    isTyping,
    sendMessage,
    handleQuickAction,
    clearChat,
    toggleChat,
    
    // Streaming properties
    streamingMessage,
    isStreaming,
    cancelStreaming,
    
    // Attachments
    attachments,
    setAttachments,
    
    // Wizard mode properties
    wizardMode: config.wizardMode?.enabled ? {
      currentStep: wizardStep,
      totalSteps: config.wizardMode.steps.length,
      answers: wizardAnswers,
      setWizardStep,
      isComplete: wizardStep >= (config.wizardMode.steps.length || 0)
    } : null,
    
    // Enhanced business planning features
    conversationState,
    businessContext: conversationState.businessContext,
    currentContext: conversationState.context,
    sessionDuration: conversationState.sessionDuration,
    messageCount: conversationState.messageCount,
    
    // New enhanced features
    chatAnalytics: chatAnalytics,
    conversationMemory: conversationState.conversationMemory,
    conversationFlow: conversationState.conversationFlow,
    isProcessing: conversationState.isProcessing,
    errorCount: conversationState.errorCount,
    lastError: conversationState.lastError,
    retryCount: conversationState.retryCount,
    
    // Action handlers
    clearConversation,
    exportConversation,
    rateSatisfaction,
    getConversationInsights,
    saveConversation,
    clearError,
    
    // Utility functions
    updateConversationState,
    businessPlanSections,
    trackUserInteraction,
    
    // Quick access to business insights
    getBusinessInsight: (industry: string) => businessInsights[industry as keyof typeof businessInsights],
    
    // Session management
    sessionId,
    sessionStartTime: sessionStartTime.current,
    
    // Error handling
    hasErrors: conversationState.errorCount > 0,
    canRetry: conversationState.retryCount < 3,
    
    // Enhanced features
    nlu: config.enableNLU ? {
      processMessage: nlu.processMessage,
      getIntentSuggestions: nlu.getIntentSuggestions
    } : null,
    
    // Phase 3: Feedback collection
    collectFeedback,
    rateSectionCompletion,
    showFeedbackPrompt,
    setShowFeedbackPrompt,
    sectionCompletionFeedback,
    
    // Configuration
    config,
    
    // Socratic Logic Engine
    socraticEngine,
    socraticContext,
    generateSocraticQuickActions,
    
    // Chat mode control
    chatMode,
    switchToFreeform: useCallback(() => {
      setChatMode('freeform');
      // Add a system message about the mode switch
      const switchMessage: ChatMessage = {
        id: generateId(),
        content: "✨ You're now in **Ask Me Anything** mode! I remember your business context and can help you with anything related to your venture. What's on your mind?",
        isBot: true,
        timestamp: new Date(),
        messageType: 'recommendation',
        confidence: 1.0
      };
      setMessages(prev => [...prev, switchMessage]);
      // Also update messagesByMode to keep it in sync
      setMessagesByMode(prev => ({
        ...prev,
        [chatMode]: [...(prev[chatMode] || []), switchMessage]
      }));
    }, []),
    
    // Conversion tracking
    conversionPromptShown,
    conversionPromptDismissed,
    wizardStepWhenPrompted,
    trackConversionEvent: useCallback((event: 'shown' | 'dismissed' | 'converted', step: number) => {
      if (event === 'shown') {
        setConversionPromptShown(true);
        setWizardStepWhenPrompted(step);
      } else if (event === 'dismissed') {
        setConversionPromptDismissed(true);
      }
      
      // Track in analytics
      trackUserInteraction({
        type: 'quick_action_clicked',
        data: { conversionEvent: event, step }
      });
    }, []),
    switchToWizard: useCallback(() => {
      setChatMode('wizard');
    }, []),
    switchToPlanningMode: useCallback(() => {
      const newMode: 'wizard' = 'wizard';
      // Save current mode's messages before switching
      setMessagesByMode(prev => ({
        ...prev,
        [chatMode]: messages
      }));
      // Switch to Planning mode
      setChatMode(newMode);
      // Load Planning conversation
      const planningMessages = messagesByMode[newMode] || [];
      if (planningMessages.length === 0) {
        // Initialize with first wizard question if available
        if (config.wizardMode?.enabled && config.wizardMode.steps.length > 0) {
          const firstMessage: ChatMessage = {
            id: generateId(),
            content: config.wizardMode.steps[0].question,
            isBot: true,
            timestamp: new Date()
          };
          setMessages([firstMessage]);
          setMessagesByMode(prev => ({
            ...prev,
            [newMode]: [firstMessage]
          }));
        }
      } else {
        setMessages(planningMessages);
      }
    }, [chatMode, messages, messagesByMode, config.wizardMode]),
    
    // Session ID for document uploads
    sessionId
  };
};