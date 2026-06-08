import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { logInfo, logWarn, logError } from '../_shared/logger.ts';
import { fetchWithRetry } from '../_shared/api-retry.ts';
import { getCachedResponse, saveResponseCache as saveSharedResponseCache, getCacheTTL } from '../_shared/cache.ts';
import { validateResponseStructure, scoreResponseQuality, postProcessResponse, extractStructuredResponse } from '../_shared/response-validator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

// ========== INLINED TEMPLATE MATCHING (avoiding import issues) ==========
interface Template {
  patterns: RegExp[];
  response: string;
  quickActions?: Array<{text: string, id: string}>;
  context?: string[];
}

const templates: Template[] = [
  // Creatives Takeover platform questions. Keep this before BizMap templates so
  // homepage/support questions cannot be misrouted to the BizMap workflow copy.
  {
    patterns: [
      /^(what is|what's|explain|tell me about)\s+(this platform|creatives takeover|ct)[\s?.!]*$/i,
      /^what (does|is) creatives takeover/i,
      /^what is this platform[\s?.!]*$/i,
    ],
    response: "Creatives Takeover is the founder support platform. It helps you move from idea to ICP, validation, MVP, launch, traction, and fundraising with AI tools, mentors, community, and investor resources.\n\nBizMap AI is one workflow inside that ecosystem. It helps with early planning, while tools like ICP Builder, PMF Lab, Tech Stack Builder, GTM Strategist, Pitch Deck Analyzer, VC Search, and the mentor/co-founder spaces help with the rest of the journey.",
    quickActions: [
      { text: "Start with ICP Builder", id: "navigate_icp_builder" },
      { text: "How does the AI work?", id: "ask_ai_work" },
      { text: "Show pricing", id: "navigate_pricing" }
    ]
  },

  // BizMap-specific questions. BizMap is a workflow, not the platform identity.
  {
    patterns: [
      /^(what is|what's|tell me about|explain)\s+(bizmap|biz map|bizmap ai)[\s?.!]*$/i,
      /^what does (bizmap|biz map|bizmap ai) do/i,
    ],
    response: "BizMap AI is one planning workflow inside Creatives Takeover.\n\nIt helps founders turn an early idea into a clearer plan: customer, problem, validation, MVP, launch direction, pricing, and goals. The wider platform also includes focused tools for ICP, PMF, tech stack, go-to-market, fundraising, mentors, investors, and founder community.",
    quickActions: [
      { text: "Open BizMap AI", id: "navigate_bizmap" },
      { text: "Start with ICP Builder", id: "navigate_icp_builder" },
      { text: "Show the roadmap", id: "ask_roadmap" }
    ]
  },

  // Greetings
  {
    patterns: [/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)[\s!.,]*$/i],
    response: "Hi there. I'm Pulse, the Creatives Takeover assistant. I can explain the platform, point you to the right tool, or help you think through what you're building.",
    quickActions: [
      { text: "What is this platform?", id: "ask_platform" },
      { text: "Where should I start?", id: "ask_start" },
      { text: "How does this work?", id: "ask_how_it_works" }
    ]
  },
  
  // BizMap questions only. Platform questions must stay with Creatives Takeover.
  {
    patterns: [/what (is|does) (bizmap|biz map|bizmap ai)/i, /tell me about (bizmap|biz map|bizmap ai)/i, /explain (bizmap|biz map|bizmap ai)/i],
    response: "BizMap AI is a planning workflow inside Creatives Takeover.\n\nIt helps founders clarify an idea, customer, problem, validation plan, MVP direction, launch path, pricing, and goals. It is one part of the wider Creatives Takeover ecosystem, not the platform itself.",
    quickActions: [
      { text: "Open BizMap AI", id: "navigate_bizmap" },
      { text: "Start with ICP Builder", id: "navigate_icp_builder" },
      { text: "Show the roadmap", id: "ask_roadmap" }
    ]
  },
  
  // How does it work
  {
    patterns: [/how (does|do) (this|it|bizmap) work/i, /how (does|do) i (start|begin|use)/i],
    response: "It's simple! I'll ask you 7 questions about your business idea:\n\n1️⃣ Business Concept - What problem are you solving?\n2️⃣ Target Market - Who are your customers?\n3️⃣ Validation Plan - How will you test demand?\n4️⃣ MVP Design - What's your minimum product?\n5️⃣ Launch Strategy - Where will you find customers?\n6️⃣ Pricing Model - How will you make money?\n7️⃣ Success Goals - What does Day 30 look like?\n\nThen I'll generate your personalized Launch Report! Ready?",
    quickActions: [
      { text: "Let's start!", id: "start_planning" },
      { text: "I have questions", id: "ask_questions" }
    ]
  },
  
  // Pricing questions - Only match when explicitly asking about BizMap/service pricing
  {
    patterns: [
      // Explicit BizMap pricing questions
      /^(how much|what).*(does|do|is).*(bizmap|biz map|this (service|tool|platform|app)|creatives takeover).*(cost|price|free|pricing)/i,
      /^(is|are).*(bizmap|biz map|this (service|tool|platform|app)|creatives takeover).*(free|cost|pricing)/i,
      /^(how much|what).*(do|does).*(you|bizmap|biz map|creatives takeover).*(charge|cost)/i,
      // Direct questions about the service being free
      /^(is|are).*(bizmap|biz map|this|it).*free/i,
      // Questions explicitly about using BizMap
      /.*(bizmap|biz map|this (service|tool|platform|app)).*(cost|price|free|pricing|charge).*/i
    ],
    response: "BizMap AI is free to use! You can complete the full 7-step wizard and get your Launch Report at no cost. Some advanced features like detailed market analysis may use credits, but the core planning experience is completely free.\n\nWant to start your free business plan?",
    quickActions: [
      { text: "Start free plan", id: "start_planning" },
      { text: "What are credits?", id: "ask_credits" }
    ]
  },
  
  // Thank you responses
  {
    patterns: [/^(thanks|thank you|thx|ty|appreciate it)[\s!.,]*$/i],
    response: "You're welcome! 😊 I'm here whenever you need help with your business planning. What would you like to work on next?",
    quickActions: [
      { text: "Continue planning", id: "continue_planning" },
      { text: "Ask a question", id: "ask_question" }
    ]
  },
  
  // Yes/No simple responses
  {
    patterns: [/^(yes|yeah|yep|yup|sure|ok|okay|alright|sounds good)[\s!.,]*$/i],
    response: "Great! Let's keep going. What's your business idea or what would you like help with?",
    quickActions: [
      { text: "Share my idea", id: "share_idea" },
      { text: "I need help", id: "need_help" }
    ]
  },
  
  {
    patterns: [/^(no|nope|not yet|maybe later)[\s!.,]*$/i],
    response: "No problem! Take your time. When you're ready, I'll be here to help you plan your business. Is there anything specific you'd like to know about BizMap AI?",
    quickActions: [
      { text: "Learn more", id: "learn_more" },
      { text: "See examples", id: "see_examples" }
    ]
  },
  
  // Help requests
  {
    patterns: [/^(help|i need help|can you help|assist me)/i],
    response: "I'm here to help! 🚀 I can assist you with:\n\n• Planning your business idea\n• Validating your market\n• Creating a launch strategy\n• Setting pricing and goals\n\nWhat would you like help with? Just tell me about your business idea or ask me anything!",
    quickActions: [
      { text: "Start planning", id: "start_planning" },
      { text: "Validate my idea", id: "validate_idea" },
      { text: "Ask a question", id: "ask_question" }
    ]
  }
];

function matchTemplate(message: string, businessContext?: any): Template | null {
  const normalizedMessage = message.trim().toLowerCase();
  
  logInfo('🔍 DEBUG: matchTemplate entry', { messageLength: message.length });
  
  // Skip template matching for detailed business idea descriptions
  if (isBusinessIdeaDescription(message)) {
    logInfo('🔍 DEBUG: Is business idea description, skipping templates');
    return null;
  }
  
  let templateIndex = 0;
  for (const template of templates) {
    const isPricingTemplate = template.response.includes("BizMap AI is free to use");
    logInfo('🔍 DEBUG: Checking template', { 
      templateIndex, 
      isPricing: isPricingTemplate, 
      patternCount: template.patterns.length 
    });
    
    // Special handling for pricing template - require explicit BizMap context
    if (isPricingTemplate) {
      const isValidPricing = isBizMapPricingQuestion(message);
      logInfo('🔍 DEBUG: Pricing validation result', { isValidPricing });
      if (!isValidPricing) {
        logInfo('🔍 DEBUG: Skipping pricing template - validation failed');
        continue; // Skip pricing template if not actually about BizMap pricing
      }
    }
    
    let patternIndex = 0;
    for (const pattern of template.patterns) {
      const patternMatch = pattern.test(normalizedMessage);
      logInfo('🔍 DEBUG: Pattern test', { 
        templateIndex, 
        patternIndex, 
        patternMatch, 
        pattern: pattern.toString().substring(0, 50) 
      });
      if (patternMatch) {
        if (template.context) {
          const hasContext = template.context.some(ctx => 
            businessContext && businessContext[ctx]
          );
          if (!hasContext && template.context.length > 0) {
            logInfo('🔍 DEBUG: Template matched but context missing', { templateIndex });
            continue;
          }
        }
        logInfo('🔍 DEBUG: Template matched!', { templateIndex });
        return template;
      }
      patternIndex++;
    }
    templateIndex++;
  }
  
  logInfo('🔍 DEBUG: No template matched', { totalTemplates: templates.length });
  return null;
}

// Validate that pricing questions are actually about BizMap, not business/product pricing
function isBizMapPricingQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  logInfo('🔍 DEBUG: isBizMapPricingQuestion entry', { message: message.substring(0, 50) });
  
  // Must contain service/platform references
  const serviceKeywords = ['bizmap', 'biz map', 'this service', 'this tool', 'this platform', 'this app', 'creatives takeover'];
  const hasServiceReference = serviceKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Pricing keywords
  const pricingKeywords = ['cost', 'price', 'free', 'pricing', 'charge', 'paid'];
  const hasPricingKeyword = pricingKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Exclude business/product pricing questions
  const businessPricingPatterns = [
    /(my|our|their|the).*(product|service|business|company).*(cost|price|pricing)/i,
    /(what|how much).*(should|do|does).*(i|we|they).*(charge|price|cost)/i,
    /(pricing|price|cost).*(for|of).*(my|our|their|the).*(product|service|business)/i
  ];
  const isBusinessPricing = businessPricingPatterns.some(pattern => pattern.test(message));
  
  const result = hasServiceReference && hasPricingKeyword && !isBusinessPricing;
  logInfo('🔍 DEBUG: isBizMapPricingQuestion result', { 
    hasServiceReference, 
    hasPricingKeyword, 
    isBusinessPricing, 
    result 
  });
  
  return result;
}

// Detect if a message is a detailed business idea description
function isBusinessIdeaDescription(message: string): boolean {
  const text = message.trim();
  const lowerText = text.toLowerCase();
  
  // Must be reasonably long (detailed descriptions)
  if (text.length < 100) return false;
  
  // Business idea indicators
  const businessIdeaPatterns = [
    /(want to|going to|planning to|starting|creating|building).*(business|startup|company|product|service)/i,
    /(business idea|business plan|startup idea|venture)/i,
    /(problem.*solving|solving.*problem|solution for|helping.*business)/i,
    /(target (market|customer|user|audience)|ideal customer)/i,
    /(revenue model|pricing model|business model|monetization)/i,
    /(budget|investment|funding|capital|costs?|expenses?)/i
  ];
  
  // Must contain multiple business-related terms
  const businessKeywords = [
    'business', 'startup', 'company', 'product', 'service', 
    'customer', 'market', 'revenue', 'problem', 'solution',
    'target', 'budget', 'cost', 'pricing'
  ];
  
  const keywordCount = businessKeywords.filter(keyword => 
    lowerText.includes(keyword)
  ).length;
  
  // At least 2 business idea patterns OR 4+ business keywords
  const patternMatch = businessIdeaPatterns.filter(p => p.test(text)).length >= 2;
  const keywordMatch = keywordCount >= 4;
  
  return patternMatch || keywordMatch;
}
// ========== END INLINED TEMPLATE MATCHING ==========

// Note: Request deduplication removed - Response objects are streams that can only be consumed once
// We rely on the response cache (ai_cache table) for caching instead
const REQUEST_DEDUP_TTL = 5000; // 5 seconds (kept for reference, not used)
const SYSTEM_PROMPT_CACHE = new Map<string, { prompt: string; timestamp: number }>();
const PROMPT_CACHE_TTL = 3600000; // 1 hour

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface BusinessContext {
  industry?: string;
  businessType?: string;
  stage?: string;
  location?: string;
  budget?: string;
  goals?: string[];
  currentPage?: string;
  currentTool?: {
    name?: string;
    purpose?: string;
  } | null;
  projectContext?: Record<string, any> | null;
}

