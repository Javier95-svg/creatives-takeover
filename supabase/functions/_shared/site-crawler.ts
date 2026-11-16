/**
 * Reads a small number of public pages from one website, safely.
 *
 * Same guard as project-import-extract: only public host names, the DNS answer
 * re-checked for private addresses on every redirect, a byte cap and a timeout
 * per page. On top of that it picks up to `maxPages - 1` internal pages from the
 * homepage's own links (about, pricing, product, customers, contact), honours
 * robots.txt for our user agent, and reports a site that refuses automated
 * reading as blocked rather than empty.
 *
 * Page text is untrusted data. Callers must treat it as content, never as
 * instructions.
 */

import { checkPublicUrl, htmlToText, isPrivateAddress } from "./public-url-guard.ts";

export const CRAWLER_USER_AGENT = "CreativesTakeoverResearch/1.0 (+https://creatives-takeover.com/privacy-policy)";
const MAX_PAGE_BYTES = 600_000;
const MAX_REDIRECTS = 3;
const MAX_TEXT_CHARS = 9_000;

export interface CrawledPage {
  url: string; title: string; description: string; text: string; links: string[];
  /** Addresses and numbers from mailto: and tel: links, which page text usually hides behind "Email us". */
  mailto?: string[]; tel?: string[];
}
export interface CrawlResult {
  domain: string;
  pages: CrawledPage[];
  /** The site answered but refused automated reading (401/403/429, bot walls) or robots.txt disallowed us. */
  blocked: boolean;
  status: number | null;
  error: string | null;
}

const INTERNAL_PAGE_HINTS: Array<[RegExp, number]> = [
  [/\/(about|about-us|company|who-we-are|nosotros|quienes-somos|a-propos|uber-uns|chi-siamo)(\/|$)/i, 10],
  [/\/(pricing|plans|precios|tarifs|preise)(\/|$)/i, 9],
  [/\/(product|products|features|solutions|platform|services|servicios)(\/|$)/i, 8],
  [/\/(customers|case-studies|clients|testimonials|success-stories)(\/|$)/i, 7],
  [/\/(contact|contact-us|get-in-touch|contacto|kontakt)(\/|$)/i, 6],
  [/\/(industries|who-we-serve|use-cases)(\/|$)/i, 5],
];

async function hostResolvesPublic(hostname: string): Promise<boolean> {
  const addresses: string[] = [];
  for (const type of ["A", "AAAA"] as const) {
    try {
      addresses.push(...(await Deno.resolveDns(hostname, type)));
    } catch {
      // A host may have only one address family.
    }
  }
  return addresses.length > 0 && !addresses.some(isPrivateAddress);
}

async function readCapped(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_PAGE_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  const bytes = new Uint8Array(Math.min(total, MAX_PAGE_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const slice = chunk.subarray(0, bytes.length - offset);
    bytes.set(slice, offset);
    offset += slice.byteLength;
    if (offset >= bytes.length) break;
  }
  return new TextDecoder().decode(bytes);
}

/** Absolute http(s) links from a page, without fragments, deduplicated. */
export function extractLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)[^"']*["']/gi)) {
    try {
      const url = new URL(match[1].trim(), baseUrl);
      if (url.protocol === "http:" || url.protocol === "https:") {
        url.hash = "";
        links.add(url.toString());
      }
    } catch {
      // Ignore unparseable links.
    }
    if (links.size >= 300) break;
  }
  return [...links];
}

