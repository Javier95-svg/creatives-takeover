import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkAndDeductCredits, getUserFromAuth } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type MaterialType = 'cold_email' | 'one_pager' | 'pitch_deck';

interface OutreachRequest {
  material_type: MaterialType;
  investor_id?: string;
  assessment_id?: string;
  
  // Business data
  industry: string;
  funding_amount: number;
  business_stage?: string;
  business_summary: string;
  
  // Readiness data
  readiness_scores?: {
    mvp: number;
    feedback: number;
    team: number;
    runway: number;
  };
  strengths?: string[];
  critical_gaps?: string[];
  verdict?: string;
  
  // Investor-specific data (if not fetching)
  investor_name?: string;
  investor_firm?: string;
  investor_focus?: string[];
  portfolio_companies?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: OutreachRequest = await req.json();

    // Validate required fields
    if (!request.material_type || !request.industry || !request.business_summary) {
      return new Response(
        JSON.stringify({ error: 'material_type, industry, and business_summary are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate material type
    if (!['cold_email', 'one_pager', 'pitch_deck'].includes(request.material_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid material_type. Must be cold_email, one_pager, or pitch_deck' }),
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

    // Get credit cost based on material type
    const creditCosts: Record<MaterialType, number> = {
      cold_email: CREDIT_COSTS.COLD_EMAIL_GENERATION,
      one_pager: CREDIT_COSTS.ONEPAGER_GENERATION,
      pitch_deck: CREDIT_COSTS.PITCH_DECK_GENERATION
    };

    const creditCost = creditCosts[request.material_type];

    // Check and deduct credits
    const creditCheck = await checkAndDeductCredits(
      user.id,
      creditCost,
      `${request.material_type.replace('_', ' ')} generation`
    );

    if (!creditCheck.success) {
      return new Response(
        JSON.stringify({ 
          error: creditCheck.error || 'Insufficient credits',
          required: creditCost
        }),
        { 
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Fetch investor data if investor_id provided
    let investorData = null;
    if (request.investor_id) {
      const { data: investor, error: investorError } = await supabase
        .from('investors')
        .select('*')
        .eq('id', request.investor_id)
        .single();

      if (!investorError && investor) {
        investorData = investor;
      }
    }

    // Fetch readiness assessment if assessment_id provided
    let readinessData = null;
    if (request.assessment_id) {
      const { data: assessment } = await supabase
        .from('fundraising_readiness_assessments')
        .select('*')
        .eq('id', request.assessment_id)
        .eq('user_id', user.id)
        .single();

      if (assessment) {
        readinessData = {
          scores: {
            mvp: assessment.mvp_score,
            feedback: assessment.feedback_score,
            team: assessment.team_score,
            runway: assessment.runway_score
          },
          verdict: assessment.verdict,
          strengths: assessment.analysis_data?.strengths || [],
          critical_gaps: assessment.analysis_data?.critical_gaps || []
        };
      }
    }

    // Use provided data or fallback to fetched data
    const finalReadiness = request.readiness_scores || readinessData?.scores;
    const finalStrengths = request.strengths || readinessData?.strengths || [];
    const finalGaps = request.critical_gaps || readinessData?.critical_gaps || [];
    const finalVerdict = request.verdict || readinessData?.verdict;

    // Generate content based on material type
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let generatedContent: any;

    if (request.material_type === 'cold_email') {
      generatedContent = await generateColdEmail(
        LOVABLE_API_KEY,
        request,
        investorData,
        finalReadiness,
        finalStrengths,
        finalGaps,
        finalVerdict
      );
    } else if (request.material_type === 'one_pager') {
      generatedContent = await generateOnePager(
        LOVABLE_API_KEY,
        request,
        investorData,
        finalReadiness,
        finalStrengths,
        finalGaps,
        finalVerdict
      );
    } else if (request.material_type === 'pitch_deck') {
      generatedContent = await generatePitchDeck(
        LOVABLE_API_KEY,
        request,
        investorData,
        finalReadiness,
        finalStrengths,
        finalGaps,
        finalVerdict
      );
    }

    // Save to database (optional)
    try {
      await supabase
        .from('outreach_materials')
        .insert({
          user_id: user.id,
          investor_id: request.investor_id || null,
          match_id: null, // Can be linked later
          material_type: request.material_type,
          subject: generatedContent.subject,
          content: generatedContent.content || generatedContent.body,
          content_json: generatedContent.content_json || null,
          version: 1,
          is_template: false,
          is_final: false
        });
    } catch (dbError) {
      // Non-critical - log but don't fail
      console.error('Failed to save outreach material:', dbError);
    }

    // Return generated content
    return new Response(
      JSON.stringify({
        material: {
          type: request.material_type,
          ...generatedContent
        },
        credits_used: creditCost,
        new_balance: creditCheck.newBalance,
        saved: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in outreach-generator:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Generate cold email
async function generateColdEmail(
  apiKey: string,
  request: OutreachRequest,
  investor: any,
  readinessScores: any,
  strengths: string[],
  gaps: string[],
  verdict: string | undefined
): Promise<{ subject: string; subject_variations: string[]; body: string }> {
  const investorName = investor?.name || request.investor_name || 'Investor';
  const investorFirm = investor?.firm_name || request.investor_firm || 'their firm';
  const investorFocus = investor?.industries || request.investor_focus || [];
  const portfolioCompanies = investor?.portfolio_companies?.slice(0, 3).map((c: any) => c.name) || 
                             request.portfolio_companies?.slice(0, 3) || [];

  const prompt = `You are an expert cold email writer for startup fundraising. Generate a personalized cold email for reaching out to an investor.

INVESTOR CONTEXT:
Name: ${investorName}
Firm: ${investorFirm}
Focus Areas: ${investorFocus.join(', ')}
${portfolioCompanies.length > 0 ? `Portfolio Companies: ${portfolioCompanies.join(', ')}` : ''}

FOUNDER PROFILE:
Industry: ${request.industry}
Stage: ${request.business_stage || 'Not specified'}
Funding Ask: $${request.funding_amount.toLocaleString()}
Business Summary: ${request.business_summary}

${readinessScores ? `FUNDRAISING READINESS:
MVP Score: ${readinessScores.mvp}/10
Customer Feedback Score: ${readinessScores.feedback}/10
Team Score: ${readinessScores.team}/10
Runway Score: ${readinessScores.runway}/10
Verdict: ${verdict || 'Not specified'}
${strengths.length > 0 ? `Strengths: ${strengths.join(', ')}` : ''}
${gaps.length > 0 ? `Areas to Address: ${gaps.join(', ')}` : ''}` : ''}

INSTRUCTIONS:
1. Generate 3-5 compelling subject line variations (50-60 characters each, action-oriented)
2. Generate email body (100-150 words total, 3-4 paragraphs)
3. Personalize with investor-specific details (portfolio companies, focus areas)
4. Include clear value proposition and traction/metrics if available
5. End with a specific, low-friction call-to-action
6. Professional but engaging tone
7. Address any readiness gaps proactively if mentioned

OUTPUT FORMAT: Return a JSON object with this structure:
{
  "subject": "Best subject line",
  "subject_variations": ["Subject 1", "Subject 2", "Subject 3"],
  "body": "Email body text here..."
}`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are an expert cold email writer for startup fundraising. Always return valid JSON in the exact structure specified. Be concise, professional, and compelling.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    throw new Error(`AI API Error: ${aiResponse.status} - ${errorText}`);
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices[0]?.message?.content || '{}';
  
  try {
    const parsed = JSON.parse(content);
    return {
      subject: parsed.subject || 'Partnership Opportunity',
      subject_variations: parsed.subject_variations || [parsed.subject || 'Partnership Opportunity'],
      body: parsed.body || 'Email body generation failed. Please try again.'
    };
  } catch (parseError) {
    // Fallback if JSON parsing fails
    return {
      subject: 'Partnership Opportunity',
      subject_variations: ['Partnership Opportunity', 'Startup Opportunity', 'Investment Opportunity'],
      body: content || 'Email body generation failed. Please try again.'
    };
  }
}

// Generate one-pager (placeholder for now)
async function generateOnePager(
  apiKey: string,
  request: OutreachRequest,
  investor: any,
  readinessScores: any,
  strengths: string[],
  gaps: string[],
  verdict: string | undefined
): Promise<{ content: string; content_json: any }> {
  // Placeholder - will be implemented in Step 5
  return {
    content: 'One-pager generation coming in Step 5',
    content_json: null
  };
}

// Generate pitch deck (placeholder for now)
async function generatePitchDeck(
  apiKey: string,
  request: OutreachRequest,
  investor: any,
  readinessScores: any,
  strengths: string[],
  gaps: string[],
  verdict: string | undefined
): Promise<{ content: string; content_json: any }> {
  // Placeholder - will be implemented in Step 6
  return {
    content: 'Pitch deck generation coming in Step 6',
    content_json: null
  };
}
