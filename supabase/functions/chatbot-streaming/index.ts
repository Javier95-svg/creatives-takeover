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

    // Get or create conversation
    let { data: conversation, error: convError } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (convError && convError.code === 'PGRST116') {
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

    // Save user message
    await supabase
      .from('chatbot_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: message,
        metadata: { timestamp: new Date().toISOString() }
      });

    // Get market intelligence
    const { data: marketData } = await supabase
      .from('market_intelligence')
      .select('data_payload, industry, relevance_score')
      .gte('freshness_score', 0.3)
      .order('created_at', { ascending: false })
      .limit(5);

    // Process attachments if present
    let attachmentContext = '';
    if (attachments && attachments.length > 0) {
      console.log('[CHATBOT-STREAMING] Processing', attachments.length, 'attachments');
      try {
        attachmentContext = await processAttachments(attachments, supabase);
        console.log('[CHATBOT-STREAMING] Attachment context generated:', attachmentContext.substring(0, 200));
      } catch (error) {
        console.error('[CHATBOT-STREAMING] Error processing attachments:', error);
      }
    }

    // Build system prompt with attachment context
    const systemPrompt = buildSystemPrompt(businessContext, marketData, wizardMode, currentStep, attachmentContext);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    // Call Lovable AI with streaming
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
        max_tokens: 800,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API Error: ${aiResponse.status}`);
    }

    // Stream the response back to the client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = aiResponse.body?.getReader();
        const decoder = new TextDecoder();
        let fullMessage = '';

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullMessage += content;
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content, type: 'delta' })}\n\n`));
                  }
                } catch (e) {
                  console.error('Parse error:', e);
                }
              }
            }
          }

          // Save complete assistant message
          await supabase
            .from('chatbot_messages')
            .insert({
              conversation_id: conversation.id,
              role: 'assistant',
              content: fullMessage,
              metadata: { 
                timestamp: new Date().toISOString(),
                streaming: true
              }
            });

          // Extract context and generate quick actions
          const updatedContext = await extractBusinessContext(message, fullMessage, businessContext);
          const stage = determineConversationStage(updatedContext, conversationHistory.length);
          const quickActions = generateQuickActions(stage, updatedContext, message, fullMessage);

          // Update conversation
          await supabase
            .from('chatbot_conversations')
            .update({
              business_context: updatedContext,
              conversation_stage: stage,
              updated_at: new Date().toISOString()
            })
            .eq('id', conversation.id);

          // Send completion metadata
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ 
                type: 'complete',
                businessContext: updatedContext,
                stage,
                quickActions,
                conversationId: conversation.id
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
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

