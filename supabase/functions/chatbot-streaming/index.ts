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
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

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
        temperature: 0.7,
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
          }, 0);

          // Send completion
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'complete', conversationId: conversation.id })}\n\n`
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
  const industryHint = businessContext.industry ? `Industry: ${businessContext.industry}` : '';
  const stageHint = businessContext.stage ? `Stage: ${businessContext.stage}` : '';
  const wizardProgress = wizardMode?.enabled && chatMode === 'wizard' 
    ? `\n🎯 WIZARD MODE (Step ${(currentStep || 0) + 1}/${wizardMode.steps?.length || 7}): Guide through structured planning. Acknowledge answers positively.` 
    : '';
  
  return `You are BizMap AI, an expert business planning assistant for creative entrepreneurs.

${wizardProgress}

CONTEXT: ${industryHint} ${stageHint}

OBJECTIVES:
- Help validate and refine business ideas
- Generate comprehensive business plans
- Provide actionable advice and next steps
- Adapt tone to user experience level

INTERACTION STYLE:
- Friendly and confidence-boosting
- Concise responses (under 150 words unless detailed analysis requested)
- Ask ONE clear follow-up question per response
- Use creative-friendly language

Keep responses conversational and actionable.`;
}

async function extractBusinessContext(userMessage: string, aiResponse: string, currentContext: BusinessContext): Promise<BusinessContext> {
  const message = userMessage.toLowerCase();
  const updatedContext = { ...currentContext };

  // Simple keyword-based extraction
  if (message.includes('tech') || message.includes('software') || message.includes('app')) {
    updatedContext.industry = 'technology';
  } else if (message.includes('health') || message.includes('wellness')) {
    updatedContext.industry = 'healthcare';
  } else if (message.includes('retail') || message.includes('store')) {
    updatedContext.industry = 'retail';
  } else if (message.includes('food') || message.includes('restaurant')) {
    updatedContext.industry = 'food';
  }

  if (message.includes('startup') || message.includes('new business')) {
    updatedContext.businessType = 'startup';
    updatedContext.stage = 'idea';
  }

  return updatedContext;
}

function determineConversationStage(context: BusinessContext, messageCount: number): string {
  if (messageCount < 3) return 'discovery';
  if (context.industry && !context.stage) return 'exploration';
  if (context.stage === 'idea') return 'validation';
  if (context.stage === 'planning') return 'development';
  return 'ongoing';
}
