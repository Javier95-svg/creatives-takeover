// Reddit data layer for evidence-rich customer discovery.
// OAuth is required: anonymous Reddit traffic is not reliable from edge datacenters.

import { fetchWithRetry } from './api-retry.ts';

const USER_AGENT = 'CreativesTakeover-PMFLab/1.0 (Customer Discovery)';

export type RedditClientStatus =
  | 'missing_credentials'
  | 'authentication_failed'
  | 'rate_limited'
  | 'api_unavailable'
  | 'available';

export interface RedditSourceState {
  status: RedditClientStatus;
  httpStatus?: number;
  reason?: string;
}

export interface RedditRequestDiagnostic {
  kind: 'oauth' | 'subreddit_discovery' | 'search';
  status: RedditClientStatus;
  httpStatus?: number;
  reason?: string;
  attempts: number;
  retries: number;
  durationMs: number;
}

export interface RedditDiagnostics {
  requestsAttempted: number;
  requestsSucceeded: number;
  requestsFailed: number;
  retryCount: number;
  partial: boolean;
  durationMs: number;
  requests: RedditRequestDiagnostic[];
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
  /** Originating network; downstream ranking/people code is source-agnostic. */
  source?: 'reddit' | 'hackernews';
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
  sort?: 'relevance' | 'top' | 'new' | 'comments' | 'hot';
  time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  limit?: number;
}

export interface RedditClient {
  readonly sourceState: RedditSourceState;
  readonly diagnostics: RedditDiagnostics;
  searchReddit(query: string, opts?: SearchOptions): Promise<RedditPost[]>;
  discoverSubreddits(query: string, limit?: number): Promise<RedditSubreddit[]>;
}

export interface RedditClientOptions {
  deadlineAt?: number;
}

type TokenResult = { token: string | null; state: RedditSourceState; diagnostic?: RedditRequestDiagnostic };

const stateForStatus = (status?: number, reason = 'reddit_request_failed'): RedditSourceState => ({
  status: status === 429
    ? 'rate_limited'
    : status === 401 || status === 403
      ? 'authentication_failed'
      : 'api_unavailable',
  ...(status ? { httpStatus: status } : {}),
  reason,
});

const statusFromError = (error: any) => Number(error?.status || error?.response?.status) || undefined;

const retryOptions = (onRetry: () => void) => ({
  maxAttempts: 3,
  initialDelay: 500,
  maxDelay: 4000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504],
  respectRetryAfter: true,
  jitterRatio: 0.2,
  onRetry,
});

const boundedTimeout = (deadlineAt: number | undefined, preferred: number) => {
  if (!deadlineAt) return preferred;
  return Math.max(250, Math.min(preferred, deadlineAt - Date.now()));
};

async function getAppToken(clientId: string, clientSecret: string, deadlineAt?: number): Promise<TokenResult> {
  const startedAt = Date.now();
  let retries = 0;
  try {
    const res = await fetchWithRetry('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: 'grant_type=client_credentials',
      timeout: boundedTimeout(deadlineAt, 8000),
      retryOptions: retryOptions(() => { retries += 1; }),
    });
    if (!res.ok) {
      const state = stateForStatus(res.status, 'oauth_token_request_failed');
      console.warn('reddit: OAuth token request failed', { status: res.status, sourceStatus: state.status });
      return {
        token: null,
        state,
        diagnostic: { kind: 'oauth', ...state, attempts: retries + 1, retries, durationMs: Date.now() - startedAt },
      };
    }
    const json = await res.json();
    const token = typeof json?.access_token === 'string' ? json.access_token : null;
    if (!token) {
      const state: RedditSourceState = { status: 'authentication_failed', reason: 'oauth_token_missing' };
      return {
        token: null,
        state,
        diagnostic: { kind: 'oauth', ...state, attempts: retries + 1, retries, durationMs: Date.now() - startedAt },
      };
    }
    const state: RedditSourceState = { status: 'available' };
    return {
      token,
      state,
      diagnostic: { kind: 'oauth', ...state, attempts: retries + 1, retries, durationMs: Date.now() - startedAt },
    };
  } catch (error) {
    const errorStatus = statusFromError(error);
    const state = stateForStatus(errorStatus, errorStatus ? 'oauth_token_request_failed' : error?.timeout ? 'oauth_timeout' : 'oauth_network_error');
    console.warn('reddit: OAuth token request error', { sourceStatus: state.status, reason: state.reason });
    return {
      token: null,
      state,
      diagnostic: { kind: 'oauth', ...state, attempts: retries + 1, retries, durationMs: Date.now() - startedAt },
    };
  }
}

function toPost(child: any): RedditPost | null {
  const d = child?.data;
  if (!d || !d.title) return null;
  const createdUtc = Number(d.created_utc) || 0;
  const ageDays = createdUtc ? Math.max(0, Math.floor((Date.now() / 1000 - createdUtc) / 86400)) : -1;
  return {
    id: String(d.id ?? ''),
    title: String(d.title),
    body: String(d.selftext || '').slice(0, 1200),
    subreddit: String(d.subreddit || ''),
    upvotes: Number(d.ups ?? d.score ?? 0) || 0,
    comments: Number(d.num_comments ?? 0) || 0,
    permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : String(d.url || ''),
    author: String(d.author || ''),
    createdUtc,
    ageDays,
    source: 'reddit',
  };
}

