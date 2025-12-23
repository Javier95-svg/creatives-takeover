import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkAndDeductCredits, getUserFromAuth } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type MaterialType = 'pitch_deck' | 'cold_email' | 'one_pager';

interface OutreachGenerationRequest {
  material_type: MaterialType;
  investor_id?: string;
  assessment_id?: string;
  industry: string;
  funding_amount: number;
  business_stage: string;
  business_summary?: string;
  readiness_scores?: {
    mvp: number;
    feedback: number;
    team: number;
    runway: number;
  };
  strengths?: string[];
  critical_gaps?: string[];
  verdict?: string;
  investor_name?: string;
  investor_focus?: string[];
  portfolio_companies?: string[];
}

function buildPitchDeckPrompt(request: OutreachGenerationRequest, investorData?: any): string {
  const investorName = investorData?.name || request.investor_name || 'the investor';
  const investorIndustries = investorData?.industries?.join(', ') || request.investor_focus?.join(', ') || '';
  const similarCompanies = investorData?.portfolio_companies?.slice(0, 3).map((p: any) => p.name).join(', ') || '';
  
  return `You are an expert pitch deck consultant helping founders create investor-ready pitch decks.

FOUNDER PROFILE:
Industry: ${request.industry}
Stage: ${request.business_stage}
Funding Ask: $${request.funding_amount.toLocaleString()}
Business Summary: ${request.business_summary || 'Not provided'}

FUNDRAISING READINESS ASSESSMENT:
MVP Score: ${request.readiness_scores?.mvp || 'N/A'}/10
Customer Feedback Score: ${request.readiness_scores?.feedback || 'N/A'}/10
Team Score: ${request.readiness_scores?.team || 'N/A'}/10
Runway Score: ${request.readiness_scores?.runway || 'N/A'}/10
Verdict: ${request.verdict || 'Not provided'}

STRENGTHS TO HIGHLIGHT:
${request.strengths?.map(s => `- ${s}`).join('\n') || 'Not provided'}

CRITICAL GAPS TO ADDRESS:
${request.critical_gaps?.map(g => `- ${g}`).join('\n') || 'Not provided'}

INVESTOR CONTEXT:
${investorName} focuses on: ${investorIndustries}
Portfolio includes: ${similarCompanies}

Generate a 12-15 slide pitch deck with the following structure:
1. Title Slide
2. Problem Statement
3. Solution Overview
4. Market Opportunity
5. Product/MVP Demo
6. Business Model
7. Traction & Metrics
8. Go-to-Market Strategy
9. Competitive Analysis
10. Team
11. Financial Projections
12. Funding Ask & Use of Funds
13. Timeline/Milestones
14. Call to Action

For each slide, provide:
- Slide title
- Key bullet points (3-5)
- Supporting data/metrics
- Visual suggestions

Emphasize strengths while addressing gaps proactively. Make it investor-specific by referencing their portfolio.

Return your response as a JSON object with this exact structure:
{
  "title": "Company Name Pitch Deck",
  "slides": [
    {
      "slide_number": 1,
      "title": "Title Slide",
      "content": "Key points for this slide",
      "notes": "Additional context"
    }
  ]
}`;
}