/** Email addresses and phone numbers from mailto: and tel: links, deduplicated. */
export function extractContactLinks(html: string): { mailto: string[]; tel: string[] } {
  const mailto = new Set<string>();
  const tel = new Set<string>();
  for (const match of html.matchAll(/href\s*=\s*["'](mailto|tel):([^"'?#]+)/gi)) {
    let value = match[2].trim();
    try { value = decodeURIComponent(value); } catch { /* keep as written */ }
    if (match[1].toLowerCase() === "mailto") { if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(value)) mailto.add(value.toLowerCase()); }
    else if (value.replace(/\D/g, "").length >= 7) tel.add(value.replace(/[^\d+]/g, ""));
    if (mailto.size + tel.size >= 20) break;
  }
  return { mailto: [...mailto], tel: [...tel] };
}

/** Up to `limit` internal pages worth reading, best first. */
export function pickInternalPages(links: readonly string[], homeUrl: string, limit: number): string[] {
  const home = new URL(homeUrl);
  const host = home.hostname.replace(/^www\./, "");
  // Started deep inside a large site (a university's entrepreneurship centre):
  // stay within that section, whose pages describe the program, rather than
  // the institution's general pages.
  const section = home.pathname.replace(/\/+$/, "");
  const sectionDepth = section.split("/").filter(Boolean).length;
  const scored = links.flatMap((link) => {
    let url: URL;
    try { url = new URL(link); } catch { return []; }
    if (url.hostname.replace(/^www\./, "") !== host) return [];
    if (url.pathname.replace(/\/+$/, "") === section || /\.(pdf|jpg|jpeg|png|gif|svg|zip|mp4|webp)$/i.test(url.pathname)) return [];
    const depth = url.pathname.split("/").filter(Boolean).length;
    const inSection = sectionDepth > 0 && url.pathname.startsWith(`${section}/`);
    if (depth > sectionDepth + 2) return [];
    if (sectionDepth > 0 && !inSection) return [];
    const hint = INTERNAL_PAGE_HINTS.find(([pattern]) => pattern.test(url.pathname))?.[1] ?? 0;
    const score = hint + (inSection ? 1 : 0);
    return score > 0 ? [{ url: `${url.origin}${url.pathname}`, score }] : [];
  });
  const seen = new Set<string>();
  return scored.sort((a, b) => b.score - a.score)
    .filter((item) => (seen.has(item.url) ? false : (seen.add(item.url), true)))
    .slice(0, limit)
    .map((item) => item.url);
}

export interface RobotsRule { allow: boolean; pattern: string }

/**
 * The robots.txt rules that apply to us (RFC 9309): the group naming our
 * agent if there is one, otherwise every `*` group. Consecutive user-agent
 * lines share the rules that follow them.
 *
 * 2026-11-16: the old reader cut every rule at its first `*`, so the common
 * `Disallow: /*?` (pages with a query string) became `Disallow: /` and whole
 * university sites (Oxford, TU Delft, Maryland) were reported as blocked.
 */
export function parseRobots(robots: string): RobotsRule[] {
  const groups: Array<{ agents: string[]; rules: RobotsRule[] }> = [];
  let current: { agents: string[]; rules: RobotsRule[] } | null = null;
  let readingAgents = false;
  for (const rawLine of robots.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (!readingAgents || !current) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      readingAgents = true;
    } else if ((field === "allow" || field === "disallow") && current) {
      readingAgents = false;
      if (value) current.rules.push({ allow: field === "allow", pattern: value });
    } else {
      readingAgents = false;
    }
  }
  const ours = groups.filter((group) => group.agents.some((agent) => agent !== "*" && "creativestakeoverresearch".startsWith(agent.replace(/\/.*$/, ""))));
  return (ours.length ? ours : groups.filter((group) => group.agents.includes("*"))).flatMap((group) => group.rules);
}

/** Kept for callers that only need the disallowed patterns. */
export function parseRobotsDisallow(robots: string): string[] {
  return parseRobots(robots).filter((rule) => !rule.allow).map((rule) => rule.pattern);
}

