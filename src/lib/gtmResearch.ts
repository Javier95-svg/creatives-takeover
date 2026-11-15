/**
 * GTM Strategist research agent: the rules shared by the app and the edge
 * functions (docs/gtm-research-agent-plan.md). Everything here is pure and
 * import-free so node tests and Deno load the same file.
 *
 * The agent finds companies, not people: contact routes are company-level
 * (a contact page or an address the company publishes for enquiries).
 */

export type ResearchRunStatus = 'analyzing' | 'needs_review' | 'queued' | 'running' | 'partial' | 'completed' | 'failed' | 'cancelled';
export type ResearchStepKey = 'read_site' | 'understand_business' | 'find_competitors' | 'propose_segments'
  | 'discover_companies' | 'qualify_companies' | 'draft_outreach' | 'finalize';
export type ResearchStepStatus = 'queued' | 'running' | 'done' | 'partial' | 'failed' | 'skipped';
export type FitTier = 'A' | 'B' | 'C';
export type Verdict = 'met' | 'not_met' | 'unknown';

/** A claim about the founder's business, with the page it came from. */
export interface SourcedClaim { text: string; sourceUrl: string | null }

export interface BusinessProfile {
  name: string;
  offering: SourcedClaim;
  audience: SourcedClaim;
  valueProposition: SourcedClaim;
  industry: string;
  businessModel: string;
  pricing: SourcedClaim | null;
  proof: SourcedClaim[];
  geography: string;
  languages: string[];
  /** Where the founder's own ICP, PMF or project context changed or confirmed the reading. */
  contextNotes: string[];
}

export interface SegmentCriterion { id: string; label: string; mustHave: boolean }

export interface Segment {
  id: string;
  name: string;
  pain: string;
  criteria: SegmentCriterion[];
  geography: string;
  sizeBand: string;
  roles: string[];
  examples: string[];
}

export interface Competitor { name: string; domain: string; why: string }

export interface CriterionVerdict {
  criterionId: string;
  criterion: string;
  verdict: Verdict;
  quote: string | null;
  sourceUrl: string | null;
}

export interface ContactRoute { kind: 'contact_page' | 'generic_email' | 'careers'; value: string; sourceUrl: string }

export interface Candidate { name: string; domain: string; foundVia: string }

export const ANALYSIS_STEPS: readonly ResearchStepKey[] = ['read_site', 'understand_business', 'find_competitors', 'propose_segments'];
export const RESEARCH_STEPS: readonly ResearchStepKey[] = ['discover_companies', 'qualify_companies', 'draft_outreach', 'finalize'];

/** What each step is called on the timeline. */
export const STEP_TITLES: Record<ResearchStepKey, string> = {
  read_site: 'Read your website',
  understand_business: 'Understand your business',
  find_competitors: 'Find your competitors',
  propose_segments: 'Propose who to target',
  discover_companies: 'Find companies',
  qualify_companies: 'Check each company',
  draft_outreach: 'Write outreach drafts',
  finalize: 'Prepare your results',
};

export const RESEARCH_RUN_CREDITS = 10;
export const QUALIFY_BATCH_SIZE = 5;
export const MAX_CANDIDATES = 60;
export const MAX_SEARCHES_PER_RUN = 12;

/**
 * Credits charged when a run ends: the full price from ten qualified
 * companies, otherwise half a credit per company (at least 2), and nothing
 * when none qualified.
 */
export function creditsForRun(qualified: number, listedPrice = RESEARCH_RUN_CREDITS): number {
  const count = Math.max(0, Math.floor(qualified));
  if (count === 0) return 0;
  if (count >= 10) return listedPrice;
  return Math.min(listedPrice, Math.max(2, Math.ceil(count / 2)));
}

// ---- Domains ---------------------------------------------------------------

/** "https://www.Acme.co.uk/about" -> "acme.co.uk"; null when it is not a public host name. */
export function normalizeDomain(input: string | null | undefined): string | null {
  let raw = (input ?? '').trim().toLowerCase();
  if (!raw) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(raw)) raw = `https://${raw}`;
  let host: string;
  try { host = new URL(raw).hostname; } catch { return null; }
  host = host.replace(/\.$/, '').replace(/^www\d?\./, '');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) || host.includes('..')) return null;
  return host;
}

/**
 * Sites that are never a prospect: social networks, marketplaces, review and
 * data directories, publishers and big platforms. They are useful as places to
 * find companies, not as companies to contact.
 */
