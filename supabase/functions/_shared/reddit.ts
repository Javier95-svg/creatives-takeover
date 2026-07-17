// Reddit data layer for evidence-rich customer discovery.
// OAuth is required: anonymous Reddit traffic is not reliable from edge datacenters.

const USER_AGENT = "CreativesTakeover-PMFLab/1.0 (Customer Discovery)";

export type RedditClientStatus =
  | "missing_credentials"
  | "authentication_failed"
  | "rate_limited"
  | "api_unavailable"
  | "available";

export interface RedditSourceState {
  status: RedditClientStatus;
  httpStatus?: number;
  reason?: string;
}

export interface RedditPost {
  id: string;
  title: string;
  body: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  permalink: string;
  author: string;
  createdUtc: number;
  ageDays: number;
}

export interface RedditSubreddit {
  name: string;
  title: string;
  subscribers: number;
  url: string;
  description: string;
}

export interface SearchOptions {
  subreddit?: string;
  sort?: "relevance" | "top" | "new" | "comments" | "hot";
  time?: "hour" | "day" | "week" | "month" | "year" | "all";
  limit?: number;
}

export interface RedditClient {
  readonly sourceState: RedditSourceState;
  searchReddit(query: string, opts?: SearchOptions): Promise<RedditPost[]>;
  discoverSubreddits(query: string, limit?: number): Promise<RedditSubreddit[]>;
}

type TokenResult = { token: string | null; state: RedditSourceState };

async function getAppToken(clientId: string, clientSecret: string): Promise<TokenResult> {
  try {
    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${clientId}:${clientSecret}`),
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) {
      const status: RedditClientStatus = res.status === 429
        ? "rate_limited"
        : res.status === 401 || res.status === 403
          ? "authentication_failed"
          : "api_unavailable";
      console.warn("reddit: OAuth token request failed", { status: res.status, sourceStatus: status });
      return { token: null, state: { status, httpStatus: res.status, reason: "oauth_token_request_failed" } };
    }
    const json = await res.json();
    const token = typeof json?.access_token === "string" ? json.access_token : null;
    if (!token) {
      console.warn("reddit: OAuth response did not include an access token");
      return { token: null, state: { status: "authentication_failed", reason: "oauth_token_missing" } };
    }
    return { token, state: { status: "available" } };
  } catch (error) {
    console.warn("reddit: OAuth token request error", error);
    return { token: null, state: { status: "api_unavailable", reason: "oauth_network_error" } };
  }
}

function toPost(child: any): RedditPost | null {
  const d = child?.data;
  if (!d || !d.title) return null;
  const createdUtc = Number(d.created_utc) || 0;
  const ageDays = createdUtc ? Math.max(0, Math.floor((Date.now() / 1000 - createdUtc) / 86400)) : -1;
  return {
    id: String(d.id ?? ""),
    title: String(d.title),
    body: String(d.selftext || "").slice(0, 1200),
    subreddit: String(d.subreddit || ""),
    upvotes: Number(d.ups ?? d.score ?? 0) || 0,
    comments: Number(d.num_comments ?? 0) || 0,
    permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : String(d.url || ""),
    author: String(d.author || ""),
    createdUtc,
    ageDays,
  };
}

export async function createRedditClient(): Promise<RedditClient> {
  const clientId = Deno.env.get("REDDIT_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("REDDIT_CLIENT_SECRET")?.trim();
  const state: RedditSourceState = { status: "missing_credentials", reason: "reddit_oauth_not_configured" };

  let token: string | null = null;
  if (clientId && clientSecret) {
    const tokenResult = await getAppToken(clientId, clientSecret);
    token = tokenResult.token;
    Object.assign(state, tokenResult.state);
  }

  const headers: Record<string, string> = token
    ? { "User-Agent": USER_AGENT, "Authorization": `Bearer ${token}` }
    : { "User-Agent": USER_AGENT };

  const fetchChildren = async (url: string): Promise<any[]> => {
    if (!token) return [];
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        state.status = res.status === 429
          ? "rate_limited"
          : res.status === 401 || res.status === 403
            ? "authentication_failed"
            : "api_unavailable";
        state.httpStatus = res.status;
        state.reason = "reddit_api_request_failed";
        console.warn("reddit: API request failed", { status: res.status, sourceStatus: state.status });
        return [];
      }
      const data = await res.json();
      const children = data?.data?.children;
      if (Array.isArray(children)) {
        state.status = "available";
        delete state.httpStatus;
        delete state.reason;
        return children;
      }
      state.status = "api_unavailable";
      state.reason = "reddit_api_invalid_payload";
      return [];
    } catch (error) {
      state.status = "api_unavailable";
      state.reason = "reddit_api_network_error";
      console.warn("reddit: API request error", error);
      return [];
    }
  };

  return {
    get sourceState() {
      return { ...state };
    },

    async searchReddit(query: string, opts: SearchOptions = {}): Promise<RedditPost[]> {
      const { subreddit, sort = "relevance", time = "year", limit = 25 } = opts;
      const params = new URLSearchParams({
        q: query,
        sort,
        t: time,
        limit: String(limit),
        raw_json: "1",
      });
      let url: string;
      if (subreddit) {
        params.set("restrict_sr", "1");
        url = `https://oauth.reddit.com/r/${encodeURIComponent(subreddit)}/search?${params.toString()}`;
      } else {
        url = `https://oauth.reddit.com/search?${params.toString()}`;
      }
      const children = await fetchChildren(url);
      return children.map(toPost).filter((post): post is RedditPost => post !== null);
    },

    async discoverSubreddits(query: string, limit = 10): Promise<RedditSubreddit[]> {
      const params = new URLSearchParams({ q: query, limit: String(limit), raw_json: "1" });
      const children = await fetchChildren(`https://oauth.reddit.com/subreddits/search?${params.toString()}`);
      return children
        .map((child: any): RedditSubreddit | null => {
          const d = child?.data;
          if (!d?.display_name) return null;
          return {
            name: String(d.display_name),
            title: String(d.title || d.display_name),
            subscribers: Number(d.subscribers ?? 0) || 0,
            url: `https://www.reddit.com/r/${d.display_name}`,
            description: String(d.public_description || "").slice(0, 300),
          };
        })
        .filter((subreddit): subreddit is RedditSubreddit => subreddit !== null);
    },
  };
}
