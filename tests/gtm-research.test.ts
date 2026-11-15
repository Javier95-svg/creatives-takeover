import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  creditsForRun, dedupeCandidates, extractContactRoutes, isExcludedDomain, languageForLocation, normalizeDomain, parseBusinessProfile,
  parseCompetitors, parseDraft, parseSegments, prospectsToCsv, quoteAppearsIn, sanitizeSegment, scoreFit, verifyVerdicts,
  type CriterionVerdict, type SegmentCriterion,
} from '../src/lib/gtmResearch.ts';
import { extractLinks, parseRobotsDisallow, pickInternalPages } from '../supabase/functions/_shared/site-crawler.ts';

// ---- Pure rules -----------------------------------------------------------------------------

test('charging: full price from ten matches, half a credit each below, nothing for none', () => {
  assert.equal(creditsForRun(0), 0);
  assert.equal(creditsForRun(1), 2);
  assert.equal(creditsForRun(3), 2);
  assert.equal(creditsForRun(5), 3);
  assert.equal(creditsForRun(9), 5);
  assert.equal(creditsForRun(10), 10);
  assert.equal(creditsForRun(20), 10);
  assert.equal(creditsForRun(-4), 0);
});

test('domains are normalised and platforms, directories and media are never prospects', () => {
  assert.equal(normalizeDomain('https://www.Acme.co.uk/about?x=1'), 'acme.co.uk');
  assert.equal(normalizeDomain('acme.io'), 'acme.io');
  assert.equal(normalizeDomain('localhost'), null);
  assert.equal(normalizeDomain('not a url'), null);
  assert.ok(isExcludedDomain('uk.linkedin.com'));
  assert.ok(isExcludedDomain('g2.com'));
  assert.ok(isExcludedDomain('rival.com', ['rival.com']));
  assert.equal(isExcludedDomain('smilesdental.co.uk'), false);
  const deduped = dedupeCandidates([
    { name: 'A', domain: 'https://a-clinic.com', foundVia: 'q' }, { name: 'A again', domain: 'www.a-clinic.com', foundVia: 'q' },
    { name: 'LinkedIn', domain: 'linkedin.com', foundVia: 'q' }, { name: 'Rival', domain: 'rival.com', foundVia: 'q' }, { name: 'B', domain: 'b-clinic.com', foundVia: 'q' },
  ], ['rival.com']);
  assert.deepEqual(deduped.map((candidate) => candidate.domain), ['a-clinic.com', 'b-clinic.com']);
});

const criteria: SegmentCriterion[] = [
  { id: 'c1', label: 'Independent dental clinic', mustHave: true },
  { id: 'c2', label: 'Based in the UK', mustHave: true },
  { id: 'c3', label: 'Offers online booking', mustHave: false },
];
const verdict = (criterionId: string, value: CriterionVerdict['verdict'], quote: string | null = null, sourceUrl: string | null = null): CriterionVerdict =>
  ({ criterionId, criterion: criterionId, verdict: value, quote, sourceUrl });

test('a "met" judgement survives only when its quote is on the cited page', () => {
  const pages = [{ url: 'https://smiles.co.uk/', text: 'Smiles is an independent dental clinic in Leeds, United Kingdom. Book online 24/7.' }];
  assert.ok(quoteAppearsIn('an  INDEPENDENT dental clinic in Leeds', pages[0].text));
  assert.equal(quoteAppearsIn('clinic', pages[0].text), false, 'too short to prove anything');
  const checked = verifyVerdicts([
    verdict('c1', 'met', 'independent dental clinic in Leeds', 'https://smiles.co.uk/'),
    verdict('c2', 'met', 'serving patients across Scotland since 1990', 'https://smiles.co.uk/'),
    verdict('c3', 'met', 'Book online 24/7', 'https://elsewhere.com/'),
  ], pages);
  assert.equal(checked[0].verdict, 'met');
  assert.equal(checked[1].verdict, 'unknown', 'invented quote is demoted');
  assert.equal(checked[1].quote, null);
  assert.equal(checked[2].verdict, 'met', 'quote found on another page we read');
  assert.equal(checked[2].sourceUrl, 'https://smiles.co.uk/');
});

