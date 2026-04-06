import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { resolveCreditIdempotencyKey } from '../_shared/request-idempotency.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

interface PitchDeckAnalysisRequest {
  userId: string;
  fileName: string;
  fileSize: number;
  storagePath: string;
  content: string;
}

interface SubScores {
  storyClarity: number;
  marketOpportunity: number;
  tractionProof: number;
  businessModel: number;
  teamCredibility: number;
  fundraisingReadiness: number;
}

interface AnalysisResult {
  overallScore: number;
  verdict: 'Strong' | 'Promising' | 'Needs Work' | 'Weak';
  subScores: SubScores;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  keyInsights: Record<string, any>;
}

// Dimension weights (must sum to 1.0)
const DIMENSION_WEIGHTS = {
  storyClarity: 0.15,
  marketOpportunity: 0.20,
  tractionProof: 0.30,
  businessModel: 0.15,
  teamCredibility: 0.10,
  fundraisingReadiness: 0.10
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, fileName, fileSize, storagePath, content }: PitchDeckAnalysisRequest = await req.json();

    if (!userId || !content) {
      return new Response(
        JSON.stringify({ error: 'userId and content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authUser = await getUserFromAuth(req);
    if (authUser && authUser.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'User mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const effectiveUserId = authUser?.id || userId;
    console.log(`Analyzing pitch deck for user ${effectiveUserId}: ${fileName}`);

    const idempotencyKey = await resolveCreditIdempotencyKey(req, {
      userId: effectiveUserId,
      feature: 'Pitch Deck Analyzer',
      requestFingerprint: {
        fileName,
        fileSize,
        storagePath,
        contentLength: content.length,
      },
    });

    const creditCost = CREDIT_COSTS.PITCH_DECK_ANALYZER;
    const creditCheck = await checkAndDeductCredits(
      effectiveUserId,
      creditCost,
      'Pitch Deck Analyzer',
      undefined,
      { fileName, fileSize, storagePath, idempotencyKey, entitlementFeature: 'PITCH_DECK_ANALYZER' }
    );
    const chargedCredits = (creditCheck.usedFromQuota ?? 0) + (creditCheck.usedFromBalance ?? 0);

    if (!creditCheck.success) {
      return new Response(
        JSON.stringify({
          error: creditCheck.error || 'Insufficient credits',
          required: creditCost,
          creditError: true,
          errorCode: creditCheck.errorCode,
          requiredTier: creditCheck.requiredTier,
        }),
        {
          status: creditCheck.errorCode === 'INSUFFICIENT_CREDITS' ? 402 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Analyze the pitch deck content using AI
    try {
      const analysis = await analyzePitchDeck(content, fileName);

      console.log(`Analysis complete. Overall score: ${analysis.overallScore}`);

      return new Response(
        JSON.stringify(analysis),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      console.error('AI processing failed, refunding credits:', err);
      if (chargedCredits > 0) {
        await refundCredits(effectiveUserId, chargedCredits, 'Pitch Deck Analyzer', 'Refund: AI processing failed', { error: err instanceof Error ? err.message : String(err) });
      }
      throw err;
    }

  } catch (error) {
    console.error('Pitch deck analysis error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to analyze pitch deck' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzePitchDeck(content: string, fileName: string): Promise<AnalysisResult> {
  const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

  if (!openrouterApiKey) {
    console.warn('OPENROUTER_API_KEY not found, using rule-based analysis');
    return performRuleBasedAnalysis(content);
  }

  try {
    const systemPrompt = `You are an expert pitch deck analyst and venture capital advisor. Analyze the provided pitch deck content and score it across 6 dimensions.

For each dimension, provide a score from 0-100:
1. Story & Clarity (15% weight): Is the problem clear? Is the narrative compelling?
2. Market Opportunity (20% weight): Is the market size significant? Is there real demand?
3. Traction & Proof (30% weight): Any customers, revenue, growth metrics? This is the most important.
4. Business Model (15% weight): Is the monetization strategy clear and viable?
5. Team Credibility (10% weight): Does the team have relevant experience?
6. Fundraising Readiness (10% weight): Is the ask clear? Are terms reasonable?

Respond in JSON format:
{
  "subScores": {
    "storyClarity": <0-100>,
    "marketOpportunity": <0-100>,
    "tractionProof": <0-100>,
    "businessModel": <0-100>,
    "teamCredibility": <0-100>,
    "fundraisingReadiness": <0-100>
  },
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "keyInsights": {
    "targetMarket": "brief description",
    "uniqueValueProp": "brief description",
    "fundingStage": "pre-seed/seed/series-a",
    "askAmount": "if mentioned"
  }
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://creatives-takeover.com',
        'X-Title': 'Pitch Deck Analyzer'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this pitch deck:\n\nFile: ${fileName}\n\nContent:\n${content.substring(0, 15000)}` }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      return performRuleBasedAnalysis(content);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.warn('No AI response, falling back to rule-based analysis');
      return performRuleBasedAnalysis(content);
    }

    // Parse AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('Could not parse AI response as JSON, falling back');
      return performRuleBasedAnalysis(content);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Calculate overall score using weights
    const overallScore = calculateOverallScore(parsed.subScores);
    const verdict = getVerdict(overallScore);

    return {
      overallScore,
      verdict,
      subScores: parsed.subScores,
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      recommendations: parsed.recommendations || [],
      keyInsights: parsed.keyInsights || {}
    };

  } catch (error) {
    console.error('AI analysis failed:', error);
    return performRuleBasedAnalysis(content);
  }
}

function performRuleBasedAnalysis(content: string): AnalysisResult {
  const lowerContent = content.toLowerCase();
  const wordCount = content.split(/\s+/).length;

  // Score each dimension based on keyword presence and content quality
  const subScores: SubScores = {
    storyClarity: scoreStoryClarity(lowerContent, wordCount),
    marketOpportunity: scoreMarketOpportunity(lowerContent),
    tractionProof: scoreTractionProof(lowerContent),
    businessModel: scoreBusinessModel(lowerContent),
    teamCredibility: scoreTeamCredibility(lowerContent),
    fundraisingReadiness: scoreFundraisingReadiness(lowerContent)
  };

  const overallScore = calculateOverallScore(subScores);
  const verdict = getVerdict(overallScore);

  return {
    overallScore,
    verdict,
    subScores,
    strengths: generateStrengths(subScores, lowerContent),
    weaknesses: generateWeaknesses(subScores, lowerContent),
    recommendations: generateRecommendations(subScores),
    keyInsights: extractKeyInsights(lowerContent)
  };
}

function scoreStoryClarity(content: string, wordCount: number): number {
  let score = 40; // Base score

  // Problem statement keywords
  if (content.includes('problem') || content.includes('challenge') || content.includes('pain point')) score += 15;
  if (content.includes('solution') || content.includes('solve')) score += 15;
  if (content.includes('vision') || content.includes('mission')) score += 10;
  if (content.includes('why now') || content.includes('timing')) score += 10;

  // Penalize if too short
  if (wordCount < 200) score -= 20;

  return Math.min(100, Math.max(0, score));
}

function scoreMarketOpportunity(content: string): number {
  let score = 30;

  // Market size indicators
  if (content.includes('tam') || content.includes('total addressable market')) score += 20;
  if (content.includes('sam') || content.includes('serviceable')) score += 10;
  if (content.includes('som') || content.includes('obtainable')) score += 10;
  if (content.match(/\$[\d,]+\s*(billion|million|b|m)/i)) score += 15;
  if (content.includes('growth') || content.includes('cagr')) score += 10;
  if (content.includes('market research') || content.includes('industry')) score += 5;

  return Math.min(100, Math.max(0, score));
}

function scoreTractionProof(content: string): number {
  let score = 20;

  // Traction indicators
  if (content.includes('revenue') || content.includes('arr') || content.includes('mrr')) score += 25;
  if (content.includes('customers') || content.includes('users')) score += 15;
  if (content.match(/\d+%\s*(growth|increase)/i)) score += 15;
  if (content.includes('pilot') || content.includes('beta')) score += 10;
  if (content.includes('testimonial') || content.includes('case study')) score += 10;
  if (content.includes('waitlist') || content.includes('pre-order')) score += 5;

  return Math.min(100, Math.max(0, score));
}

function scoreBusinessModel(content: string): number {
  let score = 35;

  // Business model indicators
  if (content.includes('pricing') || content.includes('subscription')) score += 15;
  if (content.includes('revenue model') || content.includes('monetization')) score += 15;
  if (content.includes('unit economics') || content.includes('ltv') || content.includes('cac')) score += 15;
  if (content.includes('margin') || content.includes('profit')) score += 10;
  if (content.includes('freemium') || content.includes('saas') || content.includes('marketplace')) score += 10;

  return Math.min(100, Math.max(0, score));
}

function scoreTeamCredibility(content: string): number {
  let score = 30;

  // Team indicators
  if (content.includes('founder') || content.includes('ceo') || content.includes('cto')) score += 15;
  if (content.includes('experience') || content.includes('years')) score += 15;
  if (content.includes('advisor') || content.includes('mentor')) score += 10;
  if (content.includes('previously') || content.includes('former')) score += 10;
  if (content.includes('team') && content.includes('built')) score += 10;
  if (content.includes('linkedin') || content.includes('background')) score += 5;

  return Math.min(100, Math.max(0, score));
}

function scoreFundraisingReadiness(content: string): number {
  let score = 25;

  // Fundraising indicators
  if (content.includes('raising') || content.includes('seeking')) score += 15;
  if (content.match(/\$[\d,]+\s*(k|m|million|thousand)/i)) score += 15;
  if (content.includes('use of funds') || content.includes('allocation')) score += 15;
  if (content.includes('runway') || content.includes('months')) score += 10;
  if (content.includes('valuation') || content.includes('cap')) score += 10;
  if (content.includes('round') || content.includes('seed') || content.includes('series')) score += 10;

  return Math.min(100, Math.max(0, score));
}

function calculateOverallScore(subScores: SubScores): number {
  const weighted =
    subScores.storyClarity * DIMENSION_WEIGHTS.storyClarity +
    subScores.marketOpportunity * DIMENSION_WEIGHTS.marketOpportunity +
    subScores.tractionProof * DIMENSION_WEIGHTS.tractionProof +
    subScores.businessModel * DIMENSION_WEIGHTS.businessModel +
    subScores.teamCredibility * DIMENSION_WEIGHTS.teamCredibility +
    subScores.fundraisingReadiness * DIMENSION_WEIGHTS.fundraisingReadiness;

  return Math.round(weighted * 10) / 10;
}

function getVerdict(score: number): 'Strong' | 'Promising' | 'Needs Work' | 'Weak' {
  if (score >= 75) return 'Strong';
  if (score >= 55) return 'Promising';
  if (score >= 35) return 'Needs Work';
  return 'Weak';
}

function generateStrengths(scores: SubScores, content: string): string[] {
  const strengths: string[] = [];

  if (scores.storyClarity >= 70) strengths.push('Clear and compelling problem/solution narrative');
  if (scores.marketOpportunity >= 70) strengths.push('Well-defined market opportunity with significant TAM');
  if (scores.tractionProof >= 70) strengths.push('Strong traction metrics demonstrating product-market fit');
  if (scores.businessModel >= 70) strengths.push('Clear and viable monetization strategy');
  if (scores.teamCredibility >= 70) strengths.push('Experienced team with relevant background');
  if (scores.fundraisingReadiness >= 70) strengths.push('Well-prepared fundraising ask with clear use of funds');

  if (strengths.length === 0) {
    strengths.push('Pitch deck submitted for analysis');
  }

  return strengths.slice(0, 5);
}

function generateWeaknesses(scores: SubScores, content: string): string[] {
  const weaknesses: string[] = [];

  if (scores.storyClarity < 50) weaknesses.push('Problem statement needs more clarity and specificity');
  if (scores.marketOpportunity < 50) weaknesses.push('Market size and opportunity need better quantification');
  if (scores.tractionProof < 50) weaknesses.push('Limited traction or proof points - consider adding metrics');
  if (scores.businessModel < 50) weaknesses.push('Business model and unit economics need more detail');
  if (scores.teamCredibility < 50) weaknesses.push('Team background and expertise could be highlighted more');
  if (scores.fundraisingReadiness < 50) weaknesses.push('Fundraising ask and use of funds need clarification');

  return weaknesses.slice(0, 5);
}

function generateRecommendations(scores: SubScores): string[] {
  const recommendations: string[] = [];

  // Prioritize lowest scores
  const sortedDimensions = Object.entries(scores)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3);

  for (const [dimension, score] of sortedDimensions) {
    if (score < 70) {
      switch (dimension) {
        case 'storyClarity':
          recommendations.push('Add a clear "Why Now" slide explaining market timing');
          break;
        case 'marketOpportunity':
          recommendations.push('Include TAM/SAM/SOM analysis with credible sources');
          break;
        case 'tractionProof':
          recommendations.push('Add customer testimonials, growth charts, or pilot results');
          break;
        case 'businessModel':
          recommendations.push('Detail unit economics (LTV, CAC, margins) if available');
          break;
        case 'teamCredibility':
          recommendations.push('Highlight relevant founder experience and notable advisors');
          break;
        case 'fundraisingReadiness':
          recommendations.push('Specify raise amount, valuation expectations, and fund allocation');
          break;
      }
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Consider adding competitive differentiation details');
    recommendations.push('Include 18-month financial projections');
  }

  return recommendations;
}

function extractKeyInsights(content: string): Record<string, any> {
  const insights: Record<string, any> = {};

  // Try to extract funding stage
  if (content.includes('pre-seed')) insights.fundingStage = 'Pre-Seed';
  else if (content.includes('seed')) insights.fundingStage = 'Seed';
  else if (content.includes('series a')) insights.fundingStage = 'Series A';
  else if (content.includes('series b')) insights.fundingStage = 'Series B';

  // Try to extract ask amount
  const amountMatch = content.match(/raising\s*\$?([\d,.]+)\s*(m|million|k|thousand)?/i);
  if (amountMatch) {
    let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    const unit = amountMatch[2]?.toLowerCase();
    if (unit === 'm' || unit === 'million') amount *= 1000000;
    if (unit === 'k' || unit === 'thousand') amount *= 1000;
    insights.askAmount = `$${amount.toLocaleString()}`;
  }

  // Try to identify industry
  const industries = ['saas', 'fintech', 'healthtech', 'edtech', 'e-commerce', 'marketplace', 'ai', 'machine learning'];
  for (const industry of industries) {
    if (content.includes(industry)) {
      insights.industry = industry.toUpperCase();
      break;
    }
  }

  return insights;
}
