import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { resolveCreditIdempotencyKey } from '../_shared/request-idempotency.ts';

// Legacy PMF analysis endpoint.
// The production /pmf-lab route uses pmf-evidence-scorer because it is grounded in
// interview logs, Sean Ellis survey responses, and external citations. Keep this
// endpoint for older callers, but do not use its row counts as the PMF Lab evidence
// funnel metric.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

interface PMFAnalysisRequest {
  businessDescription: string; // Single field combining concept/problem/solution (or structured data)
  targetMarket?: string;
  industry?: string;
  businessPlanData?: {
    answers?: any;
    launchReport?: string;
  };
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
      targetMarket,
      industry,
      businessPlanData
    }: PMFAnalysisRequest = await req.json();

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
      feature: 'PMF Analysis',
      requestFingerprint: {
        businessDescription,
        targetMarket,
        industry,
        hasBusinessPlanData: Boolean(businessPlanData),
      },
    });

    // Check and deduct credits
    const creditCost = CREDIT_COSTS.PMF_ANALYSIS;
    const creditResult = await checkAndDeductCredits(
      user.id,
      creditCost,
      'PMF Analysis',
      undefined,
      { businessDescription: businessDescription.substring(0, 100), idempotencyKey, entitlementFeature: 'PMF_ANALYSIS' }
    );
    const chargedCredits = (creditResult.usedFromQuota ?? 0) + (creditResult.usedFromBalance ?? 0);

    if (!creditResult.success) {
      return new Response(JSON.stringify({ 
        error: creditResult.error || 'Credit deduction failed',
        creditError: true,
        errorCode: creditResult.errorCode,
        requiredTier: creditResult.requiredTier,
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

    // Initialize Supabase client for market validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Select prompt variant for A/B testing
    let selectedVariantId = 'v1'; // Default
    try {
      const { data: variants, error: variantError } = await supabase
        .from('pmf_prompt_variants')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!variantError && variants && variants.length > 0) {
        // Simple random selection for A/B testing (50/50 split for now)
        // In production, you could use weighted selection based on performance
        const activeVariants = variants;
        selectedVariantId = activeVariants[Math.floor(Math.random() * activeVariants.length)].id;
      }
    } catch (variantError) {
      console.warn('Failed to select prompt variant, using default:', variantError);
      // Continue with default variant
    }

    // Fetch market validation data (Reddit discussions, competitor analysis)
    let marketValidationData: any = null;
    let redditDiscussions: any[] = [];
    let competitorData: any = null;
    
    try {
      console.log('🔍 Fetching market validation data...');
      const validationResponse = await supabase.functions.invoke('market-validation-engine', {
        body: {
          business_idea: businessDescription,
          industry: businessPlanData?.answers?.market || targetMarket || undefined,
          target_market: targetMarket || businessPlanData?.answers?.market || undefined,
        },
        headers: {
          'Authorization': req.headers.get('Authorization') || '',
        }
      });

      if (validationResponse.ok) {
        const validationResult = await validationResponse.json();
        if (validationResult.success && validationResult.validation_score) {
          marketValidationData = validationResult.validation_score;
          redditDiscussions = marketValidationData.reddit_discussions || [];
          competitorData = {
            top_competitors: marketValidationData.top_competitors || [],
            competitor_gaps: marketValidationData.competitor_gaps || [],
            differentiation_opportunities: marketValidationData.differentiation_opportunities || [],
            competition_score: marketValidationData.competition_score,
            demand_score: marketValidationData.demand_score,
            market_size_score: marketValidationData.market_size_score,
          };
          console.log(`✅ Found ${redditDiscussions.length} Reddit discussions and ${competitorData.top_competitors.length} competitors`);
        }
      }
    } catch (error) {
      console.warn('Market validation fetch failed, continuing with AI-only analysis:', error);
      // Continue without market validation data - not critical
    }

    // Build comprehensive prompt for quality-focused PMF analysis
    const prompt = `You are a Product-Market Fit (PMF) expert helping founders validate their startup ideas and accurately assess their success odds.

CRITICAL INSTRUCTIONS FOR QUALITY & ACCURACY:
- Be thorough and accurate, not overly optimistic. Provide realistic assessments based on evidence.
- Base all assessments on information provided - don't make assumptions not supported by the input.
- Clearly identify information gaps and explain their impact on analysis confidence.
- Provide detailed reasoning for all scores and assessments.
- Focus on accurately evaluating the real odds of success based on comprehensive market analysis.
- Use chain-of-thought reasoning: Show your thinking process step-by-step for each assessment.
- Assign confidence levels (High/Medium/Low) to each major assessment and explain why.

FEW-SHOT EXAMPLES OF ACCURATE PMF ANALYSIS:

Example 1 - Strong Fit (SaaS Tool):
Business: "A project management tool specifically for remote design teams with built-in design file preview"
Analysis Reasoning:
1. Problem Validation: Remote design teams struggle with context switching between tools (HIGH confidence - well-documented pain point)
2. Market Demand: Growing remote work trend, design tool market is $X billion (MEDIUM confidence - market data available)
3. Competition: Notion, Asana exist but lack design-specific features (HIGH confidence - clear differentiation)
4. Execution: Moderate complexity, requires design tool integrations (MEDIUM confidence - technical feasibility)
Result: PMF Score 72/100 - Strong Fit. High demand, clear differentiation, moderate execution risk.

Example 2 - Weak Fit (Physical Product):
Business: "Smart water bottle that tracks hydration via app"
Analysis Reasoning:
1. Problem Validation: Hydration tracking is a "nice-to-have" not "must-have" (HIGH confidence - low problem urgency)
2. Market Demand: Small niche market, many existing solutions (HIGH confidence - market saturation evident)
3. Competition: Multiple established players (Hydro Flask, smart bottles) (HIGH confidence - competitive data)
4. Execution: Hardware complexity, manufacturing costs, distribution challenges (HIGH confidence - known barriers)
Result: PMF Score 38/100 - Weak Fit. Low problem urgency, saturated market, high execution barriers.

Example 3 - Moderate Fit (Marketplace):
Business: "Platform connecting local artisans with customers for custom handmade goods"
Analysis Reasoning:
1. Problem Validation: Artisans need better sales channels, customers want unique items (MEDIUM confidence - moderate demand)
2. Market Demand: Etsy dominates but has limitations, niche opportunity exists (MEDIUM confidence - partial market data)
3. Competition: Etsy, local marketplaces, but local focus is differentiation (MEDIUM confidence - competitive landscape)
4. Execution: Network effects needed, two-sided marketplace challenge (MEDIUM confidence - known challenges)
Result: PMF Score 58/100 - Moderate Fit. Valid problem but competitive market, execution challenges with network effects.

CHAIN-OF-THOUGHT REQUIREMENTS:
For each assessment, show:
1. What evidence supports this assessment?
2. What assumptions are you making?
3. What information is missing?
4. How confident are you (High/Medium/Low) and why?
5. How does this factor into the overall score?

BUSINESS DESCRIPTION:
${businessDescription}

TARGET MARKET: ${targetMarket || 'Not specified - please infer from business description'}

${businessPlanData?.launchReport ? `\nAdditional Business Plan Context:\n${businessPlanData.launchReport.substring(0, 2000)}` : ''}

${marketValidationData ? `\n\n=== REAL MARKET DATA ===
${redditDiscussions.length > 0 ? `\nREDDIT COMMUNITY INSIGHTS (${redditDiscussions.length} relevant discussions found):
${redditDiscussions.slice(0, 5).map((d: any, i: number) => `${i + 1}. "${d.title}" (r/${d.subreddit}) - ${d.sentiment} sentiment, ${d.upvotes} upvotes`).join('\n')}
${redditDiscussions.length > 5 ? `\n... and ${redditDiscussions.length - 5} more discussions` : ''}` : ''}

${competitorData && competitorData.top_competitors?.length > 0 ? `\nCOMPETITOR ANALYSIS:
Top Competitors Identified: ${competitorData.top_competitors.length}
${competitorData.top_competitors.slice(0, 5).map((c: any, i: number) => `${i + 1}. ${c.name}${c.strengths ? ` - Strengths: ${c.strengths.slice(0, 2).join(', ')}` : ''}${c.weaknesses ? ` - Weaknesses: ${c.weaknesses.slice(0, 2).join(', ')}` : ''}`).join('\n')}

Competition Score: ${competitorData.competition_score}/100
Demand Score: ${competitorData.demand_score}/100
Market Size Score: ${competitorData.market_size_score}/100

${competitorData.competitor_gaps?.length > 0 ? `\nCompetitor Gaps Identified:\n${competitorData.competitor_gaps.slice(0, 3).map((g: any, i: number) => `${i + 1}. ${typeof g === 'string' ? g : g.gap || g}`).join('\n')}` : ''}
${competitorData.differentiation_opportunities?.length > 0 ? `\nDifferentiation Opportunities:\n${competitorData.differentiation_opportunities.slice(0, 3).map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}` : ''}` : ''}

IMPORTANT: Use this real market data to inform your analysis. If Reddit discussions show strong demand signals, factor that into demand scores. If competitors are identified, use their strengths/weaknesses in competitive analysis. This real data should enhance the accuracy of your assessment.` : ''}

YOUR TASK:
1. First, intelligently extract from the business description:
   - Problem statement being solved
   - Solution approach/product/service
   - Target market and customer segments
   - Business model and value proposition
   - Key assumptions and hypotheses

2. Then provide a comprehensive PMF analysis focused on accurately assessing success odds. Use the following structure:

1. CUSTOMER SEGMENTS (3-5 segments):
   For each segment, provide:
   - Segment name
   - Demographics (age, location, income, occupation)
   - Psychographics (values, interests, behaviors)
   - Pain points specific to this segment
   - Market size estimate
   - Accessibility/Reach difficulty (1-10)

2. PROBLEM-SOLUTION FIT:
   - Alignment score (0-100) and reasoning
   - Key gaps between problem and solution
   - Strengths of the solution
   - Weaknesses or missing elements
   - Recommendations for improvement

3. PMF SURVEYS:
   Generate 10-15 survey questions for each primary segment covering:
   - Problem validation
   - Solution interest
   - Willingness to pay
   - Current alternatives
   - Feature priorities

4. INTERVIEW SCRIPTS:
   Create customer discovery interview scripts with:
   - Opening questions
   - Problem exploration questions
   - Solution validation questions
   - Pricing sensitivity questions
   - Closing questions

5. VALIDATION EXPERIMENTS:
   Suggest 5-7 validation experiments with:
   - Experiment name
   - Type (MVP test, landing page, smoke test, etc.)
   - Hypothesis
   - Success metrics
   - Estimated time/cost
   - Priority (High/Medium/Low)

6. MARKET ANALYSIS (2026-focused):
   Provide comprehensive analysis of:
   - Market Demand: Current trends, growth projections, addressable market size, demand indicators, market maturity for 2026
   - Competitive Landscape: Direct/indirect competitors with strengths/weaknesses, market positioning, competitive intensity (High/Medium/Low), market share dynamics
   - Differentiation: Unique value proposition strength, competitive advantages, competitive moats, differentiation gaps
   - Scalability: Market expansion opportunities, unit economics viability, growth constraints, scalability risks and potential
   - Risk Factors: 
     * Market risks (with severity: High/Medium/Low and mitigation strategies)
     * Execution risks (with severity and mitigation)
     * Timing risks (with severity and mitigation)

7. PMF SCORE (accurately reflecting success odds):
   Calculate an overall PMF score (0-100) as a weighted composite that reflects realistic success probability.
   
   Sub-scores (each 0-100, based on multiple factors):
   - Demand Score: Market demand strength for 2026 (considers market size, growth rate, demand indicators, market readiness)
     * Show reasoning: What evidence supports demand? What are the demand signals?
     * Confidence: High/Medium/Low - explain why
   - Differentiation Score: Competitive uniqueness and defensibility (unique value prop strength, competitive moats, differentiation clarity)
     * Show reasoning: How is this different? What moats exist? What gaps were identified?
     * Confidence: High/Medium/Low - explain why
   - Timing Score: Market timing and readiness (market maturity, timing factors, external conditions)
     * Show reasoning: Is the market ready? What timing factors matter?
     * Confidence: High/Medium/Low - explain why
   - Execution Risk Score: Execution feasibility (higher = lower risk, more executable; considers complexity, resource needs, market barriers)
     * Show reasoning: What are the execution challenges? What resources are needed?
     * Confidence: High/Medium/Low - explain why
   
   Overall Score: Weighted combination of sub-scores reflecting realistic success probability.
   Verdict: "Strong Fit" (70+), "Moderate Fit" (50-69), or "Weak Fit" (<50)
   
   Provide detailed chain-of-thought reasoning for each score component:
   - What factors did you consider?
   - What evidence supports your assessment?
   - What information gaps exist and how do they affect confidence?
   - How did you weight different factors?
   - What would need to change to improve the score?

8. NEXT STEPS:
   Provide prioritized action items (5-7 steps) to improve success odds, each with:
   - Priority (High/Medium/Low)
   - Action (specific action item)
   - Description (why this matters)
   - Estimated time (how long this might take)

Return your analysis as a JSON object with this exact structure:
{
  "pmfScore": {
    "overall": number,
    "verdict": "Strong Fit" | "Moderate Fit" | "Weak Fit",
    "subScores": {
      "demand": number,
      "differentiation": number,
      "timing": number,
      "executionRisk": number
    },
    "subScoreConfidence": {
      "demand": "High" | "Medium" | "Low",
      "differentiation": "High" | "Medium" | "Low",
      "timing": "High" | "Medium" | "Low",
      "executionRisk": "High" | "Medium" | "Low"
    },
    "reasoning": "string",
    "chainOfThought": {
      "demandReasoning": "string - step-by-step reasoning for demand score",
      "differentiationReasoning": "string - step-by-step reasoning for differentiation score",
      "timingReasoning": "string - step-by-step reasoning for timing score",
      "executionReasoning": "string - step-by-step reasoning for execution risk score",
      "informationGaps": ["string - list of missing information that affects confidence"],
      "keyAssumptions": ["string - list of assumptions made in the analysis"]
    }
  },
  "marketAnalysis": {
    "demand": {
      "assessment": "string",
      "marketSize": "string",
      "growthProjection": "string",
      "trends": ["string"]
    },
    "competitiveLandscape": {
      "directCompetitors": [
        {
          "name": "string",
          "strengths": ["string"],
          "weaknesses": ["string"]
        }
      ],
      "indirectCompetitors": ["string"],
      "marketPositioning": "string",
      "competitiveIntensity": "High" | "Medium" | "Low"
    },
    "differentiation": {
      "uniqueValue": "string",
      "competitiveAdvantages": ["string"],
      "moats": ["string"],
      "differentiationGaps": ["string"]
    },
    "scalability": {
      "expansionPotential": "string",
      "unitEconomics": "string",
      "growthConstraints": ["string"],
      "scalabilityScore": "string"
    },
    "risks": {
      "marketRisks": [
        {
          "risk": "string",
          "severity": "High" | "Medium" | "Low",
          "mitigation": "string"
        }
      ],
      "executionRisks": [
        {
          "risk": "string",
          "severity": "High" | "Medium" | "Low",
          "mitigation": "string"
        }
      ],
      "timingRisks": [
        {
          "risk": "string",
          "severity": "High" | "Medium" | "Low",
          "mitigation": "string"
        }
      ]
    }
  },
  "nextSteps": [
    {
      "priority": "High" | "Medium" | "Low",
      "action": "string",
      "description": "string",
      "estimatedTime": "string"
    }
  ],
  "customerSegments": [
    {
      "name": "string",
      "demographics": "string",
      "psychographics": "string",
      "painPoints": ["string"],
      "marketSize": "string",
      "accessibilityScore": number
    }
  ],
  "validationExperiments": [
    {
      "name": "string",
      "type": "string",
      "hypothesis": "string",
      "successMetrics": ["string"],
      "estimatedTime": "string",
      "estimatedCost": "string",
      "priority": "High" | "Medium" | "Low"
    }
  ]
}`;

    // Call OpenAI API
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
            {
              role: 'system',
              content: `You are a Product-Market Fit expert focused on providing accurate, realistic assessments of success odds.

CRITICAL REQUIREMENTS:
1. Always return valid JSON in the exact structure specified
2. Use chain-of-thought reasoning - show your thinking process
3. Assign confidence levels (High/Medium/Low) to major assessments
4. Be evidence-based and realistic (not overly optimistic)
5. Base assessments on provided information - don't make unsupported assumptions
6. Clearly identify information gaps and their impact on confidence
7. Use the few-shot examples as guidance for reasoning depth and structure
8. When real market data (Reddit, competitors) is provided, prioritize it over assumptions

Your analysis should help founders make informed decisions, not just validate their ideas.`
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
        // Fallback: try to extract JSON from markdown code blocks
        const content = aiData.choices[0].message.content;
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Failed to parse AI response as JSON');
        }
      }

      // Find similar historical analyses for pattern matching
      let similarAnalyses: any[] = [];
      let patternInsights: any = null;

      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Query for similar analyses using full-text search and score similarity
        const { data: similarData, error: similarError } = await supabase
          .from('pmf_analysis_results')
          .select('id, business_description, pmf_score, verdict, actual_outcome, outcome_date, industry')
          .neq('user_id', user.id) // Exclude current user's analyses
          .not('actual_outcome', 'is', null) // Only include analyses with outcomes
          .limit(10);

        if (!similarError && similarData && similarData.length > 0) {
          similarAnalyses = similarData;

          // Calculate pattern insights
          const outcomes = similarAnalyses.map((a: any) => a.actual_outcome);
          const outcomeCounts: Record<string, number> = {};
          outcomes.forEach((outcome: string) => {
            outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;
          });

          const avgScore = similarAnalyses.reduce((sum: number, a: any) => sum + (a.pmf_score || 0), 0) / similarAnalyses.length;
          const successRate = (outcomeCounts['launched'] || 0) + (outcomeCounts['funded'] || 0) / similarAnalyses.length;

          patternInsights = {
            similarCount: similarAnalyses.length,
            averageScore: Math.round(avgScore),
            successRate: Math.round(successRate * 100),
            outcomeDistribution: outcomeCounts,
            message: `Found ${similarAnalyses.length} similar analyses. Average PMF score: ${Math.round(avgScore)}/100. Success rate: ${Math.round(successRate * 100)}%`
          };
        }
      } catch (patternError) {
        console.warn('Pattern matching failed:', patternError);
        // Continue without pattern matching
      }

      // Store analysis result in database
      let storedAnalysisId: string | null = null;
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: storedData, error: storeError } = await supabase
          .from('pmf_analysis_results')
          .insert({
            user_id: user.id,
            business_description: businessDescription,
            target_market: targetMarket || null,
            industry: industry || businessPlanData?.answers?.market || null,
            analysis_data: analysisResult,
            pmf_score: analysisResult.pmfScore?.overall || null,
            verdict: analysisResult.pmfScore?.verdict || null,
            confidence_level: analysisResult.pmfScore?.subScoreConfidence ?
              (Object.values(analysisResult.pmfScore.subScoreConfidence).filter((c: any) => c === 'High').length >= 2 ? 'high' :
               Object.values(analysisResult.pmfScore.subScoreConfidence).filter((c: any) => c === 'Low').length >= 2 ? 'low' : 'medium') : 'medium',
            demand_score: analysisResult.pmfScore?.subScores?.demand || null,
            differentiation_score: analysisResult.pmfScore?.subScores?.differentiation || null,
            timing_score: analysisResult.pmfScore?.subScores?.timing || null,
            execution_risk_score: analysisResult.pmfScore?.subScores?.executionRisk || null,
            data_sources: [
              { name: 'AI Analysis', type: 'ai_inference', reliability_score: 75 },
              ...(marketValidationData ? [{ name: 'Market Validation Engine', type: 'api', reliability_score: 85 }] : []),
              ...(redditDiscussions.length > 0 ? [{ name: 'Reddit Communities', type: 'api', reliability_score: 80 }] : [])
            ],
            prompt_variant_id: selectedVariantId
          })
          .select('id')
          .single();

        if (!storeError && storedData) {
          storedAnalysisId = storedData.id;
          console.log('PMF analysis stored with ID:', storedAnalysisId);
        } else {
          console.warn('Failed to store PMF analysis:', storeError);
        }
      } catch (storeError) {
        console.warn('Error storing PMF analysis:', storeError);
        // Continue even if storage fails
      }

      // Add pattern insights to analysis result if available
      if (patternInsights) {
        analysisResult.patternInsights = patternInsights;
      }

      return new Response(JSON.stringify({
        success: true,
        analysis: analysisResult,
        analysisId: storedAnalysisId,
        patternInsights: patternInsights,
        creditsUsed: chargedCredits,
        newBalance: creditResult.newBalance
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('AI processing failed, refunding credits:', err);
      if (chargedCredits > 0) {
        await refundCredits(user.id, chargedCredits, 'PMF Analysis', 'Refund: AI processing failed', { error: err instanceof Error ? err.message : String(err) });
      }
      throw err;
    }

  } catch (error) {
    console.error('Error in PMF analyzer:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