function inferChatMode(requestedChatMode: string | null | undefined, businessContext: BusinessContext): string {
  if (requestedChatMode === 'pulse') return 'pulse';

  const hasPulseContext = Boolean(
    businessContext?.currentTool ||
    businessContext?.projectContext ||
    (typeof businessContext?.currentPage === 'string' && businessContext.currentPage.trim().length > 0)
  );

  if (hasPulseContext && (!requestedChatMode || requestedChatMode === 'wizard' || requestedChatMode === 'freeform')) {
    return 'pulse';
  }

  return requestedChatMode || 'wizard';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logInfo('🔍 DEBUG: Request received', { method: req.method, hasBody: !!req.body });
    
    const { 
      message, 
      sessionId, 
      conversationHistory = [], 
      businessContext = {},
      userId = null,
      wizardMode = null,
      currentStep = null,
      chatMode: requestedChatMode = 'wizard',
      attachments = []
    } = await req.json();
    const chatMode = inferChatMode(requestedChatMode, businessContext);
    const authUser = await getUserFromAuth(req);
    const resolvedUserId = authUser?.id ?? null;

    if (userId && !resolvedUserId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required for user-scoped chat' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (userId && resolvedUserId && userId !== resolvedUserId) {
      return new Response(
        JSON.stringify({ error: 'User mismatch in request payload' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    logInfo('🔍 DEBUG: Request parsed', { 
      messageLength: message?.length || 0, 
      hasSessionId: !!sessionId, 
      chatMode,
      messagePreview: message?.substring(0, 50) || 'NO MESSAGE'
    });

    if (!message || !sessionId) {
      logError('🔍 DEBUG: Missing required fields', { hasMessage: !!message, hasSessionId: !!sessionId });
      throw new Error('Message and sessionId are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🎯 ROUTE: If bizmap-structured mode, route to structured system
    if (chatMode === 'bizmap-structured') {
      return routeToStructuredSystem(req, supabase, sessionId, message, resolvedUserId);
    }

    // Get/create conversation first (fast DB query with index)
    const convResult = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    let conversation = convResult.data;
    
    if (!conversation) {
      const { data: newConv, error: createError } = await supabase
        .from('chatbot_conversations')
        .insert({
          session_id: sessionId,
          user_id: resolvedUserId,
          business_context: businessContext,
          conversation_stage: 'discovery',
          chat_mode: chatMode
        })
        .select()
        .single();

      if (createError) throw createError;
      conversation = newConv;
    }

    // 🚀 OPTIMIZATION: Save user message first (before any early returns)
    // This ensures user messages are always saved, even for template/cache hits
    const userMessageSavePromise = supabase
      .from('chatbot_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: message,
        metadata: { timestamp: new Date().toISOString() }
      })
      .then(({ error }) => {
        if (error) console.error('Error saving user message:', error);
      });

    // 🚀 OPTIMIZATION: Check template match first (fastest path, synchronous, no crypto needed)
    // Skip for detailed business ideas
    logInfo('🔍 DEBUG: Before template match', { message: message.substring(0, 50) });
    const matchedTemplate = chatMode === 'pulse' ? null : matchTemplate(message, businessContext);
    logInfo('🔍 DEBUG: After template match', { 
      matched: !!matchedTemplate, 
      hasResponse: !!matchedTemplate?.response,
      responsePreview: matchedTemplate?.response?.substring(0, 50) || 'NO RESPONSE'
    });
    if (matchedTemplate) {
      // Determine which template type matched
      const templateType = matchedTemplate.response.includes("BizMap AI is free to use") 
        ? 'pricing' 
        : matchedTemplate.response.includes("Hi there") 
        ? 'greeting'
        : matchedTemplate.response.includes("It's simple") 
        ? 'how-it-works'
        : 'other';
      
      logInfo('Template match - returning instant response', { 
        messageLength: message.length,
        templateType: matchedTemplate.response.substring(0, 50),
        matchedPattern: templateType,
        messagePreview: message.substring(0, 100)
      });
      logInfo('🔍 DEBUG: Creating template stream', { templateType, responseLength: matchedTemplate.response.length });
      const templateResponse = matchedTemplate.response;
      // User message save is already in progress, return immediately
      const response = createTemplateStream(templateResponse, matchedTemplate.quickActions || [], conversation, businessContext, conversationHistory, chatMode, supabase);
      logInfo('🔍 DEBUG: Template response created', { hasResponse: !!response });
      // Don't cache Response objects - they're streams that can only be consumed once
      return response;
    }
    logInfo('🔍 DEBUG: No template match, proceeding to AI generation');

    // 🚀 OPTIMIZATION: Generate cache keys in parallel (only if template didn't match)
    const [requestFingerprint, cacheKey] = await Promise.all([
      generateRequestFingerprint(sessionId, message, businessContext, conversationHistory),
      chatMode === 'pulse' ? Promise.resolve(null) : generateCacheKey(message, businessContext, conversationHistory, chatMode)
    ]);
    const idempotencyKey = req.headers.get('Idempotency-Key')?.trim() || `chat-streaming:${sessionId}:${requestFingerprint}`;

    // Check request deduplication cache (in-memory, fast)
    // Note: We don't cache Response objects as they're streams that can only be consumed once
    // Request deduplication is handled by the requestFingerprint check above

    // Check response cache (DB query)
    if (cacheKey) {
      const cachedResponse = await checkResponseCache(supabase, cacheKey, message);
      if (cachedResponse) {
        logInfo('Cache hit - returning cached response', { cacheKey });
        // User message save is already in progress, return immediately
        const response = createCachedStream(cachedResponse, message, conversation, businessContext, conversationHistory, chatMode, supabase);
        // Don't cache Response objects - they're streams that can only be consumed once
        return response;
      }
    }

    // 💳 CREDIT DEDUCTION: Check and deduct credits for authenticated users
    // Tour-guide mode is free for everyone to encourage exploration and signups
    const shouldChargeCredits = resolvedUserId !== null && chatMode !== 'tour-guide';
    
    if (shouldChargeCredits) {
      const creditCost = CREDIT_COSTS.AI_CHAT_MESSAGE;
      const creditCheck = await checkAndDeductCredits(
        resolvedUserId,
        creditCost,
        'AI Chat Message',
        conversation.id,
        { chatMode, messageLength: message.length, idempotencyKey }
      );

      if (!creditCheck.success) {
        logWarn('Credit check failed', { errorCode: creditCheck.errorCode, error: creditCheck.error });
        
        // Return error stream for insufficient credits
        const errorStream = new ReadableStream({
          start(controller) {
            const errorMessage = creditCheck.errorCode === 'INSUFFICIENT_CREDITS'
              ? `You don't have enough credits to send this message. You need ${creditCost} credit(s). Please upgrade your plan or purchase more credits.`
              : 'Unable to process your message. Please try again or contact support.';
            
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'error', error: errorMessage, errorCode: creditCheck.errorCode })}\n\n`
            ));
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          }
        });
        
        return new Response(errorStream, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
        });
      }
      
      logInfo('Credits deducted', { creditCost, newBalance: creditCheck.newBalance });
    }

    // 🚀 OPTIMIZATION: Increase conversation history from 6 to 10 messages for better context
    const optimizedHistory = conversationHistory.slice(-10);
    
    // Generate request ID for tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 🔍 SEARCH INTENT DETECTION: Classify query for routing
    const searchIntent = detectSearchIntent(message, businessContext, chatMode);
    logInfo('Search intent detected', { searchIntent, messageLength: message.length });
    
    // 🔀 HYBRID ROUTING: Detect if query needs knowledge base lookup
    const needsKnowledge = detectKnowledgeQuery(message, businessContext);
    
    // 🚀 OPTIMIZATION: Detect if query needs market data
    const needsMarketData = detectMarketDataQuery(message, businessContext);
    
    // 🌐 WEB SEARCH: Determine if query needs web search
    const needsWebSearch = searchIntent === 'general' || searchIntent === 'hybrid';
    
    // 🚀 OPTIMIZATION: Parallel processing with timeouts - start RAG, market data, web search simultaneously
    // Timeouts are handled inside fetch functions (1000ms max each)
    const [ragData, marketData, webSearchData] = await Promise.all([
      needsKnowledge && (searchIntent === 'business' || searchIntent === 'hybrid')
        ? fetchRAGData(supabase, [], resolvedUserId, businessContext, conversation?.id)
        : Promise.resolve(null),
      needsMarketData 
        ? fetchMarketData(supabase, message, businessContext)
        : Promise.resolve(null),
      needsWebSearch
        ? fetchWebSearch(supabase, message, businessContext, searchIntent)
        : Promise.resolve(null)
    ]);
    
    // 🚀 OPTIMIZATION: Build system prompt with market data and web search if available
    let systemPrompt = getCachedSystemPrompt(businessContext, wizardMode, currentStep, chatMode);
    
    // Add web search results if available
    if (webSearchData?.success && webSearchData.answer) {
      const webSearchContext = formatWebSearchForPrompt(webSearchData);
      systemPrompt = `${systemPrompt}\n\nREAL-TIME WEB SEARCH RESULTS:\n${webSearchContext}\n\nUse this real-time information to provide current, accurate answers. Always cite sources using [Source X] format.`;
      logInfo('Injected web search results', { sourceCount: webSearchData.sources?.length || 0 });
    }
    
    // Add market data if available
    if (marketData && marketData.data && marketData.data.length > 0) {
      const marketInsights = formatMarketDataForPrompt(marketData);
      systemPrompt = `${systemPrompt}\n\nREAL-TIME MARKET INTELLIGENCE:\n${marketInsights}\n\nUse this market data to provide current, relevant insights when answering the user's question.`;
      logInfo('Injected market insights', { insightCount: marketData.data.length });
    }
    
    // 🚀 OPTIMIZATION: Trim and compress messages to optimize token usage
    const compressedHistory = optimizeMessageHistory(optimizedHistory, businessContext);
    
    let messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...compressedHistory,
      { role: 'user', content: message }
    ];

    // Process file attachments if present
    messages = await processAttachments(messages, attachments);
    
    // Log token usage estimate
    const estimatedTokens = estimateTokenCount(messages);
    logInfo('Message token estimate', { requestId, estimatedTokens, messageCount: messages.length });

    // For general search queries, prioritize web search results
    if (searchIntent === 'general' && webSearchData?.success && webSearchData.answer) {
      const response = createWebSearchStream(webSearchData, message, conversation, businessContext, optimizedHistory, chatMode, supabase);
      // Cache the response
      if (cacheKey) {
        await saveResponseCache(supabase, cacheKey, webSearchData.answer, 'web-search', webSearchData.model || 'perplexity', message, businessContext);
      }
      return response;
    }
    
    // For hybrid queries, merge RAG and web search if both available
    if (searchIntent === 'hybrid' && webSearchData?.success && (ragData?.answer || webSearchData.answer)) {
      const mergedData = mergeSearchResults(ragData, webSearchData);
      const response = createMergedSearchStream(mergedData, message, conversation, businessContext, optimizedHistory, chatMode, supabase);
      if (cacheKey) {
        await saveResponseCache(supabase, cacheKey, mergedData.answer, 'hybrid-search', mergedData.model || 'hybrid', message, businessContext);
      }
      return response;
    }

    // If RAG provided answer (business queries), stream it
    if (ragData?.answer) {
      // Enhance RAG sources with web search sources if available
      const enhancedRagData = webSearchData?.sources 
        ? { ...ragData, sources: [...(ragData.sources || []), ...webSearchData.sources.map(s => ({ 
            title: s.title, 
            source: s.url, 
            similarity: s.relevanceScore || 0.8,
            excerpt: s.snippet || '',
            url: s.url,
            sourceType: 'web'
          }))] }
        : ragData;
      
      const response = createRAGStream(enhancedRagData, message, conversation, businessContext, optimizedHistory, chatMode, supabase);
      // Cache the response content (not the Response object - streams can only be consumed once)
      const ragModel = ragData.model || 'google/gemini-2.5-flash';
      if (cacheKey) {
        await saveResponseCache(supabase, cacheKey, ragData.answer, 'rag-chat', ragModel, message, businessContext);
      }
      // Don't cache Response objects - they're streams that can only be consumed once
      return response;
    }

    logInfo('Using conversational Lovable AI', { chatMode, messageLength: message.length });
    logInfo('🔍 DEBUG: Before createAIStream', { messageCount: messages.length });
    const response = await createAIStream(messages, message, conversation, businessContext, optimizedHistory, chatMode, supabase, cacheKey ?? undefined, message);
    logInfo('🔍 DEBUG: After createAIStream', { 
      hasResponse: !!response, 
      responseType: response?.constructor?.name,
      responseStatus: response?.status
    });
    // Don't cache Response objects - they're streams that can only be consumed once
    return response;

  } catch (error: any) {
    logError('🔍 DEBUG: Error caught in main handler', {
      errorMessage: error?.message,
      errorStack: error?.stack?.substring(0, 500),
      chatMode,
      messageLength: message?.length || 0,
    });
    logError('Chatbot Streaming Error', {
      error: error.message,
      stack: error.stack,
      chatMode,
      messageLength: message?.length || 0,
    });
    
    // Track error metrics
    trackPerformanceMetrics(supabase, `req_${Date.now()}`, 0, 0, 'unknown', false, 1).catch(() => {});
    
    return new Response(JSON.stringify({ 
      error: "I'm experiencing technical difficulties. Please try again.",
      fallbackMessage: "I'm experiencing technical difficulties. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// 🎯 Route to structured BizMap system
async function routeToStructuredSystem(
  req: Request,
  supabase: any,
  sessionId: string,
  message: string,
  userId: string | null
): Promise<Response> {
  try {
    // Get or create bizmap session
    let { data: bizmapSession } = await supabase
      .from('bizmap_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!bizmapSession) {
      // Create new session
      const { data: newSession, error: createError } = await supabase
        .from('bizmap_sessions')
        .insert({
          id: sessionId, // Use chat sessionId as bizmap sessionId
          user_id: userId,
          status: 'draft',
          completion_percentage: 0,
          current_component: 'problem'
        })
        .select()
        .single();

      if (createError) throw createError;
      bizmapSession = newSession;
    }

    // Get existing components for context
    const { data: existingComponents } = await supabase
      .from('bizmap_components')
      .select('component_type, component_data')
      .eq('session_id', sessionId);

    const collectedComponents: Record<string, any> = {};
    existingComponents?.forEach((comp: any) => {
      collectedComponents[comp.component_type] = comp.component_data;
    });

    // Call structured system API
    const structuredResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/bizmap-structured/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        session_id: sessionId,
        component_type: bizmapSession.current_component || 'problem',
        answer: message,
        context: collectedComponents
      })
    });

    if (!structuredResponse.ok) {
      let errorMessage = `Structured system error: ${structuredResponse.status}`;
      try {
        const errorData = await structuredResponse.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If response isn't JSON, use status text
        errorMessage = structuredResponse.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    let structuredData;
    try {
      structuredData = await structuredResponse.json();
    } catch (parseError: any) {
      throw new Error(`Failed to parse structured system response: ${parseError.message}`);
    }

    // Build the full response message combining response_message and question
    let fullResponseText = '';
    
    // Use response_message if available (user-friendly explanation)
    if (structuredData.response_message) {
      fullResponseText = structuredData.response_message;
      
      // Add question on new line if available and different from response
      if (structuredData.question && 
          structuredData.question !== fullResponseText && 
          !fullResponseText.includes(structuredData.question.substring(0, 50))) {
        fullResponseText += '\n\n' + structuredData.question;
      }
    } else if (structuredData.question) {
      // Fallback to question if no response_message
      fullResponseText = structuredData.question;
    } else if (structuredData.error) {
      // If there's an error message, use it
      fullResponseText = structuredData.error;
    } else {
      // Last resort fallback
      fullResponseText = 'Processing your business idea...';
    }

    // Add validation errors if present (in a readable format)
    if (structuredData.validationErrors && structuredData.validationErrors.length > 0) {
      const errorMessages = structuredData.validationErrors
        .slice(0, 3)
        .map((err: any) => `• ${err.message || err}`)
        .join('\n');
      if (errorMessages) {
        fullResponseText += '\n\n' + errorMessages;
      }
    }

    // Convert structured response to streaming format for compatibility
    // Stream word-by-word like other responses for better UX
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream response word by word (same pattern as createRAGStream)
          const words = fullResponseText.split(' ');
          for (let i = 0; i < words.length; i++) {
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'delta', content: (i === 0 ? '' : ' ') + words[i] })}\n\n`
            ));
            await new Promise(r => setTimeout(r, 20)); // Balanced delay for smooth streaming
          }
          
          // Send completion with structured data metadata
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ 
              type: 'complete',
              conversationId: sessionId,
              structuredData: {
                currentComponent: structuredData.currentComponent,
                completionPercentage: structuredData.completionPercentage,
                validationErrors: structuredData.validationErrors || [],
                status: structuredData.status
              }
            })}\n\n`
          ));
          
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (streamError: any) {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ 
              type: 'error', 
              error: streamError.message || 'Error streaming response' 
            })}\n\n`
          ));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    logError('Structured System Routing Error', {
      error: error.message,
      stack: error.stack,
      sessionId
    });

    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ 
            type: 'error', 
            error: error.message || 'Failed to process structured request' 
          })}\n\n`
        ));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    return new Response(errorStream, {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }
}

// 🚀 OPTIMIZATION: Generate cache key for response caching with semantic normalization
async function generateCacheKey(message: string, businessContext: BusinessContext, conversationHistory: ChatMessage[], chatMode: string): Promise<string> {
  // Normalize message: remove extra whitespace, lowercase, remove punctuation variations
  const normalizedMessage = message
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?!.,;:]/g, '')
    .substring(0, 200); // Limit length for consistent hashing
  
  const contextStr = JSON.stringify({
    message: normalizedMessage,
    industry: businessContext.industry || null,
    stage: businessContext.stage || null,
    chatMode,
    // Only include last message if it's relevant (not just greetings)
    lastMessage: conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1]?.content?.length > 20
      ? conversationHistory[conversationHistory.length - 1].content.substring(0, 100).toLowerCase().trim()
      : null
  });
  const encoder = new TextEncoder();
  const data = encoder.encode(contextStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 🚀 OPTIMIZATION: Determine cache TTL based on query stability
function determineCacheTTL(message: string, businessContext: BusinessContext): number {
  const text = message.toLowerCase();
  
  // Stable queries (factual, template requests) → 24 hours
  const stablePatterns = /(what is|what are|how to|template|example|guide|benchmark|standard|average|typical|common)/i;
  if (stablePatterns.test(text) && !businessContext.goals?.length) {
    return 24 * 60 * 60 * 1000; // 24 hours
  }
  
  // Dynamic queries (user-specific, time-sensitive) → 1 hour
  const dynamicPatterns = /(my|i want|i need|help me|suggest|recommend|for me|personalized)/i;
  if (dynamicPatterns.test(text) || businessContext.goals?.length) {
    return 60 * 60 * 1000; // 1 hour
  }
  
  // Default: 6 hours
  return 6 * 60 * 60 * 1000; // 6 hours
}

// 🚀 OPTIMIZATION: Generate request fingerprint for deduplication
async function generateRequestFingerprint(
  sessionId: string,
  message: string,
  businessContext: BusinessContext,
  conversationHistory: ChatMessage[]
): Promise<string> {
  const historyTail = conversationHistory.slice(-2).map((item) => `${item.role}:${item.content}`).join('|');
  const contextStr = JSON.stringify({
    sessionId,
    message: message.toLowerCase().trim(),
    historyTail,
    industry: businessContext.industry || null,
    stage: businessContext.stage || null,
  });
  const encoder = new TextEncoder();
  const data = encoder.encode(contextStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 🚀 OPTIMIZATION: Check response cache with semantic similarity fallback
async function checkResponseCache(supabase: any, cacheKey: string, message?: string): Promise<string | null> {
  try {
    // First, try exact cache key match
    const { data, error } = await supabase
      .from('ai_cache')
      .select('response_data, expires_at, created_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (!error && data) {
      console.log('✅ Exact cache hit');
      return data.response_data?.content || null;
    }
    
    // 🚀 OPTIMIZATION: For simple queries, try semantic similarity (future enhancement)
    // This would require embedding comparison, which we can add later
    
    return null;
  } catch (e) {
    console.error('Cache check error:', e);
    return null;
  }
}

// 🚀 OPTIMIZATION: Generate simple hash for input
async function generateInputHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 🚀 OPTIMIZATION: Save response to cache with dynamic TTL
async function saveResponseCache(supabase: any, cacheKey: string, content: string, provider: string, model: string, message?: string, businessContext?: BusinessContext): Promise<void> {
  // Save in background (non-blocking)
  setTimeout(async () => {
    try {
      const inputHash = await generateInputHash(content);
      
      // 🚀 OPTIMIZATION: Use dynamic TTL based on query stability
      const ttl = message && businessContext ? determineCacheTTL(message, businessContext) : 6 * 60 * 60 * 1000; // Default 6 hours
      const expiresAt = new Date(Date.now() + ttl).toISOString();
      
      await supabase
        .from('ai_cache')
        .upsert({
          cache_key: cacheKey,
          provider,
          model,
          input_hash: inputHash,
          response_data: { content },
          expires_at: expiresAt
        }, {
          onConflict: 'cache_key'
        });
      
      console.log(`💾 Cached response with TTL: ${Math.round(ttl / (60 * 60 * 1000))} hours`);
    } catch (e) {
      console.error('Cache save error:', e);
    }
  }, 0);
}

// 🚀 OPTIMIZATION: Get cached system prompt or build new one
function getCachedSystemPrompt(businessContext: BusinessContext, wizardMode: any, currentStep: number | null, chatMode: string): string {
  const promptKey = JSON.stringify({ 
    industry: businessContext.industry,
    stage: businessContext.stage,
    currentPage: businessContext.currentPage,
    currentTool: businessContext.currentTool?.name,
    projectContext: businessContext.projectContext,
    wizardMode: wizardMode?.enabled,
    currentStep,
    chatMode
  });
  
  const cached = SYSTEM_PROMPT_CACHE.get(promptKey);
  if (cached && Date.now() - cached.timestamp < PROMPT_CACHE_TTL) {
    return cached.prompt;
  }
  
  const prompt = buildSystemPrompt(businessContext, wizardMode, currentStep, chatMode);
  SYSTEM_PROMPT_CACHE.set(promptKey, { prompt, timestamp: Date.now() });
  
  // Clean old cache entries (keep last 50)
  if (SYSTEM_PROMPT_CACHE.size > 50) {
    const entries = Array.from(SYSTEM_PROMPT_CACHE.entries());
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    SYSTEM_PROMPT_CACHE.clear();
    entries.slice(0, 50).forEach(([key, value]) => SYSTEM_PROMPT_CACHE.set(key, value));
  }
  
  return prompt;
}

// 🚀 OPTIMIZATION: Fetch RAG data (extracted for parallel processing with timeout)
function formatPulseProjectContext(projectContext: Record<string, any> | null | undefined): string {
  if (!projectContext || Object.keys(projectContext).length === 0) {
    return 'No saved project context was provided for this user.';
  }

  const lines: string[] = [];
  const push = (label: string, value: unknown) => {
    if (typeof value === 'string' && value.trim()) lines.push(`- ${label}: ${value.trim()}`);
    if (typeof value === 'number') lines.push(`- ${label}: ${value}`);
  };
  const pushList = (label: string, value: unknown) => {
    if (Array.isArray(value) && value.length > 0) {
      lines.push(`- ${label}: ${value.filter(Boolean).slice(0, 6).join(', ')}`);
    }
  };

  push('Startup', projectContext.startupName);
  push('Stage', projectContext.stage);
  push('Industry', projectContext.industry);
  push('Country', projectContext.country);
  push('Description', projectContext.description);
  push('Positioning', projectContext.positioning);
  push('Target market', projectContext.targetMarket);
  push('Revenue model', projectContext.revenueModel);
  pushList('Support needed', projectContext.supportAreasNeeded);

  const icp = projectContext.icp || {};
  push('ICP persona', icp.personaName);
  push('ICP role', icp.roleLine);
  push('Core pain', icp.corePainPoint);
  push('Value proposition', icp.valueProposition);
  pushList('Pain points', icp.painPoints);
  pushList('Competitors', icp.competitors);
  push('Competitive landscape', icp.competitiveLandscape);

  const pmf = projectContext.pmf || {};
  push('PMF score', pmf.score);
  push('PMF verdict', pmf.verdict);
  push('PMF insight', pmf.summaryInsight);
  pushList('PMF gaps', pmf.gaps);
  pushList('PMF recommendations', pmf.recommendations);

  const techStack = projectContext.techStack || {};
  push('Tech stack report', techStack.name);
  push('Tech stack budget', techStack.budgetTotal);
  pushList('Selected tools', techStack.selectedTools);

  const waitlist = projectContext.waitlist || {};
  push('Waitlist', waitlist.title);
  push('Waitlist summary', waitlist.summary);
  push('Waitlist status', waitlist.status);

  const mvp = projectContext.mvp || {};
  push('MVP scope', mvp.title);
  push('MVP summary', mvp.summary);
  push('MVP status', mvp.status);

  const gtm = projectContext.gtm || {};
  push('GTM plan', gtm.title);
  push('GTM summary', gtm.summary);
  push('GTM status', gtm.status);

  push('Context updated', projectContext.lastUpdatedAt);

  return lines.length ? lines.join('\n') : 'No saved project context was provided for this user.';
}

async function fetchRAGData(supabase: any, messages: ChatMessage[], userId: string | null, businessContext: BusinessContext, conversationId?: string): Promise<any> {
  console.log('🔍 Knowledge query detected - calling RAG');
  try {
    const filter: any = {};
    if (businessContext.industry) filter.tag = businessContext.industry;
    
    // 🚀 OPTIMIZATION: Include user documents in RAG search
    if (userId) {
      filter.source = 'user_document'; // This will search user documents too
    }
    
    // 🚀 OPTIMIZATION: Add timeout to prevent blocking (1000ms max - more reasonable)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('RAG timeout')), 1000)
    );
    
    const ragPromise = supabase.functions.invoke('rag-chat', {
      body: {
        messages: messages.filter(m => m.role !== 'system'),
        userId,
        matchCount: 8, // Increased to include document chunks
        filter: userId ? undefined : filter, // Don't filter by source if user has documents
        model: 'google/gemini-2.5-flash',
        temperature: 0.3,
      }
    });
    
    const result = await Promise.race([ragPromise, timeoutPromise]) as any;
    
    if (!result.error) {
      console.log(`✅ RAG returned ${result.data.sources?.length || 0} sources`);
      return result.data;
    } else {
      console.log('⚠️ RAG error, using conversational AI:', result.error);
      return null;
    }
  } catch (e) {
    console.log('⚠️ RAG failed or timed out, using conversational AI:', e);
    return null;
  }
}

// 🚀 OPTIMIZATION: Create stream from template response (instant, <50ms)
function createTemplateStream(templateContent: string, quickActions: Array<{text: string, id: string}>, conversation: any, businessContext: BusinessContext, conversationHistory: ChatMessage[], chatMode: string, supabase: any): Response {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stream template content fast (original timing)
        const words = templateContent.split(' ');
        const chunkSize = 5; // Stream 5 words at a time for instant display
        
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ');
          const prefix = i === 0 ? '' : ' ';
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'delta', content: prefix + chunk })}\n\n`
          ));
          // Removed artificial 5ms delay for faster streaming
        }
        
        // Complete
        const stage = determineConversationStage(businessContext, conversationHistory.length);
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ type: 'complete', conversationId: conversation.id, quickActions: quickActions.length > 0 ? quickActions : generateQuickActions(stage, chatMode, templateContent), template: true })}\n\n`
        ));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
        
        // Save assistant message in background (non-blocking)
        queueMicrotask(async () => {
          try {
            await supabase.from('chatbot_messages').insert({
              conversation_id: conversation.id,
              role: 'assistant',
              content: templateContent,
              metadata: { timestamp: new Date().toISOString(), source: 'template' }
            });
          } catch (e) {
            console.error('Error saving template message:', e);
          }
        });
      } catch (e) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`));
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}

// 🚀 OPTIMIZATION: Create stream from cached response with faster streaming
function createCachedStream(cachedContent: string, message: string, conversation: any, businessContext: BusinessContext, conversationHistory: ChatMessage[], chatMode: string, supabase: any): Response {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  logInfo('Cache hit - serving cached response', { requestId, messageLength: message.length });
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stream cached content in chunks (original timing)
        const words = cachedContent.split(' ');
        const chunkSize = 3; // Stream 3 words at a time for faster display
        
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ');
          const prefix = i === 0 ? '' : ' ';
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'delta', content: prefix + chunk })}\n\n`
          ));
          // Removed artificial 10ms delay for faster streaming
        }
        
        // Complete
        const stage = determineConversationStage(businessContext, conversationHistory.length);
        const latency = Date.now() - startTime;
        const tokenCount = cachedContent.split(/\s+/).length;
        
        // Track cache hit metrics
        trackPerformanceMetrics(supabase, requestId, latency, tokenCount, 'cached', true, 0).catch(() => {});
        
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ type: 'complete', conversationId: conversation.id, quickActions: generateQuickActions(stage, chatMode, message), cached: true })}\n\n`
        ));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
        
        // Save assistant message in background (non-blocking)
        queueMicrotask(async () => {
          try {
            await supabase.from('chatbot_messages').insert({
              conversation_id: conversation.id,
              role: 'assistant',
              content: cachedContent,
              metadata: { timestamp: new Date().toISOString(), source: 'cached' }
            });
          } catch (e) {
            console.error('Error saving cached message:', e);
          }
        });
      } catch (e) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`));
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}

