export type DiscoveryPersonSource = 'reddit' | 'hackernews';

export interface DiscoveryPostCandidate {
  id: string;
  title: string;
  subreddit: string;
  permalink: string;
  author: string;
  source?: DiscoveryPersonSource;
}

export interface DiscoveryPerson {
  username: string;
  subreddit: string;
  permalink: string;
  painQuote: string;
  category: string;
  source: DiscoveryPersonSource;
  profileUrl: string;
}

const SKIP_AUTHORS = new Set(['', '[deleted]', 'automoderator']);

export const profileUrlFor = (source: DiscoveryPersonSource, username: string): string =>
  source === 'hackernews'
    ? `https://news.ycombinator.com/user?id=${encodeURIComponent(username)}`
    : `https://www.reddit.com/user/${encodeURIComponent(username)}`;

export function buildDeterministicPeople(
  posts: DiscoveryPostCandidate[],
  preferredPostIds: string[] = [],
  categoryByPostId: ReadonlyMap<string, string> = new Map(),
  limit = 12,
): DiscoveryPerson[] {
  const byId = new Map(posts.map((post) => [post.id, post]));
  const candidateIds = [...preferredPostIds, ...posts.map((post) => post.id)];
  const usedAuthors = new Set<string>();
  const people: DiscoveryPerson[] = [];

  for (const id of candidateIds) {
    const post = byId.get(id);
    if (!post) continue;
    const author = (post.author || '').trim();
    const normalizedAuthor = author.toLowerCase();
    if (SKIP_AUTHORS.has(normalizedAuthor) || usedAuthors.has(normalizedAuthor)) continue;
    usedAuthors.add(normalizedAuthor);
    const source: DiscoveryPersonSource = post.source === 'hackernews' ? 'hackernews' : 'reddit';
    people.push({
      username: author,
      subreddit: post.subreddit,
      permalink: post.permalink,
      painQuote: post.title,
      category: categoryByPostId.get(post.id) || 'pain_point',
      source,
      profileUrl: profileUrlFor(source, author),
    });
    if (people.length >= limit) break;
  }

  return people;
}

export function hasUsableDiscoveryOutput(threads: unknown[], people: unknown[]): boolean {
  return threads.length > 0 && people.length > 0;
}

export function totalAvailableCredits(balance?: number, monthlyQuota?: number): number {
  return (balance ?? 0) + (monthlyQuota ?? 0);
}
