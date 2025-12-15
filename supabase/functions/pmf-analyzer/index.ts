import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { checkAndDeductCredits, getUserFromAuth } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PMFAnalysisRequest {
  businessDescription: string; // Single field combining concept/problem/solution
  targetMarket?: string;
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

    // Check and deduct credits
    const creditCost = CREDIT_COSTS.PMF_ANALYSIS;
    const creditResult = await checkAndDeductCredits(
      user.id,
      creditCost,
      'PMF Analysis',
      undefined,
      { businessDescription: businessDescription.substring(0, 100) }
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

    // Build comprehensive prompt for quality-focused PMF analysis
    const prompt = `You are a Product-Market Fit (PMF) expert helping founders validate their startup ideas and accurately assess their success odds.

CRITICAL INSTRUCTIONS FOR QUALITY & ACCURACY:
- Be thorough and accurate, not overly optimistic. Provide realistic assessments based on evidence.
- Base all assessments on information provided - don't make assumptions not supported by the input.
- Clearly identify information gaps and explain their impact on analysis confidence.
- Provide detailed reasoning for all scores and assessments.
- Focus on accurately evaluating the real odds of success based on comprehensive market analysis.

BUSINESS DESCRIPTION:
${businessDescription}

TARGET MARKET: ${targetMarket || 'Not specified - please infer from business description'}

${businessPlanData?.launchReport ? `\nAdditional Business Plan Context:\n${businessPlanData.launchReport.substring(0, 2000)}` : ''}

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
   - Differentiation Score: Competitive uniqueness and defensibility (unique value prop strength, competitive moats, differentiation clarity)
   - Timing Score: Market timing and readiness (market maturity, timing factors, external conditions)
   - Execution Risk Score: Execution feasibility (higher = lower risk, more executable; considers complexity, resource needs, market barriers)
   
   Overall Score: Weighted combination of sub-scores reflecting realistic success probability.
   Verdict: "Strong Fit" (70+), "Moderate Fit" (50-69), or "Weak Fit" (<50)
   
   Provide detailed reasoning for each score component, explaining the factors considered.

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
    "reasoning": "string"
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
            content: 'You are a Product-Market Fit expert focused on providing accurate, realistic assessments of success odds. Always return valid JSON in the exact structure specified. Be thorough, evidence-based, and realistic (not overly optimistic) in your analysis. Base assessments on provided information and clearly explain your reasoning.'
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

    return new Response(JSON.stringify({
      success: true,
      analysis: analysisResult,
      creditsUsed: creditCost,
      newBalance: creditResult.newBalance
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

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