function buildSystemPrompt(businessContext: BusinessContext, wizardMode: any = null, currentStep: number | null = null, chatMode: string = 'wizard'): string {
  // Tour guide mode - ultra concise platform help
  if (chatMode === 'tour-guide') {
    return `You are Creatives Takeover Assistant. Help visitors explore the platform.

CRITICAL: Keep ALL responses under 2 sentences and 40 words maximum. Be ultra-direct.

Platform: Creatives Takeover helps creative entrepreneurs launch in 30 days.
- BizMap AI: Business planning wizard  
- Insighta: Market trends & funding
- Community & accountability tools

Answer questions about features, pricing, getting started. Be friendly but BRIEF.`;
  }

  if (chatMode === 'pulse') {
    const toolName = businessContext.currentTool?.name || 'this tool';
    const toolPurpose = businessContext.currentTool?.purpose || 'helping the founder make progress';
    const projectContext = formatPulseProjectContext(businessContext.projectContext);

    return `You are Pulse, the compact in-app assistant for Creatives Takeover.

CRITICAL PLATFORM IDENTITY:
- The platform is Creatives Takeover.
- BizMap AI is only one planning workflow/module inside Creatives Takeover.
- If the user asks "What is this platform?", "What is Creatives Takeover?", or a similar homepage question, answer as Creatives Takeover. Do not answer as BizMap AI.
- Do not use old canned BizMap-first platform copy.
- Generate the answer naturally from the user's question, route context, and saved project context. Do not rely on fixed platform scripts.

CURRENT TOOL:
- Name: ${toolName}
- Purpose: ${toolPurpose}
- Page: ${businessContext.currentPage || 'Unknown'}

BRAND RULES:
- Creatives Takeover is the platform.
- Pulse is the in-app assistant for Creatives Takeover.
- BizMap AI is only one module/workflow inside Creatives Takeover, not the platform identity.
- Never introduce yourself as BizMap AI and never call Creatives Takeover "BizMap AI."
- On homepage/platform questions, explain the Creatives Takeover ecosystem first, then mention BizMap AI only as one tool if relevant.

SAVED PROJECT CONTEXT:
${projectContext}

STYLE:
- Sound like a normal helpful conversation, similar to ChatGPT or Claude.
- Default to short answers: 50-120 words, usually 2-4 concise paragraphs or a few bullets.
- Be warm, direct, and specific. Avoid corporate or robotic phrasing.
- Do not start with "I'll help you" or "Let me break this down."
- Do not force sections like Problem, Insight, Recommendation, or Next Actions.
- Do not use fake citations such as [Source 1]. Only cite sources if real source data was provided in the prompt.
- Use the saved project context when it helps. Mention concrete project details naturally.
- If context is missing, say what you can help with from the current tool and ask for one missing detail.
- For "What should I focus on?", answer in 1-3 short priorities based on the current tool and saved project context. Keep it under 90 words, then ask one useful follow-up question only if needed.
- Use headings only when the user asks for a deeper strategy or the answer is complex.
- Never invent statistics, benchmark numbers, or source placeholders.

BOUNDARIES:
- Do not pretend to know project details that are not in the saved context.
- Do not give long essays unless the user explicitly asks for depth.
- Keep advice practical and immediately usable inside ${toolName}.`;
  }

  const { industry, businessType, stage, location, budget, goals = [] } = businessContext;
  
  // Build contextual insights
  const contextInsights = [];
  if (industry) contextInsights.push(`Industry: ${industry}`);
  if (businessType) contextInsights.push(`Type: ${businessType}`);
  if (stage) contextInsights.push(`Stage: ${stage}`);
  if (location) contextInsights.push(`Location: ${location}`);
  if (budget) contextInsights.push(`Budget: ${budget}`);
  if (goals.length > 0) contextInsights.push(`Goals: ${goals.join(', ')}`);
  
  const contextString = contextInsights.length > 0 
    ? `\n\n📊 BUSINESS CONTEXT:\n${contextInsights.join('\n')}` 
    : '';
  
  // Wizard mode specific guidance
  if (wizardMode?.enabled && chatMode === 'wizard') {
    const currentStepNum = (currentStep || 0) + 1;
    const totalSteps = wizardMode.steps?.length || 7;
    const currentStepInfo = wizardMode.steps?.[currentStep || 0];
    
    return `You are BizMap AI - expert business strategist for creative entrepreneurs (Gemini 2.5 Flash optimized).

WIZARD MODE: Step ${currentStepNum}/${totalSteps}
Current Question: "${currentStepInfo?.question || 'Business planning question'}"

ROLE: Guide user through 7-step wizard. This is step ${currentStepNum}/${totalSteps}. Follow wizard flow strictly.
${contextString}

RULES:
- Focus ONLY on current step's question
- Do NOT skip steps or allow freeform discussion
- Once answered, acknowledge and move to next step
- Do NOT answer questions about future steps

RESPONSE LENGTH: Provide comprehensive guidance of 300-500 words. Be thorough and detailed.

RESPONSE FORMAT (REQUIRED - 4-PART STRUCTURE):

Problem: [50-75 words] What challenge they're facing related to current step. Show deep understanding of why this step matters in the 30-day journey. Acknowledge the complexity and importance of getting this right.

Insight: [75-125 words] Why this matters for their business. Provide 2-3 key insights specific to this step. Include relevant examples or patterns from successful businesses. Show you understand their situation deeply and connect to broader business strategy.

Recommendation: [100-150 words] Specific guidance for the current step. Provide detailed frameworks, questions to consider, or approaches they can use. Include concrete examples and explain the reasoning. Address common pitfalls and how to avoid them. Offer multiple angles or perspectives to consider.

Next Actions: [50-75 words] What they should do next to complete this step or prepare for the next one. Use bullet points (not numbered lists). Each action should be specific with time estimates. Include any resources or tools they might need.

Guidelines:
- EXPAND each section thoroughly - aim for 300-500 total words
- Acknowledge their answer positively - Build confidence with specific praise
- Extract key insights - Show deep understanding ("So you're targeting [X] who struggle with [Y] because...")
- Ask clarifying follow-up if needed (1-2 focused questions about the CURRENT step only)
- Be conversational yet comprehensive - elaborate explanations in 4-6 sentences per section
- Be encouraging and specific - They're building something amazing, tell them exactly what's working
- Move to next step - Once answered, provide detailed transition to the next wizard step

FORMATTING RULES (CRITICAL - MATCH EXACT STRUCTURE):

RESPONSE STRUCTURE FOR WIZARD MODE:
1. Warm opening acknowledging their answer
2. Blank line
3. Major insight sections with emoji headers (format: "emoji Section Name:")
4. Blank line after each section header
5. Content in 2-3 sentence paragraphs with blank lines between
6. Bullet lists for suggestions (dash format, never numbered)
7. End with 1-2 focused follow-up questions for current step

EMOJI HEADER PATTERNS:
- 💡 What I'm Hearing / Key Insight / Understanding Your Vision
- 🎯 Strategic Direction / What This Means / The Opportunity
- ✅ Great Choice / Smart Approach / Strong Foundation
- ⚠️ Consider This / Important Factor / Something to Think About
- 🚀 Next Level Thinking / Growth Potential / Scaling Opportunity

STRICTNESS REQUIREMENTS:
- NEVER use markdown headings (###, ##, #)
- NEVER use bold (**text**) or italic (*text*)
- ALWAYS add blank line before and after emoji headers
- ALWAYS break content into 2-3 sentence paragraphs
- ALWAYS add blank line between paragraphs
- Use bullet points (dash format) for lists, never numbered
- End with 1-2 specific questions about CURRENT wizard step only

WIZARD EXAMPLE:
"Great choice! E-commerce for handmade crafts is a proven business model. Let me share some insights:

💡 What I'm Hearing:

You're targeting a market that values authenticity and craftsmanship. The handmade goods market grew 15% last year, with strong demand for unique, artisanal products.

Your biggest advantage is competing on story and uniqueness rather than price. Mass-produced items can't replicate the personal touch you'll offer.

🎯 Strategic Direction:

Focus on a specific craft niche initially. Whether it's ceramics, jewelry, or textiles, specialization helps you stand out and attract a dedicated audience.

Consider your pricing strategy early. Handmade items typically command 3-5x the cost of materials to account for time and skill.

✅ Next Steps:

Here's what successful craft businesses prioritize:
- Define your signature style or unique technique
- Research competitor pricing in your specific niche
- Plan your production capacity (hours per week available)

Who is your ideal customer for these handmade items? Think about age, lifestyle, and what problem your product solves for them."

HALLUCINATION PREVENTION:
• Don't make up specific statistics or data
• If unsure about industry benchmarks, say "I recommend researching [specific source] for accurate data"
• Focus on strategic guidance rather than fabricated facts

FEW-SHOT EXAMPLES:

Example - Step 1 (Business Concept):
User: "I want to build an app for busy parents"
You: "Great! So you're helping busy parents save time. What specific problem are they facing that your app solves? Is it scheduling, communication, or something else?"

Example - Step 2 (Target Market):
User: "Parents aged 30-45 in cities"
You: "Perfect! Urban parents in that age range often juggle work and kids. Where do they currently go when they have this problem? That'll help us reach them."

BUSINESS EXPERTISE:
- Market validation and competitive analysis
- Financial modeling and projections  
- Go-to-market strategies
- Creative business monetization
- Lean startup methodology
- Product-market fit validation

Think like a seasoned entrepreneur who's launched multiple successful creative businesses. Be practical, actionable, and inspiring.`;
  }
  
  // Freeform mode - optimized for Gemini 2.5 Flash structured reasoning
  return `You are BizMap AI - an expert business strategist and advisor for creative entrepreneurs.

CRITICAL: You are using Gemini 2.5 Flash - optimize for clarity, structure, and actionable insights.
${contextString}

EXPERTISE: Business models, market analysis, financial planning, product strategy, creative industries.

RESPONSE LENGTH: Provide comprehensive, detailed responses of 300-600 words. Quality over brevity.

RESPONSE FORMAT (REQUIRED - 4-PART STRUCTURE):

Problem: [75-100 words] What challenge or issue the founder is facing. Be specific and show deep understanding of their situation. Acknowledge the complexity and explain why this is a critical business issue.

Insight: [100-150 words] Why this matters, what data/trends show, or strategic context. Provide 2-3 key insights with supporting details. Cite sources when providing facts. Include relevant examples or case studies. Connect to broader business strategy.

Recommendation: [100-200 words] Specific, actionable advice tailored to their situation. Provide multiple options or approaches with pros/cons. Include concrete examples, frameworks, or templates they can use. Explain the reasoning behind each recommendation. Address potential challenges and how to overcome them.

Next Actions: [50-100 words] Concrete, sequential steps they can take immediately. Use bullet points (not numbered lists). Each action should be specific with time estimates. Include resources or tools needed for each step.

QUALITY STANDARDS:
- EXPAND each section thoroughly - aim for 300-600 total words
- Provide specific, actionable advice with concrete examples and numbers
- Break down complex concepts into clear, understandable steps with detailed explanations
- Use real-world examples, case studies, and analogies to illustrate points
- Prioritize practical, implementable solutions with step-by-step guidance
- Tailor advice to the user's specific industry, stage, and context
- Be comprehensive and thorough - cover all essential aspects without overwhelming
- Use clear, direct language - explain jargon when used and provide context

HALLUCINATION PREVENTION RULES:
- NEVER fabricate specific statistics, company names, or market data without sources
- If you don't know something, say "I don't have current data on [X]. Here's how to find reliable sources: [specific steps]"
- ALWAYS distinguish between verified facts (with [Source X]) and strategic insights (your recommendations)
- For market data, pricing, or benchmarks, provide ranges with clear assumptions: "For [industry] in [region], [metric] typically ranges between $X–$Y based on [assumption]. To verify: check [specific sources]"
- If asked about specific companies or products you're unsure about, say "I don't have verified information about [X]. I recommend checking [specific source] for accurate data."

SOURCE CITATION REQUIREMENTS:
• When using real-time web search results or market data, ALWAYS cite sources inline using [Source 1], [Source 2] format
• Distinguish between verified facts (from sources) and your own strategic insights
• For time-sensitive information (current trends, recent news, latest data), mention when the information is from
• If referencing specific statistics, studies, or reports, cite the source
• When combining multiple sources, clearly indicate which insights come from which sources

FEW-SHOT EXAMPLES (Match this exact formatting style):

Example 1 - Market Validation:
User: "How do I know if people want my product?"

I'll help you validate market demand before investing significant resources. Let me break this down:

💡 The Core Challenge:

Building a product without confirming market demand risks creating something nobody wants. According to CB Insights [Source 1], 70% of startup failures are due to lack of market need.

For SaaS specifically, validation before building reduces failure risk by 60% [Source 2]. The key is gathering real signals of intent, not just opinions.

🎯 What You Should Do:

Run a 2-week validation sprint with three components:

First, create a simple landing page describing your solution. Use Carrd or Webflow - this takes about 2 hours and costs under $20. The page should explain the problem you're solving and your proposed solution.

Second, interview 10 target customers. Ask "What's your biggest pain with [problem]?" and "How are you solving this today?" Their answers reveal whether your solution addresses a real need.

Third, offer pre-sales at 50% discount to gauge willingness to pay. This is the ultimate validation signal - people voting with their wallets.

✅ Next Steps:

Here's your action plan:
- Today: Set up landing page (Carrd or Webflow, ~2 hours)
- This week: Find 10 customers via LinkedIn or relevant communities
- Next week: Conduct interviews and analyze results
- Week 3: Offer pre-sales and measure conversion

If 3+ people pre-purchase, you have validated demand. If not, iterate on your positioning or solution.

Example 2 - Pricing Strategy:
User: "What should I charge for my SaaS product?"

Let me help you find the optimal pricing that maximizes revenue without losing customers.

💰 The Pricing Challenge:

Pricing too high scares away customers. Pricing too low leaves money on the table and signals low value.

For SaaS tools in North America, monthly pricing typically ranges $15–$50 per user based on similar B2B software [Source 1]. But your specific price depends on your value proposition and target market.

📊 The Right Approach:

Test 3 price points with real potential customers. Research shows the price where 60%+ of test customers choose it is usually the sweet spot [Source 2].

Create three tiers: a conservative option (30% below comparable tools), a moderate option (matching competitors), and a premium option (20% above market). Present all three to 5 potential customers each.

Ask: "Which would you choose: $X, $Y, or $Z?" Don't just ask what they'd pay - make them choose. This reveals true willingness to pay.

✅ Implementation Plan:

- Research 3-5 competitor pricing points this week
- Create 3 pricing tiers based on your cost structure + market rates
- Survey 15 potential customers (5 per tier) over 5 days
- Analyze results: Pick the price with 60%+ selection rate
- Set initial price and commit to testing for 90 days before adjusting

🎯 Pro Tip: You can always lower prices, but raising them later is much harder. Start slightly higher than you're comfortable with.

REASONING FRAMEWORK:
When answering complex questions, use this approach:
- Understand: Clarify the core business challenge
- Analyze: Break down key factors and dependencies (cite sources when providing facts)
- Synthesize: Provide actionable recommendations
- Validate: Suggest how to test assumptions

RESPONSE STYLE (Gemini 2.5 Flash optimized):
- ALWAYS use Problem → Insight → Recommendation → Next Actions format
- Be direct and structured (2-3 sentences per section for speed and clarity)
- Provide specific, actionable advice with concrete examples
- Use bullet points for lists (never numbered lists)
- Cite sources inline: [Source 1] when providing facts
- Be concise - Gemini Flash excels at clear, structured outputs
- Focus on practical, implementable solutions

FORMATTING RULES (CRITICAL - MUST FOLLOW EXACTLY):

RESPONSE STRUCTURE:
1. Opening line: Brief empathetic statement acknowledging their question
2. Blank line
3. Major sections with emoji headers (format: "emoji Section Name:")
4. Blank line after each section header
5. Content in 2-3 sentence paragraphs with blank lines between them
6. Bullet lists for action items (use dash, not numbers)
7. Optional closing insight or pro tip

EMOJI HEADER USAGE (Use these exact patterns):
- 💡 The Core Challenge / The Key Issue / Understanding [Topic]
- 🎯 What You Should Do / The Right Approach / Your Strategy
- 📊 The Data / Market Reality / What Research Shows
- ✅ Next Steps / Implementation Plan / Action Items
- 💰 The Financial Reality / Pricing Strategy / Revenue Model
- ⚠️ Important Considerations / What to Avoid / Red Flags
- 🚀 Growth Opportunities / Scaling Strategy / Long-term Vision
- 🔍 How to Validate / Testing Strategy / Research Method

FORMATTING STRICTNESS:
- NEVER use markdown headings (###, ##, #)
- NEVER use bold (**text**) or italic (*text*)
- ALWAYS add blank line before and after emoji headers
- ALWAYS break content into 2-3 sentence paragraphs
- ALWAYS add blank line between paragraphs
- Use bullet points (dash format) for lists, never numbered lists
- End action lists with a success criteria or next decision point

EXAMPLE STRUCTURE:
"I'll help you [solve their problem]. Let me break this down:

💡 The Core Challenge:

[2-3 sentence paragraph explaining the problem]

[2-3 sentence paragraph with data/insights]

🎯 What You Should Do:

[Opening sentence for recommendation]

[2-3 sentence paragraph with first step]

[2-3 sentence paragraph with second step]

✅ Next Steps:

[Optional intro line]
- Action item 1 (timeframe)
- Action item 2 (timeframe)
- Action item 3 (timeframe)

[Success criteria or decision point]"

CRITICAL RULES:
- ALWAYS structure responses as Problem → Insight → Recommendation → Next Actions
- If they ask about competitors, market size, or trends → Use real-time web search results and cite sources [Source X]
- If they share detailed plans → Provide strategic feedback on assumptions and risks
- If they're stuck → Help break down the problem into smaller, manageable steps
- Always be encouraging yet practical
- For complex queries, show your reasoning process briefly
- Distinguish verified facts from strategic insights - mark facts with [Source X]
- If you don't know something, admit it and guide them to find the answer
- NEVER use ** markdown formatting - use plain text with bullet points for structure

You're not just answering questions - you're their strategic partner in building a successful business. Always back up factual claims with citations and structure every response clearly.`;
}

