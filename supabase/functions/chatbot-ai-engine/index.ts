import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Get recent market intelligence for context
    const { data: marketData } = await supabase
      .from('market_intelligence')
      .select('data_payload, industry, relevance_score')
      .gte('freshness_score', 0.3)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build enhanced system prompt
    const systemPrompt = buildSystemPrompt(businessContext, marketData);

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
        max_tokens: 800,
        temperature: 0.7,
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

function buildSystemPrompt(businessContext: BusinessContext, marketData: any[]): string {
  const marketInsights = marketData?.map(d => 
    `- ${d.industry}: ${d.data_payload?.summary || 'Market activity detected'}`
  ).join('\n') || '';

  return `You are BizMap AI, an expert business planning assistant specialized in helping entrepreneurs validate, plan, and launch their business ideas.

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
- Keep responses focused and under 150 words
- Ask ONE specific follow-up question per response
- Include practical, actionable advice
- Reference their previous answers to show continuity
- Use business terminology appropriately but avoid jargon
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
  if (messageCount <= 2) return 'discovery';
  if (context.industry && context.stage) return 'validation';
  if (context.goals?.length && context.industry) return 'planning';
  return 'execution';
}

function generateQuickActions(stage: string, context: BusinessContext): string[] {
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