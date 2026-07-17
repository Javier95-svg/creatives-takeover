import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { emitBusinessEvent } from '../_shared/analytics.ts';
import { resolveCreditIdempotencyKey } from '../_shared/request-idempotency.ts';
import { createRedditClient, type RedditPost, type RedditSourceState, type RedditSubreddit } from '../_shared/reddit.ts';
import { buildDeterministicPeople, hasUsableDiscoveryOutput, totalAvailableCredits } from '../_shared/pmf-discovery-contract.ts';
import {
  buildDiscoveryQueries,
  normalizeDiscoveryFilters,
  normalizeValidationStage,
  rankDiscoveryPosts,
  type DiscoveryThreadCategory,
  type RankedDiscoveryPost,
  type ValidationStage,
} from '../_shared/pmf-discovery-search.ts';
import { searchHackerNews } from '../_shared/hackernews.ts';
import { toExternalMention, type ExternalMention } from '../_shared/external-mentions.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};
const VALID_CATEGORIES: DiscoveryThreadCategory[] = ['pain_point', 'solution_request', 'money_talk', 'seeking_alternatives', 'hot_discussion'];
const DISCOVERY_DEADLINE_MS = 45_000;

interface DiscoveryRequest {
  action?: 'discover' | 'health';
  productName?: string;
  targetAudience?: string;
  industry?: string;
  problem?: string;
  searchVersion?: 1 | 2;
  validationStage?: string;
  filters?: unknown;
}

interface WebSource { title?: string; url?: string; snippet?: string }
type DiscoveryStage = 'configuration' | 'source' | 'generation' | 'credits' | 'persistence';
type DiscoveryEvent =
  | 'pmf_customer_discovery_started'
  | 'pmf_customer_discovery_completed'
  | 'pmf_customer_discovery_failed'
  | 'pmf_customer_discovery_degraded'
  | 'pmf_customer_discovery_health_checked';

class DiscoveryFailure extends Error {
  constructor(
    message: string,
    readonly errorCode: string,
    readonly stage: DiscoveryStage,
    readonly status: number,
    readonly retryable = false,
    readonly sourceState?: RedditSourceState,
  ) {
    super(message);
  }
}

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
);
const hostOf = (url: string): string => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};
const uniqueStrings = (values: unknown[], limit: number) => Array.from(new Set(
  values.map((value) => String(value || '').trim().replace(/\s+/g, ' ')).filter(Boolean),
)).slice(0, limit);

const sourceFailureFor = (state: RedditSourceState): DiscoveryFailure => {
  if (state.status === 'missing_credentials') {
    return new DiscoveryFailure('Reddit customer discovery is unavailable because OAuth credentials are not configured.', 'REDDIT_CREDENTIALS_MISSING', 'configuration', 503, false, state);
  }
  if (state.status === 'authentication_failed') {
    return new DiscoveryFailure('Reddit customer discovery could not authenticate.', 'REDDIT_AUTHENTICATION_FAILED', 'source', 503, false, state);
  }
  if (state.status === 'rate_limited') {
    return new DiscoveryFailure('Reddit is rate limiting customer discovery. Please try again shortly.', 'REDDIT_RATE_LIMITED', 'source', 503, true, state);
  }
  return new DiscoveryFailure('Reddit customer discovery is temporarily unavailable.', 'REDDIT_API_UNAVAILABLE', 'source', 503, true, state);
};

