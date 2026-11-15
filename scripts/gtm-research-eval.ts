// Customer research eval: runs the real "Find customers" pipeline end to end
// on real founder websites (live search, crawling and model calls) against an
// in-memory database, then reports what each run found, how long it took and
// what it cost, plus a CSV of every match for a person to mark relevant or not.
//
// Costs real API calls, so it is NOT part of `npm test`. Run it on 5-10 golden
// sites before launch and after any change to the research prompts or rules:
//   $env:GEMINI_API_KEY = "<the project's Google key>"   (OPENAI_API_KEY also works for models)
//   $env:TAVILY_API_KEY = "<search key>"                  (optional; Gemini/OpenAI search otherwise)
//   node --experimental-strip-types scripts/gtm-research-eval.ts https://site-one.com https://site-two.com
// The first proposed target group is used for each site. Writes
// reports/gtm-research-eval-<date>.md and reports/gtm-research-eval-<date>.csv.
// Launch gates (docs/gtm-research-agent-plan.md §10): median run under 6
// minutes, under $0.25 a run, and at least 70% of strong fits judged relevant
// by the reviewer in the CSV.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve4, resolve6 } from 'node:dns/promises';
import { driveResearchRun, ResearchDb } from '../tests/helpers/researchDatabase.ts';
import { prospectsToCsv } from '../src/lib/gtmResearch.ts';

const sites = process.argv.slice(2).filter((arg) => /^https?:\/\/|\./.test(arg));
if (!sites.length) {
  console.error('Give one or more founder websites: node --experimental-strip-types scripts/gtm-research-eval.ts https://example.com');
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
  console.error('Set GEMINI_API_KEY (or OPENAI_API_KEY) to run the eval.');
  process.exit(1);
}

// The pipeline reads keys and resolves DNS the way the edge runtime does.
(globalThis as { Deno?: unknown }).Deno = {
  env: { get: (name: string) => process.env[name] },
  resolveDns: (host: string, type: string) => (type === 'AAAA' ? resolve6(host) : resolve4(host)).catch(() => []),
};

type Row = Record<string, any>;
const today = new Date().toISOString().slice(0, 10);
const minutes = (ms: number) => (ms / 60_000).toFixed(1);

interface SiteResult {
  site: string; ok: boolean; error?: string; durationMs: number; costUsd: number; segment: string; candidates: number; checked: number;
  tiers: Record<'A' | 'B' | 'C', number>; drafts: number; withNews: number; charged: number; status: string; prospects: Row[]; logs: string[];
}

async function evaluate(site: string): Promise<SiteResult> {
  const db = new ResearchDb();
  const run: Row = {
    id: `eval-${site.replace(/\W+/g, '-')}`, user_id: 'eval', project_id: null, status: 'analyzing', input: { websiteUrl: site },
    business_profile: null, competitors: [], segments: [], selected_segment: null, target_count: 20, counts: {}, reservation_id: 'eval-hold',
    gifted: false, kind: 'initial', parent_run_id: null, seed_domains: [], cohort_id: null, auto_refresh: false,
  };
  db.tables.gtm_research_runs.push(run);
  const logs: string[] = [];
  const started = Date.now();
  let error: string | undefined;
  try { await driveResearchRun(db, run, 'read_site', logs); } catch (failure) { error = failure instanceof Error ? failure.message : String(failure); }
  const prospects = db.tables.gtm_prospect_companies.filter((row) => row.run_id === run.id);
  const tiers = { A: 0, B: 0, C: 0 } as Record<'A' | 'B' | 'C', number>;
  for (const prospect of prospects) tiers[prospect.fit_tier as 'A' | 'B' | 'C'] += 1;
  return {
    site, ok: !error, error, durationMs: Date.now() - started,
    costUsd: db.tables.provider_spend_ledger.reduce((sum, row) => sum + Number(row.est_cost_usd ?? 0), 0),
    segment: run.selected_segment?.name ?? '—', candidates: Number(run.counts.candidates ?? 0), checked: Number(run.counts.checked ?? 0), tiers,
    drafts: db.tables.gtm_outreach_drafts.length, withNews: prospects.filter((row) => row.signals?.length).length,
    charged: Number(run.credits_charged ?? 0), status: run.status,
    prospects: prospects.map((row) => ({ ...row, draft: db.tables.gtm_outreach_drafts.find((draft) => draft.prospect_id === row.id) ?? null })),
    logs,
  };
}

const results: SiteResult[] = [];
for (const site of sites) {
  process.stdout.write(`Researching ${site}… `);
  const result = await evaluate(site);
  results.push(result);
  console.log(result.ok ? `${result.tiers.A + result.tiers.B} matches in ${minutes(result.durationMs)} min, ~$${result.costUsd.toFixed(3)}` : `failed: ${result.error}`);
}

const durations = results.map((result) => result.durationMs).sort((a, b) => a - b);
const median = durations[Math.floor(durations.length / 2)] ?? 0;
const maxCost = Math.max(0, ...results.map((result) => result.costUsd));
const lines = [
  `# Customer research eval · ${today}`,
  '',
  `${results.length} sites · median run ${minutes(median)} min (gate: under 6) · highest cost $${maxCost.toFixed(3)} (gate: under $0.25)`,
  'Relevance gate (at least 70% of strong fits relevant): mark the "Relevant?" column in the CSV.',
  '',
  '| Site | Status | Target group | Found | Checked | Strong | Good | Possible | Drafts | With news | Charged | Minutes | Est. cost |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...results.map((result) => `| ${result.site} | ${result.ok ? result.status : `error: ${result.error}`} | ${result.segment} | ${result.candidates} | ${result.checked} | ${result.tiers.A} | ${result.tiers.B} | ${result.tiers.C} | ${result.drafts} | ${result.withNews} | ${result.charged} | ${minutes(result.durationMs)} | $${result.costUsd.toFixed(3)} |`),
  '',
  ...results.flatMap((result) => [`## ${result.site}`, '', ...result.logs.map((line) => `- ${line}`), '']),
];

const csvRows = results.flatMap((result) => result.prospects.map((prospect) => ({
  name: `${result.site} → ${prospect.name}`, domain: prospect.domain, fitTier: prospect.fit_tier, fitScore: prospect.fit_score,
  location: prospect.location ?? null, sizeBand: prospect.size_band ?? null, status: 'Relevant? (y/n)',
  whyItFits: (prospect.criteria as Row[]).filter((item) => item.verdict === 'met').map((item) => `${item.criterion}: "${item.quote}" (${item.sourceUrl})`).join(' | '),
  contactRoutes: (prospect.contact_routes as Row[]).map((route) => route.value).join(' | '),
  draftSubject: prospect.draft?.subject ?? '', draftBody: prospect.draft?.body ?? '',
})));

mkdirSync(new URL('../reports/', import.meta.url), { recursive: true });
writeFileSync(new URL(`../reports/gtm-research-eval-${today}.md`, import.meta.url), lines.join('\n'));
writeFileSync(new URL(`../reports/gtm-research-eval-${today}.csv`, import.meta.url), prospectsToCsv(csvRows));
console.log(`\nWrote reports/gtm-research-eval-${today}.md and .csv`);
