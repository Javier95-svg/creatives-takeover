import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkAndDeductCredits, getUserFromAuth } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      team_complementary_score,
      team_experience_score,
      traction_revenue_score,
      milestone_achieved_score,
      mvp_working_score,
      product_live_score,
      market_size_score,
      demand_validated_score,
      pitch_deck_score,
      funding_defined_score
    } = await req.json();

    // Validate scores
    const scores = {
      team_complementary: team_complementary_score,
      team_experience: team_experience_score,
      traction_revenue: traction_revenue_score,
      milestone_achieved: milestone_achieved_score,
      mvp_working: mvp_working_score,
      product_live: product_live_score,
      market_size: market_size_score,
      demand_validated: demand_validated_score,
      pitch_deck: pitch_deck_score,
      funding_defined: funding_defined_score
    };

    // Validate all scores are numbers between 0-10
    const scoreValues = Object.values(scores);
    if (scoreValues.length !== 10 || scoreValues.some(score => typeof score !== 'number' || score < 0 || score > 10)) {
      return new Response(
        JSON.stringify({ error: 'Invalid scores. All 10 scores must be numbers between 0 and 10.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Authenticate user
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check and deduct credits before processing
    const creditCost = CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS;
    const creditCheck = await checkAndDeductCredits(
      user.id,
      creditCost,
      'Fundraising Readiness Analysis'
    );

    if (!creditCheck.success) {
      return new Response(
        JSON.stringify({ 
          error: creditCheck.error || 'Insufficient credits',
          required: creditCost
        }),
        { 
          status: creditCheck.errorCode === 'INSUFFICIENT_CREDITS' ? 402 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate average score across all 10 questions
    const averageScore = scoreValues.reduce((sum, score) => sum + score, 0) / 10;
    const isReady = averageScore >= 7.0;

    // Use Lovable AI to analyze the results
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const scoreLabels = {
      0: 'Not Started',
      1: 'Just Beginning',
      2: 'Early Stage',
      3: 'Making Progress',
      4: 'Getting There',
      5: 'Halfway There',
      6: 'Strong Progress',
      7: 'Almost Ready',
      8: 'Very Close',
      9: 'Nearly Complete',
      10: 'Complete'
    };

    const prompt = `You are a fundraising readiness expert analyzing a pre-seed startup's comprehensive readiness assessment.

Assessment Scores (0-10 scale) organized by category:

**1. Strong Team (2 questions):**
- Complementary Founding Team (tech + business): ${scores.team_complementary} (${scoreLabels[scores.team_complementary as keyof typeof scoreLabels]})
- Previous Startup Experience: ${scores.team_experience} (${scoreLabels[scores.team_experience as keyof typeof scoreLabels]})

**2. Traction & Validation (4 questions):**
- Revenue or User Traction: ${scores.traction_revenue} (${scoreLabels[scores.traction_revenue as keyof typeof scoreLabels]})
- Key Growth Milestone Achieved: ${scores.milestone_achieved} (${scoreLabels[scores.milestone_achieved as keyof typeof scoreLabels]})
- Working MVP or Prototype: ${scores.mvp_working} (${scoreLabels[scores.mvp_working as keyof typeof scoreLabels]})
- Customer Demand Validated: ${scores.demand_validated} (${scoreLabels[scores.demand_validated as keyof typeof scoreLabels]})

**3. Market Opportunity (1 question):**
- Large & Growing Market ($1B+): ${scores.market_size} (${scoreLabels[scores.market_size as keyof typeof scoreLabels]})

**4. Scalable Operations (1 question):**
- Product Live and in Use: ${scores.product_live} (${scoreLabels[scores.product_live as keyof typeof scoreLabels]})

**5. Preparation (2 questions):**
- Pitch Deck Ready: ${scores.pitch_deck} (${scoreLabels[scores.pitch_deck as keyof typeof scoreLabels]})
- Funding Amount & Use Defined: ${scores.funding_defined} (${scoreLabels[scores.funding_defined as keyof typeof scoreLabels]})

Average Score: ${averageScore.toFixed(1)}/10.0
Current Status: ${isReady ? 'Ready' : 'Not Ready'}

Provide a comprehensive, actionable analysis organized by these 5 categories. Focus on:
- Traction & Validation is typically most important for investors
- Strong Team reduces execution risk
- Market Opportunity determines upside potential
- Scalable Operations shows ability to grow
- Preparation shows professionalism and readiness

Be encouraging but realistic. Provide specific, actionable feedback for a first-time entrepreneur.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'system',
          content: 'You are an expert fundraising advisor helping first-time entrepreneurs understand their readiness for pre-seed fundraising. Provide clear, actionable, and encouraging feedback.'
        }, {
          role: 'user',
          content: prompt
        }],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_readiness',
            parameters: {
              type: 'object',
              properties: {
                verdict: {
                  type: 'string',
                  enum: ['Ready', 'Not Ready', 'Almost Ready'],
                  description: 'Overall fundraising readiness verdict'
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description: 'Confidence level in the verdict (0-100)'
                },
                strengths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of 2-4 key strengths identified from the scores'
                },
                critical_gaps: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of 2-4 critical gaps or weaknesses that need attention'
                },
                prioritized_actions: {
                  type: 'array',
                  items: { 
                    type: 'object',
                    properties: {
                      action: { type: 'string' },
                      priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
                      estimated_time: { type: 'string' }
                    },
                    required: ['action', 'priority']
                  },
                  description: 'Top 3-5 prioritized action items with priority and time estimates'
                },
                timeline_to_readiness: {
                  type: 'string',
                  description: 'Estimated timeline to reach fundraising readiness (e.g., "2-3 months", "1-2 weeks", "6+ months")'
                },
                risk_assessment: {
                  type: 'string',
                  description: 'Brief risk assessment highlighting main concerns'
                },
                summary: {
                  type: 'string',
                  description: 'A brief 2-3 sentence summary of the assessment'
                }
              },
              required: ['verdict', 'confidence', 'strengths', 'critical_gaps', 'prioritized_actions', 'summary']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_readiness' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', errorText);
      throw new Error(`AI API Error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      // Fallback: parse text response
      const textResponse = aiData.choices[0]?.message?.content || '';
      return new Response(
        JSON.stringify({
          verdict: isReady ? 'Ready' : 'Not Ready',
          confidence: Math.round(averageScore * 20),
          summary: textResponse.substring(0, 500),
          strengths: [],
          critical_gaps: [],
          prioritized_actions: [],
          timeline_to_readiness: 'Unknown',
          risk_assessment: 'Unable to assess',
          raw_response: textResponse
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Save assessment to database (optional)
    try {
      await supabase
        .from('fundraising_readiness_assessments')
        .insert({
          user_id: user.id,
          team_complementary_score: scores.team_complementary,
          team_experience_score: scores.team_experience,
          traction_revenue_score: scores.traction_revenue,
          milestone_achieved_score: scores.milestone_achieved,
          mvp_working_score: scores.mvp_working,
          product_live_score: scores.product_live,
          market_size_score: scores.market_size,
          demand_validated_score: scores.demand_validated,
          pitch_deck_score: scores.pitch_deck,
          funding_defined_score: scores.funding_defined,
          average_score: averageScore,
          verdict: analysis.verdict,
          analysis_data: analysis,
          created_at: new Date().toISOString()
        });
    } catch (dbError) {
      // Non-critical - log but don't fail
      console.error('Failed to save assessment:', dbError);
    }

    return new Response(
      JSON.stringify({
        ...analysis,
        average_score: averageScore,
        scores: {
          team_complementary: scores.team_complementary,
          team_experience: scores.team_experience,
          traction_revenue: scores.traction_revenue,
          milestone_achieved: scores.milestone_achieved,
          mvp_working: scores.mvp_working,
          product_live: scores.product_live,
          market_size: scores.market_size,
          demand_validated: scores.demand_validated,
          pitch_deck: scores.pitch_deck,
          funding_defined: scores.funding_defined
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fundraising-readiness-analyzer:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