async function callOpenAIJson(apiKey: string, system: string, user: string, maxTokens = 3000, timeoutMs = 10_000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } finally {
    clearTimeout(timer);
  }
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const deadlineAt = startedAt + DISCOVERY_DEADLINE_MS;
  let userId: string | null = null;
  let operationId: string | null = null;
  let chargedCredits = 0;
  let sourceState: RedditSourceState = { status: 'missing_credentials', reason: 'not_checked' };
  let serviceClient: any = null;
  let storedDiscoveryId: string | null = null;

  const emitDiscovery = async (eventName: DiscoveryEvent, properties: Record<string, unknown>) => {
    if (!userId) return;
    await emitBusinessEvent({ eventName, userId, properties: { operation_id: operationId, ...properties } });
  };

  try {
    const user = await getUserFromAuth(req);
    if (!user) return jsonResponse({ success: false, error: 'Authentication required', errorCode: 'AUTHENTICATION_REQUIRED' }, 401);
    userId = user.id;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new DiscoveryFailure('Server configuration is incomplete.', 'SERVER_CONFIGURATION_MISSING', 'configuration', 500);
    }
    serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const body: DiscoveryRequest = await req.json();

    if (body.action === 'health') {
      operationId = crypto.randomUUID();
      const { data: adminRole } = await serviceClient
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (!adminRole) return jsonResponse({ success: false, error: 'Admin access required', errorCode: 'ADMIN_REQUIRED' }, 403);

      const reddit = await createRedditClient({ deadlineAt });
      sourceState = reddit.sourceState;
      const configuration = {
        reddit: sourceState.status === 'available',
        openai: Boolean(Deno.env.get('OPENAI_API_KEY')?.trim()),
        perplexity: Boolean(Deno.env.get('PERPLEXITY_API_KEY')?.trim()),
        posthog: Boolean(Deno.env.get('POSTHOG_PROJECT_API_KEY')?.trim()),
      };
      await emitDiscovery('pmf_customer_discovery_health_checked', {
        reddit_status: sourceState.status,
        reddit_http_status: sourceState.httpStatus,
        openai_configured: configuration.openai,
        perplexity_configured: configuration.perplexity,
        posthog_configured: configuration.posthog,
        duration_ms: Date.now() - startedAt,
      });
      return jsonResponse({
        success: true,
        checkedAt: new Date().toISOString(),
        status: configuration.reddit ? 'healthy' : 'unhealthy',
        reddit: { status: sourceState.status, httpStatus: sourceState.httpStatus, reason: sourceState.reason, latencyMs: reddit.diagnostics.durationMs },
        configuration,
      });
    }

    const productName = (body.productName || '').trim();
    const targetAudience = (body.targetAudience || '').trim();
    const industry = (body.industry || '').trim();
    const problem = (body.problem || '').trim();
    const searchVersion: 1 | 2 = body.searchVersion === 2 ? 2 : 1;
    const validationStage: ValidationStage = normalizeValidationStage(body.validationStage);
    const filters = normalizeDiscoveryFilters(body.filters);
    if (!problem && !productName && !targetAudience) {
      return jsonResponse({ success: false, error: 'Describe your product, audience, or the problem you solve.', errorCode: 'INVALID_INPUT' }, 400);
    }

    operationId = await resolveCreditIdempotencyKey(req, {
      userId: user.id,
      feature: 'PMF_DISCOVERY',
      requestFingerprint: { productName, targetAudience, industry, problem, searchVersion, validationStage, filters },
    });

    const { data: replay } = await serviceClient
      .from('pmf_customer_discovery')
      .select('id, product_name, target_audience, problem, communities, threads, pain_points, people, search_meta, source_meta')
      .eq('user_id', user.id)
      .contains('search_meta', { operationId })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (replay) {
      return jsonResponse({
        success: true,
        replayed: true,
        id: replay.id,
        communities: replay.communities,
        threads: replay.threads,
        painPoints: replay.pain_points,
        people: replay.people,
        dmTemplate: replay.search_meta?.dmTemplate || '',
        sourceMeta: replay.source_meta,
        queryMeta: replay.search_meta?.queryMeta,
        externalMentions: replay.search_meta?.externalMentions || [],
        creditsUsed: 0,
      });
    }

    await emitDiscovery('pmf_customer_discovery_started', {
      search_version: searchVersion,
      validation_stage: validationStage,
      has_product: Boolean(productName),
      has_audience: Boolean(targetAudience),
      has_problem: Boolean(problem),
      charged_credits: 0,
    });

    const audience = targetAudience || 'the target customers';
    const topic = problem || productName || industry || 'this problem';
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
    const deterministicQueries = buildDiscoveryQueries({ productName, targetAudience, industry, problem }, validationStage);
    let queryVariants = searchVersion === 2 ? deterministicQueries : deterministicQueries.slice(0, 1);
    if (searchVersion === 2 && openaiApiKey && Date.now() < deadlineAt - 8000) {
      try {
        const generated = await callOpenAIJson(
          openaiApiKey,
          'Create up to five concise Reddit search queries for customer discovery. Cover direct pain, recommendations, alternatives, cost, and workarounds. Return only {"queries":["..."]}. Do not include personal data.',
          JSON.stringify({ productName, targetAudience, industry, problem }),
          500,
          Math.min(7000, deadlineAt - Date.now()),
        );
        queryVariants = uniqueStrings([...(Array.isArray(generated?.queries) ? generated.queries : []), ...deterministicQueries], 5).map((query) => query.slice(0, 250));
      } catch (error) {
        console.warn('pmf-customer-discovery: query enrichment failed; using deterministic queries', error instanceof Error ? error.message : String(error));
      }
    }

    // Hacker News runs in parallel with the Reddit searches; it is best-effort
    // and adds supplementary threads/people without ever failing the scan.
    const hackerNewsPromise: Promise<RedditPost[][]> = searchVersion === 2
      ? Promise.all(queryVariants.slice(0, 2).map((query) => searchHackerNews(query, {
        limit: 15,
        timeRange: filters.timeRange,
        deadlineAt,
      })))
      : Promise.resolve([]);

    const runWebSearch = async (query: string): Promise<{ sources: WebSource[] }> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.max(250, Math.min(8000, deadlineAt - Date.now())));
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/web-search`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}`, 'apikey': supabaseServiceKey },
          body: JSON.stringify({ query, maxResults: 8, searchRecency: 'year', businessContext: industry ? { industry } : undefined }),
        });
        if (!response.ok) return { sources: [] };
        const json = await response.json();
        const rawSources: WebSource[] = Array.isArray(json?.sources) ? json.sources : [];
        const citations: string[] = Array.isArray(json?.citations) ? json.citations : [];
        const sources = rawSources.slice(0, 8).map((source, index) => ({
          title: source.title || hostOf(source.url || citations[index] || ''),
          url: source.url || citations[index],
          snippet: source.snippet,
        })).filter((source) => source.url || source.snippet);
        return { sources: sources.length ? sources : citations.slice(0, 8).map((url) => ({ title: hostOf(url), url })) };
      } catch {
        return { sources: [] };
      } finally {
        clearTimeout(timer);
      }
    };

    const reddit = await createRedditClient({ deadlineAt });
    sourceState = reddit.sourceState;
    if (sourceState.status !== 'available') throw sourceFailureFor(sourceState);

    const subredditQuery = ([targetAudience, industry].filter(Boolean).join(' ') || topic).slice(0, 200);
    const discovered = await reddit.discoverSubreddits(subredditQuery, 12);
    const excluded = new Set(filters.excludeSubreddits);
    const included: RedditSubreddit[] = filters.includeSubreddits.map((name) => ({
      name,
      title: name,
      subscribers: 0,
      url: `https://www.reddit.com/r/${name}`,
      description: 'Included by the founder for this discovery scan.',
    }));
    const topSubs = Array.from(new Map([...included, ...discovered]
      .filter((subreddit) => !excluded.has(subreddit.name.toLowerCase()))
      .filter((subreddit) => filters.includeSubreddits.includes(subreddit.name) || subreddit.subscribers >= 1000)
      .map((subreddit) => [subreddit.name.toLowerCase(), subreddit])).values()).slice(0, 6);

    const redditTime = filters.timeRange;
    const searchJobs: Array<() => Promise<RedditPost[]>> = queryVariants.map((query) => () => reddit.searchReddit(query, {
      limit: 25,
      sort: 'relevance',
      time: redditTime,
    }));
    const targetCount = searchVersion === 2 ? 5 : 3;
    topSubs.slice(0, targetCount).forEach((subreddit, index) => {
      const query = queryVariants[index % queryVariants.length];
      searchJobs.push(() => reddit.searchReddit(query, { subreddit: subreddit.name, limit: 10, sort: 'top', time: redditTime }));
    });
    const postArrays = await mapWithConcurrency(searchJobs.slice(0, searchVersion === 2 ? 10 : 4), 3, (job) => job());
    sourceState = reddit.sourceState;
    const diagnostics = reddit.diagnostics;
    const searchDiagnostics = diagnostics.requests.filter((item) => item.kind === 'search');
    const successfulSearches = searchDiagnostics.filter((item) => item.status === 'available').length;
    if (diagnostics.partial) {
      await emitDiscovery('pmf_customer_discovery_degraded', {
        reddit_status: sourceState.status,
        requests_attempted: diagnostics.requestsAttempted,
        requests_succeeded: diagnostics.requestsSucceeded,
        requests_failed: diagnostics.requestsFailed,
        retry_count: diagnostics.retryCount,
        duration_ms: diagnostics.durationMs,
      });
    }

    const hackerNewsPosts = (await hackerNewsPromise).flat();
    const rawPosts = [...postArrays.flat(), ...hackerNewsPosts].filter((post) => !post.subreddit || !excluded.has(post.subreddit.toLowerCase()));
    if (rawPosts.length === 0) {
      if (successfulSearches === 0) throw sourceFailureFor(sourceState.status === 'available' ? { status: 'api_unavailable', reason: 'all_search_requests_failed' } : sourceState);
      throw new DiscoveryFailure('No matching Reddit discussions were found. Try a broader description; no credits were used.', 'NO_LEADS_FOUND', 'source', 404, false, { status: 'available' });
    }

    const { data: previousRows } = await serviceClient
      .from('pmf_customer_discovery')
      .select('threads')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    const seenPostIds = new Set<string>();
    for (const row of previousRows || []) {
      for (const thread of Array.isArray(row.threads) ? row.threads : []) {
        if (thread?.id) seenPostIds.add(String(thread.id));
      }
    }
    let posts: RankedDiscoveryPost[] = rankDiscoveryPosts(rawPosts, queryVariants, seenPostIds, 30, validationStage);
    if (searchVersion === 1) {
      posts = posts.sort((a, b) => (b.upvotes + b.comments) - (a.upvotes + a.comments)).slice(0, 30);
    }
    sourceState = { status: 'available' };

    const emptySearch = { sources: [] as WebSource[] };
    const [webCommunitiesRes, xMentionsRes, linkedinMentionsRes] = Date.now() < deadlineAt - 5000
      ? await Promise.all([
        runWebSearch(`Where do ${audience} gather online outside Reddit to discuss ${topic}? Give specific public community names and URLs.`),
        searchVersion === 2
          ? runWebSearch(`Recent public posts on X (formerly Twitter) where ${audience} discuss ${topic}. Link directly to the specific x.com posts.`)
          : Promise.resolve(emptySearch),
        searchVersion === 2
          ? runWebSearch(`Recent public LinkedIn posts where ${audience} discuss ${topic}. Link directly to the specific linkedin.com posts.`)
          : Promise.resolve(emptySearch),
      ])
      : [emptySearch, emptySearch, emptySearch];
    const externalMentions = [
      ...xMentionsRes.sources.map((source) => toExternalMention(source, 'x')),
      ...linkedinMentionsRes.sources.map((source) => toExternalMention(source, 'linkedin')),
    ].filter((mention): mention is ExternalMention => mention !== null).slice(0, 10);
    const webAllowedUrls = new Set(webCommunitiesRes.sources.map((source) => source.url).filter(Boolean) as string[]);
    const webSourceList = webCommunitiesRes.sources.map((source, index) => `(${index + 1}) ${source.title || hostOf(source.url || '')}${source.url ? ` — ${source.url}` : ''}`).join('\n');
    const byId = new Map(posts.map((post) => [post.id, post]));
    const postsDigest = posts.map((post) => `[${post.id}] r/${post.subreddit} score=${post.rankScore} upvotes=${post.upvotes} comments=${post.comments} age=${post.ageDays}d — ${post.title}${post.body ? `\n${post.body.slice(0, 220)}` : ''}`).join('\n');

    let parsed: any = {};
    if (openaiApiKey && Date.now() < deadlineAt - 5000) {
      try {
        const stageGuidance = validationStage === 'solution_validation'
          ? 'The founder is validating a solution: the dmTemplate should ask to show a short demo and get honest feedback.'
          : validationStage === 'pricing'
            ? 'The founder is validating pricing: the dmTemplate should ask about how they budget for or currently pay to solve this.'
            : 'The founder is doing problem discovery: the dmTemplate should ask to learn about their experience, with no pitch.';
        parsed = await callOpenAIJson(
          openaiApiKey,
          `You are a customer-discovery analyst. Use only the supplied post ids and web URLs. Categories: ${VALID_CATEGORIES.join(', ')}. Return JSON with threadEnrichments, painPoints, peopleIds, communities, and dmTemplate. ${stageGuidance} Never invent a source or person.`,
          `PRODUCT: ${productName || '(n/a)'}\nAUDIENCE: ${targetAudience || '(n/a)'}\nPROBLEM: ${problem || '(n/a)'}\nVALIDATION STAGE: ${validationStage}\n\nPOSTS (Reddit and Hacker News):\n${postsDigest}\n\nWEB SOURCES:\n${webSourceList || '(none)'}`,
          3500,
          Math.min(10_000, deadlineAt - Date.now()),
        );
      } catch (error) {
        console.warn('pmf-customer-discovery: structuring failed; using deterministic Reddit output', error instanceof Error ? error.message : String(error));
      }
    }

    const enrichMap = new Map<string, { category: DiscoveryThreadCategory; outreachAngle: string }>();
    for (const enrichment of Array.isArray(parsed?.threadEnrichments) ? parsed.threadEnrichments : []) {
      if (enrichment && typeof enrichment.id === 'string' && byId.has(enrichment.id)) {
        enrichMap.set(enrichment.id, {
          category: VALID_CATEGORIES.includes(enrichment.category) ? enrichment.category : byId.get(enrichment.id)!.inferredCategory,
          outreachAngle: typeof enrichment.outreachAngle === 'string' ? enrichment.outreachAngle.slice(0, 400) : '',
        });
      }
    }

    const threads = posts.map((post) => ({
      id: post.id,
      title: post.title,
      snippet: post.body.slice(0, 280),
      url: post.permalink,
      source: post.source || 'reddit',
      subreddit: post.subreddit,
      upvotes: post.upvotes,
      comments: post.comments,
      ageDays: post.ageDays,
      author: post.author,
      category: enrichMap.get(post.id)?.category || post.inferredCategory,
      outreachAngle: enrichMap.get(post.id)?.outreachAngle || '',
      relevanceScore: post.relevanceScore,
      intentScore: post.intentScore,
      freshnessScore: post.freshnessScore,
      rankScore: post.rankScore,
      matchedQueries: post.matchedQueries,
      rankingReason: post.rankingReason,
      isNew: post.isNew,
    }));

    const painPoints = (Array.isArray(parsed?.painPoints) ? parsed.painPoints : []).map((painPoint: any) => {
      const ids = (Array.isArray(painPoint.threadIds) ? painPoint.threadIds : []).filter((id: string) => byId.has(id));
      const totalEngagement = ids.reduce((sum: number, id: string) => sum + byId.get(id)!.upvotes + byId.get(id)!.comments, 0);
      const example = ids.length ? byId.get(ids[0])! : null;
      return {
        label: String(painPoint.label || '').slice(0, 120),
        summary: String(painPoint.summary || '').slice(0, 400),
        intensity: Math.max(1, Math.min(5, Number(painPoint.intensity) || 3)),
        threadCount: ids.length,
        totalEngagement,
        exampleQuote: example?.title || '',
        threadIds: ids,
      };
    }).filter((painPoint: any) => painPoint.label && painPoint.threadCount > 0).sort((a: any, b: any) => b.totalEngagement - a.totalEngagement);

    const categoryByPostId = new Map(threads.map((thread) => [thread.id, thread.category]));
    let people = buildDeterministicPeople(posts, Array.isArray(parsed?.peopleIds) ? parsed.peopleIds : [], categoryByPostId).map((person) => {
      const post = posts.find((candidate) => candidate.permalink === person.permalink);
      return { ...person, rankScore: post?.rankScore || 0, intentScore: post?.intentScore || 0, isNew: post?.isNew ?? true };
    });
    if (!hasUsableDiscoveryOutput(threads, people)) {
      throw new DiscoveryFailure('No usable people-to-contact leads were found. Try a broader description; no credits were used.', 'NO_USABLE_LEADS', 'generation', 422, false, sourceState);
    }

    const redditCommunities = topSubs.map((subreddit) => ({
      name: `r/${subreddit.name}`,
      platform: 'Reddit',
      source: 'reddit',
      subscribers: subreddit.subscribers,
      url: subreddit.url,
      whyRelevant: subreddit.description || `${subreddit.subscribers.toLocaleString()} members discussing ${topic}.`,
      howToEngage: 'Answer questions genuinely and share useful resources before mentioning your product.',
    }));
    const webCommunities = (Array.isArray(parsed?.communities) ? parsed.communities : []).map((community: any) => ({
      name: String(community.name || '').slice(0, 120),
      platform: String(community.platform || 'Other'),
      source: 'web',
      url: typeof community.url === 'string' && webAllowedUrls.has(community.url) ? community.url : undefined,
      whyRelevant: String(community.whyRelevant || '').slice(0, 300),
      howToEngage: String(community.howToEngage || '').slice(0, 300),
    })).filter((community: any) => community.name);
    const communities = [...redditCommunities, ...webCommunities];
    const dmTemplate = typeof parsed?.dmTemplate === 'string' ? parsed.dmTemplate.slice(0, 1000) : '';
    const queryMeta = {
      searchVersion,
      validationStage,
      queryVariants,
      requestsAttempted: diagnostics.requestsAttempted,
      requestsSucceeded: diagnostics.requestsSucceeded,
      requestsFailed: diagnostics.requestsFailed,
      retryCount: diagnostics.retryCount,
      rawCandidates: Math.min(100, new Set(rawPosts.map((post) => post.id)).size),
      returnedThreads: threads.length,
      partial: diagnostics.partial,
      durationMs: Date.now() - startedAt,
    };
    const sourceMeta = {
      redditAvailable: true,
      redditStatus: sourceState.status,
      redditThreads: threads.filter((thread) => thread.source !== 'hackernews').length,
      hackernewsThreads: threads.filter((thread) => thread.source === 'hackernews').length,
      externalMentions: externalMentions.length,
      subreddits: topSubs.length,
      webCommunities: webCommunities.length,
      peopleCount: people.length,
      requestsAttempted: diagnostics.requestsAttempted,
      requestsSucceeded: diagnostics.requestsSucceeded,
      requestsFailed: diagnostics.requestsFailed,
      retryCount: diagnostics.retryCount,
      partial: diagnostics.partial,
      durationMs: Date.now() - startedAt,
    };

    const { data: stored, error: storeError } = await serviceClient
      .from('pmf_customer_discovery' as any)
      .insert({
        user_id: user.id,
        product_name: productName || null,
        target_audience: targetAudience || null,
        problem: problem || null,
        communities,
        threads,
        pain_points: painPoints,
        people,
        search_meta: { dmTemplate, operationId, queryMeta, externalMentions },
        source_meta: sourceMeta,
      })
      .select('id')
      .single();
    if (storeError || !stored) throw new DiscoveryFailure('Could not save the discovery results.', 'DISCOVERY_PERSISTENCE_FAILED', 'persistence', 500, true, sourceState);
    storedDiscoveryId = stored.id;

    const creditCost = CREDIT_COSTS.PMF_DISCOVERY;
    const creditResult = await checkAndDeductCredits(user.id, creditCost, 'PMF Customer Discovery', undefined, {
      entitlementFeature: 'PMF_DISCOVERY',
      idempotencyKey: operationId,
    });
    if (!creditResult.success) {
      const { error: cleanupError } = await serviceClient.from('pmf_customer_discovery' as any).delete().eq('id', stored.id).eq('user_id', user.id);
      if (cleanupError) console.error('pmf-customer-discovery: failed to remove uncharged result', { operationId, code: cleanupError.code });
      storedDiscoveryId = null;
      await emitDiscovery('pmf_customer_discovery_failed', {
        stage: 'credits',
        error_code: creditResult.errorCode || 'CREDIT_DEDUCTION_FAILED',
        reddit_status: sourceState.status,
        charged_credits: 0,
        refunded: false,
      });
      return jsonResponse({
        success: false,
        error: creditResult.error || 'Credit deduction failed',
        creditError: true,
        errorCode: creditResult.errorCode,
        requiredTier: creditResult.requiredTier,
        requiredCredits: creditCost,
      }, 402);
    }
    chargedCredits = (creditResult.usedFromQuota ?? 0) + (creditResult.usedFromBalance ?? 0);

    const { data: finalizedPeople, error: leadError } = await serviceClient.rpc('finalize_pmf_discovery_leads', {
      p_user_id: user.id,
      p_discovery_id: stored.id,
      p_people: people,
    });
    if (leadError || !Array.isArray(finalizedPeople)) {
      console.error('pmf-customer-discovery: lead finalization failed', { operationId, code: leadError?.code });
      throw new DiscoveryFailure('Could not finalize the discovery lead pipeline.', 'LEAD_FINALIZATION_FAILED', 'persistence', 500, true, sourceState);
    }
    people = finalizedPeople;

    const balanceAfter = totalAvailableCredits(creditResult.newBalance, creditResult.newQuota);
    await emitDiscovery('pmf_customer_discovery_completed', {
      search_version: searchVersion,
      validation_stage: validationStage,
      hackernews_threads: threads.filter((thread) => thread.source === 'hackernews').length,
      reddit_status: sourceState.status,
      requests_attempted: diagnostics.requestsAttempted,
      requests_succeeded: diagnostics.requestsSucceeded,
      requests_failed: diagnostics.requestsFailed,
      retry_count: diagnostics.retryCount,
      duration_ms: Date.now() - startedAt,
      threads: threads.length,
      people: people.length,
      charged_credits: chargedCredits,
      balance_after: balanceAfter,
      persisted: true,
    });

    return jsonResponse({
      success: true,
      id: stored.id,
      operationId,
      communities,
      threads,
      painPoints,
      people,
      dmTemplate,
      sourceMeta,
      queryMeta,
      externalMentions,
      creditsUsed: chargedCredits,
      newBalance: balanceAfter,
      walletBalance: creditResult.newBalance ?? 0,
      monthlyQuota: creditResult.newQuota ?? 0,
    });
  } catch (error) {
    const failure = error instanceof DiscoveryFailure
      ? error
      : new DiscoveryFailure(error instanceof Error ? error.message : 'Unknown error occurred', 'DISCOVERY_FAILED', 'generation', 500, true, sourceState);
    let refunded = false;
    if (userId && chargedCredits > 0) {
      refunded = await refundCredits(userId, chargedCredits, 'PMF Customer Discovery', 'Refund: customer discovery did not complete', {
        errorCode: failure.errorCode,
        stage: failure.stage,
        operationId,
      });
    }
    if (storedDiscoveryId && userId && serviceClient) {
      const { error: cleanupError } = await serviceClient.from('pmf_customer_discovery' as any).delete().eq('id', storedDiscoveryId).eq('user_id', userId);
      if (cleanupError) console.error('pmf-customer-discovery: result cleanup failed', { operationId, code: cleanupError.code });
    }
    const compensationFailed = chargedCredits > 0 && !refunded;
    await emitDiscovery('pmf_customer_discovery_failed', {
      stage: failure.stage,
      error_code: compensationFailed ? 'DISCOVERY_REFUND_FAILED' : failure.errorCode,
      reddit_status: failure.sourceState?.status || sourceState.status,
      reddit_http_status: failure.sourceState?.httpStatus,
      charged_credits: chargedCredits,
      refunded,
      retryable: failure.retryable,
      duration_ms: Date.now() - startedAt,
    });
    console.error('pmf-customer-discovery failed', { operationId, errorCode: failure.errorCode, stage: failure.stage, compensationFailed });
    return jsonResponse({
      success: false,
      error: compensationFailed ? 'Discovery failed and the automatic credit refund needs support review.' : failure.message,
      errorCode: compensationFailed ? 'DISCOVERY_REFUND_FAILED' : failure.errorCode,
      stage: failure.stage,
      retryable: failure.retryable,
      creditsUsed: compensationFailed ? chargedCredits : 0,
      refunded,
      sourceMeta: {
        redditAvailable: false,
        redditStatus: failure.sourceState?.status || sourceState.status,
        redditHttpStatus: failure.sourceState?.httpStatus,
        reason: failure.sourceState?.reason,
        redditThreads: 0,
        peopleCount: 0,
      },
    }, compensationFailed ? 500 : failure.status);
  }
});