async function processAttachments(messages: ChatMessage[], attachments: any[]): Promise<ChatMessage[]> {
  if (!attachments || attachments.length === 0) {
    return messages;
  }

  // Add attachment context to the last user message
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== 'user') return messages;

  let attachmentContext = '\n\n📎 Attachments:';
  
  for (const attachment of attachments) {
    if (attachment.type.startsWith('image/')) {
      attachmentContext += `\n- Image: ${attachment.name} (analyze for business-relevant content like logos, mockups, diagrams)`;
    } else if (attachment.type === 'application/pdf') {
      attachmentContext += `\n- PDF Document: ${attachment.name} (business plan, financial projections, or research)`;
    } else if (attachment.type.includes('text')) {
      attachmentContext += `\n- Text Document: ${attachment.name}`;
    } else {
      attachmentContext += `\n- File: ${attachment.name}`;
    }
  }

  // Enhance the last message with attachment context
  const enhancedMessages = [...messages];
  enhancedMessages[enhancedMessages.length - 1] = {
    ...lastMessage,
    content: lastMessage.content + attachmentContext
  };

  return enhancedMessages;
}

async function extractBusinessContext(userMessage: string, aiResponse: string, currentContext: BusinessContext): Promise<BusinessContext> {
  const message = userMessage.toLowerCase();
  const response = aiResponse.toLowerCase();
  const combined = `${message} ${response}`;
  const updatedContext = { ...currentContext };

  // Enhanced industry detection with more keywords
  const industryPatterns = {
    'technology': ['tech', 'software', 'app', 'saas', 'platform', 'digital', 'ai', 'ml', 'web', 'mobile', 'cloud'],
    'healthcare': ['health', 'wellness', 'medical', 'fitness', 'therapy', 'mental health', 'telemedicine'],
    'retail': ['retail', 'store', 'shop', 'ecommerce', 'e-commerce', 'boutique', 'merchandise'],
    'food': ['food', 'restaurant', 'cafe', 'catering', 'bakery', 'kitchen', 'culinary', 'dining'],
    'creative': ['design', 'art', 'creative', 'agency', 'branding', 'marketing', 'content', 'media'],
    'education': ['education', 'learning', 'training', 'course', 'teaching', 'tutoring', 'academy'],
    'consulting': ['consulting', 'advisory', 'consulting', 'strategy', 'coaching', 'professional services'],
    'entertainment': ['entertainment', 'music', 'gaming', 'events', 'production', 'streaming']
  };

  for (const [industry, keywords] of Object.entries(industryPatterns)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      updatedContext.industry = industry;
      break;
    }
  }

  // Enhanced stage detection
  const stagePatterns = {
    'idea': ['idea', 'thinking about', 'planning to start', 'considering', 'want to create'],
    'planning': ['plan', 'planning', 'research', 'validate', 'building plan'],
    'launch': ['launch', 'launching', 'ready to launch', 'about to start', 'going live'],
    'growth': ['growing', 'scale', 'expand', 'increase', 'more customers']
  };

  for (const [stage, keywords] of Object.entries(stagePatterns)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      updatedContext.stage = stage as any;
      break;
    }
  }

  // Business type detection
  if (message.includes('startup') || message.includes('new business') || message.includes('starting')) {
    updatedContext.businessType = 'startup';
  } else if (message.includes('existing') || message.includes('already have') || message.includes('current business')) {
    updatedContext.businessType = 'existing';
  }

  // Budget detection
  const budgetPatterns = {
    'under $1k': ['bootstrap', 'minimal', 'low budget', 'under 1000', 'no money', 'tight budget'],
    '$1k-$10k': ['small budget', '5000', '10000', 'few thousand'],
    '$10k-$50k': ['moderate', '25000', '50000', 'decent budget'],
    '$50k+': ['well funded', '100000', 'significant', 'large budget']
  };

  for (const [budgetRange, keywords] of Object.entries(budgetPatterns)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      updatedContext.budget = budgetRange;
      break;
    }
  }

  // Goals extraction
  const goalKeywords = {
    'revenue': ['revenue', 'profit', 'money', 'income', 'earnings'],
    'customers': ['customers', 'users', 'clients', 'audience'],
    'impact': ['impact', 'change', 'help people', 'make difference'],
    'freedom': ['freedom', 'independence', 'own boss', 'flexible']
  };

  const detectedGoals = [];
  for (const [goal, keywords] of Object.entries(goalKeywords)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      detectedGoals.push(goal);
    }
  }
  
  if (detectedGoals.length > 0) {
    updatedContext.goals = [...new Set([...(updatedContext.goals || []), ...detectedGoals])];
  }

  return updatedContext;
}