function buildSystemPrompt(businessContext: BusinessContext, marketData: any[], wizardMode: any = null, currentStep: number | null = null, attachmentContext: string = ''): string {
  const marketInsights = marketData?.map(d => 
    `- ${d.industry}: ${d.data_payload?.summary || 'Market activity'}`
  ).join('\n') || '';

  // Phase 4: Smart Automation - Industry benchmarks
  const industryBenchmarks: Record<string, any> = {
    technology: {
      avgPricing: "$50-500/month SaaS",
      customerAcquisition: "$200-1000 CAC",
      suggestions: ["Freemium model", "Annual discount", "Usage-based pricing"]
    },
    creative: {
      avgPricing: "$100-5000/project",
      customerAcquisition: "$50-300 CAC",
      suggestions: ["Portfolio-based pricing", "Retainer packages", "Value-based pricing"]
    },
    ecommerce: {
      avgPricing: "30-50% markup",
      customerAcquisition: "$20-100 CAC",
      suggestions: ["Bundle pricing", "Volume discounts", "Subscription boxes"]
    }
  };

  const currentIndustry = businessContext.industry?.toLowerCase() || '';
  const benchmarks = Object.keys(industryBenchmarks).find(key => 
    currentIndustry.includes(key)
  ) ? industryBenchmarks[Object.keys(industryBenchmarks).find(key => 
    currentIndustry.includes(key)
  )!] : null;

  // Stage-specific guidance
  const stageGuidance = {
    idea: "Focus on validating the core concept. Ask about the problem being solved and who experiences it.",
    planning: "Help structure their thoughts. Guide them through market research and business model exploration.",
    launch: "Provide practical execution advice. Focus on MVP, first customers, and learning loops.",
    growth: "Discuss scaling strategies, team building, and sustainable growth metrics."
  };

  const currentStage = businessContext.stage || 'idea';

  // Wizard mode specific guidance
  const wizardGuidance = wizardMode ? `
🎯 WIZARD MODE ACTIVE (Step ${(currentStep || 0) + 1}/${wizardMode.steps?.length || 7}):
- You're guiding the user through a structured planning process
- Keep responses warm, encouraging, and focused on the current step
- Acknowledge their answers positively before moving forward
- If an answer is vague, gently ask clarifying questions
- Celebrate progress: "You're ${Math.round(((currentStep || 0) / (wizardMode.steps?.length || 7)) * 100)}% through the planning!"
- Use emojis sparingly but meaningfully to maintain energy
- When users express doubt, acknowledge imposter syndrome and encourage them
` : '';

  return `You are BizMap AI, a warm and supportive business planning companion for creative entrepreneurs.

🎯 CORE IDENTITY & PRINCIPLES:

1. USER EXPERIENCE FIRST
   - You speak like a supportive friend, not a corporate consultant
   - Use simple language - replace "leverage" with "use", "synergy" with "teamwork"
   - Acknowledge imposter syndrome: "It's normal to feel uncertain. Every successful entrepreneur started where you are."
   - Break complex topics into digestible steps
   - Current stage focus: ${stageGuidance[currentStage as keyof typeof stageGuidance]}

2. QUALITY & COMPREHENSIVENESS
   - Cover problem definition, market validation, financial basics, and execution
   - Provide specific, actionable examples tailored to their industry
   - Reference real market data when available
   - Current context: ${businessContext.industry ? `${businessContext.industry} industry` : 'exploring industries'}

3. CREATIVE-FRIENDLY LANGUAGE
   Translation guide (always use the creative-friendly version):
   - "Value proposition" → "What makes you special"
   - "Target market" → "Your ideal customers" or "Who you're helping"
   - "Revenue model" → "How you'll earn money"
   - "Competitive advantage" → "Your unfair advantage" or "What you do better"
   - "Market penetration" → "Getting your first customers"
   - "Financial projections" → "Money planning" or "Financial roadmap"
   - "Stakeholders" → "People who matter to your business"

4. AUTOMATION & SMART SUGGESTIONS
   - When users struggle with pricing, suggest: ${benchmarks ? benchmarks.suggestions.join(', ') : 'market research, competitor analysis, value-based pricing'}
   - Auto-populate industry benchmarks when relevant: ${benchmarks ? `Typical ${currentIndustry} metrics: ${benchmarks.avgPricing} pricing, ${benchmarks.customerAcquisition} acquisition cost` : 'Research your industry standards'}
   - Generate and refine pattern: Offer to "generate a draft" then help them customize
   - Pre-fill common responses based on context to speed up the process

5. FUNCTIONALITY & FEATURES
   - Suggest specific tools, templates, or frameworks when helpful
   - Offer to generate content (mission statements, pricing ideas, marketing angles)
   - Pattern: "Would you like me to suggest..." rather than interrogating

5. FEEDBACK & RETENTION
   - Every 10 messages, ask: "How is this conversation helping so far?"
   - Celebrate milestones: "Amazing! You've completed your market analysis section 🎉"
   - When user seems stuck: "I notice we've been on this for a bit. Want to try a different angle?"

6. AUTOMATION & EFFICIENCY
   - Pre-fill industry benchmarks when industry is known
   - Generate multiple options for user to choose from
   - Example: "Here are 3 pricing strategies other [industry] businesses use..."

7. COST-EFFECTIVENESS FOR SOLOPRENEURS
   - Prioritize scrappy, bootstrap-friendly solutions
   - When suggesting tools, mention free alternatives first
   - Respect their time - offer to "fast-forward" through obvious sections

${wizardGuidance}

CURRENT USER CONTEXT:
${businessContext.industry ? `Industry: ${businessContext.industry}` : 'Industry: Not yet specified'}
${businessContext.stage ? `Stage: ${businessContext.stage}` : 'Stage: Exploring'}
${businessContext.goals?.length ? `Goals: ${businessContext.goals.join(', ')}` : 'Goals: To be discovered'}

RECENT MARKET INTELLIGENCE:
${marketInsights || 'No specific market data available yet - will provide general guidance'}

${attachmentContext ? `
UPLOADED FILES ANALYSIS:
${attachmentContext}

When responding to files:
- Reference specific details from uploaded documents
- For logos/images: Comment on branding, clarity, professional appeal
- For business plans: Review structure, identify gaps, suggest improvements  
- For financial data: Analyze assumptions, validate calculations
- For market data: Extract insights, compare to benchmarks
- Provide actionable feedback tailored to file content
` : ''}

CONVERSATION GUIDELINES:
✅ DO:
- Keep responses under 120 words
- Ask ONE clear, specific question at a time
- Use conversational tone with occasional appropriate emoji
- Acknowledge feelings: "That's exciting!" or "I understand that's overwhelming"
- Offer quick wins: "Let's start with something simple..."
- Provide concrete examples from their industry
- Suggest next steps: "Once we nail this, we'll move to..."

❌ DON'T:
- Use jargon without translating it
- Overwhelm with multiple questions
- Make assumptions - ask first
- Be pushy about completing sections
- Ignore signs of user confusion or fatigue

RESPONSE STRUCTURE:
1. Affirm or validate their input (1 sentence)
2. Provide insight or answer (2-3 sentences max)
3. Ask ONE specific follow-up question OR offer 2-3 options
4. End with encouragement or context

Example: "Love that you're thinking about sustainability! Many ${businessContext.industry || 'creative'} businesses are finding customers really care about this. It could be a key part of what makes you special. What aspect of sustainability matters most to you - environmental impact, ethical sourcing, or community giving back?"

MILESTONE CELEBRATIONS:
- First industry mentioned: "Great! Knowing your industry helps me give you better advice."
- Business idea clarified: "This is taking shape! You're doing great."
- Any section completed: Use 🎉 and briefly summarize their progress
- User expresses doubt: Normalize it and share that uncertainty is part of the process

Remember: You're not just gathering information - you're building their confidence to take action.`;
}

