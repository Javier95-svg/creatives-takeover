export interface PostLink {
  start: number;
  end: number;
  text: string;
  href: string;
}

/** Recognize web links without interpreting post text as HTML. */
export function getPostLinks(content: string): PostLink[] {
  const links: PostLink[] = [];
  for (const match of content.matchAll(/\[((?:\\.|[^\]\\\n])+)\]\((https?:\/\/[^\s<>()]+)\)/gi)) {
    const href = normalizePostUrl(match[2]);
    if (href) links.push({
      start: match.index!, end: match.index! + match[0].length,
      text: match[1].replace(/\\([\\[\]])/g, '$1'), href,
    });
  }
  for (const match of content.matchAll(/\b(?:https?:\/\/|www\.)[^\s<>"`]+/gi)) {
    if (links.some((link) => match.index! >= link.start && match.index! < link.end)) continue;
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
  return links.sort((a, b) => a.start - b.start);
}

export function normalizePostUrl(value: string): string | null {
  try {
    const url = new URL(/^www\./i.test(value.trim()) ? `https://${value.trim()}` : value.trim());
    return ['https:', 'http:'].includes(url.protocol) && url.hostname && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function insertPostLink(content: string, label: string, href: string, start: number, end: number) {
  const url = normalizePostUrl(href);
  if (!url || !label.trim() || /[\r\n]/.test(label)) return null;
  const escapedLabel = label.trim().replace(/[\\[\]]/g, '\\$&');
  const safeUrl = url.replace(/\(/g, '%28').replace(/\)/g, '%29');
  const inserted = `[${escapedLabel}](${safeUrl})`;
  return { text: content.slice(0, start) + inserted + content.slice(end), cursor: start + inserted.length };
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
