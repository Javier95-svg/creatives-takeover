import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkAndDeductCredits, getUserFromAuth } from '../_shared/credit-deduction.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Credit cost for fundraising readiness analysis - must match CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS in constants.ts
const FUNDRAISING_READINESS_CREDIT_COST = 8;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mvp_score, feedback_score, team_score, runway_score } = await req.json();

    // Validate scores
    if (
      typeof mvp_score !== 'number' || mvp_score < 0 || mvp_score > 10 ||
      typeof feedback_score !== 'number' || feedback_score < 0 || feedback_score > 10 ||
      typeof team_score !== 'number' || team_score < 0 || team_score > 10 ||
      typeof runway_score !== 'number' || runway_score < 0 || runway_score > 10
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid scores. All scores must be between 0 and 10.' }),
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
    const creditCheck = await checkAndDeductCredits(
      user.id,
      FUNDRAISING_READINESS_CREDIT_COST,
      'Fundraising Readiness Analysis'
    );

    if (!creditCheck.success) {
      return new Response(
        JSON.stringify({ 
          error: creditCheck.error || 'Insufficient credits',
          required: FUNDRAISING_READINESS_CREDIT_COST
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

    // Calculate average score
    const averageScore = (mvp_score + feedback_score + team_score + runway_score) / 4;
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

    const prompt = `You are a fundraising readiness expert analyzing a pre-seed startup's readiness assessment.

Assessment Scores (0-10 scale):
- MVP Complete: ${mvp_score} (${scoreLabels[mvp_score as keyof typeof scoreLabels]})
- Customer Feedback: ${feedback_score} (${scoreLabels[feedback_score as keyof typeof scoreLabels]})
- Team in Place: ${team_score} (${scoreLabels[team_score as keyof typeof scoreLabels]})
- Runway Secured: ${runway_score} (${scoreLabels[runway_score as keyof typeof scoreLabels]})

Average Score: ${averageScore.toFixed(1)}/10.0
Current Status: ${isReady ? 'Ready' : 'Not Ready'}

Provide a comprehensive, actionable analysis for a first-time entrepreneur. Be encouraging but realistic.`;

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
          mvp_score,
          feedback_score,
          team_score,
          runway_score,
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
          mvp: mvp_score,
          feedback: feedback_score,
          team: team_score,
          runway: runway_score
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

