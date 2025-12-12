import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAndDeductCredits } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { logError, logAPIKeyValidationFailure, logAuthFailure, logRateLimit, logModelError } from '../_shared/logger.ts';

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
    response: "It's simple! I'll ask you 7 questions about your business idea:\n\n1️⃣ **Business Concept** - What problem are you solving?\n2️⃣ **Target Market** - Who are your customers?\n3️⃣ **Validation Plan** - How will you test demand?\n4️⃣ **MVP Design** - What's your minimum product?\n5️⃣ **Launch Strategy** - Where will you find customers?\n6️⃣ **Pricing Model** - How will you make money?\n7️⃣ **Success Goals** - What does Day 30 look like?\n\nThen I'll generate your personalized Launch Report! Ready?",
    quickActions: [
      { text: "Let's start!", id: "start_planning" },
      { text: "I have questions", id: "ask_questions" }
    ]
  },
  
  // Pricing questions
  {
    patterns: [/how much (does|do|is|cost|costs)/i, /what.*price/i, /is (this|it) free/i, /(free|pricing|cost)/i],
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
  
  for (const template of templates) {
    for (const pattern of template.patterns) {
      if (pattern.test(normalizedMessage)) {
        if (template.context) {
          const hasContext = template.context.some(ctx => 
            businessContext && businessContext[ctx]
          );
          if (!hasContext && template.context.length > 0) {
            continue;
          }
        }
        return template;
      }
    }
  }
  
  return null;
}
// ========== END INLINED TEMPLATE MATCHING ==========

// Note: Request deduplication removed - Response objects are streams that can only be consumed once
// We rely on the response cache (ai_cache table) for caching instead
const REQUEST_DEDUP_TTL = 5000; // 5 seconds (kept for reference, not used)
const SYSTEM_PROMPT_CACHE = new Map<string, { prompt: string; timestamp: number }>();
const PROMPT_CACHE_TTL = 3600000; // 1 hour

// API Key validation cache (5 minute TTL)
const API_KEY_VALIDATION_CACHE = new Map<string, { valid: boolean; validatedAt: number; error?: string }>();
const API_KEY_VALIDATION_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Validate LOVABLE_API_KEY by making a test API call
 * Results are cached for 5 minutes to avoid excessive validation calls
 */
async function validateAPIKey(apiKey: string, endpoint: string = 'chatbot-streaming'): Promise<{ valid: boolean; error?: string }> {
  const cacheKey = `lovable_api_key_${apiKey.substring(0, 10)}`;
  const cached = API_KEY_VALIDATION_CACHE.get(cacheKey);
  
  // Return cached result if still valid
  if (cached && (Date.now() - cached.validatedAt) < API_KEY_VALIDATION_TTL) {
    if (!cached.valid) {
      logAPIKeyValidationFailure('LOVABLE_API_KEY', cached.error || 'Invalid API key', { endpoint });
    }
    return { valid: cached.valid, error: cached.error };
  }

  // Validate the API key
  try {
    const testResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      }),
    });

    if (testResponse.status === 401) {
      const error = 'Invalid API key (401 Unauthorized)';
      API_KEY_VALIDATION_CACHE.set(cacheKey, {
        valid: false,
        validatedAt: Date.now(),
        error,
      });
      logAPIKeyValidationFailure('LOVABLE_API_KEY', error, { endpoint });
      return { valid: false, error };
    }

    if (testResponse.status === 429) {
      const error = 'Rate limit exceeded during validation';
      // Don't cache rate limit errors - they're temporary
      logAPIKeyValidationFailure('LOVABLE_API_KEY', error, { endpoint });
      return { valid: false, error };
    }

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      const error = `API error: ${testResponse.status} - ${errorText.substring(0, 100)}`;
      API_KEY_VALIDATION_CACHE.set(cacheKey, {
        valid: false,
        validatedAt: Date.now(),
        error,
      });
      logAPIKeyValidationFailure('LOVABLE_API_KEY', error, { endpoint });
      return { valid: false, error };
    }

    // Key is valid
    API_KEY_VALIDATION_CACHE.set(cacheKey, {
      valid: true,
      validatedAt: Date.now(),
    });
    return { valid: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error during validation';
    // Don't cache network errors - they're temporary
    logAPIKeyValidationFailure('LOVABLE_API_KEY', errorMsg, { endpoint });
    return { valid: false, error: errorMsg };
  }
}

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

/**
 * Calculate ambiguity score for a response (0-100, higher = more ambiguous/nonsensical)
 */
