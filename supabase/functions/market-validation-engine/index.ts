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

    // Use Lovable AI to analyze market potential
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a market validation expert. Analyze business ideas and provide realistic validation scores.
            
Your job is to:
1. Assess market size potential (0-100)
2. Evaluate competition intensity (0-100, higher = more competitive)
3. Analyze demand strength (0-100)
4. Identify top 3-5 competitors with their strengths/weaknesses
5. Find differentiation opportunities
6. Calculate overall validation score (weighted average)

Be realistic and data-driven. Consider:
- Market saturation
- Entry barriers
- Customer acquisition difficulty
- Revenue potential
- Execution complexity`
          },
          {
            role: 'user',
            content: `Validate this business idea:

Business Idea: ${business_idea}
Industry: ${industry}
Target Market: ${target_market}

Provide a comprehensive market validation analysis.`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'validate_market',
            description: 'Return market validation scores and analysis',
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
                      strengths: { type: 'array', items: { type: 'string' } },
                      weaknesses: { type: 'array', items: { type: 'string' } }
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
                      opportunity_score: { type: 'number', minimum: 0, maximum: 100 }
                    }
                  }
                },
                confidence_level: {
                  type: 'string',
                  enum: ['low', 'medium', 'high']
                }
              },
              required: ['market_size_score', 'competition_score', 'demand_score', 'confidence_level']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'validate_market' } }
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
    const overall_score = (
      (validationData.market_size_score * 0.35) +
      ((100 - validationData.competition_score) * 0.30) + // Invert competition - lower is better
      (validationData.demand_score * 0.35)
    );

    // Store validation in database
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
        confidence_level: validationData.confidence_level,
        data_sources: [
          { name: 'AI Analysis', type: 'ai_inference', reliability_score: 75 }
        ]
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
