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
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Please contact support.' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
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

    const prompt = `Analyze this fundraising readiness assessment and provide a clear, actionable analysis.

Assessment Scores (0-10 scale):
- Complementary Founding Team: ${scores.team_complementary}/10
- Previous Startup Experience: ${scores.team_experience}/10
- Revenue or User Traction: ${scores.traction_revenue}/10
- Key Growth Milestone: ${scores.milestone_achieved}/10
- Working MVP: ${scores.mvp_working}/10
- Product Live: ${scores.product_live}/10
- Large Market ($1B+): ${scores.market_size}/10
- Demand Validated: ${scores.demand_validated}/10
- Pitch Deck Ready: ${scores.pitch_deck}/10
- Funding Defined: ${scores.funding_defined}/10

Average Score: ${averageScore.toFixed(1)}/10.0
Verdict: ${verdict} (Ready if >=7.0, Almost Ready if >=5.5, Not Ready if <5.5)

Provide a JSON response with this exact structure:
{
  "verdict": "${verdict}",
  "summary": "2-3 sentence summary stating if ready to fundraise",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "critical_gaps": ["gap 1", "gap 2", "gap 3"],
  "next_steps": ["step 1", "step 2", "step 3", "step 4"]
}`;

    let aiResponse;
    try {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 1000
      }),
      });
    } catch (fetchError) {
      console.error('=== FETCH ERROR ===');
      console.error('Error type:', fetchError?.constructor?.name);
      console.error('Error message:', fetchError instanceof Error ? fetchError.message : String(fetchError));
      console.error('Full error:', fetchError);
      return new Response(
        JSON.stringify({ error: `Network error: ${fetchError instanceof Error ? fetchError.message : 'Unable to connect to AI service'}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('AI API Response Status:', aiResponse.status, aiResponse.statusText);

    if (!aiResponse.ok) {
      let errorText = '';
      try {
        errorText = await aiResponse.text();
      } catch (e) {
        console.error('Failed to read error response body:', e);
      }
      console.error('=== AI API ERROR ===');
      console.error('Status:', aiResponse.status);
      console.error('StatusText:', aiResponse.statusText);
      console.error('Error body:', errorText);
      return new Response(
        JSON.stringify({ error: `AI service error (${aiResponse.status}): ${errorText || aiResponse.statusText}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let aiData;
    try {
      aiData = await aiResponse.json();
      console.log('AI Data parsed successfully. Choices:', aiData.choices?.length || 0);
      if (aiData.choices?.[0]?.message) {
        console.log('Message role:', aiData.choices[0].message.role);
        console.log('Has tool_calls:', !!aiData.choices[0].message.tool_calls);
      }
    } catch (parseError) {
      console.error('=== JSON PARSE ERROR ===');
      console.error('Parse error:', parseError);
      // Clone response to read text for debugging (body can only be read once)
      const responseClone = aiResponse.clone();
      const responseText = await responseClone.text().catch(() => 'Unable to read response');
      console.error('Response text (first 1000 chars):', responseText.substring(0, 1000));
      return new Response(
        JSON.stringify({ error: `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract JSON from response content
    const responseContent = aiData.choices?.[0]?.message?.content || '';
    console.log('AI Response content length:', responseContent.length);
    console.log('AI Response content (first 500 chars):', responseContent.substring(0, 500));
    
    let analysis;
    try {
      // Try to extract JSON from the response (might be wrapped in markdown code blocks)
      let jsonText = responseContent.trim();
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      // Try to find JSON object in the text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      analysis = JSON.parse(jsonText);
      // Ensure verdict matches the score threshold
      analysis.verdict = verdict;
      console.log('Analysis parsed successfully:', { verdict: analysis.verdict, hasSummary: !!analysis.summary });
    } catch (parseError) {
      console.error('Failed to parse AI response JSON:', parseError);
      console.error('Response content:', responseContent);
      // Fallback: create simple response based on score thresholds
      const fallbackSummary = verdict === 'Ready' 
        ? `Based on your average score of ${averageScore.toFixed(1)}/10, you appear ready to start looking for investors. Focus on preparing your pitch deck and identifying target investors.`
        : verdict === 'Almost Ready'
        ? `Based on your average score of ${averageScore.toFixed(1)}/10, you're close to being ready. Address the key gaps identified below before actively seeking investors.`
        : `Based on your average score of ${averageScore.toFixed(1)}/10, you're not quite ready to start fundraising. Focus on improving the areas below before approaching investors.`;
      
      analysis = {
        verdict: verdict,
        summary: fallbackSummary,
        strengths: ['Strong team foundation', 'Clear market opportunity', 'Product development in progress'],
        critical_gaps: ['Need more traction', 'Improve product-market fit', 'Strengthen pitch materials'],
        next_steps: ['Focus on customer acquisition', 'Refine your value proposition', 'Prepare pitch deck', 'Validate market demand']
      };
    }

    // Save assessment to database (optional - completely skip if it fails)
    // This is non-critical, so we don't let it affect the response
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
        console.warn('Database insert failed (non-critical):', insertResult.error.message);
        // Continue anyway - database save is optional
      }
    } catch (dbError) {
      // Ignore database errors completely - this is optional
      console.warn('Database insert exception (ignored):', dbError);
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
    console.error('=== UNHANDLED ERROR IN FUNDRAISING READINESS ANALYZER ===');
    console.error('Error:', error);
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'An unexpected error occurred during analysis. Please try again.';
    
    // Return a user-friendly error message
    const userFriendlyMessage = errorMessage.includes('API') || errorMessage.includes('fetch')
      ? 'AI analysis service is temporarily unavailable. Please try again in a moment.'
      : errorMessage || 'An unexpected error occurred. Please try again.';
    
    return new Response(
      JSON.stringify({ 
        error: userFriendlyMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

