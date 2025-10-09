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
      chatMode = 'wizard'
    } = await req.json();

    if (!message || !sessionId) {
      throw new Error('Message and sessionId are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parallelize: Get/create conversation + fetch market data
    const [convResult, marketResult] = await Promise.all([
      supabase
        .from('chatbot_conversations')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle(),
      supabase
        .from('market_intelligence')
        .select('data_payload, industry, relevance_score')
        .gte('freshness_score', 0.3)
        .order('created_at', { ascending: false })
        .limit(2) // Reduced from 5 to 2 for faster response
    ]);

    let conversation = convResult.data;
    
    // Create conversation if it doesn't exist
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

    const marketData = marketResult.data || [];

    // Build system prompt
    const systemPrompt = buildSystemPrompt(businessContext, marketData, wizardMode, currentStep);
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
        let buffer = ''; // Buffer for incomplete chunks

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode and add to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Split by newlines but keep the last incomplete line in buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep last incomplete line

            for (const line of lines) {
              // Skip empty lines and comments
              if (line.trim() === '' || line.startsWith(':')) continue;
              
              // Process SSE data lines
              if (!line.startsWith('data: ')) continue;

              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullMessage += content;
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content, type: 'delta' })}\n\n`));
                }
              } catch (e) {
                console.error('Parse error for line:', data.substring(0, 100), 'Error:', e);
                // Continue processing other lines
              }
            }
          }

          // Process final buffer if it contains data
          if (buffer.trim() && buffer.startsWith('data: ')) {
            const data = buffer.slice(6).trim();
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullMessage += content;
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content, type: 'delta' })}\n\n`));
                }
              } catch (e) {
                console.error('Final buffer parse error:', e);
              }
            }
          }

          // Run all post-stream operations in parallel
          const updatedContext = await extractBusinessContext(message, fullMessage, businessContext);
          const stage = determineConversationStage(updatedContext, conversationHistory.length);
          const quickActions = generateQuickActions(stage, updatedContext, message, fullMessage);

          await Promise.all([
            supabase
              .from('chatbot_messages')
              .insert({
                conversation_id: conversation.id,
                role: 'assistant',
                content: fullMessage,
                metadata: { 
                  timestamp: new Date().toISOString(),
                  streaming: true
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

function buildSystemPrompt(businessContext: BusinessContext, marketData: any[], wizardMode: any = null, currentStep: number | null = null): string {
  const industryHint = businessContext.industry ? `Industry: ${businessContext.industry}. ` : '';
  const stageHint = businessContext.stage ? `Stage: ${businessContext.stage}. ` : '';
  const wizardProgress = wizardMode ? `Wizard step ${(currentStep || 0) + 1}/${wizardMode.steps?.length || 7}. ` : '';
  
  return `You are BizMap AI, a supportive business advisor for creative entrepreneurs.

${wizardProgress}${industryHint}${stageHint}

STYLE: Friendly, conversational, concise (under 120 words). Ask ONE clear question at a time.

LANGUAGE: Use simple terms - "your ideal customers" not "target market", "what makes you special" not "value proposition", "how you'll earn money" not "monetization strategy".

APPROACH:
1. Validate their idea and understand the problem
2. Help articulate their unique value
3. Guide customer validation with surveys/interviews
4. Support MVP building
5. Plan first launch

Suggest tools (Zapier, Canva, free alternatives) to save time. Celebrate small wins. Make business planning feel exciting, not overwhelming.

RESPONSE FORMAT:
- Validate their input (1 line)
- Share insight (2-3 sentences)
- Ask ONE question OR offer 2-3 options
- End with encouragement`;
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

function detectConversationTopic(aiResponse: string, userMessage: string): {
  mainTopic: string;
  subtopics: string[];
  questionAsked: boolean;
  actionSuggested: boolean;
} {
  const combined = `${aiResponse} ${userMessage}`.toLowerCase();
  
  // Simplified pre-compiled patterns for faster matching
  const topicPatterns = [
    { name: 'validation', regex: /validat|test|feedback|mvp|prototype/i },
    { name: 'pricing', regex: /pric|charge|revenue|monetiz|subscription/i },
    { name: 'customers', regex: /customer|audience|target|buyer|ideal/i },
    { name: 'marketing', regex: /market|promot|advertis|reach|social|seo/i },
    { name: 'problem', regex: /problem|pain|frustrat|struggle|challenge/i },
    { name: 'solution', regex: /solution|product|service|offer|build/i },
    { name: 'goals', regex: /goal|timeline|milestone|launch|roadmap/i }
  ];

  const detected = topicPatterns.filter(t => t.regex.test(combined));

  return {
    mainTopic: detected[0]?.name || 'general',
    subtopics: detected.slice(1, 3).map(t => t.name),
    questionAsked: /\?/.test(aiResponse),
    actionSuggested: /(try|consider|start|next|would you|let)/i.test(aiResponse)
  };
}

// Pre-computed topic CTAs for fast lookup
const topicCTAs: Record<string, string[]> = {
  validation: [
    "Show me validation methods 🧪",
    "Help me get feedback 💬",
    "Give me MVP steps 🚀"
  ],
  pricing: [
    "Show me pricing examples 💰",
    "Help calculate costs 🧮",
    "Compare pricing models 📊"
  ],
  customers: [
    "Identify my ideal customers 👥",
    "Customer research tips 🔍",
    "Create customer avatar 📝"
  ],
  marketing: [
    "Marketing channels that work 📢",
    "Low-budget ideas 💡",
    "Create marketing plan 📋"
  ],
  problem: [
    "Articulate problem better 💬",
    "Validate the problem 🧪",
    "Research pain points 🔍"
  ],
  solution: [
    "Describe solution clearly 💡",
    "What makes it unique 💎",
    "Position vs alternatives ⚖️"
  ],
  goals: [
    "Set realistic goals 🎯",
    "Create 90-day plan 🗓️",
    "Prioritize next steps ✅"
  ],
  general: [
    "Get clarity 💡",
    "Focus on first step 🎯",
    "Show me examples 📋"
  ]
};

function generateQuickActions(
  stage: string, 
  context: BusinessContext, 
  userMessage: string, 
  aiResponse: string
): string[] {
  const sentiment = detectSentiment(userMessage);
  const topic = detectConversationTopic(aiResponse, userMessage);
  
  // Simplified logic for faster generation
  if (sentiment === 'overwhelmed') {
    return [
      "Let's simplify this 🧘",
      "Skip for now ⏭️",
      (topicCTAs[topic.mainTopic] || topicCTAs.general)[0]
    ];
  }
  
  const topicOptions = topicCTAs[topic.mainTopic] || topicCTAs.general;
  
  if (sentiment === 'excited') {
    return [...topicOptions.slice(0, 2), "Capture momentum 🚀"];
  }
  
  return topicOptions;
}
