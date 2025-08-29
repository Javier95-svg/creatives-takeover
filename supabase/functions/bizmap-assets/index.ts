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

// Input quality heuristic to decide when to ask clarifying questions first
function getInputQuality(answers: Record<string, string>) {
  const fields = ['overview','market','problem','solution','channels','pricing','goals'] as const;
  let score = 0;
  const reasons: string[] = [];
  for (const k of fields) {
    const v = (answers[k] || '').trim();
    if (v.length < 30) { score++; reasons.push(`${k}: too short`); }
    if (/(^|\b)(everyone|anyone|an app|a website|social media|people only)($|\b)/i.test(v)) {
      score++; reasons.push(`${k}: vague`);
    }
  }
  const quality = score >= 3 ? 'Weak' : score === 2 ? 'Fair' : 'Strong';
  return { quality, reasons };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, answers, stage, region }: BizMapAssetsRequest = await req.json();

    const { quality, reasons } = getInputQuality(answers);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const baseContext = `You are BizMap AI — an AI-powered startup advisor designed to help entrepreneurs turn ideas into businesses.

Your personality: professional, insightful, and practical.
Your role encompasses three key capacities:
1. **Startup Strategist** → break down ideas into step-by-step launch plans
2. **Market Analyst** → provide market research, competitive insights, and trend analysis  
3. **Funding Advisor** → suggest funding options, investor strategies, and financial planning

    REGION AWARE: ${region || 'Global'}
    STAGE: ${stage || 'Explore'}
    
    INPUT_QUALITY: ${quality}
    INPUT_QUALITY_REASONS: ${reasons.join('; ') || 'N/A'}
    
    CLARIFY-FIRST RULE:
    - If INPUT_QUALITY is "Weak": Ignore the asset request.
    - Return only this section:
    ## Clarifying Questions
    - 3–5 concise, targeted questions
    - Stop after the questions.
    
    USER INPUTS:
1) Overview: ${answers.overview}
2) Market: ${answers.market}
3) Problem: ${answers.problem}
4) Solution: ${answers.solution}
5) Channels: ${answers.channels}
6) Pricing/Costs: ${answers.pricing}
7) Goals: ${answers.goals}

ADVISOR RULES:
- Always organize content in clear sections with headings and bullet points
- Keep responses concise but actionable (no fluff)
- Tailor advice for early-stage entrepreneurs (limited budget, fast validation, practical actions)
- Include placeholders like [Name], [Company], [Benefit] where needed
- Use professional language that's accessible to non-technical founders
- Provide ranges and assumptions for any numbers (don't fabricate precise stats)
- Use Markdown with headings and fenced code blocks for all templates
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

    const wantsStream = req.headers.get('Accept')?.includes('text/event-stream');

    const payload = {
      model: 'gpt-5-mini-2025-08-07',
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
      ...(wantsStream ? { stream: true } as const : {})
    };

    const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!oaRes.ok) {
      const errorData = await oaRes.json().catch(() => ({}));
      console.error('OpenAI error (assets):', errorData);
      throw new Error(errorData.error?.message || 'Failed to generate asset');
    }

    if (wantsStream) {
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const reader = oaRes.body!.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
          } catch (err) {
            controller.error(err);
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
    }

    const data = await oaRes.json();
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
