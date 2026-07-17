import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { emitBusinessEvent } from '../_shared/analytics.ts';
import { resolveCreditIdempotencyKey } from '../_shared/request-idempotency.ts';
import { createRedditClient, type RedditPost, type RedditSourceState, type RedditSubreddit } from '../_shared/reddit.ts';
import { buildDeterministicPeople, hasUsableDiscoveryOutput, totalAvailableCredits } from '../_shared/pmf-discovery-contract.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

interface DiscoveryRequest {
  productName?: string;
  targetAudience?: string;
  industry?: string;
  problem?: string;
}

interface WebSource { title?: string; url?: string; snippet?: string }

type DiscoveryStage = 'configuration' | 'source' | 'generation' | 'credits' | 'persistence';

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

const hostOf = (url: string): string => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

const VALID_CATEGORIES = ['pain_point', 'solution_request', 'money_talk', 'seeking_alternatives', 'hot_discussion'];

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
);

const sourceFailureFor = (state: RedditSourceState): DiscoveryFailure => {
  if (state.status === 'missing_credentials') {
    return new DiscoveryFailure(
      'Reddit customer discovery is temporarily unavailable because its OAuth credentials are not configured.',
      'REDDIT_CREDENTIALS_MISSING',
      'configuration',
      503,
      false,
      state,
    );
  }
  if (state.status === 'authentication_failed') {
    return new DiscoveryFailure(
      'Reddit customer discovery could not authenticate. Please try again after the integration is restored.',
      'REDDIT_AUTHENTICATION_FAILED',
      'source',
      503,
      false,
      state,
    );
  }
  if (state.status === 'rate_limited') {
    return new DiscoveryFailure(
      'Reddit is rate limiting customer discovery. Please try again shortly.',
      'REDDIT_RATE_LIMITED',
      'source',
      503,
      true,
      state,
    );
  }
  return new DiscoveryFailure(
    'Reddit customer discovery is temporarily unavailable. Please try again shortly.',
    'REDDIT_API_UNAVAILABLE',
    'source',
    503,
    true,
    state,
  );
};

