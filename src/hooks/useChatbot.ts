import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { chatbotFAQ, getContextualFAQ } from '@/data/chatbotFAQ';
import { FAQItem, FAQUtils } from '@/types/faq';
import { supabase } from '@/integrations/supabase/client';

// Enhanced message types for business planning - Compatible with ChatbotWidget
export interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  quickActions?: Array<{
    text: string;
    action: string;
    href?: string;
  }>;
  // Extended properties for business planning
  messageType?: 'text' | 'business_plan' | 'financial' | 'market_analysis' | 'recommendation';
  businessContext?: string;
  confidence?: number;
  sources?: string[];
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

interface ConversationState {
  context: ConversationContext;
  businessContext: BusinessContext;
  currentTopic?: string;
  sessionDuration: number;
  messageCount: number;
  userSatisfaction?: number;
}

interface AIResponse {
  content: string;
  quickActions?: ChatMessage['quickActions'];
  messageType?: ChatMessage['messageType'];
  confidence?: number;
  sources?: string[];
  contextUpdate?: Partial<BusinessContext>;
  shouldNavigate?: string;
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
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const location = useLocation();
  const navigate = useNavigate();
  const sessionStartTime = useRef(Date.now());
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  // Business planning knowledge base
  const businessInsights = useMemo(() => ({
    technology: {
      trends: 'AI, cloud computing, and cybersecurity are driving growth',
      challenges: 'Rapid technological change, talent acquisition, funding competition',
      opportunities: 'Automation, SaaS solutions, mobile-first applications'
    },
    healthcare: {
      trends: 'Telemedicine, personalized medicine, and health tech solutions',
      challenges: 'Regulatory compliance, data privacy, insurance coverage',
      opportunities: 'Aging population, preventive care, digital health'
    },
    retail: {
      trends: 'E-commerce growth, omnichannel experiences, sustainability',
      challenges: 'Supply chain disruptions, changing consumer behavior',
      opportunities: 'Direct-to-consumer, social commerce, personalization'
    },
    food: {
      trends: 'Plant-based alternatives, food delivery, sustainability',
      challenges: 'Food safety regulations, supply chain complexity',
      opportunities: 'Health-conscious consumers, local sourcing, meal kits'
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
    if (messages.length === 0) {
      const welcomeMessage = createWelcomeMessage();
      setMessages([welcomeMessage]);
      updateConversationState({ context: ConversationContext.WELCOME });
    }
  }, [location.pathname]);

  // Session tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setConversationState(prev => ({
        ...prev,
        sessionDuration: Date.now() - sessionStartTime.current
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const generateId = (): string => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const updateConversationState = (updates: Partial<ConversationState>) => {
    setConversationState(prev => ({ ...prev, ...updates }));
  };

  const createWelcomeMessage = (): ChatMessage => {
    const path = location.pathname;
    let content = "👋 Welcome! I'm your AI Business Planning Assistant.";
    let quickActions: ChatMessage['quickActions'] = [];

    // Contextual welcome based on current page
    if (path.includes('/dream2plan')) {
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

  const simulateTyping = (duration: number = 1200 + Math.random() * 800) => {
    setIsTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
    }, duration);
  };

  // Advanced AI response generation with business expertise
  const generateAIResponse = async (userMessage: string): Promise<AIResponse> => {
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 900));

    const lowerMessage = userMessage.toLowerCase();
    const { context, businessContext } = conversationState;

    // Extract business information from message
    const extractedInfo = extractBusinessInformation(userMessage);
    
    // Check FAQ first for quick answers
    const contextualFAQs = getContextualFAQ(location.pathname);
    const faqResults = FAQUtils.sortByRelevance([...contextualFAQs, ...chatbotFAQ], userMessage);
    if (faqResults.length > 0 && faqResults[0].relevanceScore > 8) {
      return {
        content: faqResults[0].answer,
        quickActions: faqResults[0].quickActions,
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

  // Main message sending function - Compatible with ChatbotWidget
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Create user message
    const userMessage: ChatMessage = {
      id: generateId(),
      content: content.trim(),
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Update conversation state
    updateConversationState({
      messageCount: conversationState.messageCount + 1
    });

    // Show typing indicator
    simulateTyping();

    try {
      // Call the enhanced AI chatbot engine
      const { data, error } = await supabase.functions.invoke('chatbot-ai-engine', {
        body: {
          message: content,
          sessionId,
          conversationHistory: messages.slice(-10).map(msg => ({
            role: msg.isBot ? 'assistant' : 'user',
            content: msg.content
          })),
          businessContext: conversationState.businessContext,
          userId: (await supabase.auth.getUser()).data.user?.id || null
        }
      });

      if (error) {
        console.error('Chatbot AI Engine Error:', error);
        throw new Error(error.message);
      }

      const response = data;
      
      // Create bot response message
      const botMessage: ChatMessage = {
        id: generateId(),
        content: response.message || "I'm here to help with your business planning needs. How can I assist you today?",
        isBot: true,
        timestamp: new Date(),
        quickActions: response.quickActions?.map((action: string) => ({
          text: action,
          action: action.toLowerCase().replace(/\s+/g, '_')
        })) || [],
        messageType: 'text',
        confidence: 0.85
      };

      setMessages(prev => [...prev, botMessage]);

      // Update business context if provided
      if (response.businessContext) {
        setConversationState(prev => ({
          ...prev,
          businessContext: { ...prev.businessContext, ...response.businessContext }
        }));
      }

    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Error fallback message
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: "I apologize, but I'm experiencing some technical difficulties. Please try rephrasing your question or contact our support team if the issue persists.",
        isBot: true,
        timestamp: new Date(),
        quickActions: [
          { text: '🔄 Try Again', action: 'retry_message' },
          { text: '📞 Contact Support', action: 'contact_support' },
          { text: '❓ Get Help', action: 'show_help' }
        ]
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [conversationState, navigate]);

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

  // Clear conversation function - Compatible with existing ChatbotWidget
  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationState({
      context: ConversationContext.WELCOME,
      businessContext: {},
      sessionDuration: 0,
      messageCount: 0
    });
    sessionStartTime.current = Date.now();
    
    // Re-initialize with welcome message
    setTimeout(() => {
      const welcomeMessage = createWelcomeMessage();
      setMessages([welcomeMessage]);
    }, 100);
  }, []);

  const clearConversation = clearChat;

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Export conversation data
  const exportConversation = useCallback(() => {
    const exportData = {
      conversation: messages.map(msg => ({
        content: msg.content,
        isBot: msg.isBot,
        timestamp: msg.timestamp,
        messageType: msg.messageType
      })),
      businessContext: conversationState.businessContext,
      sessionDuration: conversationState.sessionDuration,
      messageCount: conversationState.messageCount,
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
  }, [messages, conversationState]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  // Return interface compatible with ChatbotWidget
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
    
    // Enhanced business planning features
    conversationState,
    businessContext: conversationState.businessContext,
    currentContext: conversationState.context,
    sessionDuration: conversationState.sessionDuration,
    messageCount: conversationState.messageCount,
    
    // Action handlers
    clearConversation,
    exportConversation,
    
    // Utility functions
    updateConversationState,
    businessPlanSections,
    
    // Quick access to business insights
    getBusinessInsight: (industry: string) => businessInsights[industry as keyof typeof businessInsights],
    
    // Session management
    sessionStartTime: sessionStartTime.current
  };
};