// Explicit application layouts. Public outputs and marketing never inherit a shell.
export const WORKSPACE_FLAG = 'founder-guide-workspace-v1';
// Keep the existing rollout key for operational rollback; select the approved UI independently.
export const WORKSPACE_HOME_CONCEPT = 'guided-journey' as const;
export const APP_ENTRY_PATH = '/app-entry';
const roots = [
  '/dashboard', '/icp-builder', '/pmf-lab', '/demo-studio', '/mvp-builder',
  '/go-to-market', '/tech-stack', '/directories', '/traction-engine', '/vc-search',
  '/pitch-deck-analyzer', '/insighta-test', '/email-templates', '/accelerator-hunt',
  '/mentorship', '/co-founder', '/investors', '/marketplace', '/messages', '/profile',
  '/account', '/settings/security', '/settings/delete-account', '/newspaper', '/podcast',
  '/saved-mentors', '/my-bookings', '/purchase-history', '/accountability',
  '/projects-dashboard', '/ai-goals', '/core-metrics', '/decision-sprint', '/validate',
  '/insighta/vc', '/insighta/accelerator',
];
const exact = ['/pricing', '/files', '/tasks', '/routine', '/weekly-mission', '/focus-funnel',
  '/waitlist', '/waitlist-maker', '/waitlist/templates', '/gtm-strategist', '/client-acquisition',
  '/bizmap-ai/icp-builder', '/bizmap-ai/pmf-lab', '/bizmap-ai/tech-stack',
  '/insighta/vc-search', '/insighta/accelerator-hunt', '/insighta/email-templates',
  '/insighta/traction-engine', '/insighta/pitch-deck-analyzer', '/insighta/test'];
export function isWorkspaceRoute(path: string) {
  if (/(^|\/)(admin|public|embed|share)(\/|$)/.test(path) || path === '/demo-studio/try' || path === '/newspaper/rss.xml') return false;
  return path === '/' || exact.includes(path) || roots.some(root => path === root || path.startsWith(`${root}/`));
}
export function workspaceEligible(userId: string | undefined, authLoading: boolean, flag: boolean | undefined, configured: boolean) {
  return configured && !authLoading && Boolean(userId) && flag === true;
}
export function defaultWorkspaceDestination(enabled: boolean) { return enabled ? '/' : '/dashboard'; }

export type PlatformUpdate = { id: string; section: string; title: string; detail: string; route: string; createdAt: string };
export const PLATFORM_UPDATE_TYPES = ['platform_update', 'mentor_banner_created', 'newspaper_article_published', 'podcast_episode_published', 'angel_banner_created', 'cofounder_post_created'];
export function platformUpdates(rows: Array<{ id: string; notification_type: string; created_at: string; metadata: unknown }>): PlatformUpdate[] {
  return rows.flatMap(row => {
    const data = row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {};
    const route = typeof data.route === 'string' ? data.route : '';
    if (!route.startsWith('/') || route.startsWith('//') || route.includes('\\')) return [];
    const path = route.split(/[?#]/)[0];
    const sections: Record<string, string> = { '/newspaper': 'Newspaper', '/mentorship': 'Mentorship', '/marketplace': 'Marketplace', '/podcast': 'Podcast', '/investors': 'Investors', '/co-founder': 'Co-founder', '/go-to-market': 'GTM Strategist', '/icp-builder': 'ICP Builder', '/demo-studio': 'Demo Studio', '/pmf-lab': 'PMF Lab', '/mvp-builder': 'MVP Builder', '/traction-engine': 'Traction Engine', '/vc-search': 'VC Search', '/accelerator-hunt': 'Accelerator Hunt' };
    const section = Object.entries(sections).find(([root]) => path === root || path.startsWith(root + '/'))?.[1];
    if (!section || !PLATFORM_UPDATE_TYPES.includes(row.notification_type)) return [];
    const title = typeof data.title === 'string' && data.title.trim() ? data.title :
      row.notification_type === 'mentor_banner_created' ? `New mentor${typeof data.mentor_name === 'string' ? `: ${data.mentor_name}` : ' joined'}` :
      row.notification_type === 'angel_banner_created' ? 'New investor joined' :
      row.notification_type === 'cofounder_post_created' ? 'New co-founder listing' : '';
    if (!title) return [];
    return [{ id: row.id, section, title, detail: typeof data.message === 'string' ? data.message : '', route, createdAt: row.created_at }];
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).filter((row, i, all) => all.findIndex(other => other.id === row.id) === i).slice(0, 3);
}