async function callOpenAIJson(apiKey: string, system: string, user: string, maxTokens = 3000): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: maxTokens,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let userId: string | null = null;
  let operationId: string | null = null;
  let chargedCredits = 0;
  let sourceState: RedditSourceState = { status: 'missing_credentials', reason: 'not_checked' };

  const emitDiscovery = async (
    eventName: 'pmf_customer_discovery_started' | 'pmf_customer_discovery_completed' | 'pmf_customer_discovery_failed',
    properties: Record<string, unknown>,
  ) => {
    if (!userId) return;
    await emitBusinessEvent({
      eventName,
      userId,
      properties: { operation_id: operationId, ...properties },
    });
  };

  try {
    const user = await getUserFromAuth(req);
    if (!user) return jsonResponse({ success: false, error: 'Authentication required', errorCode: 'AUTHENTICATION_REQUIRED' }, 401);
    userId = user.id;

    const body: DiscoveryRequest = await req.json();
    const productName = (body.productName || '').trim();
    const targetAudience = (body.targetAudience || '').trim();
    const industry = (body.industry || '').trim();
    const problem = (body.problem || '').trim();

    if (!problem && !productName && !targetAudience) {
      return jsonResponse({ success: false, error: 'Describe your product, audience, or the problem you solve.', errorCode: 'INVALID_INPUT' }, 400);
    }

    operationId = await resolveCreditIdempotencyKey(req, {
      userId: user.id,
      feature: 'PMF_DISCOVERY',
      requestFingerprint: { productName, targetAudience, industry, problem },
    });

    await emitDiscovery('pmf_customer_discovery_started', {
      has_product: Boolean(productName),
      has_audience: Boolean(targetAudience),
      has_problem: Boolean(problem),
      charged_credits: 0,
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new DiscoveryFailure('Server configuration is incomplete.', 'SERVER_CONFIGURATION_MISSING', 'configuration', 500);
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const audience = targetAudience || 'the target customers';
    const topic = problem || productName || industry || 'this problem';
    const redditQuery = (problem || `${productName} ${targetAudience}`.trim() || topic).slice(0, 250);

    const runWebSearch = async (query: string): Promise<{ answer: string; sources: WebSource[] }> => {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/web-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify({
            query,
            maxResults: 8,
            searchRecency: 'year',
            businessContext: industry ? { industry } : undefined,
          }),
        });
        if (!response.ok) {
          console.warn('pmf-customer-discovery: optional web search failed', { status: response.status });
          return { answer: '', sources: [] };
        }
        const json = await response.json();
        if (!json?.success) return { answer: '', sources: [] };
        const rawSources: WebSource[] = Array.isArray(json.sources) ? json.sources : [];
        const citationUrls: string[] = Array.isArray(json.citations) ? json.citations : [];
        let sources = rawSources.slice(0, 8).map((source, index) => {
          const url = source.url || citationUrls[index] || undefined;
          const placeholder = !source.title || /^Source \d+$/.test(source.title || '');
          return {
            title: placeholder && url ? hostOf(url) : (source.title || hostOf(url || '')),
            url,
            snippet: source.snippet,
          };
        }).filter((source) => Boolean(source.url) || Boolean(source.snippet));
        if (sources.length === 0 && citationUrls.length > 0) {
          sources = citationUrls.slice(0, 8).map((url) => ({ title: hostOf(url), url }));
        }
        return { answer: json.answer || '', sources };
      } catch (error) {
        console.warn('pmf-customer-discovery: optional web search error', error);
        return { answer: '', sources: [] };
      }
    };

    const reddit = await createRedditClient();
    sourceState = reddit.sourceState;
    if (sourceState.status !== 'available') throw sourceFailureFor(sourceState);

    const subredditQuery = ([targetAudience, industry].filter(Boolean).join(' ') || topic).slice(0, 200);
    const discovered = await reddit.discoverSubreddits(subredditQuery, 12);
    const topSubs: RedditSubreddit[] = discovered.filter((subreddit) => subreddit.subscribers >= 1000).slice(0, 6);

    const searchTasks: Promise<RedditPost[]>[] = [
      reddit.searchReddit(redditQuery, { limit: 25, sort: 'relevance', time: 'year' }),
      ...topSubs.slice(0, 3).map((subreddit) => reddit.searchReddit(redditQuery, {
        subreddit: subreddit.name,
        limit: 10,
        sort: 'top',
        time: 'year',
      })),
    ];
    const postArrays = await Promise.all(searchTasks);
    sourceState = reddit.sourceState;

    const seen = new Set<string>();
    let posts: RedditPost[] = [];
    for (const postArray of postArrays) {
      for (const post of postArray) {
        if (!post.id || seen.has(post.id)) continue;
        seen.add(post.id);
        posts.push(post);
      }
    }
    posts.sort((a, b) => (b.upvotes + b.comments) - (a.upvotes + a.comments));
    posts = posts.slice(0, 30);

    if (posts.length === 0) {
      if (sourceState.status !== 'available') throw sourceFailureFor(sourceState);
      throw new DiscoveryFailure(
        'No matching Reddit discussions were found. Try a broader description; no credits were used.',
        'NO_LEADS_FOUND',
        'source',
        404,
        false,
        sourceState,
      );
    }
    sourceState = { status: 'available' };

    const webCommunitiesRes = await runWebSearch(
      `Where do ${audience} gather online OUTSIDE Reddit — Slack communities, Discord servers, LinkedIn or Facebook groups, and niche forums — to discuss ${topic}? Give specific names with URLs.`,
    );
    const webAllowedUrls = new Set(webCommunitiesRes.sources.map((source) => source.url).filter(Boolean) as string[]);
    const webSourceList = webCommunitiesRes.sources
      .map((source, index) => `(${index + 1}) ${source.title || hostOf(source.url || '')}${source.url ? ` — ${source.url}` : ''}`)
      .join('\n');

    const byId = new Map(posts.map((post) => [post.id, post]));
    const postsDigest = posts
      .map((post) => `[${post.id}] r/${post.subreddit} ▲${post.upvotes} 💬${post.comments}${post.ageDays >= 0 ? ` ${post.ageDays}d` : ''} — ${post.title}${post.body ? `\n     ${post.body.slice(0, 220)}` : ''}`)
      .join('\n');

    const system = `You are a customer-discovery analyst for an early founder. You are given REAL Reddit posts (with stable [id]s, upvotes, comments) and a list of non-Reddit community web sources. Turn them into an actionable discovery brief.

STRICT RULES:
- Reference Reddit posts ONLY by their exact [id]. Never invent ids, usernames, or URLs.
- For non-Reddit communities, the "url" MUST come from the WEB SOURCES list (omit url if unsure).
- "category" must be one of: pain_point, solution_request, money_talk, seeking_alternatives, hot_discussion.
- For peopleIds, pick posts that are clearly ONE person expressing a pain or seeking a solution.
- Be specific and practical. No generic filler.

Return ONLY JSON:
{
  "threadEnrichments": [{ "id": "<post id>", "category": "<category>", "outreachAngle": "string" }],
  "painPoints": [{ "label": "short name", "summary": "1-2 sentences", "intensity": 1-5, "threadIds": ["<post id>"] }],
  "peopleIds": ["<post id>"],
  "communities": [{ "name": "string", "platform": "Slack|Discord|Forum|Facebook|LinkedIn|Other", "url": "string", "whyRelevant": "string", "howToEngage": "string" }],
  "dmTemplate": "short respectful outreach message using {{subreddit}}"
}`;

    const userPrompt = `PRODUCT: ${productName || '(n/a)'}
TARGET AUDIENCE: ${targetAudience || '(n/a)'}
PROBLEM/PAIN: ${problem || '(n/a)'}

REDDIT POSTS:
${postsDigest}

WEB SOURCES:
${webSourceList || '(none)'}`;

    let parsed: any = {};
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
    if (openaiApiKey) {
      try {
        parsed = await callOpenAIJson(openaiApiKey, system, userPrompt, 3500);
      } catch (error) {
        console.warn('pmf-customer-discovery: structuring failed; using deterministic Reddit output', error);
      }
    } else {
      console.warn('pmf-customer-discovery: OPENAI_API_KEY missing; using deterministic Reddit output');
    }

    const enrichMap = new Map<string, { category: string; outreachAngle: string }>();
    for (const enrichment of (Array.isArray(parsed.threadEnrichments) ? parsed.threadEnrichments : [])) {
      if (enrichment && typeof enrichment.id === 'string' && byId.has(enrichment.id)) {
        enrichMap.set(enrichment.id, {
          category: VALID_CATEGORIES.includes(enrichment.category) ? enrichment.category : 'hot_discussion',
          outreachAngle: typeof enrichment.outreachAngle === 'string' ? enrichment.outreachAngle : '',
        });
      }
    }

    const threads = posts.map((post) => ({
      id: post.id,
      title: post.title,
      snippet: (post.body || '').slice(0, 280),
      url: post.permalink,
      subreddit: post.subreddit,
      upvotes: post.upvotes,
      comments: post.comments,
      ageDays: post.ageDays,
      author: post.author,
      category: enrichMap.get(post.id)?.category || 'hot_discussion',
      outreachAngle: enrichMap.get(post.id)?.outreachAngle || '',
    }));

    const painPoints = (Array.isArray(parsed.painPoints) ? parsed.painPoints : [])
      .map((painPoint: any) => {
        const ids = (Array.isArray(painPoint.threadIds) ? painPoint.threadIds : []).filter((id: string) => byId.has(id));
        const totalEngagement = ids.reduce((sum: number, id: string) => {
          const post = byId.get(id)!;
          return sum + post.upvotes + post.comments;
        }, 0);
        const example = ids.length ? byId.get(ids[0])! : null;
        return {
          label: String(painPoint.label || '').slice(0, 120),
          summary: String(painPoint.summary || '').slice(0, 400),
          intensity: Math.max(1, Math.min(5, Number(painPoint.intensity) || 3)),
          threadCount: ids.length,
          totalEngagement,
          exampleQuote: example ? example.title : '',
          threadIds: ids,
        };
      })
      .filter((painPoint: any) => painPoint.label && painPoint.threadCount > 0)
      .sort((a: any, b: any) => b.totalEngagement - a.totalEngagement);

    const requestedPeopleIds: string[] = Array.isArray(parsed.peopleIds) ? parsed.peopleIds : [];
    const categoryByPostId = new Map(Array.from(enrichMap.entries()).map(([id, enrichment]) => [id, enrichment.category]));
    const people = buildDeterministicPeople(posts, requestedPeopleIds, categoryByPostId);

    if (!hasUsableDiscoveryOutput(threads, people)) {
      throw new DiscoveryFailure(
        'No usable people-to-contact leads were found. Try a broader description; no credits were used.',
        'NO_USABLE_LEADS',
        'generation',
        422,
        false,
        sourceState,
      );
    }

    const redditCommunities = topSubs.map((subreddit) => ({
      name: `r/${subreddit.name}`,
      platform: 'Reddit',
      source: 'reddit',
      subscribers: subreddit.subscribers,
      url: subreddit.url,
      whyRelevant: subreddit.description || `${subreddit.subscribers.toLocaleString()} members discussing ${topic}.`,
      howToEngage: 'Search this subreddit for your problem, answer questions genuinely, and share useful resources before mentioning your product.',
    }));
    const webCommunities = (Array.isArray(parsed.communities) ? parsed.communities : [])
      .map((community: any) => ({
        name: String(community.name || '').slice(0, 120),
        platform: String(community.platform || 'Other'),
        source: 'web',
        url: typeof community.url === 'string' && webAllowedUrls.has(community.url) ? community.url : undefined,
        whyRelevant: String(community.whyRelevant || '').slice(0, 300),
        howToEngage: String(community.howToEngage || '').slice(0, 300),
      }))
      .filter((community: any) => community.name);
    const communities = [...redditCommunities, ...webCommunities];
    const dmTemplate = typeof parsed.dmTemplate === 'string' ? parsed.dmTemplate : '';
    const sourceMeta = {
      redditAvailable: true,
      redditStatus: sourceState.status,
      redditThreads: threads.length,
      subreddits: topSubs.length,
      webCommunities: webCommunities.length,
      peopleCount: people.length,
    };

    const { data: stored, error: storeError } = await supabase
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
        search_meta: { dmTemplate, operationId },
        source_meta: sourceMeta,
      })
      .select('id')
      .single();
    if (storeError || !stored) {
      console.error('pmf-customer-discovery: persistence failed', storeError);
      throw new DiscoveryFailure('Could not save the discovery results.', 'DISCOVERY_PERSISTENCE_FAILED', 'persistence', 500, true, sourceState);
    }

    const creditCost = CREDIT_COSTS.PMF_DISCOVERY;
    const creditResult = await checkAndDeductCredits(
      user.id,
      creditCost,
      'PMF Customer Discovery',
      undefined,
      { entitlementFeature: 'PMF_DISCOVERY', idempotencyKey: operationId },
    );
    if (!creditResult.success) {
      const { error: cleanupError } = await supabase
        .from('pmf_customer_discovery' as any)
        .delete()
        .eq('id', (stored as any).id)
        .eq('user_id', user.id);
      if (cleanupError) {
        console.error('pmf-customer-discovery: failed to remove uncharged result', cleanupError);
      }
      await emitDiscovery('pmf_customer_discovery_failed', {
        stage: 'credits',
        error_code: creditResult.errorCode || 'CREDIT_DEDUCTION_FAILED',
        reddit_status: sourceState.status,
        threads: threads.length,
        people: people.length,
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

    const balanceAfter = totalAvailableCredits(creditResult.newBalance, creditResult.newQuota);
    await emitDiscovery('pmf_customer_discovery_completed', {
      reddit_status: sourceState.status,
      threads: threads.length,
      pain_points: painPoints.length,
      people: people.length,
      communities: communities.length,
      charged_credits: chargedCredits,
      balance_after: balanceAfter,
      persisted: true,
    });

    return jsonResponse({
      success: true,
      id: (stored as any).id,
      communities,
      threads,
      painPoints,
      people,
      dmTemplate,
      sourceMeta,
      creditsUsed: chargedCredits,
      newBalance: balanceAfter,
      walletBalance: creditResult.newBalance ?? 0,
      monthlyQuota: creditResult.newQuota ?? 0,
    });
  } catch (error) {
    const failure = error instanceof DiscoveryFailure
      ? error
      : new DiscoveryFailure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'DISCOVERY_FAILED',
        'generation',
        500,
        true,
        sourceState,
      );
    let refunded = false;
    if (userId && chargedCredits > 0) {
      refunded = await refundCredits(
        userId,
        chargedCredits,
        'PMF Customer Discovery',
        'Refund: customer discovery did not complete',
        { errorCode: failure.errorCode, stage: failure.stage, operationId },
      );
    }
    const compensationFailed = chargedCredits > 0 && !refunded;
    if (compensationFailed) {
      console.error('pmf-customer-discovery: critical refund failure', {
        userId,
        operationId,
        chargedCredits,
        errorCode: failure.errorCode,
      });
    }

    await emitDiscovery('pmf_customer_discovery_failed', {
      stage: failure.stage,
      error_code: compensationFailed ? 'DISCOVERY_REFUND_FAILED' : failure.errorCode,
      reddit_status: failure.sourceState?.status || sourceState.status,
      reddit_http_status: failure.sourceState?.httpStatus,
      charged_credits: chargedCredits,
      refunded,
      retryable: failure.retryable,
    });

    console.error('Error in pmf-customer-discovery:', {
      operationId,
      errorCode: failure.errorCode,
      stage: failure.stage,
      sourceStatus: failure.sourceState?.status || sourceState.status,
    });
    return jsonResponse({
      success: false,
      error: compensationFailed
        ? 'Discovery failed and the automatic credit refund needs support review.'
        : failure.message,
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
