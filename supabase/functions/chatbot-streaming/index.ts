import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get/create conversation
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

    // Save user message in background (non-blocking)
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

    // Build system prompt
    const systemPrompt = buildSystemPrompt(businessContext, wizardMode, currentStep, chatMode);
    let messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    // Process file attachments if present
    messages = await processAttachments(messages, attachments);

    // Call Lovable AI Gateway with streaming
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    console.log('🔑 LOVABLE_API_KEY configured:', !!LOVABLE_API_KEY);
    
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('🤖 Calling Lovable AI Gateway with streaming...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        stream: true,
        temperature: 0.3, // Lower for more focused business advice
      }),
    });

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      console.error('❌ Lovable AI Gateway error:', {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        body: errorBody
      });
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required. Please add credits to your Lovable workspace.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Lovable AI Error: ${aiResponse.status} - ${errorBody}`);
    }

    console.log('✅ Lovable AI Gateway response OK, starting SSE stream...');

    // Stream the response back to the client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = aiResponse.body?.getReader();
        const decoder = new TextDecoder();
        let fullMessage = '';
        let buffer = '';

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '' || line.startsWith(':')) continue;
              if (!line.startsWith('data: ')) continue;

              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullMessage += content;
                  // Send as SSE event
                  controller.enqueue(new TextEncoder().encode(
                    `data: ${JSON.stringify({ type: 'delta', content })}\n\n`
                  ));
                }
              } catch (e) {
                console.error('Parse error for line:', data.substring(0, 100), 'Error:', e);
              }
            }
          }

          // Process final buffer
          if (buffer.trim() && buffer.startsWith('data: ')) {
            const data = buffer.slice(6).trim();
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullMessage += content;
                  controller.enqueue(new TextEncoder().encode(
                    `data: ${JSON.stringify({ type: 'delta', content })}\n\n`
                  ));
                }
              } catch (e) {
                console.error('Final buffer parse error:', e);
              }
            }
          }

          // Run post-stream operations in background
          setTimeout(async () => {
            const updatedContext = await extractBusinessContext(message, fullMessage, businessContext);
            const stage = determineConversationStage(updatedContext, conversationHistory.length);
            
            // Generate quick action suggestions based on stage and context
            const quickActions = generateQuickActions(stage, chatMode, message);

            await Promise.all([
              supabase
                .from('chatbot_messages')
                .insert({
                  conversation_id: conversation.id,
                  role: 'assistant',
                  content: fullMessage,
                  metadata: { 
                    timestamp: new Date().toISOString(),
                    streaming: true,
                    quickActions
                  }
                }),
              supabase
                .from('chatbot_conversations')
                .update({
                  business_context: updatedContext,
                  conversation_stage: stage,
                  updated_at: new Date().toISOString()
                })
                .eq('id', conversation.id)
            ]);
          }, 0);

          // Send completion with quick actions
          const stage = determineConversationStage(businessContext, conversationHistory.length);
          const quickActions = generateQuickActions(stage, chatMode, message);
          
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ 
              type: 'complete', 
              conversationId: conversation.id,
              quickActions 
            })}\n\n`
          ));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();

        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
          ));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

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
1. **Acknowledge their answer positively** - Build confidence
2. **Extract key insights** - Show you understand deeply
3. **Ask clarifying follow-up** if needed (1 focused question)
4. **Keep it conversational** - 2-3 sentences max, under 60 words
5. **Be encouraging** - They're building something amazing

BUSINESS EXPERTISE:
- Market validation and competitive analysis
- Financial modeling and projections  
- Go-to-market strategies
- Creative business monetization
- Lean startup methodology
- Product-market fit validation

Think like a seasoned entrepreneur who's launched multiple successful creative businesses. Be practical, actionable, and inspiring.`;
  }
  
  // Freeform mode - advanced AI co-founder
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

RESPONSE STYLE:
• Be conversational but insightful (2-4 sentences, 80 words max)
• Ask strategic follow-up questions when needed
• Provide specific, actionable advice
• Reference best practices from successful businesses
• Build confidence while being realistic

CRITICAL RULES:
- If they ask about competitors, market size, or trends → Acknowledge you'd need real-time data, suggest research approaches
- If they share detailed plans → Provide strategic feedback on assumptions and risks
- If they're stuck → Help break down the problem into smaller, manageable steps
- Always be encouraging yet practical

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
