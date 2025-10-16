import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, message, conversationHistory } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or access denied');
    }

    // Build context from conversation history
    const messages = conversationHistory?.map((msg: any) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : msg.content.text || ''
    })) || [];

    // Add current message
    messages.push({
      role: 'user',
      content: message
    });

    // System prompt for BizMap AI Cofounder
    const systemPrompt = `You are BizMap AI Cofounder, an expert business strategist helping entrepreneurs validate and launch their business ideas.

Current Project: ${project.title}
${project.idea_summary ? `Idea Summary: ${project.idea_summary}` : ''}

Your role is to:
1. Ask insightful questions to understand the business deeply
2. Identify market opportunities and challenges
3. Provide strategic recommendations
4. Generate artifacts when appropriate (market analysis, competitor research, financial projections, pitch deck)

When you have enough information, generate artifacts in JSON format:
{
  "type": "market" | "competitors" | "financials" | "overview" | "pitch_deck",
  "content": "markdown formatted content"
}

Be conversational, supportive, and actionable. Focus on helping the entrepreneur make informed decisions.`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;
    const tokensUsed = aiData.usage?.total_tokens || 0;

    // Check for artifacts in the response
    const artifacts = [];
    const artifactRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
    let match;
    
    while ((match = artifactRegex.exec(assistantMessage)) !== null) {
      try {
        const artifactData = JSON.parse(match[1]);
        if (artifactData.type && artifactData.content) {
          artifacts.push(artifactData);
        }
      } catch (e) {
        console.error('Error parsing artifact:', e);
      }
    }

    // Clean response (remove artifact JSON blocks)
    let cleanedMessage = assistantMessage.replace(artifactRegex, '').trim();

    return new Response(
      JSON.stringify({
        message: { text: cleanedMessage },
        artifacts,
        tokensUsed,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in bizmap-cofounder-chat:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
