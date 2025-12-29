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
      // Original 4 scores
      mvp_score,
      feedback_score,
      team_score,
      runway_score,
      // New 6 scores
      founder_market_fit_score,
      traction_score,
      competitive_positioning_score,
      gtm_strategy_score,
      unit_economics_score,
      legal_readiness_score,
      // Context fields
      founder_stage,
      founder_experience,
      industry,
      business_model,
      primary_location,
      funding_amount_needed,
      pitch_summary
    } = await req.json();

    // Validate required scores (original 4)
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

    // Validate optional new scores (nullable)
    const validateOptionalScore = (score: number | null | undefined) =>
      score === null || score === undefined || (typeof score === 'number' && score >= 0 && score <= 10);

    if (
      !validateOptionalScore(founder_market_fit_score) ||
      !validateOptionalScore(traction_score) ||
      !validateOptionalScore(competitive_positioning_score) ||
      !validateOptionalScore(gtm_strategy_score) ||
      !validateOptionalScore(unit_economics_score) ||
      !validateOptionalScore(legal_readiness_score)
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid optional scores. All scores must be between 0 and 10.' }),
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

    // Calculate average score (including optional new questions)
    const allScores = [
      mvp_score,
      feedback_score,
      team_score,
      runway_score,
      founder_market_fit_score,
      traction_score,
      competitive_positioning_score,
      gtm_strategy_score,
      unit_economics_score,
      legal_readiness_score
    ].filter(score => score !== null && score !== undefined);

    const averageScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;

    // Stage-specific readiness thresholds
    const READINESS_THRESHOLDS: Record<string, {
      min_average: number;
      critical_minimums: Record<string, number>;
      message: string;
    }> = {
      ideation: {
        min_average: 5.0,
        critical_minimums: { mvp: 3, runway: 4 },
        message: 'Early validation complete, ready for pre-seed conversations'
      },
      validation: {
        min_average: 6.0,
        critical_minimums: { mvp: 5, traction: 3, runway: 5 },
        message: 'Strong early signals, ready for pre-seed/seed'
      },
      building: {
        min_average: 6.5,
        critical_minimums: { mvp: 6, traction: 4, runway: 6 },
        message: 'Product-market fit emerging, ready for seed'
      },
      launching: {
        min_average: 7.0,
        critical_minimums: { mvp: 7, traction: 6, runway: 6 },
        message: 'Growth ready, strong seed/Series A candidate'
      },
      scaling: {
        min_average: 7.5,
        critical_minimums: { mvp: 8, traction: 7, runway: 7 },
        message: 'Scaling proven model, Series A+ ready'
      }
    };

    // Determine readiness based on stage
    const stage = founder_stage || 'validation'; // Default to validation
    const threshold = READINESS_THRESHOLDS[stage] || READINESS_THRESHOLDS.validation;

    // Check if meets average threshold
    const meetsAverage = averageScore >= threshold.min_average;

    // Check critical minimums
    const criticalScores: Record<string, number> = {
      mvp: mvp_score,
      traction: traction_score ?? 0,
      runway: runway_score
    };

    const meetsCriticalMinimums = Object.entries(threshold.critical_minimums).every(
      ([key, minValue]) => criticalScores[key] >= minValue
    );

    const meetsInvestorThreshold = meetsAverage && meetsCriticalMinimums;

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

    // Build stage-specific prompt
    const experienceLabel = {
      'first-time': 'first-time',
      'second-time': 'second-time',
      'experienced': 'experienced (3+ startups)'
    }[founder_experience || 'first-time'] || 'first-time';

    const stageLabel = {
      'ideation': 'Ideation (validating idea, no product yet)',
      'validation': 'Validation (early prototype, first users)',
      'building': 'Building (building MVP, finding product-market fit)',
      'launching': 'Launching (product live, acquiring customers)',
      'scaling': 'Scaling (proven model, scaling operations)'
    }[stage] || 'Validation';

    const formatScore = (score: number | null | undefined, label: string) => {
      if (score === null || score === undefined) return null;
      return `- ${label}: ${score} (${scoreLabels[score as keyof typeof scoreLabels]})`;
    };

    const scoresList = [
      formatScore(founder_market_fit_score, 'Founder-Market Fit'),
      formatScore(mvp_score, 'MVP Complete'),
      formatScore(traction_score, 'Traction & Metrics'),
      formatScore(feedback_score, 'Customer Feedback'),
      formatScore(competitive_positioning_score, 'Competitive Positioning'),
      formatScore(gtm_strategy_score, 'Go-to-Market Strategy'),
      formatScore(unit_economics_score, 'Unit Economics'),
      formatScore(team_score, 'Team in Place'),
      formatScore(runway_score, 'Runway Secured'),
      formatScore(legal_readiness_score, 'Legal & IP Readiness')
    ].filter(s => s !== null).join('\n');

    const contextInfo = `
Founder Context:
- Stage: ${stageLabel}
- Experience: ${experienceLabel} founder
${industry ? `- Industry: ${industry}` : ''}
${business_model ? `- Business Model: ${business_model}` : ''}
${funding_amount_needed ? `- Funding Seeking: $${funding_amount_needed.toLocaleString()}` : ''}
${pitch_summary ? `- Brief: ${pitch_summary}` : ''}
`.trim();

    const prompt = `You are a fundraising readiness expert analyzing a ${stage} stage startup's readiness assessment.

${contextInfo}

Assessment Scores (0-10 scale):
${scoresList}

Average Score: ${averageScore.toFixed(1)}/10.0
Stage Threshold: ${threshold.min_average}/10.0 average required
Meets Investor Threshold: ${meetsInvestorThreshold ? 'YES' : 'NO'}

CRITICAL INSTRUCTIONS:
1. Judge this founder against ${stage.toUpperCase()} stage standards, NOT scaling-stage perfection
2. Be calibrated to their experience level (${experienceLabel})
3. Focus on the next 1-2 most important actions for their stage
4. Be encouraging but realistic
${industry ? `5. Provide industry-specific advice for ${industry}` : ''}

Provide a comprehensive, stage-appropriate analysis.`;

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
          content: `You are an expert fundraising advisor helping ${experienceLabel} founders in the ${stage} stage.

Your role is to provide stage-appropriate, actionable feedback that is:
1. Calibrated to ${stage} expectations (not absolute perfection)
2. Encouraging but realistic
3. Focused on the next 1-2 most important actions
${industry ? `4. Specific to their industry (${industry}) and business model (${business_model || 'their business model'})` : ''}

CRITICAL: Judge against ${stage} standards, NOT scaling-stage perfection.`
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
                      estimated_time: { type: 'string' },
                      rationale: { type: 'string', description: 'Why this matters for this stage' }
                    },
                    required: ['action', 'priority', 'rationale']
                  },
                  description: 'Top 3-5 prioritized action items with priority, time estimates, and stage-specific rationale'
                },
                stage_benchmark_comparison: {
                  type: 'object',
                  properties: {
                    above_benchmark: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Areas where founder exceeds stage expectations'
                    },
                    below_benchmark: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Areas where founder is below stage expectations'
                    },
                    on_track_for_stage: {
                      type: 'boolean',
                      description: 'Overall assessment if founder is on track for their stage'
                    }
                  },
                  required: ['above_benchmark', 'below_benchmark', 'on_track_for_stage'],
                  description: 'Stage-specific benchmark comparison'
                },
                timeline_to_readiness: {
                  type: 'string',
                  description: 'Estimated timeline to reach fundraising readiness (e.g., "2-3 months", "1-2 weeks", "6+ months")'
                },
                next_milestone: {
                  type: 'string',
                  description: 'What is the next big milestone for this founder to achieve?'
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
          // Original 4 scores
          mvp_score,
          feedback_score,
          team_score,
          runway_score,
          // New 6 scores
          founder_market_fit_score: founder_market_fit_score ?? null,
          traction_score: traction_score ?? null,
          competitive_positioning_score: competitive_positioning_score ?? null,
          gtm_strategy_score: gtm_strategy_score ?? null,
          unit_economics_score: unit_economics_score ?? null,
          legal_readiness_score: legal_readiness_score ?? null,
          // Context fields
          founder_stage: founder_stage ?? null,
          founder_experience: founder_experience ?? null,
          industry: industry ?? null,
          business_model: business_model ?? null,
          primary_location: primary_location ?? null,
          funding_amount_needed: funding_amount_needed ?? null,
          pitch_summary: pitch_summary ?? null,
          // Computed fields
          average_score: averageScore,
          meets_investor_threshold: meetsInvestorThreshold,
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
        meets_investor_threshold: meetsInvestorThreshold,
        threshold_message: threshold.message,
        scores: {
          // Original 4 scores
          mvp: mvp_score,
          feedback: feedback_score,
          team: team_score,
          runway: runway_score,
          // New 6 scores (include if provided)
          ...(founder_market_fit_score !== null && founder_market_fit_score !== undefined && { founder_market_fit: founder_market_fit_score }),
          ...(traction_score !== null && traction_score !== undefined && { traction: traction_score }),
          ...(competitive_positioning_score !== null && competitive_positioning_score !== undefined && { competitive_positioning: competitive_positioning_score }),
          ...(gtm_strategy_score !== null && gtm_strategy_score !== undefined && { gtm_strategy: gtm_strategy_score }),
          ...(unit_economics_score !== null && unit_economics_score !== undefined && { unit_economics: unit_economics_score }),
          ...(legal_readiness_score !== null && legal_readiness_score !== undefined && { legal_readiness: legal_readiness_score })
        },
        context: {
          founder_stage: stage,
          founder_experience: founder_experience || null,
          industry: industry || null,
          business_model: business_model || null,
          primary_location: primary_location || null,
          funding_amount_needed: funding_amount_needed || null
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