test('fit tiers: all must-haves met is A, one unknown is B, more is C, any miss excludes', () => {
  assert.equal(scoreFit([verdict('c1', 'met'), verdict('c2', 'met'), verdict('c3', 'met')], criteria)?.tier, 'A');
  assert.equal(scoreFit([verdict('c1', 'met'), verdict('c2', 'met'), verdict('c3', 'met')], criteria)?.score, 100);
  assert.equal(scoreFit([verdict('c1', 'met'), verdict('c2', 'unknown')], criteria)?.tier, 'B');
  assert.equal(scoreFit([verdict('c1', 'met'), verdict('c2', 'not_met')], criteria), null);
  assert.equal(scoreFit([verdict('c1', 'unknown'), verdict('c2', 'unknown'), verdict('c3', 'met')], criteria), null, 'no must-have proven');
  const three: SegmentCriterion[] = [...criteria.slice(0, 2), { id: 'c4', label: 'Two or more dentists', mustHave: true }];
  assert.equal(scoreFit([verdict('c1', 'met'), verdict('c2', 'unknown'), verdict('c4', 'unknown')], three)?.tier, 'C');
});

test('model output is validated: unknown sources dropped, segments need a must-have, drafts need substance', () => {
  const allowed = new Set(['https://brightsmile.app/']);
  const profile = parseBusinessProfile({
    name: 'BrightSmile', offering: { text: 'Online booking for dental clinics', sourceUrl: 'https://brightsmile.app/' },
    audience: { text: 'Independent dental clinics', sourceUrl: 'https://evil.example/' }, valueProposition: { text: 'Fewer no-shows', sourceUrl: null },
    industry: 'Health tech', proof: [{ text: '200 clinics', sourceUrl: 'https://brightsmile.app/' }, 'junk'],
  }, allowed);
  assert.equal(profile?.offering.sourceUrl, 'https://brightsmile.app/');
  assert.equal(profile?.audience.sourceUrl, null, 'a page we never read cannot be a source');
  assert.equal(profile?.proof.length, 1);
  assert.equal(parseBusinessProfile({ name: 'x' }, allowed), null);

  const segments = parseSegments({ segments: [
    { name: 'Independent UK clinics', criteria: [{ label: 'Independent dental clinic', mustHave: true }, 'Offers online booking'], roles: ['Practice manager'] },
    { name: 'No must-haves', criteria: [{ label: 'Anything', mustHave: false }] },
  ] });
  assert.equal(segments.length, 1);
  assert.deepEqual(segments[0].criteria.map((criterion) => criterion.id), ['c1', 'c2']);
  assert.equal(sanitizeSegment({ name: '', criteria: ['x'] }), null);

  assert.deepEqual(parseCompetitors({ competitors: [{ name: 'Rival', domain: 'https://www.rival.com' }, { domain: 'brightsmile.app' }, { domain: 'g2.com' }] }, 'brightsmile.app').map((item) => item.domain), ['rival.com']);
  assert.equal(parseDraft({ subject: 'Hi', body: 'too short' }), null);
  assert.ok(parseDraft({ subject: 'Fewer no-shows at Smiles', body: 'Hi {{first_name}}, I saw Smiles takes bookings online. We help clinics cut no-shows. Open to a 15-minute call?' }));
});