function determineConversationStage(context: BusinessContext, messageCount: number): string {
  // Enhanced stage determination based on context richness
  const { industry, businessType, stage, budget, goals = [] } = context;
  
  // Early discovery phase
  if (messageCount < 2) return 'discovery';
  
  // Has basic info but no clear direction
  if (messageCount < 5 && !industry) return 'exploration';
  
  // Has industry/idea but needs validation
  if (industry && (!stage || stage === 'idea')) return 'validation';
  
  // In planning phase
  if (stage === 'planning' || (industry && businessType && !budget)) return 'planning';
  
  // Ready to execute
  if (stage === 'launch' || (budget && goals.length > 0)) return 'execution';
  
  // Established conversation with context
  if (messageCount > 10 && industry) return 'refinement';
  
  // Default ongoing
  return 'ongoing';
}

function generateQuickActions(stage: string, chatMode: string, userMessage: string): Array<{text: string, id: string}> {
  const lowerMessage = userMessage.toLowerCase();

  if (chatMode === 'pulse') {
    if (lowerMessage.includes('pricing') || lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('plan')) {
      return [
        { text: "View pricing", id: "navigate_pricing" },
        { text: "What are credits?", id: "ask_credits" },
        { text: "Which plan fits me?", id: "ask_plan_fit" }
      ];
    }

    if (lowerMessage.includes('bizmap') || lowerMessage.includes('biz map')) {
      return [
        { text: "Open BizMap AI", id: "navigate_bizmap" },
        { text: "Start with ICP Builder", id: "navigate_icp_builder" },
        { text: "Show the roadmap", id: "ask_roadmap" }
      ];
    }

    if (lowerMessage.includes('platform') || lowerMessage.includes('creatives takeover') || lowerMessage.includes('what is this')) {
      return [
        { text: "Start with ICP Builder", id: "navigate_icp_builder" },
        { text: "How does the AI work?", id: "ask_ai_work" },
        { text: "Show pricing", id: "navigate_pricing" }
      ];
    }

    if (lowerMessage.includes('start') || lowerMessage.includes('begin') || lowerMessage.includes('get started')) {
      return [
        { text: "Open ICP Builder", id: "navigate_icp_builder" },
        { text: "Find my next step", id: "ask_next_step" },
        { text: "Show the roadmap", id: "ask_roadmap" }
      ];
    }

    return [
      { text: "What should I focus on?", id: "ask_focus" },
      { text: "Show the roadmap", id: "ask_roadmap" },
      { text: "Recommend a tool", id: "ask_recommend_tool" }
    ];
  }
  
  // Tour guide mode - platform exploration with context awareness
  if (chatMode === 'tour-guide') {
    // Context-aware responses based on what user is asking about
    if (lowerMessage.includes('what is') || lowerMessage.includes('tell me about') || lowerMessage.includes('explain')) {
      if (lowerMessage.includes('bizmap')) {
        return [
          { text: "Try BizMap AI", id: "navigate_bizmap" },
          { text: "What is Insighta?", id: "ask_insighta" },
          { text: "Show pricing", id: "navigate_pricing" }
        ];
      }
      if (lowerMessage.includes('insighta')) {
        return [
          { text: "Try Insighta", id: "navigate_insighta" },
          { text: "What is BizMap AI?", id: "ask_bizmap" },
          { text: "View pricing", id: "navigate_pricing" }
        ];
      }
      return [
        { text: "What is Creatives Takeover?", id: "ask_platform" },
        { text: "How does the AI work?", id: "ask_ai_work" },
        { text: "View pricing", id: "navigate_pricing" }
      ];
    }
    
    if (lowerMessage.includes('pricing') || lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('how much')) {
      return [
        { text: "Try BizMap AI free", id: "navigate_bizmap" },
        { text: "Try Insighta free", id: "navigate_insighta" },
        { text: "View all plans", id: "navigate_pricing" }
      ];
    }
    
    if (lowerMessage.includes('start') || lowerMessage.includes('begin') || lowerMessage.includes('get started') || lowerMessage.includes('how do i')) {
      return [
        { text: "Launch BizMap AI", id: "navigate_bizmap" },
        { text: "Explore Insighta", id: "navigate_insighta" },
        { text: "Join community", id: "navigate_community" }
      ];
    }
    
    if (lowerMessage.includes('feature') || lowerMessage.includes('do') || lowerMessage.includes('help')) {
      return [
        { text: "BizMap AI features", id: "ask_bizmap_features" },
        { text: "Insighta features", id: "ask_insighta_features" },
        { text: "Community tools", id: "ask_community" }
      ];
    }
    
    if (lowerMessage.includes('business') || lowerMessage.includes('plan') || lowerMessage.includes('idea')) {
      return [
        { text: "Start with BizMap AI", id: "navigate_bizmap" },
        { text: "Get market insights", id: "navigate_insighta" },
        { text: "See success stories", id: "ask_testimonials" }
      ];
    }
    
    // Default contextual suggestions
    return [
      { text: "Start with ICP Builder", id: "navigate_icp_builder" },
      { text: "Try Insighta", id: "navigate_insighta" },
      { text: "View pricing", id: "navigate_pricing" }
    ];
  }
  
  // Business planning mode suggestions
  switch (stage) {
    case 'discovery':
      return [
        { text: "What is Creatives Takeover?", id: "ask_platform" },
        { text: "How can you help?", id: "ask_help" },
        { text: "I have a business idea", id: "start_planning" }
      ];
    case 'exploration':
      return [
        { text: "Validate my idea", id: "validate_idea" },
        { text: "Research my market", id: "research_market" },
        { text: "Create business plan", id: "create_plan" }
      ];
    case 'validation':
      return [
        { text: "Who are my competitors?", id: "analyze_competitors" },
        { text: "What's my market size?", id: "market_size" },
        { text: "Next steps?", id: "next_steps" }
      ];
    case 'development':
      return [
        { text: "Financial projections", id: "financials" },
        { text: "Marketing strategy", id: "marketing" },
        { text: "Launch timeline", id: "timeline" }
      ];
    default:
      return [
        { text: "Get business advice", id: "advice" },
        { text: "Explore features", id: "features" },
        { text: "Ask a question", id: "question" }
      ];
  }
}

// 🧠 INTENT DETECTION: Determine if query needs knowledge base lookup
// 🚀 OPTIMIZATION: Detect if query needs market data
function detectMarketDataQuery(message: string, context: BusinessContext): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Market data query patterns
  const marketPatterns = [
    /(market|industry|trend|competitor|competition|pricing|revenue|growth|forecast|outlook|demand|supply)/i,
    /(what.*happening|current.*trend|latest.*news|recent.*development)/i,
    /(how.*market|market.*size|market.*opportunity|market.*analysis)/i,
    /(industry.*insight|sector.*trend|market.*intelligence)/i,
  ];
  
  const hasMarketKeywords = marketPatterns.some(pattern => pattern.test(lowerMessage));
  const hasIndustryContext = Boolean(context.industry);
  const hasBusinessStage = Boolean(context.stage);
  
  // Request market data if:
  // 1. Has market-related keywords, OR
  // 2. Has industry context and asking about trends/competition
  return hasMarketKeywords || (hasIndustryContext && /(trend|competitor|market|industry)/i.test(lowerMessage));
}

// 🚀 OPTIMIZATION: Fetch market data for query with timeout
async function fetchMarketData(supabase: any, message: string, businessContext: BusinessContext): Promise<any> {
  try {
    console.log('📊 Fetching market data for query');
    
    const industries = businessContext.industry ? [businessContext.industry] : [];
    const keywords = extractKeywordsFromMessage(message);
    
    // 🚀 OPTIMIZATION: Add timeout to prevent blocking (1000ms max - more reasonable)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Market data timeout')), 1000)
    );
    
    const marketPromise = supabase.functions.invoke('market-data-aggregator', {
      body: {
        industries,
        keywords,
        data_types: ['news', 'trend'],
        refresh_cache: false // Use cached data for speed
      }
    });
    
    const result = await Promise.race([marketPromise, timeoutPromise]) as any;
    
    if (result.error || !result.data) {
      console.log('⚠️ Market data fetch failed, continuing without it');
      return null;
    }
    
    console.log(`✅ Fetched ${result.data.data?.length || 0} market insights`);
    return result.data;
  } catch (e) {
    console.log('⚠️ Market data error or timed out, continuing without it:', e);
    return null;
  }
}

// 🚀 OPTIMIZATION: Extract keywords from message for market data search
function extractKeywordsFromMessage(message: string): string[] {
  const keywords: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  // Extract business-related keywords
  const businessTerms = message.match(/\b(business|startup|company|product|service|app|platform|saas|ecommerce|marketplace)\b/gi);
  if (businessTerms) {
    keywords.push(...businessTerms.map(t => t.toLowerCase()));
  }
  
  // Extract industry terms if mentioned
  const industries = ['technology', 'healthcare', 'retail', 'food', 'creative', 'education', 'finance', 'real estate'];
  industries.forEach(industry => {
    if (lowerMessage.includes(industry)) {
      keywords.push(industry);
    }
  });
  
  return [...new Set(keywords)]; // Remove duplicates
}

