import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { FOUNDER_TOOL_CATALOG, FOUNDER_TOOLS_BY_ROUTE } from '../src/config/founderToolCatalog.ts';
import { STAGE_TASKS } from '../src/lib/bizmapStages.ts';
import { isWorkspaceRoute } from '../src/lib/workspacePolicy.ts';
import { PLATFORM_TOUR_FIXTURE } from '../src/lib/platformTour/tourFixture.ts';
import { tourArtifactStatus, tourArtifactTotals } from '../src/lib/platformTour/tourArtifacts.ts';
import {
  DEFAULT_TOUR_PANEL, TOUR_EXCLUDED_TOOLS, TOUR_EXTERNAL_ROUTES, TOUR_PANELS,
  resolveTourNavigation, resolveTourPanel, toolPanelKey, tourHighlightPath,
} from '../src/lib/platformTour/tourPanels.ts';
import {
  EMPTY_TOUR_BUDGET, TOUR_PANEL_LIMIT, TOUR_QUESTION_LIMIT,
  panelBlocked, panelsLeft, questionsExhausted, questionsLeft, recordPanel, recordQuestion,
} from '../src/lib/platformTour/tourLimits.ts';

const TOUR_ENTRY = 'src/pages/PlatformTour.tsx';

/** Resolves an import specifier to a file under src/, or null for anything else. */
function resolveLocal(specifier: string, from: string) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const base = specifier.startsWith('@/')
    ? resolve('src', specifier.slice(2))
    : resolve(dirname(from), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (existsSync(candidate) && !candidate.endsWith('/')) {
      try { if (readFileSync(candidate).length >= 0) return candidate; } catch { /* a directory */ }
    }
  }
  return null;
}

/**
 * Site-wide telemetry, which every public page already uses. The walk records
 * this edge but does not follow it, because analytics legitimately reaches the
 * database for product events and the separate test below proves it cannot do
 * so for any platform_tour_ event.
 */
const TELEMETRY_BOUNDARY = resolve('src/lib/analytics.ts');

/**
 * The signup modal, which is the tour's only exit into the product. It reaches
 * the auth context and the database client because creating an account is
 * exactly its job, and it is lazy so none of that is in the tour's eager graph.
 * The walk records the edge and stops, rather than treating the whole signup
 * path as tour code.
 */
const SIGNUP_BOUNDARY = resolve('src/components/auth/AccountSignupDialog.tsx');
const BOUNDARIES = new Set([TELEMETRY_BOUNDARY, SIGNUP_BOUNDARY]);

/** Every module the tour route statically reaches, with the chain that got there. */
function tourClosure() {
  const chains = new Map<string, string[]>([[resolve(TOUR_ENTRY), [TOUR_ENTRY]]]);
  const queue = [resolve(TOUR_ENTRY)];
  while (queue.length) {
    const file = queue.shift()!;
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
      const target = resolveLocal(match[1], file);
      if (!target || chains.has(target)) continue;
      chains.set(target, [...chains.get(file)!, match[1]]);
      if (!BOUNDARIES.has(target)) queue.push(target);
    }
  }
  return chains;
}

