import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireMemberOrWorker } from '../_shared/guards.ts';
import { generateJsonText, hasTextProvider } from '../_shared/json-generation.ts';

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

  // Every call spends our AI or API quota: our own jobs, or a signed-in member
  // within a per-minute limit.
  const caller = await requireMemberOrWorker(req, 'community-ai-moderator', 20);
  if (caller.error) return caller.error;

  try {
    if (!hasTextProvider()) {
      return new Response(JSON.stringify({ error: 'No AI provider is configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

    // Shared provider chain since 2026-11-16 (OpenAI alone had no credit from Nov 12).
    let contentText: string;
    try {
      contentText = (await generateJsonText({
        label: 'community-ai-moderator',
        feature: 'COMMUNITY_MODERATOR',
        openaiModel: 'gpt-4o-mini',
        system: systemPrompt,
        prompt: userContent,
        temperature: 0.4,
        maxTokens: 600,
        timeoutMs: 30_000,
      })).text;
    } catch (error) {
      console.error('community-ai-moderator: every AI provider failed:', error instanceof Error ? error.message : error);
      return new Response(JSON.stringify({ error: 'AI request failed' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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