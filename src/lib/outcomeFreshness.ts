/**
 * "Built on an earlier ICP": what changed under a tool's current result since
 * it was made (project_outcome_freshness, migration 20261123140000).
 * Import-free so node tests can load it.
 */

export type FreshnessTool = 'demo' | 'pmf' | 'mvp' | 'gtm' | 'traction';
export type FreshnessSource = 'icp' | 'pmf' | 'demo' | 'mvp' | 'gtm';

export interface ToolFreshness {
  id: string;
  changed: FreshnessSource[];
}
export type ProjectFreshness = Partial<Record<FreshnessTool, ToolFreshness>>;

const SUBJECT: Record<FreshnessTool, string> = {
  demo: 'This demo page',
  pmf: 'This PMF result',
  mvp: 'This MVP',
  gtm: 'This go-to-market plan',
  traction: 'These traction channels',
};

const SOURCE: Record<FreshnessSource, string> = {
  icp: 'your latest ICP',
  pmf: 'your latest PMF result',
  demo: 'your latest demo page',
  mvp: 'your latest MVP',
  gtm: 'your latest go-to-market plan',
};

const SOURCES: readonly FreshnessSource[] = ['icp', 'pmf', 'demo', 'mvp', 'gtm'];

export function parseProjectFreshness(raw: unknown): ProjectFreshness {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: ProjectFreshness = {};
  for (const tool of Object.keys(SUBJECT) as FreshnessTool[]) {
    const entry = (raw as Record<string, unknown>)[tool];
    if (!entry || typeof entry !== 'object') continue;
    const { id, changed } = entry as { id?: unknown; changed?: unknown };
    if (typeof id !== 'string') continue;
    result[tool] = {
      id,
      changed: Array.isArray(changed) ? changed.filter((key): key is FreshnessSource => SOURCES.includes(key as FreshnessSource)) : [],
    };
  }
  return result;
}

const joinList = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** "This MVP was made before your latest ICP and your latest PMF result." */
export function freshnessMessage(tool: FreshnessTool, changed: FreshnessSource[]): string | null {
  if (!changed.length) return null;
  const verb = tool === 'traction' ? 'were' : 'was';
  return `${SUBJECT[tool]} ${verb} made before ${joinList(changed.map((key) => SOURCE[key]))}.`;
}
