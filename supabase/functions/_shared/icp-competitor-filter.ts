/**
 * Which web results can stand as "existing solutions" in an ICP draft.
 *
 * 2026-11-11: with search working again, a draft for a dog-groomer booking app
 * listed a Facebook video, a town's business-certificate PDF and an insurance
 * page as its three "competitors", while a real booking tool in the same
 * results was dropped. A wrong competitor is worse than none, so a result has
 * to look like a product page that is about the founder's problem. Pure, so
 * the node tests load it.
 */

export interface CompetitorCandidate {
  url?: string | null;
  title?: string | null;
  snippet?: string | null;
}

/** Social, video, Q&A and blogging hosts: posts about a market, not products in it. */
const NON_PRODUCT_HOSTS = [
  "facebook.com", "instagram.com", "tiktok.com", "youtube.com", "youtu.be", "x.com", "twitter.com",
  "linkedin.com", "pinterest.com", "reddit.com", "quora.com", "medium.com", "substack.com",
  "threads.net", "tumblr.com", "wikipedia.org", "yelp.com", "tripadvisor.com",
];

/** Government, military and education hosts, including US local ones like town.ma.us. */
const PUBLIC_SECTOR_HOST = /(^|\.)(gov|mil|edu)(\.[a-z]{2})?$|\.[a-z]{2}\.us$/;

const DOCUMENT_URL = /\.(pdf|docx?|xlsx?|pptx?|csv|txt)(\?|#|$)|\/documentcenter\//i;

/** Words that say "a product you can use" when the idea itself is software. */
const SOFTWARE_SIGNAL = /\b(app|apps|software|platform|tool|tools|saas|system|booking|scheduling|crm|dashboard|online|solution|api)\b/i;
const IDEA_IS_SOFTWARE = /\b(app|software|platform|tool|saas|website|web app|marketplace|api|dashboard|plugin|extension|bot)\b/i;

const STOPWORDS = new Set([
  "about", "after", "also", "and", "build", "building", "business", "businesses", "can", "customers",
  "every", "for", "from", "help", "helps", "into", "make", "more", "need", "needs", "only", "other",
  "people", "that", "their", "them", "they", "this", "those", "through", "using", "want", "what",
  "when", "which", "while", "who", "with", "without", "work", "works", "your", "small", "easy",
]);

/** Five-letter stems of the description's meaningful words: "groomers" and "grooming" both give "groom". */
export function keywordStems(description: string): string[] {
  const words = description.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? [];
  const stems = new Set<string>();
  for (const word of words) {
    if (STOPWORDS.has(word)) continue;
    stems.add(word.slice(0, 5));
  }
  return [...stems];
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Why a result is not a usable competitor, or null when it is. */
export function rejectCompetitor(candidate: CompetitorCandidate, description: string): string | null {
  const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
  if (!/^https?:\/\//i.test(url)) return "no_url";
  const host = hostOf(url);
  if (!host) return "bad_url";
  if (NON_PRODUCT_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) return "social_or_ugc";
  if (PUBLIC_SECTOR_HOST.test(host)) return "public_sector";
  if (DOCUMENT_URL.test(url)) return "document";

  const text = `${candidate.title ?? ""} ${candidate.snippet ?? ""}`.toLowerCase();
  const stems = keywordStems(description);
  if (stems.length > 0 && !stems.some((stem) => text.includes(stem))) return "off_topic";
  if (IDEA_IS_SOFTWARE.test(description) && !SOFTWARE_SIGNAL.test(text)) return "not_a_product";
  return null;
}

/** The short search query: what the idea is, plus words that surface product pages. */
export function competitorQuery(description: string): string {
  const core = description.replace(/\s+/g, " ").trim().slice(0, 160);
  return IDEA_IS_SOFTWARE.test(description)
    ? `${core} software alternatives`
    : `${core} companies alternatives`;
}

/** Usable competitors, one per host, in search order. */
export function selectCompetitors(
  candidates: CompetitorCandidate[],
  description: string,
  max: number,
): Array<{ name: string; url: string; snippet: string | null }> {
  const seen = new Set<string>();
  const picked: Array<{ name: string; url: string; snippet: string | null }> = [];
  for (const candidate of candidates) {
    if (rejectCompetitor(candidate, description)) continue;
    const url = String(candidate.url).trim();
    const host = hostOf(url)!;
    if (seen.has(host)) continue;
    seen.add(host);
    const title = typeof candidate.title === "string" ? candidate.title.replace(/\s+/g, " ").trim() : "";
    picked.push({
      name: (title || host).slice(0, 120),
      url,
      snippet: typeof candidate.snippet === "string" ? candidate.snippet.replace(/\s+/g, " ").trim().slice(0, 200) : null,
    });
    if (picked.length >= max) break;
  }
  return picked;
}