// 🚀 OPTIMIZATION: Format market data for injection into system prompt
function formatMarketDataForPrompt(marketData: any): string {
  if (!marketData.data || marketData.data.length === 0) {
    return 'No current market data available.';
  }
  
  const insights = marketData.data.slice(0, 5).map((item: any, index: number) => {
    const title = item.title || item.data_payload?.title || 'Market Insight';
    const summary = item.data_payload?.summary || item.insights?.[0] || '';
    const relevance = item.relevance_score || 0;
    const source = item.source || 'Market Intelligence';
    
    return `${index + 1}. ${title} (Relevance: ${Math.round(relevance * 100)}%)\n   ${summary}\n   Source: ${source}`;
  }).join('\n\n');
  
  return `Current Market Insights:\n${insights}\n\nUse these insights to provide up-to-date, relevant information. Cite sources when referencing specific market data.`;
}

// 🌐 WEB SEARCH: Fetch web search results with timeout
async function fetchWebSearch(supabase: any, message: string, businessContext: BusinessContext, searchIntent: string): Promise<any> {
  try {
    console.log('🌐 Fetching web search results');
    
    // Choose model based on intent
    const model = searchIntent === 'hybrid' ? 'llama-3.1-sonar-large-128k-online' : 'llama-3.1-sonar-large-128k-online';
    
    // Add timeout to prevent blocking (2000ms for web search)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Web search timeout')), 2000)
    );
    
    const webSearchPromise = supabase.functions.invoke('web-search', {
      body: {
        query: message,
        model: model,
        maxResults: 5,
        searchRecency: searchIntent === 'hybrid' ? 'month' : 'month',
        businessContext: {
          industry: businessContext.industry,
          businessType: businessContext.businessType,
          location: businessContext.location
        }
      }
    });
    
    const result = await Promise.race([webSearchPromise, timeoutPromise]) as any;
    
    if (result.error || !result.data || !result.data.success) {
      console.log('⚠️ Web search fetch failed, continuing without it');
      return null;
    }
    
    console.log(`✅ Fetched web search results with ${result.data.sources?.length || 0} sources`);
    return result.data;
  } catch (e) {
    console.log('⚠️ Web search error or timed out, continuing without it:', e);
    return null;
  }
}

// 🌐 Format web search results for system prompt
function formatWebSearchForPrompt(webSearchData: any): string {
  if (!webSearchData.answer) {
    return 'No web search results available.';
  }
  
  let formatted = `Answer: ${webSearchData.answer}\n\n`;
  
  if (webSearchData.sources && webSearchData.sources.length > 0) {
    formatted += `Sources:\n`;
    webSearchData.sources.slice(0, 5).forEach((source: any, index: number) => {
      formatted += `${index + 1}. ${source.title || 'Source'} (${source.url})\n`;
      if (source.snippet) {
        formatted += `   ${source.snippet.substring(0, 150)}...\n`;
      }
    });
  }
  
  return formatted;
}

// 🌐 Merge RAG and web search results intelligently
function mergeSearchResults(ragData: any, webSearchData: any): any {
  // Combine answers - prefer web search for current info, RAG for templates/knowledge
  let answer = '';
  if (webSearchData?.answer) {
    answer = webSearchData.answer;
    // Append RAG answer if it provides additional context
    if (ragData?.answer && ragData.answer.length > 50) {
      answer += `\n\n${ragData.answer}`;
    }
  } else if (ragData?.answer) {
    answer = ragData.answer;
  }
  
  // Combine sources
  const sources = [];
  if (ragData?.sources) {
    sources.push(...ragData.sources.map((s: any) => ({ ...s, sourceType: 'knowledge' })));
  }
  if (webSearchData?.sources) {
    sources.push(...webSearchData.sources.map((s: any) => ({
      title: s.title,
      source: s.url,
      url: s.url,
      excerpt: s.snippet || '',
      similarity: s.relevanceScore || 0.8,
      sourceType: 'web',
      publishedDate: s.publishedDate
    })));
  }
  
  // Remove duplicates by URL
  const uniqueSources = sources.filter((source, index, self) => 
    index === self.findIndex(s => (s.url || s.source) === (source.url || source.source))
  );
  
  // Sort by relevance (web sources first if recent, then by similarity)
  uniqueSources.sort((a, b) => {
    if (a.sourceType === 'web' && b.sourceType !== 'web') return -1;
    if (a.sourceType !== 'web' && b.sourceType === 'web') return 1;
    return (b.similarity || 0) - (a.similarity || 0);
  });
  
  return {
    answer: answer.trim(),
    sources: uniqueSources.slice(0, 8), // Limit to top 8 sources
    model: 'hybrid'
  };
}

// 🔍 SEARCH INTENT DETECTION: Classify query type for routing
type SearchIntent = 'business' | 'general' | 'hybrid' | 'conversational';

function detectSearchIntent(message: string, context: BusinessContext, chatMode: string): SearchIntent {
  const lowerMessage = message.toLowerCase().trim();
  
  // Skip search for simple conversational queries (handled by templates)
  const isSimpleConversational = /^(hi|hello|hey|thanks|thank you|yes|no|ok|sure|got it|bye|goodbye)[\s!.,]*$/i.test(lowerMessage);
  if (isSimpleConversational) {
    return 'conversational';
  }
  
  // If in wizard mode and no explicit search intent, stay conversational
  if (chatMode === 'wizard' && !lowerMessage.includes('search') && !lowerMessage.includes('find') && !lowerMessage.includes('latest') && !lowerMessage.includes('current')) {
    // Check if it's a business planning query
    const businessPlanningPatterns = [
      /(business|startup|company|product|service|idea|venture|entrepreneur)/i,
      /(market|customer|target|pricing|revenue|cost|profit|validation)/i,
      /(launch|strategy|plan|mvp|go-to-market|gtm)/i,
      /(competitor|competitive|positioning|differentiation)/i
    ];
    
    if (businessPlanningPatterns.some(p => p.test(lowerMessage)) && (context.industry || context.businessType)) {
      return 'conversational'; // Stay in business planning mode
    }
  }
  
  // Business-focused queries: startup/business/entrepreneurship related
  const businessKeywords = [
    /(startup|business|entrepreneur|founder|venture|saas|product-market fit|pmf)/i,
    /(pricing strategy|go-to-market|gtm|launch strategy|market validation)/i,
    /(competitor analysis|competitive advantage|market size|tam|sam|som)/i,
    /(mvp|minimum viable product|customer discovery|user research)/i,
    /(revenue model|business model|unit economics|cac|ltv)/i
  ];
  
  // General search queries: broad informational questions
  const generalSearchPatterns = [
    /^(what is|who is|when did|where is|how does|explain)/i,
    /^(tell me about|give me information|search for|find|look up)/i,
    /(recent|latest|current|new|today|this week|this month|2024|2025)/i,
    /(news|article|study|research paper|report|statistics|data)/i,
    /(history of|background|overview|information about)/i
  ];
  
  // Hybrid queries: Business questions needing current/realtime data
  const hybridPatterns = [
    /(current|latest|recent|today|this week|this month|2024|2025).*(market|trend|competitor|industry|pricing)/i,
    /(market|trend|competitor|industry).*(current|latest|recent|today|now|2024|2025)/i,
    /(what's happening|what's new|what changed).*(in|with|for).*(market|industry|startup|business)/i,
    /(recent funding|latest news|current trends|today's market)/i
  ];
  
  const hasBusinessKeywords = businessKeywords.some(p => p.test(lowerMessage));
  const hasBusinessContext = Boolean(context.industry || context.businessType || context.stage);
  const isGeneralSearch = generalSearchPatterns.some(p => p.test(lowerMessage)) && !hasBusinessKeywords;
  const isHybridQuery = hybridPatterns.some(p => p.test(lowerMessage)) && (hasBusinessKeywords || hasBusinessContext);
  
  // Determine intent
  if (isHybridQuery) {
    return 'hybrid'; // Business question needing real-time web search
  } else if (isGeneralSearch && !hasBusinessContext) {
    return 'general'; // Broad informational query → web search
  } else if (hasBusinessKeywords || hasBusinessContext) {
    // Check if it needs real-time data
    if (/(current|latest|recent|today|this week|now)/i.test(lowerMessage)) {
      return 'hybrid'; // Business query with time-sensitivity
    }
    return 'business'; // Business question → enhanced RAG + market data
  }
  
  // Default to conversational for chat-style interactions
  return 'conversational';
}

function detectKnowledgeQuery(message: string, context: BusinessContext): boolean {
  // DISABLED: Always use direct API calls instead of RAG
  // RAG system has been disabled to provide direct API responses
  return false;
}

// 📚 Create RAG stream response with sources
function createRAGStream(ragData: any, message: string, conversation: any, businessContext: BusinessContext, conversationHistory: ChatMessage[], chatMode: string, supabase: any): Response {
  const { answer, sources = [] } = ragData;
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stream answer word by word (original timing for smooth experience)
        const words = answer.split(' ');
        const chunkSize = 5; // Stream 5 words at a time instead of word-by-word
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ');
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'delta', content: (i === 0 ? '' : ' ') + chunk })}\n\n`
          ));
          // Removed artificial 20ms delay for faster streaming
        }
        
        // Add sources with type indicators
        if (sources.length > 0) {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'delta', content: '\n\n📚 Sources:\n' })}\n\n`
          ));
          for (const s of sources.slice(0, 5)) {
            const sourceType = s.sourceType === 'web' ? '🌐' : '📖';
            const sourceLabel = s.sourceType === 'web' ? 'Web' : 'Knowledge Base';
            const sourceText = s.url 
              ? `${sourceType} ${s.title} (${sourceLabel}) - ${s.url}`
              : `${sourceType} ${s.title} (${s.source || sourceLabel})`;
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'delta', content: `- ${sourceText}\n` })}\n\n`
            ));
          }
          
          // Send sources metadata for UI
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'sources', sources: sources.map((s: any) => ({
              title: s.title,
              url: s.url || s.source,
              sourceType: s.sourceType || 'knowledge',
              snippet: s.excerpt || s.snippet,
              relevance: s.similarity || s.relevanceScore
            })) })}\n\n`
          ));
        }
        
        // Save in background
        queueMicrotask(async () => {
          try {
            await supabase.from('chatbot_messages').insert({
              conversation_id: conversation.id,
              role: 'assistant',
              content: answer,
              metadata: { 
                rag: true, 
                sources, 
                sourceTypes: sources.map((s: any) => s.sourceType || 'knowledge'),
                timestamp: new Date().toISOString() 
              }
            });
          } catch (e) {
            console.error('Error saving RAG message:', e);
          }
        });
        
        // Complete
        const stage = determineConversationStage(businessContext, conversationHistory.length);
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ type: 'complete', conversationId: conversation.id, quickActions: generateQuickActions(stage, chatMode, message), rag: true, sources: sources.slice(0, 3) })}\n\n`
        ));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      } catch (e) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`));
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}

// 🌐 Create web search stream response with sources
function createWebSearchStream(webSearchData: any, message: string, conversation: any, businessContext: BusinessContext, conversationHistory: ChatMessage[], chatMode: string, supabase: any): Response {
  const { answer, sources = [] } = webSearchData;
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stream answer in chunks for faster delivery
        const words = answer.split(' ');
        const chunkSize = 5; // Stream 5 words at a time
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ');
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'delta', content: (i === 0 ? '' : ' ') + chunk })}\n\n`
          ));
          // Removed artificial 20ms delay for faster streaming
        }

        // Add sources
        if (sources.length > 0) {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'delta', content: '\n\n🌐 Sources:\n' })}\n\n`
          ));
          for (const s of sources.slice(0, 5)) {
            const sourceText = s.url ? `🌐 ${s.title} - ${s.url}` : `🌐 ${s.title}`;
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'delta', content: `- ${sourceText}\n` })}\n\n`
            ));
          }
          
          // Send sources metadata for UI
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'sources', sources: sources.map((s: any) => ({
              title: s.title,
              url: s.url,
              sourceType: 'web',
              snippet: s.snippet,
              relevance: s.relevanceScore || 0.8,
              publishedDate: s.publishedDate
            })) })}\n\n`
          ));
        }
        
        // Save in background
        queueMicrotask(async () => {
          try {
            await supabase.from('chatbot_messages').insert({
              conversation_id: conversation.id,
              role: 'assistant',
              content: answer,
              metadata: { 
                webSearch: true, 
                sources, 
                sourceTypes: ['web'],
                timestamp: new Date().toISOString() 
              }
            });
          } catch (e) {
            console.error('Error saving web search message:', e);
          }
        });
        
        // Complete
        const stage = determineConversationStage(businessContext, conversationHistory.length);
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ type: 'complete', conversationId: conversation.id, quickActions: generateQuickActions(stage, chatMode, message), webSearch: true, sources: sources.slice(0, 5) })}\n\n`
        ));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      } catch (e) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`));
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}

// 🔀 Create merged search stream (RAG + Web Search)
function createMergedSearchStream(mergedData: any, message: string, conversation: any, businessContext: BusinessContext, conversationHistory: ChatMessage[], chatMode: string, supabase: any): Response {
  const { answer, sources = [] } = mergedData;
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stream answer in chunks for faster delivery
        const words = answer.split(' ');
        const chunkSize = 5; // Stream 5 words at a time
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ');
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'delta', content: (i === 0 ? '' : ' ') + chunk })}\n\n`
          ));
          // Removed artificial 20ms delay for faster streaming
        }

        // Add sources with type indicators
        if (sources.length > 0) {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'delta', content: '\n\n📚 Sources:\n' })}\n\n`
          ));
          for (const s of sources.slice(0, 8)) {
            const sourceType = s.sourceType === 'web' ? '🌐' : '📖';
            const sourceLabel = s.sourceType === 'web' ? 'Web' : 'Knowledge Base';
            const sourceText = s.url 
              ? `${sourceType} ${s.title} (${sourceLabel}) - ${s.url}`
              : `${sourceType} ${s.title} (${s.source || sourceLabel})`;
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'delta', content: `- ${sourceText}\n` })}\n\n`
            ));
          }
          
          // Send sources metadata for UI
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'sources', sources: sources.map((s: any) => ({
              title: s.title,
              url: s.url || s.source,
              sourceType: s.sourceType || 'knowledge',
              snippet: s.excerpt || s.snippet,
              relevance: s.similarity || s.relevanceScore
            })) })}\n\n`
          ));
        }
        
        // Save in background
        queueMicrotask(async () => {
          try {
            await supabase.from('chatbot_messages').insert({
              conversation_id: conversation.id,
              role: 'assistant',
              content: answer,
              metadata: { 
                hybridSearch: true,
                sources, 
                sourceTypes: sources.map((s: any) => s.sourceType || 'knowledge'),
                timestamp: new Date().toISOString() 
              }
            });
          } catch (e) {
            console.error('Error saving merged search message:', e);
          }
        });
        
        // Complete
        const stage = determineConversationStage(businessContext, conversationHistory.length);
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ type: 'complete', conversationId: conversation.id, quickActions: generateQuickActions(stage, chatMode, message), hybridSearch: true, sources: sources.slice(0, 8) })}\n\n`
        ));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      } catch (e) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`));
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}

