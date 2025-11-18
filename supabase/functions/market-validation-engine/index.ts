import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business_idea, industry, target_market, session_id } = await req.json();

    console.log('Starting market validation for:', { business_idea, industry, target_market });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    if (!userId) {
      throw new Error('Authentication required');
    }

    // Use OpenAI API for enhanced market validation analysis
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const systemPrompt = `You are an elite market validation expert with 20+ years of experience in venture capital, startup consulting, and market research. You've evaluated thousands of business ideas and have deep expertise in identifying viable market opportunities.

YOUR CORE MISSION:
Provide brutally honest, data-driven market validation that helps entrepreneurs understand if their idea has real demand before they invest time and money.

VALIDATION FRAMEWORK (Apply rigorously):

1. MARKET SIZE ANALYSIS (0-100 score):
   - Total Addressable Market (TAM): Is this a billion-dollar+ market or niche?
   - Serviceable Addressable Market (SAM): Realistic market you can capture
   - Serviceable Obtainable Market (SOM): What you can realistically get in 3 years
   - Market growth trends: Growing, stagnant, or declining?
   - Market maturity: Emerging, maturing, or saturated?

2. DEMAND STRENGTH ANALYSIS (0-100 score):
   - Problem intensity: How painful is this problem? (1-10 scale)
   - Existing solutions: Are people currently solving this? How?
   - Willingness to pay: Evidence of paying for similar solutions?
   - Search volume trends: Are people actively searching for solutions?
   - Social proof indicators: Forums, Reddit, social media discussions?
   - Customer urgency: Do they need this NOW or can wait?

3. COMPETITION ANALYSIS (0-100 score, higher = more competitive):
   - Direct competitors: Who's solving the exact same problem?
   - Indirect competitors: Alternative solutions people use?
   - Market saturation: How crowded is the space?
   - Barriers to entry: What stops others from competing?
   - Competitive moats: What advantages do incumbents have?

4. VIABILITY ASSESSMENT:
   - Problem-solution fit: Does the solution address a real problem?
   - Product-market fit potential: Can this become a viable business?
   - Revenue model viability: Is the business model sustainable?
   - Customer acquisition feasibility: How hard will it be to get customers?
   - Scalability potential: Can this grow beyond the founder?

5. RISK FACTORS:
   - Market risks: Is demand real or assumed?
   - Competition risks: Can you compete with established players?
   - Execution risks: Is this too complex to build?
   - Market timing: Is the market ready for this?
   - Customer adoption: Will people actually switch from existing solutions?

6. DIFFERENTIATION OPPORTUNITIES:
   - Specific gaps competitors aren't addressing
   - Unique angles you can leverage
   - Underserved customer segments
   - Better pricing/value propositions

VALIDATION PRINCIPLES:
- Be brutally honest: False positives hurt more than false negatives
- Demand > Supply: A large market with weak demand scores lower than a small market with strong demand
- Evidence > Assumptions: Prefer validated signals over theoretical potential
- Competition isn't always bad: It proves the market exists
- Timing matters: Great ideas at wrong time fail

SCORING GUIDELINES:
- 75-100: Strong validation - proceed with confidence (clear demand signals, viable market)
- 50-74: Moderate validation - proceed with caution (some demand, needs more validation)
- 25-49: Weak validation - pivot or more research needed (unclear demand, high risk)
- 0-24: Poor validation - reconsider seriously (little/no evidence of demand)

OUTPUT REQUIREMENTS:
- Provide specific, actionable insights (not generic advice)
- Reference similar businesses/industries for context
- Identify the biggest risks and opportunities
- Give concrete next steps for validation
- Be encouraging but realistic`;

    const userPrompt = `Analyze and validate this business idea step-by-step:

BUSINESS IDEA: ${business_idea}
INDUSTRY: ${industry || 'Not specified'}
TARGET MARKET: ${target_market || 'Not specified'}

Think step-by-step:
1. First, analyze market size - is this a real market with spending power?
2. Second, assess demand strength - do people actually need/want this?
3. Third, evaluate competition - can you compete and differentiate?
4. Fourth, identify risks and opportunities
5. Finally, calculate scores and provide recommendations

Provide a comprehensive market validation analysis following the framework above. Be specific and data-driven in your analysis.`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using GPT-4o for better analysis
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'validate_market',
            description: 'Return comprehensive market validation analysis with scores, insights, and recommendations',
            parameters: {
              type: 'object',
              properties: {
                market_size_score: {
                  type: 'number',
                  description: 'Market size potential score 0-100',
                  minimum: 0,
                  maximum: 100
                },
                competition_score: {
                  type: 'number',
                  description: 'Competition intensity 0-100 (higher = more competition)',
                  minimum: 0,
                  maximum: 100
                },
                demand_score: {
                  type: 'number',
                  description: 'Market demand strength 0-100',
                  minimum: 0,
                  maximum: 100
                },
                estimated_market_size_usd: {
                  type: 'number',
                  description: 'Estimated total addressable market in USD'
                },
                competitor_count: {
                  type: 'number',
                  description: 'Number of direct competitors'
                },
                top_competitors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      website: { type: 'string' },
                      market_share: { type: 'number' },
                      strengths: { type: 'array', items: { type: 'string' } },
                      weaknesses: { type: 'array', items: { type: 'string' } },
                      pricing_model: { type: 'string' },
                      features: { type: 'array', items: { type: 'string' } }
                    }
                  }
                },
                differentiation_opportunities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Key opportunities to differentiate'
                },
                competitor_gaps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      gap_description: { type: 'string' },
                      opportunity_score: { type: 'number', minimum: 0, maximum: 100 },
                      difficulty: { type: 'string', enum: ['low', 'medium', 'high'] }
                    }
                  }
                },
                problem_intensity: {
                  type: 'number',
                  description: 'How painful is the problem (1-10 scale)',
                  minimum: 1,
                  maximum: 10
                },
                willingness_to_pay: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', description: 'WTP score 0-100' },
                    evidence: { type: 'string', description: 'Evidence of willingness to pay' },
                    price_range: { type: 'string', description: 'Estimated price customers would pay' }
                  }
                },
                market_trends: {
                  type: 'object',
                  properties: {
                    growth_rate: { type: 'string', enum: ['declining', 'stagnant', 'growing', 'exploding'] },
                    maturity: { type: 'string', enum: ['emerging', 'maturing', 'mature', 'saturated'] },
                    timing_score: { type: 'number', description: 'Market timing score 0-100' }
                  }
                },
                risk_assessment: {
                  type: 'object',
                  properties: {
                    market_risk: { type: 'string', description: 'Main market risks' },
                    competition_risk: { type: 'string', description: 'Main competition risks' },
                    execution_risk: { type: 'string', description: 'Main execution risks' },
                    overall_risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'very_high'] }
                  }
                },
                validation_recommendations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific actions to validate the idea further'
                },
                detailed_analysis: {
                  type: 'string',
                  description: 'Comprehensive written analysis (2-3 paragraphs) explaining the validation, risks, opportunities, and recommendations'
                },
                viability_verdict: {
                  type: 'string',
                  enum: ['highly_viable', 'moderately_viable', 'questionable', 'not_recommended'],
                  description: 'Overall viability assessment'
                },
                confidence_level: {
                  type: 'string',
                  enum: ['low', 'medium', 'high']
                }
              },
              required: ['market_size_score', 'competition_score', 'demand_score', 'detailed_analysis', 'viability_verdict', 'confidence_level']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'validate_market' } },
        temperature: 0.3, // Lower temperature for more consistent, analytical responses
        max_tokens: 2000 // Allow for comprehensive analysis
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error('AI API error:', error);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No validation data returned from AI');
    }

    const validationData = JSON.parse(toolCall.function.arguments);

    // Calculate overall validation score (weighted average)
    // Demand is most important (40%), then market size (35%), competition inverted (25%)
    const overall_score = (
      (validationData.market_size_score * 0.35) +
      ((100 - validationData.competition_score) * 0.25) + // Invert competition - lower is better
      (validationData.demand_score * 0.40) // Demand is weighted highest
    );

    // Prepare enhanced demand trends data
    const demandTrendsData = {
      problem_intensity: validationData.problem_intensity || null,
      willingness_to_pay: validationData.willingness_to_pay || null,
      market_trends: validationData.market_trends || null,
      ...(validationData.willingness_to_pay && { 
        wtp_score: validationData.willingness_to_pay.score,
        wtp_evidence: validationData.willingness_to_pay.evidence,
        estimated_price: validationData.willingness_to_pay.price_range
      }),
      ...(validationData.market_trends && {
        growth_rate: validationData.market_trends.growth_rate,
        maturity: validationData.market_trends.maturity,
        timing_score: validationData.market_trends.timing_score
      })
    };

    // Prepare risk assessment data
    const riskAssessmentData = validationData.risk_assessment || {
      market_risk: 'Not assessed',
      competition_risk: 'Not assessed',
      execution_risk: 'Not assessed',
      overall_risk_level: 'medium'
    };

    // Store validation in database with enhanced fields
    const { data: validationScore, error: dbError } = await supabase
      .from('market_validation_scores')
      .insert({
        user_id: userId,
        session_id: session_id,
        business_idea,
        industry,
        target_market,
        market_size_score: validationData.market_size_score,
        competition_score: validationData.competition_score,
        demand_score: validationData.demand_score,
        overall_validation_score: Math.round(overall_score * 100) / 100,
        estimated_market_size_usd: validationData.estimated_market_size_usd || null,
        competitor_count: validationData.competitor_count || 0,
        top_competitors: validationData.top_competitors || [],
        competitor_gaps: validationData.competitor_gaps || [],
        differentiation_opportunities: validationData.differentiation_opportunities || [],
        demand_trends: demandTrendsData, // Store enhanced demand data
        confidence_level: validationData.confidence_level,
        data_sources: [
          { 
            name: 'OpenAI GPT-4o Analysis', 
            type: 'ai_inference', 
            reliability_score: 85,
            model: 'gpt-4o',
            analysis_type: 'comprehensive_market_validation'
          }
        ],
        // Store additional analysis in search_volume_data (repurposing for flexibility)
        search_volume_data: {
          detailed_analysis: validationData.detailed_analysis,
          viability_verdict: validationData.viability_verdict,
          validation_recommendations: validationData.validation_recommendations || [],
          risk_assessment: riskAssessmentData,
          problem_intensity: validationData.problem_intensity
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('Validation complete:', { overall_score: Math.round(overall_score) });

    return new Response(
      JSON.stringify({
        success: true,
        validation_score: validationScore,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in market-validation-engine:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