function buildColdEmailPrompt(request: OutreachGenerationRequest, investorData?: any): string {
  const investorName = investorData?.name || request.investor_name || 'the investor';
  const firmName = investorData?.firm_name || '';
  const similarCompanies = investorData?.portfolio_companies?.slice(0, 2).map((p: any) => p.name).join(', ') || '';
  
  return `You are an expert cold email writer for startup fundraising.

INVESTOR: ${investorName} at ${firmName}
FOUNDER: ${request.business_summary || 'Not provided'}
CONTEXT: ${request.industry} startup seeking $${request.funding_amount.toLocaleString()} in ${request.business_stage} funding

STRENGTHS:
${request.strengths?.map(s => `- ${s}`).join('\n') || 'Not provided'}

INVESTOR PORTFOLIO (for personalization):
${similarCompanies ? `Similar companies: ${similarCompanies}` : ''}

INSTRUCTIONS:
1. Generate 3-5 subject line variations (50-60 characters, action-oriented)
2. Generate email body (100-150 words total)
3. Personalize with investor-specific details
4. Include clear CTA
5. Professional but engaging tone

Structure:
- Subject lines (3-5 variations)
- Opening: Personal connection
- Body (3 paragraphs): Problem/Solution, Traction/Metrics, Ask/CTA
- Closing: Professional sign-off

Return your response as a JSON object with this exact structure:
{
  "subject_variations": ["Subject line 1", "Subject line 2", "Subject line 3"],
  "body": "Email body text here..."
}`;
}

