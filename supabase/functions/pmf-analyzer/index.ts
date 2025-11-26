import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { checkAndDeductCredits, getUserFromAuth } from '../_shared/credit-deduction.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PMFAnalysisRequest {
  businessConcept: string;
  targetMarket?: string;
  problemStatement: string;
  solutionDescription: string;
  currentAssumptions?: string;
  businessPlanData?: {
    answers?: any;
    launchReport?: string;
  };
}

// Credit cost for PMF analysis
const PMF_ANALYSIS_CREDIT_COST = 8;

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
      businessConcept,
      targetMarket,
      problemStatement,
      solutionDescription,
      currentAssumptions,
      businessPlanData
    }: PMFAnalysisRequest = await req.json();

    // Validate required fields
    if (!businessConcept || !problemStatement || !solutionDescription) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: businessConcept, problemStatement, solutionDescription' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check and deduct credits
    const creditResult = await checkAndDeductCredits(
      user.id,
      PMF_ANALYSIS_CREDIT_COST,
      'PMF Analysis',
      undefined,
      { businessConcept: businessConcept.substring(0, 100) }
    );

    if (!creditResult.success) {
      return new Response(JSON.stringify({ 
        error: creditResult.error || 'Credit deduction failed',
        creditError: true,
        errorCode: creditResult.errorCode,
        requiredCredits: PMF_ANALYSIS_CREDIT_COST
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build comprehensive prompt for PMF analysis
    const prompt = `You are a Product-Market Fit (PMF) expert helping founders validate their startup ideas.

BUSINESS CONTEXT:
Business Concept: ${businessConcept}
Target Market: ${targetMarket || 'Not specified'}
Problem Statement: ${problemStatement}
Solution Description: ${solutionDescription}
Current Assumptions: ${currentAssumptions || 'None specified'}

${businessPlanData?.launchReport ? `\nAdditional Business Plan Context:\n${businessPlanData.launchReport.substring(0, 2000)}` : ''}

Analyze this startup idea and provide a comprehensive PMF analysis. Use the following structure:

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

6. PMF SCORE:
   Calculate an overall PMF score (0-100) based on:
   - Problem clarity (0-20)
   - Solution fit (0-20)
   - Market size (0-15)
   - Competition analysis (0-15)
   - Validation readiness (0-15)
   - Founder-market fit (0-15)
   
   Provide score breakdown and reasoning.

7. NEXT STEPS:
   Provide prioritized action items (5-7 steps) based on the analysis.

Return your analysis as a JSON object with this exact structure:
{
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
  "problemSolutionFit": {
    "alignmentScore": number,
    "reasoning": "string",
    "gaps": ["string"],
    "strengths": ["string"],
    "weaknesses": ["string"],
    "recommendations": ["string"]
  },
  "surveys": {
    "primarySegment": "string",
    "questions": ["string"]
  },
  "interviewScripts": {
    "opening": ["string"],
    "problemExploration": ["string"],
    "solutionValidation": ["string"],
    "pricingSensitivity": ["string"],
    "closing": ["string"]
  },
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
  ],
  "pmfScore": {
    "overall": number,
    "breakdown": {
      "problemClarity": number,
      "solutionFit": number,
      "marketSize": number,
      "competitionAnalysis": number,
      "validationReadiness": number,
      "founderMarketFit": number
    },
    "reasoning": "string"
  },
  "nextSteps": [
    {
      "priority": "High" | "Medium" | "Low",
      "action": "string",
      "description": "string"
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
            content: 'You are a Product-Market Fit expert. Always return valid JSON in the exact structure specified. Be thorough, actionable, and data-driven in your analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000,
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
      creditsUsed: PMF_ANALYSIS_CREDIT_COST,
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

