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

  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const updateConversationState = (updates: Partial<ConversationState>) => {
    setConversationState(prev => ({ ...prev, ...updates }));
  };

  const getContextualWelcomeMessage = useCallback((): ChatMessage => {
    const path = currentPath || '/';
    let content = "👋 Hi! I'm your AI business planning assistant.";
    let quickActions: QuickAction[] = [];

    if (path.includes('/dream2plan')) {
      content += " I see you're ready to turn your dream into a plan! Let's start by understanding your business concept and goals.";
      quickActions = [
        { id: '1', text: 'Start business concept', action: 'start_business_concept', type: 'primary', icon: '💡' },
        { id: '2', text: 'Market research', action: 'start_market_research', type: 'secondary', icon: '🔍' },
        { id: '3', text: 'Financial planning', action: 'start_financial_planning', type: 'info', icon: '💰' }
      ];
    } else if (path.includes('/business-plan')) {
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
  }, [getContextualWelcomeMessage]);

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

  const simulateTyping = (duration: number = 1500) => {
    setIsTyping(true);
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
    }, duration);
  };

  // Advanced AI response generation
  const generateAIResponse = async (userMessage: string, context: ConversationContext): Promise<AIResponse> => {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    const businessContext = conversationState.businessContext;
    let response: AIResponse;

    // Context-aware response generation
    switch (context) {
      case ConversationContext.BUSINESS_CONCEPT:
        response = await generateBusinessConceptResponse(userMessage, businessContext);
        break;
      case ConversationContext.MARKET_RESEARCH:
        response = await generateMarketResearchResponse(userMessage, businessContext);
        break;
      case ConversationContext.FINANCIAL_PLANNING:
        response = await generateFinancialPlanningResponse(userMessage, businessContext);
        break;
      default:
        response = await generateGeneralResponse(userMessage, context, businessContext);
    }

    // Add contextual quick actions
    if (!response.quickActions) {
      response.quickActions = generateContextualQuickActions(context, businessContext);
    }

    // Add metadata
    response.metadata = {
      confidence: 0.85 + Math.random() * 0.15,
      sources: ['Business Planning Best Practices', 'Market Research Data', 'Financial Modeling Guidelines'],
      suggestedFollowUps: generateFollowUpQuestions(context, userMessage),
      estimatedReadTime: Math.ceil(response.content.length / 200) // 200 words per minute
    };

    return response;
  };

  const generateBusinessConceptResponse = async (message: string, context: BusinessContext): Promise<AIResponse> => {
    // Extract business information from user message
    const extractedInfo = extractBusinessInfo(message);
    
    if (extractedInfo.industry) {
      const industryInsights = await getIndustryInsights(extractedInfo.industry);
      return {
        content: `Great! I understand you're interested in the ${extractedInfo.industry} industry. ${industryInsights} 

Based on current market trends, here are some key considerations for your business concept:

• **Market Opportunity**: The ${extractedInfo.industry} sector shows strong growth potential
• **Key Success Factors**: Focus on customer experience, digital presence, and operational efficiency
• **Common Challenges**: Competition, regulatory compliance, and scaling operations

What specific problem are you looking to solve in this space?`,
        type: MessageType.RECOMMENDATION,
        contextUpdate: { industry: extractedInfo.industry, stage: 'planning' },
        quickActions: [
          { id: '1', text: 'Analyze competition', action: 'analyze_competition', type: 'primary', icon: '🔍' },
          { id: '2', text: 'Define target market', action: 'define_target_market', type: 'secondary', icon: '🎯' },
          { id: '3', text: 'Create value proposition', action: 'create_value_prop', type: 'info', icon: '💎' }
        ]
      };
    }

    return {
      content: `I'd love to learn more about your business idea! To provide you with the most relevant guidance, could you tell me:

• What industry or market are you considering?
• What specific problem does your business solve?
• Who would be your ideal customers?

The more details you share, the better I can help you develop a comprehensive business plan.`,
      type: MessageType.TEXT
    };
  };

  const generateMarketResearchResponse = async (message: string, context: BusinessContext): Promise<AIResponse> => {
    return {
      content: `Excellent! Market research is crucial for business success. Let me help you analyze your market opportunity.

**Market Analysis Framework:**

1. **Total Addressable Market (TAM)**: The total demand for your product/service
2. **Serviceable Addressable Market (SAM)**: The portion you could realistically serve
3. **Serviceable Obtainable Market (SOM)**: Your realistic market share

**Competitive Analysis:**
I recommend identifying 3-5 direct competitors and analyzing their:
• Pricing strategies
• Marketing approaches
• Strengths and weaknesses
• Customer reviews and feedback

Would you like me to help you research specific competitors or calculate your market size?`,
      type: MessageType.MARKET_ANALYSIS,
      quickActions: [
        { id: '1', text: 'Find competitors', action: 'find_competitors', type: 'primary', icon: '🏢' },
        { id: '2', text: 'Calculate market size', action: 'calculate_market_size', type: 'secondary', icon: '📊' },
        { id: '3', text: 'Create customer personas', action: 'create_personas', type: 'info', icon: '👥' }
      ]
    };
  };

  const generateFinancialPlanningResponse = async (message: string, context: BusinessContext): Promise<AIResponse> => {
    return {
      content: `Let's build your financial projections! A solid financial plan includes:

**Revenue Projections:**
• Monthly/annual revenue forecasts
• Revenue streams and pricing models
• Growth assumptions and seasonality

**Expense Categories:**
• Fixed costs (rent, insurance, salaries)
• Variable costs (materials, commissions)
• One-time startup costs

**Key Financial Metrics:**
• Break-even analysis
• Cash flow projections
• Profit & loss statements
• Return on investment (ROI)

I can help you create a detailed financial model. What's your expected monthly revenue in the first year?`,
      type: MessageType.FINANCIAL_PROJECTION,
      quickActions: [
        { id: '1', text: 'Build financial model', action: 'build_financial_model', type: 'primary', icon: '🧮' },
        { id: '2', text: 'Calculate startup costs', action: 'calculate_startup_costs', type: 'secondary', icon: '💰' },
        { id: '3', text: 'Explore funding options', action: 'explore_funding', type: 'info', icon: '🏦' }
      ]
    };
  };

  const generateGeneralResponse = async (message: string, context: ConversationContext, businessContext: BusinessContext): Promise<AIResponse> => {
    // Search FAQ first
    const contextualFAQs = getContextualFAQ(currentPath || '/');
    const faqResults = FAQUtils.sortByRelevance([...contextualFAQs, ...chatbotFAQ], message);
    
    if (faqResults.length > 0 && faqResults[0].relevanceScore > 5) {
      const topResult = faqResults[0];
      return {
        content: topResult.answer,
        type: MessageType.TEXT,
        quickActions: topResult.quickActions?.map(action => ({
          ...action,
          id: generateId(),
          type: 'info' as const
        }))
      };
    }

    // Generate contextual business advice
    return {
      content: `I understand you're looking for guidance on "${message}". Based on your business planning journey, here's what I recommend:

Let me help you break this down into actionable steps. Could you provide more specific details about what you're trying to accomplish?

In the meantime, here are some resources that might help:`,
      type: MessageType.TEXT,
      quickActions: [
        { id: '1', text: 'Get specific advice', action: 'get_specific_advice', type: 'primary', icon: '🎯' },
        { id: '2', text: 'Browse resources', action: 'browse_resources', type: 'secondary', icon: '📚' },
        { id: '3', text: 'Schedule consultation', action: 'schedule_consultation', type: 'info', icon: '📅' }
      ]
    };
  };

  const generateContextualQuickActions = (context: ConversationContext, businessContext: BusinessContext): QuickAction[] => {
    const baseActions: QuickAction[] = [
      { id: 'help', text: 'Get help', action: 'show_help', type: 'info', icon: '❓' },
      { id: 'restart', text: 'Start over', action: 'restart_conversation', type: 'secondary', icon: '🔄' }
    ];

    switch (context) {
      case ConversationContext.BUSINESS_CONCEPT:
        return [
          { id: '1', text: 'Validate idea', action: 'validate_idea', type: 'primary', icon: '✅' },
          { id: '2', text: 'Research market', action: 'research_market', type: 'secondary', icon: '🔍' },
          ...baseActions
        ];
      case ConversationContext.FINANCIAL_PLANNING:
        return [
          { id: '1', text: 'Create projections', action: 'create_projections', type: 'primary', icon: '📈' },
          { id: '2', text: 'Find funding', action: 'find_funding', type: 'secondary', icon: '💼' },
          ...baseActions
        ];
      default:
        return [
          { id: '1', text: 'Continue planning', action: 'continue_planning', type: 'primary', icon: '▶️' },
          ...baseActions
        ];
    }
  };

  const generateFollowUpQuestions = (context: ConversationContext, userMessage: string): string[] => {
    const contextQuestions = businessPlanningPrompts[context]?.questions || [];
    return contextQuestions.slice(0, 3);
  };

  const extractBusinessInfo = (message: string): Partial<BusinessContext> => {
    const info: Partial<BusinessContext> = {};
    const lowerMessage = message.toLowerCase();

    // Extract industry
    const industries = ['technology', 'healthcare', 'retail', 'food', 'education', 'finance', 'manufacturing', 'consulting', 'ecommerce', 'saas', 'fintech'];
    for (const industry of industries) {
      if (lowerMessage.includes(industry)) {
        info.industry = industry;
        break;
      }
    }

    // Extract business type
    if (lowerMessage.includes('startup') || lowerMessage.includes('new business')) {
      info.businessType = 'startup';
    } else if (lowerMessage.includes('existing')) {
      info.businessType = 'existing';
    }

    // Extract stage
    if (lowerMessage.includes('idea') || lowerMessage.includes('concept')) {
      info.stage = 'idea';
    } else if (lowerMessage.includes('planning')) {
      info.stage = 'planning';
    } else if (lowerMessage.includes('launch') || lowerMessage.includes('starting')) {
      info.stage = 'launch';
    }

    return info;
  };

  const getIndustryInsights = async (industry: string): Promise<string> => {
    const insights = {
      'technology': 'The tech industry continues to grow rapidly with AI, cloud computing, and cybersecurity leading the way.',
      'healthcare': 'Healthcare innovation focuses on telemedicine, personalized medicine, and health tech solutions.',
      'retail': 'E-commerce and omnichannel experiences are reshaping retail with emphasis on customer experience.',
      'food': 'The food industry is embracing sustainability, plant-based alternatives, and food delivery innovations.',
      'education': 'EdTech is transforming learning with personalized platforms, online courses, and skill-based training.',
      'finance': 'FinTech is revolutionizing banking with digital payments, robo-advisors, and blockchain technology.',
      'manufacturing': 'Industry 4.0 is driving automation, IoT integration, and sustainable production methods.',
      'consulting': 'Consulting services are evolving with specialized expertise, digital transformation, and remote delivery.',
      'ecommerce': 'E-commerce growth continues with social commerce, mobile shopping, and direct-to-consumer brands.',
      'saas': 'Software-as-a-Service markets show strong growth with focus on user experience and integration.',
      'fintech': 'Financial technology is expanding rapidly with digital banking, payments, and investment platforms.',
      'default': 'This industry offers significant opportunities for innovation and growth.'
    };

    return insights[industry as keyof typeof insights] || insights.default;
  };

  const sendMessage = useCallback(async (content: string, isQuickAction = false) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      content,
      isBot: false,
      timestamp: new Date(),
      type: MessageType.TEXT,
      context: conversationState.context
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Update conversation state
    updateConversationState({
      messageCount: conversationState.messageCount + 1
    });

    // Show typing indicator
    simulateTyping();

    try {
      // Generate AI response
      const aiResponse = await generateAIResponse(content, conversationState.context);
      
      // Create bot message
      const botMessage: ChatMessage = {
        id: generateId(),
        content: aiResponse.content,
        isBot: true,
        timestamp: new Date(),
        type: aiResponse.type,
        context: conversationState.context,
        quickActions: aiResponse.quickActions,
        metadata: aiResponse.metadata
      };

      setMessages(prev => [...prev, botMessage]);

      // Update business context if needed
      if (aiResponse.contextUpdate) {
        setConversationState(prev => ({
          ...prev,
          businessContext: { ...prev.businessContext, ...aiResponse.contextUpdate }
        }));
      }

      // Store in conversation history
      conversationHistory.current = [...conversationHistory.current, userMessage, botMessage];

    } catch (error) {
      console.error('Error generating AI response:', error);
      
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: "I apologize, but I'm having trouble processing your request right now. Please try again or contact support if the issue persists.",
        isBot: true,
        timestamp: new Date(),
        type: MessageType.TEXT,
        quickActions: [
          { id: '1', text: 'Try again', action: 'retry', type: 'primary', icon: '🔄' },
          { id: '2', text: 'Contact support', action: 'contact_support', type: 'secondary', icon: '📞' }
        ]
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [conversationState]);

  const handleQuickAction = useCallback(async (action: string, payload?: Record<string, unknown> | string) => {
    switch (action) {
      case 'start_business_concept':
      case 'start_business_plan':
        updateConversationState({ context: ConversationContext.BUSINESS_CONCEPT });
        await sendMessage("I'd like to start developing my business concept", true);
        break;
      case 'start_market_research':
        updateConversationState({ context: ConversationContext.MARKET_RESEARCH });
        await sendMessage("I want to conduct market research for my business", true);
        break;
      case 'start_financial_planning':
        updateConversationState({ context: ConversationContext.FINANCIAL_PLANNING });
        await sendMessage("Help me create financial projections", true);
        break;
      case 'get_advice':
        await sendMessage("I need some business advice", true);
        break;
      case 'continue_planning':
        const nextContext = getNextPlanningContext(conversationState.context);
        updateConversationState({ context: nextContext });
        await sendMessage(`Let's continue with ${nextContext.replace('_', ' ')}`, true);
        break;
      case 'restart_conversation':
        clearConversation();
        break;
      case 'contact_support':
        if (navigate) {
          navigate('/contact');
        } else {
          window.location.href = '/contact';
        }
        break;
      case 'navigate':
        if (typeof payload === 'string') {
          if (navigate) {
            navigate(payload);
          } else {
            window.location.href = payload;
          }
        }
        break;
      case 'faq':
        if (typeof payload === 'string') {
          const faqItem = chatbotFAQ.find(item => item.id === payload);
          if (faqItem) {
            await sendMessage(faqItem.question, true);
          }
        }
        break;
      default:
        await sendMessage(action, true);
    }
  }, [conversationState, sendMessage, navigate]);

  const getNextPlanningContext = (current: ConversationContext): ConversationContext => {
    const sequence = [
      ConversationContext.BUSINESS_CONCEPT,
      ConversationContext.MARKET_RESEARCH,
      ConversationContext.FINANCIAL_PLANNING,
      ConversationContext.OPERATIONS,
      ConversationContext.MARKETING_STRATEGY
    ];
    
    const currentIndex = sequence.indexOf(current);
    return sequence[currentIndex + 1] || ConversationContext.GROWTH_PLANNING;
  };

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
    
    // Re-initialize with welcome message
    setTimeout(() => {
      const welcomeMessage = getContextualWelcomeMessage();
      setMessages([welcomeMessage]);
    }, 100);
  }, [getContextualWelcomeMessage]);

  const exportConversation = useCallback(() => {
    const exportData = {
      conversation: messages,
      businessContext: conversationState.businessContext,
      sessionDuration: conversationState.sessionDuration,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-planning-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, conversationState]);

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
    
    // Advanced features
    conversationState,
    businessContext: conversationState.businessContext,
    currentContext: conversationState.context,
    sessionDuration: conversationState.sessionDuration,
    messageCount: conversationState.messageCount,
    exportConversation,
    
    // Utility functions
    generateId,
    updateConversationState
  };
};