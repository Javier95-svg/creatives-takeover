import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  title: string;
  content: string;
  tags?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = (await req.json()) as RequestBody;
    const { title, content, tags = [] } = body || {};

    if (!title || !content) {
      return new Response(JSON.stringify({ error: 'title and content are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemPrompt = `You are an AI community moderator and peer mentor for founders. Analyze the user's post and return strict JSON matching this schema:
{
  "tldr": string,                      // concise summary under 60 words
  "insights": string[],                // 3-6 bullet insights (risks, opportunities, blind spots)
  "related_topics": string[],          // 3-8 tags/topics to explore next
  "structured_idea": {                 // help structure the idea
    "problem": string,
    "solution": string,
    "audience": string,
    "next_steps": string[]             // 3-5 concrete, sequential next actions
  },
  "trending_angle": string,            // one discussion hook to spark replies
  "next_step": string                  // one immediate next action
}
Rules:
- Focus on clarity and practicality.
- Keep tone encouraging and collaborative.
- Avoid marketing fluff.
- Return ONLY valid JSON.`;

    const userContent = `Title: ${title}\n\nContent: ${content}\n\nTags: ${tags.join(', ')}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI error:', errText);
      return new Response(JSON.stringify({ error: 'OpenAI request failed', detail: errText }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const contentText = data?.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(contentText);
    } catch (e) {
      console.error('Failed to parse JSON response:', contentText);
      return new Response(JSON.stringify({ error: 'Invalid JSON from model' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Error in community-ai-moderator function:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});