export interface ArticleCitation {
  title: string;
  url: string;
  publisher: string;
}

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)(?:\s+["'][^"']*["'])?\)/gi;
const HTML_LINK_PATTERN = /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
const BARE_URL_PATTERN = /https?:\/\/[^\s<>)\]}"']+/gi;

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value.replace(/[.,;:!?]+$/, ""));
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function publisherFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "External source";
  }
}

function cleanLinkText(value: string): string {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function extractArticleCitations(markdown: string | null | undefined): ArticleCitation[] {
  if (!markdown) return [];

  const citations = new Map<string, ArticleCitation>();
  const addCitation = (rawUrl: string, rawTitle?: string) => {
    const url = normalizeUrl(rawUrl);
    if (!url) return;
    const hostname = publisherFromUrl(url);
    if (hostname === "creatives-takeover.com" || hostname.endsWith(".creatives-takeover.com")) return;
    if (citations.has(url)) return;
    const title = cleanLinkText(rawTitle || "") || hostname;
    citations.set(url, { title, url, publisher: hostname });
  };

  for (const match of markdown.matchAll(MARKDOWN_LINK_PATTERN)) {
    addCitation(match[2], match[1]);
  }
  for (const match of markdown.matchAll(HTML_LINK_PATTERN)) {
    addCitation(match[1], match[2]);
  }
  for (const match of markdown.matchAll(BARE_URL_PATTERN)) {
    addCitation(match[0]);
  }

  return [...citations.values()];
}

export function hasQuantitativeClaims(markdown: string | null | undefined): boolean {
  if (!markdown) return false;
  return /(?:\b\d+(?:\.\d+)?%|[$€£]\s?\d|\b\d{1,3}(?:,\d{3})+\b|\b\d+(?:\.\d+)?\s*(?:thousand|million|billion|users?|customers?|founders?|startups?|companies|hours?|days?|weeks?|months?|years?)\b)/i.test(
    markdown,
  );
}

export function getArticleCitationStatus(markdown: string | null | undefined) {
  const citations = extractArticleCitations(markdown);
  const containsQuantitativeClaims = hasQuantitativeClaims(markdown);
  return {
    citations,
    containsQuantitativeClaims,
    needsSourceWarning: containsQuantitativeClaims && citations.length === 0,
  };
}