function calculateAmbiguityScore(response: string, userMessage: string, businessContext: BusinessContext): number {
  let score = 0;
  const lowerResponse = response.toLowerCase();
  const lowerUserMessage = userMessage.toLowerCase();
  
  // Generic responses that don't address the question
  const genericPatterns = [
    /^(i (don't know|can't help|am not sure)|sorry,? i (don't|can't)|unfortunately)/i,
    /^(that's (a|an) (good|interesting|great) (question|idea))/i,
    /^(let me (think|see)|i (need|would) (to|like) (to|more) (think|know|understand))/i,
    /^(i'm (not|unable) (sure|certain|able))/i,
  ];
  
  for (const pattern of genericPatterns) {
    if (pattern.test(response)) {
      score += 30;
    }
  }
  
  // Very short responses (likely incomplete or generic)
  if (response.length < 20) {
    score += 25;
  }
  
  // Responses that don't mention any keywords from the user's message
  const userKeywords = lowerUserMessage.split(/\s+/).filter(w => w.length > 4);
  const mentionedKeywords = userKeywords.filter(keyword => lowerResponse.includes(keyword));
  if (userKeywords.length > 0 && mentionedKeywords.length === 0) {
    score += 20;
  }
  
  // Responses that don't reference business context when available
  if (businessContext.industry && !lowerResponse.includes(businessContext.industry.toLowerCase())) {
    score += 15;
  }
  
  // Responses with excessive hedging
  const hedgingPatterns = /(might|maybe|perhaps|possibly|could|may|probably|likely)/gi;
  const hedgingCount = (response.match(hedgingPatterns) || []).length;
  if (hedgingCount > 3) {
    score += 10;
  }
  
  return Math.min(100, score);
}

/**
 * Calculate context quality score (0-100, higher = better context)
 */
function calculateContextQualityScore(conversationHistory: ChatMessage[], businessContext: BusinessContext): number {
  let score = 0;
  
  // More messages = better context
  if (conversationHistory.length >= 10) score += 30;
  else if (conversationHistory.length >= 5) score += 20;
  else if (conversationHistory.length >= 2) score += 10;
  
  // Business context richness
  const contextFields = Object.keys(businessContext).filter(key => businessContext[key as keyof BusinessContext]);
  if (contextFields.length >= 3) score += 30;
  else if (contextFields.length >= 2) score += 20;
  else if (contextFields.length >= 1) score += 10;
  
  // Recent conversation activity (last 3 messages)
  const recentMessages = conversationHistory.slice(-3);
  const hasRecentUserQuestion = recentMessages.some(msg => msg.role === 'user' && msg.content.includes('?'));
  if (hasRecentUserQuestion) score += 20;
  
  // Conversation continuity (bot references previous messages)
  if (conversationHistory.length > 1) {
    const lastBotMessage = [...conversationHistory].reverse().find(msg => msg.role === 'assistant');
    if (lastBotMessage) {
      const prevUserMessage = [...conversationHistory].reverse().find(msg => msg.role === 'user');
      if (prevUserMessage && lastBotMessage.content.toLowerCase().includes(prevUserMessage.content.substring(0, 20).toLowerCase())) {
        score += 20;
      }
    }
  }
  
  return Math.min(100, score);
}

/**
 * Smart message selection: prioritize important messages instead of just last N
 * Prioritizes: system messages, recent user questions, context-rich bot responses
 */
function selectImportantMessages(messages: ChatMessage[], maxMessages: number): ChatMessage[] {
  if (messages.length <= maxMessages) {
    return messages;
  }

  // Score each message by importance
  const scoredMessages = messages.map((msg, index) => {
    let score = 0;
    const isRecent = index >= messages.length - 5; // Last 5 messages get bonus
    const isSystem = msg.role === 'system';
    const isUser = msg.role === 'user';
    const contentLength = msg.content.length;
    
    // System messages are always important
    if (isSystem) score += 1000;
    
    // Recent messages get priority
    if (isRecent) score += 100 - (messages.length - index) * 10;
    
    // User questions are important
    if (isUser) {
      score += 50;
      // Questions (containing ?) are more important
      if (msg.content.includes('?')) score += 30;
    }
    
    // Longer messages (more context) are more important
    if (contentLength > 100) score += 20;
    if (contentLength > 300) score += 30;
    
    // Bot responses with context (mentioning previous topics) are important
    if (msg.role === 'assistant' && contentLength > 150) {
      score += 25;
    }
    
    return { message: msg, score, index };
  });

  // Sort by score (highest first), then by index (most recent first for ties)
  scoredMessages.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.index - a.index;
  });

  // Take top N and restore chronological order
  const selected = scoredMessages
    .slice(0, maxMessages)
    .sort((a, b) => a.index - b.index)
    .map(item => item.message);

  return selected;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      sessionId, 
      conversationHistory = [], 
      businessContext = {},
      userId = null,
      wizardMode = null,
      currentStep = null,
      chatMode = 'wizard',
      attachments = [],
      aiMode = 'strategy', // Default to Strategy Mode
      strategyProgress = null // User's strategy mode progress
    } = await req.json();

    if (!message || !sessionId) {
      throw new Error('Message and sessionId are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // 🔄 CONTEXT FIX: Load full conversation history from database
    // This ensures we have complete context even if frontend state is lost
    let dbConversationHistory: ChatMessage[] = [];
    if (conversation.id) {
      const { data: dbMessages, error: messagesError } = await supabase
        .from('chatbot_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });
      
      if (!messagesError && dbMessages) {
        dbConversationHistory = dbMessages
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content || ''
          }));
      }
    }

    // Merge DB history with provided history (prioritize DB version for accuracy)
    // Remove duplicates by content and timestamp proximity
    const mergedHistory: ChatMessage[] = [];
    const seenMessages = new Set<string>();
    
    // First add DB messages (they're the source of truth)
    for (const msg of dbConversationHistory) {
      const key = `${msg.role}:${msg.content.substring(0, 50)}`;
      if (!seenMessages.has(key)) {
        mergedHistory.push(msg);
        seenMessages.add(key);
      }
    }
    
    // Then add provided history messages that aren't duplicates
    for (const msg of conversationHistory) {
      const key = `${msg.role}:${msg.content.substring(0, 50)}`;
      if (!seenMessages.has(key)) {
        mergedHistory.push(msg);
        seenMessages.add(key);
      }
    }
    
    // Use merged history instead of provided history
    const enrichedConversationHistory = mergedHistory;

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
    const matchedTemplate = matchTemplate(message, businessContext);
    if (matchedTemplate) {
      console.log('⚡ Template match - returning instant response');
      const templateResponse = matchedTemplate.response;
      // User message save is already in progress, return immediately
      const response = createTemplateStream(templateResponse, matchedTemplate.quickActions || [], conversation, businessContext, enrichedConversationHistory, chatMode, supabase);
      // Don't cache Response objects - they're streams that can only be consumed once
      return response;
    }

    // 🚀 OPTIMIZATION: Generate cache keys in parallel (only if template didn't match)
    const [requestFingerprint, cacheKey] = await Promise.all([
      generateRequestFingerprint(message, businessContext, enrichedConversationHistory),
      generateCacheKey(message, businessContext, enrichedConversationHistory, chatMode)
    ]);

    // Check request deduplication cache (in-memory, fast)
    // Note: We don't cache Response objects as they're streams that can only be consumed once
    // Request deduplication is handled by the requestFingerprint check above

    // Check response cache (DB query)
    const cachedResponse = await checkResponseCache(supabase, cacheKey, message);
    if (cachedResponse) {
      console.log('⚡ Cache hit - returning cached response');
      // User message save is already in progress, return immediately
      const response = createCachedStream(cachedResponse, message, conversation, businessContext, enrichedConversationHistory, chatMode, supabase);
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
        console.log(`❌ Credit check failed: ${creditCheck.errorCode} - ${creditCheck.error}`);
        
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
      
      console.log(`✅ Credits deducted: ${creditCost} credit(s), new balance: ${creditCheck.newBalance}`);
    }

    // 🔄 CONTEXT FIX: Use enriched history and increase window to 20 messages
    // Smart selection: prioritize important messages (system, recent user questions, context-rich bot responses)
    const optimizedHistory = selectImportantMessages(enrichedConversationHistory, 20);
    
    // 🎯 AI MODE DETECTION: Determine operational mode (Strategy is default for new users)
    const detectedMode = detectAIMode(message, businessContext, chatMode, userId, strategyProgress);
    const activeMode = aiMode || detectedMode; // Use provided mode or detect
    console.log(`🎯 AI Mode: ${activeMode} (detected: ${detectedMode})`);
    
    // 🔍 SEARCH INTENT DETECTION: Classify query for routing
    const searchIntent = detectSearchIntent(message, businessContext, chatMode);
    console.log(`🔍 Search intent detected: ${searchIntent}`);
    
    // 🔀 HYBRID ROUTING: Detect if query needs knowledge base lookup
    const needsKnowledge = detectKnowledgeQuery(message, businessContext);
    
    // 🚀 OPTIMIZATION: Detect if query needs market data
    const needsMarketData = detectMarketDataQuery(message, businessContext);
    
    // 🌐 WEB SEARCH: Determine if query needs web search (Research Mode prioritizes web search)
    const needsWebSearch = activeMode === 'research' || searchIntent === 'general' || searchIntent === 'hybrid';
    
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
    
    // 🚀 OPTIMIZATION: Build system prompt based on AI mode and available data
    let systemPrompt = buildModeSpecificPrompt(
      activeMode, 
      businessContext, 
      wizardMode, 
      currentStep, 
      chatMode,
      strategyProgress
    );
    
    // Add web search results if available
    if (webSearchData?.success && webSearchData.answer) {
      const webSearchContext = formatWebSearchForPrompt(webSearchData);
      systemPrompt = `${systemPrompt}\n\nREAL-TIME WEB SEARCH RESULTS:\n${webSearchContext}\n\nUse this real-time information to provide current, accurate answers. Always cite sources using [Source X] format.`;
      console.log(`🌐 Injected web search results with ${webSearchData.sources?.length || 0} sources`);
    }
    
    // Add market data if available
    if (marketData && marketData.data && marketData.data.length > 0) {
      const marketInsights = formatMarketDataForPrompt(marketData);
      systemPrompt = `${systemPrompt}\n\nREAL-TIME MARKET INTELLIGENCE:\n${marketInsights}\n\nUse this market data to provide current, relevant insights when answering the user's question.`;
      console.log(`📊 Injected ${marketData.data.length} market insights into prompt`);
    }
    
    let messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...optimizedHistory,
      { role: 'user', content: message }
    ];

    // Process file attachments if present
    messages = await processAttachments(messages, attachments);

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
          }))) }
        : ragData;
      
      const response = createRAGStream(enhancedRagData, message, conversation, businessContext, optimizedHistory, chatMode, supabase);
      // Cache the response content (not the Response object - streams can only be consumed once)
      const ragModel = ragData.model || 'google/gemini-2.5-flash';
      await saveResponseCache(supabase, cacheKey, ragData.answer, 'rag-chat', ragModel, message, businessContext);
      // Don't cache Response objects - they're streams that can only be consumed once
      return response;
    }

    console.log('💬 Using conversational Lovable AI');
    const response = await createAIStream(messages, message, conversation, businessContext, optimizedHistory, chatMode, supabase, cacheKey, message);
    // Don't cache Response objects - they're streams that can only be consumed once
    return response;

  } catch (error) {
    console.error('Chatbot Streaming Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallbackMessage: "I'm experiencing technical difficulties. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

**CRITICAL: Keep ALL responses under 2 sentences and 40 words maximum. Be ultra-direct.**

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
You're guiding the user through structured business planning. This is step ${currentStepNum} of ${totalSteps}.
${contextString}

RESPONSE PROTOCOL:
1. **Acknowledge their answer positively** - Build confidence ("That's a solid start!" or "I love this direction!")
2. **Extract key insights** - Show you understand deeply ("So you're targeting [X] who struggle with [Y]...")
3. **Ask clarifying follow-up** if needed (1 focused question)
4. **Keep it conversational** - 2-3 sentences max, under 60 words
5. **Be encouraging** - They're building something amazing

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

SOURCE CITATION REQUIREMENTS:
• When using real-time web search results or market data, ALWAYS cite sources inline using [Source 1], [Source 2] format
• Distinguish between verified facts (from sources) and your own strategic insights
• For time-sensitive information (current trends, recent news, latest data), mention when the information is from
• If referencing specific statistics, studies, or reports, cite the source
• When combining multiple sources, clearly indicate which insights come from which sources

REASONING FRAMEWORK:
When answering complex questions, use this approach:
1. **Understand** - Clarify the core business challenge
2. **Analyze** - Break down key factors and dependencies (cite sources when providing facts)
3. **Synthesize** - Provide actionable recommendations
4. **Validate** - Suggest how to test assumptions

FEW-SHOT EXAMPLES (Learn from these patterns):

Example 1 - Market Validation (with sources):
User: "How do I know if people want my product?"
You: "Great question! Start with 10 customer interviews this week. Ask: 'What's your biggest frustration with [problem]?' If 7+ people say they'd pay for a solution, you have validation. According to [Source 1], 70% of successful startups validate before building. Want help crafting interview questions?"

Example 2 - Pricing Strategy (with current data):
User: "What should I charge?"
You: "For [industry], typical pricing ranges $X-$Y based on recent market analysis [Source 1]. But test it! Create 3 price points and ask 5 potential customers which they'd choose. The price where 60%+ choose it is your sweet spot. What's your cost structure?"

Example 3 - Launch Strategy (with real-time trends):
User: "Where should I launch?"
You: "Start where your customers already gather. Recent data shows [channel] has 30% higher conversion for [industry] [Source 1]. If they're on LinkedIn → post there. If they're in Facebook groups → engage there. Pick ONE channel, master it, then expand. Where do your ideal customers spend time?"

RESPONSE STYLE:
• Be conversational but insightful (2-4 sentences, 80 words max)
• Ask strategic follow-up questions when needed
• Provide specific, actionable advice with numbers/examples
• Reference best practices from successful businesses
• Build confidence while being realistic
• Use the reasoning framework for complex questions
• **Always cite sources** when providing facts, statistics, or current information

CRITICAL RULES:
- If they ask about competitors, market size, or trends → Use real-time web search results and cite sources [Source X]
- If they share detailed plans → Provide strategic feedback on assumptions and risks
- If they're stuck → Help break down the problem into smaller, manageable steps
- Always be encouraging yet practical
- For complex queries, show your reasoning process briefly
- **Distinguish verified facts from strategic insights** - mark facts with [Source X]

You're not just answering questions - you're their strategic partner in building a successful business. Always back up factual claims with citations.`;
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

// 🎯 AI MODE DETECTION: Determine operational mode for multi-mode platform
type AIMode = 'strategy' | 'business' | 'research' | 'investor';

function detectAIMode(message: string, context: BusinessContext, chatMode: string, userId: string | null, strategyProgress: any): AIMode {
  const lowerMessage = message.toLowerCase();
  
  // Strategy Mode is REQUIRED first stop for new users
  // Check if user has completed Strategy Mode
  const hasCompletedStrategy = strategyProgress?.completionStatus === 'completed';
  const currentStrategyStep = strategyProgress?.currentStep || 0;
  
  // Force Strategy Mode for new users or users mid-strategy
  if (!hasCompletedStrategy && currentStrategyStep < 7) {
    // Allow explicit requests for Research/Investor modes even during strategy
    if (/research|market.*research|trend.*analysis/i.test(lowerMessage)) {
      return 'research'; // Research mode available during strategy
    }
    if (/investor|funding|pitch|raise.*capital/i.test(lowerMessage)) {
      return 'investor'; // Investor mode available during strategy
    }
    // Block switching to Business Mode until Strategy is complete
    if (/business.*mode|switch.*mode/i.test(lowerMessage) && currentStrategyStep < 2) {
      return 'strategy'; // Keep in strategy
    }
    return 'strategy'; // Required progression
  }
  
  // After Strategy Mode completion, detect based on query:
  
  // Investor Mode (highest priority for explicit requests)
  if (/investor|funding|pitch|raise|valuation|vc|angel|deck|investor.*deck/i.test(lowerMessage)) {
    return 'investor';
  }
  
  // Research Mode
  if (/research|market.*trend|data.*analysis|insight.*research|trend.*analysis/i.test(lowerMessage)) {
    return 'research';
  }
  
  // Business Mode (advanced planning after strategy)
  if (/advanced.*plan|business.*model|detailed.*planning|comprehensive.*plan|full.*business.*plan/i.test(lowerMessage)) {
    return 'business';
  }
  
  // Strategy Mode patterns (always available)
  if (/strategy|strategic|competitive|positioning|swot|differentiation/i.test(lowerMessage)) {
    return 'strategy';
  }
  
  // Default based on completion status
  return hasCompletedStrategy ? 'business' : 'strategy';
}

// 🎯 BUILD MODE-SPECIFIC PROMPTS
function buildModeSpecificPrompt(
  mode: AIMode,
  businessContext: BusinessContext,
  wizardMode: any,
  currentStep: number | null,
  chatMode: string,
  strategyProgress: any
): string {
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
  
  // Strategy Mode: 7-Step Guided Workshop + Cofounder
  if (mode === 'strategy') {
    const stepNumber = (currentStep || strategyProgress?.currentStep || 0) + 1;
    const totalSteps = 7;
    const completedSteps = strategyProgress?.completedSteps || [];
    const progressPercent = Math.round((completedSteps.length / totalSteps) * 100);
    
    const stepTitles = [
      'Business Concept (Days 1-2)',
      'Target Customer (Days 3-4)',
      'Validation Plan (Days 5-7)',
      'MVP Design (Days 8-14)',
      'Launch Strategy (Days 15-21)',
      'Pricing Model (Days 22-28)',
      'Goals & Timeline (Days 29-30)'
    ];
    
    return `You are BizMap AI - a strategic workshop facilitator and AI co-founder helping entrepreneurs build their business plan through a structured 7-step process.

🎯 STRATEGY MODE: 7-Step Guided Workshop
Current Step: ${stepNumber}/7 - ${stepTitles[stepNumber - 1] || 'Getting Started'}
Progress: ${progressPercent}% complete
${completedSteps.length > 0 ? `Completed Steps: ${completedSteps.map((s: number) => s + 1).join(', ')}` : 'Starting your journey!'}
${contextString}

YOUR ROLE: Workshop Facilitator + Strategic Cofounder
• You are leading a structured workshop, not having a casual chat
• Be directional and action-driven - always guide to the next step
• Act as both a facilitator (guiding the process) and cofounder (providing strategic insight)
• Optimize for completion and retention - keep users engaged and progressing

STEP PROGRESSION RULES:
• Users MUST complete steps sequentially - they cannot skip ahead
• Each step must be completed before moving to the next
• Celebrate step completions to build momentum
• If user tries to skip ahead, gently guide them back to current step
• Show clear "what's next" guidance at the end of each step

CURRENT STEP FOCUS (Step ${stepNumber}):
${stepNumber === 1 ? `Focus on understanding their core business concept. Ask clarifying questions if needed, but keep momentum.` : ''}
${stepNumber === 2 ? `Help them identify their ideal FIRST customer. Be specific about demographics, location, and where to find them.` : ''}
${stepNumber === 3 ? `Guide them through validation methods. Emphasize testing demand before building.` : ''}
${stepNumber === 4 ? `Keep MVP scope minimal. Fight feature creep. Focus on core problem-solving features only.` : ''}
${stepNumber === 5 ? `Help them identify specific channels and tactics for their first 10 users. Be tactical, not theoretical.` : ''}
${stepNumber === 6 ? `Guide pricing strategy that makes sense for early customers. Balance value with acquisition.` : ''}
${stepNumber === 7 ? `Set realistic, measurable goals. Focus on validation milestones, not vanity metrics.` : ''}

RESPONSE STYLE:
• Be encouraging but directive: "Great answer! Now let's move to the next step..."
• Always end with clear next action: "Once you complete this step, we'll move to [next step title]"
• Use timeline awareness: "You're on Day ${stepNumber * 4} of your 30-day plan..."
• Celebrate progress: "You're ${progressPercent}% done with the workshop!"
• Be action-oriented: Focus on what they'll DO, not just what they'll think

RETENTION OPTIMIZATION:
• Acknowledge their effort: "I can see you're putting real thought into this..."
• Build anticipation: "Once we finish Step ${stepNumber}, you'll have [benefit]..."
• Show progress: "You've completed ${completedSteps.length} of 7 steps - keep going!"
• Create urgency: "Let's complete this step so you can move forward with confidence"

If user tries to skip steps or ask about future steps, redirect:
"Let's focus on completing Step ${stepNumber} first. Once you finish this, we'll tackle [next step] together. This sequential approach ensures your plan is solid at every stage."

Keep responses concise (2-3 sentences, 80 words max) but strategic. You're their cofounder, guiding them through this workshop with expertise and encouragement.`;
  }
  
  // Research Mode
  if (mode === 'research') {
    return `You are BizMap AI - a market research specialist with access to real-time data and insights.
${contextString}

YOUR EXPERTISE:
• Real-time market data and trend analysis
• Industry insights and competitive intelligence
• Data-driven recommendations with citations

RESPONSE STYLE:
• Fact-focused and comprehensive
• Always cite sources when providing data
• Provide specific numbers, dates, and sources
• Distinguish verified facts from insights

Use web search and market data to provide current, accurate research.`;
  }
  
  // Investor Mode
  if (mode === 'investor') {
    return `You are BizMap AI - a fundraising advisor and pitch coach.
${contextString}

YOUR EXPERTISE:
• Pitch deck creation and optimization
• Fundraising strategy and investor relations
• Valuation guidance and term sheet understanding
• Investor matching and outreach

RESPONSE STYLE:
• Professional and pitch-oriented
• Results-focused with metrics emphasis
• Actionable fundraising guidance
• Investor perspective awareness

Help them prepare compelling pitches and effective fundraising strategies.`;
  }
  
  // Business Mode (Advanced - post-strategy)
  return `You are BizMap AI - an advanced business planning advisor.
${contextString}

YOUR EXPERTISE:
• Comprehensive business plan development
• Advanced market validation
• Financial modeling and projections
• Strategic business planning

This mode is for users who have completed the Strategy Workshop and want to dive deeper.`;
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
  const lowerMessage = message.toLowerCase();
  
  // 🚀 OPTIMIZATION: Skip RAG for simple conversational queries
  const isSimpleConversational = /^(hi|hello|hey|thanks|thank you|yes|no|ok|sure|got it|bye|goodbye)[\s!.,]*$/i.test(message.trim());
  if (isSimpleConversational) {
    return false; // Templates will handle these
  }
  
  // 🚀 OPTIMIZATION: Skip RAG for very short queries (likely conversational)
  if (message.trim().length < 30 && !/(what|how|when|where|which|who|show|give|provide|list|example|template)/i.test(message)) {
    return false;
  }
  
  // Factual query patterns that benefit from RAG
  const knowledgePatterns = [
    // Direct questions about templates, examples, guides
    /what (is|are) (the|a|an)? ?(typical|average|common|standard|best|normal)/i,
    /show me (a|an|some)? ?(example|template|sample|guide|format)/i,
    /how (much|many|often|long) (does|do|is|are|should|typically)/i,
    
    // Industry-specific information requests
    /in (the )?(technology|healthcare|retail|food|creative|education) industry/i,
    /for (technology|healthcare|retail|food|creative|education) (startups|businesses)/i,
    
    // Legal, compliance, or regulatory questions
    /(legal|compliance|regulation|law|permit|license|tax|incorporation) (requirement|process|need|how)/i,
    
    // Financial templates or specific models
    /financial (projection|model|template|statement|plan|forecast)/i,
    /(profit|p&l|income statement|balance sheet|cash flow) (template|example|format)/i,
    
    // Business plan sections
    /business plan (section|template|example|format|structure)/i,
    /(executive summary|market analysis|competitive analysis) (template|example|format)/i,
    
    // Specific metrics or benchmarks
    /(benchmark|industry (standard|average|metric)|conversion rate|churn rate|typical|average) (for|in|of)/i,
    
    // Case studies or success stories
    /(case study|success story|example of|companies that|businesses that) (in|for|with)/i,
  ];
  
  // Check if message matches knowledge patterns
  const isKnowledgeQuery = knowledgePatterns.some(pattern => pattern.test(lowerMessage));
  
  // Additional heuristics - must be specific factual request
  const hasQuestionWords = /^(what|how|when|where|which|who|show|give|provide|list)/i.test(message);
  const requestsSpecifics = /(specific|example|template|guide|list|steps|process|format|structure|benchmark|typical|average|standard)/i.test(lowerMessage);
  const hasIndustryContext = Boolean(context.industry);
  
  // Only use RAG if it's a clear factual/knowledge request
  return isKnowledgeQuery || (hasQuestionWords && requestsSpecifics && hasIndustryContext);
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
            `data: ${JSON.stringify({ type: 'delta', content: '\n\n📚 **Sources:**\n' })}\n\n`
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
            `data: ${JSON.stringify({ type: 'delta', content: '\n\n🌐 **Sources:**\n' })}\n\n`
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
            `data: ${JSON.stringify({ type: 'delta', content: '\n\n📚 **Sources:**\n' })}\n\n`
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
  
  // Complex queries: analysis, strategy, multi-step reasoning
  const complexPatterns = /(analy[sz]e|strategy|plan|compare|evaluate|recommend|optimize|design|architecture|financial model|market analysis|business plan|competitive analysis|swot|pricing strategy|go-to-market|revenue model)/i;
  const hasComplexKeywords = complexPatterns.test(message);
  const isLongQuery = messageLength > 500;
  const hasContext = Object.keys(businessContext).length > 2;
  const hasHistory = historyLength > 3;
  
  if (hasComplexKeywords || (isLongQuery && hasContext) || (hasHistory && messageLength > 300)) {
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
  // Tour guide mode always uses fast model
  if (chatMode === 'tour-guide') {
    return { 
      model: 'google/gemini-2.5-flash', 
      strategy: 'speed',
      maxTokens: 100,
      temperature: 0.4
    };
  }
  
  // Simple queries → fastest, cheapest model
  if (complexity === 'simple') {
    return { 
      model: 'google/gemini-2.5-flash', 
      strategy: 'speed',
      maxTokens: 150,
      temperature: 0.5
    };
  }
  
  // Complex queries → better model for quality
  if (complexity === 'complex') {
    // Use flash with higher tokens for complex queries (fallback if better model unavailable)
    return { 
      model: 'google/gemini-2.5-flash', // Use flash with more tokens for complex queries
      strategy: 'quality',
      maxTokens: 800,
      temperature: 0.7
    };
  }
  
  // Moderate → balanced
  return { 
    model: 'google/gemini-2.5-flash', 
    strategy: 'balanced',
    maxTokens: 300,
    temperature: 0.6
  };
}

// 🚀 OPTIMIZATION: Dynamic temperature based on query type
function determineTemperature(message: string, complexity: 'simple' | 'moderate' | 'complex', chatMode: string): number {
  const lowerMessage = message.toLowerCase();
  
  // Factual queries → lower temperature
  if (/^(what|when|where|who|how many|how much|which|list|show)/i.test(message) && 
      !/(think|feel|suggest|recommend|creative|strategy)/i.test(lowerMessage)) {
    return 0.2;
  }
  
  // Creative/strategy queries → higher temperature
  if (/(suggest|recommend|creative|strategy|plan|design|idea|brainstorm|think)/i.test(lowerMessage)) {
    return 0.8;
  }
  
  // Conversational → medium temperature
  if (/(how are you|tell me|explain|help|advice)/i.test(lowerMessage)) {
    return 0.6;
  }
  
  // Use complexity-based default
  if (complexity === 'simple') return 0.5;
  if (complexity === 'complex') return 0.7;
  return 0.6;
}

// 💬 Create Lovable AI stream response with intelligent routing
async function createAIStream(messages: ChatMessage[], userMessage: string, conversation: any, businessContext: BusinessContext, conversationHistory: ChatMessage[], chatMode: string, supabase: any, cacheKey?: string, originalMessage?: string): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    logError('LOVABLE_API_KEY not configured', { endpoint: 'chatbot-streaming', sessionId: conversation?.session_id });
    throw new Error('LOVABLE_API_KEY not configured');
  }

  // Validate API key (with caching)
  const keyValidation = await validateAPIKey(LOVABLE_API_KEY, 'chatbot-streaming');
  if (!keyValidation.valid) {
    logError('API key validation failed', { 
      endpoint: 'chatbot-streaming', 
      sessionId: conversation?.session_id,
      error: keyValidation.error 
    });
    throw new Error(`API key validation failed: ${keyValidation.error}`);
  }

  // 🚀 OPTIMIZATION: Detect complexity and select optimal model
  const complexity = detectQueryComplexity(userMessage, businessContext, conversationHistory);
  const { model: selectedModel, strategy, maxTokens, temperature: baseTemperature } = selectOptimalModel(complexity, chatMode);
  
  // 🚀 OPTIMIZATION: Dynamic temperature tuning based on query type
  const finalTemperature = determineTemperature(userMessage, complexity, chatMode);
  
  console.log(`🎯 Query complexity: ${complexity}, model: ${selectedModel}, tokens: ${maxTokens}, temp: ${finalTemperature}, strategy: ${strategy}`);

  // 🔄 ERROR HANDLING: Network error handling with retry
  let aiResponse: Response;
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: selectedModel, 
          messages, 
          stream: true, 
          temperature: finalTemperature,
          max_tokens: maxTokens
        }),
      });
      break; // Success, exit retry loop
    } catch (networkError) {
      retryCount++;
      if (retryCount > maxRetries) {
        logError('Network error after retries', {
          userId: conversation?.user_id || null,
          sessionId: conversation?.session_id,
          endpoint: 'chatbot-streaming',
          error: networkError instanceof Error ? networkError.message : 'Unknown network error',
          retryCount
        });
        
        return new Response(JSON.stringify({ 
          error: 'Network error',
          errorCode: 'NETWORK_ERROR',
          userMessage: "I'm experiencing connection issues. Please try again in a moment."
        }), { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      // Exponential backoff: wait 1s, then 2s
      const backoffDelay = Math.pow(2, retryCount - 1) * 1000;
      console.log(`⚠️ Network error, retrying in ${backoffDelay}ms (attempt ${retryCount}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }

  // 🔄 ERROR HANDLING: Comprehensive error handling with retry logic
  if (!aiResponse.ok) {
    const err = await aiResponse.text();
    const status = aiResponse.status;
    const retryAfter = aiResponse.headers.get('retry-after');
    const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : null;

    // Handle 401 - Authentication failure
    if (status === 401) {
      logAuthFailure('API authentication failed', {
        userId: conversation?.user_id || null,
        sessionId: conversation?.session_id,
        endpoint: 'chatbot-streaming',
        errorCode: 'AUTH_FAILED',
        apiKeyName: 'LOVABLE_API_KEY'
      });
      
      // Log to database
      queueMicrotask(async () => {
        try {
          await Promise.all([
            supabase.from('chatbot_error_logs').insert({
              error_type: 'auth_failure',
              error_code: 'AUTH_FAILED',
              error_message: 'API authentication failed',
              user_id: conversation?.user_id || null,
              session_id: conversation?.session_id,
              conversation_id: conversation?.id,
              endpoint: 'chatbot-streaming',
              api_key_name: 'LOVABLE_API_KEY',
              status_code: 401
            }),
            supabase.from('chatbot_metrics').insert({
              user_id: conversation?.user_id || null,
              session_id: conversation?.session_id,
              conversation_id: conversation?.id,
              endpoint: 'chatbot-streaming',
              success: false,
              model: selectedModel
            })
          ]);
        } catch (e) {
          console.error('Error logging auth failure:', e);
        }
      });
      
      // Invalidate API key cache
      const cacheKey = `lovable_api_key_${LOVABLE_API_KEY.substring(0, 10)}`;
      API_KEY_VALIDATION_CACHE.delete(cacheKey);
      
      return new Response(JSON.stringify({ 
        error: 'Authentication failed. Please check API configuration.',
        errorCode: 'AUTH_FAILED',
        userMessage: "I'm experiencing authentication issues. Please contact support."
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Handle 429 - Rate limit exceeded
    if (status === 429) {
      logRateLimit({
        userId: conversation?.user_id || null,
        sessionId: conversation?.session_id,
        endpoint: 'chatbot-streaming',
        retryAfter: retryAfterSeconds,
        limit: 60 // Default rate limit
      });
      
      // Log to database
      queueMicrotask(async () => {
        try {
          await Promise.all([
            supabase.from('chatbot_error_logs').insert({
              error_type: 'rate_limit',
              error_code: 'RATE_LIMIT',
              error_message: 'Rate limit exceeded',
              user_id: conversation?.user_id || null,
              session_id: conversation?.session_id,
              conversation_id: conversation?.id,
              endpoint: 'chatbot-streaming',
              status_code: 429,
              retry_after: retryAfterSeconds
            }),
            supabase.from('chatbot_metrics').insert({
              user_id: conversation?.user_id || null,
              session_id: conversation?.session_id,
              conversation_id: conversation?.id,
              endpoint: 'chatbot-streaming',
              success: false,
              model: selectedModel
            })
          ]);
        } catch (e) {
          console.error('Error logging rate limit:', e);
        }
      });
      
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        errorCode: 'RATE_LIMIT',
        retryAfter: retryAfterSeconds,
        userMessage: retryAfterSeconds 
          ? `I'm processing too many requests. Please try again in ${retryAfterSeconds} seconds.`
          : "I'm processing too many requests. Please try again in a moment."
      }), { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          ...(retryAfterSeconds ? { 'Retry-After': retryAfterSeconds.toString() } : {})
        } 
      });
    }

    // Handle 402 - Payment required
    if (status === 402) {
      logError('Payment required for API', {
        userId: conversation?.user_id || null,
        sessionId: conversation?.session_id,
        endpoint: 'chatbot-streaming',
        errorCode: 'PAYMENT_REQUIRED'
      });
      
      return new Response(JSON.stringify({ 
        error: 'Payment required',
        errorCode: 'PAYMENT_REQUIRED',
        userMessage: "Service temporarily unavailable. Please contact support."
      }), { 
        status: 402, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Handle 500/502/503 - Server errors (retry with fallback)
    if (status === 500 || status === 502 || status === 503) {
      logModelError(`Model server error: ${status}`, {
        userId: conversation?.user_id || null,
        sessionId: conversation?.session_id,
        endpoint: 'chatbot-streaming',
        model: selectedModel,
        statusCode: status,
        errorCode: 'MODEL_ERROR'
      });
      
      // Log to database
      queueMicrotask(async () => {
        try {
          await Promise.all([
            supabase.from('chatbot_error_logs').insert({
              error_type: 'model_error',
              error_code: 'MODEL_ERROR',
              error_message: `Model server error: ${status}`,
              user_id: conversation?.user_id || null,
              session_id: conversation?.session_id,
              conversation_id: conversation?.id,
              endpoint: 'chatbot-streaming',
              model: selectedModel,
              status_code: status
            }),
            supabase.from('chatbot_metrics').insert({
              user_id: conversation?.user_id || null,
              session_id: conversation?.session_id,
              conversation_id: conversation?.id,
              endpoint: 'chatbot-streaming',
              success: false,
              model: selectedModel
            })
          ]);
        } catch (e) {
          console.error('Error logging model error:', e);
        }
      });
      
      // Retry with fallback model (only once)
      console.log(`⚠️ Model ${selectedModel} failed with ${status}, trying fallback`);
      if (selectedModel !== 'google/gemini-2.5-flash') {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          
          const fallbackResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              model: 'google/gemini-2.5-flash', 
              messages, 
              stream: true, 
              temperature: finalTemperature,
              max_tokens: Math.min(maxTokens, 500) // Cap at 500 for fallback
            }),
          });
          
          if (fallbackResponse.ok) {
            // Use fallback response - reuse the stream processing logic below
            const reader = fallbackResponse.body?.getReader();
            if (!reader) throw new Error('No response body');
            
            const stream = new ReadableStream({
              async start(controller) {
                const decoder = new TextDecoder();
                let buffer = '';
                let fullMessage = '';
                
                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
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
                          fullMessage += content;
                          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'delta', content })}\n\n`));
                        }
                      } catch (e) {}
                    }
                  }
                  
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
              }
            });
            
            return new Response(stream, {
              headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
            });
          }
        } catch (retryError) {
          logModelError('Fallback retry also failed', {
            userId: conversation?.user_id || null,
            sessionId: conversation?.session_id,
            endpoint: 'chatbot-streaming',
            model: 'google/gemini-2.5-flash',
            errorCode: 'FALLBACK_FAILED'
          });
        }
      }
      
      // If fallback also failed or not applicable, return error
      return new Response(JSON.stringify({ 
        error: `Model server error: ${status}`,
        errorCode: 'MODEL_ERROR',
        userMessage: "I'm experiencing technical difficulties. Please try again in a moment."
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Handle other errors
    logError('AI API error', {
      userId: conversation?.user_id || null,
      sessionId: conversation?.session_id,
      endpoint: 'chatbot-streaming',
      statusCode: status,
      error: err.substring(0, 200)
    });
    
    throw new Error(`AI API Error: ${status} - ${err.substring(0, 200)}`);
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

        // 🚀 OPTIMIZATION: Save to cache and DB in background (non-blocking)
        if (cacheKey && fullMessage) {
          saveResponseCache(supabase, cacheKey, fullMessage, 'lovable', selectedModel, originalMessage || userMessage, businessContext).catch(() => {});
        }
        
        // 📊 METRICS: Calculate metrics and save in background
        const responseTime = Date.now() - startTime;
        const ambiguityScore = calculateAmbiguityScore(fullMessage, userMessage, businessContext);
        const contextQualityScore = calculateContextQualityScore(conversationHistory, businessContext);
        
        // Background: Save message, update context, and record metrics
        queueMicrotask(async () => {
          try {
            const updatedContext = await extractBusinessContext(userMessage, fullMessage, businessContext);
            const stage = determineConversationStage(updatedContext, conversationHistory.length);
            await Promise.all([
              supabase.from('chatbot_messages').insert({
                conversation_id: conversation.id,
                role: 'assistant',
                content: fullMessage,
                metadata: { timestamp: new Date().toISOString(), streaming: true }
              }),
              supabase.from('chatbot_conversations').update({
                business_context: updatedContext,
                conversation_stage: stage,
                updated_at: new Date().toISOString()
              }).eq('id', conversation.id),
              // Save metrics
              supabase.from('chatbot_metrics').insert({
                user_id: conversation?.user_id || null,
                session_id: conversation?.session_id,
                conversation_id: conversation.id,
                endpoint: 'chatbot-streaming',
                success: true,
                response_time_ms: responseTime,
                model: selectedModel,
                message_length: userMessage.length,
                response_length: fullMessage.length,
                context_length: conversationHistory.length,
                ambiguity_score: ambiguityScore,
                context_quality_score: contextQualityScore,
                cache_hit: false,
                template_match: false,
                metadata: {
                  complexity,
                  strategy,
                  temperature: finalTemperature,
                  max_tokens: maxTokens
                }
              })
            ]);
          } catch (e) {
            console.error('Background save error:', e);
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