test('the tour route never reaches product data', () => {
  // The whole feature rests on this. /demo is served to anonymous visitors with
  // a sample founder, so a single Live component, auth context or service
  // client pulled in by a later edit would quietly turn a marketing page into
  // an authenticated one. Asserting the import graph catches that edit, which
  // reading today's code does not.
  const banned = /integrations\/supabase|@supabase\/|contexts\/AuthContext|\/services\/|Live['"]|@tanstack\/react-query/;
  const closure = tourClosure();
  // captureEvent is the one permitted edge and it is proven safe below.
  const allowed = new Set(['src/lib/analytics.ts', 'src/components/auth/AccountSignupDialog.tsx']);
  for (const [file, chain] of closure) {
    const relative = file.replace(resolve('.') + '\\', '').replace(resolve('.') + '/', '').replace(/\\/g, '/');
    if (allowed.has(relative)) continue;
    const source = readFileSync(file, 'utf8');
    const offending = source.split('\n').filter(line => /^\s*import/.test(line) && banned.test(line));
    assert.equal(offending.length, 0, `${relative} reaches product data via ${chain.join(' -> ')}\n${offending.join('\n')}`);
  }
  for (const name of ['WorkspaceLive.tsx', 'PulseHomeLive.tsx', 'PulseHome.tsx', 'WorkspaceAccountSearch.tsx',
    'WorkspaceProfileAvatar.tsx', 'PreviewCreditMenu.tsx', 'DashboardShell.tsx', 'pulseHomeStream.ts']) {
    const hit = [...closure.keys()].find(file => file.endsWith(name));
    assert.equal(hit, undefined, `${name} must not be reachable from ${TOUR_ENTRY}`);
  }
});

test('the signup modal is the only way out and it loads lazily', () => {
  // Signing up is the tour's single exit into the product, so it uses the real
  // modal rather than a lookalike that would drift from it. That modal reaches
  // auth and the database to do its job, so it must be lazy: a static import
  // would put both in the bundle every anonymous visitor downloads.
  const gate = readFileSync('src/components/platform-tour/PlatformTourSignupGate.tsx', 'utf8');
  assert.match(gate, /lazy\(\(\) => import\('@\/components\/auth\/AccountSignupDialog'\)\)/);
  assert.doesNotMatch(gate, /^import \{?\s*AccountSignupDialog/m, 'a static import would defeat the point');
  // Converting mid-tour must come back to the tour rather than dropping the
  // visitor somewhere they were not.
  assert.match(gate, /returnPath="\/demo"/);
  // /build owns the other caller. One dialog, so the two cannot drift apart.
  const build = readFileSync('src/pages/BuildPage.tsx', 'utf8');
  assert.match(build, /<AccountSignupDialog/);
  assert.doesNotMatch(build, /Continue with GitHub/, 'the dialog markup should live in one place now');
  // The prompt is a heading and the three buttons, nothing else. It used to
  // carry a paragraph and an echo of the panel the visitor came from, which
  // turned a prompt into a page.
  assert.doesNotMatch(gate, /subtitle=|contextLabel=|contextValue=/);
  // Every reason still reaches the dialog, so none can quietly become a dead end
  // with no way to sign up.
  const reasons = [...gate.matchAll(/^ {2}([a-z]+): [`']/gm)].map(match => match[1]);
  assert.ok(reasons.length >= 9, `expected a heading for every gate reason, found ${reasons.join(', ')}`);
});

test('the tour owns no data access of its own', () => {
  // Prose about the database is fine and worth keeping. Code that touches it is
  // not, so this reads statements rather than the whole file.
  for (const [file] of tourClosure()) {
    if (!/platform-tour|platformTour|PlatformTour/.test(file)) continue;
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(code, /supabase|\.rpc\(|\.from\(|functions\.invoke|\bfetch\s*\(/i, `${file} must not access data`);
  }
});

test('tour analytics cannot write roadmap activity', () => {
  // captureEvent is the only path from /demo to the database. It fans into
  // recordRoadmapAnalyticsEvent, which early-returns unless the event name is
  // one of three product events, so the platform_tour_ prefix can never reach
  // record_roadmap_activity. Pinned here because a future event rename that
  // collided with that list would be silent.
  const tracking = readFileSync('src/lib/roadmapRetentionTracking.ts', 'utf8');
  const guard = /if \(!\[('tool_opened'|'tool_output_created'|'icp_builder_step_completed')(, ?('tool_opened'|'tool_output_created'|'icp_builder_step_completed')){2}\]\.includes\(name\)\) return;/;
  assert.match(tracking, guard, 'recordRoadmapAnalyticsEvent must still gate on a fixed event allowlist');
  const analytics = readFileSync('src/lib/platformTour/tourAnalytics.ts', 'utf8');
  for (const name of analytics.match(/captureEvent\('([a-z_]+)'/g) ?? []) {
    const event = name.replace(/captureEvent\('/, '').replace(/'$/, '');
    assert.ok(event.startsWith('platform_tour_'), `${event} must carry the platform_tour_ prefix`);
    assert.ok(!tracking.includes(`'${event}'`), `${event} collides with a roadmap activity event`);
  }
});

test('the seeded founder stays coherent with the product config', () => {
  const { account, project, credits, icpSampleKey } = PLATFORM_TOUR_FIXTURE;
  const samples = readFileSync('src/components/icp/sampleIcpPreviewData.ts', 'utf8');
  assert.match(samples, new RegExp(`key: "${icpSampleKey}"`), 'the ICP panel renders a sample that must exist');
  assert.ok(STAGE_TASKS[project.stage].length > 0, 'the dashboard panel reads tasks from the stage templates');
  // The tour and the design prototype are different surfaces. Sharing an
  // identity muddles both, and these literals are the ones the shell files are
  // forbidden from carrying.
  assert.notEqual(account.username, 'javo95');
  assert.notEqual(credits.totalAvailable, 680);
  assert.notEqual(account.profileHref, '/profile/javier');
  const dashboard = ['/dashboard', '/dashboard/tasks'];
  for (const priority of PLATFORM_TOUR_FIXTURE.priorities) {
    const route = priority.route.split(/[?#]/)[0];
    assert.ok(FOUNDER_TOOLS_BY_ROUTE[route] || dashboard.includes(route), `${priority.route} must be a real destination`);
  }
});

test('every catalog tool has a status and a panel, so the tour cannot gain a hole', () => {
  const keys = new Set(TOUR_PANELS.map(panel => panel.key));
  for (const tool of FOUNDER_TOOL_CATALOG) {
    assert.ok(['complete', 'in_progress', 'locked'].includes(tourArtifactStatus(tool)), tool.key);
    // A tool is either shown or deliberately excluded. A new catalog entry that
    // is neither still fails here, so the tour cannot silently gain a hole.
    const shown = keys.has(toolPanelKey(tool.key));
    assert.notEqual(shown, TOUR_EXCLUDED_TOOLS.has(tool.key), `${tool.key} needs a panel or an explicit exclusion`);
  }
  // First Customer Proof is a workspace inside GTM Strategist, sharing its route
  // and entitlement. A panel of its own told visitors Stage 5 has three tools.
  assert.ok(TOUR_EXCLUDED_TOOLS.has('first_customer_sprint'));
  const launch = TOUR_PANELS.filter(panel => panel.tool?.stageNumber === 5).map(panel => panel.label);
  assert.deepEqual(launch, ['GTM Strategist', 'Directories']);
  // Tech Stack Builder is a resource, not a stage tool, so Stage 4 is MVP Builder alone.
  assert.ok(TOUR_EXCLUDED_TOOLS.has('tech_stack'));
  const building = TOUR_PANELS.filter(panel => panel.tool?.stageNumber === 4).map(panel => panel.label);
  assert.deepEqual(building, ['MVP Builder']);
  assert.equal(resolveTourNavigation('/go-to-market?workspace=first-customer-proof').kind, 'panel');
  const totals = tourArtifactTotals();
  assert.equal(totals.complete + totals.in_progress + totals.locked, FOUNDER_TOOL_CATALOG.length);
  assert.ok(totals.complete > 0 && totals.locked > 0, 'the tour should show finished and unreached work');
});

test('every sidebar destination lands somewhere', () => {
  // WorkspaceSidebar is the real product nav, so a visitor can click anything in
  // it. Each label must resolve to a panel, a genuinely public page, or the
  // signup prompt. Nothing may fall through to a blank screen.
  // openRoute bails unless the label resolves in WORKSPACE_ROUTES, so that
  // table is the complete set of destinations a sidebar click can produce.
  const sidebar = readFileSync('src/components/workspace/WorkspaceSidebar.tsx', 'utf8');
  assert.match(sidebar, /const path = WORKSPACE_ROUTES\[label\];\s*\n\s*if \(!path\) return;/);
  const navigation = readFileSync('src/lib/workspaceNavigation.ts', 'utf8');
  // Entries are a mix of bare and quoted keys: Overview: '/dashboard' and
  // 'Find a Mentor': '/mentorship'.
  const routes = [...navigation.matchAll(/(?:'[^']+'|[A-Za-z]\w*):\s*'(\/[^']*)'/g)].map(match => match[1]);
  assert.ok(routes.length > 10, 'expected the workspace route table to parse');
  for (const route of [...routes, '/']) {
    const target = resolveTourNavigation(route);
    assert.ok(['panel', 'external', 'account'].includes(target.kind), route);
  }
});

test('panel resolution is total and cannot be steered', () => {
  assert.equal(resolveTourPanel(null).key, DEFAULT_TOUR_PANEL);
  assert.equal(resolveTourPanel(undefined).key, DEFAULT_TOUR_PANEL);
  assert.equal(resolveTourPanel('').key, DEFAULT_TOUR_PANEL);
  assert.equal(resolveTourPanel('../../etc/passwd').key, DEFAULT_TOUR_PANEL);
  assert.equal(resolveTourPanel('https://example.com').key, DEFAULT_TOUR_PANEL);
  for (const panel of TOUR_PANELS) {
    assert.equal(resolveTourPanel(panel.key).key, panel.key);
    assert.ok(tourHighlightPath(panel).startsWith('/'), panel.key);
  }
  for (const route of TOUR_EXTERNAL_ROUTES) assert.equal(resolveTourNavigation(route).kind, 'external');
  assert.equal(resolveTourNavigation('/dashboard/settings').kind, 'account');
  assert.equal(resolveTourNavigation('/').kind, 'panel');
});

test('the stale demo page is gone and the discovery calls are not', () => {
  for (const file of [
    'src/pages/Demo.tsx', 'src/hooks/useDemoState.ts', 'src/utils/demoDataSeeder.ts',
    'src/components/demo/BusinessPlanningDemo.tsx', 'src/components/demo/ChatbotDemo.tsx',
    'src/components/demo/CommunityDemo.tsx', 'src/components/demo/DemoControlPanel.tsx',
    'src/components/demo/DemoScenarios.tsx', 'src/components/demo/InsightaDemo.tsx',
    'src/components/demo/PromptLibraryDemo.tsx', 'src/components/demo/ServiceSelector.tsx',
  ]) assert.equal(existsSync(file), false, `${file} belonged to the replaced /demo page`);
  // These four share the directory but are live product: real scheduled video
  // calls behind /demo-calls. A later cleanup of "the demo folder" must not
  // take them out.
  for (const file of [
    'src/components/demo/DemoCallCard.tsx', 'src/components/demo/DemoCallLobby.tsx',
    'src/components/demo/DemoCallScheduler.tsx', 'src/components/demo/DemoCallsDashboard.tsx',
  ]) assert.equal(existsSync(file), true, `${file} is live product code`);
});

test('the shell changes are additive and production behaviour is unchanged', () => {
  const layout = readFileSync('src/components/workspace/WorkspaceLayout.tsx', 'utf8');
  assert.match(layout, /onNavigate\?: \(path: string\) => void/);
  assert.match(layout, /\(onNavigate \?\? enterWorkspaceRoute\)\(path\)/);
  assert.match(layout, /currentPath \?\? \(home \? '\/' : location\.pathname\)/);
  // WorkspaceLive is the authenticated caller. It passes neither prop, which is
  // what makes the defaults the production path.
  assert.doesNotMatch(readFileSync('src/components/workspace/WorkspaceLive.tsx', 'utf8'), /onNavigate|currentPath=/);
  // The sidebar lockup used to navigate directly, so a caller that intercepted
  // navigation could still be pulled off the route by a click on the logo.
  const sidebar = readFileSync('src/components/workspace/WorkspaceSidebar.tsx', 'utf8');
  assert.doesNotMatch(sidebar, /enterWorkspaceRoute\('\/'\)/);
  const pulse = readFileSync('src/components/pulse/PulseHomeView.tsx', 'utf8');
  assert.match(pulse, /navigate = enterWorkspaceRoute/);
  assert.doesNotMatch(pulse, /enterWorkspaceRoute\((item|action)?\.?route\)/);
});

test('the tour is registered everywhere a public route has to be', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /path="\/demo" element=\{<RouteErrorBoundary routeName="Platform Tour">/);
  assert.match(app, /import\("\.\/pages\/PlatformTour"\)/);
  const seo = readFileSync('scripts/seo-route-config.mjs', 'utf8');
  assert.match(seo, /path: "\/demo"/);
  assert.match(seo, /Platform Tour \| Creatives Takeover/);
  assert.match(seo, /ogImage: `\$\{BASE_URL\}\/demo-page-metadata\.png`/);
  assert.match(seo, /ogImageWidth: 3051/);
  assert.match(seo, /ogImageHeight: 1265/);
  const page = readFileSync('src/pages/PlatformTour.tsx', 'utf8');
  assert.match(page, /image="\/demo-page-metadata\.png"/);
  assert.match(page, /imageWidth=\{3051\}/);
  assert.match(page, /imageHeight=\{1265\}/);
  const prerender = readFileSync('scripts/generate-prerendered-pages.mjs', 'utf8');
  assert.match(prerender, /routeConfig\.ogImage/);
  assert.match(prerender, /"og:image:secure_url", ogImage/);
  assert.doesNotMatch(seo, /Prompt Library, Insighta, and Community/, 'the stale taxonomy copy must be gone');
  for (const [file, needle] of [
    ['public/sitemap-pages.xml', 'creatives-takeover.com/demo<'],
    ['public/llms.txt', 'creatives-takeover.com/demo)'],
    ['src/components/VisitorNavbar.tsx', 'href: "/demo"'],
    ['e2e/smoke.spec.ts', "'/demo'"],
    ['scripts/generate-prerendered-pages.mjs', 'href: "/demo"'],
  ] as const) assert.ok(readFileSync(file, 'utf8').includes(needle), `${file} must reference the tour`);
  // startsWith matching would light the navbar entry up on /demo-studio and
  // /demo-calls, which are unrelated surfaces.
  assert.match(readFileSync('src/components/VisitorNavbar.tsx', 'utf8'), /href: "\/demo", icon: PlayCircle, exact: true/);
});

test('the tour lets a visitor look around but caps doing', () => {
  // Looking is the point of the route, so revisiting a panel is always free and
  // only new ground counts. Doing is what an account is for, so the assistant
  // closes once its allowance is spent.
  let budget = EMPTY_TOUR_BUDGET;
  assert.equal(questionsExhausted(budget), false);
  for (let i = 0; i < TOUR_QUESTION_LIMIT; i += 1) budget = recordQuestion(budget);
  assert.equal(questionsExhausted(budget), true);
  assert.equal(questionsLeft(budget), 0);

  let browsing = EMPTY_TOUR_BUDGET;
  for (let i = 0; i < TOUR_PANEL_LIMIT; i += 1) browsing = recordPanel(browsing, `panel-${i}`);
  assert.equal(panelsLeft(browsing), 0);
  assert.equal(panelBlocked(browsing, 'panel-0'), false, 'a panel already seen must stay reachable');
  assert.equal(panelBlocked(browsing, 'panel-new'), true);
  // Recording the same panel twice must not consume a second slot.
  assert.equal(recordPanel(browsing, 'panel-0').panelsSeen.length, TOUR_PANEL_LIMIT);

  // The limits are worth less than the product they protect: a visitor should
  // reach most of the tour before being asked for anything.
  assert.ok(TOUR_PANEL_LIMIT >= Math.ceil(TOUR_PANELS.length * 0.6), 'the browse cap should leave most of the tour open');
  assert.ok(TOUR_QUESTION_LIMIT >= 1);
});

test('the header carries the same controls a signed-in founder has', () => {
  // An earlier version showed only the sample badge, which left the header
  // visibly emptier than the real product and undercut the whole point.
  const utilities = readFileSync('src/components/platform-tour/PlatformTourUtilities.tsx', 'utf8');
  for (const label of ['Connection requests', 'Messages', 'Notifications', 'Switch project']) {
    assert.ok(utilities.includes(label), `the tour header must show ${label}`);
  }
  // Every one of them is a prompt, never an action.
  assert.doesNotMatch(utilities, /<Link|href=|navigate\(/);
  const gate = readFileSync('src/components/platform-tour/PlatformTourSignupGate.tsx', 'utf8');
  for (const reason of ['inbox', 'project', 'questions', 'depth']) {
    assert.match(gate, new RegExp(`^\\s{2}${reason}: [\`']`, 'm'), `the gate needs a heading for ${reason}`);
  }
});

test('the tour keeps the legacy layout and never inherits the workspace shell', () => {
  // A signed-in visitor opening the link must see the tour, not their own
  // workspace, so /demo has to stay outside the workspace route table.
  assert.equal(isWorkspaceRoute('/demo'), false);
  assert.equal(isWorkspaceRoute('/demo/123'), false);
  assert.equal(isWorkspaceRoute('/demo-studio'), true);
});
