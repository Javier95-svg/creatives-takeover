import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  chargeForRun, creditsForFollowUp, creditsForRun, dedupeCandidates, emailStatusFromVerifier, extractContactRoutes, feedbackLessons, isExcludedDomain,
  languageForLocation, normalizeDomain, parseBusinessProfile, parseCompetitors, parseDomainSearchPeople, parseDraft, parseSegments, parseSignals,
  personalizeDraft, pickDecisionMaker, prospectsToCsv, quoteAppearsIn, rerunEligible, runPrice, sanitizeSegment, scoreFit, STEP_TITLES, variantStats,
  verifyVerdicts, type CriterionVerdict, type SegmentCriterion,
} from '../src/lib/gtmResearch.ts';
import { extractLinks, parseRobotsDisallow, pickInternalPages } from '../supabase/functions/_shared/site-crawler.ts';
import { driveResearchRun, ResearchDb } from './helpers/researchDatabase.ts';

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

function mockNetwork(prompts: string[] = []) {
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
    if (body.includes('first email from a founder')) {
      const ids = [...body.matchAll(/id: (id-\d+)/g)].map((match) => match[1]);
      return { drafts: ids.map((id) => ({ prospectId: id,
        a: { subject: 'Fewer no-shows', body: 'Hi {{first_name}}, I saw you take bookings online. BrightSmile helps independent clinics cut no-shows with reminders. Open to a 15-minute call next week?' },
        b: { subject: 'Empty chairs?', body: 'Hi {{first_name}}, most independent clinics lose a few slots a week to no-shows. BrightSmile fills them with reminders. Worth a 15-minute call?' } })) };
    }
    if (body.includes('recent events about that exact company')) {
      const ids = [...body.matchAll(/### id: (id-\d+)/g)].map((match) => match[1]);
      return { companies: ids.map((id) => ({ id, signals: [
        { kind: 'hiring', text: 'Hiring a receptionist to manage bookings', date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10), sourceUrl: 'https://news.example/hiring' },
        { kind: 'funding', text: 'Raised money in 2023', date: '2023-03-01', sourceUrl: 'https://news.example/hiring' },
        { kind: 'launch', text: 'An invented launch', date: '2026-09-01', sourceUrl: 'https://made-up.example/' },
      ] })) };
    }
    throw new Error(`Unexpected model call: ${body.slice(0, 120)}`);
  };
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('generativelanguage.googleapis.com')) {
      prompts.push(String(init?.body ?? ''));
      const text = JSON.stringify(llm(String(init?.body ?? '')));
      return Response.json({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200 } });
    }
    if (url.includes('api.tavily.com')) {
      const query = JSON.parse(String(init?.body)).query as string;
      if (query.includes('hiring OR funding')) return Response.json({ results: [{ url: 'https://news.example/hiring', title: 'Clinic hiring', content: 'October 2026' }] });
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

const drive = (db: ResearchDb, run: Row, first: string, logs: string[]) => driveResearchRun(db, run, first, logs, (current) => {
  // The founder confirms the first proposed segment.
  assert.equal(current.segments.length, 1);
  return current.segments[0];
});

const baseRun = (extra: Row = {}): Row => ({ id: 'run-1', user_id: 'founder', project_id: 'project-1', status: 'analyzing', input: { websiteUrl: 'brightsmile.app' },
  business_profile: null, competitors: [], segments: [], selected_segment: null, target_count: 20, counts: {}, reservation_id: 'hold-1', gifted: false,
  kind: 'initial', parent_run_id: null, seed_domains: [], cohort_id: null, auto_refresh: false, ...extra });

test('a full research run: evidence-backed prospects, honest tiers, drafts, and a charge for what was delivered', async () => {
  const prompts: string[] = [];
  const restore = mockNetwork(prompts);
  try {
    const db = new ResearchDb();
    const run = baseRun();
    db.tables.gtm_research_runs.push(run);
    const logs: string[] = [];
    await drive(db, run, 'read_site', logs);

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
    assert.ok(db.tables.gtm_outreach_drafts.every((draft) => draft.variant_b_body && draft.variant_b_subject === 'Empty chairs?'), 'each draft has a second version');

    // Recent news: only the dated, in-year item whose link was in the search results.
    assert.deepEqual(byDomain['smilesleeds.co.uk'].signals.map((signal: Row) => signal.kind), ['hiring']);
    assert.equal(byDomain['blockedclinic.co.uk'].signals, undefined, 'possible fits are not looked up');
    const draftPrompt = prompts.find((prompt) => prompt.includes('first email from a founder')) ?? '';
    assert.match(draftPrompt, /recent news: \d{4}-\d{2}-\d{2}: Hiring a receptionist/, 'drafts can use the news');

    const capture = db.rpcCalls.find((call) => call.name === 'finalize_credit_reservation_v1');
    assert.equal(capture?.args.p_charge, 2, 'two qualified companies cost 2 of the 10 held credits');
    assert.equal(run.status, 'partial');
    assert.equal(run.credits_charged, 2);
    assert.ok(db.tables.provider_spend_ledger.length > 5, 'every search and model call is in the spend ledger');
    assert.ok(logs.some((line) => /Checked \d+ websites · 2 match your criteria/.test(line)), logs.join('\n'));
    assert.ok(logs.some((line) => line.startsWith('find_signals: Found recent news for 2 of 2')), logs.join('\n'));

    // ---- A follow-up on the same search learns from the founder's rejections ----
    const gentle = byDomain['gentledental.co.uk'];
    Object.assign(gentle, { status: 'dismissed', feedback: { reason: 'Too big', at: new Date().toISOString() } });
    const more = baseRun({ id: 'run-2', kind: 'more', parent_run_id: 'run-1', status: 'queued', target_count: 10, reservation_id: 'hold-2',
      business_profile: run.business_profile, competitors: run.competitors, segments: run.segments, selected_segment: run.selected_segment, counts: { ownDomain: 'brightsmile.app' } });
    db.tables.gtm_research_runs.push(more);
    prompts.length = 0;
    const moreLogs: string[] = [];
    await drive(db, more, 'discover_companies', moreLogs);
    const planPrompt = prompts.find((prompt) => prompt.includes('Write web search queries')) ?? '';
    assert.match(planPrompt, /Gentle Dental \(gentledental\.co\.uk\): Too big/, 'rejections with a reason reach the next search');
    assert.equal(db.tables.gtm_prospect_companies.filter((prospect) => prospect.run_id === 'run-2').length, 0, 'companies already in the list are not found again');
    const followUpCharge = db.rpcCalls.filter((call) => call.name === 'finalize_credit_reservation_v1').at(-1);
    assert.equal(followUpCharge?.args.p_reservation_id, 'hold-2');
    assert.equal(followUpCharge?.args.p_charge, 0, 'nothing new found, nothing charged');
    assert.equal(more.status, 'failed');
    assert.equal(more.error_code, 'NO_MATCHES');

    // A weekly check that finds nothing new is a normal week, not a failure, and sends no notification.
    const { finalizeRun, notifyRunFinished } = await import('../supabase/functions/_shared/gtm-research-pipeline.ts');
    const refresh = baseRun({ id: 'run-3', kind: 'refresh', parent_run_id: 'run-1', status: 'running', reservation_id: null, selected_segment: run.selected_segment });
    const quiet = await finalizeRun(db as never, refresh as never);
    assert.equal(quiet.runPatch?.status, 'completed');
    assert.equal(quiet.runPatch?.error_code, undefined);
    await notifyRunFinished(db as never, refresh as never, quiet.runPatch ?? {});
    assert.equal(db.tables.community_notifications.length, 0);
    await notifyRunFinished(db as never, run as never, { counts: { qualified: 2 } });
    assert.equal(db.tables.community_notifications[0].notification_type, 'customer_research_ready');
    assert.match(db.tables.community_notifications[0].metadata.message, /^2 companies are ready to contact for Independent UK dental clinics$/);
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

// ---- Phases B and C: follow-up runs, feedback, news, contacts, A/B ----------------------------

test('follow-up runs: +10 companies costs half a credit each up to 5, the re-run is free, nothing found costs nothing', () => {
  assert.deepEqual([0, 1, 3, 9, 10, 25].map(creditsForFollowUp), [0, 1, 2, 5, 5, 5]);
  assert.deepEqual(runPrice('initial'), { feature: 'GTM_RESEARCH_RUN', credits: 10 });
  assert.deepEqual(runPrice('more'), { feature: 'GTM_RESEARCH_MORE', credits: 5 });
  assert.deepEqual(runPrice('refresh'), { feature: 'GTM_RESEARCH_MORE', credits: 5 });
  assert.deepEqual(runPrice('rerun'), { feature: null, credits: 0 });
  assert.equal(chargeForRun('initial', 12), 10);
  assert.equal(chargeForRun('similar', 4), 2);
  assert.equal(chargeForRun('rerun', 20), 0);
});

test('the free re-run needs half of the good matches rejected with a reason, once', () => {
  const fit = (status: string, reason?: string) => ({ fit_tier: 'A' as const, status, feedback: reason ? { reason } : null });
  assert.equal(rerunEligible([fit('dismissed', 'Too big'), fit('new')], false), true);
  assert.equal(rerunEligible([fit('dismissed', 'Too big'), fit('new')], true), false, 'only once per search');
  assert.equal(rerunEligible([fit('dismissed'), fit('new')], false), false, 'a dismissal without a reason is not feedback');
  assert.equal(rerunEligible([fit('dismissed', 'Too big'), fit('new'), fit('new')], false), false);
  assert.equal(rerunEligible([fit('dismissed', 'Too big')], false), false, 'one company is too few to judge a search');
  assert.equal(rerunEligible([{ fit_tier: 'C', status: 'dismissed', feedback: { reason: 'Other' } }, fit('dismissed', 'Too big'), fit('new')], false), true, 'possible fits do not count');
});

test('feedback lessons are newest first, named, and capped', () => {
  const lines = feedbackLessons([
    { domain: 'a.com', name: 'A', feedback: { reason: 'Too big', at: '2026-11-01' } },
    { domain: 'b.com', name: null, feedback: { reason: 'A competitor', at: '2026-11-10' } },
    { domain: 'c.com', name: 'C', feedback: null },
  ], 5);
  assert.deepEqual(lines, ['b.com (b.com): A competitor', 'A (a.com): Too big']);
});

test('news needs a date within twelve months and a link from the results', () => {
  const now = new Date('2026-11-15T00:00:00Z');
  const allowed = new Set(['https://news.example/a']);
  const signals = parseSignals({ signals: [
    { kind: 'funding', text: 'Raised a seed round', date: '2026-06', sourceUrl: 'https://news.example/a' },
    { kind: 'hiring', text: 'Old news', date: '2025-01-02', sourceUrl: 'https://news.example/a' },
    { kind: 'launch', text: 'Invented link', date: '2026-10-01', sourceUrl: 'https://elsewhere.example/' },
    { kind: 'rumour', text: 'Undated', sourceUrl: 'https://news.example/a' },
    { kind: 'whatever', text: 'Opened a new office', date: '2026-11-01', sourceUrl: 'https://news.example/a' },
    { kind: 'news', text: 'From the future', date: '2027-01-01', sourceUrl: 'https://news.example/a' },
  ] }, allowed, now);
  assert.deepEqual(signals.map((signal) => [signal.kind, signal.date]), [['news', '2026-11-01'], ['funding', '2026-06-01']]);
});

test('a named contact: real people at that domain, the closest title wins, only deliverable emails count', () => {
  const people = parseDomainSearchPeople({ data: { emails: [
    { value: 'info@clinic.co.uk', type: 'generic', confidence: 99 },
    { value: 'amy@clinic.co.uk', type: 'personal', first_name: 'Amy', last_name: 'Hart', position: 'Practice Manager', confidence: 80, sources: [{ uri: 'https://clinic.co.uk/team' }] },
    { value: 'raj@clinic.co.uk', type: 'personal', first_name: 'Raj', last_name: 'Patel', position: 'Dental Nurse', confidence: 95 },
    { value: 'ceo@other.com', type: 'personal', first_name: 'Elsewhere', position: 'CEO', confidence: 99 },
    { value: 'nameless@clinic.co.uk', type: 'personal', position: 'Owner', confidence: 99 },
  ] } }, 'clinic.co.uk');
  assert.deepEqual(people.map((person) => person.email), ['amy@clinic.co.uk', 'raj@clinic.co.uk']);
  assert.equal(pickDecisionMaker(people, ['Practice manager', 'Principal dentist'])?.email, 'amy@clinic.co.uk');
  assert.equal(pickDecisionMaker(people.slice(1), ['Marketing lead']), null, 'no title match and not senior: nobody');
  assert.equal(emailStatusFromVerifier({ data: { status: 'valid' } }), 'valid');
  assert.equal(emailStatusFromVerifier({ data: { status: 'accept_all' } }), 'catch_all');
  assert.equal(emailStatusFromVerifier({ data: { status: 'invalid' } }), null);
  assert.equal(emailStatusFromVerifier({ data: { status: 'unknown' } }), null);
  assert.equal(personalizeDraft('Hi {{first_name}}, and {{ FIRST_NAME }}', 'Amy'), 'Hi Amy, and Amy');
  assert.equal(personalizeDraft('Hi {{first_name}},', null), 'Hi {{first_name}},');
});

test('A/B counts come from the founder\'s own sent and reply marks', () => {
  const stats = variantStats([
    { status: 'sent_manually', chosen_variant: 'a' }, { status: 'replied', chosen_variant: 'a' },
    { status: 'replied', chosen_variant: 'b' }, { status: 'draft', chosen_variant: 'b' }, { status: 'approved', chosen_variant: 'a' },
  ]);
  assert.deepEqual(stats, { a: { sent: 2, replied: 1 }, b: { sent: 1, replied: 1 } });
});

test('the completion migration: every step the app knows is allowed, staff see counts only, allowances are admin-set', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261116120000_gtm_research_complete.sql', import.meta.url), 'utf8');
  const keys = /gtm_research_steps_key_check CHECK \(key IN \(([^)]+)\)\)/.exec(sql)?.[1].match(/'([a-z_]+)'/g)?.map((key) => key.slice(1, -1)).sort();
  assert.deepEqual(keys, Object.keys(STEP_TITLES).sort(), 'the step key constraint matches the app');
  assert.match(sql, /CHECK \(kind IN \('initial', 'more', 'similar', 'rerun', 'refresh'\)\)/);
  assert.match(sql, /CHECK \(status IN \('draft', 'approved', 'sent_manually', 'replied'\)\)/);
  assert.match(sql, /REVOKE INSERT, UPDATE ON public\.gtm_prospect_contacts FROM authenticated/, 'only the server writes named contacts');
  assert.match(sql, /REVOKE ALL ON public\.provider_spend_alerts FROM anon, authenticated/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.cohort_research_allowance_v1\(UUID\) FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /IF NOT public\.has_role\(auth\.uid\(\), 'admin'::app_role\) THEN/, 'only admins set a program allowance');
  assert.match(sql, /'outreachSent', count\(\*\) FILTER \(WHERE e\.event_type = 'outreach_sent'\)/);
  assert.match(sql, /'companiesQualified', \(SELECT count\(\*\) FROM public\.gtm_prospect_companies g/);
  assert.match(sql, /'staffCode', CASE WHEN v_is_admin THEN v_cohort\.staff_code ELSE NULL END/, 'staff invites stay admin-only');
  assert.doesNotMatch(sql, /'(domain|name)', g\./, 'the dashboard never returns companies');
  assert.match(sql, /cron\.schedule\('gtm-research-weekly-refresh', '0 8 \* \* 1'/);
});