// Process uploaded attachments and return context for AI
async function processAttachments(attachments: Array<{ storagePath: string; fileName: string; fileType: string; fileSize: number }>, supabase: any): Promise<string> {
  const contexts: string[] = [];
  
  for (const attachment of attachments) {
    const { storagePath, fileName, fileType, fileSize } = attachment;
    
    console.log('[CHATBOT-STREAMING] Processing file:', fileName, 'Type:', fileType);
    
    try {
      // Download file from storage
      const { data: fileData, error } = await supabase.storage
        .from('chatbot-attachments')
        .download(storagePath);

      if (error) {
        console.error('[CHATBOT-STREAMING] Error downloading file:', error);
        contexts.push(`❌ Failed to process: ${fileName}`);
        continue;
      }

      // Image analysis with AI vision
      if (fileType.startsWith('image/')) {
        // Convert blob to base64 for AI vision
        const arrayBuffer = await fileData.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const base64Data = `data:${fileType};base64,${base64}`;
        
        contexts.push(`📷 Image: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)
[IMAGE_DATA:${base64Data}]
- This image will be analyzed by AI vision for business insights
- Analysis includes: visual elements, text extraction, brand elements, data visualization`);
      }
      
      // PDF processing
      else if (fileType === 'application/pdf') {
        contexts.push(`📄 PDF Document: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)
- Document uploaded for reference
- Contains structured business information`);
      }
      
      // Spreadsheet processing
      else if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileName.endsWith('.csv')) {
        if (fileName.endsWith('.csv')) {
          const text = await fileData.text();
          contexts.push(`📊 CSV Data: ${fileName}
${text.substring(0, 2000)}${text.length > 2000 ? '...(truncated)' : ''}`);
        } else {
          contexts.push(`📊 Spreadsheet: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)
- Data file uploaded for reference`);
        }
      }
      
      // Text files
      else if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        const textContent = await fileData.text();
        contexts.push(`📝 Text File: ${fileName}
Content:
${textContent.substring(0, 2000)}${textContent.length > 2000 ? '...(truncated)' : ''}`);
      }
    } catch (error) {
      console.error('[CHATBOT-STREAMING] Error processing attachment:', error);
      contexts.push(`❌ Failed to process: ${fileName}`);
    }
  }
  
  return contexts.join('\n\n');
}
      context += `\n- ⚠️ Could not process file: ${attachment.name}`;
  }
  
  return context;
}

