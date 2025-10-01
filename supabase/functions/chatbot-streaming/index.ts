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
      userId = null 
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
          conversation_stage: 'discovery'
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

    // Build system prompt
    const systemPrompt = buildSystemPrompt(businessContext, marketData);
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
          const quickActions = generateQuickActions(stage, updatedContext);

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

function buildSystemPrompt(businessContext: BusinessContext, marketData: any[]): string {
  const marketInsights = marketData?.map(d => 
    `- ${d.industry}: ${d.data_payload?.summary || 'Market activity'}`
  ).join('\n') || '';

  return `You are BizMap AI, an expert business planning assistant.

CURRENT USER CONTEXT:
${businessContext.industry ? `Industry: ${businessContext.industry}` : ''}
${businessContext.stage ? `Stage: ${businessContext.stage}` : ''}
${businessContext.goals?.length ? `Goals: ${businessContext.goals.join(', ')}` : ''}

RECENT MARKET INTELLIGENCE:
${marketInsights}

GUIDELINES:
- Keep responses under 150 words
- Ask ONE specific follow-up question
- Be conversational and encouraging
- Reference market trends when relevant
- Provide actionable insights

Always end with a clear call-to-action.`;
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

function generateQuickActions(stage: string, context: BusinessContext): string[] {
  const actions = {
    discovery: ['Tell me about your idea', 'What industry?', 'What problem?'],
    validation: ['Analyze opportunity', 'Competition check', 'Validate idea'],
    planning: ['Business plan', 'Pricing strategy', 'Marketing plan'],
    execution: ['90-day plan', 'Launch checklist', 'Funding options']
  };
  return actions[stage as keyof typeof actions] || ['Get started', 'Ask anything'];
}
