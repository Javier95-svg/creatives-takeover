// Links the first mention of a Startup Pedia term in a Newspaper article to its
// entry, at render time, so the stored article text never changes.
// api/newspaper-og.ts carries a copy (serverless functions do not import from
// src/); tests/pedia-term-links.test.ts keeps the copy identical and checks
// that every slug is a real entry.

interface PediaTermLink {
  /** Regular expression source, matched on word boundaries. */
  pattern: string;
  /** Acronyms match case-sensitively; phrases ignore case. */
  caseSensitive?: boolean;
  slug: string;
}

// Specific phrases first, then acronyms. Short acronyms that are also ordinary
// words or initials (IP, PE, SAM, SOM) are left out to avoid wrong links.
export const PEDIA_TERM_LINKS: PediaTermLink[] = [
  { pattern: "product[- ]market fit", slug: "product-market-fit" },
  { pattern: "minimum viable products?", slug: "minimum-viable-product" },
  { pattern: "customer acquisition costs?", slug: "customer-acquisition-cost" },
  { pattern: "(?:customer )?lifetime value", slug: "customer-lifetime-value" },
  { pattern: "go[- ]to[- ]market(?: strategy)?", slug: "go-to-market-strategy" },
  { pattern: "ideal customer profiles?", slug: "ideal-customer-profile" },
  { pattern: "unique selling (?:proposition|point)", slug: "unique-selling-proposition" },
  { pattern: "total addressable market", slug: "tam-sam-som" },
  { pattern: "monthly recurring revenue", slug: "mrr-and-arr" },
  { pattern: "annual recurring revenue", slug: "mrr-and-arr" },
  { pattern: "average order value", slug: "average-order-value" },
  { pattern: "return on ad spend", slug: "roi-and-roas" },
  { pattern: "net promoter score", slug: "net-promoter-score" },
  { pattern: "venture capital(?:ists?)?", slug: "venture-capital-vs-private-equity" },
  { pattern: "private equity", slug: "venture-capital-vs-private-equity" },
  { pattern: "pre-seed", slug: "pre-seed-vs-seed-funding" },
  { pattern: "series a", slug: "startup-funding-stages" },
  { pattern: "initial public offering", slug: "startup-funding-stages" },
  { pattern: "pitch decks?", slug: "pitch-deck-outline" },
  { pattern: "employee stock options?", slug: "employee-stock-option-plan" },
  { pattern: "non-disclosure agreements?", slug: "nda-and-intellectual-property" },
  { pattern: "intellectual property", slug: "nda-and-intellectual-property" },
  { pattern: "customer interviews?", slug: "customer-interview-questions" },
  { pattern: "customer discovery", slug: "measuring-customer-discovery-progress" },
  { pattern: "(?:startup |business )?incubators?", slug: "accelerator-vs-incubator" },
  { pattern: "cold emails?", slug: "cold-email-for-startups" },
  { pattern: "waitlists?", slug: "waitlist-before-mvp" },
  { pattern: "tech stacks?", slug: "how-to-choose-a-startup-tech-stack" },
  { pattern: "software as a service", slug: "saas" },
  { pattern: "MVPs?", caseSensitive: true, slug: "minimum-viable-product" },
  { pattern: "PMF", caseSensitive: true, slug: "product-market-fit" },
  { pattern: "CAC", caseSensitive: true, slug: "customer-acquisition-cost" },
  { pattern: "LTV", caseSensitive: true, slug: "customer-lifetime-value" },
  { pattern: "GTM", caseSensitive: true, slug: "go-to-market-strategy" },
  { pattern: "ICPs?", caseSensitive: true, slug: "ideal-customer-profile" },
  { pattern: "TAM", caseSensitive: true, slug: "tam-sam-som" },
  { pattern: "MRR", caseSensitive: true, slug: "mrr-and-arr" },
  { pattern: "ARR", caseSensitive: true, slug: "mrr-and-arr" },
  { pattern: "AOV", caseSensitive: true, slug: "average-order-value" },
  { pattern: "ROAS", caseSensitive: true, slug: "roi-and-roas" },
  { pattern: "NPS", caseSensitive: true, slug: "net-promoter-score" },
  { pattern: "KPIs?", caseSensitive: true, slug: "kpis-and-okrs" },
  { pattern: "OKRs?", caseSensitive: true, slug: "kpis-and-okrs" },
  { pattern: "DAU|MAU", caseSensitive: true, slug: "dau-and-mau" },
  { pattern: "B2B|B2C|D2C|DTC", caseSensitive: true, slug: "b2b-b2c-d2c" },
  { pattern: "SaaS", caseSensitive: true, slug: "saas" },
  { pattern: "ESOPs?", caseSensitive: true, slug: "employee-stock-option-plan" },
  { pattern: "NDAs?", caseSensitive: true, slug: "nda-and-intellectual-property" },
  { pattern: "IPOs?", caseSensitive: true, slug: "startup-funding-stages" },
];

/** A few links per article: enough to help readers and search engines, not enough to clutter the story. */
export const MAX_PEDIA_LINKS_PER_ARTICLE = 4;

// Spans that must never gain a link: images and links, inline code, bare URLs.
const PROTECTED = /(!?\[[^\]]*\]\([^)]*\)|`[^`]*`|https?:\/\/\S+)/;

/**
 * Returns the markdown with the first mention of up to MAX_PEDIA_LINKS_PER_ARTICLE
 * different entries linked. `base` is "" for in-app links and the site origin
 * where only absolute links are allowed (the server-rendered article body).
 */
export function linkPediaTerms(markdown: string | null | undefined, base = ""): string {
  if (!markdown) return "";
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const linkedSlugs = new Set<string>();
  let inFence = false;

  for (const term of PEDIA_TERM_LINKS) {
    if (linkedSlugs.size >= MAX_PEDIA_LINKS_PER_ARTICLE) break;
    if (linkedSlugs.has(term.slug)) continue;
    const matcher = new RegExp(`(^|[^\\w-])(${term.pattern})(?![\\w-])`, term.caseSensitive ? "" : "i");

    inFence = false;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        continue;
      }
      // Headings, fenced code and block quotes keep their text untouched.
      if (inFence || /^\s*(#|>)/.test(line)) continue;

      const parts = line.split(PROTECTED);
      let replaced = false;
      for (let part = 0; part < parts.length && !replaced; part += 2) {
        const match = matcher.exec(parts[part]);
        if (!match) continue;
        const start = match.index + match[1].length;
        const text = match[2];
        parts[part] = `${parts[part].slice(0, start)}[${text}](${base}/startup-pedia/${term.slug})${parts[part].slice(start + text.length)}`;
        replaced = true;
      }
      if (replaced) {
        lines[index] = parts.join("");
        linkedSlugs.add(term.slug);
        break;
      }
    }
  }

  return lines.join("\n");
}
