import { FOUNDER_TOOL_CATALOG, type FounderToolDefinition } from '../../config/founderToolCatalog.ts';

/**
 * Panels are addressed with ?panel= rather than a path segment. /demo/:publicId
 * already serves published founder demos, so /demo/dashboard would be read as a
 * demo with the public id "dashboard". A query string also keeps one indexable
 * URL and one prerendered shell while still giving every panel a shareable
 * deep link, which is the whole point of sending this to a fund or a faculty.
 */
export type TourPanelKind = 'home' | 'dashboard' | 'network' | 'institutions' | 'icp' | 'pmf' | 'tool';

export interface TourPanel {
  key: string;
  kind: TourPanelKind;
  /** What the frame bar calls this panel. */
  label: string;
  /** Present for kind 'tool', 'icp' and 'pmf'. */
  tool?: FounderToolDefinition;
}

/** A catalog key becomes a URL-shaped panel key: pmf_lab -> pmf-lab. */
export function toolPanelKey(toolKey: string) {
  return toolKey.replace(/_/g, '-');
}

const FLAGSHIP_KINDS: Record<string, TourPanelKind> = { icp_builder: 'icp', pmf_lab: 'pmf' };

/**
 * Catalog tools that must not get a panel of their own.
 *
 * first_customer_sprint is a workspace inside GTM Strategist, not a separate
 * tool: its route is /go-to-market?workspace=first-customer-proof and it shares
 * that tool's entitlement. Giving it a panel told a visitor Stage 5 has three
 * tools when it has two, GTM Strategist and Directories.
 */
export const TOUR_EXCLUDED_TOOLS = new Set(['first_customer_sprint']);

const TOUR_TOOLS = FOUNDER_TOOL_CATALOG.filter((tool) => !TOUR_EXCLUDED_TOOLS.has(tool.key));

const FIXED_PANELS: TourPanel[] = [
  { key: 'home', kind: 'home', label: 'Pulse' },
  { key: 'dashboard', kind: 'dashboard', label: 'Dashboard' },
  { key: 'network', kind: 'network', label: 'Network' },
  { key: 'for-institutions', kind: 'institutions', label: 'For programs' },
];

/** Every panel, in the order the frame bar steps through them. */
export const TOUR_PANELS: TourPanel[] = [
  FIXED_PANELS[0],
  FIXED_PANELS[1],
  ...TOUR_TOOLS.map((tool) => ({
    key: toolPanelKey(tool.key),
    kind: FLAGSHIP_KINDS[tool.key] ?? 'tool',
    label: tool.name,
    tool: tool as FounderToolDefinition,
  })),
  FIXED_PANELS[2],
  FIXED_PANELS[3],
];

const BY_KEY = new Map(TOUR_PANELS.map((panel) => [panel.key, panel]));

export const DEFAULT_TOUR_PANEL = 'home';

/**
 * Total and safe: anything that is not a known key resolves to the home panel.
 * The caller rewrites the URL with replace so a mistyped or hostile ?panel=
 * never persists in history.
 */
export function resolveTourPanel(raw: string | null | undefined): TourPanel {
  const panel = raw ? BY_KEY.get(raw) : undefined;
  return panel ?? BY_KEY.get(DEFAULT_TOUR_PANEL)!;
}

/**
 * Where a click in the real sidebar lands. The dashboard sub-items collapse
 * onto one panel because they are tabs within it, and the Network entries share
 * a panel because they are one directory story.
 */
const ROUTE_PANELS: Record<string, string> = {
  '/': 'home',
  '/dashboard': 'dashboard',
  '/dashboard/tasks': 'dashboard',
  '/dashboard/routine': 'dashboard',
  '/dashboard/files': 'dashboard',
  '/dashboard/referral': 'dashboard',
  '/mentorship': 'network',
  '/co-founder': 'network',
  '/investors': 'network',
  '/marketplace': 'network',
  // Excluded tools are left out on purpose. First Customer Proof's route is
  // /go-to-market with a workspace query, so stripping the query already lands
  // it on the GTM Strategist panel, which is where it belongs.
  ...Object.fromEntries(TOUR_TOOLS.map((tool) => [tool.route, toolPanelKey(tool.key)])),
};

/**
 * Pages that are genuinely public and signed-out safe. Clicking these leaves
 * the tour on purpose: it is honest about what is a sample and what is the real
 * site, and a visitor who lands on live pricing is further along than one who
 * reads a mock of it.
 */
export const TOUR_EXTERNAL_ROUTES = ['/pricing', '/newspaper', '/podcast', '/resources'];

/** Routes that need an account, so they become the signup prompt. */
export const TOUR_ACCOUNT_ROUTES = ['/dashboard/settings', '/account', '/messages'];

export type TourNavigation =
  | { kind: 'panel'; panel: string }
  | { kind: 'external'; path: string }
  | { kind: 'account' };

/** Classifies a sidebar destination. Nothing else is reachable from a panel. */
export function resolveTourNavigation(path: string): TourNavigation {
  const clean = path.split(/[?#]/)[0];
  const panel = ROUTE_PANELS[clean] ?? ROUTE_PANELS[path];
  if (panel) return { kind: 'panel', panel };
  if (TOUR_EXTERNAL_ROUTES.includes(clean)) return { kind: 'external', path: clean };
  return { kind: 'account' };
}

/** The path the sidebar should highlight while a panel is open. */
export function tourHighlightPath(panel: TourPanel) {
  if (panel.tool) return panel.tool.route.split(/[?#]/)[0];
  if (panel.key === 'dashboard') return '/dashboard';
  if (panel.key === 'network') return '/mentorship';
  return '/';
}
