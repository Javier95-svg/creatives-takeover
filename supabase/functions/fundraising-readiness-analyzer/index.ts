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
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.error('Failed to parse request JSON:', jsonError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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
    } = requestBody;

    console.log('Received scores:', {
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
    });

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
    const invalidScores = scoreValues.filter(score => typeof score !== 'number' || isNaN(score) || score < 0 || score > 10);
    
    if (scoreValues.length !== 10 || invalidScores.length > 0) {
      console.error('Score validation failed:', {
        scoreCount: scoreValues.length,
        scores: scores,
        invalidScores: invalidScores
      });
      return new Response(
        JSON.stringify({ error: `Invalid scores. All 10 scores must be numbers between 0 and 10. Received ${scoreValues.length} scores.` }),
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate average score across all 10 questions
    const averageScore = scoreValues.reduce((sum, score) => sum + score, 0) / 10;
    
    // Determine verdict based on score thresholds
    let verdict: 'Ready' | 'Not Ready' | 'Almost Ready';
    if (averageScore >= 7.0) {
      verdict = 'Ready';
    } else if (averageScore >= 5.5) {
      verdict = 'Almost Ready';
    } else {
      verdict = 'Not Ready';
    }

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
Current Verdict: ${verdict}

Based on the average score, provide a clear, actionable analysis. Focus on being direct and practical. The goal is to give founders a "Reality Check" - helping them understand where they truly stand and what they need to do next before approaching investors.

Keep the analysis focused and investor-focused.`;

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
                  description: 'Overall fundraising readiness verdict (must match the average score: >=7.0 = Ready, >=5.5 = Almost Ready, <5.5 = Not Ready)'
                },
                summary: {
                  type: 'string',
                  description: 'A brief 2-3 sentence summary clearly stating whether the founder is ready to start looking for investors or not'
                },
                strengths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of 3-4 key strengths identified from the scores'
                },
                critical_gaps: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of 3-4 critical gaps or weaknesses that need attention before fundraising'
                },
                next_steps: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of 3-5 actionable next steps tailored to the score, outlining exactly what the founder should focus on improving'
                }
              },
              required: ['verdict', 'summary', 'strengths', 'critical_gaps', 'next_steps']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_readiness' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        body: errorText
      });
      return new Response(
        JSON.stringify({ error: `AI analysis failed: ${aiResponse.status} ${aiResponse.statusText}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let aiData;
    try {
      aiData = await aiResponse.json();
    } catch (parseError) {
      console.error('Failed to parse AI response JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.warn('No tool call in AI response, using fallback');
      // Fallback: create simple response based on score thresholds
      const fallbackSummary = verdict === 'Ready' 
        ? `Based on your average score of ${averageScore.toFixed(1)}/10, you appear ready to start looking for investors. Focus on preparing your pitch deck and identifying target investors.`
        : verdict === 'Almost Ready'
        ? `Based on your average score of ${averageScore.toFixed(1)}/10, you're close to being ready. Address the key gaps identified below before actively seeking investors.`
        : `Based on your average score of ${averageScore.toFixed(1)}/10, you're not quite ready to start fundraising. Focus on improving the areas below before approaching investors.`;
      
      return new Response(
        JSON.stringify({
          verdict: verdict,
          summary: fallbackSummary,
          strengths: ['Complete the assessment to see detailed strengths'],
          critical_gaps: ['Complete the assessment to see detailed gaps'],
          next_steps: ['Complete the assessment to see detailed next steps']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let analysis;
    try {
      analysis = JSON.parse(toolCall.function.arguments);
      // Ensure verdict matches the score threshold
      analysis.verdict = verdict;
      console.log('Analysis parsed successfully:', { verdict: analysis.verdict, hasSummary: !!analysis.summary });
    } catch (parseError) {
      console.error('Failed to parse AI tool call arguments:', parseError, toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI analysis response' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Save assessment to database (optional - never fail on this)
    try {
      const insertResult = await supabase
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
      
      if (insertResult.error) {
        console.error('Database insert error (non-critical, continuing):', insertResult.error);
      } else {
        console.log('Assessment saved to database successfully');
      }
    } catch (dbError) {
      // Non-critical - log but don't fail - this should never happen but just in case
      console.error('Database insert exception (non-critical, continuing):', dbError);
    }

    // Ensure we have all required fields with defaults
    const response = {
      verdict: analysis.verdict || verdict,
      summary: analysis.summary || 'Assessment completed. Review your scores to understand your fundraising readiness.',
      strengths: analysis.strengths || [],
      critical_gaps: analysis.critical_gaps || [],
      next_steps: analysis.next_steps || [],
      average_score: averageScore
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unhandled error in fundraising-readiness-analyzer:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorStack = error instanceof Error ? error.stack : String(error);
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

