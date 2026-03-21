import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// ─── Inlined: credit-constants ───────────────────────────────────────────────
const CREDIT_COSTS = {
  PMF_SCORING: 8,
} as const;

const ADMIN_EMAIL = 'admin@creatives-takeover.com';

// ─── Inlined: getUserFromAuth ─────────────────────────────────────────────────
async function getUserFromAuth(req: Request): Promise<{ id: string; email?: string | null } | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return null;

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (error || !user) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

// ─── Inlined: checkAndDeductCredits ──────────────────────────────────────────
interface CreditDeductionResult {
  success: boolean;
  newBalance?: number;
  newQuota?: number;
  usedFromQuota?: number;
  usedFromBalance?: number;
  error?: string;
  errorCode?: 'INSUFFICIENT_CREDITS' | 'USER_NOT_FOUND' | 'DEDUCTION_FAILED';
}

async function checkAndDeductCredits(
  userId: string,
  amount: number,
  feature: string,
  sessionId?: string,
  metadata?: Record<string, any>
): Promise<CreditDeductionResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Supabase configuration missing', errorCode: 'DEDUCTION_FAILED' };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: 'Invalid credit amount', errorCode: 'DEDUCTION_FAILED' };
  }

  const { data: deductionData, error: deductionError } = await supabase.rpc('deduct_credits_atomic', {
    p_user_id: userId,
    p_amount: amount,
    p_feature: feature,
    p_session_id: sessionId ?? null,
    p_metadata: metadata ?? {},
  });

  if (deductionError || !deductionData) {
    console.error('Error running deduct_credits_atomic:', deductionError);
    return { success: false, error: 'Failed to update credit balance', errorCode: 'DEDUCTION_FAILED' };
  }

  const result = deductionData as CreditDeductionResult;
  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Credit deduction failed',
      errorCode: result.errorCode || 'DEDUCTION_FAILED'
    };
  }

  return {
    success: true,
    newBalance: result.newBalance,
    newQuota: result.newQuota,
    usedFromQuota: result.usedFromQuota,
    usedFromBalance: result.usedFromBalance,
  };
}

// ─── Inlined: refundCredits ───────────────────────────────────────────────────
async function refundCredits(
  userId: string,
  amount: number,
  feature: string,
  reason: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey || !Number.isFinite(amount) || amount <= 0) return false;

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    const { data: current, error: fetchError } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (fetchError || !current) return false;

    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ balance: ((current as any).balance || 0) + amount })
      .eq('user_id', userId);

    if (updateError) return false;

    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount,
      tx_type: 'refund',
      reason,
      feature,
      metadata: metadata || {},
    });

    return true;
  } catch {
    return false;
  }
}

// ─── CORS headers ─────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

// ─── Request / Response types ─────────────────────────────────────────────────
interface PMFEvidenceAnswers {
  testTypes: string[];
  peopleReached: number;
  conversationCount: number;
  strongInterestCount: number;
  willingnessToPaySignal: 'yes' | 'no' | 'not_tested';
  willingnessToPayDetail?: string;
  mostPainfulQuote: string;
  urgencyProxy: string;
  consistencyNote: string;
  askedAboutPricing: number;
  joinedWaitlist: number;
  sharedWithSomeone: number;
  offeredToPay: number;
  founderUncertainties: string;
  whatWouldChangeMind: string;
  confidenceLevel: number;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
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

    const body: PMFEvidenceAnswers = await req.json();

