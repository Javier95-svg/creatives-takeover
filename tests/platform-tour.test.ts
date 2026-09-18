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
  DEFAULT_TOUR_PANEL, TOUR_EXTERNAL_ROUTES, TOUR_PANELS,
  resolveTourNavigation, resolveTourPanel, toolPanelKey, tourHighlightPath,
} from '../src/lib/platformTour/tourPanels.ts';

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
      if (target !== TELEMETRY_BOUNDARY) queue.push(target);
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
  const allowed = new Set(['src/lib/analytics.ts']);
  for (const [file, chain] of closure) {
    const relative = file.replace(resolve('.') + '\\', '').replace(resolve('.') + '/', '').replace(/\\/g, '/');
    if (allowed.has(relative)) continue;
    const source = readFileSync(file, 'utf8');
    const offending = source.split('\n').filter(line => /^\s*import/.test(line) && banned.test(line));
    assert.equal(offending.length, 0, `${relative} reaches product data via ${chain.join(' -> ')}\n${offending.join('\n')}`);
  }
  for (const name of ['WorkspaceLive.tsx', 'PulseHomeLive.tsx', 'PulseHome.tsx', 'WorkspaceAccountSearch.tsx',
    'WorkspaceProfileAvatar.tsx', 'PreviewCreditMenu.tsx', 'SoftGateModal.tsx', 'DashboardShell.tsx', 'pulseHomeStream.ts']) {
    const hit = [...closure.keys()].find(file => file.endsWith(name));
    assert.equal(hit, undefined, `${name} must not be reachable from ${TOUR_ENTRY}`);
  }
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
    assert.ok(keys.has(toolPanelKey(tool.key)), `${tool.key} needs a panel`);
  }
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

test('the tour keeps the legacy layout and never inherits the workspace shell', () => {
  // A signed-in visitor opening the link must see the tour, not their own
  // workspace, so /demo has to stay outside the workspace route table.
  assert.equal(isWorkspaceRoute('/demo'), false);
  assert.equal(isWorkspaceRoute('/demo/123'), false);
  assert.equal(isWorkspaceRoute('/demo-studio'), true);
});
