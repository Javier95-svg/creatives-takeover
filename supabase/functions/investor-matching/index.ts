import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkAndDeductCredits, getUserFromAuth } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types (matching TypeScript interfaces)
type InvestmentStage = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c+';

interface PortfolioCompany {
  name: string;
  website?: string;
  industry?: string;
  stage?: string;
  description?: string;
}

interface Investor {
  id: string;
  name: string;
  firm_name: string;
  investment_stages: InvestmentStage[];
  industries: string[];
  geographic_focus: string[];
  locations: string[];
  remote_friendly: boolean;
  typical_check_size_min?: number;
  typical_check_size_max?: number;
  portfolio_companies: PortfolioCompany[];
  match_score_boost?: number;
  [key: string]: any; // For other fields
}

interface MatchRequest {
  industry: string;
  funding_amount: number;
  locations?: string[];
  business_model?: string;
  business_stage?: InvestmentStage;
  business_summary?: string;
  assessment_id?: string;
  readiness_scores?: {
    mvp: number;
    feedback: number;
    team: number;
    runway: number;
  };
  verdict?: 'Ready' | 'Not Ready' | 'Almost Ready';
  strengths?: string[];
  critical_gaps?: string[];
}

interface ReadinessScores {
  verdict?: 'Ready' | 'Not Ready' | 'Almost Ready';
}

interface InvestorMatch {
  investor: Investor;
  match_score: number;
  match_reasons: string[];
  match_breakdown: {
    stage_alignment: number;
    industry_focus: number;
    geographic_preference: number;
    check_size_compatibility: number;
    portfolio_similarity: number;
  };
}

// Matching Algorithm Helper Functions

function calculateStageAlignment(
  investorStages: InvestmentStage[],
  requestedStage: InvestmentStage | undefined,
  readinessScores?: ReadinessScores
): number {
  if (!requestedStage) return 50; // Neutral if not specified
  
  // Exact match = 100
  if (investorStages.includes(requestedStage)) return 100;
  
  // Adjacent stages = 75
  const stageOrder: InvestmentStage[] = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c+'];
  const requestedIndex = stageOrder.indexOf(requestedStage);
  const hasAdjacent = investorStages.some(stage => {
    const stageIndex = stageOrder.indexOf(stage);
    return Math.abs(stageIndex - requestedIndex) === 1;
  });
  if (hasAdjacent) return 75;
  
  // Adjust based on readiness verdict
  if (readinessScores?.verdict === 'Not Ready') {
    // Prefer investors who accept earlier stages
    if (investorStages.includes('pre-seed')) return 60;
  }
  
  return 0; // No match
}

function calculateIndustryMatch(
  investorIndustries: string[],
  requestedIndustry: string
): number {
  if (investorIndustries.length === 0) return 50; // Neutral if no industry specified
  
  // Exact match = 100
  if (investorIndustries.includes(requestedIndustry)) return 100;
  
  // Partial match (case-insensitive) = 100
  const requestedLower = requestedIndustry.toLowerCase();
  if (investorIndustries.some(industry => 
    industry.toLowerCase() === requestedLower
  )) return 100;
  
  // Related industries (future: use industry taxonomy)
  return 0;
}

function calculateGeographicMatch(
  geographicFocus: string[],
  locations: string[],
  remoteFriendly: boolean,
  requestedLocations?: string[]
): number {
  if (!requestedLocations || requestedLocations.length === 0) {
    return remoteFriendly ? 75 : 50; // Prefer remote-friendly if no location specified
  }
  
  // Check if any requested location matches investor's focus
  const hasMatch = requestedLocations.some(loc => 
    geographicFocus.includes(loc) || locations.includes(loc)
  );
  
  if (hasMatch) return 100;
  
  // Remote-friendly investors get partial score
  if (remoteFriendly) return 60;
  
  return 0;
}