const NOT_A_PROSPECT = [
  'linkedin.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com', 'pinterest.com',
  'reddit.com', 'quora.com', 'medium.com', 'substack.com', 'wikipedia.org', 'wikimedia.org', 'github.com', 'gitlab.com',
  'crunchbase.com', 'pitchbook.com', 'g2.com', 'capterra.com', 'getapp.com', 'trustpilot.com', 'producthunt.com',
  'clutch.co', 'goodfirms.co', 'yelp.com', 'tripadvisor.com', 'glassdoor.com', 'indeed.com', 'angel.co', 'wellfound.com',
  'google.com', 'apple.com', 'amazon.com', 'microsoft.com', 'play.google.com', 'apps.apple.com', 'ycombinator.com',
  'forbes.com', 'techcrunch.com', 'businessinsider.com', 'bloomberg.com', 'nytimes.com', 'theguardian.com', 'bbc.co.uk',
  'wordpress.com', 'wix.com', 'squarespace.com', 'shopify.com', 'blogspot.com', 'notion.site', 'canva.com',
  'yellowpages.com', 'bbb.org', 'zoominfo.com', 'apollo.io', 'owler.com', 'similarweb.com', 'statista.com',
];

export function isExcludedDomain(domain: string, alsoExclude: readonly string[] = []): boolean {
  const matches = (blocked: string) => domain === blocked || domain.endsWith(`.${blocked}`);
  return NOT_A_PROSPECT.some(matches) || alsoExclude.some((blocked) => blocked && matches(blocked));
}

/** Unique, valid, non-excluded candidates, in order, at most `limit`. */
export function dedupeCandidates(candidates: readonly Candidate[], exclude: readonly string[], limit = MAX_CANDIDATES): Candidate[] {
  const seen = new Set<string>();
  const result: Candidate[] = [];
  for (const candidate of candidates) {
    const domain = normalizeDomain(candidate.domain);
    if (!domain || seen.has(domain) || isExcludedDomain(domain, exclude)) continue;
    seen.add(domain);
    result.push({ name: clean(candidate.name, 120) || domain, domain, foundVia: clean(candidate.foundVia, 300) });
    if (result.length >= limit) break;
  }
  return result;
}

// ---- Evidence ----------------------------------------------------------------

const normaliseText = (value: string) => value.toLowerCase()
  .replace(/[‘’“”"'`]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

/** True when the quote really appears in the page text (ignoring case, punctuation and spacing). */
export function quoteAppearsIn(quote: string | null | undefined, pageText: string): boolean {
  const needle = normaliseText(quote ?? '');
  if (needle.length < 12) return false;
  return normaliseText(pageText).includes(needle);
}

/**
 * Keeps a "met" verdict only when its quote is found on the page it cites;
 * anything else becomes "unknown". The model may judge, but only the page
 * may prove.
 */
export function verifyVerdicts(verdicts: readonly CriterionVerdict[], pages: ReadonlyArray<{ url: string; text: string }>): CriterionVerdict[] {
  return verdicts.map((verdict) => {
    if (verdict.verdict !== 'met') return verdict;
    const page = pages.find((candidate) => candidate.url === verdict.sourceUrl) ?? null;
    const proven = page ? quoteAppearsIn(verdict.quote, page.text) : pages.some((candidate) => quoteAppearsIn(verdict.quote, candidate.text));
    if (!proven) return { ...verdict, verdict: 'unknown', quote: null, sourceUrl: null };
    const source = page ?? pages.find((candidate) => quoteAppearsIn(verdict.quote, candidate.text))!;
    return { ...verdict, sourceUrl: source.url };
  });
}

/**
 * Fit from verified verdicts on the must-have criteria:
 *   - any must-have "not met", or nothing met at all: not a prospect (null)
 *   - A: every must-have met
 *   - B: one must-have unknown, the rest met
 *   - C: more unknowns, at least one met
 * Nice-to-haves only add to the score.
 */
export function scoreFit(verdicts: readonly CriterionVerdict[], criteria: readonly SegmentCriterion[]): { score: number; tier: FitTier } | null {
  const byId = new Map(verdicts.map((verdict) => [verdict.criterionId, verdict.verdict]));
  const must = criteria.filter((criterion) => criterion.mustHave);
  const nice = criteria.filter((criterion) => !criterion.mustHave);
  const mustVerdicts = must.map((criterion) => byId.get(criterion.id) ?? 'unknown');
  if (mustVerdicts.includes('not_met')) return null;
  const met = mustVerdicts.filter((verdict) => verdict === 'met').length;
  const unknown = mustVerdicts.length - met;
  const niceMet = nice.filter((criterion) => byId.get(criterion.id) === 'met').length;
  if (met === 0 && niceMet === 0) return null;
  if (must.length > 0 && met === 0) return null;
  const mustShare = must.length ? (met + unknown * 0.4) / must.length : 1;
  const niceShare = nice.length ? niceMet / nice.length : 0;
  const score = Math.round(Math.min(100, mustShare * 85 + niceShare * 15));
  const tier: FitTier = unknown === 0 ? 'A' : unknown === 1 ? 'B' : 'C';
  return { score, tier };
}

// ---- Model output validation ---------------------------------------------------

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function cleanList(value: unknown, maxItems: number, maxLength: number): string[] {
  return Array.isArray(value) ? value.map((item) => clean(item, maxLength)).filter(Boolean).slice(0, maxItems) : [];
}

function claim(value: unknown, allowedUrls: ReadonlySet<string>, max = 400): SourcedClaim | null {
  if (!value || typeof value !== 'object') return null;
  const { text, sourceUrl } = value as Record<string, unknown>;
  const body = clean(text, max);
  if (!body) return null;
  return { text: body, sourceUrl: typeof sourceUrl === 'string' && allowedUrls.has(sourceUrl) ? sourceUrl : null };
}

/** The business profile from the model; source URLs must be pages we actually read. */
export function parseBusinessProfile(raw: unknown, allowedUrls: ReadonlySet<string>): BusinessProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const offering = claim(value.offering, allowedUrls);
  const audience = claim(value.audience, allowedUrls);
  const valueProposition = claim(value.valueProposition, allowedUrls);
  if (!offering || !audience || !valueProposition) return null;
  return {
    name: clean(value.name, 120) || 'Your business',
    offering, audience, valueProposition,
    industry: clean(value.industry, 120),
    businessModel: clean(value.businessModel, 80),
    pricing: claim(value.pricing, allowedUrls, 240),
    proof: (Array.isArray(value.proof) ? value.proof : []).map((item) => claim(item, allowedUrls, 240)).filter((item): item is SourcedClaim => Boolean(item)).slice(0, 5),
    geography: clean(value.geography, 120),
    languages: cleanList(value.languages, 5, 20),
    contextNotes: cleanList(value.contextNotes, 5, 240),
  };
}

export function parseCompetitors(raw: unknown, ownDomain: string | null): Competitor[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { competitors?: unknown }).competitors)
    ? (raw as { competitors: unknown[] }).competitors : Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const result: Competitor[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const domain = normalizeDomain(String((item as Record<string, unknown>).domain ?? ''));
    if (!domain || domain === ownDomain || seen.has(domain) || isExcludedDomain(domain)) continue;
    seen.add(domain);
    result.push({ name: clean((item as Record<string, unknown>).name, 120) || domain, domain, why: clean((item as Record<string, unknown>).why, 240) });
    if (result.length >= 10) break;
  }
  return result;
}

