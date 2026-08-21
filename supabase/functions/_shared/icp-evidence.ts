/**
 * Evidence retrieval for the ICP Draft.
 *
 * This replaces a cross-invoke of market-validation-engine, which could not
 * serve the path that needs it most. That function requires an authenticated
 * user and deducts 10 credits, so every logged-out Hero submission got a 401
 * and generated its draft with zero sources. It also searched a fixed list of
 * six founder subreddits, so the "customer discussions" it returned were
 * founders talking about business ideas rather than the customer speaking, and
 * its competitor list was model-generated with no URL field at all.
 *
 * Everything here is retrieval only: no credits, no auth, no model call. It
 * composes the search stack already built for PMF Discovery (Reddit OAuth
 * client, deterministic query construction, deterministic ranking) rather than
 * introducing a second one.
 */

import { createRedditClient, type RedditPost, type RedditSourceState } from "./reddit.ts";
import { buildDiscoveryQueries, rankDiscoveryPosts } from "./pmf-discovery-search.ts";
import type { DraftSource } from "./icp-draft.ts";

export interface IcpEvidenceInput {
  description: string;
  audienceHint?: string;
  /** Wall-clock budget shared with the caller's own deadline. */
  deadlineAt: number;
  supabaseUrl: string;
  serviceRoleKey: string;
}

export interface IcpEvidenceResult {
  sources: DraftSource[];
  competitors: Array<{ name: string; url: string | null }>;
  marketSignals: string[];
  diagnostics: {
    reddit: RedditSourceState;
    redditPostsConsidered: number;
    webSearch: "available" | "unavailable" | "not_configured";
    durationMs: number;
  };
}

const MAX_COMMUNITY_SOURCES = 5;
const MAX_COMPETITOR_SOURCES = 4;
/** Below this rank score a post is noise, and citing noise is worse than citing nothing. */
const MIN_RANK_SCORE = 35;

function emptyResult(reddit: RedditSourceState, startedAt: number): IcpEvidenceResult {
  return {
    sources: [],
    competitors: [],
    marketSignals: [],
    diagnostics: {
      reddit,
      redditPostsConsidered: 0,
      webSearch: "unavailable",
      durationMs: Date.now() - startedAt,
    },
  };
}

/**
 * Search all of Reddit for the customer's own words about this problem.
 *
 * Deliberately unscoped to any subreddit: `buildDiscoveryQueries` produces
 * pain, shopping, switching and money-intent phrasings, and letting Reddit's
 * own relevance ranking choose the community is what surfaces the customer's
 * forum instead of a founder forum.
 */
async function gatherCommunityEvidence(
  input: IcpEvidenceInput,
): Promise<{ posts: RedditPost[]; ranked: ReturnType<typeof rankDiscoveryPosts>; state: RedditSourceState }> {
  const reddit = await createRedditClient({ deadlineAt: input.deadlineAt });
  if (reddit.sourceState.status !== "available") {
    return { posts: [], ranked: [], state: reddit.sourceState };
  }

  const queries = buildDiscoveryQueries(
    {
      problem: input.description,
      targetAudience: input.audienceHint,
    },
    "problem_discovery",
  );

  const batches = await Promise.all(
    queries.slice(0, 3).map((query) =>
      reddit
        .searchReddit(query, { sort: "relevance", time: "year", limit: 25 })
        .catch(() => [] as RedditPost[]),
    ),
  );
  const posts = batches.flat();
  const ranked = rankDiscoveryPosts(posts, queries, new Set(), 12, "problem_discovery");
  return { posts, ranked, state: reddit.sourceState };
}

/**
 * Find competitors that actually exist, with a URL that can be opened.
 *
 * The previous path asked a model to list competitors from recall and then
 * presented the answer to the draft generator as retrieved evidence. Anything
 * without a resolvable URL is returned here as an unlinked name so the prompt
 * can label it unverified, and scoring can decline to count it.
 */