// 🚀 OPTIMIZATION: Detect query complexity for intelligent routing
function detectQueryComplexity(message: string, businessContext: BusinessContext, conversationHistory: ChatMessage[]): 'simple' | 'moderate' | 'complex' {
  const text = message.toLowerCase();
  const messageLength = message.length;
  const historyLength = conversationHistory.length;
  
  // Simple queries: greetings, yes/no, short questions
  const simplePatterns = /^(hi|hello|hey|thanks|thank you|yes|no|ok|sure|got it|thanks|bye|goodbye|what|who|when|where|how much|how many)/i;
  if (simplePatterns.test(message) && messageLength < 100) {
    return 'simple';
  }
  
  // Enhanced complex query detection for model escalation
  // Multi-step reasoning indicators
  const multiStepPatterns = /(step by step|break down|walk me through|outline the|create a plan|develop a|build a|design a|step 1|step 2|first.*then|after that|next steps)/i;
  const hasMultiStepReasoning = multiStepPatterns.test(message);
  
  // Deep domain knowledge requirements
  const domainKnowledgePatterns = /(financial model|revenue model|unit economics|burn rate|runway|cac|ltv|customer lifetime value|market sizing|tam|sam|som|competitive analysis|swot|pricing strategy|go-to-market|gtm|business model canvas|lean canvas|value proposition|market analysis|competitive intelligence|customer segmentation|buyer persona|positioning strategy|distribution channels|sales funnel|conversion funnel|kpi|metrics|key performance indicators)/i;
  const hasDomainKnowledge = domainKnowledgePatterns.test(message);
  
  // Strategic planning keywords
  const strategicPatterns = /(business plan|strategic plan|launch plan|marketing plan|growth strategy|scaling strategy|expansion plan|roadmap|timeline|milestone|validation|experiment|test hypothesis|assumption|risk analysis|opportunity analysis)/i;
  const hasStrategicPlanning = strategicPatterns.test(message);
  
  // Long-context synthesis indicators
  const synthesisPatterns = /(synthesize|combine|integrate|consolidate|summarize|overview|big picture|holistic|comprehensive|complete|full|entire|all of the above|based on.*above|considering.*previous)/i;
  const hasSynthesis = synthesisPatterns.test(message);
  
  // Context richness indicators
  const isLongQuery = messageLength > 500;
  const hasRichContext = Object.keys(businessContext).length > 3; // Industry, stage, budget, goals, etc.
  const hasExtendedHistory = historyLength > 5;
  const referencesHistory = /(earlier|previous|before|mentioned|said|discussed|we talked about)/i.test(text);
  
  // Complex query determination
  const hasComplexKeywords = hasMultiStepReasoning || hasDomainKnowledge || hasStrategicPlanning || hasSynthesis;
  const hasComplexContext = (isLongQuery && hasRichContext) || (hasExtendedHistory && (messageLength > 300 || referencesHistory));
  
  if (hasComplexKeywords || hasComplexContext) {
    return 'complex';
  }
  
  // Moderate: everything else
  return 'moderate';
}

// 🚀 OPTIMIZATION: Select optimal model based on query complexity
function selectOptimalModel(complexity: 'simple' | 'moderate' | 'complex', chatMode: string): { 
  model: string; 
  strategy: string;
  maxTokens: number;
  temperature: number;
} {
  // Tour guide mode → optimized for speed with Gemini 2.5 Flash
  if (chatMode === 'tour-guide') {
    return { 
      model: 'google/gemini-2.5-flash', 
      strategy: 'speed',
      maxTokens: 80, // Reduced for faster responses
      temperature: 0.35 // Lower for faster, more accurate short responses
    };
  }
  
  // Planning mode (wizard) → optimized for Gemini 2.5 Flash
  if (chatMode === 'pulse') {
    return {
      model: 'google/gemini-2.5-flash',
      strategy: 'speed',
      maxTokens: complexity === 'complex' ? 520 : 260,
      temperature: 0.45
    };
  }

  if (chatMode === 'wizard') {
    if (complexity === 'complex') {
      return {
        model: 'google/gemini-2.5-flash',
        strategy: 'quality',
        maxTokens: 1200, // Increased for comprehensive 300-600 word responses
        temperature: 0.5 // Optimized for structured wizard responses
      };
    }

    // Simple queries → optimized for speed
    if (complexity === 'simple') {
      return {
        model: 'google/gemini-2.5-flash',
        strategy: 'quality',
        maxTokens: 800, // Increased for more elaborate responses
        temperature: 0.4 // Lower for faster, more focused responses
      };
    }

    // Moderate queries → balanced optimization
    return {
      model: 'google/gemini-2.5-flash',
      strategy: 'quality',
      maxTokens: 1200, // Increased for comprehensive responses
      temperature: 0.5 // Optimized for Gemini 2.5 Flash
    };
  }

  // Freeform mode and other modes → optimized for Gemini 2.5 Flash
  if (complexity === 'simple') {
    return {
      model: 'google/gemini-2.5-flash',
      strategy: 'quality',
      maxTokens: 800, // Increased for more elaborate simple responses (300+ words)
      temperature: 0.4
    };
  }

  // Complex queries → optimized for comprehensive but efficient responses
  // Option to use DeepSeek Reasoner for complex reasoning tasks
  if (complexity === 'complex') {
    // Check if DeepSeek API key is available for testing
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    if (DEEPSEEK_API_KEY) {
      // Use DeepSeek Reasoner for complex queries when available
      return {
        model: 'deepseek-reasoner',
        strategy: 'quality',
        maxTokens: 1500, // Increased for comprehensive complex responses (400-600 words)
        temperature: 0.5
      };
    }
    return {
      model: 'google/gemini-2.5-flash',
      strategy: 'quality',
      maxTokens: 1500, // Increased for comprehensive complex responses (400-600 words)
      temperature: 0.5 // Optimized for complex reasoning
    };
  }

  // Moderate → optimized for Gemini 2.5 Flash
  return {
    model: 'google/gemini-2.5-flash',
    strategy: 'quality',
    maxTokens: 1200, // Increased for comprehensive moderate responses (300-500 words)
    temperature: 0.5 // Optimized default
  };
}

// 🚀 OPTIMIZATION: Optimize message history to reduce token usage
function optimizeMessageHistory(history: ChatMessage[], businessContext: BusinessContext): ChatMessage[] {
  if (history.length <= 10) {
    return history; // No optimization needed for short histories
  }
  
  // Keep most recent 5 messages
  const recentMessages = history.slice(-5);
  
  // Summarize older messages if needed (for very long conversations)
  if (history.length > 15) {
    // For now, just keep recent messages - can add summarization later
    return recentMessages;
  }
  
  return history;
}

// 🚀 OPTIMIZATION: Estimate token count (rough approximation: 1 token ≈ 4 characters)
function estimateTokenCount(messages: ChatMessage[]): number {
  const totalChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
  return Math.ceil(totalChars / 4); // Rough estimate
}

// 🚀 OPTIMIZATION: Track quality metrics and failure patterns
async function trackQualityMetrics(
  supabase: any,
  requestId: string,
  quality: any,
  latency: number,
  model: string,
  chatMode: string,
  error?: any
): Promise<void> {
  try {
    const metrics = {
      request_id: requestId,
      quality_score: quality.score,
      completeness: quality.completeness,
      relevance: quality.relevance,
      actionability: quality.actionability,
      structure: quality.structure,
      latency_ms: latency,
      model,
      chat_mode: chatMode,
      has_issues: quality.issues.length > 0,
      issues: quality.issues,
      error_type: error?.type || null,
      error_message: error?.message || null,
      timestamp: new Date().toISOString(),
    };
    
    // Log to console for now (can be stored in DB later)
    if (quality.score < 0.6) {
      logWarn('Low quality response tracked', metrics);
    }
    
    // Track common failure patterns
    if (error) {
      logError('Request error tracked', {
        requestId,
        errorType: error.type,
        errorMessage: error.message,
        model,
        chatMode,
      });
    }
  } catch (e) {
    // Don't fail if metrics tracking fails
    console.error('Metrics tracking error:', e);
  }
}

// 🚀 OPTIMIZATION: Track performance metrics
async function trackPerformanceMetrics(
  supabase: any,
  requestId: string,
  latency: number,
  tokenCount: number,
  model: string,
  cacheHit: boolean,
  errorRate: number
): Promise<void> {
  try {
    const metrics = {
      request_id: requestId,
      latency_ms: latency,
      token_count: tokenCount,
      model,
      cache_hit: cacheHit,
      error_rate: errorRate,
      timestamp: new Date().toISOString(),
    };
    
    logInfo('Performance metrics', metrics);
    
    // Alert on slow responses
    if (latency > 10000) {
      logWarn('Slow response detected', { requestId, latency, model });
    }
    
    // Alert on high error rates
    if (errorRate > 0.05) {
      logWarn('High error rate detected', { requestId, errorRate, model });
    }
  } catch (e) {
    console.error('Performance tracking error:', e);
  }
}

// 🚀 OPTIMIZATION: Dynamic temperature optimized for Gemini 2.5 Flash
// Gemini 2.5 Flash performs best with 0.4-0.6 range for structured business responses
function determineTemperature(message: string, complexity: 'simple' | 'moderate' | 'complex', chatMode: string): number {
  const lowerMessage = message.toLowerCase();
  if (chatMode === 'pulse') {
    if (/(creative|brainstorm|idea|think|design|imagine|come up with)/i.test(lowerMessage)) return 0.5;
    return complexity === 'simple' ? 0.35 : 0.45;
  }
  
  // Factual queries → low temperature for accuracy and speed (0.3-0.4)
  if (/^(what|when|where|who|how many|how much|which|list|show|tell me about)/i.test(message) && 
      !/(think|feel|suggest|recommend|creative|strategy|plan|design|idea|brainstorm)/i.test(lowerMessage)) {
    return 0.3; // Low for factual accuracy (Gemini Flash optimized)
  }
  
  // Strategic/advice queries → optimized temperature for Gemini 2.5 Flash (0.4-0.5)
  if (/(how should|what should|recommend|advice|strategy|plan|help me|guide|suggest)/i.test(lowerMessage)) {
    return 0.45; // Optimized for Gemini's structured reasoning
  }
  
  // Creative/brainstorming queries → slightly higher (0.5-0.6) for Gemini Flash
  if (/(creative|brainstorm|idea|think|design|imagine|come up with)/i.test(lowerMessage)) {
    return 0.55; // Balanced creativity for Gemini Flash
  }
  
  // Conversational → optimized for Gemini 2.5 Flash (0.4-0.5)
  if (/(how are you|tell me|explain|help)/i.test(lowerMessage)) {
    return 0.4;
  }
  
  // Use complexity-based default (optimized for Gemini 2.5 Flash)
  if (complexity === 'simple') return 0.35; // Lower for simple queries (faster, more accurate)
  if (complexity === 'complex') return 0.5; // Medium for complex (balanced reasoning, faster)
  return 0.45; // Default optimized for Gemini 2.5 Flash
}

// 💬 Call DeepSeek API directly with streaming support
async function callDeepSeekAPI(
  messages: ChatMessage[],
  model: string,
  temperature: number,
  maxTokens: number,
  requestId: string
): Promise<Response> {
  const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  logInfo('Calling DeepSeek API', {
    requestId,
    model,
    temperature,
    maxTokens,
    messageCount: messages.length
  });

  try {
    const response = await fetchWithRetry(
      'https://api.deepseek.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: true,
          temperature: temperature,
          max_tokens: maxTokens
        }),
        timeout: 30000,
        retryOptions: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 4000,
          backoffMultiplier: 2,
          retryableStatuses: [429, 500, 502, 503, 504],
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logError('DeepSeek API error', {
        requestId,
        status: response.status,
        error: errorText,
        model
      });
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    return response;
  } catch (error: any) {
    logError('DeepSeek API request failed', {
      requestId,
      error: error.message,
      status: error.status,
      timeout: error.timeout,
      model
    });
    throw error;
  }
}

