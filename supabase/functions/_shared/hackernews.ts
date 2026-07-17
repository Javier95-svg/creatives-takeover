// Hacker News source adapter for customer discovery.
// Uses the free, unauthenticated Algolia HN Search API and maps stories into
// the same post shape the Reddit pipeline ranks, so downstream scoring,
// people extraction, and lead finalization stay source-agnostic.

import type { RedditPost } from './reddit.ts';
import type { DiscoveryTimeRange } from './pmf-discovery-search.ts';

const HN_API = 'https://hn.algolia.com/api/v1/search';
const DAY_SECONDS = 86_400;

export interface HackerNewsSearchOptions {
  limit?: number;
  timeRange?: DiscoveryTimeRange;
  deadlineAt?: number;
}

interface AlgoliaHit {
  objectID?: string;
  title?: string;
  story_text?: string | null;
  author?: string;
  points?: number;
  num_comments?: number;
  created_at_i?: number;
}

const stripHtml = (value: string) => value
  .replace(/<[^>]+>/g, ' ')
  .replace(/&(?:amp|lt|gt|quot|#x27|#39|nbsp);/g, (entity) => ({
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&nbsp;': ' ',
  }[entity] || ' '))
  .replace(/\s+/g, ' ')
  .trim();

export function mapHackerNewsHit(hit: AlgoliaHit, nowMs = Date.now()): RedditPost | null {
  const id = String(hit?.objectID || '').trim();
  const title = String(hit?.title || '').trim();
  const author = String(hit?.author || '').trim();
  if (!id || !title || !author) return null;
  const createdUtc = Number(hit.created_at_i) || 0;
  const ageDays = createdUtc ? Math.max(0, Math.floor((nowMs / 1000 - createdUtc) / DAY_SECONDS)) : -1;
  return {
    id: `hn-${id}`,
    title,
    body: stripHtml(String(hit.story_text || '')).slice(0, 1200),
    subreddit: '',
    upvotes: Math.max(0, Number(hit.points) || 0),
    comments: Math.max(0, Number(hit.num_comments) || 0),
    permalink: `https://news.ycombinator.com/item?id=${id}`,
    author,
    createdUtc,
    ageDays,
    source: 'hackernews',
  };
}

/**
 * Search Hacker News stories (including Ask HN). Failures return an empty
 * array — HN is a best-effort supplementary source and must never fail a scan.
 */
export async function searchHackerNews(query: string, options: HackerNewsSearchOptions = {}): Promise<RedditPost[]> {
  const { limit = 15, timeRange = 'year', deadlineAt } = options;
  const budget = deadlineAt ? Math.min(6000, deadlineAt - Date.now()) : 6000;
  if (budget < 250) return [];

  const params = new URLSearchParams({
    query: query.slice(0, 200),
    tags: 'story',
    hitsPerPage: String(Math.max(1, Math.min(limit, 30))),
  });
  if (timeRange !== 'all') {
    const windowDays = timeRange === 'month' ? 30 : 365;
    params.set('numericFilters', `created_at_i>${Math.floor(Date.now() / 1000) - windowDays * DAY_SECONDS}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget);
  try {
    const response = await fetch(`${HN_API}?${params.toString()}`, { signal: controller.signal });
    if (!response.ok) return [];
    const json = await response.json();
    const hits: AlgoliaHit[] = Array.isArray(json?.hits) ? json.hits : [];
    return hits
      .map((hit) => mapHackerNewsHit(hit))
      .filter((post): post is RedditPost => post !== null);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
