// Low-confidence discovery tier: web-search results pointing at public X and
// LinkedIn posts. Surfaced as "verify manually" — never auto-converted into
// leads; handles are extracted best-effort from the URL only.

export interface ExternalMentionSource { title?: string; url?: string; snippet?: string }

export interface ExternalMention {
  platform: 'x' | 'linkedin';
  title: string;
  url: string;
  snippet?: string;
  username?: string;
}

const X_RESERVED_PATHS = new Set(['i', 'home', 'search', 'explore', 'hashtag', 'intent', 'share', 'notifications', 'messages', 'settings']);

export function toExternalMention(source: ExternalMentionSource, platform: 'x' | 'linkedin'): ExternalMention | null {
  const url = (source.url || '').trim();
  if (!url) return null;
  let host = '';
  let path = '';
  try {
    const parsed = new URL(url);
    host = parsed.hostname.replace(/^(www|mobile|m)\./, '');
    path = parsed.pathname;
  } catch {
    return null;
  }
  let username: string | undefined;
  if (platform === 'x') {
    if (host !== 'x.com' && host !== 'twitter.com') return null;
    const handle = path.match(/^\/(@?[A-Za-z0-9_]{2,15})(?:\/|$)/)?.[1]?.replace(/^@/, '');
    if (handle && !X_RESERVED_PATHS.has(handle.toLowerCase())) username = handle;
  } else {
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null;
    username = path.match(/\/in\/([A-Za-z0-9-]{3,100})/)?.[1]
      || path.match(/\/posts\/([A-Za-z0-9-]{3,100}?)_/)?.[1];
  }
  return {
    platform,
    title: (source.title || host).slice(0, 160),
    url,
    snippet: source.snippet?.slice(0, 240),
    ...(username ? { username } : {}),
  };
}