async function gatherCompetitorEvidence(
  input: IcpEvidenceInput,
): Promise<{ competitors: Array<{ name: string; url: string | null }>; status: IcpEvidenceResult["diagnostics"]["webSearch"] }> {
  const remainingMs = input.deadlineAt - Date.now();
  if (remainingMs <= 1500) return { competitors: [], status: "unavailable" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(remainingMs, 12000));
  try {
    const response = await fetch(`${input.supabaseUrl}/functions/v1/web-search`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${input.serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `existing products, apps or services that already solve this: ${input.description}. List the specific product names and their official websites.`,
        maxResults: MAX_COMPETITOR_SOURCES,
        searchRecency: "year",
      }),
    });

    if (!response.ok) {
      // A missing PERPLEXITY_API_KEY surfaces here as a 500. Degrade quietly:
      // a draft with community evidence and no competitor evidence is still
      // worth generating, and the diagnostics record which leg was missing.
      return { competitors: [], status: response.status === 500 ? "not_configured" : "unavailable" };
    }

    const data = await response.json() as {
      success?: boolean;
      sources?: Array<{ url?: string; title?: string; snippet?: string }>;
    };
    if (!data?.success || !Array.isArray(data.sources)) {
      return { competitors: [], status: "unavailable" };
    }

    const seen = new Set<string>();
    const competitors: Array<{ name: string; url: string | null }> = [];
    for (const source of data.sources) {
      const url = typeof source?.url === "string" && source.url.trim() ? source.url.trim() : null;
      if (!url) continue;
      let host: string;
      try {
        host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
      } catch {
        continue;
      }
      if (seen.has(host)) continue;
      seen.add(host);
      const title = typeof source?.title === "string" ? source.title.trim() : "";
      competitors.push({ name: title || host, url });
      if (competitors.length >= MAX_COMPETITOR_SOURCES) break;
    }
    return { competitors, status: "available" };
  } catch {
    return { competitors: [], status: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

export async function gatherIcpEvidence(input: IcpEvidenceInput): Promise<IcpEvidenceResult> {
  const startedAt = Date.now();
  const description = input.description.trim();
  if (!description) {
    return emptyResult({ status: "api_unavailable", reason: "empty_description" }, startedAt);
  }

  // Both legs run concurrently against one shared deadline, and either may come
  // back empty. A partial result is the normal case, not a failure.
  const [community, competition] = await Promise.all([
    gatherCommunityEvidence(input).catch(() => ({
      posts: [] as RedditPost[],
      ranked: [] as ReturnType<typeof rankDiscoveryPosts>,
      state: { status: "api_unavailable", reason: "reddit_leg_threw" } as RedditSourceState,
    })),
    gatherCompetitorEvidence(input).catch(() => ({
      competitors: [] as Array<{ name: string; url: string | null }>,
      status: "unavailable" as const,
    })),
  ]);

  const usablePosts = community.ranked.filter(
    (post) => post.rankScore >= MIN_RANK_SCORE && Boolean(post.permalink),
  ).slice(0, MAX_COMMUNITY_SOURCES);

  const sources: DraftSource[] = [
    ...usablePosts.map((post, index): DraftSource => ({
      sourceId: `community-${index + 1}`,
      type: "community",
      title: post.title,
      url: post.permalink,
      detail: [`r/${post.subreddit}`, `${post.upvotes} upvotes`, post.rankingReason]
        .filter(Boolean)
        .join(" · "),
    })),
    ...competition.competitors.map((competitor, index): DraftSource => ({
      sourceId: `competitor-${index + 1}`,
      type: "competitor",
      title: competitor.name,
      url: competitor.url,
      detail: "Competitor",
    })),
  ];

  // Signals are now summaries of what was actually retrieved, rather than a
  // model's opinion echoed back as though it were market data.
  const marketSignals = [
    ...usablePosts.slice(0, 3).map((post) => `${post.inferredCategory.replace(/_/g, " ")}: ${post.title}`),
    ...competition.competitors.slice(0, 2).map((competitor) => `Existing solution: ${competitor.name}`),
  ];

  return {
    sources,
    competitors: competition.competitors,
    marketSignals,
    diagnostics: {
      reddit: community.state,
      redditPostsConsidered: community.posts.length,
      webSearch: competition.status,
      durationMs: Date.now() - startedAt,
    },
  };
}