function buildOnePagerPrompt(request: OutreachGenerationRequest, investorData?: any): string {
  return `You are an expert at creating executive summaries for startup fundraising.

FOUNDER PROFILE:
Industry: ${request.industry}
Stage: ${request.business_stage}
Funding Ask: $${request.funding_amount.toLocaleString()}
Business Summary: ${request.business_summary || 'Not provided'}

STRENGTHS:
${request.strengths?.map(s => `- ${s}`).join('\n') || 'Not provided'}

GAPS TO ADDRESS:
${request.critical_gaps?.map(g => `- ${g}`).join('\n') || 'Not provided'}

Create a single-page executive summary with these sections:
1. Header (Company Name, Tagline, Contact)
2. Problem/Solution (2-3 sentences)
3. Market Opportunity (Numbers: TAM, growth rate)
4. Traction (Key metrics, milestones)
5. Team (Founders, key advisors)
6. Business Model (Revenue streams)
7. Funding Ask & Use of Funds (Breakdown)
8. Contact/CTA

Keep total length to 400-500 words. Make it scannable with clear visual hierarchy.

Return your response as a JSON object with this exact structure:
{
  "title": "Company Name Executive Summary",
  "sections": [
    {
      "heading": "Section Name",
      "content": "Section content here..."
    }
  ]
}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: OutreachGenerationRequest = await req.json();

    // Validate required fields
    if (!request.material_type || !['pitch_deck', 'cold_email', 'one_pager'].includes(request.material_type)) {
      return new Response(
        JSON.stringify({ error: 'Valid material_type is required (pitch_deck, cold_email, or one_pager)' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!request.industry || !request.funding_amount || !request.business_stage) {
      return new Response(
        JSON.stringify({ error: 'Industry, funding_amount, and business_stage are required' }),
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

    // Determine credit cost based on material type
    const creditCostMap: Record<MaterialType, number> = {
      pitch_deck: CREDIT_COSTS.PITCH_DECK_GENERATION,
      cold_email: CREDIT_COSTS.COLD_EMAIL_GENERATION,
      one_pager: CREDIT_COSTS.ONEPAGER_GENERATION
    };

    const creditCost = creditCostMap[request.material_type];

    // Check and deduct credits
    const creditCheck = await checkAndDeductCredits(
      user.id,
      creditCost,
      `${request.material_type.replace('_', ' ')} Generation`
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

    // Fetch investor profile if investor_id provided
    let investorData = null;
    if (request.investor_id) {
      const { data: investor } = await supabase
        .from('investors')
        .select('*')
        .eq('id', request.investor_id)
        .single();

      if (investor) {
        investorData = investor;
      }
    }

    // Fetch readiness assessment if assessment_id provided
    if (request.assessment_id && (!request.readiness_scores || !request.verdict)) {
      const { data: assessment } = await supabase
        .from('fundraising_readiness_assessments')
        .select('verdict, mvp_score, feedback_score, team_score, runway_score, team_complementary_score, team_experience_score, traction_revenue_score, milestone_achieved_score, mvp_working_score, product_live_score, market_size_score, demand_validated_score, pitch_deck_score, funding_defined_score, analysis_data')
        .eq('id', request.assessment_id)
        .eq('user_id', user.id)
        .single();

      if (assessment) {
        request.verdict = assessment.verdict as any;
        
        // Use new 10-question format if available, otherwise fall back to old format
        if (assessment.team_complementary_score !== null && assessment.team_complementary_score !== undefined) {
          request.readiness_scores = {
            team_complementary: assessment.team_complementary_score,
            team_experience: assessment.team_experience_score,
            traction_revenue: assessment.traction_revenue_score,
            milestone_achieved: assessment.milestone_achieved_score,
            mvp_working: assessment.mvp_working_score,
            product_live: assessment.product_live_score,
            market_size: assessment.market_size_score,
            demand_validated: assessment.demand_validated_score,
            pitch_deck: assessment.pitch_deck_score,
            funding_defined: assessment.funding_defined_score
          } as any;
        } else if (assessment.mvp_score !== null && assessment.mvp_score !== undefined) {
          request.readiness_scores = {
            mvp: assessment.mvp_score,
            feedback: assessment.feedback_score,
            team: assessment.team_score,
            runway: assessment.runway_score
          } as any;
        }
        
        if (assessment.analysis_data && typeof assessment.analysis_data === 'object') {
          const analysis = assessment.analysis_data as any;
          request.strengths = analysis.strengths;
          request.critical_gaps = analysis.critical_gaps;
        }
      }
    }

    // Build prompt based on material type
    let prompt = '';
    if (request.material_type === 'pitch_deck') {
      prompt = buildPitchDeckPrompt(request, investorData);
    } else if (request.material_type === 'cold_email') {
      prompt = buildColdEmailPrompt(request, investorData);
    } else if (request.material_type === 'one_pager') {
      prompt = buildOnePagerPrompt(request, investorData);
    }

    // Call AI API (Lovable AI Gateway)
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
            content: `You are an expert at creating ${request.material_type.replace('_', ' ')} materials for startup fundraising. Always return valid JSON in the exact structure specified.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: request.material_type === 'pitch_deck' ? 4000 : 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', errorText);
      throw new Error(`AI API Error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let generatedContent: any;

    try {
      const content = aiData.choices[0].message.content;
      generatedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback: try to extract JSON from markdown code blocks
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        generatedContent = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Structure the response based on material type
    let materialContent = '';
    let materialContentJson: any = null;
    let subject = '';

    if (request.material_type === 'pitch_deck') {
      materialContentJson = generatedContent;
      materialContent = JSON.stringify(generatedContent);
    } else if (request.material_type === 'cold_email') {
      subject = generatedContent.subject_variations?.[0] || '';
      materialContent = generatedContent.body || '';
      materialContentJson = generatedContent;
    } else if (request.material_type === 'one_pager') {
      materialContentJson = generatedContent;
      materialContent = generatedContent.sections?.map((s: any) => `## ${s.heading}\n\n${s.content}`).join('\n\n') || '';
    }

    // Save to database (optional, non-blocking)
    let saved = false;
    try {
      const { error: saveError } = await supabase
        .from('outreach_materials')
        .insert({
          user_id: user.id,
          investor_id: request.investor_id || null,
          material_type: request.material_type,
          subject: subject || null,
          content: materialContent,
          content_json: materialContentJson,
          version: 1,
          is_template: false,
          is_final: false
        });

      if (!saveError) {
        saved = true;
      } else {
        console.error('Failed to save material (non-critical):', saveError);
      }
    } catch (saveError) {
      console.error('Error saving material (non-critical):', saveError);
    }

    // Return generated material
    return new Response(
      JSON.stringify({
        material: {
          type: request.material_type,
          content: materialContent,
          content_json: materialContentJson,
          subject: subject || undefined
        },
        credits_used: creditCost,
        saved
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in outreach-generator:', error);
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