async function extractBusinessContext(userMessage: string, aiResponse: string, currentContext: BusinessContext): Promise<BusinessContext> {
  const message = userMessage.toLowerCase();
  const updatedContext = { ...currentContext };

  const industries = ['technology', 'healthcare', 'finance', 'retail', 'education', 'food'];
  const detected = industries.find(industry => message.includes(industry));
  if (detected) updatedContext.industry = detected;

  if (message.includes('idea')) updatedContext.stage = 'idea';
  else if (message.includes('plan')) updatedContext.stage = 'planning';
  else if (message.includes('launch')) updatedContext.stage = 'launch';

  return updatedContext;
}

function determineConversationStage(context: BusinessContext, messageCount: number): string {
  if (messageCount <= 2) return 'discovery';
  if (context.industry && context.stage) return 'validation';
  if (context.goals?.length) return 'planning';
  return 'execution';
}

function detectSentiment(message: string): string {
  const lower = message.toLowerCase();
  if (lower.match(/overwhelm|too much|confused|stuck|lost|don't know|hard|difficult|unsure/)) return 'overwhelmed';
  if (lower.match(/excited|ready|let's go|can't wait|awesome|love|great|amazing/)) return 'excited';
  if (lower.match(/not sure|maybe|unclear|hesitant|worried|nervous/)) return 'confused';
  return 'neutral';
}

function detectMissingContext(context: BusinessContext): string[] {
  const missing = [];
  if (!context.industry) missing.push('industry');
  if (!context.stage) missing.push('stage');
  if (!context.goals?.length) missing.push('goals');
  return missing;
}

function detectConversationTopic(aiResponse: string, userMessage: string): {
  mainTopic: string;
  subtopics: string[];
  questionAsked: boolean;
  actionSuggested: boolean;
} {
  const lower = aiResponse.toLowerCase();
  
  // Topic detection patterns
  const topics = {
    customers: /target (market|customer|audience)|ideal customer|who (will|would) (buy|pay)|customer avatar|buyer persona/i,
    pricing: /pricing|how much|charge|revenue model|monetiz|subscription|price point|cost structure/i,
    competition: /competitor|competitive|competition|alternative|similar business|rival|market player/i,
    problem: /problem|pain point|frustrat|struggle|challenge|issue|difficulty/i,
    solution: /solution|product|service|offer|value proposition|what you're building/i,
    marketing: /marketing|advertis|promotion|reach|channel|social media|seo|content|campaign/i,
    funding: /funding|capital|investment|budget|cost|startup costs|financing|bootstrap/i,
    validation: /validat|test|mvp|prototype|feedback|proof|experiment|pilot/i,
    goals: /goal|objective|timeline|milestone|90 days|launch|roadmap|plan/i,
    industry: /industry|sector|market|niche|space|field|vertical/i
  };
  
  const detected = Object.entries(topics)
    .filter(([_, pattern]) => pattern.test(aiResponse))
    .map(([topic, _]) => topic);
  
  return {
    mainTopic: detected[0] || 'general',
    subtopics: detected.slice(1),
    questionAsked: /\?/.test(aiResponse),
    actionSuggested: /(try|consider|start with|next step|would you like|let me|can I help)/i.test(aiResponse)
  };
}

const topicCTAs: Record<string, string[]> = {
  customers: [
    "Help me identify my ideal customers 👥",
    "Show me customer research examples 🔍",
    "I already know who I'm targeting ✅",
    "Give me a customer avatar template 📝"
  ],
  pricing: [
    "Show me what others charge in my space 💰",
    "Help me calculate my pricing 🧮",
    "I want to see pricing strategy options 💵",
    "Compare pricing models for me 📊"
  ],
  competition: [
    "Show me who I'm competing against 🎯",
    "Find gaps competitors are missing 🔍",
    "Help me analyze their weaknesses 💡",
    "I want to see competitive analysis 📊"
  ],
  problem: [
    "Help me articulate the problem better 💬",
    "Show me how to validate this problem 🧪",
    "Give me examples of this problem 📋",
    "I want to research pain points 🔍"
  ],
  solution: [
    "Help me describe my solution clearly 💡",
    "Show me what makes this unique 💎",
    "Compare my solution to alternatives ⚖️",
    "Give me positioning examples 🎯"
  ],
  marketing: [
    "Show me marketing channels that work 📢",
    "Help me create a marketing plan 📋",
    "Give me low-budget marketing ideas 💡",
    "I want to see campaign examples 🎨"
  ],
  funding: [
    "Calculate my startup costs 💰",
    "Show me funding options 💵",
    "Help me plan my budget 📊",
    "I want bootstrap strategies 🌱"
  ],
  validation: [
    "Show me how to test this safely 🧪",
    "Give me MVP building steps 🚀",
    "Help me get early feedback 💬",
    "I want validation frameworks 📋"
  ],
  goals: [
    "Help me set realistic goals 🎯",
    "Show me a 90-day roadmap 🗓️",
    "Break this into milestones 📍",
    "I want to prioritize next steps ✅"
  ],
  industry: [
    "Show me what works in my industry 🏭",
    "Give me industry-specific advice 💡",
    "Compare industries for me 📊",
    "I want to explore other options 🧭"
  ],
  general: [
    "Help me get clarity on this 💡",
    "Show me what to focus on first 🎯",
    "I want to see examples 📋",
    "Let's talk about something else 🔄"
  ]
};

function generateQuickActions(
  stage: string, 
  context: BusinessContext, 
  userMessage: string, 
  aiResponse: string
): string[] {
  const sentiment = detectSentiment(userMessage);
  const missingInfo = detectMissingContext(context);
  const topic = detectConversationTopic(aiResponse, userMessage);
  
  // Priority 1: If user is overwhelmed, simplify immediately
  if (sentiment === 'overwhelmed') {
    const topicOptions = topicCTAs[topic.mainTopic] || topicCTAs.general;
    return [
      "Let's simplify - just tell me one thing 🧘",
      "Skip this for now ⏭️",
      topicOptions[0]
    ];
  }
  
  // Priority 2: If AI asked a direct question, provide relevant answer options
  if (topic.questionAsked && topic.mainTopic !== 'general') {
    const topicOptions = topicCTAs[topic.mainTopic] || topicCTAs.general;
    return topicOptions.slice(0, 4);
  }
  
  // Priority 3: If user is excited, capitalize on momentum with topic-specific actions
  if (sentiment === 'excited') {
    const topicOptions = topicCTAs[topic.mainTopic] || topicCTAs.general;
    return [
      topicOptions[0],
      topicOptions[1],
      "Let's capture this momentum 🚀"
    ];
  }
  
  // Priority 4: Mix topic-specific + natural next steps
  const mainTopicOptions = topicCTAs[topic.mainTopic] || topicCTAs.general;
  const nextTopicOptions = topic.subtopics.length > 0 
    ? topic.subtopics.map(t => topicCTAs[t]?.[0]).filter(Boolean)
    : [];
  
  // Build contextual CTAs
  const contextualCTAs = [
    ...mainTopicOptions.slice(0, 2),
    ...nextTopicOptions.slice(0, 1),
    "I want to talk about something else 🔄"
  ].slice(0, 4);
  
  return contextualCTAs;
}