export async function createRedditClient(options: RedditClientOptions = {}): Promise<RedditClient> {
  const clientId = Deno.env.get('REDDIT_CLIENT_ID')?.trim();
  const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET')?.trim();
  let authState: RedditSourceState = { status: 'missing_credentials', reason: 'reddit_oauth_not_configured' };
  const requests: RedditRequestDiagnostic[] = [];
  const clientStartedAt = Date.now();

  let token: string | null = null;
  if (clientId && clientSecret) {
    const tokenResult = await getAppToken(clientId, clientSecret, options.deadlineAt);
    token = tokenResult.token;
    authState = tokenResult.state;
    if (tokenResult.diagnostic) requests.push(tokenResult.diagnostic);
  }

  const headers: Record<string, string> = token
    ? { 'User-Agent': USER_AGENT, 'Authorization': `Bearer ${token}` }
    : { 'User-Agent': USER_AGENT };

  const aggregateState = (): RedditSourceState => {
    if (!token) return { ...authState };
    const sourceRequests = requests.filter((request) => request.kind !== 'oauth');
    if (sourceRequests.some((request) => request.status === 'available')) return { status: 'available' };
    const failed = sourceRequests.at(-1);
    return failed ? { status: failed.status, httpStatus: failed.httpStatus, reason: failed.reason } : { status: 'available' };
  };

  const diagnostics = (): RedditDiagnostics => {
    const sourceRequests = requests.filter((request) => request.kind !== 'oauth');
    const succeeded = sourceRequests.filter((request) => request.status === 'available').length;
    const failed = sourceRequests.length - succeeded;
    return {
      requestsAttempted: sourceRequests.length,
      requestsSucceeded: succeeded,
      requestsFailed: failed,
      retryCount: requests.reduce((sum, request) => sum + request.retries, 0),
      partial: succeeded > 0 && failed > 0,
      durationMs: Date.now() - clientStartedAt,
      requests: requests.map((request) => ({ ...request })),
    };
  };

  const fetchChildren = async (url: string, kind: RedditRequestDiagnostic['kind']): Promise<any[]> => {
    if (!token) return [];
    const startedAt = Date.now();
    let retries = 0;
    let state: RedditSourceState = { status: 'available' };
    try {
      if (options.deadlineAt && Date.now() >= options.deadlineAt) throw Object.assign(new Error('Discovery deadline exceeded'), { timeout: true });
      const res = await fetchWithRetry(url, {
        headers,
        timeout: boundedTimeout(options.deadlineAt, 10000),
        retryOptions: retryOptions(() => { retries += 1; }),
      });
      if (!res.ok) {
        state = stateForStatus(res.status, 'reddit_api_request_failed');
        return [];
      }
      const data = await res.json();
      const children = data?.data?.children;
      if (!Array.isArray(children)) {
        state = { status: 'api_unavailable', reason: 'reddit_api_invalid_payload' };
        return [];
      }
      return children;
    } catch (error) {
      const errorStatus = statusFromError(error);
      state = stateForStatus(errorStatus, errorStatus ? 'reddit_api_request_failed' : error?.timeout ? 'reddit_api_timeout' : 'reddit_api_network_error');
      return [];
    } finally {
      requests.push({ kind, ...state, attempts: retries + 1, retries, durationMs: Date.now() - startedAt });
      if (state.status !== 'available') {
        console.warn('reddit: API request failed', { sourceStatus: state.status, httpStatus: state.httpStatus, reason: state.reason });
      }
    }
  };

  return {
    get sourceState() {
      return aggregateState();
    },
    get diagnostics() {
      return diagnostics();
    },
    async searchReddit(query: string, opts: SearchOptions = {}): Promise<RedditPost[]> {
      const { subreddit, sort = 'relevance', time = 'year', limit = 25 } = opts;
      const params = new URLSearchParams({ q: query, sort, t: time, limit: String(limit), raw_json: '1' });
      let url: string;
      if (subreddit) {
        params.set('restrict_sr', '1');
        url = `https://oauth.reddit.com/r/${encodeURIComponent(subreddit)}/search?${params.toString()}`;
      } else {
        url = `https://oauth.reddit.com/search?${params.toString()}`;
      }
      const children = await fetchChildren(url, 'search');
      return children.map(toPost).filter((post): post is RedditPost => post !== null);
    },
    async discoverSubreddits(query: string, limit = 10): Promise<RedditSubreddit[]> {
      const params = new URLSearchParams({ q: query, limit: String(limit), raw_json: '1' });
      const children = await fetchChildren(`https://oauth.reddit.com/subreddits/search?${params.toString()}`, 'subreddit_discovery');
      return children
        .map((child: any): RedditSubreddit | null => {
          const d = child?.data;
          if (!d?.display_name) return null;
          return {
            name: String(d.display_name),
            title: String(d.title || d.display_name),
            subscribers: Number(d.subscribers ?? 0) || 0,
            url: `https://www.reddit.com/r/${d.display_name}`,
            description: String(d.public_description || '').slice(0, 300),
          };
        })
        .filter((subreddit): subreddit is RedditSubreddit => subreddit !== null);
    },
  };
}
