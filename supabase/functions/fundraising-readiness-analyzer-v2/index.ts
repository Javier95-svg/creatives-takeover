import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// INLINED SHARED DEPENDENCIES (for Editor deployment compatibility)
// ============================================================================

// Credit constants (from _shared/credit-constants.ts)
const CREDIT_COSTS = {
  FUNDRAISING_READINESS_ANALYSIS: 8,
} as const;

// Credit deduction result interface
interface CreditDeductionResult {
  success: boolean;
  newBalance?: number;
  newQuota?: number;
  usedFromQuota?: number;
  usedFromBalance?: number;
  error?: string;
  errorCode?: 'INSUFFICIENT_CREDITS' | 'USER_NOT_FOUND' | 'DEDUCTION_FAILED';
}

// Get user from authorization header (from _shared/credit-deduction.ts)
async function getUserFromAuth(req: Request): Promise<{ id: string } | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (error || !user) {
      return null;
    }

    return { id: user.id };
  } catch (error) {
    console.error('Error getting user from auth:', error);
    return null;
  }
}

// Check and deduct credits (simplified version from _shared/credit-deduction.ts)
async function checkAndDeductCredits(
  userId: string,
  amount: number,
  feature: string
): Promise<CreditDeductionResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      success: false,
      error: 'Supabase configuration missing',
      errorCode: 'DEDUCTION_FAILED'
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  try {
    const { data: credits, error: fetchError } = await supabase
      .from('user_credits')
      .select('balance, monthly_quota')
      .eq('user_id', userId)
      .single();

    if (fetchError || !credits) {
      return {
        success: false,
        error: 'User credit record not found',
        errorCode: 'USER_NOT_FOUND'
      };
    }

    const totalAvailable = (credits.monthly_quota || 0) + (credits.balance || 0);

    if (totalAvailable < amount) {
      return {
        success: false,
        error: 'Insufficient credits',
        errorCode: 'INSUFFICIENT_CREDITS'
      };
    }

    let usedFromQuota = 0;
    let usedFromBalance = 0;
    let newQuota = credits.monthly_quota || 0;
    let newBalance = credits.balance || 0;

    if (newQuota >= amount) {
      usedFromQuota = amount;
      newQuota = newQuota - amount;
    } else {
      usedFromQuota = newQuota;
      usedFromBalance = amount - newQuota;
      newQuota = 0;
      newBalance = newBalance - usedFromBalance;
    }

    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ 
        monthly_quota: newQuota,
        balance: newBalance
      })
      .eq('user_id', userId)
      .gte('balance', credits.balance - usedFromBalance)
      .gte('monthly_quota', credits.monthly_quota - usedFromQuota);

    if (updateError) {
      return {
        success: false,
        error: 'Failed to update credit balance',
        errorCode: 'DEDUCTION_FAILED'
      };
    }

    await supabase
      .from('credit_transactions')
      .insert([{
        user_id: userId,
        amount: -amount,
        tx_type: 'deduct',
        reason: `Used ${amount} credits for ${feature}`,
        feature,
        metadata: {
          usedFromQuota,
          usedFromBalance
        }
      }]);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
      errorCode: 'DEDUCTION_FAILED'
    };
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    createTimeout(timeoutMs)
  ]);
}

