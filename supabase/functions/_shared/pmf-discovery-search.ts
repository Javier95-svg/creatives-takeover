import type { RedditPost } from './reddit.ts';

export type DiscoveryTimeRange = 'month' | 'year' | 'all';
export type DiscoveryThreadCategory =
  | 'pain_point'
  | 'solution_request'
  | 'money_talk'
  | 'seeking_alternatives'
  | 'hot_discussion';

/**
 * The project's validation stage shapes what a good lead looks like:
 * problem discovery wants people voicing pain, solution validation wants
 * people actively shopping (demo audiences), pricing wants money talk.
 */
export type ValidationStage = 'problem_discovery' | 'solution_validation' | 'pricing';

export const DEFAULT_VALIDATION_STAGE: ValidationStage = 'problem_discovery';

export function normalizeValidationStage(value: unknown): ValidationStage {
  return value === 'solution_validation' || value === 'pricing' ? value : DEFAULT_VALIDATION_STAGE;
}

const STAGE_CATEGORY_BOOST: Record<ValidationStage, Partial<Record<DiscoveryThreadCategory, number>>> = {
  problem_discovery: { pain_point: 8, hot_discussion: 2 },
  solution_validation: { solution_request: 8, seeking_alternatives: 8 },
  pricing: { money_talk: 10, seeking_alternatives: 4 },
};

export interface DiscoverySearchInput {
  productName?: string;
  targetAudience?: string;
  industry?: string;
  problem?: string;
}

export interface DiscoveryFilters {
  timeRange: DiscoveryTimeRange;
  includeSubreddits: string[];
  excludeSubreddits: string[];
}

export interface RankedDiscoveryPost extends RedditPost {
  relevanceScore: number;
  intentScore: number;
  freshnessScore: number;
  engagementScore: number;
  authorScore: number;
  spamPenalty: number;
  rankScore: number;
  matchedQueries: string[];
  rankingReason: string;
  inferredCategory: DiscoveryThreadCategory;
  isNew: boolean;
}

