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

interface ICPAnalysisRequest {
  businessDescription: string;
  targetAudience?: string;
  industry?: string;
  competitors?: string;
  unfairAdvantage?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const {
      businessDescription,
      targetAudience,
      industry,
      competitors,
      unfairAdvantage
    }: ICPAnalysisRequest = await req.json();

    // Validate required fields
    if (!businessDescription || !businessDescription.trim()) {
      return new Response(JSON.stringify({
        error: 'Missing required field: businessDescription'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const idempotencyKey = await resolveCreditIdempotencyKey(req, {
      userId: user.id,
      feature: 'ICP Analysis',
      requestFingerprint: {
        businessDescription,
        targetAudience,
        industry,
        competitors,
        unfairAdvantage,
      },
    });

    // Check and deduct credits
    const creditCost = CREDIT_COSTS.ICP_ANALYSIS;
    const creditResult = await checkAndDeductCredits(
      user.id,
      creditCost,
      'ICP Analysis',
      undefined,
      { businessDescription: businessDescription.substring(0, 100), idempotencyKey }
    );

    if (!creditResult.success) {
      return new Response(JSON.stringify({
        error: creditResult.error || 'Credit deduction failed',
        creditError: true,
        errorCode: creditResult.errorCode,
        requiredCredits: creditCost
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Fetch market validation data
    let marketValidationData: any = null;
    let redditDiscussions: any[] = [];
    let competitorData: any = null;

    try {
      console.log('Fetching market validation data for ICP analysis...');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const validationResponse = await supabase.functions.invoke('market-validation-engine', {
        body: {
          business_idea: businessDescription,
          industry: industry || undefined,
          target_market: targetAudience || undefined,
        },
        headers: {
          'Authorization': req.headers.get('Authorization') || '',
        }
      });

      if (validationResponse.data?.success && validationResponse.data?.validation_score) {
        marketValidationData = validationResponse.data.validation_score;
        redditDiscussions = marketValidationData.reddit_discussions || [];
        competitorData = {
          top_competitors: marketValidationData.top_competitors || [],
          competitor_gaps: marketValidationData.competitor_gaps || [],
          differentiation_opportunities: marketValidationData.differentiation_opportunities || [],
          competition_score: marketValidationData.competition_score,
          demand_score: marketValidationData.demand_score,
          market_size_score: marketValidationData.market_size_score,
        };
        console.log(`Found ${redditDiscussions.length} Reddit discussions and ${competitorData.top_competitors.length} competitors`);
      }
    } catch (error) {
      console.warn('Market validation fetch failed, continuing with AI-only analysis:', error);
    }

    // Build the ICP analysis prompt
    const prompt = `You are an expert ICP strategist for early-stage startups. Your job is not to write a broad persona report. Your job is to help a founder choose the strongest first customer segment to pursue and decide what to validate next.

OPERATING RULES:
- Be concrete, specific, and execution-oriented.
- Prioritize role, workflow, trigger event, pain, buying context, and reachability over generic psychographics.
- Do not invent false precision. If evidence is weak, say confidence is low or medium.
- Use the founder's actual inputs and any real market data provided.
- Recommend ONE best first ICP, explain why, and explicitly say who not to target yet.
- Output should help a founder decide what to do in the next 2-4 weeks.

BUSINESS DESCRIPTION:
${businessDescription}

TARGET AUDIENCE: ${targetAudience || 'Not specified - infer the strongest first ICP from the business description'}
INDUSTRY: ${industry || 'Not specified - infer carefully from the business description'}
${competitors ? `\nCOMPETITORS PROVIDED BY USER:\n${competitors}` : ''}
${unfairAdvantage ? `\nFOUNDER EDGE:\n${unfairAdvantage}` : ''}

${marketValidationData ? `\n=== REAL MARKET DATA ===
${redditDiscussions.length > 0 ? `\nREDDIT COMMUNITY INSIGHTS (${redditDiscussions.length} relevant discussions):
${redditDiscussions.slice(0, 5).map((d: any, i: number) => `${i + 1}. "${d.title}" (r/${d.subreddit}) - ${d.sentiment} sentiment, ${d.upvotes} upvotes`).join('\n')}` : ''}

${competitorData && competitorData.top_competitors?.length > 0 ? `\nCOMPETITOR ANALYSIS:
${competitorData.top_competitors.slice(0, 5).map((c: any, i: number) => `${i + 1}. ${c.name}${c.strengths ? ` - Strengths: ${c.strengths.slice(0, 2).join(', ')}` : ''}${c.weaknesses ? ` - Weaknesses: ${c.weaknesses.slice(0, 2).join(', ')}` : ''}`).join('\n')}

Competition Score: ${competitorData.competition_score}/100
Demand Score: ${competitorData.demand_score}/100
Market Size Score: ${competitorData.market_size_score}/100

${competitorData.competitor_gaps?.length > 0 ? `Competitor Gaps:\n${competitorData.competitor_gaps.slice(0, 3).map((g: any, i: number) => `${i + 1}. ${typeof g === 'string' ? g : g.gap || g}`).join('\n')}` : ''}
${competitorData.differentiation_opportunities?.length > 0 ? `Differentiation Opportunities:\n${competitorData.differentiation_opportunities.slice(0, 3).map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}` : ''}` : ''}

Use this real market data wherever possible. Prefer real signals over assumptions.` : ''}

YOUR TASK:
Return a decision-first ICP analysis with these sections:

1. RECOMMENDATION
   - primaryIcp: the single best first segment to target
   - whyThisIcp: why this segment is the strongest opening wedge
   - problemToWin: the specific pain to anchor on
   - valueWedge: the core advantage that should matter to this ICP
   - decision: clear recommendation about what the founder should do next
   - confidence: High / Medium / Low
   - confidenceReason: why confidence is at that level
   - evidenceSignals: 3-5 concrete signals supporting the recommendation
   - doNotTargetYet: 2-4 adjacent segments to avoid for now
   - openQuestions: 3-5 unknowns the founder still needs to validate

2. CUSTOMER PROFILE
   - segmentName
   - whoTheyAre: concise explanation of the ICP
   - buyer: who approves or owns the purchase
   - user: who uses the product day to day
   - organizationContext
   - triggerMoments: 3-5 events that make them seek a solution
   - urgencySignals: 3-5 signs the pain is active now
   - currentAlternatives: 3-5 alternatives or workarounds
   - switchingCosts: 3-5 barriers to changing behavior
   - buyingMotion
   - budgetOwner
   - channels: 4-6 realistic channels or communities to reach them

3. PAIN POINTS
   Provide 4-6 pains.
   For each:
   - painPoint
   - severity: Critical / High / Medium / Low
   - whenItShowsUp
   - currentWorkaround
   - whyUnresolved
   - switchingBarrier
   - opportunityScore: 1-10

4. POSITIONING
   - oneLiner: simple positioning line
   - positioningStatement: fuller version
   - valueProposition
   - differentiators: 3-5
   - proofPoints: 3-5 believable proof points or proof angles
   - messagePillars: 3-5 messaging themes
   - objections: 3-5 likely objections with responses

5. VALIDATION PLAN
   - immediateGoal: what the founder should prove next
   - verdict: Strong Wedge / Worth Testing / Needs Sharper Focus
   - overallScore: 0-100
   - scoreBreakdown:
     * pain
     * specificity
     * differentiation
     * reachability
   - reasoning
   - experiments: 4-6 experiments, each with priority, hypothesis, test, successSignal, timeToRun
   - milestones: 3-5 near-term milestones

Return valid JSON in exactly this structure:
{
  "recommendation": {
    "primaryIcp": "string",
    "whyThisIcp": "string",
    "problemToWin": "string",
    "valueWedge": "string",
    "decision": "string",
    "confidence": "High" | "Medium" | "Low",
    "confidenceReason": "string",
    "evidenceSignals": ["string"],
    "doNotTargetYet": ["string"],
    "openQuestions": ["string"]
  },
  "customerProfile": {
    "segmentName": "string",
    "whoTheyAre": "string",
    "buyer": "string",
    "user": "string",
    "organizationContext": "string",
    "triggerMoments": ["string"],
    "urgencySignals": ["string"],
    "currentAlternatives": ["string"],
    "switchingCosts": ["string"],
    "buyingMotion": "string",
    "budgetOwner": "string",
    "channels": ["string"]
  },
  "painPoints": [
    {
      "painPoint": "string",
      "severity": "Critical" | "High" | "Medium" | "Low",
      "whenItShowsUp": "string",
      "currentWorkaround": "string",
      "whyUnresolved": "string",
      "switchingBarrier": "string",
      "opportunityScore": number
    }
  ],
  "positioning": {
    "oneLiner": "string",
    "positioningStatement": "string",
    "valueProposition": "string",
    "differentiators": ["string"],
    "proofPoints": ["string"],
    "messagePillars": ["string"],
    "objections": [
      {
        "objection": "string",
        "response": "string"
      }
    ]
  },
  "validationPlan": {
    "immediateGoal": "string",
    "verdict": "Strong Wedge" | "Worth Testing" | "Needs Sharper Focus",
    "overallScore": number,
    "scoreBreakdown": {
      "pain": number,
      "specificity": number,
      "differentiation": number,
      "reachability": number
    },
    "reasoning": "string",
    "experiments": [
      {
        "priority": "High" | "Medium" | "Low",
        "hypothesis": "string",
        "test": "string",
        "successSignal": "string",
        "timeToRun": "string"
      }
    ],
    "milestones": ["string"]
  }
}`;

    // Wrap AI processing in try/catch for credit refund on failure
    try {
    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert ICP strategist for early-stage founders.

CRITICAL REQUIREMENTS:
1. Always return valid JSON in the exact structure specified.
2. Recommend one best first ICP, not a broad market.
3. Prefer operational specifics over fluffy personas.
4. If evidence is weak, lower confidence instead of inventing certainty.
5. When real market data is provided, prioritize it.
6. Make every recommendation usable within the next 30 days.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 6000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API Error:', errorText);
      throw new Error(`OpenAI API Error: ${openaiResponse.status}`);
    }

    const aiData = await openaiResponse.json();
    let analysisResult;

    try {
      const content = aiData.choices[0].message.content;
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    let storedAnalysisId: string | null = null;
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: storedData, error: storeError } = await supabase
        .from('icp_analysis_results')
        .insert({
          user_id: user.id,
          business_description: businessDescription,
          target_audience: targetAudience || null,
          industry: industry || null,
          analysis_data: analysisResult,
          niche_score: analysisResult?.validationPlan?.overallScore ?? null,
          verdict: analysisResult?.validationPlan?.verdict ?? null,
        })
        .select('id')
        .single();

      if (!storeError && storedData) {
        storedAnalysisId = storedData.id;
      } else {
        console.warn('Failed to store ICP analysis result:', storeError);
      }
    } catch (storeError) {
      console.warn('Error storing ICP analysis result:', storeError);
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: analysisResult,
      analysisId: storedAnalysisId,
      creditsUsed: creditCost,
      newBalance: creditResult.newBalance
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    } catch (aiError) {
      // Refund credits on AI processing failure
      const err = aiError instanceof Error ? aiError : new Error(String(aiError));
      await refundCredits(user.id, creditCost, 'ICP Analysis', 'Refund: AI processing failed', { error: err.message });
      throw aiError;
    }

  } catch (error) {
    console.error('Error in ICP analyzer:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
