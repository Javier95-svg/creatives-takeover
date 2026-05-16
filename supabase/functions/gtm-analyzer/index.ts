import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { resolveCreditIdempotencyKey } from '../_shared/request-idempotency.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

interface GTMAnalysisRequest {
  businessType: string;
  targetAudience: string;
  audienceOnlineHabits: string[];
  problemAndSolution: string;
  currentTraction: string;
  weeklyTimeForMarketing: string;
  budget?: string;
  founderStrengths?: string[];
  icpPositioningStatement?: string;
  icpNicheProfile?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: GTMAnalysisRequest = await req.json();
    const { businessType, targetAudience, problemAndSolution, currentTraction, weeklyTimeForMarketing } = body;

    if (!businessType || !targetAudience || !problemAndSolution || !currentTraction || !weeklyTimeForMarketing) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const idempotencyKey = await resolveCreditIdempotencyKey(req, {
      userId: user.id,
      feature: 'GTM Analysis',
      requestFingerprint: { businessType, targetAudience, problemAndSolution, currentTraction, weeklyTimeForMarketing },
    });

    const creditCost = CREDIT_COSTS.GTM_ANALYSIS;
    const creditResult = await checkAndDeductCredits(
      user.id,
      creditCost,
      'GTM Analysis',
      undefined,
      { businessType, idempotencyKey, entitlementFeature: 'GTM_ANALYSIS' }
    );
    const chargedCredits = (creditResult.usedFromQuota ?? 0) + (creditResult.usedFromBalance ?? 0);