test('contact routes are company-level: named-person addresses are left out', () => {
  const routes = extractContactRoutes([{
    url: 'https://smiles.co.uk/',
    text: 'Write to hello@smiles.co.uk or jane.doe@smiles.co.uk. Partners: ventas@other.com',
    links: ['https://smiles.co.uk/contact', 'https://smiles.co.uk/careers/', 'https://other.com/contact'],
  }], 'smiles.co.uk');
  assert.deepEqual(routes.map((route) => [route.kind, route.value]), [
    ['contact_page', 'https://smiles.co.uk/contact'], ['careers', 'https://smiles.co.uk/careers/'], ['generic_email', 'hello@smiles.co.uk'],
  ]);
});

test('drafts are written in the prospect\'s language and exports cannot run spreadsheet formulas', () => {
  assert.equal(languageForLocation('Madrid, Spain'), 'es');
  assert.equal(languageForLocation('Lima, Perú'), 'es');
  assert.equal(languageForLocation('Lyon, France'), 'fr');
  assert.equal(languageForLocation('Leeds, United Kingdom'), 'en');
  assert.equal(languageForLocation(null), 'en');
  const csv = prospectsToCsv([{ name: '=HYPERLINK("x")', domain: 'a.com', fitTier: 'A', fitScore: 90, location: 'Leeds', sizeBand: null, status: 'New',
    whyItFits: 'Independent, UK', contactRoutes: '', draftSubject: 'Hi', draftBody: 'Line one\nline two' }]);
  assert.match(csv, /^Company,Website,Fit tier/);
  assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
  assert.match(csv, /"Line one\nline two"/);
});

test('the crawler picks useful internal pages and honours robots.txt', () => {
  const links = extractLinks('<a href="/about">About</a><a href="/pricing#plans">Pricing</a><a href="https://other.com/about">x</a><a href="/blog/2026/01/post">post</a><a href="/logo.png">x</a><a href="mailto:a@b.com">mail</a>', 'https://www.smiles.co.uk/');
  assert.deepEqual(links, ['https://www.smiles.co.uk/about', 'https://www.smiles.co.uk/pricing', 'https://other.com/about', 'https://www.smiles.co.uk/blog/2026/01/post', 'https://www.smiles.co.uk/logo.png']);
  assert.deepEqual(pickInternalPages(links, 'https://www.smiles.co.uk/', 4), ['https://www.smiles.co.uk/about', 'https://www.smiles.co.uk/pricing']);
  assert.deepEqual(parseRobotsDisallow('User-agent: Googlebot\nDisallow: /g\n\nUser-agent: *\nDisallow: /private\nDisallow:\n# x\nUser-agent: CreativesTakeoverResearch\nDisallow: /'), ['/private', '/']);
});

// ---- A whole run through the real step handlers (network mocked) ------------------------------

type Row = Record<string, any>;

