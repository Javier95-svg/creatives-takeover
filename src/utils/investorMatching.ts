// ================================================
// INVESTOR MATCHING ALGORITHM
// Client-side matching logic for MVP
// ================================================

import { Investor, InvestorMatch, MatchRequest, InvestmentStage, ReadinessScores } from '@/types/investor';

// Matching weights
const WEIGHTS = {
  stageAlignment: 0.40,
  industryFocus: 0.25,
  geographicPreference: 0.15,
  checkSizeCompatibility: 0.10,
  portfolioSimilarity: 0.10
};

/**
 * Calculate stage alignment score (0-100)
 * Enhanced with readiness-based filtering
 */
function calculateStageAlignment(
  investorStages: InvestmentStage[],
  requestedStage: InvestmentStage | undefined,
  readinessScores?: ReadinessScores
): number {
  if (!requestedStage) {
    // If no stage specified, infer from readiness verdict
    if (readinessScores?.verdict === 'Not Ready') {
      // Prefer pre-seed investors
      if (investorStages.includes('pre-seed')) return 80;
      if (investorStages.includes('seed')) return 60;
      return 30;
    } else if (readinessScores?.verdict === 'Almost Ready') {
      // Prefer seed/Series A investors
      if (investorStages.includes('seed')) return 80;
      if (investorStages.includes('series-a')) return 75;
      if (investorStages.includes('pre-seed')) return 60;
      return 40;
    } else if (readinessScores?.verdict === 'Ready') {
      // Prefer active investors (seed, Series A)
      if (investorStages.includes('seed')) return 90;
      if (investorStages.includes('series-a')) return 85;
      if (investorStages.includes('pre-seed')) return 50;
      return 40;
    }
    return 50; // Neutral if not specified
  }

  // Exact match = 100
  if (investorStages.includes(requestedStage)) return 100;

  // Adjacent stages = 75
  const stageOrder: InvestmentStage[] = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c+'];
  const requestedIndex = stageOrder.indexOf(requestedStage);
  
  if (requestedIndex === -1) return 0;

  const hasAdjacent = investorStages.some(stage => {
    const stageIndex = stageOrder.indexOf(stage);
    return stageIndex !== -1 && Math.abs(stageIndex - requestedIndex) === 1;
  });
  
  if (hasAdjacent) {
    // Boost for readiness-based alignment
    if (readinessScores?.verdict === 'Not Ready' && requestedStage === 'pre-seed') {
      return 85; // Higher score for early-stage investors when not ready
    }
    return 75;
  }

  // Adjust based on readiness verdict
  if (readinessScores?.verdict === 'Not Ready') {
    // Prefer investors who accept earlier stages
    if (investorStages.includes('pre-seed')) return 60;
    if (investorStages.includes('seed')) return 40;
  } else if (readinessScores?.verdict === 'Ready') {
    // Prefer investors at requested stage or later
    if (requestedIndex < stageOrder.length - 1) {
      const hasLaterStage = investorStages.some(stage => {
        const stageIndex = stageOrder.indexOf(stage);
        return stageIndex > requestedIndex;
      });
      if (hasLaterStage) return 55; // Some credit for later-stage investors
    }
  }

  // 2 stages away = 50
  const hasNearby = investorStages.some(stage => {
    const stageIndex = stageOrder.indexOf(stage);
    return stageIndex !== -1 && Math.abs(stageIndex - requestedIndex) === 2;
  });
  
  if (hasNearby) return 50;

  return 0; // No match
}

/**
 * Calculate industry match score (0-100)
 * Enhanced with better industry taxonomy
 */