serve(async (req) => {
  const startTime = Date.now();
  const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] === FUNDRAISING READINESS ANALYZER V2 START ===`);
  console.log(`[${requestId}] Request method: ${req.method}`);
  console.log(`[${requestId}] Request URL: ${req.url}`);
  console.log(`[${requestId}] Has Authorization header: ${!!req.headers.get('Authorization')}`);
  console.log(`[${requestId}] Has Content-Type header: ${!!req.headers.get('Content-Type')}`);
  
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] OPTIONS request - returning CORS headers`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${requestId}] Step 1: Parsing request body...`);
    let requestBody: any = {};
    
    try {
      const contentType = req.headers.get('Content-Type');
      console.log(`[${requestId}] Content-Type: ${contentType || 'not set'}`);
      
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
      
      if (hasBody) {
        try {
          requestBody = await req.json();
          console.log(`[${requestId}] Request body parsed successfully`);
        } catch (jsonParseError) {
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
      
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body. Please ensure the request body is valid JSON.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[${requestId}] Step 2: Validating request body exists and is an object...`);
    if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
      console.error(`[${requestId}] Request body is missing, not an object, or is an array`);
      return new Response(
        JSON.stringify({ error: 'Request body is required and must be a JSON object with score data' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    console.log(`[${requestId}] Request body validation passed`);

    console.log(`[${requestId}] Step 3: Validating all 10 required scores for V2...`);
    const requiredScoresKeys = [
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

    const rawScores: { [key: string]: any } = {};
    const missingScores: string[] = [];

    for (const key of requiredScoresKeys) {
      const value = requestBody[key];
      if (value === undefined || value === null || value === '') {
        missingScores.push(key);
        console.error(`[${requestId}] Missing score: ${key}`);
      } else {
        rawScores[key] = value;
      }
    }
    
    if (missingScores.length > 0) {
      console.error(`[${requestId}] Missing required scores: ${missingScores.join(', ')}`);
      return new Response(
        JSON.stringify({ 
          error: `Missing required scores for 10-question format: ${missingScores.join(', ')}. Please ensure all 10 questions are answered.`,
          missingScores 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    console.log(`[${requestId}] All 10 required scores present`);

    console.log(`[${requestId}] Step 4: Converting and validating scores...`);
    const scores: { [key: string]: number } = {};
    const invalidScores: Array<{ key: string; value: any; reason: string }> = [];
    
    for (const [key, rawValue] of Object.entries(rawScores)) {
      const numValue = Number(rawValue);
      
      if (isNaN(numValue)) {
        invalidScores.push({ 
          key, 
          value: rawValue, 
          reason: `Cannot convert to number (type: ${typeof rawValue}, value: ${rawValue})` 
        });
        console.error(`[${requestId}] Invalid score ${key}: ${rawValue} (NaN after conversion)`);
        continue;
      }
      
      if (numValue < 0 || numValue > 10) {
        invalidScores.push({ 
          key, 
          value: rawValue, 
          reason: `Out of range: ${numValue} (must be 0-10)` 
        });
        console.error(`[${requestId}] Invalid score ${key}: ${numValue} (out of range)`);
        continue;
      }
      
      const roundedValue = Math.round(numValue);
      scores[key.replace('_score', '')] = roundedValue;
      console.log(`[${requestId}] Valid score ${key}: ${rawValue} → ${roundedValue} (stored as ${key.replace('_score', '')})`);
    }

    if (Object.keys(scores).length !== 10 || invalidScores.length > 0) {
      console.error(`[${requestId}] Score validation failed:`);
      console.error(`[${requestId}] - Valid scores count: ${Object.keys(scores).length} (expected: 10)`);
      console.error(`[${requestId}] - Invalid scores: ${invalidScores.length}`);
      console.error(`[${requestId}] - Invalid score details:`, invalidScores);
      
      const errorDetails = invalidScores.map(s => `${s.key}: ${s.value} (${s.reason})`).join(', ');
      return new Response(
        JSON.stringify({ 
          error: `Invalid scores. All 10 scores must be numbers between 0 and 10. Issues: ${errorDetails || `Received ${Object.keys(scores).length} valid scores instead of 10`}`,
          invalidScores 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`[${requestId}] All scores validated successfully:`, scores);

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
      console.warn(`[${requestId}] Proceeding without OpenAI API - will use fallback analysis`);
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`[${requestId}] Supabase client created`);

    console.log(`[${requestId}] Step 8: Calculating average score and verdict...`);
    const scoreValues = Object.values(scores);
    const scoreCount = scoreValues.length;
    const averageScore = scoreCount > 0 ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreCount : 0;
    console.log(`[${requestId}] Average score: ${averageScore.toFixed(2)} (from ${scoreCount} scores)`);
    
    let verdict: 'Ready' | 'Not Ready' | 'Almost Ready';
    if (averageScore >= 7.0) {
      verdict = 'Ready';
    } else if (averageScore >= 5.5) {
      verdict = 'Almost Ready';
    } else {
      verdict = 'Not Ready';
    }
    console.log(`[${requestId}] Verdict: ${verdict} (threshold: ${averageScore >= 7.0 ? '>=7.0' : averageScore >= 5.5 ? '>=5.5' : '<5.5'})`);

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
        const prompt = `Analyze this fundraising readiness assessment and provide a clear, actionable analysis.

Assessment Scores (0-10 scale):
- Complementary Founding Team: ${scores.team_complementary || 0}/10
- Previous Startup Experience: ${scores.team_experience || 0}/10
- Revenue or User Traction: ${scores.traction_revenue || 0}/10
- Key Growth Milestone: ${scores.milestone_achieved || 0}/10
- Working MVP: ${scores.mvp_working || 0}/10
- Product Live: ${scores.product_live || 0}/10
- Large Market ($1B+): ${scores.market_size || 0}/10
- Demand Validated: ${scores.demand_validated || 0}/10
- Pitch Deck Ready: ${scores.pitch_deck || 0}/10
- Funding Defined: ${scores.funding_defined || 0}/10

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
          30000 
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

        const responseContent = aiData.choices?.[0]?.message?.content || '';
        console.log(`[${requestId}] AI response content length: ${responseContent.length}`);
        console.log(`[${requestId}] AI response content preview: ${responseContent.substring(0, 200)}...`);
        
        if (!responseContent) {
          console.error(`[${requestId}] AI response content is empty`);
          throw new Error('AI response content is empty');
        }

        try {
          let jsonText = responseContent.trim();
          jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }
          
          const parsedAnalysis = JSON.parse(jsonText);
          console.log(`[${requestId}] AI analysis JSON parsed successfully`);
          
          if (typeof parsedAnalysis !== 'object' || parsedAnalysis === null) {
            throw new Error('AI response is not a valid object');
          }
          
          analysis = {
            verdict: verdict, 
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

    if (user) {
      console.log(`[${requestId}] Step 10: Saving assessment to database for user ${user.id}...`);
      try {
        const insertPayload: any = {
          user_id: user.id,
          average_score: averageScore,
          verdict: analysis.verdict,
          analysis_data: analysis,
          created_at: new Date().toISOString(),
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
        };
        
        console.log(`[${requestId}] Inserting with new 10-question format`);
        
        const insertResult = await supabase
          .from('fundraising_readiness_assessments')
          .insert(insertPayload);
        
        if (insertResult.error) {
          console.warn(`[${requestId}] Database insert failed (non-critical):`, insertResult.error.message);
          console.warn(`[${requestId}] Database error code: ${insertResult.error.code || 'N/A'}`);
          console.warn(`[${requestId}] Database error details: ${insertResult.error.details || 'N/A'}`);
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
      }
    } else {
      console.log(`[${requestId}] Step 10: Skipping database save (no authentication)`);
    }

    console.log(`[${requestId}] Step 11: Building final response...`);
    
    const response = {
      verdict: analysis.verdict || verdict,
      summary: analysis.summary || 'Assessment completed. Review your scores to understand your fundraising readiness.',
      extra_info: analysis.extra_info || '',
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      critical_gaps: Array.isArray(analysis.critical_gaps) ? analysis.critical_gaps : [],
      next_steps: Array.isArray(analysis.next_steps) ? analysis.next_steps : [],
      average_score: averageScore
    };
    
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
    console.log(`[${requestId}] === FUNDRAISING READINESS ANALYZER V2 SUCCESS ===`);
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
    const currentRequestId = requestId;
    console.error(`[${currentRequestId}] === UNHANDLED ERROR IN FUNDRAISING READINESS ANALYZER V2 ===`);
    console.error(`[${currentRequestId}] Error:`, error);
    console.error(`[${currentRequestId}] Error type: ${error?.constructor?.name}`);
    console.error(`[${currentRequestId}] Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[${currentRequestId}] Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'An unexpected error occurred during analysis. Please try again.';
    
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
