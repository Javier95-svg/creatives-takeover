import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkAndDeductCredits, getUserFromAuth } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
type InvestmentStage = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c+';

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

interface Investor {
  id: string;
  name: string;
  firm_name: string;
  industries: string[];
  investment_stages: InvestmentStage[];
  typical_check_size_min?: number;
  typical_check_size_max?: number;
  geographic_focus: string[];
  locations: string[];
  remote_friendly: boolean;
  portfolio_companies: any[];
  is_active: boolean;
  match_score_boost?: number;
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

// Matching weights
const WEIGHTS = {
  stageAlignment: 0.40,
  industryFocus: 0.25,
  geographicPreference: 0.15,
  checkSizeCompatibility: 0.10,
  portfolioSimilarity: 0.10
};

// Matching algorithm functions (ported from client-side)
function calculateStageAlignment(
  investorStages: InvestmentStage[],
  requestedStage: InvestmentStage | undefined,
  verdict?: string
): number {
  if (!requestedStage) return 50;

  if (investorStages.includes(requestedStage)) return 100;

  const stageOrder: InvestmentStage[] = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c+'];
  const requestedIndex = stageOrder.indexOf(requestedStage);
  
  if (requestedIndex === -1) return 0;

  const hasAdjacent = investorStages.some(stage => {
    const stageIndex = stageOrder.indexOf(stage);
    return stageIndex !== -1 && Math.abs(stageIndex - requestedIndex) === 1;
  });
  
  if (hasAdjacent) return 75;

  if (verdict === 'Not Ready') {
    if (investorStages.includes('pre-seed')) return 60;
  }

  const hasNearby = investorStages.some(stage => {
    const stageIndex = stageOrder.indexOf(stage);
    return stageIndex !== -1 && Math.abs(stageIndex - requestedIndex) === 2;
  });
  
  if (hasNearby) return 50;

  return 0;
}

function calculateIndustryMatch(
  investorIndustries: string[],
  requestedIndustry: string
): number {
  if (investorIndustries.length === 0) return 50;

  const normalize = (str: string) => str.toLowerCase().trim();
  const requestedNormalized = normalize(requestedIndustry);

  if (investorIndustries.some(ind => normalize(ind) === requestedNormalized)) {
    return 100;
  }

  const industryGroups: { [key: string]: string[] } = {
    'saas': ['saas', 'b2b', 'enterprise software', 'software'],
    'ai/ml': ['ai/ml', 'artificial intelligence', 'machine learning', 'ai', 'ml'],
    'fintech': ['fintech', 'financial services', 'payments', 'banking'],
    'e-commerce': ['e-commerce', 'ecommerce', 'retail', 'marketplace', 'd2c'],
    'healthcare': ['healthcare', 'health tech', 'medtech', 'telemedicine'],
    'technology': ['technology', 'tech', 'software', 'saas']
  };

  for (const [group, industries] of Object.entries(industryGroups)) {
    const requestedInGroup = industries.some(ind => normalize(ind) === requestedNormalized);
    const investorInGroup = investorIndustries.some(ind => 
      industries.some(groupInd => normalize(groupInd) === normalize(ind))
    );
    
    if (requestedInGroup && investorInGroup) {
      return 80;
    }
  }

  if (investorIndustries.length >= 5) {
    return 60;
  }

  return 0;
}

function calculateGeographicMatch(
  geographicFocus: string[],
  locations: string[],
  remoteFriendly: boolean,
  requestedLocations?: string[]
): number {
  if (!requestedLocations || requestedLocations.length === 0) {
    return remoteFriendly ? 75 : 50;
  }

  const normalizeLocation = (loc: string) => loc.toLowerCase().trim();
  const requestedNormalized = requestedLocations.map(normalizeLocation);
  const focusNormalized = geographicFocus.map(normalizeLocation);
  const locationsNormalized = locations.map(normalizeLocation);

  const hasExactMatch = requestedNormalized.some(reqLoc =>
    focusNormalized.includes(reqLoc) || locationsNormalized.includes(reqLoc)
  );

  if (hasExactMatch) return 100;

  const regionMap: { [key: string]: string[] } = {
    'us': ['san francisco', 'new york', 'boston', 'los angeles', 'chicago', 'seattle', 'austin', 'miami'],
    'europe': ['london', 'berlin', 'paris', 'amsterdam', 'barcelona'],
    'global': ['remote', 'anywhere']
  };

  for (const [region, cities] of Object.entries(regionMap)) {
    const requestedInRegion = requestedNormalized.some(reqLoc =>
      cities.some(city => normalizeLocation(city) === reqLoc) || normalizeLocation(region) === reqLoc
    );
    const investorInRegion = focusNormalized.some(focLoc =>
      cities.some(city => normalizeLocation(city) === focLoc) || 
      normalizeLocation(region) === focLoc ||
      normalizeLocation('global') === focLoc
    );

    if (requestedInRegion && investorInRegion) {
      return 80;
    }
  }

  if (remoteFriendly) return 60;

  return 0;
}

function calculateCheckSizeMatch(
  minCheck?: number,
  maxCheck?: number,
  requestedAmount?: number
): number {
  if (!requestedAmount || !minCheck) return 50;

  if (maxCheck && requestedAmount >= minCheck && requestedAmount <= maxCheck) {
    return 100;
  }

  if (requestedAmount >= minCheck * 0.75 && requestedAmount <= (maxCheck || minCheck * 1.25)) {
    return 75;
  }

  if (requestedAmount >= minCheck * 0.5 && requestedAmount <= (maxCheck || minCheck) * 2) {
    return 50;
  }

  if (requestedAmount >= minCheck * 0.33 && requestedAmount <= (maxCheck || minCheck) * 3) {
    return 25;
  }

  return 0;
}

function calculatePortfolioSimilarity(
  portfolio: any[],
  industry?: string
): number {
  if (portfolio.length === 0) return 50;

  let similarCount = 0;
  if (industry) {
    const normalize = (str: string) => str.toLowerCase().trim();
    const requestedNormalized = normalize(industry);
    
    similarCount = portfolio.filter(company => {
      if (!company.industry) return false;
      return normalize(company.industry) === requestedNormalized;
    }).length;
  }

  const similarityRatio = similarCount / portfolio.length;

  if (similarityRatio >= 0.5) return 100;
  if (similarityRatio >= 0.25) return 75;
  if (similarityRatio >= 0.1) return 50;
  if (similarityRatio > 0) return 25;

  return 0;
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

  if (reasons.length === 0) {
    reasons.push("Potential match based on investment profile");
  }

  return reasons.slice(0, 4);
}

function calculateInvestorMatch(
  investor: Investor,
  matchRequest: MatchRequest
): InvestorMatch {
  let totalScore = 0;

  const stageScore = calculateStageAlignment(
    investor.investment_stages,
    matchRequest.business_stage,
    matchRequest.verdict
  );
  totalScore += stageScore * WEIGHTS.stageAlignment;

  const industryScore = calculateIndustryMatch(
    investor.industries,
    matchRequest.industry
  );
  totalScore += industryScore * WEIGHTS.industryFocus;

  const geoScore = calculateGeographicMatch(
    investor.geographic_focus,
    investor.locations,
    investor.remote_friendly,
    matchRequest.locations
  );
  totalScore += geoScore * WEIGHTS.geographicPreference;

  const checkSizeScore = calculateCheckSizeMatch(
    investor.typical_check_size_min,
    investor.typical_check_size_max,
    matchRequest.funding_amount
  );
  totalScore += checkSizeScore * WEIGHTS.checkSizeCompatibility;

  const portfolioScore = calculatePortfolioSimilarity(
    investor.portfolio_companies,
    matchRequest.industry
  );
  totalScore += portfolioScore * WEIGHTS.portfolioSimilarity;

  if (investor.match_score_boost) {
    totalScore += investor.match_score_boost;
  }

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
      stage_alignment: Math.round(stageScore),
      industry_focus: Math.round(industryScore),
      geographic_preference: Math.round(geoScore),
      check_size_compatibility: Math.round(checkSizeScore),
      portfolio_similarity: Math.round(portfolioScore)
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const matchRequest: MatchRequest = await req.json();

    // Validate required fields
    if (!matchRequest.industry || !matchRequest.funding_amount) {
      return new Response(
        JSON.stringify({ error: 'Industry and funding_amount are required' }),
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

    // Check and deduct credits
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

    // Fetch readiness assessment if assessment_id provided
    let readinessData = null;
    if (matchRequest.assessment_id) {
      const { data: assessment } = await supabase
        .from('fundraising_readiness_assessments')
        .select('*')
        .eq('id', matchRequest.assessment_id)
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

        // Merge into match request
        matchRequest.readiness_scores = readinessData.scores;
        matchRequest.verdict = readinessData.verdict;
        matchRequest.strengths = readinessData.strengths;
        matchRequest.critical_gaps = readinessData.critical_gaps;
      }
    }

    // Fetch all active investors
    const { data: investors, error: investorsError } = await supabase
      .from('investors')
      .select('*')
      .eq('is_active', true);

    if (investorsError) {
      throw new Error(`Failed to fetch investors: ${investorsError.message}`);
    }

    if (!investors || investors.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No investors found in database',
          matches: [],
          top_matches: []
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate matches for all investors
    const matches: InvestorMatch[] = investors.map((investor: any) =>
      calculateInvestorMatch(investor, matchRequest)
    );

    // Sort by match score (descending)
    matches.sort((a, b) => b.match_score - a.match_score);

    // Take top 15
    const topMatches = matches.slice(0, 15);

    // Get top 3 IDs
    const topMatchIds = topMatches.slice(0, 3).map(m => m.investor.id);

    // Prepare match data for saving
    const matchedInvestorsData = topMatches.map(match => ({
      investor_id: match.investor.id,
      match_score: match.match_score,
      match_reasons: match.match_reasons,
      match_breakdown: match.match_breakdown
    }));

    // Save matches to database (optional, non-blocking)
    try {
      await supabase
        .from('investor_matches')
        .insert({
          user_id: user.id,
          assessment_id: matchRequest.assessment_id || null,
          industry: matchRequest.industry,
          funding_amount: matchRequest.funding_amount,
          locations: matchRequest.locations || [],
          business_model: matchRequest.business_model || null,
          business_stage: matchRequest.business_stage || null,
          business_summary: matchRequest.business_summary || null,
          matched_investors: matchedInvestorsData,
          top_matches: topMatchIds,
          status: 'active'
        });
    } catch (dbError) {
      // Non-critical - log but don't fail
      console.error('Failed to save matches:', dbError);
    }

    // Return results
    return new Response(
      JSON.stringify({
        matches: topMatches,
        top_matches: topMatchIds,
        match_request: matchRequest,
        generated_at: new Date().toISOString(),
        credits_used: creditCost,
        new_balance: creditCheck.newBalance
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in investor-matching:', error);
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