    if (!creditResult.success) {
      return new Response(JSON.stringify({
        error: creditResult.error || 'Credit deduction failed',
        creditError: true,
        errorCode: creditResult.errorCode,
        requiredTier: creditResult.requiredTier,
        requiredCredits: creditCost,
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    const audienceHabits = (body.audienceOnlineHabits || []).join(', ') || 'Not specified';
    const budget = body.budget || '$0 (time only)';
    const strengths = (body.founderStrengths || []).join(', ') || 'Not specified';
    const icpContext = body.icpPositioningStatement
      ? `\nICP POSITIONING (from ICP Builder): ${body.icpPositioningStatement}`
      : '';
    const icpNiche = body.icpNicheProfile
      ? `\nICP NICHE PROFILE: ${body.icpNicheProfile}`
      : '';

    const systemPrompt = `You are an opinionated GTM strategist for early-stage founders. Your job is to recommend the 2-3 BEST channels for first traction — not a comprehensive list. Be decisive. Eliminate bad fits ruthlessly. Every tactic must be specific enough to execute tomorrow.

CHANNEL SCORING MATRIX (apply to each candidate channel):
Score each channel 0-10 on five dimensions:
- businessTypeFit (weight 0.30): B2B SaaS → LinkedIn, cold email, Reddit r/entrepreneur; B2C → Instagram, TikTok, Reddit niche subs; Marketplace → communities, partnerships; Content → SEO, newsletters
- audiencePresence (weight 0.25): Does the customer actually use this channel? Only score high if the founder checked it in their online habits list
- timeConstraint (weight 0.20): LinkedIn/Reddit/Email = 3+ hrs/wk minimum; Twitter/X building = 5+ hrs/wk; Product Hunt = 10 hrs one-time; SEO = 5+ hrs/wk; Discord = 2+ hrs/wk
- founderStrengthFit (weight 0.15): Writing → content, Reddit, LinkedIn posts; Networking → LinkedIn DMs, communities, partnerships; Video → TikTok, YouTube; Cold outreach → email, LinkedIn DMs
- tractionLevel (weight 0.10): Product Hunt requires existing beta users; Partnerships require some credibility; all others work from zero

FINAL SCORE = (businessTypeFit×0.30 + audiencePresence×0.25 + timeConstraint×0.20 + founderStrengthFit×0.15 + tractionLevel×0.10) × 10

HARD CONSTRAINT RULES (apply before scoring):
- If weekly time ≤ 5 hours → recommend max 2 channels
- If budget = "$0 (time only)" or "< $100" → exclude all paid/ads channels
- If traction = "None yet" → exclude Product Hunt (requires existing users)
- Only recommend channels scoring above 6.5
- Top 2 or 3 channels returned; if 3rd scores 6.5-7.5, mark isStretch: true

POSITIONING: Use Geoffrey Moore's formula exactly: "For [target customer] who [has problem], [product name] is a [category] that [key benefit]. Unlike [alternative], we [differentiator]."

MESSAGING: Headline must be 5-8 words. Hook must be ≤20 words. Both must be outcome-focused, not feature-focused.

ACTION PLAN: Week 1 tasks must be executable with no dependencies. No "set up a strategy" — only "do X, send Y, post Z."

OUTPUT FORMAT: Return ONLY valid JSON matching this exact schema. No commentary before or after.

{
  "planTitle": "string — concise plan name based on business type and audience",
  "summaryInsight": "string — 2-3 sentences explaining the strategic rationale for the recommended channels",
  "channels": [
    {
      "channel": "string — channel name (e.g. LinkedIn Direct Outreach)",
      "fitScore": number,
      "fitReason": "string — 2-3 sentences explaining why this channel fits this specific founder",
      "isStretch": boolean,
      "tactics": [
        {
          "title": "string — specific tactic name",
          "description": "string — exactly what to do",
          "frequency": "string — e.g. Daily, 3x/week, Weekly",
          "timeEstimate": "string — e.g. 20 min/day"
        }
      ],
      "weekOneActions": ["string — 3 concrete things to do THIS WEEK"],
      "doNotDo": ["string — 2 anti-tactics that kill results on this channel"]
    }
  ],
  "positioning": {
    "positioningStatement": "string — Moore formula",
    "uniqueValueProposition": "string — 1 sentence",
    "keyDifferentiators": ["string", "string", "string"]
  },
  "messaging": {
    "headline": "string — 5-8 words, outcome-focused",
    "hookLine": "string — ≤20 words, problem-aware",
    "proofPoint": "string — number, social proof, or specific claim",
    "ctaCopy": "string — action word + outcome",
    "toneOfVoice": ["string", "string", "string"]
  },
  "actionPlan": {
    "week1": ["string — 5-7 specific executable tasks"],
    "week2": ["string — 5-7 specific tasks that build on week 1"],
    "weeks3to4": ["string — 5-7 tasks for consolidation and first results"]
  },
  "launchChecklist": {
    "prelaunch": [{ "item": "string", "priority": "must" | "should" | "nice" }],
    "launchDay": [{ "item": "string", "priority": "must" | "should" | "nice" }],
    "postlaunch": [{ "item": "string", "priority": "must" | "should" | "nice" }]
  },
  "metrics": {
    "primary": [
      {
        "name": "string",
        "target": "string — e.g. >30% acceptance rate",
        "why": "string — why this metric matters at this stage",
        "howToMeasure": "string — exactly how to track this"
      }
    ],
    "laggingIndicators": ["string — 2-3 longer-term metrics to watch"]
  },
  "generatedAt": "string — ISO timestamp"
}`;

    const userPrompt = `FOUNDER PROFILE:
Business Type: ${businessType}
Target Customer: ${targetAudience}
Problem & Solution: ${problemAndSolution}
Current Traction: ${currentTraction}
Weekly Time Available for Marketing: ${weeklyTimeForMarketing}
Monthly Marketing Budget: ${budget}
Channels Customer Uses Online: ${audienceHabits}
Founder Strengths: ${strengths}${icpContext}${icpNiche}

Apply the scoring matrix, enforce all constraint rules, then generate the GTM Brief JSON.`;

    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.5,
          max_tokens: 6000,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('OpenAI API Error:', errorText);
        throw new Error(`OpenAI API Error: ${openaiResponse.status}`);
      }

      const aiData = await openaiResponse.json();
      let analysis;

      try {
        const content = aiData.choices[0].message.content;
        analysis = JSON.parse(content);
      } catch {
        const content = aiData.choices[0].message.content;
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Failed to parse AI response as JSON');
        }
      }

      // Add intake answers and timestamp for storage
      analysis.intakeAnswers = body;
      analysis.generatedAt = new Date().toISOString();

      let planId: string | null = null;
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: storedData, error: storeError } = await supabase
          .from('gtm_plans' as any)
          .insert({
            user_id: user.id,
            plan_title: analysis.planTitle,
            plan_content: analysis,
            status: 'draft',
          })
          .select('id')
          .single();

        if (!storeError && storedData) {
          planId = (storedData as any).id;
        } else {
          console.warn('Failed to store GTM plan:', storeError);
        }
      } catch (storeError) {
        console.warn('Error storing GTM plan:', storeError);
      }

      return new Response(JSON.stringify({
        success: true,
        analysis,
        planId,
        creditsUsed: chargedCredits,
        newBalance: creditResult.newBalance,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (aiError) {
      const err = aiError instanceof Error ? aiError : new Error(String(aiError));
      if (chargedCredits > 0) {
        await refundCredits(user.id, chargedCredits, 'GTM Analysis', 'Refund: AI processing failed', { error: err.message });
      }
      throw aiError;
    }

  } catch (error) {
    console.error('Error in GTM analyzer:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