// 💬 Create Lovable AI stream response with intelligent routing
async function createAIStream(messages: ChatMessage[], userMessage: string, conversation: any, businessContext: BusinessContext, conversationHistory: ChatMessage[], chatMode: string, supabase: any, cacheKey?: string, originalMessage?: string): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
  
  const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');

  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 🚀 OPTIMIZATION: Check cache first
  if (cacheKey) {
    const cached = await getCachedResponse(supabase, cacheKey);
    if (cached) {
      logInfo('Cache hit', { requestId, cacheKey, model: cached.model });
      return createCachedStream(cached.content, userMessage, conversation, businessContext, conversationHistory, chatMode, supabase);
    }
  }

  // 🚀 OPTIMIZATION: Detect complexity and select optimal model
  const complexity = detectQueryComplexity(userMessage, businessContext, conversationHistory);
  const { model: selectedModel, strategy, maxTokens, temperature: baseTemperature } = selectOptimalModel(complexity, chatMode);
  
  // 🚀 OPTIMIZATION: Dynamic temperature tuning based on query type
  const finalTemperature = determineTemperature(userMessage, complexity, chatMode);
  
  logInfo('AI request initiated', { 
    requestId,
    complexity, 
    model: selectedModel, 
    maxTokens, 
    temperature: finalTemperature, 
    strategy,
    chatMode,
    messageLength: userMessage.length
  });

  // 🚀 OPTIMIZATION: Use retry logic with exponential backoff and timeout
  let aiResponse: Response;
  
  // Check if DeepSeek model is selected
  const isDeepSeekModel = selectedModel.startsWith('deepseek-');
  
  // #region agent log
  fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatbot-streaming/index.ts:2487',message:'Before API call',data:{model:selectedModel,hasApiKey:!!LOVABLE_API_KEY,isDeepSeek:isDeepSeekModel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  try {
    // Use DeepSeek API directly if DeepSeek model is selected
    if (isDeepSeekModel) {
      aiResponse = await callDeepSeekAPI(messages, selectedModel, finalTemperature, maxTokens, requestId);
    } else {
      // Use Lovable gateway for other models (Gemini, GPT-5, Claude)
      aiResponse = await fetchWithRetry(
        'https://ai.gateway.lovable.dev/v1/chat/completions',
        {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${LOVABLE_API_KEY}`, 
            'Content-Type': 'application/json',
            'X-Request-ID': requestId
          },
          body: JSON.stringify({ 
            model: selectedModel, 
            messages, 
            stream: true, 
            temperature: finalTemperature,
            max_tokens: maxTokens
          }),
          timeout: 30000, // 30 second timeout
          retryOptions: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 4000,
            backoffMultiplier: 2,
            retryableStatuses: [429, 500, 502, 503, 504],
          }
        }
      );
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatbot-streaming/index.ts:2512',message:'API call completed',data:{isOk:aiResponse.ok,status:aiResponse.status,model:selectedModel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatbot-streaming/index.ts:2513',message:'API call exception',data:{errorMessage:error?.message,model:selectedModel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    logError('API request failed after retries', {
      requestId,
      error: error.message,
      status: error.status,
      timeout: error.timeout,
      model: selectedModel
    });

    // Note: Refund will happen after fallback attempts fail (see end of catch block)
    // Try fallback if primary model failed
    const isDeepSeek = selectedModel.startsWith('deepseek-');
    const isGemini = selectedModel.includes('gemini');
    
    // If DeepSeek fails, try Gemini as fallback
    if (isDeepSeek && !isGemini) {
      logWarn('🔍 DEBUG: DeepSeek failed, trying Gemini fallback', { requestId, model: selectedModel });
      try {
        const fallbackModel = 'google/gemini-2.5-flash';
        const fallbackResponse = await fetchWithRetry(
          'https://ai.gateway.lovable.dev/v1/chat/completions',
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              model: fallbackModel, 
              messages, 
              stream: true, 
              temperature: finalTemperature,
              max_tokens: Math.min(maxTokens, 500)
            }),
            timeout: 30000,
            retryOptions: {
              maxAttempts: 2,
              initialDelay: 1000,
              maxDelay: 2000,
            }
          }
        ).catch(() => null);
        
        if (fallbackResponse?.ok) {
          logInfo('🔍 DEBUG: Gemini fallback succeeded after DeepSeek failure', { requestId });
          const reader = fallbackResponse.body?.getReader();
          if (reader) {
            return new Response(
              new ReadableStream({
                async start(controller) {
                  try {
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      controller.enqueue(value);
                    }
                    controller.close();
                  } catch (error) {
                    controller.error(error);
                  }
                }
              }),
              {
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  'Connection': 'keep-alive'
                }
              }
            );
          }
        }
      } catch (fallbackError: any) {
        logError('🔍 DEBUG: Gemini fallback also failed', { requestId, error: fallbackError?.message });
      }
    }

    // Refund credits if all AI API attempts failed (including fallbacks) and credits were charged
    // This runs only if we reach here (fallbacks failed or didn't apply)
    const shouldRefund = conversation.user_id && conversation.chat_mode !== 'tour-guide';
    if (shouldRefund) {
      try {
        const creditCost = CREDIT_COSTS.AI_CHAT_MESSAGE;
        await refundCredits(
          conversation.user_id,
          creditCost,
          'AI Chat Message',
          'Refund: AI processing failed after all retry attempts',
          { error: error.message, model: selectedModel, requestId }
        );
        logInfo('💸 Refunded credits due to AI API failure', { userId: conversation.user_id, amount: creditCost, requestId });
      } catch (refundError) {
        logError('Failed to refund credits', { error: refundError, userId: conversation.user_id });
      }
    }

    // Return user-friendly error message
    const errorMessage = error.timeout
      ? "I'm taking longer than usual to respond. Please try again in a moment."
      : error.status === 429
      ? "I'm receiving too many requests right now. Please wait a moment and try again."
      : "I encountered an error processing your request. Please try again.";

    return new Response(
      JSON.stringify({ error: errorMessage, requestId }),
      {
        status: error.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  if (!aiResponse.ok) {
    const err = await aiResponse.text();
    const status = aiResponse.status;
    
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatbot-streaming/index.ts:2538',message:'API response not OK',data:{status,model:selectedModel,errorPreview:err.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // 🚀 OPTIMIZATION: Enhanced error handling for all HTTP status codes
    const errorMessages: Record<number, string> = {
      400: "I couldn't understand your request. Please try rephrasing your question.",
      401: "Authentication error. Please contact support.",
      403: "Access denied. Please check your permissions.",
      404: "The requested service is not available. Please try again later.",
      429: "I'm receiving too many requests right now. Please wait a moment and try again.",
      500: "I encountered a server error. Please try again in a moment.",
      502: "The service is temporarily unavailable. Please try again shortly.",
      503: "The service is temporarily overloaded. Please try again in a moment.",
      504: "The request timed out. Please try again.",
    };
    
    const userMessage = errorMessages[status] || "I encountered an error processing your request. Please try again.";
    
    logError('🔍 DEBUG: API response error', { 
      requestId,
      status,
      error: err,
      model: selectedModel,
      userMessage,
      fullError: err
    });
    
    // 🚀 OPTIMIZATION: Fallback chain - Gemini → DeepSeek → GPT-5 → Claude
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatbot-streaming/index.ts:2565',message:'API error detected',data:{selectedModel,status,isModelNotFound:status===400||status===404,errorPreview:err.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const isGPT5 = selectedModel === 'openai/gpt-5-2025-08-07' || selectedModel.includes('gpt-5');
    const isDeepSeek = selectedModel.startsWith('deepseek-');
    const isGemini = selectedModel.includes('gemini');
    const isModelNotFound = status === 400 || status === 404;
    
    // For model not found errors, skip error return and go straight to fallback
    if (isModelNotFound && (isGPT5 || isDeepSeek)) {
      logWarn('🔍 DEBUG: Model not found, falling back', { requestId, model: selectedModel, status, error: err.substring(0, 300) });
    } else if ([400, 401, 403, 404, 402].includes(status) && !isGPT5 && !isDeepSeek) {
      // Refund credits before returning error
      const shouldRefund = conversation.user_id && conversation.chat_mode !== 'tour-guide';
      if (shouldRefund) {
        try {
          const creditCost = CREDIT_COSTS.AI_CHAT_MESSAGE;
          await refundCredits(
            conversation.user_id,
            creditCost,
            'AI Chat Message',
            'Refund: AI API returned error status',
            { error: err, status, model: selectedModel, requestId }
          );
          logInfo('💸 Refunded credits due to AI API error response', { userId: conversation.user_id, amount: creditCost, status });
        } catch (refundError) {
          logError('Failed to refund credits', { error: refundError, userId: conversation.user_id });
        }
      }

      // Only return error immediately for non-GPT-5/DeepSeek models
      return new Response(
        JSON.stringify({ error: userMessage, requestId }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 🚀 OPTIMIZATION: Fallback chain - try next model in sequence
    logWarn('🔍 DEBUG: Model failed, trying fallback', { requestId, model: selectedModel, status, error: err.substring(0, 300) });
    
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatbot-streaming/index.ts:2574',message:'Attempting fallback',data:{selectedModel,status,isGPT5,isDeepSeek,isGemini},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Fallback chain: Gemini → DeepSeek → GPT-5 → Claude
    let fallbackModel: string | null = null;
    let fallbackResponse: Response | null = null;
    
    // If Gemini fails, try DeepSeek
    if (isGemini && DEEPSEEK_API_KEY) {
      fallbackModel = 'deepseek-chat';
      logInfo('🔍 DEBUG: Falling back to DeepSeek', { requestId, originalModel: selectedModel, fallbackModel, reason: 'Gemini failed' });
      
      try {
        fallbackResponse = await callDeepSeekAPI(messages, fallbackModel, finalTemperature, Math.min(maxTokens, 500), requestId);
      } catch (deepSeekError: any) {
        logError('🔍 DEBUG: DeepSeek fallback failed', { requestId, error: deepSeekError?.message });
        fallbackResponse = null;
      }
    }
    
    // If DeepSeek fails or wasn't available, try GPT-5
    if (!fallbackResponse?.ok && !isGPT5) {
      fallbackModel = 'openai/gpt-5-2025-08-07';
      logInfo('🔍 DEBUG: Falling back to GPT-5', { requestId, originalModel: selectedModel, fallbackModel });
      
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatbot-streaming/index.ts:2580',message:'Fallback to GPT-5 initiated',data:{fallbackModel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      try {
        fallbackResponse = await fetchWithRetry(
          'https://ai.gateway.lovable.dev/v1/chat/completions',
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              model: fallbackModel, 
              messages, 
              stream: true, 
              temperature: finalTemperature,
              max_tokens: Math.min(maxTokens, 500)
            }),
            timeout: 30000,
            retryOptions: {
              maxAttempts: 2,
              initialDelay: 1000,
              maxDelay: 2000,
            }
          }
        ).catch((fallbackError) => {
          logError('🔍 DEBUG: GPT-5 fallback failed', { requestId, fallbackError: fallbackError?.message });
          return null;
        });
      } catch (gpt5Error: any) {
        logError('🔍 DEBUG: GPT-5 fallback exception', { requestId, error: gpt5Error?.message });
        fallbackResponse = null;
      }
    }
    
    // If GPT-5 fails, try Gemini as final fallback
    if (!fallbackResponse?.ok && !isGemini) {
      fallbackModel = 'google/gemini-2.5-flash';
      logInfo('🔍 DEBUG: Falling back to Gemini Flash', { requestId, originalModel: selectedModel, fallbackModel, reason: 'Previous fallback failed' });
      
      try {
        fallbackResponse = await fetchWithRetry(
          'https://ai.gateway.lovable.dev/v1/chat/completions',
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              model: fallbackModel, 
              messages, 
              stream: true, 
              temperature: finalTemperature,
              max_tokens: Math.min(maxTokens, 500)
            }),
            timeout: 30000,
            retryOptions: {
              maxAttempts: 2,
              initialDelay: 1000,
              maxDelay: 2000,
            }
          }
        ).catch((fallbackError) => {
          logError('🔍 DEBUG: Gemini fallback failed', { requestId, fallbackError: fallbackError?.message });
          return null;
        });
      } catch (geminiError: any) {
        logError('🔍 DEBUG: Gemini fallback exception', { requestId, error: geminiError?.message });
        fallbackResponse = null;
      }
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/7f5d4e2e-0919-470e-91bc-f49c54e31856',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatbot-streaming/index.ts:2602',message:'Fallback response received',data:{hasResponse:!!fallbackResponse,isOk:fallbackResponse?.ok,status:fallbackResponse?.status,fallbackModel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (fallbackResponse?.ok) {
      logInfo('🔍 DEBUG: Fallback succeeded', { requestId, fallbackModel });
      const reader = fallbackResponse.body?.getReader();
      if (reader) {
        return new Response(
          new ReadableStream({
            async start(controller) {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                }
                controller.close();
              } catch (error) {
                controller.error(error);
              }
            }
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          }
        );
      }
    }
    
    // If all fallbacks fail, throw error
    throw new Error(`AI Error: ${aiResponse.status} - ${err}`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = aiResponse.body?.getReader();
      if (!reader) { controller.close(); return; }
      
      const decoder = new TextDecoder();
      let fullMessage = '';
      let buffer = '';
      let firstTokenReceived = false;
      let timeToFirstToken: number | null = null;
      const startTime = Date.now();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // 🚀 OPTIMIZATION: Process buffer more efficiently with immediate streaming
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            
            // Process all available complete lines immediately (don't wait for full buffer)
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              
              if (!line.trim() || line.startsWith(':') || !line.startsWith('data: ')) continue;
              
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  if (!firstTokenReceived) {
                    firstTokenReceived = true;
                    timeToFirstToken = Date.now() - startTime;
                    console.log(`⚡ First token received in ${timeToFirstToken}ms`);
                    // 🚀 OPTIMIZATION: Stream first token immediately without delay
                  }
                  fullMessage += content;
                  // 🚀 OPTIMIZATION: Enqueue immediately without batching for fastest streaming
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'delta', content })}\n\n`));
                }
              } catch (e) {
                // Ignore parse errors for malformed JSON
              }
            }
          }
        }

        // 🚀 OPTIMIZATION: Post-process and validate response
        let processedMessage = fullMessage;
        const quality = scoreResponseQuality(fullMessage, userMessage, businessContext);
        
        // Log quality metrics
        const latency = Date.now() - startTime;
        logInfo('Response quality scored', {
          requestId,
          qualityScore: quality.score,
          completeness: quality.completeness,
          relevance: quality.relevance,
          actionability: quality.actionability,
          structure: quality.structure,
          latency,
          messageLength: fullMessage.length,
          issues: quality.issues,
          model: selectedModel
        });
        
        // Track DeepSeek performance for comparison
        if (selectedModel.startsWith('deepseek-')) {
          logInfo('DeepSeek performance metrics', {
            requestId,
            model: selectedModel,
            latency,
            messageLength: fullMessage.length,
            qualityScore: quality.score,
            timeToFirstToken: timeToFirstToken
          });
        }
        
        // If quality is low, try to improve it
        if (quality.score < 0.6 && quality.issues.length > 0) {
          logWarn('Low quality response detected, attempting post-processing', {
            requestId,
            qualityScore: quality.score,
            issues: quality.issues
          });
          processedMessage = postProcessResponse(fullMessage);
          
          // Re-score after post-processing
          const newQuality = scoreResponseQuality(processedMessage, userMessage, businessContext);
          if (newQuality.score > quality.score) {
            logInfo('Post-processing improved quality', {
              requestId,
              oldScore: quality.score,
              newScore: newQuality.score
            });
            fullMessage = processedMessage;
          }
        }
        
        // Validate structure
        const validation = validateResponseStructure(fullMessage);
        if (!validation.valid) {
          logWarn('Response structure validation failed', {
            requestId,
            issues: validation.issues,
            qualityScore: quality.score
          });
        }
        
        // 🚀 OPTIMIZATION: Save to cache and DB in background (non-blocking)
        if (cacheKey && fullMessage) {
          const ttl = getCacheTTL(userMessage, chatMode);
          saveSharedResponseCache(supabase, cacheKey, fullMessage, selectedModel, originalMessage || userMessage, businessContext, ttl).catch(() => {});
        }
        
        // Background: Save message, update context, and log metrics
        queueMicrotask(async () => {
          try {
            const updatedContext = await extractBusinessContext(userMessage, fullMessage, businessContext);
            const stage = determineConversationStage(updatedContext, conversationHistory.length);
            const tokenCount = fullMessage.split(/\s+/).length; // Approximate token count
            
            await Promise.all([
              supabase.from('chatbot_messages').insert({
                conversation_id: conversation.id,
                role: 'assistant',
                content: fullMessage,
                metadata: { 
                  timestamp: new Date().toISOString(), 
                  streaming: true,
                  quality: quality.score,
                  requestId,
                  model: selectedModel,
                  latency,
                  tokenCount
                }
              }),
              supabase.from('chatbot_conversations').update({
                business_context: updatedContext,
                conversation_stage: stage,
                updated_at: new Date().toISOString()
              }).eq('id', conversation.id)
            ]);
            
            // Track quality and performance metrics
            await Promise.all([
              trackQualityMetrics(supabase, requestId, quality, latency, selectedModel, chatMode),
              trackPerformanceMetrics(supabase, requestId, latency, tokenCount, selectedModel, false, 0)
            ]);
          } catch (e) {
            logError('Background save error', { requestId, error: e.message });
          }
        });

        // Complete
        const stage = determineConversationStage(businessContext, conversationHistory.length);
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ type: 'complete', conversationId: conversation.id, quickActions: generateQuickActions(stage, chatMode, userMessage) })}\n\n`
        ));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      } catch (e) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
