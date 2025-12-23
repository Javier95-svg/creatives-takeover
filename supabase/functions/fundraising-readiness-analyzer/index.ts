import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkAndDeductCredits, getUserFromAuth } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to create timeout promise
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}

// Helper function to create timeout-wrapped fetch
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    createTimeout(timeoutMs)
  ]);
}

serve(async (req) => {
  const startTime = Date.now();
  const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Exhaustive logging: Function entry
  console.log(`[${requestId}] === FUNDRAISING READINESS ANALYZER START ===`);
  console.log(`[${requestId}] Request method: ${req.method}`);
  console.log(`[${requestId}] Request URL: ${req.url}`);
  console.log(`[${requestId}] Has Authorization header: ${!!req.headers.get('Authorization')}`);
  console.log(`[${requestId}] Has Content-Type header: ${!!req.headers.get('Content-Type')}`);
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] OPTIONS request - returning CORS headers`);
    return new Response(null, { headers: corsHeaders });
  }

  // Wrap entire function in try-catch to ensure Response is always returned
  try {
    // Step 1: Parse request body
    console.log(`[${requestId}] Step 1: Parsing request body...`);
    let requestBody: any;
    
    try {
      // Check if request has body
      const contentType = req.headers.get('Content-Type');
      console.log(`[${requestId}] Content-Type: ${contentType || 'not set'}`);
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error(`[${requestId}] Invalid Content-Type: ${contentType}`);
        return new Response(
          JSON.stringify({ error: 'Content-Type must be application/json' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      requestBody = await req.json();
      console.log(`[${requestId}] Request body parsed successfully`);
      console.log(`[${requestId}] Request body keys: ${Object.keys(requestBody || {}).join(', ')}`);
      console.log(`[${requestId}] Request body type: ${typeof requestBody}`);
      
    } catch (jsonError) {
      console.error(`[${requestId}] Failed to parse request JSON:`, jsonError);
      console.error(`[${requestId}] JSON error type: ${jsonError?.constructor?.name}`);
      console.error(`[${requestId}] JSON error message: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
      
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Step 2: Validate request body exists
    console.log(`[${requestId}] Step 2: Validating request body exists...`);
    if (!requestBody || typeof requestBody !== 'object') {
      console.error(`[${requestId}] Request body is missing or not an object`);
      return new Response(
        JSON.stringify({ error: 'Request body is required and must be a JSON object' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    console.log(`[${requestId}] Request body validation passed`);

    // Step 3: Extract and validate all required scores
    console.log(`[${requestId}] Step 3: Validating required scores...`);
    const requiredScores = [
      'team_complementary_score',
      'team_experience_score',
      'traction_revenue_score',
      'milestone_achieved_score',
      'mvp_working_score',
      'product_live_score',
      'market_size_score',
      'demand_validated_score',
      'pitch_deck_score',
      'funding_defined_score'
    ];

    // Check that all required scores are present
    const missingScores = requiredScores.filter(key => {
      const value = requestBody[key];
      const isMissing = value === undefined || value === null || value === '';
      if (isMissing) {
        console.error(`[${requestId}] Missing score: ${key} (value: ${value})`);
      }
      return isMissing;
    });
    
    if (missingScores.length > 0) {
      console.error(`[${requestId}] Missing scores: ${missingScores.join(', ')}`);
      console.error(`[${requestId}] Total missing: ${missingScores.length} out of ${requiredScores.length}`);
      return new Response(
        JSON.stringify({ 
          error: `Missing required scores: ${missingScores.join(', ')}. Please ensure all 10 questions are answered.`,
          missingScores 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    console.log(`[${requestId}] All required scores present`);

    // Step 4: Extract and convert scores to numbers
    console.log(`[${requestId}] Step 4: Extracting and converting scores...`);
    const rawScores = {
      team_complementary_score: requestBody.team_complementary_score,
      team_experience_score: requestBody.team_experience_score,
      traction_revenue_score: requestBody.traction_revenue_score,
      milestone_achieved_score: requestBody.milestone_achieved_score,
      mvp_working_score: requestBody.mvp_working_score,
      product_live_score: requestBody.product_live_score,
      market_size_score: requestBody.market_size_score,
      demand_validated_score: requestBody.demand_validated_score,
      pitch_deck_score: requestBody.pitch_deck_score,
      funding_defined_score: requestBody.funding_defined_score
    };

    console.log(`[${requestId}] Raw scores received:`, rawScores);

    // Convert to numbers and validate
    const scores: { [key: string]: number } = {};
    const invalidScores: Array<{ key: string; value: any; reason: string }> = [];
    
    for (const [key, rawValue] of Object.entries(rawScores)) {
      // Convert to number (handles string numbers like "5")
      const numValue = Number(rawValue);
      
      // Check if conversion resulted in NaN
      if (isNaN(numValue)) {
        invalidScores.push({ 
          key, 
          value: rawValue, 
          reason: `Cannot convert to number (type: ${typeof rawValue}, value: ${rawValue})` 
        });
        console.error(`[${requestId}] Invalid score ${key}: ${rawValue} (NaN after conversion)`);
        continue;
      }
      
      // Check if out of range
      if (numValue < 0 || numValue > 10) {
        invalidScores.push({ 
          key, 
          value: rawValue, 
          reason: `Out of range: ${numValue} (must be 0-10)` 
        });
        console.error(`[${requestId}] Invalid score ${key}: ${numValue} (out of range)`);
        continue;
      }
      
      // Round to integer (scores should be whole numbers)
      const roundedValue = Math.round(numValue);
      scores[key.replace('_score', '')] = roundedValue;
      console.log(`[${requestId}] Valid score ${key}: ${rawValue} → ${roundedValue}`);
    }

    // Validate we have exactly 10 valid scores
    const scoreValues = Object.values(scores);
    if (scoreValues.length !== 10 || invalidScores.length > 0) {
      console.error(`[${requestId}] Score validation failed:`);
      console.error(`[${requestId}] - Valid scores count: ${scoreValues.length} (expected: 10)`);
      console.error(`[${requestId}] - Invalid scores: ${invalidScores.length}`);
      console.error(`[${requestId}] - Invalid score details:`, invalidScores);
      
      const errorDetails = invalidScores.map(s => `${s.key}: ${s.value} (${s.reason})`).join(', ');
      return new Response(
        JSON.stringify({ 
          error: `Invalid scores. All 10 scores must be numbers between 0 and 10. Issues: ${errorDetails || `Received ${scoreValues.length} valid scores instead of 10`}`,
          invalidScores 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`[${requestId}] All scores validated successfully:`, scores);

    // Step 5: Authentication (optional)
    console.log(`[${requestId}] Step 5: Attempting authentication (optional)...`);
    let user: { id: string } | null = null;
    
    try {
      user = await getUserFromAuth(req);
      if (user) {
        console.log(`[${requestId}] Authentication successful - User ID: ${user.id}`);
      } else {
        console.warn(`[${requestId}] Authentication failed or not provided - proceeding without auth`);
      }
    } catch (authError) {
      console.warn(`[${requestId}] Authentication error (non-fatal):`, authError);
      console.warn(`[${requestId}] Proceeding without authentication`);
      user = null;
    }

    // Step 6: Credit check (only if authenticated)
    let creditCheck = { success: true };
    if (user) {
      console.log(`[${requestId}] Step 6: Checking credits for user ${user.id}...`);
      const creditCost = CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS;
      console.log(`[${requestId}] Required credits: ${creditCost}`);
      
      try {
        creditCheck = await checkAndDeductCredits(
          user.id,
          creditCost,
          'Fundraising Readiness Analysis'
        );
        
        if (creditCheck.success) {
          console.log(`[${requestId}] Credits deducted successfully`);
        } else {
          console.error(`[${requestId}] Credit check failed:`, creditCheck);
          console.error(`[${requestId}] Error: ${creditCheck.error || 'Unknown error'}`);
          console.error(`[${requestId}] Error code: ${creditCheck.errorCode || 'N/A'}`);
          
          const statusCode = creditCheck.errorCode === 'INSUFFICIENT_CREDITS' ? 402 : 400;
          return new Response(
            JSON.stringify({ 
              error: creditCheck.error || 'Insufficient credits',
              required: creditCost
            }),
            { 
              status: statusCode,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      } catch (creditError) {
        console.error(`[${requestId}] Credit check exception:`, creditError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to process credit check. Please try again.',
            required: creditCost
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      console.log(`[${requestId}] Step 6: Skipping credit check (no authentication)`);
    }

    // Step 7: Check environment variables
    console.log(`[${requestId}] Step 7: Checking environment variables...`);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    console.log(`[${requestId}] SUPABASE_URL: ${supabaseUrl ? 'SET' : 'MISSING'}`);
    console.log(`[${requestId}] SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? 'SET' : 'MISSING'}`);
    console.log(`[${requestId}] OPENAI_API_KEY: ${OPENAI_API_KEY ? 'SET' : 'MISSING'}`);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error(`[${requestId}] Missing Supabase configuration`);
      console.error(`[${requestId}] - SUPABASE_URL: ${!!supabaseUrl}`);
      console.error(`[${requestId}] - SUPABASE_SERVICE_ROLE_KEY: ${!!supabaseKey}`);
      
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (!OPENAI_API_KEY) {
      console.error(`[${requestId}] OPENAI_API_KEY not configured`);
      // Don't fail - we'll use fallback analysis
      console.warn(`[${requestId}] Proceeding without OpenAI API - will use fallback analysis`);
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`[${requestId}] Supabase client created`);

    // Step 8: Calculate average score and verdict
    console.log(`[${requestId}] Step 8: Calculating average score and verdict...`);
    const scoreValues = Object.values(scores);
    const averageScore = scoreValues.reduce((sum, score) => sum + score, 0) / 10;
    console.log(`[${requestId}] Average score: ${averageScore.toFixed(2)}`);
    
    // Determine verdict based on score thresholds
    let verdict: 'Ready' | 'Not Ready' | 'Almost Ready';
    if (averageScore >= 7.0) {
      verdict = 'Ready';
    } else if (averageScore >= 5.5) {
      verdict = 'Almost Ready';
    } else {
      verdict = 'Not Ready';
    }
    console.log(`[${requestId}] Verdict: ${verdict} (threshold: ${averageScore >= 7.0 ? '>=7.0' : averageScore >= 5.5 ? '>=5.5' : '<5.5'})`);

    // Step 9: Generate AI analysis (with guards and fallback)
    console.log(`[${requestId}] Step 9: Generating AI analysis...`);
    let analysis: {
      verdict: 'Ready' | 'Not Ready' | 'Almost Ready';
      summary: string;
      strengths: string[];
      critical_gaps: string[];
      next_steps: string[];
    };
    
    if (OPENAI_API_KEY) {
      try {
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

        console.log(`[${requestId}] Calling OpenAI API...`);
        console.log(`[${requestId}] Prompt length: ${prompt.length} characters`);
        const aiCallStartTime = Date.now();
        
        // Guard AI call with timeout
        const aiResponse = await fetchWithTimeout(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{
                role: 'user',
                content: prompt
              }],
              temperature: 0.7,
              max_tokens: 1000,
              response_format: { type: 'json_object' }
            }),
          },
          30000 // 30 second timeout
        );
        
        const aiCallDuration = Date.now() - aiCallStartTime;
        console.log(`[${requestId}] OpenAI API call completed in ${aiCallDuration}ms`);
        console.log(`[${requestId}] Response status: ${aiResponse.status} ${aiResponse.statusText}`);
        console.log(`[${requestId}] Response OK: ${aiResponse.ok}`);

        if (!aiResponse.ok) {
          let errorText = '';
          try {
            errorText = await aiResponse.text();
            console.error(`[${requestId}] OpenAI API error response:`, errorText);
          } catch (e) {
            console.error(`[${requestId}] Failed to read error response body:`, e);
          }
          throw new Error(`OpenAI API error (${aiResponse.status}): ${errorText || aiResponse.statusText}`);
        }

        // Parse AI response
        console.log(`[${requestId}] Parsing AI response...`);
        let aiData: any;
        try {
          aiData = await aiResponse.json();
          console.log(`[${requestId}] AI response parsed successfully`);
          console.log(`[${requestId}] AI response has choices: ${!!aiData.choices}`);
          console.log(`[${requestId}] AI response choices count: ${aiData.choices?.length || 0}`);
        } catch (parseError) {
          console.error(`[${requestId}] Failed to parse AI response JSON:`, parseError);
          throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
        }

        // Extract and validate response content
        const responseContent = aiData.choices?.[0]?.message?.content || '';
        console.log(`[${requestId}] AI response content length: ${responseContent.length}`);
        console.log(`[${requestId}] AI response content preview: ${responseContent.substring(0, 200)}...`);
        
        if (!responseContent) {
          console.error(`[${requestId}] AI response content is empty`);
          throw new Error('AI response content is empty');
        }

        // Parse JSON from response
        try {
          let jsonText = responseContent.trim();
          // Remove markdown code blocks if present
          jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
          // Try to find JSON object in the text
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }
          
          const parsedAnalysis = JSON.parse(jsonText);
          console.log(`[${requestId}] AI analysis JSON parsed successfully`);
          
          // Validate structure
          if (typeof parsedAnalysis !== 'object' || parsedAnalysis === null) {
            throw new Error('AI response is not a valid object');
          }
          
          // Ensure verdict matches score threshold (override AI verdict with calculated one)
          analysis = {
            verdict: verdict, // Use calculated verdict, not AI's
            summary: parsedAnalysis.summary || '',
            strengths: Array.isArray(parsedAnalysis.strengths) ? parsedAnalysis.strengths : [],
            critical_gaps: Array.isArray(parsedAnalysis.critical_gaps) ? parsedAnalysis.critical_gaps : [],
            next_steps: Array.isArray(parsedAnalysis.next_steps) ? parsedAnalysis.next_steps : []
          };
          
          console.log(`[${requestId}] AI analysis structure validated`);
          console.log(`[${requestId}] Analysis summary length: ${analysis.summary.length}`);
          console.log(`[${requestId}] Analysis strengths count: ${analysis.strengths.length}`);
          console.log(`[${requestId}] Analysis critical_gaps count: ${analysis.critical_gaps.length}`);
          console.log(`[${requestId}] Analysis next_steps count: ${analysis.next_steps.length}`);
          
        } catch (parseError) {
          console.error(`[${requestId}] Failed to parse AI response JSON:`, parseError);
          console.error(`[${requestId}] Response content:`, responseContent);
          throw new Error(`Failed to parse AI JSON: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
        }
        
      } catch (aiError) {
        console.error(`[${requestId}] AI API call failed:`, aiError);
        console.error(`[${requestId}] AI error type: ${aiError?.constructor?.name}`);
        console.error(`[${requestId}] AI error message: ${aiError instanceof Error ? aiError.message : String(aiError)}`);
        console.warn(`[${requestId}] Using fallback analysis due to AI error`);
        
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
        
        console.log(`[${requestId}] Fallback analysis generated`);
      }
    } else {
      console.warn(`[${requestId}] OpenAI API key not available - using fallback analysis`);
      
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
      
      console.log(`[${requestId}] Fallback analysis generated (no API key)`);
    }

    // Step 10: Save to database (optional, only if authenticated)
    if (user) {
      console.log(`[${requestId}] Step 10: Saving assessment to database for user ${user.id}...`);
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
          console.warn(`[${requestId}] Database insert failed (non-critical):`, insertResult.error.message);
          console.warn(`[${requestId}] Database error code: ${insertResult.error.code || 'N/A'}`);
          console.warn(`[${requestId}] Database error details: ${insertResult.error.details || 'N/A'}`);
          // Continue anyway - database save is optional
        } else {
          console.log(`[${requestId}] Assessment saved to database successfully`);
          if (insertResult.data) {
            console.log(`[${requestId}] Inserted record ID: ${insertResult.data[0]?.id || 'N/A'}`);
          }
        }
      } catch (dbError) {
        console.warn(`[${requestId}] Database insert exception (ignored):`, dbError);
        console.warn(`[${requestId}] Database error type: ${dbError?.constructor?.name}`);
        console.warn(`[${requestId}] Database error message: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
        // Ignore database errors completely - this is optional
      }
    } else {
      console.log(`[${requestId}] Step 10: Skipping database save (no authentication)`);
    }

    // Step 11: Build final response
    console.log(`[${requestId}] Step 11: Building final response...`);
    
    // Ensure we have all required fields with defaults
    const response = {
      verdict: analysis.verdict || verdict,
      summary: analysis.summary || 'Assessment completed. Review your scores to understand your fundraising readiness.',
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      critical_gaps: Array.isArray(analysis.critical_gaps) ? analysis.critical_gaps : [],
      next_steps: Array.isArray(analysis.next_steps) ? analysis.next_steps : [],
      average_score: averageScore
    };
    
    // Validate response structure
    if (!response.verdict || !response.summary) {
      console.error(`[${requestId}] Response validation failed - missing required fields`);
      return new Response(
        JSON.stringify({ error: 'Failed to generate analysis. Please try again.' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] === FUNDRAISING READINESS ANALYZER SUCCESS ===`);
    console.log(`[${requestId}] Total processing time: ${totalDuration}ms`);
    console.log(`[${requestId}] Final verdict: ${response.verdict}`);
    console.log(`[${requestId}] Average score: ${response.average_score.toFixed(2)}`);
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    // Final catch-all error handler - ensures Response is always returned
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.error(`[${requestId}] === UNHANDLED ERROR IN FUNDRAISING READINESS ANALYZER ===`);
    console.error(`[${requestId}] Error:`, error);
    console.error(`[${requestId}] Error type: ${error?.constructor?.name}`);
    console.error(`[${requestId}] Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[${requestId}] Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'An unexpected error occurred during analysis. Please try again.';
    
    // Return a user-friendly error message
    const userFriendlyMessage = errorMessage.includes('API') || errorMessage.includes('fetch') || errorMessage.includes('timeout')
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
