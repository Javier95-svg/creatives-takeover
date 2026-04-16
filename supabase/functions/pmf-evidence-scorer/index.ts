import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';

const MIN_INTERVIEWS_FOR_READY = 25;

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
  interviews: PMFInterviewLog[];
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

interface PMFInterviewLog {
  id: string;
  intervieweeName: string;
  basicProfile: string;
  segment: string;
  mainFeedback: string;
  objections: string;
  missingFeatures: string;
  interestLevel: number;
  buyingIntent: 'low' | 'medium' | 'high' | 'ready_to_pay';
  landingPageShown: boolean;
  solutionPitched: boolean;
  askedAboutPricing: boolean;
  joinedWaitlist: boolean;
  referredSomeone: boolean;
  offeredToPay: boolean;
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
    const interviews = Array.isArray(body.interviews) ? body.interviews : [];
    const loggedInterviewCount = interviews.length || body.conversationCount || 0;

    if (!body.testTypes?.length || loggedInterviewCount < 1) {
      return new Response(JSON.stringify({ error: 'Missing required evidence fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const creditCost = CREDIT_COSTS.PMF_SCORING;
    const creditResult = await checkAndDeductCredits(
      user.id,
      creditCost,
      'PMF Evidence Analysis',
      undefined,
      { testTypes: body.testTypes, entitlementFeature: 'PMF_SCORING' }
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

    const derivedStrongInterestCount = interviews.filter(
      (item) => item.interestLevel >= 4 || item.buyingIntent === 'high' || item.buyingIntent === 'ready_to_pay'
    ).length;
    const derivedAskedAboutPricing = interviews.filter((item) => item.askedAboutPricing).length;
    const derivedJoinedWaitlist = interviews.filter((item) => item.joinedWaitlist).length;
    const derivedSharedWithSomeone = interviews.filter((item) => item.referredSomeone).length;
    const derivedOfferedToPay = interviews.filter((item) => item.offeredToPay).length;
    const strongInterestCount = interviews.length > 0 ? derivedStrongInterestCount : (body.strongInterestCount || 0);
    const askedAboutPricing = interviews.length > 0 ? derivedAskedAboutPricing : (body.askedAboutPricing || 0);
    const joinedWaitlist = interviews.length > 0 ? derivedJoinedWaitlist : (body.joinedWaitlist || 0);
    const sharedWithSomeone = interviews.length > 0 ? derivedSharedWithSomeone : (body.sharedWithSomeone || 0);
    const offeredToPay = interviews.length > 0 ? derivedOfferedToPay : (body.offeredToPay || 0);
    const demandTotal = askedAboutPricing + joinedWaitlist + sharedWithSomeone + offeredToPay;
    const wtpDetail = body.willingnessToPaySignal === 'yes' && body.willingnessToPayDetail
      ? body.willingnessToPayDetail
      : body.willingnessToPaySignal === 'no' ? 'No WTP signal observed'
      : 'Not tested yet';
    const interviewLogSummary = interviews.length > 0
      ? interviews.map((interview, index) => (
          `${index + 1}. ${interview.intervieweeName} | Segment: ${interview.segment} | Profile: ${interview.basicProfile}\n` +
          `   Main feedback: ${interview.mainFeedback}\n` +
          `   Objections: ${interview.objections}\n` +
          `   Missing features: ${interview.missingFeatures}\n` +
          `   Interest level: ${interview.interestLevel}/5 | Buying intent: ${interview.buyingIntent}\n` +
          `   Landing page shown: ${interview.landingPageShown ? 'yes' : 'no'} | Solution pitched: ${interview.solutionPitched ? 'yes' : 'no'}\n` +
          `   Demand behaviors: pricing=${interview.askedAboutPricing ? 'yes' : 'no'}, waitlist=${interview.joinedWaitlist ? 'yes' : 'no'}, referral=${interview.referredSomeone ? 'yes' : 'no'}, pay=${interview.offeredToPay ? 'yes' : 'no'}`
        )).join('\n\n')
      : 'No structured interview records provided.';

    const systemPrompt = `You are PMF Lab, a rigorous PMF (Product-Market Fit) evidence evaluator inside a startup development platform. Founders use you in Stage III: Validation, after they already created a landing page in Stage II: Prototyping. Your job is to evaluate the QUALITY of customer-demand evidence — not the idea itself — and produce a PMF score from 0 to 100.

IMPORTANT PRODUCT RULES:
• PMF Lab is designed around real founder interviews plus landing-page feedback.
• Use the structured interview log as the PRIMARY source of truth. Treat high-level founder summaries as supporting context only.
• The founder should complete at least ${MIN_INTERVIEWS_FOR_READY} interviews before moving to Building.
• If conversationCount is below ${MIN_INTERVIEWS_FOR_READY}, the result may still be useful directionally, but you MUST NOT recommend moving to Building.
• If conversationCount is below ${MIN_INTERVIEWS_FOR_READY}, overallScore MUST be capped at 74 and recommendedAction MUST be "iterate_before_building".
• If the founder logs many interviews but the records are thin, vague, repetitive, or missing objections/missing-feature detail, lower the score for evidence quality.

SPECIFICITY RULES — these are non-negotiable:
• When writing summaryInsight, strengths, gaps, diagnosis, or contradictions: reference specific interviewees by name and segment when the interview log supports it. Do NOT use phrases like "several participants", "some users", or "many interviewees". Name the pattern AND the person. Example: "Maria Gomez (B2B agency owner) and two others independently raised the same Slack integration blocker."
• scoreMeaning must be specific to the actual score value and the evidence submitted. Do not use generic template phrases like "your interviews show enough pain". Connect the score to what was actually found.
• nextExperiment must describe a specific test the founder can run given their actual product, segments, and gaps. It must never be a generic instruction like "run more interviews".

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

DECISION RULES:
• If overallScore >= 75 and conversationCount >= ${MIN_INTERVIEWS_FOR_READY}: recommendedAction = "move_to_building", recommendedActionTitle = "Move to Building"
• Otherwise: recommendedAction = "iterate_before_building", recommendedActionTitle = "Iterate Before Building"

RECOMMENDATION RULES:
• Generate 3–5 recommendations ordered by urgency
• For any dimension < 8: priority = "critical" (blocking — must resolve before building)
• For any dimension 8–13: priority = "important"
• For score ≥ 75 but a dimension could be stronger: priority = "nice"
• Each recommendation must be specific and executable — no generic advice like "talk to more users"
• The "action" field must be a concrete thing to do (e.g., "DM 10 ops managers on LinkedIn using this exact opening: 'Hey [name], how do you currently track...'")
• Always include at least one "critical" recommendation even if all dimensions score above 8 — there is always one highest-leverage action

DIAGNOSIS RULES:
• diagnosis is a 3–5 sentence paragraph that synthesizes the five dimension scores into a specific pattern interpretation. It goes beyond describing what was found and explains what the pattern means for this specific product and founder. Example: "You have genuine pain signal (Pain Clarity: 16) but the buying intent is weak (Demand Proof: 7). This gap typically means the problem is real but your current solution framing is not landing as the obvious fix. The segment consistency is also low, which suggests you may be reaching too broad a range of profiles — the pain is real for some but not acute enough for others to act."

CONTRADICTION RULES:
• contradictions is an array of 1–2 specific tensions in the evidence. A contradiction is when two signals point in opposite directions and together reveal something important the founder should address. Examples:
  - "High urgency (16/20) but zero demand behaviors (no pricing asks, no waitlist signups) — this means people feel the pain but do not yet see your solution as the fix."
  - "Three interviewees said they would pay, but the same three also listed missing integrations as blockers. This suggests willingness to pay is conditional, not confirmed."
• If there are no genuine contradictions, return an empty array.

OUTPUT: Return ONLY valid JSON matching this exact schema:

{
  "overallScore": number,
  "verdict": "ready" | "partial" | "weak",
  "verdictLabel": "Strong Validation" | "Partial Validation" | "Insufficient Evidence",
  "summaryInsight": "string — 2–3 sentences grounded in specific evidence from the interview log",
  "scoreMeaning": "string — specific to this score and evidence; explain what it means for this founder right now, not generically",
  "diagnosis": "string — 3–5 sentence paragraph synthesizing the dimension pattern into a specific product/founder interpretation",
  "recommendedAction": "move_to_building" | "iterate_before_building",
  "recommendedActionTitle": "Move to Building" | "Iterate Before Building",
  "dimensions": {
    "painClarity":          { "score": number, "explanation": "string — 1–2 sentences on what specific evidence supports or hurts this score" },
    "urgency":              { "score": number, "explanation": "string" },
    "consistency":          { "score": number, "explanation": "string" },
    "demandProof":          { "score": number, "explanation": "string" },
    "founderSelfAwareness": { "score": number, "explanation": "string" }
  },
  "contradictions": ["string — 1–2 specific tensions in the evidence; empty array if none"],
  "strengths": ["string — reference named interviewees where applicable"],
  "gaps": ["string — reference named interviewees where applicable"],
  "missingFeatures": ["string — what specific users said is missing before they would adopt or buy"],
  "commonObjections": ["string — recurring objections with context about who raised them"],
  "buyingSignals": ["string — strongest specific evidence of real demand or intent"],
  "improvementsBeforeRetest": ["string — specific thing to change before the next interview round"],
  "recommendations": [
    {
      "priority": "critical" | "important" | "nice",
      "title": "string — short action name",
      "action": "string — exactly what to do, specific enough to start tomorrow",
      "timeframe": "string — e.g. This week / 2–3 weeks / Before MVP scope"
    }
  ],
  "readyToScope": boolean,
  "nextExperiment": "string — specific test to run next given the actual product, segments, and gaps found; never generic"
}`;

    const userPrompt = `EVIDENCE SUBMITTED BY FOUNDER:

Validation methods used: ${body.testTypes.join(', ')}
People reached/contacted: ${body.peopleReached}
Actual conversations/responses: ${loggedInterviewCount}
People expressing strong interest: ${strongInterestCount}
Willingness to pay signal: ${wtpDetail}
Minimum interview threshold to move to Building: ${MIN_INTERVIEWS_FOR_READY}

STRUCTURED INTERVIEW LOG:
${interviewLogSummary}

WHAT THEY HEARD:
Most painful quote/pattern: "${body.mostPainfulQuote}"
What people do today to solve this and how urgent it feels: "${body.urgencyProxy}"
Repeated objections, missing features, or consistency observation: "${body.consistencyNote}"

DEMAND SIGNALS:
• Asked about pricing: ${askedAboutPricing}
• Joined waitlist or signed up: ${joinedWaitlist}
• Shared with someone else: ${sharedWithSomeone}
• Offered to pay or pre-commit: ${offeredToPay}
Total demand behaviors: ${demandTotal}

FOUNDER REFLECTION:
What I'm still unsure about: "${body.founderUncertainties}"
What would change my mind: "${body.whatWouldChangeMind}"
Confidence level (1–10): ${body.confidenceLevel}

Apply the scoring rubric to this evidence and return the PMF readiness JSON. Make the final recommendation founder-friendly and concrete.`;

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
          max_tokens: 3500,
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
        creditsUsed: chargedCredits,
        newBalance: creditResult.newBalance,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (aiError) {
      const err = aiError instanceof Error ? aiError : new Error(String(aiError));
      if (chargedCredits > 0) {
        await refundCredits(user.id, chargedCredits, 'PMF Evidence Analysis', 'Refund: AI processing failed', { error: err.message });
      }
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