function calculateIndustryMatch(
  investorIndustries: string[],
  requestedIndustry: string
): number {
  if (investorIndustries.length === 0) return 50; // Neutral if no industry specified

  // Normalize industry names for comparison
  const normalize = (str: string) => str.toLowerCase().trim();
  const requestedNormalized = normalize(requestedIndustry);

  // Exact match = 100
  if (investorIndustries.some(ind => normalize(ind) === requestedNormalized)) {
    return 100;
  }

  // Enhanced industry taxonomy with related industries
  const industryGroups: { [key: string]: string[] } = {
    'saas': ['saas', 'b2b', 'enterprise software', 'software', 'technology', 'b2b saas'],
    'ai/ml': ['ai/ml', 'artificial intelligence', 'machine learning', 'ai', 'ml', 'deep learning', 'neural networks'],
    'fintech': ['fintech', 'financial services', 'payments', 'banking', 'cryptocurrency', 'blockchain', 'insurtech'],
    'e-commerce': ['e-commerce', 'ecommerce', 'retail', 'marketplace', 'd2c', 'consumer', 'online retail'],
    'healthcare': ['healthcare', 'health tech', 'medtech', 'telemedicine', 'biotech', 'pharma', 'digital health'],
    'technology': ['technology', 'tech', 'software', 'saas', 'enterprise', 'b2b'],
    'b2b': ['b2b', 'saas', 'enterprise', 'enterprise software', 'b2b saas'],
    'marketplace': ['marketplace', 'e-commerce', 'platform', 'two-sided market'],
    'd2c': ['d2c', 'direct-to-consumer', 'e-commerce', 'consumer', 'retail']
  };

  // Check if requested industry is in same group as investor industries
  for (const [group, industries] of Object.entries(industryGroups)) {
    const requestedInGroup = industries.some(ind => normalize(ind) === requestedNormalized);
    const investorInGroup = investorIndustries.some(ind => 
      industries.some(groupInd => normalize(groupInd) === normalize(ind))
    );
    
    if (requestedInGroup && investorInGroup) {
      return 80; // Related industry match
    }
  }

  // Partial word match (e.g., "SaaS" matches "B2B SaaS")
  const requestedWords = requestedNormalized.split(/[\s\/-]+/);
  const hasPartialMatch = investorIndustries.some(ind => {
    const indWords = normalize(ind).split(/[\s\/-]+/);
    return requestedWords.some(word => indWords.includes(word)) || 
           indWords.some(word => requestedWords.includes(word));
  });
  
  if (hasPartialMatch) {
    return 70; // Partial match
  }

  // Generalist investor (invests in many industries) = 60
  if (investorIndustries.length >= 5) {
    return 60;
  }

  return 0; // No match
}

/**
 * Calculate geographic match score (0-100)
 * Enhanced with better regional matching
 */
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
  const normalizeLocation = (loc: string) => loc.toLowerCase().trim();
  const requestedNormalized = requestedLocations.map(normalizeLocation);
  const focusNormalized = geographicFocus.map(normalizeLocation);
  const locationsNormalized = locations.map(normalizeLocation);

  // Exact location match = 100
  const hasExactMatch = requestedNormalized.some(reqLoc =>
    focusNormalized.includes(reqLoc) || locationsNormalized.includes(reqLoc)
  );

  if (hasExactMatch) return 100;

  // Enhanced regional mapping with more cities and regions
  const regionMap: { [key: string]: string[] } = {
    'us': ['san francisco', 'sf', 'silicon valley', 'new york', 'nyc', 'ny', 'boston', 'los angeles', 'la', 'chicago', 'seattle', 'austin', 'miami', 'denver', 'atlanta', 'dallas', 'philadelphia', 'washington', 'dc'],
    'california': ['san francisco', 'sf', 'los angeles', 'la', 'san diego', 'palo alto', 'mountain view', 'san jose', 'oakland', 'berkeley'],
    'new york': ['new york', 'nyc', 'ny', 'brooklyn', 'manhattan'],
    'europe': ['london', 'berlin', 'paris', 'amsterdam', 'barcelona', 'madrid', 'dublin', 'stockholm', 'copenhagen', 'zurich', 'munich'],
    'uk': ['london', 'manchester', 'birmingham', 'edinburgh'],
    'germany': ['berlin', 'munich', 'hamburg', 'frankfurt'],
    'france': ['paris', 'lyon', 'marseille'],
    'asia': ['singapore', 'hong kong', 'tokyo', 'seoul', 'bangalore', 'mumbai', 'shenzhen', 'shanghai'],
    'india': ['bangalore', 'mumbai', 'delhi', 'hyderabad', 'chennai'],
    'global': ['remote', 'anywhere', 'worldwide']
  };

  // Check regional matches
  for (const [region, cities] of Object.entries(regionMap)) {
    const requestedInRegion = requestedNormalized.some(reqLoc => {
      // Check if requested location is in this region
      const isCity = cities.some(city => normalizeLocation(city) === reqLoc);
      const isRegion = normalizeLocation(region) === reqLoc;
      // Check if requested location contains region name or vice versa
      const containsRegion = reqLoc.includes(region) || region.includes(reqLoc);
      return isCity || isRegion || containsRegion;
    });
    
    const investorInRegion = focusNormalized.some(focLoc => {
      const isCity = cities.some(city => normalizeLocation(city) === focLoc);
      const isRegion = normalizeLocation(region) === focLoc;
      const isGlobal = normalizeLocation('global') === focLoc;
      const containsRegion = focLoc.includes(region) || region.includes(focLoc);
      return isCity || isRegion || isGlobal || containsRegion;
    }) || locationsNormalized.some(loc => {
      return cities.some(city => normalizeLocation(city) === normalizeLocation(loc));
    });

    if (requestedInRegion && investorInRegion) {
      return 80; // Regional match
    }
  }

  // Partial city name match (e.g., "SF" matches "San Francisco")
  const hasPartialMatch = requestedNormalized.some(reqLoc => {
    return locationsNormalized.some(invLoc => 
      invLoc.includes(reqLoc) || reqLoc.includes(invLoc)
    ) || focusNormalized.some(focLoc =>
      focLoc.includes(reqLoc) || reqLoc.includes(focLoc)
    );
  });

  if (hasPartialMatch) {
    return 70; // Partial match
  }

  // Remote-friendly investors get partial score
  if (remoteFriendly) return 60;

  return 0; // No match
}

