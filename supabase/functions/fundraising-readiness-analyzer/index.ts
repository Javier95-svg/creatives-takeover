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
    // Step 1: Safely parse request body (never crash on invalid/missing body)
    console.log(`[${requestId}] Step 1: Parsing request body...`);
    let requestBody: any = {};
    
    try {
      // Check if request has body - handle empty body gracefully
      const contentType = req.headers.get('Content-Type');
      console.log(`[${requestId}] Content-Type: ${contentType || 'not set'}`);
      
      // Only require JSON content-type if body exists
      const hasBody = req.body !== null && req.body !== undefined;
      if (hasBody && contentType && !contentType.includes('application/json')) {
        console.error(`[${requestId}] Invalid Content-Type: ${contentType}`);
        return new Response(
          JSON.stringify({ error: 'Content-Type must be application/json' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Try to parse JSON - handle empty body gracefully
      if (hasBody) {
        try {
          requestBody = await req.json();
          console.log(`[${requestId}] Request body parsed successfully`);
        } catch (jsonParseError) {
          // If JSON parsing fails, try to get text first for better error message
          try {
            const textBody = await req.text();
            console.error(`[${requestId}] Failed to parse JSON, raw body: ${textBody.substring(0, 200)}`);
          } catch (textError) {
            console.error(`[${requestId}] Failed to read body as text`);
          }
          throw jsonParseError;
        }
      } else {
        console.log(`[${requestId}] Request has no body - using empty object`);
        requestBody = {};
      }
      
      console.log(`[${requestId}] Request body keys: ${Object.keys(requestBody || {}).join(', ')}`);
      console.log(`[${requestId}] Request body type: ${typeof requestBody}`);
      
    } catch (jsonError) {
      console.error(`[${requestId}] Failed to parse request JSON:`, jsonError);
      console.error(`[${requestId}] JSON error type: ${jsonError?.constructor?.name}`);
      console.error(`[${requestId}] JSON error message: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
      
      // Return valid JSON response instead of crashing
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body. Please ensure the request body is valid JSON.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Step 2: Validate request body exists and is an object
    console.log(`[${requestId}] Step 2: Validating request body...`);
    if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
      console.error(`[${requestId}] Request body is missing, not an object, or is an array`);
      return new Response(
        JSON.stringify({ error: 'Request body must be a JSON object with score data' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    console.log(`[${requestId}] Request body validation passed`);

    // Step 3: Detect payload format and extract scores (backward-compatible)
    console.log(`[${requestId}] Step 3: Detecting payload format and extracting scores...`);
    
    // Old 4-question format keys
    const oldFormatKeys = ['mvp_score', 'feedback_score', 'team_score', 'runway_score'];
    // New 10-question format keys
    const newFormatKeys = [
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
    
    // Detect which format is being used
    const hasOldFormat = oldFormatKeys.some(key => requestBody[key] !== undefined && requestBody[key] !== null);
    const hasNewFormat = newFormatKeys.some(key => requestBody[key] !== undefined && requestBody[key] !== null);
    
    console.log(`[${requestId}] Format detection - Has old format: ${hasOldFormat}, Has new format: ${hasNewFormat}`);
    
    // Extract scores based on detected format
    const rawScores: { [key: string]: any } = {};
    let expectedScoreCount = 0;
    let formatType = 'unknown';
    
    if (hasNewFormat) {
      // New 10-question format
      formatType = 'new_10_question';
      expectedScoreCount = 10;
      for (const key of newFormatKeys) {
        rawScores[key] = requestBody[key];
      }
      console.log(`[${requestId}] Using new 10-question format`);
    } else if (hasOldFormat) {
      // Old 4-question format
      formatType = 'old_4_question';
      expectedScoreCount = 4;
      for (const key of oldFormatKeys) {
        rawScores[key] = requestBody[key];
      }
      console.log(`[${requestId}] Using old 4-question format (backward compatibility)`);
    } else {
      // No recognized format
      console.error(`[${requestId}] No recognized score format found`);
      console.error(`[${requestId}] Available keys: ${Object.keys(requestBody).join(', ')}`);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid payload format. Expected either old 4-question format (mvp_score, feedback_score, team_score, runway_score) or new 10-question format (team_complementary_score, etc.).',
          receivedKeys: Object.keys(requestBody)
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[${requestId}] Raw scores extracted (${formatType}):`, rawScores);

    // Step 4: Convert scores to numbers and validate
    console.log(`[${requestId}] Step 4: Converting and validating scores...`);
    const scores: { [key: string]: number } = {};
    const invalidScores: Array<{ key: string; value: any; reason: string }> = [];
    
    for (const [key, rawValue] of Object.entries(rawScores)) {
      // Skip if value is explicitly undefined/null/empty (but allow 0)
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        invalidScores.push({ 
          key, 
          value: rawValue, 
          reason: `Missing or null value` 
        });
        console.error(`[${requestId}] Missing score ${key}`);
        continue;
      }
      
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
      // Store with normalized key (remove _score suffix for consistency)
      const normalizedKey = key.replace('_score', '');
      scores[normalizedKey] = roundedValue;
      console.log(`[${requestId}] Valid score ${key}: ${rawValue} → ${roundedValue} (stored as ${normalizedKey})`);
    }

    // Validate we have the expected number of valid scores
    const scoreValues = Object.values(scores);
    if (scoreValues.length !== expectedScoreCount || invalidScores.length > 0) {
      console.error(`[${requestId}] Score validation failed:`);
      console.error(`[${requestId}] - Format: ${formatType}`);
      console.error(`[${requestId}] - Valid scores count: ${scoreValues.length} (expected: ${expectedScoreCount})`);
      console.error(`[${requestId}] - Invalid scores: ${invalidScores.length}`);
      console.error(`[${requestId}] - Invalid score details:`, invalidScores);
      
      const errorDetails = invalidScores.map(s => `${s.key}: ${s.value} (${s.reason})`).join(', ');
      return new Response(
        JSON.stringify({ 
          error: `Invalid scores. All ${expectedScoreCount} scores must be numbers between 0 and 10. Issues: ${errorDetails || `Received ${scoreValues.length} valid scores instead of ${expectedScoreCount}`}`,
          invalidScores,
          format: formatType
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`[${requestId}] All scores validated successfully (${formatType}):`, scores);

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

    // Step 8: Calculate average score and verdict (normalized for both formats)
    console.log(`[${requestId}] Step 8: Calculating average score and verdict...`);
    const scoreValues = Object.values(scores);
    const scoreCount = scoreValues.length;
    const averageScore = scoreCount > 0 ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreCount : 0;
    console.log(`[${requestId}] Average score: ${averageScore.toFixed(2)} (from ${scoreCount} scores)`);
    
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

        // Build prompt based on detected format
        let prompt = `Analyze this fundraising readiness assessment and provide a clear, actionable analysis.\n\n`;
        
        if (formatType === 'new_10_question') {
          // New 10-question format
          prompt += `Assessment Scores (0-10 scale):\n`;
          prompt += `- Complementary Founding Team: ${scores.team_complementary || 0}/10\n`;
          prompt += `- Previous Startup Experience: ${scores.team_experience || 0}/10\n`;
          prompt += `- Revenue or User Traction: ${scores.traction_revenue || 0}/10\n`;
          prompt += `- Key Growth Milestone: ${scores.milestone_achieved || 0}/10\n`;
          prompt += `- Working MVP: ${scores.mvp_working || 0}/10\n`;
          prompt += `- Product Live: ${scores.product_live || 0}/10\n`;
          prompt += `- Large Market ($1B+): ${scores.market_size || 0}/10\n`;
          prompt += `- Demand Validated: ${scores.demand_validated || 0}/10\n`;
          prompt += `- Pitch Deck Ready: ${scores.pitch_deck || 0}/10\n`;
          prompt += `- Funding Defined: ${scores.funding_defined || 0}/10\n\n`;
        } else {
          // Old 4-question format
          prompt += `Assessment Scores (0-10 scale):\n`;
          prompt += `- MVP Development: ${scores.mvp || 0}/10\n`;
          prompt += `- Customer Feedback: ${scores.feedback || 0}/10\n`;
          prompt += `- Team Strength: ${scores.team || 0}/10\n`;
          prompt += `- Financial Runway: ${scores.runway || 0}/10\n\n`;
        }
        
        prompt += `Average Score: ${averageScore.toFixed(1)}/10.0\n`;
        prompt += `Verdict: ${verdict} (Ready if >=7.0, Almost Ready if >=5.5, Not Ready if <5.5)\n\n`;
        prompt += `Provide a JSON response with this exact structure:\n`;
        prompt += `{\n`;
        prompt += `  "verdict": "${verdict}",\n`;
        prompt += `  "summary": "2-3 sentence summary stating if ready to fundraise",\n`;
        prompt += `  "strengths": ["strength 1", "strength 2", "strength 3"],\n`;
        prompt += `  "critical_gaps": ["gap 1", "gap 2", "gap 3"],\n`;
        prompt += `  "next_steps": ["step 1", "step 2", "step 3", "step 4"]\n`;
        prompt += `}`;

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
        // Build insert payload based on format type
        const insertPayload: any = {
          user_id: user.id,
          average_score: averageScore,
          verdict: analysis.verdict,
          analysis_data: analysis,
          created_at: new Date().toISOString()
        };
        
        // Add scores based on format
        if (formatType === 'new_10_question') {
          // New 10-question format
          insertPayload.team_complementary_score = scores.team_complementary;
          insertPayload.team_experience_score = scores.team_experience;
          insertPayload.traction_revenue_score = scores.traction_revenue;
          insertPayload.milestone_achieved_score = scores.milestone_achieved;
          insertPayload.mvp_working_score = scores.mvp_working;
          insertPayload.product_live_score = scores.product_live;
          insertPayload.market_size_score = scores.market_size;
          insertPayload.demand_validated_score = scores.demand_validated;
          insertPayload.pitch_deck_score = scores.pitch_deck;
          insertPayload.funding_defined_score = scores.funding_defined;
          console.log(`[${requestId}] Inserting with new 10-question format`);
        } else if (formatType === 'old_4_question') {
          // Old 4-question format
          insertPayload.mvp_score = scores.mvp;
          insertPayload.feedback_score = scores.feedback;
          insertPayload.team_score = scores.team;
          insertPayload.runway_score = scores.runway;
          console.log(`[${requestId}] Inserting with old 4-question format`);
        }
        
        const insertResult = await supabase
          .from('fundraising_readiness_assessments')
          .insert(insertPayload);
        
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