const slug = (value: string, fallback: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || fallback;

export function parseSegments(raw: unknown): Segment[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { segments?: unknown }).segments)
    ? (raw as { segments: unknown[] }).segments : [];
  return list.flatMap((item, index): Segment[] => {
    if (!item || typeof item !== 'object') return [];
    const value = item as Record<string, unknown>;
    const name = clean(value.name, 100);
    const criteria = (Array.isArray(value.criteria) ? value.criteria : []).flatMap((criterion, criterionIndex): SegmentCriterion[] => {
      const label = typeof criterion === 'string' ? clean(criterion, 160)
        : criterion && typeof criterion === 'object' ? clean((criterion as Record<string, unknown>).label, 160) : '';
      if (!label) return [];
      const mustHave = criterion && typeof criterion === 'object' ? (criterion as Record<string, unknown>).mustHave !== false : true;
      return [{ id: `c${criterionIndex + 1}`, label, mustHave }];
    }).slice(0, 6);
    if (!name || criteria.filter((criterion) => criterion.mustHave).length === 0) return [];
    return [{
      id: slug(name, `segment-${index + 1}`),
      name,
      pain: clean(value.pain, 300),
      criteria,
      geography: clean(value.geography, 120),
      sizeBand: clean(value.sizeBand, 60),
      roles: cleanList(value.roles, 4, 60),
      examples: cleanList(value.examples, 3, 120),
    }];
  }).slice(0, 3);
}

/** A segment as edited by the founder: same validation, ids renumbered. */
export function sanitizeSegment(raw: unknown): Segment | null {
  return parseSegments({ segments: [raw] })[0] ?? null;
}

export function parseCandidates(raw: unknown, foundVia: string): Candidate[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { companies?: unknown }).companies)
    ? (raw as { companies: unknown[] }).companies : [];
  return list.flatMap((item): Candidate[] => {
    if (!item || typeof item !== 'object') return [];
    const value = item as Record<string, unknown>;
    const domain = normalizeDomain(clean(value.domain ?? value.website ?? value.url, 200));
    if (!domain) return [];
    return [{ name: clean(value.name, 120) || domain, domain, foundVia }];
  });
}

