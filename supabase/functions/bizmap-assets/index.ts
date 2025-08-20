import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AssetType = 'outreach' | 'social' | 'landing';

interface BizMapAssetsRequest {
  type: AssetType;
  answers: {
    overview: string;
    market: string;
    problem: string;
    solution: string;
    channels: string;
    pricing: string;
    goals: string;
  };
  stage?: string;
  region?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, answers, stage, region }: BizMapAssetsRequest = await req.json();

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const baseContext = `You are BizMap AI, a pragmatic startup co-founder. Generate the requested asset using the user's earlier inputs.

REGION AWARE: ${region || 'Global'}
STAGE: ${stage || 'Explore'}

USER INPUTS:
1) Overview: ${answers.overview}
2) Market: ${answers.market}
3) Problem: ${answers.problem}
4) Solution: ${answers.solution}
5) Channels: ${answers.channels}
6) Pricing/Costs: ${answers.pricing}
7) Goals: ${answers.goals}

RULES:
- Use plain, friendly language in English.
- Keep it short, skimmable, and copy-paste ready.
- Include placeholders like [Name], [Company], [Benefit] where needed.
- If you mention numbers, provide ranges and assumptions. Do not fabricate precise stats.
- Use Markdown with headings and fenced code blocks for templates.
`;

    let taskInstruction = '';
    switch (type) {
      case 'outreach':
        taskInstruction = `Create a "First Outreach Email" tailored to the user's idea and stage.
Include:
- A short subject line (3 options)
- A concise body (≤120 words) with 1 clear CTA
- A P.S. line
Format:
## First Outreach Email
\`\`\`
Subject: [Option A]

Hi [Name],
[Body...]

Best,
[Your Name]
P.S. [Short P.S.]
\`\`\`
`;
        break;
      case 'social':
        taskInstruction = `Write 3 short social posts to test the idea with the target audience across the best channel(s) for ${region || 'their region'} and stage ${stage || 'Explore'}.
Each post ≤ 50 words, with 1 hook, 1 benefit, and a clear CTA. Add 2-3 relevant hashtags.
Format:
## 3 Social Posts
1)
\`\`\`
[Post text]
\`\`\`
2)
\`\`\`
[Post text]
\`\`\`
3)
\`\`\`
[Post text]
\`\`\`
`;
        break;
      case 'landing':
        taskInstruction = `Sketch a simple landing page outline that matches the user's solution and audience.
Include:
- Hero (headline, subheadline, CTA)
- Problem → Solution bullets
- 3 Benefits
- Simple CTA section
- (Optional) Pricing box: ranges with assumptions (no fabricated precision)
Format:
## Simple Landing Page Outline
\`\`\`
[Section headings + copy]
\`\`\`
`;
        break;
      default:
        taskInstruction = 'Create a concise, copy-paste-ready asset.';
    }

    const prompt = `${baseContext}\n${taskInstruction}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are a pragmatic startup copilot. Always return clean Markdown ready to paste. Use short sentences and direct CTAs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 900,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI error (assets):', errorData);
      throw new Error(errorData.error?.message || 'Failed to generate asset');
    }

    const data = await response.json();
    const asset = data.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ asset }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in bizmap-assets function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
