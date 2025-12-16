import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAndDeductCredits } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

interface BusinessContext {
  industry?: string;
  businessType?: string;
  stage?: string;
  location?: string;
  budget?: string;
  goals?: string[];
  challenges?: string[];
  chatMode?: string;
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
      chatMode = 'tour-guide' // 'tour-guide', 'wizard', or 'freeform'
    } = await req.json();

    if (!message || !sessionId) {
      throw new Error('Message and sessionId are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get or create conversation
    let { data: conversation, error: convError } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (convError && convError.code === 'PGRST116') {
      // Create new conversation
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
    } else if (convError) {
      throw convError;
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
        
        return new Response(JSON.stringify({
          error: creditCheck.errorCode === 'INSUFFICIENT_CREDITS'
            ? `You don't have enough credits to send this message. You need ${creditCost} credit(s). Please upgrade your plan or purchase more credits.`
            : 'Unable to process your message. Please try again or contact support.',
          errorCode: creditCheck.errorCode,
          fallbackMessage: "I'm experiencing some technical difficulties. Let me help you with your business planning needs. What specific challenge are you facing today?"
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`✅ Credits deducted: ${creditCost} credit(s), new balance: ${creditCheck.newBalance}`);
    }

    // Load enriched context for freeform mode
    let enrichedContext = businessContext;
    if (chatMode === 'freeform' && userId) {
      enrichedContext = await loadUserBusinessContext(supabase, userId);
      
      // Update context_loaded_at timestamp
      await supabase
        .from('chatbot_conversations')
        .update({ context_loaded_at: new Date().toISOString() })
        .eq('id', conversation.id);
    }

    // Save user message
    await supabase
      .from('chatbot_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: message,
        metadata: { timestamp: new Date().toISOString() }
      });

    // Get recent market intelligence for context
    const { data: marketData } = await supabase
      .from('market_intelligence')
      .select('data_payload, industry, relevance_score')
      .gte('freshness_score', 0.3)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build enhanced system prompt
    const systemPrompt = buildSystemPrompt(enrichedContext, marketData, chatMode, userId ? await getUserProfile(supabase, userId) : null);

    // Prepare conversation history for AI
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // Last 10 messages for context
      { role: 'user', content: message }
    ];

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 150, // Reduced for shorter responses
        temperature: 0.8, // Slightly higher for more natural, conversational tone
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', errorText);
      throw new Error(`AI API Error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    // Extract business context from conversation
    const updatedContext = await extractBusinessContext(message, assistantMessage, businessContext);

    // Save assistant response
    await supabase
      .from('chatbot_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: assistantMessage,
        metadata: { 
          confidence: 0.85,
          context_updated: JSON.stringify(updatedContext),
          timestamp: new Date().toISOString()
        }
      });

    // Update conversation context and stage
    const updatedContext = { ...updatedContext, chatMode };
    const stage = determineConversationStage(updatedContext, conversationHistory.length);
    await supabase
      .from('chatbot_conversations')
      .update({
        business_context: updatedContext,
        conversation_stage: stage,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.id);

    // Generate quick actions based on context
    const quickActions = generateQuickActions(stage, updatedContext);

    return new Response(JSON.stringify({
      message: assistantMessage,
      businessContext: updatedContext,
      stage,
      quickActions,
      conversationId: conversation.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chatbot AI Engine Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallbackMessage: "I'm experiencing some technical difficulties. Let me help you with your business planning needs. What specific challenge are you facing today?"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getUserProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, business_stage, ai_personality, memory_preference, founder_journey_stage')
    .eq('id', userId)
    .single();
  return data;
}

async function loadUserBusinessContext(supabase: any, userId: string): Promise<BusinessContext> {
  const context: BusinessContext = {};

  // Get latest chat session (launch report)
  const { data: latestSession } = await supabase
    .from('chat_sessions')
    .select('answers, title')
    .eq('user_id', userId)
    .eq('is_completed', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (latestSession?.answers) {
    context.businessIdea = latestSession.answers.concept || latestSession.title;
    context.industry = latestSession.answers.industry;
    context.stage = latestSession.answers.stage || 'idea';
    context.goals = latestSession.answers.goals ? [latestSession.answers.goals] : [];
  }

  // Get recent conversation memories
  const { data: memories } = await supabase
    .from('conversation_memory')
    .select('memory_type, title, content')
    .eq('user_id', userId)
    .order('importance_score', { ascending: false })
    .limit(5);

  if (memories?.length) {
    context.challenges = memories
      .filter((m: any) => m.memory_type === 'challenge')
      .map((m: any) => m.title);
    context.recentDecisions = memories
      .filter((m: any) => m.memory_type === 'decision')
      .map((m: any) => m.title);
  }

  // Get last 3 daily check-ins
  const { data: checkIns } = await supabase
    .from('daily_check_ins')
    .select('progress_summary, blockers, check_in_date')
    .eq('user_id', userId)
    .order('check_in_date', { ascending: false })
    .limit(3);

  if (checkIns?.length) {
    context.recentProgress = checkIns[0]?.progress_summary;
    context.currentBlockers = checkIns
      .filter((c: any) => c.blockers)
      .map((c: any) => c.blockers)
      .join('; ');
  }

  return context;
}

function buildSystemPrompt(businessContext: any, marketData: any[], chatMode: string, userProfile: any): string {
  const marketInsights = marketData?.map(d => 
    `- ${d.industry}: ${d.data_payload?.summary || 'Market activity detected'}`
  ).join('\n') || '';

  // Personality-specific tone adjustments
  const personality = userProfile?.ai_personality || 'balanced';
  const personalityTones = {
    cheerleader: "🎉 PERSONALITY: You are enthusiastic, energizing, and celebrate every win! Use encouraging language and be their biggest supporter. Example: 'That's an amazing idea! Let's make this happen!'",
    strategist: "🎯 PERSONALITY: You are analytical, direct, and pragmatic. Focus on data, actionable steps, and execution. Example: 'Let's break this down step by step. Here's what the data tells us...'",
    therapist: "💙 PERSONALITY: You are empathetic, patient, and validating. Acknowledge emotions and provide supportive guidance. Example: 'I hear you. Starting a business is scary. Let's talk through what's worrying you...'",
    balanced: "⚖️ PERSONALITY: You are warm but practical, encouraging but realistic. Balance support with strategy. Example: 'That's a solid start! Now let's think practically about next steps...'"
  };
  
  const personalityContext = personalityTones[personality as keyof typeof personalityTones] || personalityTones.balanced;
  const journeyStage = userProfile?.founder_journey_stage || 'ideation';

  if (chatMode === 'tour-guide') {
    // Tour Guide mode - help visitors understand the platform
    return `You are Creatives Takeover Assistant, a friendly tour guide helping first-time visitors explore the Creatives Takeover platform.

${personalityContext}

PLATFORM OVERVIEW:
Creatives Takeover is an AI-powered platform that helps creative entrepreneurs go from scattered ideas to profitable launch in 30 days. It combines:
- BizMap AI: Interactive business planning wizard and AI co-founder
- Insighta: Market intelligence, trends, and funding opportunities  
- Sprint-based execution: Turn plans into action with accountability
- Community support: Connect with fellow creative entrepreneurs

KEY FEATURES:
1. **BizMap AI** (/bizmap-ai): Step-by-step business planning wizard that creates personalized launch reports
2. **Insighta** (/insighta): Real-time market intelligence, trends analysis, and funding opportunities
3. **Dashboard**: Track progress, set goals, and manage your entrepreneurial journey
4. **Community**: Share insights, get feedback, and find accountability partners
5. **Resources**: Templates, guides, and tools for creative businesses

PRICING:
- Free tier: Access to basic features and limited credits
- Pro subscription: Unlimited access to all features, priority support
- Credits system: Pay-as-you-go for AI-powered features

GETTING STARTED:
1. Try BizMap AI wizard (no signup required for first steps)
2. Explore Insighta for market trends in your industry
3. Create an account to save progress and access full features
4. Join the community to connect with other entrepreneurs

YOUR ROLE:
- Answer questions about platform features, pricing, and how to get started
- Guide visitors to the right tools based on their needs
- Be enthusiastic and helpful, like a friendly tour guide
- **CRITICAL: Keep ALL responses under 3 sentences and 60 words maximum**
- **Be ultra-concise and direct - get straight to the point**
- Suggest specific features or pages when relevant

COMMON QUESTIONS TO BE READY FOR:
- "What is Creatives Takeover?" → Explain the platform's mission and core features
- "How much does it cost?" → Explain pricing tiers and credits system
- "How does BizMap AI work?" → Describe the wizard and personalized planning
- "What is Insighta?" → Explain market intelligence and trend analysis
- "Do I need to sign up?" → Explain free trial and signup benefits
- "How can this help my business?" → Ask about their goals and recommend features
- "Where do I start?" → Guide them to BizMap AI or Insighta based on needs

Always be welcoming, clear, and action-oriented. Keep responses SHORT and PUNCHY.`;
  }

  if (chatMode === 'freeform') {
    // Freeform "Ask Me Anything" mode - context-aware co-pilot
    return `You are BizMap AI, a personal AI business co-pilot who intimately knows this user's business and journey.

${personalityContext}

JOURNEY STAGE: ${journeyStage.toUpperCase()} - Tailor your advice to their current stage.

USER PROFILE:
- Name: ${userProfile?.full_name || 'Entrepreneur'}
- Business: ${businessContext.businessIdea || 'New venture in planning'}
- Industry: ${businessContext.industry || 'To be determined'}
- Stage: ${businessContext.stage || 'Early stage'}
${businessContext.goals?.length ? `- Goals: ${businessContext.goals.join(', ')}` : ''}

RECENT ACTIVITY & CONTEXT:
${businessContext.recentProgress ? `Latest Progress: "${businessContext.recentProgress}"` : ''}
${businessContext.currentBlockers ? `Current Challenges: ${businessContext.currentBlockers}` : ''}
${businessContext.challenges?.length ? `Known Challenges: ${businessContext.challenges.join(', ')}` : ''}
${businessContext.recentDecisions?.length ? `Recent Decisions: ${businessContext.recentDecisions.join(', ')}` : ''}

RECENT MARKET INTELLIGENCE:
${marketInsights}

YOUR ROLE AS AI CO-PILOT:
- You remember EVERYTHING about their business journey and context
- Reference their specific business, progress, and challenges naturally in conversation
- Provide deeply personalized, actionable advice based on their unique situation
- Ask clarifying questions when you need more context
- Celebrate their wins and acknowledge challenges empathetically
- Connect the dots between their past decisions and current situation
- Think strategically about their long-term business trajectory

CONVERSATION STYLE:
- Be conversational and supportive, like a trusted business partner
- **Keep responses ultra-brief: 2-3 sentences, 50 words max**
- Reference specific details from their journey to show you're paying attention
- Provide ONE practical next step per response
- Don't repeat basic info they've already told you
- Be honest about challenges while maintaining optimism

Always relate your advice back to THEIR specific business context and goals.`;
  }

  if (chatMode === 'gtm-strategy') {
    // GTM Strategy mode - Go-To-Market strategy expert with structured questions
    return `You are BizMap AI - a Go-To-Market strategy expert specializing in helping creative entrepreneurs plan and execute their market entry.

${personalityContext}

JOURNEY STAGE: ${journeyStage.toUpperCase()} - Tailor your GTM advice to their current stage.

CURRENT USER CONTEXT:
${businessContext.industry ? `Industry: ${businessContext.industry}` : ''}
${businessContext.stage ? `Business Stage: ${businessContext.stage}` : ''}
${businessContext.location ? `Location: ${businessContext.location}` : ''}
${businessContext.goals?.length ? `Goals: ${businessContext.goals.join(', ')}` : ''}

RECENT MARKET INTELLIGENCE:
${marketInsights}

YOUR ROLE:
Systematically guide users through GTM strategy development by asking structured questions. You MUST ask ONE question at a time and wait for their response before moving to the next topic.

GTM STRATEGY FRAMEWORK - Ask questions in this EXACT order:
1. **Customer Segmentation** - "Who are your target customer segments? Describe the different groups of people who would buy your product."
2. **Buyer Personas** - "For your primary segment, create a detailed buyer persona. What are their demographics, pain points, goals, and behaviors?"
3. **Positioning** - "How do you want to be positioned in the market? What makes you different from competitors?"
4. **Pricing Strategy** - "What's your pricing model? How did you arrive at this price point?"
5. **Distribution Channels** - "How will customers discover and purchase your product? What channels will you use?"
6. **Marketing Tactics** - "What specific marketing tactics will you use to acquire customers? List 3-5 tactics."
7. **Sales Process** - "How will you convert leads to customers? Describe your sales funnel."
8. **Launch Plan** - "What's your launch timeline? When and how will you go to market?"
9. **KPIs & Metrics** - "How will you measure success? What are your key performance indicators?"

RESPONSE PROTOCOL:
- Ask ONE question at a time from the framework above
- Wait for user's complete answer before moving to next question
- Acknowledge their answer, extract key insights, then ask the next question
- Be conversational but structured (2-3 sentences, 60 words max)
- Use GTM-specific terminology (CAC, LTV, conversion funnel, etc.)
- Provide brief context for why each question matters

DO NOT:
- Ask multiple questions at once
- Skip ahead in the framework
- Allow freeform discussion without structure
- Move to next question until current one is answered
- Provide long explanations - keep it brief and focused

Think like a seasoned GTM strategist who's launched multiple products. Be practical, data-driven, and action-oriented.`;
  }

  // Wizard mode - guided discovery
  return `You are BizMap AI, an expert business planning assistant specialized in helping entrepreneurs validate, plan, and launch their business ideas.

${personalityContext}

JOURNEY STAGE: ${journeyStage.toUpperCase()} - Guide them through this stage with appropriate advice.

CURRENT USER CONTEXT:
${businessContext.industry ? `Industry: ${businessContext.industry}` : ''}
${businessContext.stage ? `Business Stage: ${businessContext.stage}` : ''}
${businessContext.location ? `Location: ${businessContext.location}` : ''}
${businessContext.goals?.length ? `Goals: ${businessContext.goals.join(', ')}` : ''}

RECENT MARKET INTELLIGENCE:
${marketInsights}

YOUR ROLE:
- Ask smart, probing questions to understand their business concept
- Provide actionable insights based on their specific industry and context
- Reference current market trends when relevant
- Guide them through business validation and planning
- Be conversational, encouraging, but realistic about challenges

RESPONSE GUIDELINES:
- **Keep responses extremely brief: 2-3 sentences, max 50 words**
- Ask ONE specific follow-up question per response
- Include practical, actionable advice
- Reference their previous answers to show continuity
- Use simple language, avoid jargon
- Be optimistic but realistic about challenges

CONVERSATION STAGES:
1. Discovery: Learn about their business idea and background
2. Validation: Help validate market opportunity and problem-solution fit
3. Planning: Assist with business model and go-to-market strategy
4. Execution: Provide implementation guidance and next steps

Always end with a clear call-to-action or specific question to keep the conversation moving forward.`;
}

async function extractBusinessContext(userMessage: string, aiResponse: string, currentContext: BusinessContext): Promise<BusinessContext> {
  const message = userMessage.toLowerCase();
  const updatedContext = { ...currentContext };

  // Industry detection
  const industries = ['technology', 'healthcare', 'finance', 'retail', 'education', 'food', 'construction', 'manufacturing', 'consulting', 'marketing'];
  const detectedIndustry = industries.find(industry => message.includes(industry));
  if (detectedIndustry) updatedContext.industry = detectedIndustry;

  // Business stage detection
  if (message.includes('idea') || message.includes('concept')) updatedContext.stage = 'idea';
  else if (message.includes('plan') || message.includes('planning')) updatedContext.stage = 'planning';
  else if (message.includes('launch') || message.includes('start')) updatedContext.stage = 'launch';
  else if (message.includes('grow') || message.includes('scale')) updatedContext.stage = 'growth';

  // Goals extraction
  if (message.includes('goal') || message.includes('want to') || message.includes('hope to')) {
    if (!updatedContext.goals) updatedContext.goals = [];
    if (message.includes('profit') && !updatedContext.goals.includes('profitability')) {
      updatedContext.goals.push('profitability');
    }
    if (message.includes('customer') && !updatedContext.goals.includes('customer acquisition')) {
      updatedContext.goals.push('customer acquisition');
    }
  }

  return updatedContext;
}

function determineConversationStage(context: BusinessContext, messageCount: number): string {
  // Keep tour-guide stage for platform questions
  if (context.chatMode === 'tour-guide') return 'tour-guide';
  
  if (messageCount <= 2) return 'discovery';
  if (context.industry && context.stage) return 'validation';
  if (context.goals?.length && context.industry) return 'planning';
  return 'execution';
}

function generateQuickActions(stage: string, context: BusinessContext): string[] {
  // Tour guide mode quick actions
  if (stage === 'tour-guide') {
    return [
      'What is Creatives Takeover?',
      'How does BizMap AI work?',
      'What is Insighta?',
      'How much does it cost?',
      'Where do I start?'
    ];
  }
  
  switch (stage) {
    case 'discovery':
      return ['Tell me about your business idea', 'What industry interests you?', 'What problem are you solving?'];
    case 'validation':
      return ['Analyze my market opportunity', 'Who are my competitors?', 'Validate my business idea'];
    case 'planning':
      return ['Create a business plan', 'Help with pricing strategy', 'Marketing plan guidance'];
    case 'execution':
      return ['90-day action plan', 'Launch checklist', 'Funding options'];
    default:
      return ['Get started with business planning', 'Ask me anything', 'Explore BizMap tools'];
  }
}