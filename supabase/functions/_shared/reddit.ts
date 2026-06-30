// Reddit data layer for evidence-rich customer discovery.
// Returns real posts (upvotes, comments, permalinks, authors) and subreddits.
// Uses app-only OAuth when REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET are set (more reliable
// from datacenter IPs), otherwise the public *.json endpoints. Every call is best-effort:
// on a block/error it returns [] and leaves `available` false so callers can degrade.

const USER_AGENT = "CreativesTakeover-PMFLab/1.0 (Customer Discovery)";

export interface RedditPost {
  id: string;
  title: string;
  body: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  permalink: string; // absolute URL
  author: string;
  createdUtc: number;
  ageDays: number;
}

export interface RedditSubreddit {
  name: string; // display_name, without "r/"
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
  readonly available: boolean;
  searchReddit(query: string, opts?: SearchOptions): Promise<RedditPost[]>;
  discoverSubreddits(query: string, limit?: number): Promise<RedditSubreddit[]>;
}

async function getAppToken(clientId: string, clientSecret: string): Promise<string | null> {
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
      console.warn("reddit: token request failed", res.status);
      return null;
    }
    const json = await res.json();
    return json?.access_token ?? null;
  } catch (e) {
    console.warn("reddit: token request error", e);
    return null;
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
  const clientId = Deno.env.get("REDDIT_CLIENT_ID");
  const clientSecret = Deno.env.get("REDDIT_CLIENT_SECRET");

  let token: string | null = null;
  if (clientId && clientSecret) {
    token = await getAppToken(clientId, clientSecret);
  }
  const base = token ? "https://oauth.reddit.com" : "https://www.reddit.com";
  const suffix = token ? "" : ".json";
  const headers: Record<string, string> = token
    ? { "User-Agent": USER_AGENT, "Authorization": `Bearer ${token}` }
    : { "User-Agent": USER_AGENT };

  const state = { available: false };

  const fetchChildren = async (url: string): Promise<any[]> => {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.warn("reddit: fetch non-ok", res.status, url);
        return [];
      }
      const data = await res.json();
      const children = data?.data?.children;
      if (Array.isArray(children)) {
        state.available = true;
        return children;
      }
      return [];
    } catch (e) {
      console.warn("reddit: fetch error", url, e);
      return [];
    }
  };

  return {
    get available() {
      return state.available;
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
        url = `${base}/r/${encodeURIComponent(subreddit)}/search${suffix}?${params.toString()}`;
      } else {
        url = `${base}/search${suffix}?${params.toString()}`;
      }
      const children = await fetchChildren(url);
      return children.map(toPost).filter((p): p is RedditPost => p !== null);
    },

    async discoverSubreddits(query: string, limit = 10): Promise<RedditSubreddit[]> {
      const params = new URLSearchParams({ q: query, limit: String(limit), raw_json: "1" });
      const url = `${base}/subreddits/search${suffix}?${params.toString()}`;
      const children = await fetchChildren(url);
      return children
        .map((c: any): RedditSubreddit | null => {
          const d = c?.data;
          if (!d?.display_name) return null;
          return {
            name: String(d.display_name),
            title: String(d.title || d.display_name),
            subscribers: Number(d.subscribers ?? 0) || 0,
            url: `https://www.reddit.com/r/${d.display_name}`,
            description: String(d.public_description || "").slice(0, 300),
          };
        })
        .filter((s): s is RedditSubreddit => s !== null);
    },
  };
}