function calculateCheckSizeMatch(
  minCheck: number | undefined,
  maxCheck: number | undefined,
  requestedAmount: number | undefined
): number {
  if (!requestedAmount || !minCheck) return 50; // Neutral if not specified
  
  // Exact match or within range = 100
  if (maxCheck && requestedAmount >= minCheck && requestedAmount <= maxCheck) {
    return 100;
  }
  
  // Close match (±25%) = 75
  const range = maxCheck ? maxCheck - minCheck : minCheck * 0.5;
  if (requestedAmount >= minCheck * 0.75 && requestedAmount <= (maxCheck || minCheck * 1.25)) {
    return 75;
  }
  
  // Within 2x range = 50
  if (requestedAmount >= minCheck * 0.5 && requestedAmount <= (maxCheck || minCheck) * 2) {
    return 50;
  }
  
  return 0;
}

function calculatePortfolioSimilarity(
  portfolio: PortfolioCompany[],
  industry?: string,
  businessSummary?: string
): number {
  if (portfolio.length === 0) return 50; // Neutral if no portfolio data
  
  // Count similar companies
  let similarCount = 0;
  if (industry) {
    similarCount = portfolio.filter(company => 
      company.industry?.toLowerCase() === industry.toLowerCase()
    ).length;
  }
  
  // Percentage of portfolio that's similar
  const similarityRatio = similarCount / portfolio.length;
  
  // Score: 0-100 based on similarity ratio
  return Math.min(100, Math.round(similarityRatio * 100));
}

function generateMatchReasons(scores: {
  stageScore: number;
  industryScore: number;
  geoScore: number;
  checkSizeScore: number;
  portfolioScore: number;
}): string[] {
  const reasons: string[] = [];
  
  if (scores.stageScore >= 75) {
    reasons.push("Strong stage alignment with your funding needs");
  }
  if (scores.industryScore >= 80) {
    reasons.push("Active investor in your industry");
  }
  if (scores.geoScore >= 80) {
    reasons.push("Geographic focus matches your location");
  }
  if (scores.checkSizeScore >= 75) {
    reasons.push("Typical check size aligns with your ask");
  }
  if (scores.portfolioScore >= 60) {
    reasons.push("Portfolio includes similar companies");
  }
  
  // Always return at least one reason
  if (reasons.length === 0) {
    reasons.push("Potential match based on investment profile");
  }
  
  return reasons.slice(0, 4); // Max 4 reasons
}

