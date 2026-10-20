export interface PostLink {
  start: number;
  end: number;
  text: string;
  href: string;
}

/** Recognize web links without interpreting post text as HTML. */
export function getPostLinks(content: string): PostLink[] {
  const links: PostLink[] = [];
  for (const match of content.matchAll(/\b(?:https?:\/\/|www\.)[^\s<>"`]+/gi)) {
    let text = match[0].replace(/[.,!?;:'\u2019\u201d]+$/, '');
    // Keep balanced parentheses in URLs, but exclude surrounding prose punctuation.
    while (/[)\]}]$/.test(text)) {
      const closing = text.charAt(text.length - 1);
      const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
      const opening = pairs[closing];
      if (text.split(closing).length <= text.split(opening).length) break;
      text = text.slice(0, -1).replace(/[.,!?;:'\u2019\u201d]+$/, '');
    }
    try {
      const url = new URL(/^www\./i.test(text) ? `https://${text}` : text);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) continue;
      links.push({ start: match.index!, end: match.index! + text.length, text, href: url.href });
    } catch { /* Keep invalid URLs as plain text. */ }
  }
  return links;
}

/** Only exact YouTube hosts and video paths can create a player. */
export function getPostYouTubeId(href: string): string | null {
  try {
    const url = new URL(href);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    else if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else id = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]+)\/?$/)?.[1] ?? null;
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