/**
 * Calculate check size compatibility score (0-100)
 */
function calculateCheckSizeMatch(
  minCheck?: number,
  maxCheck?: number,
  requestedAmount?: number
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

  // Within 3x range = 25
  if (requestedAmount >= minCheck * 0.33 && requestedAmount <= (maxCheck || minCheck) * 3) {
    return 25;
  }

  return 0; // No match
}

/**
 * Calculate portfolio similarity score (0-100)
 * Enhanced with text matching for business summary
 */
function calculatePortfolioSimilarity(
  portfolio: Array<{ industry?: string; name?: string; description?: string }>,
  industry?: string,
  businessSummary?: string
): number {
  if (portfolio.length === 0) return 50; // Neutral if no portfolio data

  const normalize = (str: string) => str.toLowerCase().trim();
  
  // Count similar companies by industry
  let similarCount = 0;
  if (industry) {
    const requestedNormalized = normalize(industry);
    
    similarCount = portfolio.filter(company => {
      if (!company.industry) return false;
      const companyIndustry = normalize(company.industry);
      
      // Exact match
      if (companyIndustry === requestedNormalized) return true;
      
      // Partial match (e.g., "SaaS" in "B2B SaaS")
      if (companyIndustry.includes(requestedNormalized) || 
          requestedNormalized.includes(companyIndustry)) {
        return true;
      }
      
      return false;
    }).length;
  }

  // Text-based similarity if business summary provided
  let textSimilarityBoost = 0;
  if (businessSummary && businessSummary.length > 20) {
    const summaryWords = normalize(businessSummary)
      .split(/\s+/)
      .filter(word => word.length > 3); // Filter out short words
    
    const matchingCompanies = portfolio.filter(company => {
      if (!company.description) return false;
      const descWords = normalize(company.description).split(/\s+/);
      // Check if any significant words from summary appear in portfolio company description
      return summaryWords.some(word => 
        descWords.some(descWord => descWord.includes(word) || word.includes(descWord))
      );
    }).length;
    
    // Boost score if portfolio companies have similar descriptions
    if (matchingCompanies > 0) {
      textSimilarityBoost = Math.min(20, (matchingCompanies / portfolio.length) * 20);
    }
  }

  // Percentage of portfolio that's similar
  const similarityRatio = similarCount / portfolio.length;
  let baseScore = 0;

  // Base score from industry similarity
  if (similarityRatio >= 0.5) baseScore = 100;
  else if (similarityRatio >= 0.25) baseScore = 75;
  else if (similarityRatio >= 0.1) baseScore = 50;
  else if (similarityRatio > 0) baseScore = 25;

  // Add text similarity boost
  return Math.min(100, baseScore + textSimilarityBoost);
}

/**
 * Generate match reasons based on scores
 * Enhanced with more specific and helpful reasons
 */