/** Just enough of the Supabase client for the research pipeline. */
class ResearchDb {
  tables: Record<string, Row[]> = {
    gtm_research_runs: [], gtm_research_steps: [], gtm_prospect_companies: [], gtm_outreach_drafts: [],
    gtm_domain_cache: [], gtm_suppressions: [], provider_spend_ledger: [],
  };
  rpcCalls: Array<{ name: string; args: Row }> = [];
  private seq = 0;
  rpc(name: string, args: Row) { this.rpcCalls.push({ name, args }); return Promise.resolve({ data: { success: true }, error: null }); }
  from(table: string) {
    if (!(table in this.tables)) throw new Error(`Unexpected table: ${table}`);
    const rows = this.tables[table];
    const filters: Array<(row: Row) => boolean> = [];
    let mode: 'select' | 'insert' | 'update' | 'upsert' = 'select';
    let payload: Row | Row[] | null = null; let upsertOptions: Row = {};
    let head = false; let limit = Infinity; let order: { key: string; ascending: boolean } | null = null; let joinDrafts = false;
    const db = this;
    const run = () => {
      if (mode === 'insert' || mode === 'upsert') {
        const list = (Array.isArray(payload) ? payload : [payload]) as Row[];
        const keys = String(upsertOptions.onConflict ?? (table === 'gtm_domain_cache' ? 'domain' : '')).split(',').filter(Boolean);
        const written: Row[] = [];
        for (const item of list) {
          const existing = mode === 'upsert' && keys.length ? rows.find((row) => keys.every((key) => row[key] === (item[key] ?? (key === 'batch' ? 0 : undefined)))) : undefined;
          if (existing) { if (!upsertOptions.ignoreDuplicates) Object.assign(existing, item); written.push(existing); continue; }
          const row = { id: `id-${++db.seq}`, created_at: new Date(Date.now() + db.seq).toISOString(), status: table === 'gtm_research_steps' ? 'queued' : undefined, batch: 0, ...item };
          rows.push(row); written.push(row);
        }
        return { data: written, error: null, count: written.length };
      }
      let found = rows.filter((row) => filters.every((filter) => filter(row)));
      if (mode === 'update') { found.forEach((row) => Object.assign(row, payload)); return { data: found, error: null, count: found.length }; }
      if (order) found = [...found].sort((a, b) => (a[order!.key] > b[order!.key] ? 1 : -1) * (order!.ascending ? 1 : -1));
      found = found.slice(0, limit);
      if (joinDrafts) found = found.map((row) => ({ ...row, gtm_outreach_drafts: db.tables.gtm_outreach_drafts.filter((draft) => draft.prospect_id === row.id) }));
      return { data: head ? null : found, error: null, count: found.length };
    };
    const query: any = {
      select: (fields = '*', options: Row = {}) => { head = Boolean(options.head); joinDrafts = String(fields).includes('gtm_outreach_drafts'); return query; },
      insert: (value: Row | Row[]) => { mode = 'insert'; payload = value; return query; },
      upsert: (value: Row | Row[], options: Row = {}) => { mode = 'upsert'; payload = value; upsertOptions = options; return query; },
      update: (value: Row) => { mode = 'update'; payload = value; return query; },
      eq: (key: string, value: unknown) => { filters.push((row) => row[key] === value); return query; },
      in: (key: string, values: unknown[]) => { filters.push((row) => values.includes(row[key])); return query; },
      is: (key: string, value: unknown) => { filters.push((row) => (row[key] ?? null) === value); return query; },
      gte: (key: string, value: string) => { filters.push((row) => String(row[key]) >= value); return query; },
      order: (key: string, options: Row = {}) => { order = { key, ascending: options.ascending !== false }; return query; },
      limit: (value: number) => { limit = value; return query; },
      maybeSingle: async () => { const result = run(); return { ...result, data: (result.data as Row[] | null)?.[0] ?? null }; },
      single: async () => { const result = run(); return { ...result, data: (result.data as Row[] | null)?.[0] ?? null }; },
      then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve().then(run).then(resolve, reject),
    };
    return query;
  }
}

const html = (title: string, body: string, links: string[] = []) =>
  `<html><head><title>${title}</title></head><body><p>${body}</p>${links.map((link) => `<a href="${link}">x</a>`).join('')}</body></html>`;

const SITES: Record<string, string> = {
  'https://brightsmile.app/': html('BrightSmile', 'BrightSmile is online booking software for independent dental clinics. It cuts no-shows with reminders.', ['/pricing']),
  'https://brightsmile.app/pricing': html('Pricing', 'Plans from £49 a month per clinic.'),
  'https://toplist.example/': html('Top dental clinics in Leeds', 'The best independent clinics in Leeds.', ['https://smilesleeds.co.uk/', 'https://gentledental.co.uk/', 'https://megadental.com/']),
  'https://smilesleeds.co.uk/': html('Smiles Leeds', 'Smiles is an independent dental clinic in Leeds, United Kingdom. Book your appointment online any time. Contact hello@smilesleeds.co.uk', ['/contact']),
  'https://gentledental.co.uk/': html('Gentle Dental', 'Gentle Dental is an independent dental clinic run by Dr Shah. Family dentistry in a calm setting.'),
  'https://fakeclaims.co.uk/': html('Fake Claims Dental', 'A dental practice. Opening hours Monday to Friday.'),
  'https://megadental.com/': html('MegaDental Group', 'MegaDental is a corporate group operating 400 practices across Europe.'),
};