const clean = (value?: string) => (value || '').trim().replace(/\s+/g, ' ');
const unique = (values: string[], limit: number) => Array.from(new Set(values.map(clean).filter(Boolean))).slice(0, limit);
const subredditName = (value: string) => value.trim().replace(/^r\//i, '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40);

export function normalizeDiscoveryFilters(value: unknown): DiscoveryFilters {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const timeRange: DiscoveryTimeRange = raw.timeRange === 'month' || raw.timeRange === 'all' ? raw.timeRange : 'year';
  const normalizeList = (input: unknown, limit: number) => unique(
    Array.isArray(input) ? input.map((item) => subredditName(String(item))) : [],
    limit,
  );
  return {
    timeRange,
    includeSubreddits: normalizeList(raw.includeSubreddits, 5),
    excludeSubreddits: normalizeList(raw.excludeSubreddits, 20).map((item) => item.toLowerCase()),
  };
}

export function buildDiscoveryQueries(input: DiscoverySearchInput, stage: ValidationStage = DEFAULT_VALIDATION_STAGE): string[] {
  const problem = clean(input.problem);
  const audience = clean(input.targetAudience);
  const product = clean(input.productName);
  const industry = clean(input.industry);
  const topic = problem || product || industry || audience;
  const category = product || industry || topic;
  const base = topic;
  const audienceQuery = [audience, problem || category].filter(Boolean).join(' ');
  const painQuery = `(frustrating OR struggling OR "pain" OR workaround OR "how do you deal with") ${problem || category}`;
  const shoppingQuery = `("looking for" OR recommend OR "how do you") ${category}`;
  const switchQuery = `("alternative to" OR "switch from" OR replacement) ${category}`;
  const moneyQuery = `(cost OR pricing OR expensive OR "worth paying" OR budget) ${problem || category}`;
  // The first queries get the most search budget, so lead with the stage's intent.
  const ordered = stage === 'solution_validation'
    ? [shoppingQuery, switchQuery, base, audienceQuery, moneyQuery]
    : stage === 'pricing'
      ? [moneyQuery, switchQuery, base, audienceQuery, shoppingQuery]
      : [base, audienceQuery, painQuery, shoppingQuery, moneyQuery];
  return unique(ordered.map((query) => query.slice(0, 250)), 5);
}

const STOP_WORDS = new Set(['about', 'after', 'also', 'been', 'from', 'have', 'into', 'looking', 'that', 'their', 'there', 'they', 'this', 'what', 'when', 'where', 'which', 'with', 'would', 'your']);
const terms = (value: string) => Array.from(new Set(
  value.toLowerCase().match(/[a-z0-9][a-z0-9_-]{2,}/g)?.filter((term) => !STOP_WORDS.has(term)) || [],
));

const inferIntent = (text: string): { category: DiscoveryThreadCategory; score: number; reason: string } => {
  if (/alternative|replacement|switch(?:ing)? from|move away from/i.test(text)) {
    return { category: 'seeking_alternatives', score: 25, reason: 'alternative request' };
  }
  if (/looking for|recommend(?:ation)?|what (?:tool|app|software)|how do (?:you|i)|need (?:a|an) (?:tool|solution)/i.test(text)) {
    return { category: 'solution_request', score: 25, reason: 'solution request' };
  }
  if (/price|pricing|cost|budget|expensive|pay(?:ing)?|subscription/i.test(text)) {
    return { category: 'money_talk', score: 22, reason: 'money discussion' };
  }
  if (/frustrat|struggl|pain|hate|annoy|problem|difficult|broken|waste/i.test(text)) {
    return { category: 'pain_point', score: 18, reason: 'explicit pain' };
  }
  return { category: 'hot_discussion', score: 10, reason: 'active discussion' };
};

const isUsableAuthor = (author: string) => {
  const normalized = author.trim().toLowerCase();
  return Boolean(normalized && normalized !== '[deleted]' && normalized !== 'deleted' && normalized !== 'automoderator');
};

export function scoreDiscoveryPost(
  post: RedditPost,
  queries: string[],
  seenPostIds: ReadonlySet<string> = new Set(),
  stage: ValidationStage = DEFAULT_VALIDATION_STAGE,
): RankedDiscoveryPost {
  const text = `${post.title} ${post.body}`.toLowerCase();
  let bestCoverage = 0;
  const matchedQueries: string[] = [];
  for (const query of queries) {
    const queryTerms = terms(query);
    if (!queryTerms.length) continue;
    const matched = queryTerms.filter((term) => text.includes(term)).length;
    const coverage = matched / queryTerms.length;
    if (coverage > 0) matchedQueries.push(query);
    bestCoverage = Math.max(bestCoverage, coverage);
  }
  const relevanceScore = Math.min(40, Math.round(bestCoverage * 40));
  const intent = inferIntent(text);
  const freshnessScore = post.ageDays < 0 ? 0
    : post.ageDays <= 30 ? 15
      : post.ageDays <= 90 ? 12
        : post.ageDays <= 180 ? 8
          : post.ageDays <= 365 ? 4
            : 1;
  const engagement = Math.max(0, post.upvotes) + (Math.max(0, post.comments) * 2);
  const engagementScore = Math.min(15, Math.round(Math.log10(engagement + 1) * 6));
  const authorScore = isUsableAuthor(post.author) ? 5 : 0;
  const spamSignals = /buy now|limited time|discount code|affiliate|sponsored|promo code|dm me for|sign up using/i.test(text);
  const spamPenalty = spamSignals ? 30 : 0;
  const stageBoost = STAGE_CATEGORY_BOOST[stage][intent.category] ?? 0;
  const rankScore = Math.max(0, Math.min(100, relevanceScore + intent.score + stageBoost + freshnessScore + engagementScore + authorScore - spamPenalty));
  const freshnessReason = post.ageDays >= 0 && post.ageDays <= 30 ? 'recent ' : '';
  const engagementReason = engagementScore >= 12 ? 'high-engagement ' : '';
  return {
    ...post,
    relevanceScore,
    intentScore: intent.score,
    freshnessScore,
    engagementScore,
    authorScore,
    spamPenalty,
    rankScore,
    matchedQueries,
    rankingReason: `${freshnessReason}${engagementReason}${intent.reason}`.trim(),
    inferredCategory: intent.category,
    isNew: !seenPostIds.has(post.id),
  };
}

export function rankDiscoveryPosts(
  posts: RedditPost[],
  queries: string[],
  seenPostIds: ReadonlySet<string> = new Set(),
  limit = 30,
  stage: ValidationStage = DEFAULT_VALIDATION_STAGE,
): RankedDiscoveryPost[] {
  const uniquePosts = new Map<string, RedditPost>();
  for (const post of posts) {
    if (post.id && !uniquePosts.has(post.id)) uniquePosts.set(post.id, post);
    if (uniquePosts.size >= 100) break;
  }
  return Array.from(uniquePosts.values())
    .map((post) => scoreDiscoveryPost(post, queries, seenPostIds, stage))
    .sort((a, b) => b.rankScore - a.rankScore || (b.upvotes + b.comments) - (a.upvotes + a.comments))
    .slice(0, limit);
}