const patternMatches = (pattern: string, path: string) => {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern).split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`).test(path);
};

/** The most specific matching rule decides; on a tie, allow wins; no match means allowed. */
export function robotsAllows(pathWithQuery: string, rules: readonly RobotsRule[]): boolean {
  let best: RobotsRule | null = null;
  for (const rule of rules) {
    if (!patternMatches(rule.pattern, pathWithQuery)) continue;
    if (!best || rule.pattern.length > best.pattern.length || (rule.pattern.length === best.pattern.length && rule.allow)) best = rule;
  }
  return !best || best.allow;
}

const isDisallowed = (url: URL, rules: readonly RobotsRule[]) => !robotsAllows(`${url.pathname || "/"}${url.search}`, rules);

interface FetchedPage { url: string; html: string; status: number }

async function fetchPage(input: string, timeoutMs: number): Promise<FetchedPage | { status: number | null; error: string }> {
  let check = checkPublicUrl(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!check.ok) return { status: null, error: check.reason };
    if (!(await hostResolvesPublic(check.url.hostname))) return { status: null, error: "That website does not resolve to a public address." };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(check.url.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": CRAWLER_USER_AGENT, Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => undefined);
        if (!location) return { status: response.status, error: "Redirect without a destination." };
        check = checkPublicUrl(new URL(location, check.url).toString());
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        return { status: response.status, error: `HTTP ${response.status}` };
      }
      const type = response.headers.get("content-type") ?? "";
      if (type && !/text\/html|application\/xhtml|text\/plain/i.test(type)) {
        await response.body?.cancel().catch(() => undefined);
        return { status: response.status, error: "Not a web page." };
      }
      return { url: check.url.toString(), html: await readCapped(response), status: response.status };
    } catch {
      return { status: null, error: "The website did not answer in time." };
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: null, error: "Too many redirects." };
}

const looksLikeBotWall = (html: string) =>
  /cf-browser-verification|challenge-platform|captcha|access denied|attention required|just a moment\.\.\./i.test(html.slice(0, 20_000))
  && html.length < 40_000;

function toPage(fetched: FetchedPage): CrawledPage {
  const { title, description, text } = htmlToText(fetched.html);
  return { url: fetched.url, title, description, text: text.slice(0, MAX_TEXT_CHARS), links: extractLinks(fetched.html, fetched.url), ...extractContactLinks(fetched.html) };
}

/** Reads the homepage and up to `maxPages - 1` internal pages. Never throws. */
export async function crawlSite(input: string, options: { maxPages?: number; timeoutMs?: number } = {}): Promise<CrawlResult> {
  const maxPages = Math.max(1, Math.min(options.maxPages ?? 5, 5));
  const timeoutMs = options.timeoutMs ?? 8_000;
  const check = checkPublicUrl(input);
  if (!check.ok) return { domain: "", pages: [], blocked: false, status: null, error: check.reason };
  const domain = check.url.hostname.toLowerCase().replace(/^www\d?\./, "");

  let robotsRules: RobotsRule[] = [];
  const robots = await fetchPage(`${check.url.origin}/robots.txt`, 4_000);
  if ("html" in robots) robotsRules = parseRobots(robots.html);
  if (isDisallowed(check.url, robotsRules)) {
    return { domain, pages: [], blocked: true, status: null, error: "The website asks automated readers not to visit." };
  }

  const home = await fetchPage(check.url.toString(), timeoutMs);
  if (!("html" in home)) {
    const blocked = home.status === 401 || home.status === 403 || home.status === 429 || home.status === 503;
    return { domain, pages: [], blocked, status: home.status, error: home.error };
  }
  if (looksLikeBotWall(home.html)) return { domain, pages: [], blocked: true, status: home.status, error: "The website blocks automated reading." };

  const homePage = toPage(home);
  const pages: CrawledPage[] = [homePage];
  const extra = pickInternalPages(homePage.links, home.url, maxPages - 1)
    .filter((url) => !isDisallowed(new URL(url), robotsRules));
  const results = await Promise.all(extra.map((url) => fetchPage(url, timeoutMs)));
  for (const result of results) {
    if ("html" in result && !looksLikeBotWall(result.html)) pages.push(toPage(result));
  }
  return { domain, pages, blocked: false, status: home.status, error: null };
}