function mockNetwork() {
  const original = { fetch: globalThis.fetch, Deno: (globalThis as any).Deno };
  (globalThis as any).Deno = { env: { get: (name: string) => ({ GEMINI_API_KEY: 'test', TAVILY_API_KEY: 'test' } as Row)[name] }, resolveDns: async () => ['93.184.216.34'] };
  const llm = (body: string) => {
    if (body.includes('describe a startup')) return { name: 'BrightSmile', offering: { text: 'Online booking software for dental clinics', sourceUrl: 'https://brightsmile.app/' }, audience: { text: 'Independent dental clinics', sourceUrl: 'https://brightsmile.app/' }, valueProposition: { text: 'Fewer no-shows', sourceUrl: 'https://brightsmile.app/' }, industry: 'Dental software', geography: 'United Kingdom', languages: ['en'], proof: [], contextNotes: [] };
    if (body.includes('similar product to the same buyers')) return { competitors: [{ name: 'Rival', domain: 'rivalbook.com', why: 'Same buyers' }, { name: 'Invented', domain: 'invented-rival.com' }, { name: 'LinkedIn', domain: 'linkedin.com' }] };
    if (body.includes('who a startup should contact first')) return { segments: [{ name: 'Independent UK dental clinics', pain: 'Lost revenue from no-shows', criteria: [{ label: 'Independent dental clinic', mustHave: true }, { label: 'Based in the UK', mustHave: true }, { label: 'Offers online booking', mustHave: false }], geography: 'United Kingdom', roles: ['Practice manager'], examples: ['Single-site family practices'] }] };
    if (body.includes('Write web search queries')) return { queries: ['independent dental clinic Leeds', 'dental practice Leeds online booking', 'top dental clinics Leeds', 'family dentist Leeds', 'q5', 'q6'] };
    if (body.includes('extract companies that could belong')) return { companies: [{ name: 'Smiles Leeds', domain: 'smilesleeds.co.uk' }, { name: 'Gentle Dental', domain: 'gentledental.co.uk' }, { name: 'Fake Claims', domain: 'fakeclaims.co.uk' }, { name: 'MegaDental', domain: 'megadental.com' }, { name: 'Rival', domain: 'rivalbook.com' }, { name: 'Guessed', domain: 'guessed-clinic.co.uk' }, { name: 'Blocked Clinic', domain: 'blockedclinic.co.uk' }] };
    if (body.includes('check companies against a founder')) return { companies: [
      { domain: 'smilesleeds.co.uk', name: 'Smiles Leeds', description: 'Independent clinic', location: 'Leeds, United Kingdom', verdicts: [
        { criterionId: 'c1', verdict: 'met', quote: 'Smiles is an independent dental clinic in Leeds', sourceUrl: 'https://smilesleeds.co.uk/' },
        { criterionId: 'c2', verdict: 'met', quote: 'dental clinic in Leeds, United Kingdom', sourceUrl: 'https://smilesleeds.co.uk/' },
        { criterionId: 'c3', verdict: 'met', quote: 'Book your appointment online any time', sourceUrl: 'https://smilesleeds.co.uk/' }] },
      { domain: 'gentledental.co.uk', name: 'Gentle Dental', location: '', verdicts: [
        { criterionId: 'c1', verdict: 'met', quote: 'Gentle Dental is an independent dental clinic', sourceUrl: 'https://gentledental.co.uk/' },
        { criterionId: 'c2', verdict: 'unknown' }] },
      { domain: 'fakeclaims.co.uk', name: 'Fake Claims', verdicts: [
        { criterionId: 'c1', verdict: 'met', quote: 'proudly independent since 1985 and family owned', sourceUrl: 'https://fakeclaims.co.uk/' },
        { criterionId: 'c2', verdict: 'met', quote: 'located in central Manchester, England', sourceUrl: 'https://fakeclaims.co.uk/' }] },
      { domain: 'megadental.com', name: 'MegaDental', verdicts: [{ criterionId: 'c1', verdict: 'not_met', quote: 'a corporate group operating 400 practices', sourceUrl: 'https://megadental.com/' }] },
    ] };
    if (body.includes('first emails from a founder')) {
      const ids = [...body.matchAll(/id: (id-\d+)/g)].map((match) => match[1]);
      return { drafts: ids.map((id) => ({ prospectId: id, subject: 'Fewer no-shows', body: 'Hi {{first_name}}, I saw you take bookings online. BrightSmile helps independent clinics cut no-shows with reminders. Open to a 15-minute call next week?' })) };
    }
    throw new Error(`Unexpected model call: ${body.slice(0, 120)}`);
  };
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('generativelanguage.googleapis.com')) {
      const text = JSON.stringify(llm(String(init?.body ?? '')));
      return Response.json({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200 } });
    }
    if (url.includes('api.tavily.com')) {
      const query = JSON.parse(String(init?.body)).query as string;
      const results = query.includes('alternatives') || query.includes('companies for')
        ? [{ url: 'https://rivalbook.com/', title: 'RivalBook', content: 'Dental booking' }, { url: 'https://www.linkedin.com/company/x', title: 'x' }]
        : [{ url: 'https://toplist.example/', title: 'Top dental clinics in Leeds', content: 'list' }, { url: 'https://smilesleeds.co.uk/', title: 'Smiles Leeds' },
          { url: 'https://fakeclaims.co.uk/', title: 'Fake Claims Dental' }, { url: 'https://blockedclinic.co.uk/', title: 'Blocked Clinic' }, { url: 'https://rivalbook.com/', title: 'RivalBook' }];
      return Response.json({ results });
    }
    if (url.endsWith('/robots.txt')) return new Response('', { status: 404 });
    if (url.startsWith('https://blockedclinic.co.uk')) return new Response('Forbidden', { status: 403 });
    const page = SITES[url];
    return page ? new Response(page, { headers: { 'content-type': 'text/html' } }) : new Response('Not found', { status: 404 });
  }) as typeof fetch;
  return () => { globalThis.fetch = original.fetch; (globalThis as any).Deno = original.Deno; };
}

