/**
 * Finding organisations for customer research from a company index (Exa's
 * neural search, category "company") instead of general web results.
 *
 * Why: general search returns articles and list pages, so a run could only
 * consider the few dozen organisations those pages named. A company index
 * returns organisations' own pages directly, many per query, which is how
 * Explee and Krabat get their volume (docs/gtm-research-agent-plan.md).
 *
 * Optional: without EXA_API_KEY, research uses web search as before. Every
 * result is still checked on the organisation's own website before it counts.
 */

export interface CompanySearchSource { url: string; title: string; snippet: string }
export interface CompanySearchResult { sources: CompanySearchSource[]; costUsd: number; provider: "exa" }

const EXA_SEARCH_URL = "https://api.exa.ai/search";
// Used when Exa does not report a cost; refine from invoices.
const FALLBACK_COST_USD = 0.012;

export const hasCompanySearch = () => Boolean(Deno.env.get("EXA_API_KEY")?.trim());

/** Up to `numResults` organisations matching a plain-language description. Throws on provider errors. */
export async function searchCompanies(query: string, numResults = 25, timeoutMs = 20_000): Promise<CompanySearchResult> {
  const apiKey = Deno.env.get("EXA_API_KEY")?.trim();
  if (!apiKey) throw new Error("Company search is not configured");
  const response = await fetch(EXA_SEARCH_URL, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: query.slice(0, 400),
      type: "auto",
      category: "company",
      numResults: Math.max(1, Math.min(numResults, 50)),
      contents: { text: { maxCharacters: 700 } },
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Company search failed: ${response.status} ${body.slice(0, 160)}`.trim());
  }
  const data = await response.json() as { results?: Array<Record<string, unknown>>; costDollars?: { total?: number } };
  const sources = (data.results ?? []).flatMap((result): CompanySearchSource[] => {
    const url = typeof result.url === "string" ? result.url : "";
    if (!/^https?:\/\//i.test(url)) return [];
    const text = typeof result.text === "string" ? result.text.replace(/\s+/g, " ").trim() : "";
    return [{ url, title: typeof result.title === "string" ? result.title.slice(0, 200) : "", snippet: text.slice(0, 700) }];
  });
  const cost = Number(data.costDollars?.total);
  return { sources, costUsd: Number.isFinite(cost) && cost > 0 ? cost : FALLBACK_COST_USD, provider: "exa" };
}