function generateMatchReasons(scores: {
  stageScore: number;
  industryScore: number;
  geoScore: number;
  checkSizeScore: number;
  portfolioScore: number;
}): string[] {
  const reasons: string[] = [];

  // Stage alignment reasons
  if (scores.stageScore >= 90) {
    reasons.push("Perfect stage alignment - invests exactly at your funding stage");
  } else if (scores.stageScore >= 75) {
    reasons.push("Strong stage alignment with your funding needs");
  } else if (scores.stageScore >= 60) {
    reasons.push("Good stage fit - invests in adjacent funding stages");
  }

  // Industry focus reasons
  if (scores.industryScore >= 90) {
    reasons.push("Exact industry match - specializes in your sector");
  } else if (scores.industryScore >= 80) {
    reasons.push("Active investor in your industry");
  } else if (scores.industryScore >= 70) {
    reasons.push("Invests in related industries to yours");
  } else if (scores.industryScore >= 60) {
    reasons.push("Generalist investor with broad industry focus");
  }

  // Geographic reasons
  if (scores.geoScore >= 90) {
    reasons.push("Perfect location match - invests in your exact location");
  } else if (scores.geoScore >= 80) {
    reasons.push("Geographic focus matches your location");
  } else if (scores.geoScore >= 70) {
    reasons.push("Regional match - invests in your region");
  } else if (scores.geoScore >= 60) {
    reasons.push("Remote-friendly investor - location flexible");
  }

  // Check size reasons
  if (scores.checkSizeScore >= 90) {
    reasons.push("Check size perfectly matches your funding ask");
  } else if (scores.checkSizeScore >= 75) {
    reasons.push("Typical check size aligns with your ask");
  } else if (scores.checkSizeScore >= 50) {
    reasons.push("Check size within reasonable range of your ask");
  }

  // Portfolio reasons
  if (scores.portfolioScore >= 80) {
    reasons.push("Strong portfolio similarity - many companies like yours");
  } else if (scores.portfolioScore >= 60) {
    reasons.push("Portfolio includes similar companies");
  } else if (scores.portfolioScore >= 40) {
    reasons.push("Some portfolio companies in related industries");
  }

  // Always return at least one reason
  if (reasons.length === 0) {
    reasons.push("Potential match based on investment profile");
  }

  // Prioritize reasons by score (highest first)
  const reasonPriority = [
    scores.stageScore >= 75,
    scores.industryScore >= 80,
    scores.geoScore >= 80,
    scores.checkSizeScore >= 75,
    scores.portfolioScore >= 60
  ];

  // Sort reasons by priority and return top 4
  return reasons
    .map((reason, index) => ({ reason, priority: reasonPriority[index] || false, score: [
      scores.stageScore, scores.industryScore, scores.geoScore, 
      scores.checkSizeScore, scores.portfolioScore
    ][index] || 0 }))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      return b.score - a.score;
    })
    .slice(0, 4)
    .map(item => item.reason);
}

/**
 * Calculate match score for a single investor
 */
export function calculateInvestorMatch(
  investor: Investor,
  matchRequest: MatchRequest,
  readinessScores?: ReadinessScores
): InvestorMatch {
  let totalScore = 0;

  // 1. Stage Alignment (40%)
  const stageScore = calculateStageAlignment(
    investor.investment_stages,
    matchRequest.business_stage,
    readinessScores
  );
  totalScore += stageScore * WEIGHTS.stageAlignment;

  // 2. Industry Focus (25%)
  const industryScore = calculateIndustryMatch(
    investor.industries,
    matchRequest.industry
  );
  totalScore += industryScore * WEIGHTS.industryFocus;

  // 3. Geographic Preference (15%)
  const geoScore = calculateGeographicMatch(
    investor.geographic_focus,
    investor.locations,
    investor.remote_friendly,
    matchRequest.locations
  );
  totalScore += geoScore * WEIGHTS.geographicPreference;

  // 4. Check Size Compatibility (10%)
  const checkSizeScore = calculateCheckSizeMatch(
    investor.typical_check_size_min,
    investor.typical_check_size_max,
    matchRequest.funding_amount
  );
  totalScore += checkSizeScore * WEIGHTS.checkSizeCompatibility;

  // 5. Portfolio Similarity (10%)
  const portfolioScore = calculatePortfolioSimilarity(
    investor.portfolio_companies,
    matchRequest.industry,
    matchRequest.business_summary
  );
  totalScore += portfolioScore * WEIGHTS.portfolioSimilarity;

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
      stage_alignment: Math.round(stageScore),
      industry_focus: Math.round(industryScore),
      geographic_preference: Math.round(geoScore),
      check_size_compatibility: Math.round(checkSizeScore),
      portfolio_similarity: Math.round(portfolioScore)
    }
  };
}

/**
 * Find matches for a match request
 */
export function findMatches(
  investors: Investor[],
  matchRequest: MatchRequest,
  readinessScores?: ReadinessScores,
  maxResults: number = 15
): InvestorMatch[] {
  // Filter to only active investors
  const activeInvestors = investors.filter(inv => inv.is_active);

  // Calculate matches for all investors
  const matches = activeInvestors.map(investor =>
    calculateInvestorMatch(investor, matchRequest, readinessScores)
  );

  // Sort by match score (descending)
  matches.sort((a, b) => b.match_score - a.match_score);

  // Return top matches
  return matches.slice(0, maxResults);
}

/**
 * Get top 3 matches
 */
export function getTopMatches(matches: InvestorMatch[]): string[] {
  return matches.slice(0, 3).map(match => match.investor.id);
}

