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

const validateRequest = (payload: Partial<ICPAnalysisRequest>) => {
  const issues: string[] = [];

  if (typeof payload.businessDescription !== 'string' || payload.businessDescription.trim().length < 30) {
    issues.push('businessDescription must be at least 30 characters');
  }

  const optionalFields: Array<keyof Omit<ICPAnalysisRequest, 'businessDescription'>> = [
    'targetAudience',
    'industry',
    'competitors',
    'unfairAdvantage',
  ];

  optionalFields.forEach((field) => {
    const value = payload[field];
    if (value !== undefined && typeof value !== 'string') {
      issues.push(`${field} must be a string when provided`);
    }
    if (typeof value === 'string' && value.length > 4000) {
      issues.push(`${field} is too long`);
    }
  });

  return issues;
};

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

    let payload: ICPAnalysisRequest;
    try {
      payload = await req.json();
    } catch (_error) {
      return new Response(JSON.stringify({
        error: 'Malformed JSON body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const validationIssues = validateRequest(payload);
    if (validationIssues.length > 0) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        validationIssues,
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const {
      businessDescription,
      targetAudience,
      industry,
      competitors,
      unfairAdvantage
    } = payload;

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

    // Check and deduct credits (cost of 0 means free — skip deduction entirely)
    const creditCost = CREDIT_COSTS.ICP_ANALYSIS;
    const creditResult = creditCost > 0
      ? await checkAndDeductCredits(
          user.id,
          creditCost,
          'ICP Analysis',
          undefined,
          { businessDescription: businessDescription.substring(0, 100), idempotencyKey }
        )
      : { success: true, newBalance: 0 };

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase service role credentials not configured');
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey);

    // Fetch market validation data
    let marketValidationData: any = null;
    let redditDiscussions: any[] = [];
    let competitorData: any = null;

    try {
      console.log('Fetching market validation data for ICP analysis...');
      const validationResponse = await serviceClient.functions.invoke('market-validation-engine', {
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
    const prompt = `You are an expert Ideal Customer Profile (ICP) strategist and niche market analyst. Your specialty is helping founders identify their most profitable, accessible niche market and develop a positioning strategy that makes them stand out.

CRITICAL INSTRUCTIONS:
- Be thorough, specific, and actionable. Every recommendation should be implementable.
- Base assessments on evidence from the business description and any market data provided.
- Identify a SPECIFIC niche (not broad markets). The more specific, the better.
- Focus on finding the niche with the highest pain intensity and lowest competition.
- Provide detailed demographic and psychographic profiles with enough detail to run targeted ads.
- Pain points should be specific and actionable, not generic platitudes.
- Positioning strategy should clearly differentiate from competitors.
- Use chain-of-thought reasoning for all assessments.

BUSINESS DESCRIPTION:
${businessDescription}

TARGET AUDIENCE: ${targetAudience || 'Not specified - identify the best niche from the business description'}
INDUSTRY: ${industry || 'Not specified - infer from business description'}
${competitors ? `\nCOMPETITORS PROVIDED BY USER:\n${competitors}` : ''}
${unfairAdvantage ? `\nUNFAIR ADVANTAGE:\n${unfairAdvantage}` : ''}

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

Use this real market data to inform your ICP analysis. Prioritize real data over assumptions.` : ''}

YOUR TASK:
Provide a comprehensive ICP analysis with the following sections:

1. NICHE PROFILE - Identify the MOST SPECIFIC viable niche for this product:
   - Niche name (specific, memorable label)
   - Niche description (2-3 sentences explaining who they are)
   - Demographics: age range, gender split, location, income level, education level, typical occupation
   - Psychographics: core values (3-5), interests (3-5), key behaviors (3-5), lifestyle description, attitudes description
   - Buying behavior: decision process, budget range, purchase frequency, purchase triggers (3-5)
   - Where to find them: online channels (3-5 specific platforms/communities), offline channels (2-3), communities (3-5 specific names), key influencers/voices they follow (3-5)
   - Niche size estimate
   - Growth trend for this niche

2. PAIN POINTS (5-8 specific pain points):
   For each:
   - Pain point description (specific, not generic)
   - Severity: Critical / High / Medium / Low
   - Frequency: How often they experience this
   - Current solution: What they use today
   - Gap in current solution: Why it falls short
   - Opportunity score (1-10): How much opportunity exists to solve this

3. POSITIONING STRATEGY:
   - Positioning statement (one powerful sentence: "For [target], [product] is the [category] that [key benefit] unlike [alternatives] because [reason]")
   - Unique value proposition (2-3 sentences)
   - Key differentiators (3-5 specific, defensible advantages)
   - Messaging framework:
     * Headline (attention-grabbing, benefit-driven)
     * Subheadline (supporting detail)
     * Key messages (3-5 core messages for marketing)
     * Tone of voice description
   - Competitive positioning (for each main competitor):
     * Their positioning
     * Your advantage over them
     * Differentiation angle
   - Brand personality traits (4-6 adjectives)

4. NICHE VIABILITY SCORE:
   - Overall score (0-100)
   - Verdict: "Highly Viable" (70+), "Promising" (50-69), or "Needs Refinement" (<50)
   - Sub-scores (each 0-100):
     * Market Size: Size and growth potential
     * Pain Intensity: How urgently they need a solution
     * Accessibility: How easy to reach and acquire
     * Competitive Gap: Room for differentiation
   - Reasoning (detailed explanation of scores)

5. ACTION PLAN (5-7 prioritized go-to-market steps):
   For each:
   - Priority: High / Medium / Low
   - Action (specific action item)
   - Description (why this matters and how to do it)
   - Channel (where to execute this)

Return your analysis as a JSON object with this exact structure:
{
  "nicheScore": {
    "overall": number,
    "verdict": "Highly Viable" | "Promising" | "Needs Refinement",
    "subScores": {
      "marketSize": number,
      "painIntensity": number,
      "accessibility": number,
      "competitiveGap": number
    },
    "reasoning": "string"
  },
  "nicheProfile": {
    "nicheName": "string",
    "nicheDescription": "string",
    "demographics": {
      "age": "string",
      "gender": "string",
      "location": "string",
      "income": "string",
      "education": "string",
      "occupation": "string"
    },
    "psychographics": {
      "values": ["string"],
      "interests": ["string"],
      "behaviors": ["string"],
      "lifestyle": "string",
      "attitudes": "string"
    },
    "buyingBehavior": {
      "decisionProcess": "string",
      "budgetRange": "string",
      "purchaseFrequency": "string",
      "triggers": ["string"]
    },
    "whereToFindThem": {
      "onlineChannels": ["string"],
      "offlineChannels": ["string"],
      "communities": ["string"],
      "influencers": ["string"]
    },
    "nicheSize": "string",
    "growthTrend": "string"
  },
  "painPoints": [
    {
      "painPoint": "string",
      "severity": "Critical" | "High" | "Medium" | "Low",
      "frequency": "string",
      "currentSolution": "string",
      "gapInCurrentSolution": "string",
      "opportunityScore": number
    }
  ],
  "positioningStrategy": {
    "positioningStatement": "string",
    "uniqueValueProposition": "string",
    "keyDifferentiators": ["string"],
    "messagingFramework": {
      "headline": "string",
      "subheadline": "string",
      "keyMessages": ["string"],
      "toneOfVoice": "string"
    },
    "competitivePositioning": [
      {
        "competitor": "string",
        "theirPositioning": "string",
        "yourAdvantage": "string",
        "differentiationAngle": "string"
      }
    ],
    "brandPersonality": ["string"]
  },
  "actionPlan": [
    {
      "priority": "High" | "Medium" | "Low",
      "action": "string",
      "description": "string",
      "channel": "string"
    }
  ]
}`;

    // Wrap AI processing in try/catch for credit refund on failure
    try {
	    // Call OpenAI API
      const openAiAbortController = new AbortController();
      const openAiTimeout = setTimeout(() => openAiAbortController.abort(), 60000);

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: openAiAbortController.signal,
        body: JSON.stringify({
	        model: 'gpt-4o',
	        messages: [
          {
            role: 'system',
            content: `You are an expert ICP (Ideal Customer Profile) strategist and niche market analyst. You help founders find their most profitable specific niche and develop positioning strategies that make them stand out.

CRITICAL REQUIREMENTS:
1. Always return valid JSON in the exact structure specified
2. Be specific - identify narrow niches, not broad markets
3. Pain points must be specific and actionable, not generic
4. Positioning must clearly differentiate from competitors
5. Use chain-of-thought reasoning for assessments
6. When real market data (Reddit, competitors) is provided, prioritize it
7. Provide enough demographic detail to run targeted marketing campaigns
8. Every recommendation should be implementable within 30 days`
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
      }).finally(() => clearTimeout(openAiTimeout));

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

      analysisResult.generatedAt = new Date().toISOString();

      const { data: storedAnalysis, error: storeError } = await serviceClient
        .from('icp_analysis_results' as any)
        .insert({
          user_id: user.id,
          business_description: businessDescription,
          target_audience: targetAudience || null,
          industry: industry || null,
          niche_score: analysisResult?.nicheScore?.overall ?? null,
          verdict: analysisResult?.nicheScore?.verdict ?? null,
          analysis_data: analysisResult,
        })
        .select('id')
        .single();

      if (storeError || !storedAnalysis) {
        console.error('Failed to store ICP analysis:', storeError);
        throw new Error(`Failed to save ICP analysis: ${storeError?.message || 'unknown storage error'}`);
      }
	
	    return new Response(JSON.stringify({
	      success: true,
	      analysis: analysisResult,
          analysisId: (storedAnalysis as { id?: string }).id ?? null,
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