    // Basic validation
    if (!body.testTypes?.length || body.conversationCount < 1) {
      return new Response(JSON.stringify({ error: 'Missing required evidence fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const creditCost = CREDIT_COSTS.PMF_SCORING;
    const creditResult = user.email?.toLowerCase() === ADMIN_EMAIL
      ? { success: true }
      : await checkAndDeductCredits(
          user.id,
          creditCost,
          'PMF Evidence Analysis',
          undefined,
          { testTypes: body.testTypes }
        );

    if (!creditResult.success) {
      return new Response(JSON.stringify({
        error: creditResult.error || 'Credit deduction failed',
        creditError: true,
        errorCode: creditResult.errorCode,
        requiredCredits: creditCost,
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    const demandTotal = (body.askedAboutPricing || 0) + (body.joinedWaitlist || 0) +
                        (body.sharedWithSomeone || 0) + (body.offeredToPay || 0);
    const wtpDetail = body.willingnessToPaySignal === 'yes' && body.willingnessToPayDetail
      ? body.willingnessToPayDetail
      : body.willingnessToPaySignal === 'no' ? 'No WTP signal observed'
      : 'Not tested yet';

    const systemPrompt = `You are a rigorous PMF (Product-Market Fit) evidence evaluator. Founders bring you real validation evidence they have collected. Your job is to evaluate the QUALITY of that evidence — not the idea itself — and produce a PMF Readiness Score from 0 to 100.

SCORING RUBRIC — five dimensions, each 0–20 points:

1. PAIN CLARITY (0–20)
   • 18–20: Highly specific, recurring pain described by multiple people with exact words or examples (e.g., "I lose 2 hours every Friday chasing feedback in email threads")
   • 12–17: Clear pain but not specific enough, OR came from only 1–2 people
   • 6–11: Vague or generic pain ("it's annoying", "could be better") — hard to build from
   • 0–5: No clear pain articulated

2. URGENCY (0–20)
   • 18–20: People are actively doing something about this today (workarounds, paying for alternatives, spending time on it)
   • 12–17: Strong frustration but no observed active behavior to address it
   • 6–11: "Would be nice to solve" — latent awareness, no urgency
   • 0–5: No urgency signal at all; nice-to-have at best

3. CONSISTENCY (0–20)
   • 18–20: 5+ people independently said similar things without prompting
   • 12–17: 3–4 people showed similar patterns
   • 6–11: 1–2 agreements; others had mixed or different responses
   • 0–5: Scattered results, no common thread across people

4. DEMAND PROOF (0–20)
   • 18–20: Money committed, pre-orders taken, or multiple people actively asked about pricing
   • 12–17: Waitlist signups, "when will this be ready?", or shared with peers
   • 6–11: People said "I would use it" or "sounds interesting" — no behavior
   • 0–5: No concrete demand behavior — only verbal agreement or theoretical interest

5. FOUNDER SELF-AWARENESS (0–20)
   • 18–20: Clearly identifies specific remaining unknowns AND what evidence would change their mind
   • 12–17: Knows some gaps but vague about next steps
   • 6–11: Overconfident OR says "I don't know" without specifics
   • 0–5: No reflection on what they still don't know; treating evidence as definitive

TOTAL SCORE = sum of 5 dimensions (0–100)

VERDICT RULES:
• 75–100: verdict = "ready", verdictLabel = "Strong Validation"
• 50–74: verdict = "partial", verdictLabel = "Partial Validation"
• 0–49: verdict = "weak", verdictLabel = "Insufficient Evidence"

RECOMMENDATION RULES:
• Generate 3–5 recommendations ordered by urgency
• For any dimension < 8: priority = "critical" (blocking — must resolve before building)
• For any dimension 8–13: priority = "important"
• For score ≥ 75 but a dimension could be stronger: priority = "nice"
• Each recommendation must be specific and executable — no generic advice like "talk to more users"
• The "action" field must be a concrete thing to do (e.g., "DM 10 ops managers on LinkedIn using this exact opening: 'Hey [name], how do you currently track...'")

OUTPUT: Return ONLY valid JSON matching this exact schema:

{
  "overallScore": number,
  "verdict": "ready" | "partial" | "weak",
  "verdictLabel": "Strong Validation" | "Partial Validation" | "Insufficient Evidence",
  "summaryInsight": "string — 2–3 sentences of honest, direct assessment of the evidence quality",
  "dimensions": {
    "painClarity":          { "score": number, "explanation": "string — 1–2 sentences on what evidence supports or hurts this score" },
    "urgency":              { "score": number, "explanation": "string" },
    "consistency":          { "score": number, "explanation": "string" },
    "demandProof":          { "score": number, "explanation": "string" },
    "founderSelfAwareness": { "score": number, "explanation": "string" }
  },
  "strengths": ["string", "string"],
  "gaps": ["string", "string"],
  "recommendations": [
    {
      "priority": "critical" | "important" | "nice",
      "title": "string — short action name",
      "action": "string — exactly what to do, specific enough to start tomorrow",
      "timeframe": "string — e.g. This week / 2–3 weeks / Before MVP scope"
    }
  ],
  "readyToScope": boolean,
  "nextExperiment": "string — only when verdict is partial or weak; specific test to run next"
}`;

    const userPrompt = `EVIDENCE SUBMITTED BY FOUNDER:

Validation methods used: ${body.testTypes.join(', ')}
People reached/contacted: ${body.peopleReached}
Actual conversations/responses: ${body.conversationCount}
People expressing strong interest: ${body.strongInterestCount}
Willingness to pay signal: ${wtpDetail}

WHAT THEY HEARD:
Most painful quote/pattern: "${body.mostPainfulQuote}"
What people do today to solve this (urgency proxy): "${body.urgencyProxy}"
Consistency observation: "${body.consistencyNote}"

DEMAND SIGNALS:
• Asked about pricing: ${body.askedAboutPricing}
• Joined waitlist or signed up: ${body.joinedWaitlist}
• Shared with someone else: ${body.sharedWithSomeone}
• Offered to pay or pre-commit: ${body.offeredToPay}
Total demand behaviors: ${demandTotal}

FOUNDER REFLECTION:
What I'm still unsure about: "${body.founderUncertainties}"
What would change my mind: "${body.whatWouldChangeMind}"
Confidence level (1–10): ${body.confidenceLevel}

Apply the scoring rubric to this evidence and return the PMF readiness JSON.`;

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
          temperature: 0.3,
          max_tokens: 2500,
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
        analysis = JSON.parse(aiData.choices[0].message.content);
      } catch {
        const content = aiData.choices[0].message.content;
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Failed to parse AI response as JSON');
        }
      }

      // Attach evidence answers and timestamp
      analysis.evidenceAnswers = body;
      analysis.generatedAt = new Date().toISOString();

      // Store to pmf_analysis_results
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      let analysisId: string | null = null;
      try {
        const { data: storedData, error: storeError } = await supabase
          .from('pmf_analysis_results' as any)
          .insert({
            user_id: user.id,
            analysis_data: analysis,
            pmf_score: analysis.overallScore,
            target_market: body.testTypes.join(', '),
          })
          .select('id')
          .single();

        if (!storeError && storedData) {
          analysisId = (storedData as any).id;
        } else {
          console.warn('Failed to store PMF analysis:', storeError);
        }
      } catch (storeError) {
        console.warn('Error storing PMF analysis:', storeError);
      }

      return new Response(JSON.stringify({
        success: true,
        analysis,
        analysisId,
        creditsUsed: creditCost,
        newBalance: creditResult.newBalance,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (aiError) {
      const err = aiError instanceof Error ? aiError : new Error(String(aiError));
      await refundCredits(user.id, creditCost, 'PMF Evidence Analysis', 'Refund: AI processing failed', { error: err.message });
      throw aiError;
    }

  } catch (error) {
    console.error('Error in pmf-evidence-scorer:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