export function parseVerdicts(raw: unknown, criteria: readonly SegmentCriterion[]): CriterionVerdict[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { verdicts?: unknown }).verdicts)
    ? (raw as { verdicts: unknown[] }).verdicts : [];
  return criteria.map((criterion) => {
    const found = list.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).criterionId === criterion.id) as Record<string, unknown> | undefined;
    const verdict: Verdict = found && ['met', 'not_met', 'unknown'].includes(String(found.verdict)) ? found.verdict as Verdict : 'unknown';
    return {
      criterionId: criterion.id,
      criterion: criterion.label,
      verdict,
      quote: clean(found?.quote, 300) || null,
      sourceUrl: typeof found?.sourceUrl === 'string' ? found.sourceUrl : null,
    };
  });
}

export function parseDraft(raw: unknown): { subject: string; body: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const subject = clean((raw as Record<string, unknown>).subject, 120);
  const body = typeof (raw as Record<string, unknown>).body === 'string'
    ? ((raw as Record<string, unknown>).body as string).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 2000) : '';
  if (!subject || body.length < 40) return null;
  return { subject, body };
}

// ---- Contact routes (company-level only) ---------------------------------------

const PERSONAL_EMAIL = /^(?!info|hello|contact|sales|support|team|office|admin|enquiries|enquiry|inquiries|hi|press|partners|partnerships|business|bookings|reservations|help|careers|jobs)[a-z]+[._-]?[a-z]*@/i;

/**
 * Company-level contact routes found on the company's own pages: its contact
 * page, a generic enquiries address it publishes, its careers page. Addresses
 * that look like a named person are left out on purpose.
 */
export function extractContactRoutes(pages: ReadonlyArray<{ url: string; text: string; links?: readonly string[] }>, domain: string): ContactRoute[] {
  const routes: ContactRoute[] = [];
  const seen = new Set<string>();
  const add = (route: ContactRoute) => { if (!seen.has(route.value)) { seen.add(route.value); routes.push(route); } };
  for (const page of pages) {
    for (const link of page.links ?? []) {
      if (normalizeDomain(link) !== domain) continue;
      if (/\/(contact|contact-us|get-in-touch|kontakt|contacto|nous-contacter)(\/|$|\?)/i.test(link)) add({ kind: 'contact_page', value: link, sourceUrl: page.url });
      else if (/\/(careers|jobs|join-us|work-with-us)(\/|$|\?)/i.test(link)) add({ kind: 'careers', value: link, sourceUrl: page.url });
    }
    for (const match of page.text.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) {
      const email = match[0].toLowerCase();
      if (normalizeDomain(email.split('@')[1]) !== domain || PERSONAL_EMAIL.test(email)) continue;
      add({ kind: 'generic_email', value: email, sourceUrl: page.url });
    }
  }
  return routes.slice(0, 4);
}

// ---- Outreach language -----------------------------------------------------------

// Letter-aware boundaries: \b treats accented letters as non-word characters,
// so "Perú" or "México" at the end of a location never matched.
const countryPattern = (names: string) => new RegExp(`(?<!\\p{L})(${names})(?!\\p{L})`, 'iu');

const LANGUAGE_BY_COUNTRY: Array<[RegExp, string]> = [
  [countryPattern('spain|españa|mexico|méxico|argentina|peru|perú|colombia|chile|uruguay|ecuador|bolivia|paraguay|venezuela|costa rica|guatemala|panama|panamá|dominican'), 'es'],
  [countryPattern("france|belgique|québec|quebec|luxembourg|sénégal|senegal|côte d'ivoire|maroc|morocco|tunisia"), 'fr'],
  [countryPattern('germany|deutschland|austria|österreich'), 'de'],
  [countryPattern('italy|italia'), 'it'],
  [countryPattern('portugal|brazil|brasil'), 'pt'],
  [countryPattern('netherlands|nederland'), 'nl'],
];

/** The outreach language for a prospect's location; English when unclear. */
export function languageForLocation(location: string | null | undefined): string {
  const text = location ?? '';
  return LANGUAGE_BY_COUNTRY.find(([pattern]) => pattern.test(text))?.[1] ?? 'en';
}

// ---- Export ------------------------------------------------------------------------

export interface ProspectExportRow {
  name: string; domain: string; fitTier: FitTier; fitScore: number; location: string | null; sizeBand: string | null;
  status: string; whyItFits: string; contactRoutes: string; draftSubject: string; draftBody: string;
}

const csvCell = (value: string | number | null) => {
  const text = value === null ? '' : String(value);
  // Leading = + - @ would run as a formula in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function prospectsToCsv(rows: readonly ProspectExportRow[]): string {
  const header = ['Company', 'Website', 'Fit tier', 'Fit score', 'Location', 'Size', 'Status', 'Why it fits', 'Contact routes', 'Draft subject', 'Draft email'];
  const lines = rows.map((row) => [row.name, `https://${row.domain}`, row.fitTier, row.fitScore, row.location, row.sizeBand, row.status,
    row.whyItFits, row.contactRoutes, row.draftSubject, row.draftBody].map(csvCell).join(','));
  return [header.join(','), ...lines].join('\n');
}
