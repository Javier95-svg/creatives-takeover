import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
  documentMeta?: {
    page_count?: number;
    word_count?: number;
    file_type?: string;
    extracted_at?: string;
  } | null;
}

interface SubScores {
  storyClarity: number;
  marketOpportunity: number;
  tractionProof: number;
  businessModel: number;
  teamCredibility: number;
  fundraisingReadiness: number;
}

type AnalysisVerdict = 'Excellent' | 'Strong' | 'Good' | 'Needs Work';

interface KeyInsights {
  summary: string;
  targetMarket: string;
  uniqueValueProp: string;
  fundingStage: string;
  askAmount?: string;
  industry?: string;
  estimatedSlides: number;
  detectedSections: string[];
  missingSections: string[];
  deckReadiness: string;
  parsingNotes: string[];
}

interface AnalysisResult {
  overallScore: number;
  verdict: AnalysisVerdict;
  subScores: SubScores;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  keyInsights: KeyInsights;
}

const DIMENSION_WEIGHTS = {
  storyClarity: 0.15,
  marketOpportunity: 0.20,
  tractionProof: 0.30,
  businessModel: 0.15,
  teamCredibility: 0.10,
  fundraisingReadiness: 0.10,
} as const;

const SECTION_RULES = [
  { key: 'problem', label: 'Problem', keywords: ['problem', 'pain point', 'challenge', 'broken', 'friction'] },
  { key: 'solution', label: 'Solution', keywords: ['solution', 'product', 'platform', 'we built', 'we help'] },
  { key: 'market', label: 'Market', keywords: ['tam', 'sam', 'som', 'market size', 'addressable market', 'industry'] },
  { key: 'traction', label: 'Traction', keywords: ['traction', 'revenue', 'arr', 'mrr', 'customers', 'users', 'growth', 'retention'] },
  { key: 'business-model', label: 'Business Model', keywords: ['pricing', 'subscription', 'business model', 'monetization', 'ltv', 'cac', 'gross margin'] },
  { key: 'competition', label: 'Competition', keywords: ['competition', 'competitor', 'alternative', 'positioning', 'differentiation'] },
  { key: 'team', label: 'Team', keywords: ['team', 'founder', 'ceo', 'cto', 'advisor', 'background'] },
  { key: 'ask', label: 'Ask', keywords: ['raising', 'ask', 'use of funds', 'runway', 'round', 'seeking'] },
] as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, fileName, fileSize, storagePath, content, documentMeta }: PitchDeckAnalysisRequest =
      await req.json();

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
    const normalizedContent = content.trim();

    const idempotencyKey = await resolveCreditIdempotencyKey(req, {
      userId: effectiveUserId,
      feature: 'Pitch Deck Analyzer',
      requestFingerprint: {
        fileName,
        fileSize,
        storagePath,
        contentLength: normalizedContent.length,
      },
    });

    const creditCost = CREDIT_COSTS.PITCH_DECK_ANALYZER;
    const creditCheck = await checkAndDeductCredits(
      effectiveUserId,
      creditCost,
      'Pitch Deck Analyzer',
      undefined,
      { fileName, fileSize, storagePath, idempotencyKey }
    );

    if (!creditCheck.success) {
      return new Response(
        JSON.stringify({
          error: creditCheck.error || 'Insufficient credits',
          required: creditCost,
          creditError: true,
        }),
        {
          status: creditCheck.errorCode === 'INSUFFICIENT_CREDITS' ? 402 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      const analysis = await analyzePitchDeck({
        fileName,
        content: normalizedContent,
        documentMeta: documentMeta ?? null,
      });

      return new Response(
        JSON.stringify(analysis),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      await refundCredits(
        effectiveUserId,
        creditCost,
        'Pitch Deck Analyzer',
        'Refund: AI processing failed',
        { error: err instanceof Error ? err.message : String(err) }
      );
      throw err;
    }
  } catch (error) {
    console.error('Pitch deck analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to analyze pitch deck' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzePitchDeck(input: {
  fileName: string;
  content: string;
  documentMeta?: PitchDeckAnalysisRequest['documentMeta'];
}): Promise<AnalysisResult> {
  const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

  if (!openrouterApiKey) {
    console.warn('OPENROUTER_API_KEY not found, using rule-based analysis');
    return performRuleBasedAnalysis(input.content, input.documentMeta ?? null);
  }

  const coverage = detectSectionCoverage(input.content);
  const promptContext = buildPromptContext(input.content, input.documentMeta ?? null, coverage);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://creatives-takeover.com',
        'X-Title': 'Pitch Deck Analyzer',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 2200,
        messages: [
          {
            role: 'system',
            content:
              'You are a venture investor and pitch coach. Score startup pitch decks rigorously and fairly. Return ONLY valid JSON. Scores must be integers from 1 to 100. Recommendations must be specific, prioritized, and actionable for the next deck revision.',
          },
          {
            role: 'user',
            content: `Analyze this pitch deck and return JSON with this exact shape:
{
  "overallScore": 1,
  "verdict": "Excellent|Strong|Good|Needs Work",
  "subScores": {
    "storyClarity": 1,
    "marketOpportunity": 1,
    "tractionProof": 1,
    "businessModel": 1,
    "teamCredibility": 1,
    "fundraisingReadiness": 1
  },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "recommendations": ["..."],
  "keyInsights": {
    "summary": "...",
    "targetMarket": "...",
    "uniqueValueProp": "...",
    "fundingStage": "...",
    "askAmount": "...",
    "industry": "...",
    "estimatedSlides": 1,
    "detectedSections": ["..."],
    "missingSections": ["..."],
    "deckReadiness": "...",
    "parsingNotes": ["..."]
  }
}

Scoring guidance:
- Story & Clarity: problem clarity, narrative flow, slide coherence.
- Market Opportunity: TAM/SAM/SOM, urgency, customer definition.
- Traction & Proof: usage, growth, revenue, pilots, retention, testimonials.
- Business Model: pricing, monetization, economics, repeatability.
- Team Credibility: founder-market fit, execution history, advisors.
- Fundraising Readiness: clear raise, use of funds, stage appropriateness, investor readiness.

Use the parsed metadata and detected section coverage as grounding, not as the final answer.

${promptContext}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      return performRuleBasedAnalysis(input.content, input.documentMeta ?? null);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    const parsed = parseAiJson(aiResponse);

    if (!parsed) {
      console.warn('Could not parse AI response as JSON, using rule-based fallback');
      return performRuleBasedAnalysis(input.content, input.documentMeta ?? null);
    }

    return normalizeAnalysisResult(parsed, input.content, input.documentMeta ?? null);
  } catch (error) {
    console.error('AI analysis failed:', error);
    return performRuleBasedAnalysis(input.content, input.documentMeta ?? null);
  }
}

function parseAiJson(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    const jsonMatch = value.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function normalizeAnalysisResult(
  raw: Record<string, unknown>,
  content: string,
  documentMeta: PitchDeckAnalysisRequest['documentMeta']
): AnalysisResult {
  const ruleBased = performRuleBasedAnalysis(content, documentMeta);
  const rawSubScores = (raw.subScores ?? {}) as Record<string, unknown>;
  const rawInsights = (raw.keyInsights ?? {}) as Record<string, unknown>;
  const coverage = detectSectionCoverage(content);

  const subScores: SubScores = {
    storyClarity: normalizeScore(rawSubScores.storyClarity, ruleBased.subScores.storyClarity),
    marketOpportunity: normalizeScore(rawSubScores.marketOpportunity, ruleBased.subScores.marketOpportunity),
    tractionProof: normalizeScore(rawSubScores.tractionProof, ruleBased.subScores.tractionProof),
    businessModel: normalizeScore(rawSubScores.businessModel, ruleBased.subScores.businessModel),
    teamCredibility: normalizeScore(rawSubScores.teamCredibility, ruleBased.subScores.teamCredibility),
    fundraisingReadiness: normalizeScore(rawSubScores.fundraisingReadiness, ruleBased.subScores.fundraisingReadiness),
  };

  const overallScore = normalizeScore(
    raw.overallScore,
    calculateOverallScore(subScores)
  );

  return {
    overallScore,
    verdict: normalizeVerdict(raw.verdict, overallScore),
    subScores,
    strengths: normalizeStringArray(raw.strengths, ruleBased.strengths),
    weaknesses: normalizeStringArray(raw.weaknesses, ruleBased.weaknesses),
    recommendations: normalizeStringArray(raw.recommendations, ruleBased.recommendations),
    keyInsights: {
      summary: normalizeString(
        rawInsights.summary,
        ruleBased.keyInsights.summary
      ),
      targetMarket: normalizeString(
        rawInsights.targetMarket,
        ruleBased.keyInsights.targetMarket
      ),
      uniqueValueProp: normalizeString(
        rawInsights.uniqueValueProp,
        ruleBased.keyInsights.uniqueValueProp
      ),
      fundingStage: normalizeString(
        rawInsights.fundingStage,
        ruleBased.keyInsights.fundingStage
      ),
      askAmount: normalizeOptionalString(rawInsights.askAmount, ruleBased.keyInsights.askAmount),
      industry: normalizeOptionalString(rawInsights.industry, ruleBased.keyInsights.industry),
      estimatedSlides: normalizeNumber(
        rawInsights.estimatedSlides,
        ruleBased.keyInsights.estimatedSlides
      ),
      detectedSections: normalizeStringArray(rawInsights.detectedSections, coverage.detectedSections),
      missingSections: normalizeStringArray(rawInsights.missingSections, coverage.missingSections),
      deckReadiness: normalizeString(
        rawInsights.deckReadiness,
        ruleBased.keyInsights.deckReadiness
      ),
      parsingNotes: normalizeStringArray(rawInsights.parsingNotes, ruleBased.keyInsights.parsingNotes),
    },
  };
}

function performRuleBasedAnalysis(
  content: string,
  documentMeta: PitchDeckAnalysisRequest['documentMeta']
): AnalysisResult {
  const lowerContent = content.toLowerCase();
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const coverage = detectSectionCoverage(content);

  const subScores: SubScores = {
    storyClarity: scoreStoryClarity(lowerContent, wordCount, coverage.detectedSections.length),
    marketOpportunity: scoreMarketOpportunity(lowerContent, coverage.detectedSectionKeys.has('market')),
    tractionProof: scoreTractionProof(lowerContent, coverage.detectedSectionKeys.has('traction')),
    businessModel: scoreBusinessModel(lowerContent, coverage.detectedSectionKeys.has('business-model')),
    teamCredibility: scoreTeamCredibility(lowerContent, coverage.detectedSectionKeys.has('team')),
    fundraisingReadiness: scoreFundraisingReadiness(lowerContent, coverage.detectedSectionKeys.has('ask')),
  };

  const overallScore = calculateOverallScore(subScores);
  const verdict = normalizeVerdict(undefined, overallScore);

  return {
    overallScore,
    verdict,
    subScores,
    strengths: generateStrengths(subScores, coverage),
    weaknesses: generateWeaknesses(subScores, coverage),
    recommendations: generateRecommendations(subScores, coverage),
    keyInsights: buildKeyInsights(content, lowerContent, documentMeta, coverage, overallScore),
  };
}

function detectSectionCoverage(content: string) {
  const lower = content.toLowerCase();
  const detected = SECTION_RULES.filter((rule) =>
    rule.keywords.some((keyword) => lower.includes(keyword))
  );

  return {
    detectedSections: detected.map((rule) => rule.label),
    missingSections: SECTION_RULES.filter((rule) => !detected.some((item) => item.key === rule.key)).map(
      (rule) => rule.label
    ),
    detectedSectionKeys: new Set(detected.map((rule) => rule.key)),
  };
}

function scoreStoryClarity(content: string, wordCount: number, detectedSectionCount: number): number {
  let score = 42;
  if (content.includes('problem') || content.includes('pain point')) score += 10;
  if (content.includes('solution') || content.includes('we help')) score += 12;
  if (content.includes('why now') || content.includes('timing')) score += 8;
  if (content.includes('vision') || content.includes('mission')) score += 6;
  if (detectedSectionCount >= 5) score += 8;
  if (wordCount < 180) score -= 18;
  if (wordCount > 3000) score -= 6;
  return clampScore(score);
}

function scoreMarketOpportunity(content: string, hasMarketSection: boolean): number {
  let score = 34;
  if (hasMarketSection) score += 10;
  if (content.includes('tam') || content.includes('total addressable market')) score += 16;
  if (content.includes('sam') || content.includes('som')) score += 10;
  if (/\$[\d,.]+\s*(b|m|million|billion)/i.test(content)) score += 14;
  if (content.includes('cagr') || content.includes('growth')) score += 8;
  if (content.includes('customer segment') || content.includes('target customer')) score += 8;
  return clampScore(score);
}

function scoreTractionProof(content: string, hasTractionSection: boolean): number {
  let score = 24;
  if (hasTractionSection) score += 10;
  if (content.includes('revenue') || content.includes('arr') || content.includes('mrr')) score += 18;
  if (content.includes('customers') || content.includes('users')) score += 12;
  if (/\d+%\s*(growth|increase|retention)/i.test(content)) score += 16;
  if (content.includes('pilot') || content.includes('beta')) score += 8;
  if (content.includes('testimonial') || content.includes('case study') || content.includes('logo')) score += 8;
  return clampScore(score);
}

function scoreBusinessModel(content: string, hasBusinessModelSection: boolean): number {
  let score = 36;
  if (hasBusinessModelSection) score += 10;
  if (content.includes('pricing') || content.includes('subscription')) score += 14;
  if (content.includes('business model') || content.includes('monetization')) score += 12;
  if (content.includes('ltv') || content.includes('cac') || content.includes('gross margin')) score += 12;
  if (content.includes('marketplace') || content.includes('saas') || content.includes('enterprise')) score += 8;
  return clampScore(score);
}

function scoreTeamCredibility(content: string, hasTeamSection: boolean): number {
  let score = 32;
  if (hasTeamSection) score += 12;
  if (content.includes('founder') || content.includes('ceo') || content.includes('cto')) score += 12;
  if (content.includes('previously') || content.includes('former') || content.includes('experience')) score += 12;
  if (content.includes('advisor') || content.includes('operator')) score += 8;
  return clampScore(score);
}

function scoreFundraisingReadiness(content: string, hasAskSection: boolean): number {
  let score = 28;
  if (hasAskSection) score += 12;
  if (content.includes('raising') || content.includes('seeking')) score += 14;
  if (/\$[\d,.]+\s*(k|m|million|thousand)/i.test(content)) score += 12;
  if (content.includes('use of funds') || content.includes('allocation')) score += 12;
  if (content.includes('runway') || content.includes('milestone')) score += 8;
  return clampScore(score);
}

function calculateOverallScore(subScores: SubScores): number {
  const weighted =
    subScores.storyClarity * DIMENSION_WEIGHTS.storyClarity +
    subScores.marketOpportunity * DIMENSION_WEIGHTS.marketOpportunity +
    subScores.tractionProof * DIMENSION_WEIGHTS.tractionProof +
    subScores.businessModel * DIMENSION_WEIGHTS.businessModel +
    subScores.teamCredibility * DIMENSION_WEIGHTS.teamCredibility +
    subScores.fundraisingReadiness * DIMENSION_WEIGHTS.fundraisingReadiness;

  return clampScore(Math.round(weighted));
}

function normalizeVerdict(value: unknown, score: number): AnalysisVerdict {
  if (value === 'Excellent' || value === 'Strong' || value === 'Good' || value === 'Needs Work') {
    return value;
  }
  if (value === 'Promising') return 'Good';
  if (value === 'Weak') return 'Needs Work';
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Good';
  return 'Needs Work';
}

function generateStrengths(
  scores: SubScores,
  coverage: ReturnType<typeof detectSectionCoverage>
): string[] {
  const strengths: string[] = [];
  if (scores.storyClarity >= 72) strengths.push('The deck communicates the problem, solution, and narrative clearly.');
  if (scores.marketOpportunity >= 72) strengths.push('The market opportunity is defined with enough scale to feel investable.');
  if (scores.tractionProof >= 72) strengths.push('There is meaningful proof that customers or the market are responding.');
  if (scores.businessModel >= 72) strengths.push('The monetization path is understandable and commercially plausible.');
  if (scores.teamCredibility >= 72) strengths.push('The team section supports founder-market fit and execution credibility.');
  if (scores.fundraisingReadiness >= 72) strengths.push('The raise narrative feels appropriately packaged for investors.');
  if (coverage.detectedSections.length >= 6) strengths.push('The deck covers most of the core sections investors expect.');
  if (strengths.length === 0) strengths.push('The deck has enough core material to produce a baseline investor assessment.');
  return strengths.slice(0, 5);
}

function generateWeaknesses(
  scores: SubScores,
  coverage: ReturnType<typeof detectSectionCoverage>
): string[] {
  const weaknesses: string[] = [];
  if (scores.storyClarity < 55) weaknesses.push('The core story still needs a clearer problem, solution, and why-now arc.');
  if (scores.marketOpportunity < 55) weaknesses.push('Market size, segmentation, or urgency is under-supported.');
  if (scores.tractionProof < 55) weaknesses.push('Traction proof is too thin for investor conviction.');
  if (scores.businessModel < 55) weaknesses.push('The deck does not yet explain how the business compounds revenue.');
  if (scores.teamCredibility < 55) weaknesses.push('Founder credibility and relevant execution history are not landing strongly.');
  if (scores.fundraisingReadiness < 55) weaknesses.push('The actual raise, use of funds, or milestone plan is still vague.');
  if (coverage.missingSections.length > 0) {
    weaknesses.push(`Critical sections are missing or hard to detect: ${coverage.missingSections.slice(0, 3).join(', ')}.`);
  }
  return weaknesses.slice(0, 5);
}

function generateRecommendations(
  scores: SubScores,
  coverage: ReturnType<typeof detectSectionCoverage>
): string[] {
  const recommendations: string[] = [];
  const ranked = Object.entries(scores).sort(([, a], [, b]) => a - b);

  for (const [dimension, score] of ranked) {
    if (score >= 70) continue;
    switch (dimension) {
      case 'storyClarity':
        recommendations.push('Rewrite the first three slides so an investor understands the problem, solution, and why now in under 60 seconds.');
        break;
      case 'marketOpportunity':
        recommendations.push('Add a sourced TAM/SAM/SOM view plus a sharply defined ideal customer profile.');
        break;
      case 'tractionProof':
        recommendations.push('Introduce concrete proof: revenue, active users, pilots, retention, case studies, or customer quotes.');
        break;
      case 'businessModel':
        recommendations.push('Show pricing, revenue logic, and any usable unit economics on one clean slide.');
        break;
      case 'teamCredibility':
        recommendations.push('Upgrade the team slide with founder-market fit, previous wins, and advisor credibility.');
        break;
      case 'fundraisingReadiness':
        recommendations.push('State the raise amount, use of funds, milestone plan, and what this round unlocks.');
        break;
    }
  }

  if (coverage.missingSections.includes('Competition')) {
    recommendations.push('Add a competition slide that explains why this team wins instead of listing competitors passively.');
  }

  return recommendations.slice(0, 5);
}

function buildKeyInsights(
  content: string,
  lowerContent: string,
  documentMeta: PitchDeckAnalysisRequest['documentMeta'],
  coverage: ReturnType<typeof detectSectionCoverage>,
  overallScore: number
): KeyInsights {
  const summary = summarizeDeck(content);
  const estimatedSlides =
    documentMeta?.page_count && documentMeta.page_count > 0
      ? documentMeta.page_count
      : estimateSlideCount(content);

  return {
    summary,
    targetMarket: extractTargetMarket(content),
    uniqueValueProp: extractUniqueValueProp(content),
    fundingStage: extractFundingStage(lowerContent),
    askAmount: extractAskAmount(content),
    industry: extractIndustry(lowerContent),
    estimatedSlides,
    detectedSections: coverage.detectedSections,
    missingSections: coverage.missingSections,
    deckReadiness:
      overallScore >= 85
        ? 'Investor-ready with only minor polish needed.'
        : overallScore >= 70
        ? 'Promising deck with a few material gaps before fundraising.'
        : overallScore >= 55
        ? 'Solid foundation, but investors will still need stronger proof and clarity.'
        : 'Early draft quality. The deck needs a sharper story and stronger evidence before outreach.',
    parsingNotes: [
      documentMeta?.page_count ? `${documentMeta.page_count} pages detected` : 'Page count unavailable',
      documentMeta?.word_count ? `${documentMeta.word_count} words extracted` : 'Word count unavailable',
      coverage.missingSections.length > 0
        ? `Missing or weak sections: ${coverage.missingSections.join(', ')}`
        : 'All core sections detected',
    ],
  };
}

function summarizeDeck(content: string): string {
  const firstSentence = content
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .find((sentence) => sentence.length > 30);

  if (firstSentence) return firstSentence.slice(0, 220);

  const words = content.trim().split(/\s+/).slice(0, 28).join(' ');
  return words ? `${words}${words.endsWith('.') ? '' : '...'}` : 'Deck summary unavailable.';
}

function extractTargetMarket(content: string): string {
  const match = content.match(/(?:for|serving|targeting)\s+([^.:\n]{20,120})/i);
  return match?.[1]?.trim() || 'Target market not clearly stated.';
}

function extractUniqueValueProp(content: string): string {
  const match = content.match(/(?:we help|we enable|our platform|our product)\s+([^.:\n]{20,140})/i);
  return match?.[1]?.trim() || 'Unique value proposition not clearly extracted.';
}

function extractFundingStage(content: string): string {
  if (content.includes('series b')) return 'Series B';
  if (content.includes('series a')) return 'Series A';
  if (content.includes('seed')) return 'Seed';
  if (content.includes('pre-seed')) return 'Pre-Seed';
  return 'Not specified';
}

function extractAskAmount(content: string): string | undefined {
  const match = content.match(/(?:raising|seeking|ask)\s*\$?([\d,.]+)\s*(m|million|k|thousand)?/i);
  if (!match) return undefined;

  let amount = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(amount)) return undefined;

  const unit = match[2]?.toLowerCase();
  if (unit === 'm' || unit === 'million') amount *= 1_000_000;
  if (unit === 'k' || unit === 'thousand') amount *= 1_000;

  return `$${Math.round(amount).toLocaleString()}`;
}

function extractIndustry(content: string): string | undefined {
  const industries = ['saas', 'fintech', 'healthtech', 'edtech', 'ai', 'marketplace', 'e-commerce', 'developer tools'];
  const found = industries.find((industry) => content.includes(industry));
  return found ? found.replace(/\b\w/g, (char) => char.toUpperCase()) : undefined;
}

function estimateSlideCount(content: string): number {
  const slideMatches = content.match(/slide\s+\d+|problem|solution|market|traction|team|ask/gi);
  const estimate = slideMatches?.length ?? 10;
  return Math.max(6, Math.min(20, estimate));
}

function buildPromptContext(
  content: string,
  documentMeta: PitchDeckAnalysisRequest['documentMeta'],
  coverage: ReturnType<typeof detectSectionCoverage>
): string {
  return `Parsed metadata:
- File length: ${content.length} characters
- Word count: ${documentMeta?.word_count ?? content.split(/\s+/).filter(Boolean).length}
- Page count: ${documentMeta?.page_count ?? 'unknown'}
- Detected sections: ${coverage.detectedSections.join(', ') || 'none'}
- Missing sections: ${coverage.missingSections.join(', ') || 'none'}

Pitch deck content:
${content.substring(0, 18000)}`;
}

function normalizeScore(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return clampScore(fallback);
  return clampScore(Math.round(numeric));
}

function normalizeNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.round(numeric));
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeOptionalString(value: unknown, fallback?: string): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => entry.trim());
  return items.length > 0 ? items.slice(0, 5) : fallback;
}

function clampScore(score: number): number {
  return Math.max(1, Math.min(100, Math.round(score)));
}