function calculateInvestorMatch(
  investor: Investor,
  matchRequest: MatchRequest,
  readinessScores?: ReadinessScores
): InvestorMatch {
  const weights = {
    stageAlignment: 0.40,
    industryFocus: 0.25,
    geographicPreference: 0.15,
    checkSizeCompatibility: 0.10,
    portfolioSimilarity: 0.10
  };
  
  // 1. Stage Alignment (40%)
  const stageScore = calculateStageAlignment(
    investor.investment_stages,
    matchRequest.business_stage,
    readinessScores
  );
  
  // 2. Industry Focus (25%)
  const industryScore = calculateIndustryMatch(
    investor.industries,
    matchRequest.industry
  );
  
  // 3. Geographic Preference (15%)
  const geoScore = calculateGeographicMatch(
    investor.geographic_focus,
    investor.locations,
    investor.remote_friendly,
    matchRequest.locations
  );
  
  // 4. Check Size Compatibility (10%)
  const checkSizeScore = calculateCheckSizeMatch(
    investor.typical_check_size_min,
    investor.typical_check_size_max,
    matchRequest.funding_amount
  );
  
  // 5. Portfolio Similarity (10%)
  const portfolioScore = calculatePortfolioSimilarity(
    investor.portfolio_companies || [],
    matchRequest.industry,
    matchRequest.business_summary
  );
  
  // Calculate weighted total score
  let totalScore = 
    stageScore * weights.stageAlignment +
    industryScore * weights.industryFocus +
    geoScore * weights.geographicPreference +
    checkSizeScore * weights.checkSizeCompatibility +
    portfolioScore * weights.portfolioSimilarity;
  
  // Add manual boost if featured
  if (investor.match_score_boost) {
    totalScore += investor.match_score_boost;
  }
  
  // Generate match reasons
  const reasons = generateMatchReasons({
    stageScore,
    industryScore,
    geoScore,
    checkSizeScore,
    portfolioScore
  });
  
  return {
    investor,
    match_score: Math.min(100, Math.max(0, Math.round(totalScore))),
    match_reasons: reasons,
    match_breakdown: {
      stage_alignment: stageScore,
      industry_focus: industryScore,
      geographic_preference: geoScore,
      check_size_compatibility: checkSizeScore,
      portfolio_similarity: portfolioScore
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: MatchRequest = await req.json();

    // Validate required fields
    if (!requestData.industry || typeof requestData.industry !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Industry is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!requestData.funding_amount || typeof requestData.funding_amount !== 'number' || requestData.funding_amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valid funding amount is required' }),
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
    const creditCost = CREDIT_COSTS.INVESTOR_MATCHING;
    const creditCheck = await checkAndDeductCredits(
      user.id,
      creditCost,
      'Investor Matching'
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

    // Fetch readiness assessment if assessment_id provided
    let readinessScores: ReadinessScores | undefined;
    if (requestData.assessment_id) {
      const { data: assessment } = await supabase
        .from('fundraising_readiness_assessments')
        .select('verdict, mvp_score, feedback_score, team_score, runway_score, analysis_data')
        .eq('id', requestData.assessment_id)
        .eq('user_id', user.id)
        .single();

      if (assessment) {
        readinessScores = {
          verdict: assessment.verdict as 'Ready' | 'Not Ready' | 'Almost Ready'
        };
        
        // Merge assessment data into request
        if (assessment.analysis_data && typeof assessment.analysis_data === 'object') {
          const analysis = assessment.analysis_data as any;
          requestData.verdict = assessment.verdict as any;
          requestData.strengths = analysis.strengths;
          requestData.critical_gaps = analysis.critical_gaps;
        }
        
        if (!requestData.readiness_scores) {
          requestData.readiness_scores = {
            mvp: assessment.mvp_score,
            feedback: assessment.feedback_score,
            team: assessment.team_score,
            runway: assessment.runway_score
          };
        }
      }
    }

    // Fetch all active investors
    const { data: investors, error: investorsError } = await supabase
      .from('investors')
      .select('*')
      .eq('is_active', true);

    if (investorsError) {
      console.error('Error fetching investors:', investorsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch investors' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!investors || investors.length === 0) {
      return new Response(
        JSON.stringify({ 
          matches: [],
          top_matches: [],
          match_request: requestData,
          generated_at: new Date().toISOString(),
          credits_used: creditCost
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Apply matching algorithm to each investor
    const matches: InvestorMatch[] = investors
      .map((investor: any) => calculateInvestorMatch(investor, requestData, readinessScores))
      .filter(match => match.match_score > 0) // Only include matches with score > 0
      .sort((a, b) => b.match_score - a.match_score) // Sort by score descending
      .slice(0, 15); // Take top 15

    // Get top 3 investor IDs
    const topMatches = matches.slice(0, 3).map(m => m.investor.id);

    // Prepare matched investors data for database
    const matchedInvestorsData = matches.map(m => ({
      investor_id: m.investor.id,
      match_score: m.match_score,
      match_reasons: m.match_reasons
    }));

    // Save matches to database (optional, non-blocking)
    try {
      const { error: saveError } = await supabase
        .from('investor_matches')
        .insert({
          user_id: user.id,
          assessment_id: requestData.assessment_id || null,
          industry: requestData.industry,
          funding_amount: requestData.funding_amount,
          locations: requestData.locations || [],
          business_model: requestData.business_model || null,
          business_stage: requestData.business_stage || null,
          business_summary: requestData.business_summary || null,
          matched_investors: matchedInvestorsData,
          top_matches: topMatches,
          status: 'active'
        });

      if (saveError) {
        console.error('Failed to save matches (non-critical):', saveError);
      }
    } catch (saveError) {
      console.error('Error saving matches (non-critical):', saveError);
    }

    // Return matches
    return new Response(
      JSON.stringify({
        matches,
        top_matches: topMatches,
        match_request: requestData,
        generated_at: new Date().toISOString(),
        credits_used: creditCost
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in investor-matching:', error);
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

