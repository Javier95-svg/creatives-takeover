import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAndDeductCredits } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';

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

    // 🚀 OPTIMIZATION: Check template match first (fastest path, synchronous, no crypto needed)
    const matchedTemplate = matchTemplate(message, businessContext);
    if (matchedTemplate) {
      console.log('⚡ Template match - returning instant response');
      const templateResponse = matchedTemplate.response;
      const response = createTemplateStream(templateResponse, matchedTemplate.quickActions || [], conversation, businessContext, conversationHistory, chatMode);
      // Don't cache Response objects - they're streams that can only be consumed once
      return response;
    }

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
      console.log('⚡ Cache hit - returning cached response');
      const response = createCachedStream(cachedResponse, message, conversation, businessContext, conversationHistory, chatMode);
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

    // 🚀 OPTIMIZATION: Save user message in background (non-blocking)
    supabase
      .from('chatbot_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: message,
        metadata: { timestamp: new Date().toISOString() }
      })
      .then(({ error }) => {
        if (error) console.error('Background: Error saving user message:', error);
      });

    // 🚀 OPTIMIZATION: Reduce conversation history from 10 to 6 messages
    const optimizedHistory = conversationHistory.slice(-6);
    
    // 🔀 HYBRID ROUTING: Detect if query needs knowledge base lookup
    const needsKnowledge = detectKnowledgeQuery(message, businessContext);
    
    // 🚀 OPTIMIZATION: Detect if query needs market data
    const needsMarketData = detectMarketDataQuery(message, businessContext);
    
    // 🚀 OPTIMIZATION: Parallel processing with timeouts - start RAG, market data simultaneously
    // Timeouts are handled inside fetchRAGData and fetchMarketData functions (500ms max each)
    const [ragData, marketData] = await Promise.all([
      needsKnowledge 
        ? fetchRAGData(supabase, [], userId, businessContext, conversation?.id)
        : Promise.resolve(null),
      needsMarketData 
        ? fetchMarketData(supabase, message, businessContext)
        : Promise.resolve(null)
    ]);
    
    // 🚀 OPTIMIZATION: Build system prompt with market data if available
    let systemPrompt = getCachedSystemPrompt(businessContext, wizardMode, currentStep, chatMode);
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

    // If RAG provided answer, stream it. Otherwise use Lovable AI
    if (ragData?.answer) {
      const response = createRAGStream(ragData, message, conversation, businessContext, optimizedHistory, chatMode, supabase);
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
function createTemplateStream(templateContent: string, quickActions: Array<{text: string, id: string}>, conversation: any, businessContext: BusinessContext, conversationHistory: ChatMessage[], chatMode: string): Response {
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
function createCachedStream(cachedContent: string, message: string, conversation: any, businessContext: BusinessContext, conversationHistory: ChatMessage[], chatMode: string): Response {
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

REASONING FRAMEWORK:
When answering complex questions, use this approach:
1. **Understand** - Clarify the core business challenge
2. **Analyze** - Break down key factors and dependencies
3. **Synthesize** - Provide actionable recommendations
4. **Validate** - Suggest how to test assumptions

FEW-SHOT EXAMPLES (Learn from these patterns):

Example 1 - Market Validation:
User: "How do I know if people want my product?"
You: "Great question! Start with 10 customer interviews this week. Ask: 'What's your biggest frustration with [problem]?' If 7+ people say they'd pay for a solution, you have validation. Want help crafting interview questions?"

Example 2 - Pricing Strategy:
User: "What should I charge?"
You: "For [industry], typical pricing ranges $X-$Y. But test it! Create 3 price points and ask 5 potential customers which they'd choose. The price where 60%+ choose it is your sweet spot. What's your cost structure?"

Example 3 - Launch Strategy:
User: "Where should I launch?"
You: "Start where your customers already gather. If they're on LinkedIn → post there. If they're in Facebook groups → engage there. Pick ONE channel, master it, then expand. Where do your ideal customers spend time?"

RESPONSE STYLE:
• Be conversational but insightful (2-4 sentences, 80 words max)
• Ask strategic follow-up questions when needed
• Provide specific, actionable advice with numbers/examples
• Reference best practices from successful businesses
• Build confidence while being realistic
• Use the reasoning framework for complex questions

CRITICAL RULES:
- If they ask about competitors, market size, or trends → Acknowledge you'd need real-time data, suggest research approaches
- If they share detailed plans → Provide strategic feedback on assumptions and risks
- If they're stuck → Help break down the problem into smaller, manageable steps
- Always be encouraging yet practical
- For complex queries, show your reasoning process briefly

You're not just answering questions - you're their strategic partner in building a successful business.`;
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
        
        // Add sources
        if (sources.length > 0) {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'delta', content: '\n\n📚 **Sources:**\n' })}\n\n`
          ));
          for (const s of sources.slice(0, 3)) {
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'delta', content: `- ${s.title} (${s.source})\n` })}\n\n`
            ));
          }
        }
        
        // Save in background
        setTimeout(() => {
          supabase.from('chatbot_messages').insert({
            conversation_id: conversation.id,
            role: 'assistant',
            content: answer,
            metadata: { rag: true, sources, timestamp: new Date().toISOString() }
          }).then(() => {});
        }, 0);
        
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
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  // 🚀 OPTIMIZATION: Detect complexity and select optimal model
  const complexity = detectQueryComplexity(userMessage, businessContext, conversationHistory);
  const { model: selectedModel, strategy, maxTokens, temperature: baseTemperature } = selectOptimalModel(complexity, chatMode);
  
  // 🚀 OPTIMIZATION: Dynamic temperature tuning based on query type
  const finalTemperature = determineTemperature(userMessage, complexity, chatMode);
  
  console.log(`🎯 Query complexity: ${complexity}, model: ${selectedModel}, tokens: ${maxTokens}, temp: ${finalTemperature}, strategy: ${strategy}`);

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

  if (!aiResponse.ok) {
    const err = await aiResponse.text();
    if (aiResponse.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (aiResponse.status === 402) return new Response(JSON.stringify({ error: 'Payment required' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    
    // 🚀 OPTIMIZATION: Fallback to simpler model on error
    console.log(`⚠️ Model ${selectedModel} failed, trying fallback`);
    if (selectedModel !== 'google/gemini-2.5-flash') {
      // Retry with flash model
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
        // Use fallback response
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
    }
    
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

        // 🚀 OPTIMIZATION: Save to cache and DB in background (non-blocking)
        if (cacheKey && fullMessage) {
          saveResponseCache(supabase, cacheKey, fullMessage, 'lovable', selectedModel, originalMessage || userMessage, businessContext).catch(() => {});
        }
        
        // Background: Save message and update context
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
              }).eq('id', conversation.id)
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
