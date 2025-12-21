import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAndDeductCredits } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { logInfo, logWarn, logError } from '../_shared/logger.ts';
import { fetchWithRetry } from '../_shared/api-retry.ts';
import { getCachedResponse, saveResponseCache as saveSharedResponseCache, getCacheTTL } from '../_shared/cache.ts';
import { validateResponseStructure, scoreResponseQuality, postProcessResponse, extractStructuredResponse } from '../_shared/response-validator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== INLINED TEMPLATE MATCHING (avoiding import issues) ==========
interface Template {
  patterns: RegExp[];
  response: string;
  quickActions?: Array<{text: string, id: string}>;
  context?: string[];
}

const templates: Template[] = [
  // Greetings
  {
    patterns: [/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)[\s!.,]*$/i],
    response: "Hi there! 👋 I'm BizMap AI, your business planning co-founder. I'm here to help you turn your idea into a launch-ready plan. What business idea are you working on?",
    quickActions: [
      { text: "I have a business idea", id: "start_planning" },
      { text: "Tell me about BizMap AI", id: "ask_about_bizmap" },
      { text: "How does this work?", id: "ask_how_it_works" }
    ]
  },
  
  // What is BizMap AI
  {
    patterns: [/what (is|does) (bizmap|biz map|this)/i, /tell me about (bizmap|biz map|this)/i, /explain (bizmap|biz map)/i],
    response: "BizMap AI is your AI co-founder that guides you through creating a complete business plan in 7 steps. I'll help you:\n\n• Validate your business idea\n• Define your target market\n• Plan your MVP\n• Create a launch strategy\n• Set pricing and goals\n\nReady to start? Just share your business idea!",
    quickActions: [
      { text: "Start planning", id: "start_planning" },
      { text: "See an example", id: "see_example" },
      { text: "How long does it take?", id: "ask_duration" }
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
      chatMode = 'wizard',
      attachments = []
    } = await req.json();

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
      return routeToStructuredSystem(req, supabase, sessionId, message, userId);
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
          user_id: userId,
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
    const matchedTemplate = matchTemplate(message, businessContext);
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
      generateRequestFingerprint(message, businessContext, conversationHistory),
      generateCacheKey(message, businessContext, conversationHistory, chatMode)
    ]);

    // Check request deduplication cache (in-memory, fast)
    // Note: We don't cache Response objects as they're streams that can only be consumed once
    // Request deduplication is handled by the requestFingerprint check above

    // Check response cache (DB query)
    const cachedResponse = await checkResponseCache(supabase, cacheKey, message);
    if (cachedResponse) {
      logInfo('Cache hit - returning cached response', { cacheKey });
      // User message save is already in progress, return immediately
      const response = createCachedStream(cachedResponse, message, conversation, businessContext, conversationHistory, chatMode, supabase);
      // Don't cache Response objects - they're streams that can only be consumed once
      return response;
    }

    // 💳 CREDIT DEDUCTION: Check and deduct credits for authenticated users
    // Tour-guide mode is free for everyone to encourage exploration and signups
    const shouldChargeCredits = userId !== null && chatMode !== 'tour-guide';
    
    if (shouldChargeCredits) {
      const creditCost = CREDIT_COSTS.AI_CHAT_MESSAGE;
      const creditCheck = await checkAndDeductCredits(
        userId,
        creditCost,
        'AI Chat Message',
        conversation.id,
        { chatMode, messageLength: message.length }
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
        ? fetchRAGData(supabase, [], userId, businessContext, conversation?.id)
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
      await saveResponseCache(supabase, cacheKey, webSearchData.answer, 'web-search', webSearchData.model || 'perplexity', message, businessContext);
      return response;
    }
    
    // For hybrid queries, merge RAG and web search if both available
    if (searchIntent === 'hybrid' && webSearchData?.success && (ragData?.answer || webSearchData.answer)) {
      const mergedData = mergeSearchResults(ragData, webSearchData);
      const response = createMergedSearchStream(mergedData, message, conversation, businessContext, optimizedHistory, chatMode, supabase);
      await saveResponseCache(supabase, cacheKey, mergedData.answer, 'hybrid-search', mergedData.model || 'hybrid', message, businessContext);
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
      const ragModel = ragData.model || 'anthropic/claude-sonnet-4-20250514';
      await saveResponseCache(supabase, cacheKey, ragData.answer, 'rag-chat', ragModel, message, businessContext);
      // Don't cache Response objects - they're streams that can only be consumed once
      return response;
    }

    logInfo('Using conversational Lovable AI', { chatMode, messageLength: message.length });
    logInfo('🔍 DEBUG: Before createAIStream', { messageCount: messages.length });
    const response = await createAIStream(messages, message, conversation, businessContext, optimizedHistory, chatMode, supabase, cacheKey, message);
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
async function generateRequestFingerprint(message: string, businessContext: BusinessContext, conversationHistory: ChatMessage[]): Promise<string> {
  const contextStr = JSON.stringify({
    message: message.toLowerCase().trim(),
    sessionId: businessContext.industry, // Use as session identifier
    timestamp: Math.floor(Date.now() / 1000) // Round to nearest second
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
        model: 'anthropic/claude-sonnet-4-20250514',
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
          await new Promise(r => setTimeout(r, 5)); // Original delay
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
          await new Promise(r => setTimeout(r, 10)); // Original delay
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
    
    return `You are BizMap AI - an expert business strategist and mentor specializing in creative entrepreneurs.

🎯 WIZARD MODE: Step ${currentStepNum}/${totalSteps}
Current Question: "${currentStepInfo?.question || 'Business planning question'}"

YOUR ROLE:
You're guiding the user through the structured 7-step BizMap AI business planning wizard. This is step ${currentStepNum} of ${totalSteps}. You MUST follow the wizard flow and cannot skip steps or allow freeform conversation.

CRITICAL RULES:
- You are in WIZARD MODE - you MUST follow the 7-step timeline
- Focus ONLY on the current step's question
- Do NOT allow freeform discussion - keep responses focused on the current step
- Once the user answers the current step, acknowledge and move to the next step
- Do NOT answer questions about other steps until you reach them in the wizard flow
${contextString}

RESPONSE PROTOCOL:
You MUST structure responses in this format (even in wizard mode):

Problem: [What challenge they're facing related to current step]
Insight: [Why this matters for their business - show you understand their situation]
Recommendation: [Specific guidance for the current step]
Next Actions: [What they should do next - either complete current step or move to next]

Guidelines:
- Acknowledge their answer positively - Build confidence ("That's a solid start!" or "I love this direction!")
- Extract key insights - Show you understand deeply ("So you're targeting [X] who struggle with [Y]...")
- Ask clarifying follow-up if needed (1 focused question about the CURRENT step only)
- Keep it conversational - 2-3 sentences per section, under 100 words total
- Be encouraging - They're building something amazing
- Move to next step - Once answered, transition to the next wizard step

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
  
  // GTM Strategy mode - Go-To-Market strategy expert with structured questions
  if (chatMode === 'gtm-strategy') {
    return `You are BizMap AI - a Go-To-Market strategy expert specializing in helping creative entrepreneurs plan and execute their market entry.

YOUR ROLE:
Systematically guide users through GTM strategy development by asking structured questions. You MUST ask ONE question at a time and wait for their response before moving to the next topic.

GTM STRATEGY FRAMEWORK - Ask questions in this EXACT order:
1. Customer Segmentation - "Who are your target customer segments? Describe the different groups of people who would buy your product."
2. Buyer Personas - "For your primary segment, create a detailed buyer persona. What are their demographics, pain points, goals, and behaviors?"
3. Positioning - "How do you want to be positioned in the market? What makes you different from competitors?"
4. Pricing Strategy - "What's your pricing model? How did you arrive at this price point?"
5. Distribution Channels - "How will customers discover and purchase your product? What channels will you use?"
6. Marketing Tactics - "What specific marketing tactics will you use to acquire customers? List 3-5 tactics."
7. Sales Process - "How will you convert leads to customers? Describe your sales funnel."
8. Launch Plan - "What's your launch timeline? When and how will you go to market?"
9. KPIs & Metrics - "How will you measure success? What are your key performance indicators?"
${contextString}

RESPONSE PROTOCOL:
You MUST structure responses in this format:

Problem: [What GTM challenge they're facing at this step]
Insight: [Why this step matters for their go-to-market strategy]
Recommendation: [Specific guidance for answering the current question]
Next Actions: [The current question they need to answer, then move to next step]

- Ask ONE question at a time from the framework above
- Wait for user's complete answer before moving to next question
- Acknowledge their answer, extract key insights, then ask the next question
- Be conversational but structured (2-3 sentences per section, 80 words max total)
- Use GTM-specific terminology (CAC, LTV, conversion funnel, etc.)
- Provide brief context for why each question matters

HALLUCINATION PREVENTION:
• Don't fabricate market data or competitor information
• If asked about specific benchmarks, provide ranges with sources: "CAC typically ranges $X-$Y for [industry] [Source 1]"
• Focus on strategic guidance based on their answers, not made-up statistics

DO NOT:
- Ask multiple questions at once
- Skip ahead in the framework
- Allow freeform discussion without structure
- Move to next question until current one is answered
- Provide long explanations - keep it brief and focused

EXAMPLE FLOW:
You: "Let's build your Go-To-Market strategy. First, who are your target customer segments? Describe the different groups of people who would buy your product."

[User responds]

You: "Great! You've identified [X] segments. Now, let's create a detailed buyer persona for your primary segment. What are their demographics, pain points, goals, and behaviors?"

[Continue through all 9 questions systematically]

Think like a seasoned GTM strategist who's launched multiple products. Be practical, data-driven, and action-oriented.`;
  }
  
  // Freeform mode - advanced AI co-founder with enhanced reasoning
  return `You are BizMap AI - an expert business strategist, advisor, and AI co-founder for creative entrepreneurs.

🧠 ADVANCED REASONING MODE: You can think deeply about complex business problems.
${contextString}

YOUR EXPERTISE:
• Business Model Design - Canvas, Lean, Value Proposition
• Market Analysis - TAM/SAM/SOM, Competitive Intelligence, Customer Segmentation
• Financial Planning - Revenue Models, Unit Economics, Burn Rate, Runway
• Go-to-Market Strategy - Positioning, Messaging, Channel Strategy, Growth Hacking
• Product Strategy - MVP Definition, Feature Prioritization, Product-Market Fit
• Creative Industries - Design, Media, Content, SaaS, Marketplaces

CRITICAL: RESPONSE FORMAT REQUIREMENT
You MUST structure ALL responses in this exact format:

Problem: [What challenge or issue the founder is facing - be specific]
Insight: [Why this matters, what data/trends show, or strategic context - cite sources when providing facts]
Recommendation: [Specific, actionable advice tailored to their situation]
Next Actions: [Concrete steps they can take immediately - use bullet points, not numbered lists]

QUALITY STANDARDS:
- Provide specific, actionable advice with concrete examples and numbers when possible
- Break down complex concepts into clear, understandable steps
- Use real-world examples and analogies to illustrate points
- Prioritize practical, implementable solutions over theoretical concepts
- Tailor advice to the user's specific industry, stage, and context
- Be concise but comprehensive - cover the essentials without overwhelming
- Use clear, direct language - avoid jargon unless necessary, then explain it

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

FEW-SHOT EXAMPLES (Follow these exact patterns):

Example 1 - Market Validation:
User: "How do I know if people want my product?"

Problem: Building a product without confirming market demand risks creating something nobody wants.
Insight: According to CB Insights [Source 1], 70% of startup failures are due to lack of market need. For SaaS specifically, validation before building reduces failure risk by 60% [Source 2].
Recommendation: Run a 2-week validation sprint: Create a landing page describing your solution, interview 10 target customers asking "What's your biggest pain with [problem]?", and offer pre-sales at 50% discount to gauge willingness to pay.
Next Actions:
- Today: Set up landing page (use Carrd or Webflow, ~2 hours)
- This week: Find 10 customers via LinkedIn/communities
- Next week: Conduct interviews and analyze results

Example 2 - Pricing Strategy:
User: "What should I charge?"

Problem: Pricing too high or too low can kill your business before it starts.
Insight: For SaaS tools in North America, monthly pricing typically ranges $15–$50 per user based on similar B2B software [Source 1]. The price where 60%+ of test customers choose it is usually the sweet spot.
Recommendation: Test 3 price points with 5 potential customers each. Ask: "Which would you choose: $X, $Y, or $Z?" The price with 60%+ selection is your starting point.
Next Actions:
- Create 3 pricing options based on your cost structure
- Survey 5 potential customers this week
- Analyze results and set initial price

Example 3 - Launch Strategy:
User: "Where should I launch?"

Problem: Launching everywhere dilutes your efforts and wastes resources.
Insight: Recent data shows [channel] has 30% higher conversion for [industry] startups [Source 1]. Focusing on ONE channel first allows you to master it before expanding.
Recommendation: Start where your customers already gather. If they're on LinkedIn, post there. If they're in Facebook groups, engage there. Pick ONE channel, master it, then expand.
Next Actions:
- Identify where your ideal customers spend time (this week)
- Create content for that ONE channel
- Post consistently for 2 weeks, then analyze engagement

REASONING FRAMEWORK:
When answering complex questions, use this approach:
- Understand: Clarify the core business challenge
- Analyze: Break down key factors and dependencies (cite sources when providing facts)
- Synthesize: Provide actionable recommendations
- Validate: Suggest how to test assumptions

RESPONSE STYLE:
- ALWAYS use the Problem → Insight → Recommendation → Next Actions format
- Be conversational but structured (2-4 sentences per section)
- Provide specific, actionable advice with numbers/examples
- Reference best practices from successful businesses
- Build confidence while being realistic
- Use the reasoning framework for complex questions
- Always cite sources when providing facts, statistics, or current information
- Use bullet points for lists, not numbered lists or bold formatting
- Avoid using ** for emphasis - use clear, direct language instead

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
        { text: "What is BizMap AI?", id: "ask_bizmap" },
        { text: "What is Insighta?", id: "ask_insighta" },
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
      { text: "Try BizMap AI", id: "navigate_bizmap" },
      { text: "Try Insighta", id: "navigate_insighta" },
      { text: "View pricing", id: "navigate_pricing" }
    ];
  }
  
  // GTM Strategy mode suggestions
  if (chatMode === 'gtm-strategy') {
    // Context-aware GTM quick actions based on conversation stage
    if (stage === 'discovery' || stage === 'exploration') {
      return [
        { text: "Define customer segments", id: "gtm_segments" },
        { text: "Create buyer personas", id: "gtm_personas" },
        { text: "Develop positioning", id: "gtm_positioning" }
      ];
    }
    if (stage === 'validation' || stage === 'planning') {
      return [
        { text: "Set pricing strategy", id: "gtm_pricing" },
        { text: "Plan distribution channels", id: "gtm_channels" },
        { text: "Marketing tactics", id: "gtm_tactics" }
      ];
    }
    if (stage === 'execution' || stage === 'refinement') {
      return [
        { text: "Launch timeline", id: "gtm_launch" },
        { text: "Define KPIs", id: "gtm_kpis" },
        { text: "Review strategy", id: "gtm_review" }
      ];
    }
    // Default GTM actions
    return [
      { text: "Customer segmentation", id: "gtm_segments" },
      { text: "Pricing strategy", id: "gtm_pricing" },
      { text: "Launch planning", id: "gtm_launch" }
    ];
  }
  
  // Business planning mode suggestions
  switch (stage) {
    case 'discovery':
      return [
        { text: "Tell me about BizMap AI", id: "ask_bizmap" },
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
        for (let i = 0; i < words.length; i++) {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'delta', content: (i === 0 ? '' : ' ') + words[i] })}\n\n`
          ));
          await new Promise(r => setTimeout(r, 20)); // Balanced delay for smooth streaming
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
        // Stream answer word by word
        const words = answer.split(' ');
        for (let i = 0; i < words.length; i++) {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'delta', content: (i === 0 ? '' : ' ') + words[i] })}\n\n`
          ));
          await new Promise(r => setTimeout(r, 20));
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
        // Stream answer word by word
        const words = answer.split(' ');
        for (let i = 0; i < words.length; i++) {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'delta', content: (i === 0 ? '' : ' ') + words[i] })}\n\n`
          ));
          await new Promise(r => setTimeout(r, 20));
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
  // Tour guide mode always uses fast model (keep Gemini for speed)
  if (chatMode === 'tour-guide') {
    return { 
      model: 'google/gemini-2.5-flash', 
      strategy: 'speed',
      maxTokens: 100,
      temperature: 0.4
    };
  }
  
  // GTM Strategy mode → use Claude Sonnet 4 for superior reasoning and structured output
  if (chatMode === 'gtm-strategy') {
    return { 
      model: 'anthropic/claude-sonnet-4-20250514', 
      strategy: 'quality',
      maxTokens: 700,
      temperature: 0.6
    };
  }
  
  // Planning mode (wizard) → use Claude Sonnet 4 for superior logical consistency and context retention
  if (chatMode === 'wizard') {
    // All queries use Claude Sonnet 4 with complexity-based token limits
    if (complexity === 'complex') {
      return { 
        model: 'anthropic/claude-sonnet-4-20250514', 
        strategy: 'quality',
        maxTokens: 800,
        temperature: 0.6
      };
    }
    
    // Simple queries → Claude Sonnet 4 with lower token limit
    if (complexity === 'simple') {
      return { 
        model: 'anthropic/claude-sonnet-4-20250514', 
        strategy: 'quality',
        maxTokens: 200,
        temperature: 0.5
      };
    }
    
    // Moderate queries → Claude Sonnet 4
    return { 
      model: 'anthropic/claude-sonnet-4-20250514', 
      strategy: 'quality',
      maxTokens: 400,
      temperature: 0.6
    };
  }
  
  // Freeform mode and other modes → use Claude Sonnet 4 for superior quality and context retention
  if (complexity === 'simple') {
    return { 
      model: 'anthropic/claude-sonnet-4-20250514', 
      strategy: 'quality',
      maxTokens: 200,
      temperature: 0.5
    };
  }
  
  // Complex queries → Claude Sonnet 4 for best quality and reasoning
  if (complexity === 'complex') {
    return { 
      model: 'anthropic/claude-sonnet-4-20250514', 
      strategy: 'quality',
      maxTokens: 800,
      temperature: 0.6
    };
  }
  
  // Moderate → Claude Sonnet 4 for balanced quality
  return { 
    model: 'anthropic/claude-sonnet-4-20250514', 
    strategy: 'quality',
    maxTokens: 400,
    temperature: 0.6
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

// 🚀 OPTIMIZATION: Dynamic temperature based on query type (optimized for accuracy)
function determineTemperature(message: string, complexity: 'simple' | 'moderate' | 'complex', chatMode: string): number {
  const lowerMessage = message.toLowerCase();
  
  // Factual queries → very low temperature for accuracy (0.2-0.3)
  if (/^(what|when|where|who|how many|how much|which|list|show|tell me about)/i.test(message) && 
      !/(think|feel|suggest|recommend|creative|strategy|plan|design|idea|brainstorm)/i.test(lowerMessage)) {
    return 0.2; // Very low for factual accuracy
  }
  
  // Strategic/advice queries → medium temperature (0.5-0.6)
  if (/(how should|what should|recommend|advice|strategy|plan|help me|guide|suggest)/i.test(lowerMessage)) {
    return 0.5; // Balanced for strategic advice
  }
  
  // Creative/brainstorming queries → higher temperature (0.7-0.8)
  if (/(creative|brainstorm|idea|think|design|imagine|come up with)/i.test(lowerMessage)) {
    return 0.7; // Higher for creativity
  }
  
  // Conversational → medium temperature (0.5-0.6)
  if (/(how are you|tell me|explain|help)/i.test(lowerMessage)) {
    return 0.5;
  }
  
  // Use complexity-based default (optimized)
  if (complexity === 'simple') return 0.3; // Lower for simple queries (more accurate)
  if (complexity === 'complex') return 0.6; // Medium for complex (balanced reasoning)
  return 0.5; // Default moderate temperature
}

// 💬 Create Lovable AI stream response with intelligent routing
async function createAIStream(messages: ChatMessage[], userMessage: string, conversation: any, businessContext: BusinessContext, conversationHistory: ChatMessage[], chatMode: string, supabase: any, cacheKey?: string, originalMessage?: string): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

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
  try {
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
  } catch (error: any) {
    logError('API request failed after retries', { 
      requestId,
      error: error.message,
      status: error.status,
      timeout: error.timeout,
      model: selectedModel
    });
    
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
    
    logError('API response error', { 
      requestId,
      status,
      error: err,
      model: selectedModel,
      userMessage
    });
    
    // Return error for non-retryable status codes
    if ([400, 401, 403, 404, 402].includes(status)) {
      return new Response(
        JSON.stringify({ error: userMessage, requestId }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 🚀 OPTIMIZATION: Fallback chain - if Claude fails, try Gemini Flash as backup
    logWarn('Model failed, trying fallback', { requestId, model: selectedModel, status });
    
    // If Claude Sonnet 4 fails, fall back to Gemini Flash for reliability
    if (selectedModel === 'anthropic/claude-sonnet-4-20250514') {
      const fallbackModel = 'google/gemini-2.5-flash';
      
      logInfo('Falling back to Gemini Flash', { requestId, originalModel: selectedModel, fallbackModel });
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
            max_tokens: Math.min(maxTokens, 500) // Cap at 500 for fallback
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
                    const timeToFirstToken = Date.now() - startTime;
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
          issues: quality.issues
        });
        
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