test('a full research run: evidence-backed prospects, honest tiers, drafts, and a charge for what was delivered', async () => {
  const restore = mockNetwork();
  try {
    const { STEP_HANDLERS } = await import('../supabase/functions/_shared/gtm-research-pipeline.ts');
    const db = new ResearchDb();
    const run: Row = { id: 'run-1', user_id: 'founder', project_id: 'project-1', status: 'analyzing', input: { websiteUrl: 'brightsmile.app' },
      business_profile: null, competitors: [], segments: [], selected_segment: null, target_count: 20, counts: {}, reservation_id: 'hold-1', gifted: false };
    db.tables.gtm_research_runs.push(run);
    const queue: Array<{ key: string; batch: number }> = [{ key: 'read_site', batch: 0 }];
    const logs: string[] = [];
    let guard = 0;
    while (queue.length && guard++ < 40) {
      const next = queue.shift()!;
      const step: Row = { id: `step-${guard}`, run_id: run.id, user_id: run.user_id, key: next.key, batch: next.batch, attempt: 1, max_attempts: 3, detail: {}, status: 'running' };
      db.tables.gtm_research_steps.push(step);
      const outcome = await (STEP_HANDLERS as Row)[next.key](db, run, step);
      Object.assign(step, { status: outcome.status ?? 'done', detail: outcome.detail ?? {}, log: outcome.log });
      Object.assign(run, outcome.runPatch ?? {});
      logs.push(`${next.key}: ${outcome.log}`);
      if (run.status === 'needs_review') {
        // The founder confirms the first proposed segment.
        assert.equal(run.segments.length, 1);
        Object.assign(run, { selected_segment: run.segments[0], status: 'running' });
        queue.push({ key: 'discover_companies', batch: 0 });
        continue;
      }
      for (const item of outcome.next ?? []) queue.push({ key: item.key, batch: item.batch ?? 0 });
    }

    assert.equal(run.business_profile.name, 'BrightSmile');
    assert.deepEqual(run.competitors.map((competitor: Row) => competitor.domain), ['rivalbook.com'], 'invented and platform competitors dropped');

    const prospects = db.tables.gtm_prospect_companies;
    const byDomain = Object.fromEntries(prospects.map((prospect) => [prospect.domain, prospect]));
    assert.ok(!byDomain['rivalbook.com'], 'a competitor is never a prospect');
    assert.ok(!byDomain['guessed-clinic.co.uk'], 'a domain not seen in results or links is never used');
    assert.ok(!byDomain['megadental.com'], 'a company that contradicts a must-have is excluded');
    assert.equal(byDomain['smilesleeds.co.uk'].fit_tier, 'A');
    assert.deepEqual(byDomain['smilesleeds.co.uk'].contact_routes.map((route: Row) => route.value), ['https://smilesleeds.co.uk/contact', 'hello@smilesleeds.co.uk']);
    assert.equal(byDomain['gentledental.co.uk'].fit_tier, 'B');
    assert.ok(!byDomain['fakeclaims.co.uk'], 'quotes that are not on the page prove nothing, so it does not qualify');
    assert.equal(byDomain['blockedclinic.co.uk'].fit_tier, 'C');
    assert.equal(byDomain['blockedclinic.co.uk'].blocked, true);

    const drafted = db.tables.gtm_outreach_drafts.map((draft) => prospects.find((prospect) => prospect.id === draft.prospect_id)?.domain).sort();
    assert.deepEqual(drafted, ['gentledental.co.uk', 'smilesleeds.co.uk'], 'drafts only for strong and good fits');

    const capture = db.rpcCalls.find((call) => call.name === 'finalize_credit_reservation_v1');
    assert.equal(capture?.args.p_charge, 2, 'two qualified companies cost 2 of the 10 held credits');
    assert.equal(run.status, 'partial');
    assert.equal(run.credits_charged, 2);
    assert.ok(db.tables.provider_spend_ledger.length > 5, 'every search and model call is in the spend ledger');
    assert.ok(logs.some((line) => /Checked \d+ websites · 2 match your criteria/.test(line)), logs.join('\n'));
  } finally { restore(); }
});

test('the migration keeps credits and research safe: holds are service-only and founders edit only their own decisions', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261115120000_gtm_research_agent.sql', import.meta.url), 'utf8');
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.reserve_credits_v1[^;]+FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.finalize_credit_reservation_v1[^;]+FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /IF COALESCE\(v_balance, 0\) \+ COALESCE\(v_quota, 0\) < p_amount THEN/, 'a hold needs the full price');
  assert.match(sql, /v_charge := LEAST\(GREATEST\(COALESCE\(p_charge, 0\), 0\), v_reservation\.held_amount\)/, 'never charges more than held');
  assert.match(sql, /GRANT UPDATE \(status, feedback, pipeline_entry_id, updated_at\) ON public\.gtm_prospect_companies TO authenticated/);
  assert.match(sql, /GRANT UPDATE \(subject, body, status, edited, updated_at\) ON public\.gtm_outreach_drafts TO authenticated/);
  assert.match(sql, /REVOKE ALL ON public\.gtm_domain_cache, public\.gtm_suppressions, public\.provider_spend_ledger FROM authenticated/);
  assert.match(sql, /user_id UUID NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/, 'account deletion removes research');
  assert.match(sql, /cron\.schedule\('gtm-research-sweeper'/);
});
